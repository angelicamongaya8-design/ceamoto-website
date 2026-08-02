// admin

(function(){

const loginSection = document.getElementById("admin-login");
const panelSection = document.getElementById("admin-panel");

if(!loginSection || !panelSection){
return;
}

const SESSION_KEY = "ceamotoAdminPw";

const loginForm = document.getElementById("admin-login-form");
const passwordInput = document.getElementById("admin-password");
const loginError = document.getElementById("admin-login-error");
const loginBtn = document.getElementById("admin-login-btn");

const panelHeading = document.getElementById("admin-panel-heading");
const countEl = document.getElementById("admin-count");
const addBtn = document.getElementById("admin-add-btn");
const addBtnLabel = document.getElementById("admin-add-btn-label");
const refreshBtn = document.getElementById("admin-refresh-btn");
const logoutBtn = document.getElementById("admin-logout-btn");
const searchWrap = document.getElementById("admin-search-wrap");
const searchInput = document.getElementById("admin-search");
const tableBody = document.getElementById("admin-table-body");

const tabBtns = document.querySelectorAll(".admin-tab-btn");
const tabPanels = document.querySelectorAll(".admin-tab-panel");

const toastEl = document.getElementById("admin-toast");

let password = "";
let currentTab = "products";

function endpointReady(){
return typeof BOOKING_ENDPOINT_URL !== "undefined" && BOOKING_ENDPOINT_URL.indexOf("PASTE_YOUR") === -1;
}

async function callApi(body){

const res = await fetch(BOOKING_ENDPOINT_URL, {
method: "POST",
headers: {
"Content-Type": "text/plain;charset=utf-8"
},
body: JSON.stringify(body)
});

return await res.json();

}

function escapeAttr(str){
return String(str == null ? "" : str).replace(/"/g, "&quot;");
}

function escapeHtml(str){
return String(str == null ? "" : str)
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;");
}

function formatPrice(num){
return "₱" + Number(num).toLocaleString("en-US");
}

function showToast(message, isError){
toastEl.textContent = message;
toastEl.classList.toggle("error", !!isError);
toastEl.classList.add("show");
clearTimeout(toastEl._hideTimer);
toastEl._hideTimer = setTimeout(() => {
toastEl.classList.remove("show");
}, 3200);
}

// ===================== SESSION / LOGIN =====================

function showLogin(){
loginSection.classList.remove("admin-hidden");
panelSection.classList.add("admin-hidden");
}

function showPanel(){
loginSection.classList.add("admin-hidden");
panelSection.classList.remove("admin-hidden");
}

async function tryPassword(candidate){

if(!endpointReady()){
loginError.textContent = "Admin page isn't connected yet. (Missing backend URL in js/booking-config.js)";
loginError.classList.add("show");
return false;
}

try{

const data = await callApi({action: "checkPassword", password: candidate});

if(data && data.result === "success"){
return true;
}

return false;

}catch(err){
console.error("Password check failed:", err);
return false;
}

}

loginForm.addEventListener("submit", async (e) => {

e.preventDefault();

const candidate = passwordInput.value;

if(!candidate){
return;
}

loginError.classList.remove("show");
loginBtn.disabled = true;
loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';

const ok = await tryPassword(candidate);

loginBtn.disabled = false;
loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Log In';

if(ok){
password = candidate;
try{ sessionStorage.setItem(SESSION_KEY, candidate); }catch(e){}
passwordInput.value = "";
showPanel();
loadCurrentTab();
}else{
loginError.classList.add("show");
}

});

// ===================== FORGOT PASSWORD =====================

const forgotLink = document.getElementById("admin-forgot-link");
const forgotBackLink = document.getElementById("admin-forgot-back-link");
const loginCard = document.querySelector("#admin-login .admin-login-card:not(#admin-forgot-card)");
const forgotCard = document.getElementById("admin-forgot-card");
const forgotStep1 = document.getElementById("admin-forgot-step1");
const forgotStep2 = document.getElementById("admin-forgot-step2");
const forgotSuccess = document.getElementById("admin-forgot-success");
const forgotSendBtn = document.getElementById("admin-forgot-send-btn");
const forgotError = document.getElementById("admin-forgot-error");
const forgotMaskedEmail = document.getElementById("admin-forgot-masked-email");
const resetCodeInput = document.getElementById("admin-reset-code");
const resetNewPasswordInput = document.getElementById("admin-reset-new-password");
const resetConfirmPasswordInput = document.getElementById("admin-reset-confirm-password");
const resetSubmitBtn = document.getElementById("admin-reset-submit-btn");
const resetError = document.getElementById("admin-reset-error");
const resetResendLink = document.getElementById("admin-reset-resend-link");

let sendingReset = false;
let submittingReset = false;

function showForgotCard(){
loginCard.classList.add("admin-hidden");
forgotCard.classList.remove("admin-hidden");
forgotStep1.classList.remove("admin-hidden");
forgotStep2.classList.add("admin-hidden");
forgotSuccess.classList.add("admin-hidden");
forgotError.textContent = "";
resetError.textContent = "";
}

function showLoginCard(){
forgotCard.classList.add("admin-hidden");
loginCard.classList.remove("admin-hidden");
}

forgotLink.addEventListener("click", (e) => {
e.preventDefault();
showForgotCard();
});

forgotBackLink.addEventListener("click", (e) => {
e.preventDefault();
showLoginCard();
});

async function requestResetCode(){

if(sendingReset || !endpointReady()) return;

sendingReset = true;
forgotError.textContent = "";
forgotSendBtn.disabled = true;
forgotSendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

try{

const data = await callApi({action: "forgotPassword"});

if(!data || data.result !== "success"){
throw new Error((data && data.error) || "Failed to send reset code");
}

forgotMaskedEmail.textContent = data.maskedEmail || "your email";
forgotStep1.classList.add("admin-hidden");
forgotStep2.classList.remove("admin-hidden");
resetCodeInput.value = "";
resetNewPasswordInput.value = "";
resetConfirmPasswordInput.value = "";
resetError.textContent = "";

}catch(err){
console.error("Failed to send reset code:", err);
forgotError.textContent = err.message || "Something went wrong. Please try again.";
}

sendingReset = false;
forgotSendBtn.disabled = false;
forgotSendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Reset Code';

}

forgotSendBtn.addEventListener("click", requestResetCode);

resetResendLink.addEventListener("click", (e) => {
e.preventDefault();
requestResetCode();
});

resetSubmitBtn.addEventListener("click", async () => {

if(submittingReset) return;

const code = resetCodeInput.value.trim();
const newPassword = resetNewPasswordInput.value;
const confirmPassword = resetConfirmPasswordInput.value;

resetError.textContent = "";

if(!code){
resetError.textContent = "Please enter the code we emailed you.";
return;
}

if(newPassword.length < 6){
resetError.textContent = "New password must be at least 6 characters.";
return;
}

if(newPassword !== confirmPassword){
resetError.textContent = "Passwords do not match.";
return;
}

submittingReset = true;
resetSubmitBtn.disabled = true;
resetSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

try{

const data = await callApi({action: "resetPassword", code: code, newPassword: newPassword});

if(!data || data.result !== "success"){
throw new Error((data && data.error) || "Failed to reset password");
}

forgotStep2.classList.add("admin-hidden");
forgotSuccess.classList.remove("admin-hidden");

}catch(err){
console.error("Failed to reset password:", err);
resetError.textContent = err.message || "Something went wrong. Please try again.";
}

submittingReset = false;
resetSubmitBtn.disabled = false;
resetSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Reset Password';

});

logoutBtn.addEventListener("click", () => {
password = "";
try{ sessionStorage.removeItem(SESSION_KEY); }catch(e){}
allProducts = [];
allServices = [];
allGalleryImages = [];
showLogin();
});

async function restoreSession(){

let saved = "";

try{ saved = sessionStorage.getItem(SESSION_KEY) || ""; }catch(e){}

if(!saved){
showLogin();
return;
}

const ok = await tryPassword(saved);

if(ok){
password = saved;
showPanel();
loadCurrentTab();
}else{
try{ sessionStorage.removeItem(SESSION_KEY); }catch(e){}
showLogin();
}

}

// ===================== TABS =====================

const TAB_CONFIG = {
products: { heading: "Manage Products", addLabel: "Add Product", search: true, searchPlaceholder: "Search products by name..." },
services: { heading: "Manage Services", addLabel: "Add Service", search: false },
gallery: { heading: "Manage Gallery", addLabel: "Add Photo", search: false },
business: { heading: "Business Info", addLabel: "", search: false, hideAdd: true }
};

function switchTab(tab){

currentTab = tab;

tabBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
tabPanels.forEach(panel => panel.classList.toggle("admin-hidden", panel.dataset.tabPanel !== tab));

const cfg = TAB_CONFIG[tab];

panelHeading.textContent = cfg.heading;

if(cfg.hideAdd){
addBtn.classList.add("admin-hidden");
}else{
addBtn.classList.remove("admin-hidden");
addBtnLabel.textContent = cfg.addLabel;
}

if(cfg.search){
searchWrap.classList.remove("admin-hidden");
searchInput.placeholder = cfg.searchPlaceholder;
searchInput.value = "";
}else{
searchWrap.classList.add("admin-hidden");
}

if(tab === "business"){
countEl.textContent = "";
}

loadCurrentTab();

}

tabBtns.forEach(btn => {
btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function loadCurrentTab(){
if(currentTab === "products") loadProducts();
else if(currentTab === "services") loadServices();
else if(currentTab === "gallery") loadGalleryImages();
else if(currentTab === "business") loadBusinessInfo();
}

addBtn.addEventListener("click", () => {
if(currentTab === "products") openProductModal("add");
else if(currentTab === "services") openServiceModal("add");
else if(currentTab === "gallery") openGalleryModal("add");
});

refreshBtn.addEventListener("click", loadCurrentTab);

// ===================== PRODUCTS =====================

const modalOverlay = document.getElementById("admin-modal-overlay");
const modal = document.getElementById("admin-modal");
const modalTitle = document.getElementById("admin-modal-title");
const modalClose = document.getElementById("admin-modal-close");
const modalCancel = document.getElementById("admin-modal-cancel");
const modalSave = document.getElementById("admin-modal-save");
const formError = document.getElementById("admin-form-error");

const fId = document.getElementById("pf-id");
const fName = document.getElementById("pf-name");
const fPrice = document.getElementById("pf-price");
const fStock = document.getElementById("pf-stock");
const fCategory = document.getElementById("pf-category");
const fCategoryOptions = document.getElementById("pf-category-options");
const fImages = document.getElementById("pf-images");
const fDescription = document.getElementById("pf-description");
const fFeatured = document.getElementById("pf-featured");
const fActive = document.getElementById("pf-active");

let allProducts = [];
let saving = false;

function populateCategoryOptions(){
const categories = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean))).sort();
fCategoryOptions.innerHTML = categories.map(c => `<option value="${escapeAttr(c)}"></option>`).join("");
}

function statusBadges(p){

let html = "";

if(p.featured){
html += '<span class="admin-badge admin-badge-featured">Featured</span> ';
}

html += p.active
? '<span class="admin-badge admin-badge-active">Active</span>'
: '<span class="admin-badge admin-badge-inactive">Hidden</span>';

if(typeof p.stock === "number" && p.stock <= 0){
html += ' <span class="admin-badge admin-badge-lowstock">Out of stock</span>';
}else if(typeof p.stock === "number" && p.stock <= 5){
html += ' <span class="admin-badge admin-badge-lowstock">Low stock</span>';
}

return html;

}

function rowHTML(p){

const thumb = (p.images && p.images[0]) ? p.images[0] : (p.img || "");

return `
<tr data-id="${escapeAttr(p.id)}">
<td><img class="admin-thumb" src="${thumb}" alt="${escapeAttr(p.name)}" loading="lazy" onerror="this.style.opacity=0.25"></td>
<td class="admin-name-cell">
<span class="admin-product-name">${escapeHtml(p.name)}</span>
<span class="admin-product-id">${escapeHtml(p.id)}</span>
</td>
<td>${formatPrice(p.price)}</td>
<td>${escapeHtml(p.category || "-")}</td>
<td>${typeof p.stock === "number" ? p.stock : "-"}</td>
<td>${statusBadges(p)}</td>
<td class="admin-actions-cell">
<button class="admin-btn admin-btn-edit admin-edit-btn"><i class="fa-solid fa-pen"></i> Edit</button>
<button class="admin-btn admin-btn-danger admin-delete-btn"><i class="fa-solid fa-trash"></i> Delete</button>
</td>
</tr>
`;

}

function renderTable(){

const query = searchInput.value.trim().toLowerCase();

const list = query
? allProducts.filter(p => p.name.toLowerCase().includes(query))
: allProducts;

countEl.textContent = allProducts.length + (allProducts.length === 1 ? " product" : " products") +
(query ? " (" + list.length + " shown)" : "");

if(list.length === 0){
tableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="7">No products found.</td></tr>';
return;
}

const sorted = list.slice().sort((a, b) => (b.featured === true) - (a.featured === true));

tableBody.innerHTML = sorted.map(rowHTML).join("");

}

async function loadProducts(){

tableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="7">Loading products...</td></tr>';

try{

const data = await callApi({action: "listProducts", password: password});

if(!data || data.result !== "success" || !Array.isArray(data.products)){
throw new Error((data && data.error) || "Failed to load products");
}

allProducts = data.products;
populateCategoryOptions();
renderTable();

}catch(err){
console.error("Failed to load products:", err);
tableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="7">Failed to load products. Try Refresh.</td></tr>';
showToast("Failed to load products.", true);
}

}

searchInput.addEventListener("input", () => {
if(currentTab === "products") renderTable();
});

function openProductModal(mode, product){

formError.textContent = "";
formError.classList.remove("show");

if(mode === "edit" && product){
modalTitle.textContent = "Edit Product";
fId.value = product.id;
fName.value = product.name || "";
fPrice.value = product.price != null ? product.price : "";
fStock.value = product.stock != null ? product.stock : "";
fCategory.value = product.category || "";
fImages.value = (product.images && product.images.length) ? product.images.join("\n") : (product.img || "");
fDescription.value = product.description || "";
fFeatured.checked = !!product.featured;
fActive.checked = product.active !== false;
}else{
modalTitle.textContent = "Add Product";
fId.value = "";
fName.value = "";
fPrice.value = "";
fStock.value = "20";
fCategory.value = "";
fImages.value = "";
fDescription.value = "";
fFeatured.checked = false;
fActive.checked = true;
}

modalOverlay.classList.add("show");
modal.classList.add("show");

}

function closeModal(){
modalOverlay.classList.remove("show");
modal.classList.remove("show");
}

modalClose.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", () => {
closeModal();
closeServiceModal();
closeGalleryModal();
});

