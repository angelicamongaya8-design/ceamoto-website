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

    const container = document.getElementById("catalog-grid");

    if(!container || typeof CEAMOTO_CATALOG === "undefined"){
        return;
    }

    const searchInput = document.getElementById("catalog-search");
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

    if(searchInput){

        searchInput.addEventListener("input", () => {
            query = searchInput.value.trim();
            shown = BATCH_SIZE;
            render();
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
