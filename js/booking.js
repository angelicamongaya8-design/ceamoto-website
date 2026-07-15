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
    const bookingRefDisplay = document.getElementById("booking-ref-display");
    const checkingNote = document.getElementById("bk-time-checking");
    const fullyBookedError = document.getElementById("bk-fullybooked-error");
    const waitlistBox = document.getElementById("bk-waitlist-box");
    const waitlistBtn = document.getElementById("bk-waitlist-btn");
    const waitlistError = document.getElementById("bk-waitlist-error");
    const waitlistSuccess = document.getElementById("bk-waitlist-success");

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
    // selected date is today, or slots that are already booked (see
    // checkAvailability() below, which populates takenTimes).
    let takenTimes = [];

    function refreshTimeAvailability(){

        if(!timeSelect || !dateInput || !dateInput.value){
            return;
        }

        const t = todayParts();
        const isToday = dateInput.value === `${t.yyyy}-${t.mm}-${t.dd}`;
        const now = new Date();

        let allTaken = true;

        Array.from(timeSelect.options).forEach(opt => {

            if(!opt.value){
                return;
            }

            const hour24 = optionHour24(opt.value);
            const alreadyPassed = isToday && hour24 !== null &&
                (hour24 < now.getHours() || (hour24 === now.getHours() && now.getMinutes() > 0));
            const isTaken = takenTimes.indexOf(opt.value) !== -1;

            opt.disabled = alreadyPassed || isTaken;

            // Label taken slots so it's obvious why they're greyed out
            // (as opposed to just being in the past).
            const baseLabel = opt.dataset.baseLabel || opt.textContent;
            opt.dataset.baseLabel = baseLabel;
            opt.textContent = isTaken && !alreadyPassed ? baseLabel + " (Fully Booked)" : baseLabel;

            if(opt.disabled && opt.selected){
                timeSelect.value = "";
            }

            if(!alreadyPassed && !isTaken){
                allTaken = false;
            }

        });

        if(fullyBookedError){
            fullyBookedError.classList.toggle("show", allTaken);
        }

        if(waitlistBox){
            waitlistBox.classList.toggle("show", allTaken);
        }

    }

    // Resets the "Join Waitlist" box back to its default state (button
    // enabled, no success/error messages showing) - used whenever the
    // person picks a different date, since a waitlist join only ever
    // applies to the date that was fully booked at the time.
    function resetWaitlistUI(){

        if(waitlistBtn){
            waitlistBtn.disabled = false;
            waitlistBtn.innerHTML = '<i class="fa-solid fa-bell"></i> Sumali sa Waitlist';
        }

        if(waitlistError) waitlistError.classList.remove("show");
        if(waitlistSuccess) waitlistSuccess.classList.remove("show");

    }

    // Asks the Apps Script backend which of the day's time slots are
    // already taken for the selected date, so we don't let two people
    // book the same slot. Runs on every date change; if it fails
    // (offline, etc.) we just fall back to no slots being pre-blocked -
    // the sheet is still the source of truth and Rollie can catch a
    // rare double-booking manually.
    let availabilityRequestId = 0;

    async function checkAvailability(dateStr){

        if(!dateStr || typeof BOOKING_ENDPOINT_URL === "undefined"){
            return;
        }

        const requestId = ++availabilityRequestId;

        if(checkingNote) checkingNote.style.display = "block";
        if(fullyBookedError) fullyBookedError.classList.remove("show");

        try{

            const res = await fetch(BOOKING_ENDPOINT_URL + "?action=availability&date=" + encodeURIComponent(dateStr));
            const data = await res.json();

            // A newer request already started (person changed the date
            // again while this one was in flight) - ignore this stale result.
            if(requestId !== availabilityRequestId){
                return;
            }

            takenTimes = (data && data.result === "success" && Array.isArray(data.taken)) ? data.taken : [];

        }catch(err){
            console.error("Availability check failed:", err);
            takenTimes = [];
        }

        if(requestId === availabilityRequestId && checkingNote){
            checkingNote.style.display = "none";
        }

        refreshTimeAvailability();

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
            const valid = validateDate();
            takenTimes = [];
            resetWaitlistUI();
            refreshTimeAvailability();
            if(valid && dateInput.value){
                checkAvailability(dateInput.value);
            }
        });
    }

    // "Join Waitlist" - reuses the name/contact/email fields already
    // filled in at the top of the booking form, so the person doesn't
    // have to re-type anything. Posts to the same Apps Script backend
    // (action: "joinWaitlist"), which appends a row to the Waitlist
    // sheet and auto-emails the person if a slot on that date opens up
    // from a cancellation.
    if(waitlistBtn){

        waitlistBtn.addEventListener("click", async () => {

            if(waitlistError) waitlistError.classList.remove("show");
            if(waitlistSuccess) waitlistSuccess.classList.remove("show");

            const name = document.getElementById("bk-name").value.trim();
            const contact = document.getElementById("bk-contact").value.trim();
            const email = document.getElementById("bk-email").value.trim();
            const date = dateInput ? dateInput.value : "";

            if(!name || !contact){
                if(waitlistError){
                    waitlistError.textContent = "Punan muna ang Name at Contact Number sa taas bago sumali sa waitlist.";
                    waitlistError.classList.add("show");
                }
                return;
            }

            if(!date){
                return;
            }

            if(typeof BOOKING_ENDPOINT_URL === "undefined"){
                return;
            }

            waitlistBtn.disabled = true;
            waitlistBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sumasali...';

            try{

                const res = await fetch(BOOKING_ENDPOINT_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/plain;charset=utf-8"
                    },
                    body: JSON.stringify({
                        action: "joinWaitlist",
                        name: name,
                        contact: contact,
                        email: email,
                        date: date
                    })
                });

                const data = await res.json();

                if(data && data.result === "success"){
                    waitlistBtn.innerHTML = '<i class="fa-solid fa-check"></i> Nasa Waitlist Ka Na';
                    if(waitlistSuccess) waitlistSuccess.classList.add("show");
                }else{
                    throw new Error(data && data.error ? data.error : "Unknown error");
                }

            }catch(err){

                console.error("Join waitlist failed:", err);
                waitlistBtn.disabled = false;
                waitlistBtn.innerHTML = '<i class="fa-solid fa-bell"></i> Sumali sa Waitlist';

                if(waitlistError){
                    waitlistError.textContent = "May problema sa pag-sali sa waitlist. Subukan ulit.";
                    waitlistError.classList.add("show");
                }

            }

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

                if(bookingRefDisplay){
                    bookingRefDisplay.textContent = data.ref ? ("Booking Reference: " + data.ref) : "";
                }

                // Hiding the form makes the page much shorter, and
                // scrollIntoView() run in the same tick can compute its
                // target against the stale (taller) layout - landing the
                // person at the bottom instead of the top of the success
                // message. Wait a frame for the layout to settle, then
                // jump to a manually-computed position instead.
                requestAnimationFrame(() => {
                    const navbar = document.querySelector(".navbar");
                    const navbarH = navbar ? navbar.offsetHeight : 100;
                    const rect = successBox.getBoundingClientRect();
                    const targetY = window.scrollY + rect.top - navbarH;
                    window.scrollTo({top: Math.max(0, targetY), behavior: "instant"});
                });
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