tableBody.addEventListener("click", (e) => {

const row = e.target.closest("tr[data-id]");

if(!row) return;

const id = row.dataset.id;
const product = allProducts.find(p => p.id === id);

if(!product) return;

if(e.target.closest(".admin-edit-btn")){
openProductModal("edit", product);
}else if(e.target.closest(".admin-delete-btn")){
deleteProduct(product);
}

});

function validateProductForm(){

const name = fName.value.trim();
const price = Number(fPrice.value);
const stock = Number(fStock.value);
const category = fCategory.value.trim();
const images = fImages.value.split("\n").map(s => s.trim()).filter(Boolean);

if(!name){
return {error: "Product name is required."};
}

if(!Number.isFinite(price) || price < 0){
return {error: "Please enter a valid price."};
}

if(!Number.isFinite(stock) || stock < 0){
return {error: "Please enter a valid stock quantity."};
}

if(!category){
return {error: "Category is required."};
}

if(images.length === 0){
return {error: "Please add at least one photo URL."};
}

return {
data: {
name: name,
price: price,
stock: stock,
category: category,
images: images,
description: fDescription.value.trim(),
featured: fFeatured.checked,
active: fActive.checked
}
};

}

modalSave.addEventListener("click", async () => {

if(saving) return;

const result = validateProductForm();

if(result.error){
formError.textContent = result.error;
formError.classList.add("show");
return;
}

saving = true;
modalSave.disabled = true;
modalSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

const isEdit = !!fId.value;
const payload = Object.assign(
{action: isEdit ? "updateProduct" : "addProduct", password: password},
isEdit ? {id: fId.value} : {},
result.data
);

try{

const data = await callApi(payload);

if(!data || data.result !== "success"){
throw new Error((data && data.error) || "Save failed");
}

closeModal();
showToast(isEdit ? "Product updated." : "Product added.");
await loadProducts();

}catch(err){
console.error("Save failed:", err);
formError.textContent = err.message || "Something went wrong saving this product.";
formError.classList.add("show");
}

saving = false;
modalSave.disabled = false;
modalSave.innerHTML = '<i class="fa-solid fa-check"></i> Save Product';

});

