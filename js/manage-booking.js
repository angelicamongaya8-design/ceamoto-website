// ===========================
// CEAMOTO - manage-booking.js
// Self-service booking cancellation: the customer enters their
// Booking Reference + email, we ask the Apps Script Web App to match
// it against the Bookings sheet and mark it Cancelled (which also
// archives the row, same as when Rollie does it manually in the sheet).
// ===========================

(function(){

    const form = document.getElementById("manage-booking-form");

    if(!form){
        return;
    }

    const submitBtn = document.getElementById("mb-submit-btn");
    const errorBox = document.getElementById("mb-error");
    const successBox = document.getElementById("manage-booking-success");

    function resetSubmitBtn(){
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-calendar-xmark"></i> Cancel Booking';
    }

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        if(!form.checkValidity()){
            form.reportValidity();
            return;
        }

        errorBox.classList.remove("show");
        errorBox.textContent = "We couldn't find a matching booking. Please check your reference number and email.";

        if(typeof BOOKING_ENDPOINT_URL === "undefined" || BOOKING_ENDPOINT_URL.indexOf("PASTE_YOUR") !== -1){
            alert("This page isn't connected yet. (Missing Apps Script URL in js/booking-config.js)");
            return;
        }

        const ref = document.getElementById("mb-ref").value.trim();
        const email = document.getElementById("mb-email").value.trim();

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cancelling...';

        try{

            const res = await fetch(BOOKING_ENDPOINT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify({action: "cancel", ref: ref, email: email})
            });

            const data = await res.json();

            if(data && data.result === "success"){
                form.style.display = "none";
                successBox.classList.add("show");
            }else{
                errorBox.textContent = (data && data.error) ? data.error :
                    "We couldn't find a matching booking. Please check your reference number and email.";
                errorBox.classList.add("show");
                resetSubmitBtn();
            }

        }catch(err){

            console.error("Cancel booking failed:", err);
            errorBox.textContent = "Sorry, something went wrong. Please try again or message us directly on Facebook.";
            errorBox.classList.add("show");
            resetSubmitBtn();

        }

    });

})();
