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
    const featuredSection = document.getElementById("featured-section");
    const container = document.getElementById("catalog-grid");

    if(!featuredGrid && !container){
        return;
    }

    // Hide the Featured Builds section by default until product data
    // has actually loaded and confirmed there's something featured to
    // show - otherwise it flashes ("Featured Builds" heading + a
    // "Loading products..." placeholder) for a moment on every page
    // load, then disappears if there turn out to be no featured items.
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

        // The catalog grid shows every active, in-stock product -
        // including Featured Builds, which also get their own showcase
        // section above. This way a Featured item is still one single
        // entry in the Products sheet, but shows up both up top and when
        // browsing/searching/filtering the full catalog.
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

    // Rating + sold count, entered manually in the Products sheet from
    // Rollie's Shopee Seller Centre (Shopee blocks automated scraping,
    // so this can't be a live sync - it just displays whatever numbers
    // are in the sheet). Hidden gracefully if a product has no rating
    // or sold count entered yet.
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

    // Sold Out - manually flagged in the Products sheet (SoldOut column),
    // same reasoning as rating/sold: Shopee can't be auto-synced, so
    // Rollie marks it herself when an item runs out there.
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
        const images = (p.images && p.images.length) ? p.images : (p.img ? [p.img] : []);
        const mainImg = images[0] || "";
        const soldOut = isSoldOut(p);

        return `
            <div class="shop-card" data-id="${p.id}" data-name="${safeName}" data-price="${p.price}" data-img="${mainImg}" data-stock="${p.stock}" data-rating="${p.rating || ''}" data-sold="${p.sold || ''}" data-soldout="${soldOut ? '1' : ''}" data-description="${safeDescription}">
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

    // FEATURED BUILDS
    // A small hand-picked set of products (Featured = TRUE in the
    // Products sheet). Rendered once per load - simple grid, no
    // search/filter/sort, same as when this section was hardcoded.

    function renderFeatured(){

        if(!featuredGrid) return;

        const featured = allProducts.filter(p => p.featured && (p.stock === undefined || p.stock > 0));

        // Featured items also show up in the full catalog below (see
        // getFiltered()), so if there are none right now, hide this whole
        // section instead of leaving an empty "Featured Builds" heading
        // with nothing under it.
        if(featuredSection){
            featuredSection.style.display = featured.length ? "" : "none";
        }

        featuredGrid.innerHTML = featured.map(cardHTML).join("");

    }

    // FULL CATALOG (search + filter + sort + "Load More" pagination)

    // Works out how many columns the grid is actually rendering right
    // now (it's a fluid auto-fit grid, so this changes with screen
    // width) so pagination can round up to a full row instead of ever
    // cutting off mid-row and leaving a big empty gap next to the last
    // card before the "Load More" button.
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

        // Round "shown" up to the next full row (pulling in real
        // products that are already loaded, not phantom ones) so the
        // grid never ends on a half-empty row unless we've genuinely
        // run out of products to show.
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
    // the same Apps Script Web App the Shop page reads from and the
    // booking form posts to.

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

            populateCategoryOptions(allProducts.filter(p => (p.stock === undefined || p.stock > 0)));
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