async function deleteProduct(product){

const ok = window.confirm('Delete "' + product.name + '"? This can\'t be undone.');

if(!ok) return;

try{

const data = await callApi({action: "deleteProduct", password: password, id: product.id});

if(!data || data.result !== "success"){
throw new Error((data && data.error) || "Delete failed");
}

showToast("Product deleted.");
await loadProducts();

}catch(err){
console.error("Delete failed:", err);
showToast("Failed to delete product.", true);
}

}

// ===================== SERVICES =====================

const servicesTableBody = document.getElementById("admin-services-table-body");

const serviceModal = document.getElementById("admin-service-modal");
const serviceModalTitle = document.getElementById("admin-service-modal-title");
const serviceModalClose = document.getElementById("admin-service-modal-close");
const serviceModalCancel = document.getElementById("admin-service-modal-cancel");
const serviceModalSave = document.getElementById("admin-service-modal-save");
const serviceFormError = document.getElementById("admin-service-form-error");

const sfId = document.getElementById("sf-id");
const sfTitle = document.getElementById("sf-title");
const sfIcon = document.getElementById("sf-icon");
const sfDescription = document.getElementById("sf-description");
const sfOrder = document.getElementById("sf-order");
const sfActive = document.getElementById("sf-active");

let allServices = [];
let savingService = false;

