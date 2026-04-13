window.startSquadTour = function() {
    const overlay = document.getElementById('tour-overlay');
    const tooltip = document.getElementById('tour-tooltip');
    const tourText = document.getElementById('tour-text');
    const nextBtn = document.getElementById('tour-next-btn');

    if (!overlay || !tooltip || !tourText || !nextBtn) return;

    const steps = [
        {
            id: 'nav-home',
            text: "Welcome to SquadFit. Track your daily goals and body metrics here."
        },
        {
            id: 'nav-vault',
            text: "The Vault contains the Universal Exercise Library. Find movements and build your custom routines."
        },
        {
            id: 'nav-squad',
            text: "The Arena. Share your journey globally or create a private Squad with your friends."
        },
        {
            id: 'nav-arena',
            text: "The Arena. Step in here to start your daily workout, log your sets, and conquer your goals."
        },
        {
            id: 'nav-history',
            text: "Review your legacy, track past workouts, and chase new personal records."
        },
        {
            id: 'nav-profile',
            text: "Adjust your settings, update your weight, and view your current Rank."
        }
    ];

    let currentStep = 0;
    
    function showStep(index) {
        if (index >= steps.length) {
            endTour();
            return;
        }

        // Clear previous highlights
        document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));

        const step = steps[index];
        const targetEl = document.getElementById(step.id);
        
        if (!targetEl) {
            // Safety fallback if element is missing
            showStep(index + 1);
            return;
        }

        targetEl.classList.add('tour-highlight');
        tourText.innerText = step.text;

        // Position tooltip
        const rect = targetEl.getBoundingClientRect();
        
        // Dynamic positioning logic
        let topPos = rect.bottom + 20;
        let leftPos = rect.left + (rect.width / 2) - 150; // Rough center point of a 300px box

        // Check if tooltip overflows bottom
        if (topPos > window.innerHeight - 150) {
            topPos = rect.top - 120; // Place above the element
        }
        
        // Check horizontal bounds
        if (leftPos < 20) leftPos = 20;
        if (leftPos > window.innerWidth - 320) leftPos = window.innerWidth - 320;

        tooltip.style.top = topPos + 'px';
        tooltip.style.left = leftPos + 'px';
        
        if (index === steps.length - 1) {
            nextBtn.innerText = "Got it";
        } else {
            nextBtn.innerText = "Next";
        }
    }

    function endTour() {
        document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }, 300);
        localStorage.setItem('tour_completed', 'true');
    }

    // Initialize UI constraints
    overlay.classList.remove('hidden');
    overlay.style.display = 'block';
    overlay.style.opacity = '1';
    
    // Slight delay to ensure DOM is fully laid out and painted before calculating positions
    setTimeout(() => {
        showStep(0);
    }, 150);

    // Event listener for Next / Got It
    nextBtn.onclick = () => {
        currentStep++;
        showStep(currentStep);
    };

    // Event listener for Skip Tour
    const skipBtn = document.getElementById('tour-skip-btn');
    if (skipBtn) {
        skipBtn.onclick = (e) => {
            e.preventDefault();
            endTour();
        };
    }
};

window.startArenaTour = function() {
    const overlay = document.getElementById('tour-overlay');
    const tooltip = document.getElementById('tour-tooltip');
    const tourText = document.getElementById('tour-text');
    const nextBtn = document.getElementById('tour-next-btn');

    if (!overlay || !tooltip || !tourText || !nextBtn) return;
    if (localStorage.getItem('arena_tour_completed') === 'true') return;

    const steps = [
        {
            selector: '.set-row',
            text: "Tap anywhere on this row to open the logging sheet and record your weight and reps.",
            waitForModal: false
        },
        {
            selector: '#arena-bottom-sheet .log-btn',
            text: "Dial in your numbers here, then tap this button to officially log the set and trigger your rest timer!",
            waitForModal: true
        }
    ];

    let currentStep = 0;
    
    function showStep(index) {
        if (index >= steps.length) {
            endTour();
            return;
        }

        document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
        const step = steps[index];
        
        const executeLayout = () => {
             const targetEl = document.querySelector(step.selector);
             if (!targetEl) {
                 setTimeout(() => executeLayout(), 200);
                 return;
             }

             targetEl.classList.add('tour-highlight');
             tourText.innerText = step.text;

             const rect = targetEl.getBoundingClientRect();
             let topPos = rect.bottom + 20;
             let leftPos = rect.left + (rect.width / 2) - 150;

             if (topPos > window.innerHeight - 150) topPos = rect.top - 120;
             if (leftPos < 20) leftPos = 20;
             if (leftPos > window.innerWidth - 320) leftPos = window.innerWidth - 320;

             tooltip.style.top = topPos + 'px';
             tooltip.style.left = leftPos + 'px';
             
             nextBtn.innerText = (index === steps.length - 1) ? "Got it" : "Next";
             tooltip.style.display = 'block';
        };

        if (step.waitForModal) {
             tooltip.style.display = 'none';
             const checkModal = setInterval(() => {
                 const bs = document.getElementById('arena-bottom-sheet');
                 if (bs && bs.classList.contains('active')) {
                      clearInterval(checkModal);
                      setTimeout(executeLayout, 300);
                 }
             }, 200);
        } else {
             executeLayout();
        }
    }

    function endTour() {
        document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }, 300);
        localStorage.setItem('arena_tour_completed', 'true');
    }

    overlay.classList.remove('hidden');
    overlay.style.display = 'block';
    overlay.style.opacity = '1';
    
    setTimeout(() => showStep(0), 150);

    nextBtn.onclick = () => {
        currentStep++;
        showStep(currentStep);
    };

    const skipBtn = document.getElementById('tour-skip-btn');
    if (skipBtn) {
        skipBtn.onclick = (e) => {
            e.preventDefault();
            endTour();
        };
    }
};
