// review

(function(){

const findForm = document.getElementById("find-order-form");

if(!findForm){
return;
}

const findBtn = document.getElementById("lr-find-btn");
const errorBox = document.getElementById("lr-error");
const reviewWrap = document.getElementById("review-form-wrap");
const itemsList = document.getElementById("review-items-list");
const submitBtn = document.getElementById("lr-submit-btn");
const submitErrorBox = document.getElementById("lr-submit-error");
const successBox = document.getElementById("review-success");

let currentRef = "";

function escapeHtml(str){
const div = document.createElement("div");
div.textContent = str;
return div.innerHTML;
}

function resetFindBtn(){
findBtn.disabled = false;
findBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Find My Order';
}

function resetSubmitBtn(){
submitBtn.disabled = false;
submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Review';
}

function renderItems(items){

itemsList.innerHTML = (items || []).map((item, index) => `
<div class="form-group review-item" data-product-id="${escapeHtml(item.id || "")}">
<label for="lr-item-${index}">${escapeHtml(item.name || "Product")}</label>
<textarea id="lr-item-${index}" rows="3" placeholder="Isulat ang review mo dito (optional)..."></textarea>
</div>
`).join("");

}

findForm.addEventListener("submit", async (e) => {

e.preventDefault();

if(!findForm.checkValidity()){
findForm.reportValidity();
return;
}

errorBox.classList.remove("show");

if(typeof BOOKING_ENDPOINT_URL === "undefined" || BOOKING_ENDPOINT_URL.indexOf("PASTE_YOUR") !== -1){
alert("This page isn't connected yet. (Missing Apps Script URL in js/booking-config.js)");
return;
}

const ref = document.getElementById("lr-ref").value.trim();

findBtn.disabled = true;
findBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching...';

try{

const res = await fetch(BOOKING_ENDPOINT_URL, {
method: "POST",
headers: {"Content-Type": "text/plain;charset=utf-8"},
body: JSON.stringify({action: "getOrderForReview", ref: ref})
});

const data = await res.json();

if(data && data.result === "success"){
currentRef = data.ref;
renderItems(data.items);
findForm.style.display = "none";
reviewWrap.classList.add("show");
}else{
errorBox.textContent = (data && data.error) ? data.error :
"We couldn't find that order, or it's not eligible for a review yet.";
errorBox.classList.add("show");
resetFindBtn();
}

}catch(err){

console.error("Find order for review failed:", err);
errorBox.textContent = "Sorry, something went wrong. Please try again or message us directly on Facebook.";
errorBox.classList.add("show");
resetFindBtn();

}

});

submitBtn.addEventListener("click", async () => {

submitErrorBox.classList.remove("show");

const reviewEls = itemsList.querySelectorAll(".review-item");
const reviews = [];

reviewEls.forEach((el) => {
const productId = el.dataset.productId;
const textarea = el.querySelector("textarea");
const text = textarea ? textarea.value.trim() : "";
if(text){
reviews.push({productId: productId, text: text});
}
});

if(reviews.length === 0){
submitErrorBox.textContent = "Sumulat ng kahit isang review bago mag-submit.";
submitErrorBox.classList.add("show");
return;
}

submitBtn.disabled = true;
submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

try{

const res = await fetch(BOOKING_ENDPOINT_URL, {
method: "POST",
headers: {"Content-Type": "text/plain;charset=utf-8"},
body: JSON.stringify({action: "submitReview", ref: currentRef, reviews: reviews})
});

const data = await res.json();

if(data && data.result === "success"){
reviewWrap.classList.remove("show");
successBox.classList.add("show");
}else{
submitErrorBox.textContent = (data && data.error) ? data.error :
"Something went wrong. Please try again.";
submitErrorBox.classList.add("show");
resetSubmitBtn();
}

}catch(err){

console.error("Submit review failed:", err);
submitErrorBox.textContent = "Sorry, something went wrong. Please try again or message us directly on Facebook.";
submitErrorBox.classList.add("show");
resetSubmitBtn();

}

});

})();