function serviceRowHTML(s){
return `
<tr data-id="${escapeAttr(s.id)}">
<td><i class="${escapeAttr(s.icon || 'fa-solid fa-gear')}" style="font-size:1.4rem;color:var(--secondary)"></i></td>
<td class="admin-name-cell">
<span class="admin-product-name">${escapeHtml(s.title)}</span>
<span class="admin-product-id">${escapeHtml(s.id)}</span>
</td>
<td>${escapeHtml((s.description || "").slice(0, 80))}${(s.description || "").length > 80 ? "..." : ""}</td>
<td>${s.displayOrder != null ? s.displayOrder : 0}</td>
<td>${s.active ? '<span class="admin-badge admin-badge-active">Active</span>' : '<span class="admin-badge admin-badge-inactive">Hidden</span>'}</td>
<td class="admin-actions-cell">
<button class="admin-btn admin-btn-edit admin-service-edit-btn"><i class="fa-solid fa-pen"></i> Edit</button>
<button class="admin-btn admin-btn-danger admin-service-delete-btn"><i class="fa-solid fa-trash"></i> Delete</button>
</td>
</tr>
`;
}

function renderServicesTable(){

countEl.textContent = allServices.length + (allServices.length === 1 ? " service" : " services");

if(allServices.length === 0){
servicesTableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="6">No services yet. Click "Add Service" to create one.</td></tr>';
return;
}

const sorted = allServices.slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

servicesTableBody.innerHTML = sorted.map(serviceRowHTML).join("");

}

