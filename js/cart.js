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

    let cart = loadCart();

    const cartBtn = document.querySelector(".cart-btn");
    const cartCount = document.querySelector(".cart-count");
    const cartOverlay = document.querySelector(".cart-overlay");
    const cartPanel = document.querySelector(".cart-panel");
    const cartClose = document.querySelector(".cart-close");
    const cartItemsBox = document.querySelector(".cart-items");
    const cartSubtotalAmount = document.querySelector(".cart-subtotal-amount");
    const checkoutBtn = document.querySelector(".checkout-btn");

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

    // ADD TO CART BUTTONS
    // (event delegation so this also works for catalog
    // cards that get rendered into the page after load)

    document.addEventListener("click", (e) => {

        const btn = e.target.closest(".add-to-cart-btn");

        if(!btn) return;

        const card = btn.closest(".shop-card");

        if(!card) return;

        const product = {
            id: card.dataset.id,
            name: card.dataset.name,
            price: Number(card.dataset.price),
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

        openCart();

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

    // CHECKOUT VIA MESSENGER

    checkoutBtn.addEventListener("click", () => {

        if(cart.length === 0) return;

        let message = "Hi CEAMOTO! I'd like to order:\n\n";

        cart.forEach(item => {
            message += `- ${item.name} x${item.qty} (${formatPrice(item.price)} each)\n`;
        });

        message += `\nSubtotal: ${formatPrice(totalPrice())}`;
        message += "\n\nPlease let me know how to pay (GCash/Cash) and arrange pickup or delivery. Thank you!";

        const url = MESSENGER_URL + "?text=" + encodeURIComponent(message);

        window.open(url, "_blank");

    });

    // INITIAL RENDER

    renderCart();

})();
