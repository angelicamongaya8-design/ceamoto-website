// ===========================
// CEAMOTO - stock.js
// Applies stock-based UI to the 4
// static "Featured Builds" cards
// (data-driven catalog cards get
// the same treatment baked
// straight into shop-catalog.js's
// render, since those are rebuilt
// on every render() call anyway).
//
// Behavior:
// - stock <= 0  -> hide the card entirely
// - 1-5 left    -> show a "Only X left!" badge
// - 6+ left     -> no badge, business as usual
// ===========================

(function(){

    function applyStock(card){

        const stock = Number(card.dataset.stock);

        if(Number.isNaN(stock)) return;

        if(stock <= 0){
            card.style.display = "none";
            return;
        }

        if(stock <= 5){

            const body = card.querySelector(".shop-card-body");

            if(body && !body.querySelector(".stock-badge")){

                const badge = document.createElement("span");
                badge.className = "stock-badge";
                badge.textContent = "Only " + stock + " left!";

                const price = body.querySelector(".shop-price");

                if(price){
                    price.insertAdjacentElement("afterend", badge);
                }else{
                    body.prepend(badge);
                }

            }

        }

    }

    document.querySelectorAll(".shop-card[data-stock]").forEach(applyStock);

})();