async function loadServices(){

servicesTableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="6">Loading services...</td></tr>';

try{

const data = await callApi({action: "listServices", password: password});

if(!data || data.result !== "success" || !Array.isArray(data.services)){
throw new Error((data && data.error) || "Failed to load services");
}

allServices = data.services;
renderServicesTable();

}catch(err){
console.error("Failed to load services:", err);
servicesTableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="6">Failed to load services. Try Refresh.</td></tr>';
showToast("Failed to load services.", true);
}

}

function openServiceModal(mode, service){

serviceFormError.textContent = "";
serviceFormError.classList.remove("show");

if(mode === "edit" && service){
serviceModalTitle.textContent = "Edit Service";
sfId.value = service.id;
sfTitle.value = service.title || "";
sfIcon.value = service.icon || "";
sfDescription.value = service.description || "";
sfOrder.value = service.displayOrder != null ? service.displayOrder : 0;
sfActive.checked = service.active !== false;
}else{
serviceModalTitle.textContent = "Add Service";
sfId.value = "";
sfTitle.value = "";
sfIcon.value = "";
sfDescription.value = "";
sfOrder.value = allServices.length;
sfActive.checked = true;
}

modalOverlay.classList.add("show");
serviceModal.classList.add("show");

}

function closeServiceModal(){
modalOverlay.classList.remove("show");
serviceModal.classList.remove("show");
}

