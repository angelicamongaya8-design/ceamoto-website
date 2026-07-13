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

    // ===========================
    // BUSINESS HOURS
    // Open Monday-Saturday, 9:00 AM - 6:00 PM. Closed Sundays.
    // ===========================
    const dateInput = document.getElementById("bk-date");
    const dateError = document.getElementById("bk-date-error");
    const timeSelect = document.getElementById("bk-time");

    function todayParts(){
        const today = new Date();
        return {
            yyyy: today.getFullYear(),
            mm: String(today.getMonth() + 1).padStart(2, "0"),
            dd: String(today.getDate()).padStart(2, "0")
        };
    }

    // Don't allow picking a date in the past.
    if(dateInput){
        const t = todayParts();
        dateInput.min = `${t.yyyy}-${t.mm}-${t.dd}`;
    }

    // Parses an "h:mm AM/PM" option value into a 24hr hour number.
    function optionHour24(text){
        const match = /^(\d+):\d+\s*(AM|PM)$/i.exec(text.trim());
        if(!match){
            return null;
        }
        let hour = parseInt(match[1], 10);
        const isPM = match[2].toUpperCase() === "PM";
        if(isPM && hour !== 12){
            hour += 12;
        }
        if(!isPM && hour === 12){
            hour = 0;
        }
        return hour;
    }

    // Grey out (disable) time slots that no longer make sense for the
    // currently selected date - i.e. slots already passed, if the
    // selected date is today.
    function refreshTimeAvailability(){

        if(!timeSelect || !dateInput || !dateInput.value){
            return;
        }

        const t = todayParts();
        const isToday = dateInput.value === `${t.yyyy}-${t.mm}-${t.dd}`;
        const now = new Date();

        Array.from(timeSelect.options).forEach(opt => {

            if(!opt.value){
                return;
            }

            const hour24 = optionHour24(opt.value);
            const alreadyPassed = isToday && hour24 !== null &&
                (hour24 < now.getHours() || (hour24 === now.getHours() && now.getMinutes() > 0));

            opt.disabled = alreadyPassed;

            if(alreadyPassed && opt.selected){
                timeSelect.value = "";
            }

        });

    }

    function isSunday(dateStr){
        // "YYYY-MM-DD" -> Date parsed as local time (avoids UTC day-shift).
        const parts = dateStr.split("-");
        if(parts.length !== 3){
            return false;
        }
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.getDay() === 0;
    }

    function validateDate(){

        if(!dateInput || !dateInput.value){
            dateError.classList.remove("show");
            return true;
        }

        if(isSunday(dateInput.value)){
            dateError.classList.add("show");
            dateInput.value = "";
            return false;
        }

        dateError.classList.remove("show");
        return true;

    }

    if(dateInput){
        dateInput.addEventListener("change", () => {
            validateDate();
            refreshTimeAvailability();
        });
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

        if(!validateDate()){
            dateInput.scrollIntoView({block: "center", behavior: "instant"});
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
            email: document.getElementById("bk-email").value.trim(),
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
