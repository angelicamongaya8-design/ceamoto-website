// ===========================
// CEAMOTO - cart.js
// Order-request cart (no online
// payment) - builds an order
// summary and hands it off to
// Messenger for manual payment
// (GCash/Cash) arrangement.
// ===========================

(function(){

    const STORAGE_KEY = "ceamotoCart";
    const MESSENGER_URL = "https://m.me/CEAmotorparts";

    function loadCart(){
        try{
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        }catch(e){
            return [];
        }
    }

    function saveCart(cart){
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }

    function formatPrice(num){
        return "₱" + Number(num).toLocaleString("en-US");
    }

    // TRUSTED PRICE LOOKUP
    // A customer can open devtools and edit a product card's data-price
    // attribute (or edit the cart's saved data in localStorage directly)
    // before adding to cart / checking out. To stop a tampered price from
    // ever reaching the order message Rollie sees on Messenger, every price
    // is re-derived here from a source-of-truth list instead of trusted
    // from the page/DOM/localStorage at the moment it's used.
    const FEATURED_PRICES = {
        product1: 4839,
        product2: 3499,
        product3: 3449,
        product4: 3339
    };

    function trustedPrice(id, fallbackPrice){
        if(typeof CEAMOTO_CATALOG !== "undefined"){
            const match = CEAMOTO_CATALOG.find(p => p.id === id);
            if(match) return match.price;
        }
        if(Object.prototype.hasOwnProperty.call(FEATURED_PRICES, id)){
            return FEATURED_PRICES[id];
        }
        return fallbackPrice;
    }

    function sanitizeItems(items){
        return items.map(item => ({...item, price: trustedPrice(item.id, item.price)}));
    }

    let cart = loadCart();

    const cartBtn = document.querySelector(".cart-btn");
    const cartCount = document.querySelector(".cart-count");
    const cartOverlay = document.querySelector(".cart-overlay");
    const cartPanel = document.querySelector(".cart-panel");
    const cartClose = document.querySelector(".cart-close");
    const cartItemsBox = document.querySelector(".cart-items");
    const cartSubtotalAmount = document.querySelector(".cart-subtotal-amount");
    const checkoutBtn = document.querySelector(".checkout-btn");

    const checkoutOverlay = document.querySelector(".checkout-overlay");
    const checkoutModal = document.querySelector(".checkout-modal");
    const checkoutModalClose = document.querySelector(".checkout-modal-close");
    const checkoutModalText = document.querySelector(".checkout-modal-text");
    const checkoutCopyBtn = document.querySelector(".checkout-copy-btn");
    const checkoutOpenBtn = document.querySelector(".checkout-open-btn");
    const checkoutOrderNumberEl = document.querySelector(".checkout-order-number");

    // If this page has no cart UI (shouldn't happen on shop.html,
    // but keeps the script safe if included elsewhere), stop here.
    if(!cartBtn || !cartPanel){
        return;
    }

    function totalCount(){
        return cart.reduce((sum, item) => sum + item.qty, 0);
    }

    function totalPrice(){
        return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    }

    function renderCartCount(){
        const count = totalCount();
        cartCount.textContent = count;
        cartCount.style.display = count > 0 ? "grid" : "none";
    }

    function renderCartItems(){

        if(cart.length === 0){
            cartItemsBox.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
            checkoutBtn.disabled = true;
            cartSubtotalAmount.textContent = formatPrice(0);
            return;
        }

        checkoutBtn.disabled = false;

        cartItemsBox.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.img}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <span class="cart-item-price">${formatPrice(item.price)}</span>
                    <div class="cart-item-qty">
                        <button class="qty-minus" aria-label="Decrease quantity">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <span>${item.qty}</span>
                        <button class="qty-plus" aria-label="Increase quantity">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>
                <button class="cart-item-remove" aria-label="Remove item">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `).join("");

        cartSubtotalAmount.textContent = formatPrice(totalPrice());
    }

    function renderCart(){
        renderCartCount();
        renderCartItems();
    }

    function addToCart(product){

        const existing = cart.find(item => item.id === product.id);

        if(existing){
            existing.qty += 1;
        }else{
            cart.push({...product, qty: 1});
        }

        saveCart(cart);
        renderCart();
    }

    function changeQty(id, delta){

        const item = cart.find(item => item.id === id);

        if(!item) return;

        item.qty += delta;

        if(item.qty <= 0){
            cart = cart.filter(item => item.id !== id);
        }

        saveCart(cart);
        renderCart();
    }

    function removeItem(id){
        cart = cart.filter(item => item.id !== id);
        saveCart(cart);
        renderCart();
    }

    function openCart(){
        cartOverlay.classList.add("show");
        cartPanel.classList.add("show");
    }

    function closeCart(){
        cartOverlay.classList.remove("show");
        cartPanel.classList.remove("show");
    }

    // "FLY TO CART" ANIMATION
    // Shopee-style: instead of popping the cart panel open on every
    // single Add to Cart tap (annoying when adding several items in a
    // row), clone the product's photo and animate it flying into the
    // cart icon, then give the icon a little bump. The cart itself
    // stays closed until the person actually taps it.
    function flyToCart(sourceImgEl){

        if(!sourceImgEl || !cartBtn) return;

        const startRect = sourceImgEl.getBoundingClientRect();
        const endRect = cartBtn.getBoundingClientRect();

        if(startRect.width === 0 || endRect.width === 0) return;

        const flyer = sourceImgEl.cloneNode(true);

        flyer.style.position = "fixed";
        flyer.style.left = startRect.left + "px";
        flyer.style.top = startRect.top + "px";
        flyer.style.width = startRect.width + "px";
        flyer.style.height = startRect.height + "px";
        flyer.style.margin = "0";
        flyer.style.zIndex = "100000";
        flyer.style.borderRadius = "50%";
        flyer.style.objectFit = "cover";
        flyer.style.boxShadow = "0 8px 24px rgba(0,0,0,.4)";
        flyer.style.pointerEvents = "none";
        flyer.style.transition = "transform .55s cubic-bezier(.55,0,.1,1), opacity .55s ease .1s";
        flyer.style.willChange = "transform, opacity";

        document.body.appendChild(flyer);

        const startCenterX = startRect.left + startRect.width / 2;
        const startCenterY = startRect.top + startRect.height / 2;
        const endCenterX = endRect.left + endRect.width / 2;
        const endCenterY = endRect.top + endRect.height / 2;

        const deltaX = endCenterX - startCenterX;
        const deltaY = endCenterY - startCenterY;

        // Force a reflow so the browser registers the starting position
        // before we change it, otherwise the transition gets skipped.
        void flyer.offsetWidth;

        requestAnimationFrame(() => {
            flyer.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.12)`;
            flyer.style.opacity = "0.35";
        });

        const cleanup = () => {
            flyer.remove();
            cartBtn.classList.add("bump");
            setTimeout(() => cartBtn.classList.remove("bump"), 350);
        };

        flyer.addEventListener("transitionend", cleanup, { once: true });
        setTimeout(cleanup, 700); // safety net in case transitionend never fires
    }

    // ADD TO CART BUTTONS
    // (event delegation so this also works for catalog
    // cards that get rendered into the page after load)

    document.addEventListener("click", (e) => {

        const btn = e.target.closest(".add-to-cart-btn");

        if(!btn) return;

        // closest("[data-id]") instead of ".shop-card" so this also
        // works from the product detail modal, which carries the same
        // data-id/name/price/img attributes but isn't a .shop-card.
        const card = btn.closest("[data-id]");

        if(!card) return;

        const product = {
            id: card.dataset.id,
            name: card.dataset.name,
            price: trustedPrice(card.dataset.id, Number(card.dataset.price)),
            img: card.dataset.img
        };

        addToCart(product);

        btn.classList.add("added");
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';

        setTimeout(() => {
            btn.classList.remove("added");
            btn.innerHTML = original;
        }, 1200);

        const productImg = card.querySelector("img");
        flyToCart(productImg);

    });

    // BUY NOW BUTTONS
    // Skips the cart entirely - builds a single-item order and jumps
    // straight to the checkout modal, Shopee-style.

    document.addEventListener("click", (e) => {

        const btn = e.target.closest(".buy-now-btn");

        if(!btn) return;

        const card = btn.closest("[data-id]");

        if(!card) return;

        const product = {
            id: card.dataset.id,
            name: card.dataset.name,
            price: trustedPrice(card.dataset.id, Number(card.dataset.price)),
            img: card.dataset.img,
            qty: 1
        };

        openCheckoutModal([product]);

    });

    // CART BUTTON / PANEL CONTROLS

    cartBtn.addEventListener("click", openCart);
    cartClose.addEventListener("click", closeCart);
    cartOverlay.addEventListener("click", closeCart);

    // ITEM QTY / REMOVE (event delegation)

    cartItemsBox.addEventListener("click", (e) => {

        const itemEl = e.target.closest(".cart-item");

        if(!itemEl) return;

        const id = itemEl.dataset.id;

        if(e.target.closest(".qty-plus")){
            changeQty(id, 1);
        }else if(e.target.closest(".qty-minus")){
            changeQty(id, -1);
        }else if(e.target.closest(".cart-item-remove")){
            removeItem(id);
        }

    });

    // COPY-TO-CLIPBOARD HELPER
    // (Messenger's m.me links don't reliably pre-fill a message
    // on all devices/browsers, so we copy the order summary and
    // ask the person to paste it into the chat instead.)

    function copyToClipboard(text){
        if(navigator.clipboard && navigator.clipboard.writeText){
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        }else{
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text){
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try{ document.execCommand("copy"); }catch(e){}
        document.body.removeChild(textarea);
    }

    // CHECKOUT MODAL
    // (Since Messenger can't be reliably pre-filled with the order
    // text, we show the summary in a modal so the person can copy
    // it, open Messenger, and paste it into the chat themselves.)

    // Order reference number so both the customer and CEAMOTO can point
    // to the same order when following up - not a database ID (there's
    // no backend for shop orders yet), just a shared reference stamped
    // onto the Messenger message at the moment of checkout.
    function generateOrderNumber(){
        const stamp = Date.now().toString().slice(-8);
        return "CEA-" + stamp;
    }

    function itemsTotal(items){
        return items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    }

    function buildOrderMessage(items, orderNumber){

        let message = `Hi CEAMOTO! I'd like to order (Order #${orderNumber}):\n\n`;

        items.forEach(item => {
            message += `- ${item.name} x${item.qty} (${formatPrice(item.price)} each)\n`;
        });

        message += `\nSubtotal: ${formatPrice(itemsTotal(items))}`;
        message += "\n\nPlease let me know how to pay (GCash/Cash) and arrange pickup or delivery. Thank you!";

        return message;
    }

    // items defaults to the full persisted cart (normal "Checkout" flow).
    // Buy Now passes a single-item array instead, without touching the
    // saved cart.
    function openCheckoutModal(items){

        const orderItems = sanitizeItems(items || cart);
        const orderNumber = generateOrderNumber();

        checkoutModalText.value = buildOrderMessage(orderItems, orderNumber);

        if(checkoutOrderNumberEl){
            checkoutOrderNumberEl.textContent = "Order #" + orderNumber;
        }

        copyToClipboard(checkoutModalText.value);
        checkoutOverlay.classList.add("show");
        checkoutModal.classList.add("show");
    }

    function closeCheckoutModal(){
        checkoutOverlay.classList.remove("show");
        checkoutModal.classList.remove("show");
        checkoutCopyBtn.classList.remove("copied");
        checkoutCopyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Order';
    }

    checkoutBtn.addEventListener("click", () => {
        if(cart.length === 0) return;
        openCheckoutModal();
    });

    checkoutModalClose.addEventListener("click", closeCheckoutModal);
    checkoutOverlay.addEventListener("click", (e) => {
        if(e.target === checkoutOverlay) closeCheckoutModal();
    });

    checkoutCopyBtn.addEventListener("click", () => {
        checkoutModalText.select();
        copyToClipboard(checkoutModalText.value);
        checkoutCopyBtn.classList.add("copied");
        checkoutCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => {
            checkoutCopyBtn.classList.remove("copied");
            checkoutCopyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Order';
        }, 2000);
    });

    checkoutOpenBtn.addEventListener("click", () => {
        window.open(MESSENGER_URL, "_blank");
    });

    // INITIAL RENDER

    renderCart();

    // Re-check saved cart prices once every script (including the product
    // catalog) has finished loading, in case someone edited the cart's
    // localStorage entry directly instead of using the Add to Cart button.
    window.addEventListener("load", () => {
        cart = sanitizeItems(cart);
        saveCart(cart);
        renderCart();
    });

    // shop-catalog.js now loads the real product list asynchronously
    // (fetched from the Products Google Sheet), so it can still be
    // loading after the page's "load" event fires. Once it's ready,
    // re-check the saved cart's prices again against the live data.
    window.addEventListener("ceamotoCatalogReady", () => {
        cart = sanitizeItems(cart);
        saveCart(cart);
        renderCart();
    });

})();