serviceModalClose.addEventListener("click", closeServiceModal);
serviceModalCancel.addEventListener("click", closeServiceModal);

servicesTableBody.addEventListener("click", (e) => {

const row = e.target.closest("tr[data-id]");

if(!row) return;

const id = row.dataset.id;
const service = allServices.find(s => s.id === id);

if(!service) return;

if(e.target.closest(".admin-service-edit-btn")){
openServiceModal("edit", service);
}else if(e.target.closest(".admin-service-delete-btn")){
deleteService(service);
}

});

serviceModalSave.addEventListener("click", async () => {

if(savingService) return;

const title = sfTitle.value.trim();

if(!title){
serviceFormError.textContent = "Service title is required.";
serviceFormError.classList.add("show");
return;
}

savingService = true;
serviceModalSave.disabled = true;
serviceModalSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

const isEdit = !!sfId.value;
const payload = Object.assign(
{action: isEdit ? "updateService" : "addService", password: password},
isEdit ? {id: sfId.value} : {},
{
title: title,
icon: sfIcon.value.trim() || "fa-solid fa-gear",
description: sfDescription.value.trim(),
displayOrder: Number(sfOrder.value) || 0,
active: sfActive.checked
}
);

try{

const data = await callApi(payload);

if(!data || data.result !== "success"){
throw new Error((data && data.error) || "Save failed");
}

closeServiceModal();
showToast(isEdit ? "Service updated." : "Service added.");
await loadServices();

}catch(err){
console.error("Save failed:", err);
serviceFormError.textContent = err.message || "Something went wrong saving this service.";
serviceFormError.classList.add("show");
}

savingService = false;
serviceModalSave.disabled = false;
serviceModalSave.innerHTML = '<i class="fa-solid fa-check"></i> Save Service';

});

async function deleteService(service){

const ok = window.confirm('Delete "' + service.title + '"? This can\'t be undone.');

if(!ok) return;

try{

const data = await callApi({action: "deleteService", password: password, id: service.id});

if(!data || data.result !== "success"){
throw new Error((data && data.error) || "Delete failed");
}

showToast("Service deleted.");
await loadServices();

}catch(err){
console.error("Delete failed:", err);
showToast("Failed to delete service.", true);
}

}

// ===================== GALLERY =====================

const galleryTableBody = document.getElementById("admin-gallery-table-body");

const galleryModal = document.getElementById("admin-gallery-modal");
const galleryModalTitle = document.getElementById("admin-gallery-modal-title");
const galleryModalClose = document.getElementById("admin-gallery-modal-close");
const galleryModalCancel = document.getElementById("admin-gallery-modal-cancel");
const galleryModalSave = document.getElementById("admin-gallery-modal-save");
const galleryFormError = document.getElementById("admin-gallery-form-error");

