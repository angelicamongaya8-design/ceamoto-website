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

    const BATCH_SIZE = 16;

    let shown = BATCH_SIZE;
    let query = "";

    function escapeAttr(str){
        return String(str).replace(/"/g, "&quot;");
    }

    function formatPrice(num){
        return "₱" + Number(num).toLocaleString("en-US");
    }

    function getFiltered(){

        if(!query) return CEAMOTO_CATALOG;

        const q = query.toLowerCase();

        return CEAMOTO_CATALOG.filter(p => p.name.toLowerCase().includes(q));

    }

    function cardHTML(p){

        const safeName = escapeAttr(p.name);

        return `
            <div class="shop-card" data-id="${p.id}" data-name="${safeName}" data-price="${p.price}" data-img="${p.img}">
                <div class="shop-card-img" data-images='${JSON.stringify([p.img])}'>
                    <img src="${p.img}" alt="${safeName}" loading="lazy">
                </div>
                <div class="shop-card-body">
                    <h3>${p.name}</h3>
                    <span class="shop-price">${formatPrice(p.price)}</span>
                    <button class="add-to-cart-btn">
                        <i class="fa-solid fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        `;

    }

    function render(){

        const filtered = getFiltered();
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

    render();

})();
