// ===========================
// CEAMOTO - product-modal.js
// Shopee-style "tap a product to
// see it up close" detail modal.
// Clicking anywhere on a shop card,
// including its photo (this used to
// open the angle gallery directly,
// but on phones the photo is most of
// the tappable card so that meant
// people almost never reached the
// modal), opens this modal with a
// bigger photo, name, price, and the
// same Add to Cart / Buy Now buttons.
// The angle gallery is still one tap
// away - just from inside the modal's
// own photo instead of the card's.
// ===========================

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

    function formatPrice(num){
        return "₱" + Number(num).toLocaleString("en-US");
    }

    // Same manually-entered rating/sold numbers as the card grid (see
    // shop-catalog.js) - Shopee blocks scraping, so this isn't live.
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

        // Carry the product's data attributes on the modal itself so
        // cart.js's Add to Cart / Buy Now listeners (which look for the
        // nearest ancestor with data-id) work here too.
        modal.dataset.id = id;
        modal.dataset.name = name;
        modal.dataset.price = price;
        modal.dataset.img = img;

        // Also let the shop-gallery.js lightbox open the full set of
        // angles when the modal photo itself is tapped.
        imgWrap.dataset.images = JSON.stringify(images);
        imgEl.src = images[0];
        imgEl.alt = name;

        if(images.length > 1){
            countWrap.style.display = "flex";
            countNum.textContent = images.length;
        }else{
            countWrap.style.display = "none";
        }

        nameEl.textContent = name;
        priceEl.textContent = formatPrice(price);
        renderRating(card.dataset.rating);
        renderSold(card.dataset.sold);

        overlay.classList.add("show");
        modal.classList.add("show");
    }

    function closeModal(){
        overlay.classList.remove("show");
        modal.classList.remove("show");
    }

    // Open on any shop-card click, including the photo now - only the
    // action buttons (Add to Cart / Buy Now) skip opening the modal
    // since they already do their own thing.
    document.addEventListener("click", (e) => {

        const card = e.target.closest(".shop-card");

        if(!card) return;

        if(e.target.closest(".add-to-cart-btn") ||
           e.target.closest(".buy-now-btn")){
            return;
        }

        openModal(card);

    });

    // If Add to Cart / Buy Now is tapped from inside the modal itself,
    // close the modal so it doesn't sit on top of the cart panel or the
    // checkout modal that those buttons open.
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
