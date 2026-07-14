// ===========================
// CEAMOTO - shop-catalog.js
// Fetches every product from the CEAMOTO Products Google Sheet (via
// the Apps Script Web App, the same backend the booking form uses)
// and renders both the "Featured Builds" grid and the full
// searchable/filterable catalog grid from that single source. No more
// static shop-products.js or hardcoded featured cards - whoever
// manages the Products sheet (directly, or via admin.html) can add,
// edit, or remove products and they appear here automatically.
// ===========================

(function(){

    // Keep the sticky search bar's top offset locked to the real,
    // rendered height of the fixed navbar (instead of a guessed
    // pixel value per breakpoint) so there's never a gap or overlap
    // between the navbar and the sticky bar at any screen size.

    const navbar = document.querySelector(".navbar");

    function syncNavbarHeight(){
        if(!navbar) return;
        document.documentElement.style.setProperty("--navbar-h", navbar.offsetHeight + "px");
    }

    syncNavbarHeight();
    window.addEventListener("resize", syncNavbarHeight);
    window.addEventListener("orientationchange", syncNavbarHeight);

    const featuredGrid = document.getElementById("featured-grid");
    const container = document.getElementById("catalog-grid");

    if(!featuredGrid && !container){
        return;
    }

    const searchInput = document.getElementById("catalog-search");
    const searchClearBtn = document.getElementById("catalog-search-clear");
    const loadMoreBtn = document.getElementById("catalog-load-more");
    const resultsCount = document.getElementById("catalog-count");
    const categorySelect = document.getElementById("catalog-category");
    const sortSelect = document.getElementById("catalog-sort");

    const BATCH_SIZE = 16;

    let shown = BATCH_SIZE;
    let query = "";
    let category = "all";
    let sortBy = "relevance";
    let allProducts = [];

    function escapeAttr(str){
        return String(str).replace(/"/g, "&quot;");
    }

    function formatPrice(num){
        return "₱" + Number(num).toLocaleString("en-US");
    }

    // Populate the category dropdown from whatever categories actually
    // exist in the catalog data, so it never goes stale if products
    // are added/removed/recategorized later.
    function populateCategoryOptions(list){

        if(!categorySelect) return;

        const categories = Array.from(new Set(list.map(p => p.category).filter(Boolean))).sort();

        categorySelect.innerHTML = '<option value="all">All Categories</option>' +
            categories.map(c => `<option value="${escapeAttr(c)}">${c}</option>`).join("");

    }

    function getFiltered(){

        // The catalog grid never shows Featured Builds (those get their
        // own section above) and always hides out-of-stock products.
        let list = allProducts.filter(p => !p.featured && (p.stock === undefined || p.stock > 0));

        if(category !== "all"){
            list = list.filter(p => p.category === category);
        }

        if(query){
            const q = query.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q));
        }

        return list;

    }

    function getSorted(list){

        const sorted = list.slice();

        if(sortBy === "price-low"){
            sorted.sort((a, b) => a.price - b.price);
        }else if(sortBy === "price-high"){
            sorted.sort((a, b) => b.price - a.price);
        }
        // "relevance" (default) keeps the original catalog order.

        return sorted;

    }

    function stockBadgeHTML(stock){
        if(typeof stock === "number" && stock > 0 && stock <= 5){
            return `<span class="stock-badge">Only ${stock} left!</span>`;
        }
        return "";
    }

    function imageCountHTML(images){
        if(images.length > 1){
            return `<span class="shop-img-count"><i class="fa-solid fa-images"></i> ${images.length}</span>`;
        }
        return "";
    }

    function cardHTML(p){

        const safeName = escapeAttr(p.name);
        const images = (p.images && p.images.length) ? p.images : (p.img ? [p.img] : []);
        const mainImg = images[0] || "";

        return `
            <div class="shop-card" data-id="${p.id}" data-name="${safeName}" data-price="${p.price}" data-img="${mainImg}" data-stock="${p.stock}">
                <div class="shop-card-img" data-images='${JSON.stringify(images)}'>
                    <img src="${mainImg}" alt="${safeName}" loading="lazy">
                    ${imageCountHTML(images)}
                </div>
                <div class="shop-card-body">
                    <h3>${p.name}</h3>
                    <span class="shop-price">${formatPrice(p.price)}</span>
                    ${stockBadgeHTML(p.stock)}
                    <div class="shop-card-actions">
                        <button class="add-to-cart-btn">
                            <i class="fa-solid fa-cart-plus"></i> Add to Cart
                        </button>
                        <button class="buy-now-btn">
                            <i class="fa-solid fa-bolt"></i> Buy Now
                        </button>
                    </div>
                </div>
            </div>
        `;

    }

    // FEATURED BUILDS
    // A small hand-picked set of products (Featured = TRUE in the
    // Products sheet). Rendered once per load - simple grid, no
    // search/filter/sort, same as when this section was hardcoded.

    function renderFeatured(){

        if(!featuredGrid) return;

        const featured = allProducts.filter(p => p.featured && (p.stock === undefined || p.stock > 0));

        featuredGrid.innerHTML = featured.length
            ? featured.map(cardHTML).join("")
            : '<p class="catalog-empty">No featured builds right now.</p>';

    }

    // FULL CATALOG (search + filter + sort + "Load More" pagination)

    function render(){

        if(!container) return;

        const filtered = getSorted(getFiltered());
        const visible = filtered.slice(0, shown);

        if(filtered.length === 0){
            container.innerHTML = '<p class="catalog-empty">No products found. Try a different search term.</p>';
        }else{
            container.innerHTML = visible.map(cardHTML).join("");
        }

        if(resultsCount){
            resultsCount.textContent = filtered.length + (filtered.length === 1 ? " item" : " items");
        }

        if(loadMoreBtn){
            loadMoreBtn.style.display = shown < filtered.length ? "inline-flex" : "none";
        }

    }

    function syncClearBtn(){
        if(!searchClearBtn) return;
        searchClearBtn.classList.toggle("show", searchInput.value.length > 0);
    }

    // When a search narrows the results a lot, the catalog (and the
    // whole page) suddenly gets much shorter. If the person was
    // scrolled down while typing, the browser clamps the scroll
    // position to the new, shorter page - which can strand them at
    // the very bottom, below the search bar. Nudge the search bar
    // back into view right after re-rendering so that never happens.

    function keepSearchInView(){
        const wrap = document.querySelector(".catalog-list-wrap");
        if(!wrap) return;
        const navbarH = navbar ? navbar.offsetHeight : 120;
        const rect = wrap.getBoundingClientRect();
        const targetY = window.scrollY + rect.top - navbarH;
        window.scrollTo({top: Math.max(0, targetY), behavior: "instant"});
    }

    if(searchInput){

        searchInput.addEventListener("input", () => {
            query = searchInput.value.trim();
            shown = BATCH_SIZE;
            syncClearBtn();
            render();
            keepSearchInView();
        });

        // Some mobile keyboards don't dismiss automatically when the
        // "Done"/"Search"/"Go" key is tapped unless the input is
        // explicitly blurred - so do that ourselves on Enter.
        searchInput.addEventListener("keydown", (e) => {
            if(e.key === "Enter"){
                e.preventDefault();
                searchInput.blur();
            }
        });

    }

    if(searchClearBtn){

        searchClearBtn.addEventListener("click", () => {
            searchInput.value = "";
            query = "";
            shown = BATCH_SIZE;
            syncClearBtn();
            render();
            searchInput.focus();
            keepSearchInView();
        });

    }

    if(loadMoreBtn){

        loadMoreBtn.addEventListener("click", () => {
            shown += BATCH_SIZE;
            render();
        });

    }

    if(categorySelect){

        categorySelect.addEventListener("change", () => {
            category = categorySelect.value;
            shown = BATCH_SIZE;
            render();
            keepSearchInView();
        });

    }

    if(sortSelect){

        sortSelect.addEventListener("change", () => {
            sortBy = sortSelect.value;
            render();
        });

    }

    // LOADING / ERROR STATES

    function showLoading(){
        const msg = '<p class="catalog-empty">Loading products...</p>';
        if(featuredGrid) featuredGrid.innerHTML = msg;
        if(container) container.innerHTML = msg;
    }

    function showLoadError(){
        const msg = '<p class="catalog-empty">Unable to load products right now. Please refresh the page or check back later.</p>';
        if(featuredGrid) featuredGrid.innerHTML = msg;
        if(container) container.innerHTML = msg;
    }

    // FETCH PRODUCTS
    // Single source of truth for every product on the Shop page - the
    // Products tab of the CEAMOTO Bookings Google Sheet, read through
    // the same Apps Script Web App the booking form posts to.

    async function loadProducts(){

        if(typeof BOOKING_ENDPOINT_URL === "undefined" || BOOKING_ENDPOINT_URL.indexOf("PASTE_YOUR") !== -1){
            showLoadError();
            return;
        }

        showLoading();

        try{

            const res = await fetch(BOOKING_ENDPOINT_URL + "?action=products");
            const data = await res.json();

            if(!data || data.result !== "success" || !Array.isArray(data.products)){
                throw new Error("Bad response from products endpoint");
            }

            allProducts = data.products;

            // Exposed globally so cart.js's trustedPrice() re-derives
            // every price from this same source of truth, instead of
            // ever trusting a page/localStorage value that a customer
            // could tamper with.
            window.CEAMOTO_CATALOG = allProducts;

            populateCategoryOptions(allProducts.filter(p => !p.featured));
            renderFeatured();
            render();

            // Let cart.js know real catalog data is available now, in
            // case it already tried to sanitize the saved cart before
            // this fetch finished.
            window.dispatchEvent(new Event("ceamotoCatalogReady"));

        }catch(err){
            console.error("Failed to load products:", err);
            showLoadError();
        }

    }

    loadProducts();

})();
