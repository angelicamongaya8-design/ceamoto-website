// ===========================
// CEAMOTO - shop-gallery.js
// Clickable product images with
// a prev/next lightbox showing
// the 3 angles per product.
// Only triggers from inside the
// product detail modal's photo now
// (product-modal.js) - the grid
// card's own photo opens that modal
// first instead of jumping straight
// to the gallery.
// ===========================

(function(){

    // Build the lightbox once and reuse it

    const lightbox = document.createElement("div");
    lightbox.id = "product-lightbox";

    lightbox.innerHTML = `
        <span id="plightbox-close"><i class="fa-solid fa-xmark"></i></span>
        <span class="plightbox-nav plightbox-prev"><i class="fa-solid fa-chevron-left"></i></span>
        <img>
        <span class="plightbox-nav plightbox-next"><i class="fa-solid fa-chevron-right"></i></span>
        <span class="plightbox-counter"></span>
    `;

    document.body.appendChild(lightbox);

    const lightboxImg = lightbox.querySelector("img");
    const closeBtn = lightbox.querySelector("#plightbox-close");
    const prevBtn = lightbox.querySelector(".plightbox-prev");
    const nextBtn = lightbox.querySelector(".plightbox-next");
    const counter = lightbox.querySelector(".plightbox-counter");

    let currentImages = [];
    let currentIndex = 0;

    function showImage(index){

        if(currentImages.length === 0) return;

        currentIndex = (index + currentImages.length) % currentImages.length;

        lightboxImg.src = currentImages[currentIndex];

        const multiple = currentImages.length > 1;

        counter.textContent = multiple ? (currentIndex + 1) + " / " + currentImages.length : "";
        prevBtn.style.display = multiple ? "flex" : "none";
        nextBtn.style.display = multiple ? "flex" : "none";

    }

    function openLightbox(images, startIndex){

        currentImages = images;

        showImage(startIndex);

        lightbox.classList.add("show");

    }

    function closeLightbox(){
        lightbox.classList.remove("show");
    }

    // Event delegation so this also works for catalog
    // cards that get rendered into the page after load.

    document.addEventListener("click", (e) => {

        const card = e.target.closest(".product-modal-img-wrap");

        if(!card) return;

        let images = [];

        try{
            images = JSON.parse(card.dataset.images || "[]");
        }catch(err){
            images = [];
        }

        if(images.length === 0){
            const img = card.querySelector("img");
            if(img) images = [img.src];
        }

        openLightbox(images, 0);

    });

    prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showImage(currentIndex - 1);
    });

    nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showImage(currentIndex + 1);
    });

    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeLightbox();
    });

    lightbox.addEventListener("click", closeLightbox);

    lightboxImg.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    document.addEventListener("keydown", (e) => {

        if(!lightbox.classList.contains("show")) return;

        if(e.key === "Escape") closeLightbox();
        if(e.key === "ArrowLeft") showImage(currentIndex - 1);
        if(e.key === "ArrowRight") showImage(currentIndex + 1);

    });

})();
