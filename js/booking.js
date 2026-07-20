// booking

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

    // hours
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

    // past
    if(dateInput){
        const t = todayParts();
        dateInput.min = `${t.yyyy}-${t.mm}-${t.dd}`;
    }

    // parse
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

    // slots
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

            // label
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

    // reset
    function resetWaitlistUI(){

        if(waitlistBtn){
            waitlistBtn.disabled = false;
            waitlistBtn.innerHTML = '<i class="fa-solid fa-bell"></i> Sumali sa Waitlist';
        }

        if(waitlistError) waitlistError.classList.remove("show");
        if(waitlistSuccess) waitlistSuccess.classList.remove("show");

    }

    // availability
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

            // stale
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
        // parse
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

    // waitlist
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
                    // cors
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

                // scroll
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
