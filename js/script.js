// ===========================
// CEAMOTO - script.js
// ===========================

// ===========================
// SEAMLESS BG VIDEO ACROSS PAGES
// Same video file plays on every page (home hero + sitewide bg).
// We save its current time to localStorage as it plays, then on the
// next page load we jump the new <video> to roughly where the last
// one left off (adjusted for real time elapsed) instead of restarting
// at 0. Not frame-perfect (page load/buffering adds a little gap),
// but it removes the "starts over every tab" jump.
// ===========================

(function(){

    const vid = document.querySelector(".gelai-video-bg video, .site-video-bg video");

    if(!vid) return;

    const STORAGE_KEY = "ceamotoBgVideoState";

    function saveState(){
        try{
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                time: vid.currentTime,
                ts: Date.now()
            }));
        }catch(e){}
    }

    function restoreState(){
        try{
            const raw = localStorage.getItem(STORAGE_KEY);
            if(!raw) return;

            const state = JSON.parse(raw);
            if(!state || typeof state.time !== "number") return;

            const elapsedSinceSave = (Date.now() - state.ts) / 1000;
            let target = state.time + elapsedSinceSave;

            if(vid.duration && isFinite(vid.duration) && vid.duration > 0){
                target = target % vid.duration;
            }

            if(isFinite(target) && target >= 0){
                vid.currentTime = target;
            }
        }catch(e){}
    }

    if(vid.readyState >= 1){
        restoreState();
    }else{
        vid.addEventListener("loadedmetadata", restoreState, { once:true });
    }

    setInterval(saveState, 500);
    window.addEventListener("pagehide", saveState);
    window.addEventListener("beforeunload", saveState);

})();

// NAVBAR SCROLL EFFECT
const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {
    if (window.scrollY > 80) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
});

// ===========================
// MOBILE MENU
// ===========================

const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");

menuBtn.addEventListener("click", () => {

    navLinks.classList.toggle("active");

    if (navLinks.classList.contains("active")) {
        menuBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    } else {
        menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }

});

// Close menu when clicking links

document.querySelectorAll(".nav-links a").forEach(link => {

    link.addEventListener("click", () => {

        navLinks.classList.remove("active");

        menuBtn.innerHTML =
        '<i class="fa-solid fa-bars"></i>';

    });

});

// ===========================
// SCROLL REVEAL
// ===========================

const reveals = document.querySelectorAll(
".service-card, .shop-card, .gallery-item, .testimonial-card, .feature, .contact-card, .section-header, .about-image, .about-content, .contact-info, .contact-map"
);

function revealElements(){

    reveals.forEach(item=>{

        const top = item.getBoundingClientRect().top;

        const visible = window.innerHeight - 120;

        if(top < visible){

            item.classList.add("active");

        }

    });

}

window.addEventListener("scroll",revealElements);

revealElements();

// Add reveal class automatically

reveals.forEach(el=>{

    el.classList.add("reveal");

});

// ===========================
// SMOOTH SCROLL
// ===========================

document.querySelectorAll('a[href^="#"]').forEach(anchor=>{

    anchor.addEventListener("click",function(e){

        e.preventDefault();

        const target=document.querySelector(this.getAttribute("href"));

        if(target){

            target.scrollIntoView({

                behavior:"smooth"

            });

        }

    });

});

// ===========================
// BACK TO TOP BUTTON
// ===========================

const backBtn=document.querySelector(".back-to-top");

window.addEventListener("scroll",()=>{

    if(!backBtn) return;

    if(window.scrollY>400){

        backBtn.style.opacity="1";
        backBtn.style.pointerEvents="all";

    }else{

        backBtn.style.opacity="0";
        backBtn.style.pointerEvents="none";

    }

});

if(backBtn){

backBtn.addEventListener("click",()=>{

window.scrollTo({

top:0,

behavior:"smooth"

});

});

}

// ===========================
// ACTIVE NAVIGATION (per page)
// ===========================

const navItems=document.querySelectorAll(".nav-links a");

function setCurrentNav(){

    let currentPage=document.body.getAttribute("data-page");

    if(!currentPage){
        currentPage=location.pathname.split("/").pop().split("?")[0].split("#")[0];
        if(currentPage===""||currentPage.indexOf(".")===-1){
            currentPage="index.html";
        }
    }

    currentPage=currentPage.toLowerCase();

    navItems.forEach(link=>{

        const linkPage=link.getAttribute("href").split("#")[0].split("?")[0].toLowerCase();

        link.classList.remove("current");

        if(linkPage===currentPage){
            link.classList.add("current");
        }

    });

}

setCurrentNav();

// ===========================
// GALLERY LIGHTBOX
// ===========================

const galleryImages=document.querySelectorAll(".gallery-item img");

const lightbox=document.createElement("div");

lightbox.id="lightbox";

lightbox.innerHTML='<span id="lightbox-close"><i class="fa-solid fa-xmark"></i></span><img>';

document.body.appendChild(lightbox);

const lightboxImage=lightbox.querySelector("img");

const lightboxClose=lightbox.querySelector("#lightbox-close");

galleryImages.forEach(image=>{

image.addEventListener("click",()=>{

lightbox.classList.add("show");

lightboxImage.src=image.src;

});

});

lightbox.addEventListener("click",()=>{

lightbox.classList.remove("show");

});

lightboxClose.addEventListener("click",(e)=>{

e.stopPropagation();

lightbox.classList.remove("show");

});

lightboxImage.addEventListener("click",(e)=>{

e.stopPropagation();

});

// ===========================
// GELAI COUNTER
// ===========================

const counters=document.querySelectorAll(".gelai-stats h2");

let started=false;

function runCounter(){

if(started) return;

if(window.scrollY>100){

started=true;

counters.forEach(counter=>{

const text=counter.innerText;

const target=parseInt(text);

const suffix=text.replace(/[0-9]/g,"");

let current=0;

const speed=target/80;

const update=()=>{

current+=speed;

if(current<target){

counter.innerText=Math.floor(current)+suffix;

requestAnimationFrame(update);

}else{

counter.innerText=target+suffix;

}

};

update();

});

}

}

window.addEventListener("scroll",runCounter);

runCounter();

// ===========================
// IMAGE HOVER TILT
// ===========================

document.querySelectorAll(".gallery-item").forEach(card=>{

card.addEventListener("mousemove",(e)=>{

const rect=card.getBoundingClientRect();

const x=e.clientX-rect.left;

const y=e.clientY-rect.top;

const rotateY=((x/rect.width)-0.5)*10;

const rotateX=((y/rect.height)-0.5)*-10;

card.style.transform=

`perspective(800px)
rotateX(${rotateX}deg)
rotateY(${rotateY}deg)
scale(1.03)`;

});

card.addEventListener("mouseleave",()=>{

card.style.transform="";

});

});

// ===========================
// LOADER
// ===========================

window.addEventListener("load",()=>{

document.body.classList.add("loaded");

});

// ===========================
// CONSOLE MESSAGE 😎
// ===========================

console.log("%cCEAMOTO Website","font-size:22px;font-weight:bold;color:#d4a017;");

console.log("%cDesigned by Gelai","font-size:16px;color:white;");