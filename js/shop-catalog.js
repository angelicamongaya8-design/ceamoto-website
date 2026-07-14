// ===========================
// CEAMOTO - shop-catalog.js
// Renders the full Shopee-synced
// product catalog into the Shop
// page: search + "Load More"
// pagination, reusing the same
// .shop-card markup/behavior as
// the featured builds above it.
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

    const container = document.getElementById("catalog-grid");

    if(!container || typeof CEAMOTO_CATALOG === "undefined"){
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

    function escapeAttr(str){
        return String(str).replace(/"/g, "&quot;");
    }

    function formatPrice(num){
        return "₱" + Number(num).toLocaleString("en-US");
    }

    // Populate the category dropdown from whatever categories actually
    // exist in the catalog data, so it never goes stale if products
    // are added/removed/recategorized later.
    function populateCategoryOptions(){

        if(!categorySelect) return;

        const categories = Array.from(new Set(CEAMOTO_CATALOG.map(p => p.category).filter(Boolean))).sort();

        categorySelect.innerHTML = '<option value="all">All Categories</option>' +
            categories.map(c => `<option value="${escapeAttr(c)}">${c}</option>`).join("");

    }

    function getFiltered(){

        // Auto-hide out-of-stock products from the catalog entirely.
        let list = CEAMOTO_CATALOG.filter(p => p.stock === undefined || p.stock > 0);

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

    function cardHTML(p){

        const safeName = escapeAttr(p.name);

        return `
            <div class="shop-card" data-id="${p.id}" data-name="${safeName}" data-price="${p.price}" data-img="${p.img}" data-stock="${p.stock}">
                <div class="shop-card-img" data-images='${JSON.stringify([p.img])}'>
                    <img src="${p.img}" alt="${safeName}" loading="lazy">
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

    function render(){

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
        // scrollIntoView() on the sticky search bar itself is not
        // reliable (sticky elements report unstable geometry to it),
        // and an animated ("smooth") scroll can get interrupted by the
        // browser's own scroll-position clamp when the page suddenly
        // gets shorter. So instead: compute the target position from
        // the static (non-sticky) wrapper and jump there instantly.
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

    populateCategoryOptions();
    render();

})();
