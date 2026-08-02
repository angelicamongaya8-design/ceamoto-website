// stock

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
