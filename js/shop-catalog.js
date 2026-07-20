// catalog

(function(){

    // navbar
    const navbar = document.querySelector(".navbar");

    function syncNavbarHeight(){
        if(!navbar) return;
        document.documentElement.style.setProperty("--navbar-h", navbar.offsetHeight + "px");
    }

    syncNavbarHeight();
    window.addEventListener("resize", syncNavbarHeight);
    window.addEventListener("orientationchange", syncNavbarHeight);

    const featuredGrid = document.getElementById("featured-grid");
    const featuredSection = document.getElementById("featured-section");
    const container = document.getElementById("catalog-grid");

    if(!featuredGrid && !container){
        return;
    }

    // hide
    if(featuredSection){
        featuredSection.style.display = "none";
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

    // category
    function populateCategoryOptions(list){

        if(!categorySelect) return;

        const categories = Array.from(new Set(list.map(p => p.category).filter(Boolean))).sort();

        categorySelect.innerHTML = '<option value="all">All Categories</option>' +
            categories.map(c => `<option value="${escapeAttr(c)}">${c}</option>`).join("");

    }

    function getFiltered(){

        // filter
        let list = allProducts.filter(p => (p.stock === undefined || p.stock > 0));

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

    // rating
    function ratingHTML(rating){
        const num = Number(rating);
        if(!rating || isNaN(num) || num <= 0) return "";
        return `<span class="shop-rating"><i class="fa-solid fa-star"></i> ${num.toFixed(1)}</span>`;
    }

    function soldHTML(sold){
        const num = Number(sold);
        if(!sold || isNaN(num) || num <= 0) return "";
        return `<span class="shop-sold">${num.toLocaleString("en-US")} sold</span>`;
    }

    // soldout
    function isSoldOut(p){
        return p.soldOut === true || p.soldOut === "TRUE" || p.soldOut === 1;
    }

    function soldOutBadgeHTML(soldOut){
        if(!soldOut) return "";
        return '<div class="sold-out-badge"><span>Sold Out</span></div>';
    }

    function cardHTML(p){

        const safeName = escapeAttr(p.name);
        const safeDescription = escapeAttr(p.description || "");
        const safeReviews = escapeAttr(JSON.stringify(p.reviews || []));
        const images = (p.images && p.images.length) ? p.images : (p.img ? [p.img] : []);
        const mainImg = images[0] || "";
        const soldOut = isSoldOut(p);

        return `
            <div class="shop-card" data-id="${p.id}" data-name="${safeName}" data-price="${p.price}" data-img="${mainImg}" data-stock="${p.stock}" data-rating="${p.rating || ''}" data-sold="${p.sold || ''}" data-soldout="${soldOut ? '1' : ''}" data-description="${safeDescription}" data-reviews="${safeReviews}">
                <div class="shop-card-img${soldOut ? ' sold-out' : ''}" data-images='${JSON.stringify(images)}'>
                    <img src="${mainImg}" alt="${safeName}" loading="lazy">
                    ${imageCountHTML(images)}
                    ${soldOutBadgeHTML(soldOut)}
                </div>
                <div class="shop-card-body">
                    <h3>${p.name}</h3>
                    <span class="shop-price">${formatPrice(p.price)}</span>
                    <div class="shop-meta-row">
                        ${ratingHTML(p.rating)}
                        ${soldHTML(p.sold)}
                    </div>
                    ${stockBadgeHTML(p.stock)}
                </div>
            </div>
        `;

    }

    // featured
    function renderFeatured(){

        if(!featuredGrid) return;

        const featured = allProducts.filter(p => p.featured && (p.stock === undefined || p.stock > 0));

        if(featuredSection){
            featuredSection.style.display = featured.length ? "" : "none";
        }

        featuredGrid.innerHTML = featured.map(cardHTML).join("");

    }

    // columns
    function currentColumnCount(){

        if(!container || !container.clientWidth) return 1;

        const styles = getComputedStyle(container);
        const gap = parseFloat(styles.columnGap || styles.gap) || 0;
        const minCardWidth = 260;

        return Math.max(1, Math.floor((container.clientWidth + gap) / (minCardWidth + gap)));

    }

    function render(){

        if(!container) return;

        const filtered = getSorted(getFiltered());

        // rows
        let visibleCount = Math.min(shown, filtered.length);
        const columns = currentColumnCount();
        const remainder = visibleCount % columns;

        if(remainder !== 0 && visibleCount < filtered.length){
            visibleCount = Math.min(filtered.length, visibleCount + (columns - remainder));
        }

        const visible = filtered.slice(0, visibleCount);

        if(filtered.length === 0){
            container.innerHTML = '<p class="catalog-empty">No products found. Try a different search term.</p>';
        }else{
            container.innerHTML = visible.map(cardHTML).join("");
        }

        if(resultsCount){
            resultsCount.textContent = filtered.length + (filtered.length === 1 ? " item" : " items");
        }

        if(loadMoreBtn){
            loadMoreBtn.style.display = visibleCount < filtered.length ? "inline-flex" : "none";
        }

    }

    function syncClearBtn(){
        if(!searchClearBtn) return;
        searchClearBtn.classList.toggle("show", searchInput.value.length > 0);
    }

    // scroll
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

        // keydown
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

    // loading
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

    // fetch
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

            // global
            window.CEAMOTO_CATALOG = allProducts;

            populateCategoryOptions(allProducts.filter(p => (p.stock === undefined || p.stock > 0)));
            renderFeatured();
            render();

            // ready
            window.dispatchEvent(new Event("ceamotoCatalogReady"));

        }catch(err){
            console.error("Failed to load products:", err);
            showLoadError();
        }

    }

    loadProducts();

})();
