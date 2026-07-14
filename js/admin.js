// ===========================
// CEAMOTO - admin.js
// Password-gated product manager for admin.html. Lets whoever
// manages the shop add, edit, hide, or delete products directly -
// writes go straight to the Products tab of the CEAMOTO Bookings
// Google Sheet through the same Apps Script Web App the Shop page
// reads from and the booking form posts to. No GitHub/code edits
// needed to change what's for sale.
//
// Security note: the admin password is never stored in this file or
// checked in the browser - every check happens server-side in Apps
// Script (checkAdminPassword). This page only remembers the password
// you type for the current browser tab (sessionStorage, cleared when
// the tab closes) so you don't have to retype it on every action.
// Treat this URL like a login page - don't share it publicly, and
// log out on shared/public computers.
// ===========================

(function(){

    const loginSection = document.getElementById("admin-login");
    const panelSection = document.getElementById("admin-panel");

    if(!loginSection || !panelSection){
        return;
    }

    const SESSION_KEY = "ceamotoAdminPw";

    const loginForm = document.getElementById("admin-login-form");
    const passwordInput = document.getElementById("admin-password");
    const loginError = document.getElementById("admin-login-error");
    const loginBtn = document.getElementById("admin-login-btn");

    const countEl = document.getElementById("admin-count");
    const addBtn = document.getElementById("admin-add-btn");
    const refreshBtn = document.getElementById("admin-refresh-btn");
    const logoutBtn = document.getElementById("admin-logout-btn");
    const searchInput = document.getElementById("admin-search");
    const tableBody = document.getElementById("admin-table-body");

    const modalOverlay = document.getElementById("admin-modal-overlay");
    const modal = document.getElementById("admin-modal");
    const modalTitle = document.getElementById("admin-modal-title");
    const modalClose = document.getElementById("admin-modal-close");
    const modalCancel = document.getElementById("admin-modal-cancel");
    const modalSave = document.getElementById("admin-modal-save");
    const formError = document.getElementById("admin-form-error");

    const fId = document.getElementById("pf-id");
    const fName = document.getElementById("pf-name");
    const fPrice = document.getElementById("pf-price");
    const fStock = document.getElementById("pf-stock");
    const fCategory = document.getElementById("pf-category");
    const fCategoryOptions = document.getElementById("pf-category-options");
    const fImages = document.getElementById("pf-images");
    const fDescription = document.getElementById("pf-description");
    const fFeatured = document.getElementById("pf-featured");
    const fActive = document.getElementById("pf-active");

    const toastEl = document.getElementById("admin-toast");

    let password = "";
    let allProducts = [];
    let saving = false;

    function endpointReady(){
        return typeof BOOKING_ENDPOINT_URL !== "undefined" && BOOKING_ENDPOINT_URL.indexOf("PASTE_YOUR") === -1;
    }

    async function callApi(body){

        const res = await fetch(BOOKING_ENDPOINT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(body)
        });

        return await res.json();

    }

    function formatPrice(num){
        return "₱" + Number(num).toLocaleString("en-US");
    }

    function showToast(message, isError){
        toastEl.textContent = message;
        toastEl.classList.toggle("error", !!isError);
        toastEl.classList.add("show");
        clearTimeout(toastEl._hideTimer);
        toastEl._hideTimer = setTimeout(() => {
            toastEl.classList.remove("show");
        }, 3200);
    }

    // ===========================
    // LOGIN / SESSION
    // ===========================

    function showLogin(){
        loginSection.classList.remove("admin-hidden");
        panelSection.classList.add("admin-hidden");
    }

    function showPanel(){
        loginSection.classList.add("admin-hidden");
        panelSection.classList.remove("admin-hidden");
    }

    async function tryPassword(candidate){

        if(!endpointReady()){
            loginError.textContent = "Admin page isn't connected yet. (Missing Apps Script URL in js/booking-config.js)";
            loginError.classList.add("show");
            return false;
        }

        try{

            const data = await callApi({action: "checkPassword", password: candidate});

            if(data && data.result === "success"){
                return true;
            }

            return false;

        }catch(err){
            console.error("Password check failed:", err);
            return false;
        }

    }

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const candidate = passwordInput.value;

        if(!candidate){
            return;
        }

        loginError.classList.remove("show");
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';

        const ok = await tryPassword(candidate);

        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Log In';

        if(ok){
            password = candidate;
            try{ sessionStorage.setItem(SESSION_KEY, candidate); }catch(e){}
            passwordInput.value = "";
            showPanel();
            loadProducts();
        }else{
            loginError.classList.add("show");
        }

    });

    logoutBtn.addEventListener("click", () => {
        password = "";
        try{ sessionStorage.removeItem(SESSION_KEY); }catch(e){}
        allProducts = [];
        showLogin();
    });

    // On load, if a password was already entered earlier this tab
    // session, re-check it's still valid (in case it was changed in
    // Apps Script Script Properties since) before skipping the login
    // screen.
    async function restoreSession(){

        let saved = "";

        try{ saved = sessionStorage.getItem(SESSION_KEY) || ""; }catch(e){}

        if(!saved){
            showLogin();
            return;
        }

        const ok = await tryPassword(saved);

        if(ok){
            password = saved;
            showPanel();
            loadProducts();
        }else{
            try{ sessionStorage.removeItem(SESSION_KEY); }catch(e){}
            showLogin();
        }

    }

    // ===========================
    // LOAD + RENDER PRODUCTS
    // ===========================

    function populateCategoryOptions(){

        const categories = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean))).sort();

        fCategoryOptions.innerHTML = categories.map(c => `<option value="${escapeAttr(c)}"></option>`).join("");

    }

    function escapeAttr(str){
        return String(str).replace(/"/g, "&quot;");
    }

    function escapeHtml(str){
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function statusBadges(p){

        let html = "";

        if(p.featured){
            html += '<span class="admin-badge admin-badge-featured">Featured</span> ';
        }

        html += p.active
            ? '<span class="admin-badge admin-badge-active">Active</span>'
            : '<span class="admin-badge admin-badge-inactive">Hidden</span>';

        if(typeof p.stock === "number" && p.stock <= 0){
            html += ' <span class="admin-badge admin-badge-lowstock">Out of stock</span>';
        }else if(typeof p.stock === "number" && p.stock <= 5){
            html += ' <span class="admin-badge admin-badge-lowstock">Low stock</span>';
        }

        return html;

    }

    function rowHTML(p){

        const thumb = (p.images && p.images[0]) ? p.images[0] : (p.img || "");

        return `
            <tr data-id="${escapeAttr(p.id)}">
                <td><img class="admin-thumb" src="${thumb}" alt="${escapeAttr(p.name)}" loading="lazy" onerror="this.style.opacity=0.25"></td>
                <td class="admin-name-cell">
                    <span class="admin-product-name">${escapeHtml(p.name)}</span>
                    <span class="admin-product-id">${escapeHtml(p.id)}</span>
                </td>
                <td>${formatPrice(p.price)}</td>
                <td>${escapeHtml(p.category || "-")}</td>
                <td>${typeof p.stock === "number" ? p.stock : "-"}</td>
                <td>${statusBadges(p)}</td>
                <td class="admin-actions-cell">
                    <button class="admin-btn admin-btn-edit admin-edit-btn"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="admin-btn admin-btn-danger admin-delete-btn"><i class="fa-solid fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;

    }

    function renderTable(){

        const query = searchInput.value.trim().toLowerCase();

        const list = query
            ? allProducts.filter(p => p.name.toLowerCase().includes(query))
            : allProducts;

        countEl.textContent = allProducts.length + (allProducts.length === 1 ? " product" : " products") +
            (query ? " (" + list.length + " shown)" : "");

        if(list.length === 0){
            tableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="7">No products found.</td></tr>';
            return;
        }

        // Featured products first, then keep the rest in the order the
        // sheet returns them (matches how the Shop page lists things).
        const sorted = list.slice().sort((a, b) => (b.featured === true) - (a.featured === true));

        tableBody.innerHTML = sorted.map(rowHTML).join("");

    }

    async function loadProducts(){

        tableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="7">Loading products...</td></tr>';

        try{

            const data = await callApi({action: "listProducts", password: password});

            if(!data || data.result !== "success" || !Array.isArray(data.products)){
                throw new Error((data && data.error) || "Failed to load products");
            }

            allProducts = data.products;
            populateCategoryOptions();
            renderTable();

        }catch(err){
            console.error("Failed to load products:", err);
            tableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="7">Failed to load products. Try Refresh.</td></tr>';
            showToast("Failed to load products.", true);
        }

    }

    refreshBtn.addEventListener("click", loadProducts);
    searchInput.addEventListener("input", renderTable);

    // ===========================
    // ADD / EDIT MODAL
    // ===========================

    function openModal(mode, product){

        formError.textContent = "";
        formError.classList.remove("show");

        if(mode === "edit" && product){
            modalTitle.textContent = "Edit Product";
            fId.value = product.id;
            fName.value = product.name || "";
            fPrice.value = product.price != null ? product.price : "";
            fStock.value = product.stock != null ? product.stock : "";
            fCategory.value = product.category || "";
            fImages.value = (product.images && product.images.length) ? product.images.join("\n") : (product.img || "");
            fDescription.value = product.description || "";
            fFeatured.checked = !!product.featured;
            fActive.checked = product.active !== false;
        }else{
            modalTitle.textContent = "Add Product";
            fId.value = "";
            fName.value = "";
            fPrice.value = "";
            fStock.value = "20";
            fCategory.value = "";
            fImages.value = "";
            fDescription.value = "";
            fFeatured.checked = false;
            fActive.checked = true;
        }

        modalOverlay.classList.add("show");
        modal.classList.add("show");

    }

    function closeModal(){
        modalOverlay.classList.remove("show");
        modal.classList.remove("show");
    }

    addBtn.addEventListener("click", () => openModal("add"));
    modalClose.addEventListener("click", closeModal);
    modalCancel.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", closeModal);

    tableBody.addEventListener("click", (e) => {

        const row = e.target.closest("tr[data-id]");

        if(!row) return;

        const id = row.dataset.id;
        const product = allProducts.find(p => p.id === id);

        if(!product) return;

        if(e.target.closest(".admin-edit-btn")){
            openModal("edit", product);
        }else if(e.target.closest(".admin-delete-btn")){
            deleteProduct(product);
        }

    });

    function validateForm(){

        const name = fName.value.trim();
        const price = Number(fPrice.value);
        const stock = Number(fStock.value);
        const category = fCategory.value.trim();
        const images = fImages.value.split("\n").map(s => s.trim()).filter(Boolean);

        if(!name){
            return {error: "Product name is required."};
        }

        if(!Number.isFinite(price) || price < 0){
            return {error: "Please enter a valid price."};
        }

        if(!Number.isFinite(stock) || stock < 0){
            return {error: "Please enter a valid stock quantity."};
        }

        if(!category){
            return {error: "Category is required."};
        }

        if(images.length === 0){
            return {error: "Please add at least one photo URL."};
        }

        return {
            data: {
                name: name,
                price: price,
                stock: stock,
                category: category,
                images: images,
                description: fDescription.value.trim(),
                featured: fFeatured.checked,
                active: fActive.checked
            }
        };

    }

    modalSave.addEventListener("click", async () => {

        if(saving) return;

        const result = validateForm();

        if(result.error){
            formError.textContent = result.error;
            formError.classList.add("show");
            return;
        }

        saving = true;
        modalSave.disabled = true;
        modalSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        const isEdit = !!fId.value;
        const payload = Object.assign(
            {action: isEdit ? "updateProduct" : "addProduct", password: password},
            isEdit ? {id: fId.value} : {},
            result.data
        );

        try{

            const data = await callApi(payload);

            if(!data || data.result !== "success"){
                throw new Error((data && data.error) || "Save failed");
            }

            closeModal();
            showToast(isEdit ? "Product updated." : "Product added.");
            await loadProducts();

        }catch(err){
            console.error("Save failed:", err);
            formError.textContent = err.message || "Something went wrong saving this product.";
            formError.classList.add("show");
        }

        saving = false;
        modalSave.disabled = false;
        modalSave.innerHTML = '<i class="fa-solid fa-check"></i> Save Product';

    });

    async function deleteProduct(product){

        const ok = window.confirm('Delete "' + product.name + '"? This can\'t be undone.');

        if(!ok) return;

        try{

            const data = await callApi({action: "deleteProduct", password: password, id: product.id});

            if(!data || data.result !== "success"){
                throw new Error((data && data.error) || "Delete failed");
            }

            showToast("Product deleted.");
            await loadProducts();

        }catch(err){
            console.error("Delete failed:", err);
            showToast("Failed to delete product.", true);
        }

    }

    document.addEventListener("keydown", (e) => {
        if(e.key === "Escape" && modal.classList.contains("show")){
            closeModal();
        }
    });

    restoreSession();

})();