const gfId = document.getElementById("gf-id");
const gfImage = document.getElementById("gf-image");
const gfCategory = document.getElementById("gf-category");
const gfCaption = document.getElementById("gf-caption");
const gfOrder = document.getElementById("gf-order");
const gfActive = document.getElementById("gf-active");

let allGalleryImages = [];
let savingGallery = false;

function galleryRowHTML(g){
return `
<tr data-id="${escapeAttr(g.id)}">
<td><img class="admin-thumb" src="${escapeAttr(g.image)}" alt="${escapeAttr(g.caption)}" loading="lazy" onerror="this.style.opacity=0.25"></td>
<td>${escapeHtml(g.category || "-")}</td>
<td>${escapeHtml(g.caption || "-")}</td>
<td>${g.displayOrder != null ? g.displayOrder : 0}</td>
<td>${g.active ? '<span class="admin-badge admin-badge-active">Active</span>' : '<span class="admin-badge admin-badge-inactive">Hidden</span>'}</td>
<td class="admin-actions-cell">
<button class="admin-btn admin-btn-edit admin-gallery-edit-btn"><i class="fa-solid fa-pen"></i> Edit</button>
<button class="admin-btn admin-btn-danger admin-gallery-delete-btn"><i class="fa-solid fa-trash"></i> Delete</button>
</td>
</tr>
`;
}

function renderGalleryTable(){

countEl.textContent = allGalleryImages.length + (allGalleryImages.length === 1 ? " photo" : " photos");

if(allGalleryImages.length === 0){
galleryTableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="6">No gallery photos yet. Click "Add Photo" to create one.</td></tr>';
return;
}

const sorted = allGalleryImages.slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

galleryTableBody.innerHTML = sorted.map(galleryRowHTML).join("");

}

async function loadGalleryImages(){

galleryTableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="6">Loading gallery...</td></tr>';

try{

const data = await callApi({action: "listGalleryImages", password: password});

if(!data || data.result !== "success" || !Array.isArray(data.images)){
throw new Error((data && data.error) || "Failed to load gallery");
}

allGalleryImages = data.images;
renderGalleryTable();

}catch(err){
console.error("Failed to load gallery:", err);
galleryTableBody.innerHTML = '<tr class="admin-empty-row"><td colspan="6">Failed to load gallery. Try Refresh.</td></tr>';
showToast("Failed to load gallery.", true);
}

}

function openGalleryModal(mode, image){

galleryFormError.textContent = "";
galleryFormError.classList.remove("show");

if(mode === "edit" && image){
galleryModalTitle.textContent = "Edit Gallery Photo";
gfId.value = image.id;
gfImage.value = image.image || "";
gfCategory.value = image.category || "";
gfCaption.value = image.caption || "";
gfOrder.value = image.displayOrder != null ? image.displayOrder : 0;
gfActive.checked = image.active !== false;
}else{
galleryModalTitle.textContent = "Add Gallery Photo";
gfId.value = "";
gfImage.value = "";
gfCategory.value = "";
gfCaption.value = "";
gfOrder.value = allGalleryImages.length;
gfActive.checked = true;
}

modalOverlay.classList.add("show");
galleryModal.classList.add("show");

}

function closeGalleryModal(){
modalOverlay.classList.remove("show");
galleryModal.classList.remove("show");
}

galleryModalClose.addEventListener("click", closeGalleryModal);
galleryModalCancel.addEventListener("click", closeGalleryModal);

galleryTableBody.addEventListener("click", (e) => {

const row = e.target.closest("tr[data-id]");

if(!row) return;

const id = row.dataset.id;
const image = allGalleryImages.find(g => g.id === id);

if(!image) return;

if(e.target.closest(".admin-gallery-edit-btn")){
openGalleryModal("edit", image);
}else if(e.target.closest(".admin-gallery-delete-btn")){
deleteGalleryImage(image);
}

});

