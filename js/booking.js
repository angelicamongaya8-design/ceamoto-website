// ===========================
// CEAMOTO - booking.js
// Handles the public booking form: validation, and sending the
// booking to the Google Apps Script Web App (which appends it as
// a new row in the CEAMOTO Bookings Google Sheet - the "admin").
// ===========================

(function(){

    const form = document.getElementById("booking-form");

    if(!form){
        return;
    }

    const submitBtn = document.getElementById("bk-submit-btn");
    const modsWrap = document.getElementById("bk-mods");
    const modsError = document.getElementById("bk-mods-error");
    const successBox = document.getElementById("booking-success");

    // Don't allow picking a date in the past.
    const dateInput = document.getElementById("bk-date");
    if(dateInput){
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        dateInput.min = `${yyyy}-${mm}-${dd}`;
    }

    function getSelectedMods(){
        return Array.from(modsWrap.querySelectorAll("input[type='checkbox']:checked"))
            .map(cb => cb.value);
    }

    function resetSubmitBtn(){
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Submit Booking';
    }

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        if(!form.checkValidity()){
            form.reportValidity();
            return;
        }

        const selectedMods = getSelectedMods();

        if(selectedMods.length === 0){
            modsError.classList.add("show");
            modsWrap.scrollIntoView({block: "center", behavior: "instant"});
            return;
        }

        modsError.classList.remove("show");

        if(typeof BOOKING_ENDPOINT_URL === "undefined" || BOOKING_ENDPOINT_URL.indexOf("PASTE_YOUR") !== -1){
            alert("Booking form isn't connected yet. (Missing Apps Script URL in js/booking-config.js)");
            return;
        }

        const booking = {
            name: document.getElementById("bk-name").value.trim(),
            contact: document.getElementById("bk-contact").value.trim(),
            facebook: document.getElementById("bk-fb").value.trim(),
            motorcycle: document.getElementById("bk-moto").value.trim(),
            date: document.getElementById("bk-date").value,
            time: document.getElementById("bk-time").value,
            modifications: selectedMods,
            details: document.getElementById("bk-details").value.trim()
        };

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        try{

            const res = await fetch(BOOKING_ENDPOINT_URL, {
                method: "POST",
                headers: {
                    // text/plain avoids a CORS preflight request, which
                    // Google Apps Script web apps don't handle well.
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(booking)
            });

            const data = await res.json();

            if(data && data.result === "success"){
                form.style.display = "none";
                successBox.classList.add("show");
                successBox.scrollIntoView({block: "start", behavior: "instant"});
            }else{
                throw new Error(data && data.error ? data.error : "Unknown error");
            }

        }catch(err){

            console.error("Booking submit failed:", err);
            alert("Sorry, something went wrong submitting your booking. Please try again or message us directly on Facebook.");
            resetSubmitBtn();

        }

    });

})();
