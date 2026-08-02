// gallery

(function(){

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

    // delegation
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

    // swipe
    let touchStartX = 0;
    let touchStartY = 0;

    lightbox.addEventListener("touchstart", (e) => {
        if(e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, {passive: true});

    lightbox.addEventListener("touchend", (e) => {

        if(!e.changedTouches || e.changedTouches.length === 0) return;

        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const threshold = 40;

        if(absDx < threshold && absDy < threshold) return;

        if(absDx > absDy){
            if(dx < 0){
                showImage(currentIndex + 1);
            }else{
                showImage(currentIndex - 1);
            }
        }else if(dy > 0){
            closeLightbox();
        }

    }, {passive: true});

})();