galleryModalSave.addEventListener("click", async () => {

if(savingGallery) return;

const image = gfImage.value.trim();

if(!image){
galleryFormError.textContent = "Photo URL is required.";
galleryFormError.classList.add("show");
return;
}

savingGallery = true;
galleryModalSave.disabled = true;
galleryModalSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

const isEdit = !!gfId.value;
const payload = Object.assign(
{action: isEdit ? "updateGalleryImage" : "addGalleryImage", password: password},
isEdit ? {id: gfId.value} : {},
{
image: image,
category: gfCategory.value.trim(),
caption: gfCaption.value.trim(),
displayOrder: Number(gfOrder.value) || 0,
active: gfActive.checked
}
);

try{

const data = await callApi(payload);

if(!data || data.result !== "success"){
throw new Error((data && data.error) || "Save failed");
}

closeGalleryModal();
showToast(isEdit ? "Photo updated." : "Photo added.");
await loadGalleryImages();

}catch(err){
console.error("Save failed:", err);
galleryFormError.textContent = err.message || "Something went wrong saving this photo.";
galleryFormError.classList.add("show");
}

savingGallery = false;
galleryModalSave.disabled = false;
galleryModalSave.innerHTML = '<i class="fa-solid fa-check"></i> Save Photo';

});

async function deleteGalleryImage(image){

const ok = window.confirm('Delete this photo ("' + (image.caption || image.id) + '")? This can\'t be undone.');

if(!ok) return;

try{

const data = await callApi({action: "deleteGalleryImage", password: password, id: image.id});

if(!data || data.result !== "success"){
throw new Error((data && data.error) || "Delete failed");
}

showToast("Photo deleted.");
await loadGalleryImages();

}catch(err){
console.error("Delete failed:", err);
showToast("Failed to delete photo.", true);
}

}

// ===================== BUSINESS INFO =====================

const bfAddress = document.getElementById("bf-address");
const bfPhone = document.getElementById("bf-phone");
const bfHours = document.getElementById("bf-hours");
const bfFacebook = document.getElementById("bf-facebook");
const bfShopee = document.getElementById("bf-shopee");
const bfInstagram = document.getElementById("bf-instagram");
const bfAbout = document.getElementById("bf-about");
const businessError = document.getElementById("admin-business-error");
const businessSaveBtn = document.getElementById("admin-business-save-btn");

let savingBusiness = false;

async function loadBusinessInfo(){

businessError.textContent = "";
businessError.classList.remove("show");

try{

const data = await callApi({action: "getBusinessInfoAdmin", password: password});

if(!data || data.result !== "success" || !data.info){
throw new Error((data && data.error) || "Failed to load business info");
}

const info = data.info;
bfAddress.value = info.address || "";
bfPhone.value = info.phone || "";
bfHours.value = info.hours || "";
bfFacebook.value = info.facebook_url || "";
bfShopee.value = info.shopee_url || "";
bfInstagram.value = info.instagram_url || "";
bfAbout.value = info.about_text || "";

}catch(err){
console.error("Failed to load business info:", err);
showToast("Failed to load business info.", true);
}

}

businessSaveBtn.addEventListener("click", async () => {

if(savingBusiness) return;

savingBusiness = true;
businessSaveBtn.disabled = true;
businessSaveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

const payload = {
action: "updateBusinessInfo",
password: password,
info: {
address: bfAddress.value.trim(),
phone: bfPhone.value.trim(),
hours: bfHours.value.trim(),
facebook_url: bfFacebook.value.trim(),
shopee_url: bfShopee.value.trim(),
instagram_url: bfInstagram.value.trim(),
about_text: bfAbout.value.trim()
}
};

try{

const data = await callApi(payload);

if(!data || data.result !== "success"){
throw new Error((data && data.error) || "Save failed");
}

showToast("Business info updated.");

}catch(err){
console.error("Save failed:", err);
businessError.textContent = err.message || "Something went wrong saving business info.";
businessError.classList.add("show");
}

savingBusiness = false;
businessSaveBtn.disabled = false;
businessSaveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Business Info';

});

// ===================== SHARED =====================

document.addEventListener("keydown", (e) => {
if(e.key === "Escape"){
if(modal.classList.contains("show")) closeModal();
if(serviceModal.classList.contains("show")) closeServiceModal();
if(galleryModal.classList.contains("show")) closeGalleryModal();
}
});

restoreSession();

})();
