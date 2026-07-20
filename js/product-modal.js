// modal

(function(){

    const overlay = document.querySelector(".product-overlay");
    const modal = document.querySelector(".product-modal");

    if(!overlay || !modal){
        return;
    }

    const closeBtn = modal.querySelector(".product-modal-close");
    const imgWrap = modal.querySelector(".product-modal-img-wrap");
    const imgEl = modal.querySelector(".product-modal-img");
    const countWrap = modal.querySelector(".product-modal-imgcount");
    const countNum = modal.querySelector(".product-modal-imgcount-num");
    const nameEl = modal.querySelector(".product-modal-name");
    const priceEl = modal.querySelector(".product-modal-price");
    const ratingEl = modal.querySelector(".product-modal-rating");
    const soldEl = modal.querySelector(".product-modal-sold");
    const descriptionEl = modal.querySelector(".product-modal-description");
    const reviewsEl = modal.querySelector(".product-modal-reviews");
    const addToCartBtn = modal.querySelector(".add-to-cart-btn");
    const buyNowBtn = modal.querySelector(".buy-now-btn");
    const hintEl = modal.querySelector(".product-modal-hint");

    function formatPrice(num){
        return "₱" + Number(num).toLocaleString("en-US");
    }

    // rating
    function renderRating(rating){
        const num = Number(rating);
        if(!ratingEl) return;
        if(!rating || isNaN(num) || num <= 0){
            ratingEl.style.display = "none";
            return;
        }
        ratingEl.style.display = "flex";
        ratingEl.innerHTML = `<i class="fa-solid fa-star"></i> ${num.toFixed(1)}`;
    }

    function renderSold(sold){
        const num = Number(sold);
        if(!soldEl) return;
        if(!sold || isNaN(num) || num <= 0){
            soldEl.style.display = "none";
            return;
        }
        soldEl.style.display = "inline";
        soldEl.textContent = num.toLocaleString("en-US") + " sold";
    }

    // description
    function renderDescription(description){
        if(!descriptionEl) return;
        const text = (description || "").trim();
        if(!text){
            descriptionEl.style.display = "none";
            descriptionEl.textContent = "";
            return;
        }
        descriptionEl.style.display = "block";
        descriptionEl.textContent = text;
    }

    // reviews
    function renderReviews(reviewsJson){
        if(!reviewsEl) return;
        let reviews = [];
        try{
            reviews = JSON.parse(reviewsJson || "[]");
        }catch(e){
            reviews = [];
        }
        if(!Array.isArray(reviews) || reviews.length === 0){
            reviewsEl.style.display = "none";
            reviewsEl.innerHTML = "";
            return;
        }
        reviewsEl.style.display = "block";
        reviewsEl.innerHTML = '<h4 class="product-modal-reviews-title">Customer Reviews</h4>' +
            reviews.map(r => {
                const div = document.createElement("div");
                div.textContent = r;
                return `<div class="product-modal-review"><i class="fa-solid fa-quote-left"></i><p>${div.innerHTML}</p></div>`;
            }).join("");
    }

    // soldout
    function renderSoldOut(soldOut){
        imgWrap.classList.toggle("sold-out", !!soldOut);
        if(addToCartBtn) addToCartBtn.disabled = !!soldOut;
        if(buyNowBtn) buyNowBtn.disabled = !!soldOut;
    }

    // populate
    function populateModal(data){

        const images = (data.images && data.images.length) ? data.images : [];

        modal.dataset.id = data.id;
        modal.dataset.name = data.name;
        modal.dataset.price = data.price;
        modal.dataset.img = images[0] || "";

        imgWrap.dataset.images = JSON.stringify(images);
        imgEl.src = images[0] || "";
        imgEl.alt = data.name;

        if(images.length > 1){
            countWrap.style.display = "flex";
            countNum.textContent = images.length;
        }else{
            countWrap.style.display = "none";
        }

        // hint
        if(hintEl){
            hintEl.style.display = images.length > 1 ? "block" : "none";
        }

        nameEl.textContent = data.name;
        priceEl.textContent = formatPrice(data.price);
        renderRating(data.rating);
        renderSold(data.sold);
        renderDescription(data.description);
        renderReviews(data.reviewsJson);
        renderSoldOut(data.soldOut);

        overlay.classList.add("show");
        modal.classList.add("show");
    }

    function openModal(card){

        const id = card.dataset.id;
        const name = card.dataset.name;
        const price = card.dataset.price;
        const img = card.dataset.img;

        const cardImgBox = card.querySelector(".shop-card-img");
        let images = [];

        if(cardImgBox){
            try{
                images = JSON.parse(cardImgBox.dataset.images || "[]");
            }catch(e){
                images = [];
            }
        }

        if(images.length === 0){
            images = [img];
        }

        populateModal({
            id: id,
            name: name,
            price: price,
            images: images,
            rating: card.dataset.rating,
            sold: card.dataset.sold,
            description: card.dataset.description,
            reviewsJson: card.dataset.reviews,
            soldOut: card.dataset.soldout === "1"
        });
    }

    // byid
    function openModalById(id){

        const catalog = window.CEAMOTO_CATALOG || [];
        const p = catalog.find(item => String(item.id) === String(id));

        if(!p){
            return false;
        }

        const images = (p.images && p.images.length) ? p.images : (p.img ? [p.img] : []);
        const soldOut = p.soldOut === true || p.soldOut === "TRUE" || p.soldOut === 1;

        populateModal({
            id: p.id,
            name: p.name,
            price: p.price,
            images: images,
            rating: p.rating,
            sold: p.sold,
            description: p.description,
            reviewsJson: JSON.stringify(p.reviews || []),
            soldOut: soldOut
        });

        return true;
    }

    window.CEAMOTO_OPEN_PRODUCT_MODAL = openModalById;

    function closeModal(){
        overlay.classList.remove("show");
        modal.classList.remove("show");
    }

    // open
    document.addEventListener("click", (e) => {

        const card = e.target.closest(".shop-card");

        if(!card) return;

        if(e.target.closest(".add-to-cart-btn") ||
           e.target.closest(".buy-now-btn")){
            return;
        }

        openModal(card);

    });

    // close
    modal.addEventListener("click", (e) => {
        if(e.target.closest(".add-to-cart-btn") || e.target.closest(".buy-now-btn")){
            closeModal();
        }
    });

    closeBtn.addEventListener("click", closeModal);

    overlay.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
        if(e.key === "Escape" && modal.classList.contains("show")){
            closeModal();
        }
    });

})();
