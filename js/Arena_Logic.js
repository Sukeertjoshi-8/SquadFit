// js/Arena_Logic.js
// Handles state management and interaction for the active "Arena" workout logger.

window.updateArenaTotals = window.updateArenaTotals || function() { 
    // Silently do nothing. Replaced by Global Overlay logic. 
};

window.startForcedSession = function (exerciseId) {
    localStorage.setItem('active', 'true');
    localStorage.setItem('workoutStartTime', Date.now());

    // Add exercise to DOM or Arena exercises if needed, but the prompt says bypass state.
    // We will still initialize the array so renderCards works.
    if (typeof Arena !== 'undefined') {
        Arena.exercises = [{
            name: exerciseId,
            targetSets: 3,
            targetReps: "8-12",
            sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
            ]
        }];
    }
    if (typeof app !== 'undefined') app.navTo('arena');
    if (typeof UI !== 'undefined') UI.renderView('arena');
};

window.activeSetRow = null;
window.sessionVolume = 0;

window.startGlobalWorkout = function(id) {
    console.log('✅ startGlobalWorkout fired for ID:', id);
    if (!window.state) window.state = {};
    window.state.isSessionActive = true;

    // Safely target the container, checking a few possible class names the overlay might use
    const container = document.querySelector('.arena-exercises-container') || document.querySelector('#global-workout-overlay .exercises-container') || document.querySelector('#global-workout-overlay');

    if (container) {
        // Only clear if we actually found a specific exercise container
        if (container.classList.contains('arena-exercises-container') || container.classList.contains('exercises-container')) {
            container.innerHTML = ''; 
        }
    } else {
        console.warn("Could not find the exercise container to clear.");
    }

    if (typeof window.addSpecificExerciseToArena === 'function') {
        window.addSpecificExerciseToArena(id);
    }

    const overlay = document.getElementById('global-workout-overlay');
    if (overlay) { 
        overlay.style.setProperty('display', 'block', 'important'); 
        overlay.style.zIndex = '9999'; 
    }

    const miniPlayer = document.getElementById('workout-mini-player');
    if (miniPlayer) miniPlayer.style.display = 'none';
};

window.openLogSheet = function (rowElement) {
    if (rowElement.classList.contains('completed') || rowElement.classList.contains('row-completed')) {
        return; // Already logged.
    }

    window.activeSetRow = rowElement;

    // Parse weight and reps
    const wVal = rowElement.dataset.weight || '20';
    const rVal = rowElement.dataset.reps || '10';

    document.getElementById('bs-weight').value = wVal;
    document.getElementById('bs-reps').value = rVal;

    document.getElementById('arena-bottom-sheet').classList.add('active');
};

window.closeLogSheet = function () {
    document.getElementById('arena-bottom-sheet').classList.remove('active');
};

window.adjReps = function (delta) {
    const el = document.getElementById('bs-reps');
    let v = parseInt(el.value) || 0;
    v += delta;
    if (v < 0) v = 0;
    el.value = v;
};

window.adjWeight = function (delta) {
    const el = document.getElementById('bs-weight');
    let v = parseFloat(el.value) || 0;
    v += delta;
    if (v < 0) v = 0;
    el.value = v;
};

window.submitLogSheet = function () {
    if (!window.activeSetRow) return;

    const wVal = parseFloat(document.getElementById('bs-weight').value) || 0;
    const rVal = parseInt(document.getElementById('bs-reps').value) || 0;

    // Update internal dataset and visual span elements
    window.activeSetRow.dataset.weight = wVal;
    window.activeSetRow.dataset.reps = rVal;

    const wSpan = window.activeSetRow.querySelector('.weight-val');
    const rSpan = window.activeSetRow.querySelector('.reps-val');
    if (wSpan) wSpan.innerText = wVal;
    if (rSpan) rSpan.innerText = rVal;

    // Volume logic
    const rowVol = wVal * rVal;
    window.sessionVolume += rowVol;

    const vd = document.querySelector('.arena-volume-display');
    const vdt = document.getElementById('arena-total-volume');
    if (vd) vd.innerText = `⚡ ${window.sessionVolume} kg`;
    if (vdt) vdt.innerText = `⚡ ${window.sessionVolume} kg`;

    // CSS Visual completion
    window.activeSetRow.classList.add('completed');
    window.activeSetRow.classList.add('row-completed');

    window.closeLogSheet();
    window.activeSetRow = null;

    if (typeof startRestTimer === 'function') {
        startRestTimer(90);
    } else if (typeof UI !== 'undefined' && UI.renderRestTimer) {
        UI.renderRestTimer(90);
    }
};

window.finishGlobalWorkout = function () {
    if (window.state) window.state.isSessionActive = false;
    const overlay = document.getElementById('global-workout-overlay');
    if (overlay) overlay.style.display = 'none';
    const mini = document.getElementById('workout-mini-player');
    if (mini) mini.style.display = 'none';
    window.forceSaveWorkout();

    const workoutData = {
        date: new Date().toISOString(),
        volume: window.state && window.state.currentVolume ? window.state.currentVolume : 0,
        exercises: window.state && window.state.activeSessionExercises ? window.state.activeSessionExercises : [],
        note: localStorage.getItem('last_workout_note')
    };
    if (window.saveWorkoutToCloud) window.saveWorkoutToCloud(workoutData);
};

window.forceSaveWorkout = function () {
    const history = JSON.parse(localStorage.getItem('workout_history') || '[]');
    const todayISO = new Date().toISOString().split('T')[0];

    // Read tracked volume from the screen wrapper since window.sessionVolume was being unreliable on reboot.
    const volText = document.querySelector('#arena-total-volume') ? document.querySelector('#arena-total-volume').innerText : (document.querySelector('.arena-volume-display') ? document.querySelector('.arena-volume-display').innerText : '0');
    const vol = parseInt(volText.replace(/[^0-9]/g, '')) || 0;

    if (vol === 0) {
        if (confirm("No weight lifted. Abort session?")) {
            window.startTime = null;
            window.sessionVolume = 0;
            if (window.minimizeWorkout) window.minimizeWorkout();
            if (typeof app !== 'undefined') app.navTo('dashboard');
            else if (typeof UI !== 'undefined') UI.renderView('dashboard');
            return;
        }
    }

    let completedExercises = [];
const cards = document.querySelectorAll('.arena-card');
cards.forEach(card => {
    let actualName = card.querySelector('.arena-header h3')?.innerText || document.querySelector('.exercise-card h3')?.innerText || document.querySelector('h3')?.innerText || 'Custom Workout';
    actualName = actualName.trim();

    if (actualName.toLowerCase() === 'e1') actualName = 'Barbell Bench Press';
    if (actualName.toLowerCase() === 'e2') actualName = 'Incline Bench Press';

    const rows = card.querySelectorAll('.set-row.completed, .arena-row.completed');
    if (rows.length > 0) {
        let sets = [];
        rows.forEach(r => {
            sets.push({
                weight: parseFloat(r.dataset.weight || r.querySelector('.weight-val')?.innerText) || 0,
                reps: parseInt(r.dataset.reps || r.querySelector('.reps-val')?.innerText) || 0
            });
        });
        completedExercises.push({ name: actualName, setDetails: sets, sets: sets.length, weight: Math.max(...sets.map(s => s.weight)), reps: Math.max(...sets.map(s => s.reps)) });
    }
});

const userNote = prompt("Add a brief private note or caption for this workout:", "") || "";

history.push({
    id: Date.now(),
    date: todayISO,
    exercises: completedExercises,
    volume: vol,
    caption: userNote,
    note: userNote
});
localStorage.setItem('workout_history', JSON.stringify(history));
localStorage.setItem('currentStreak', (parseInt(localStorage.getItem('currentStreak')) || 0) + 1);

let totalVol = parseInt(localStorage.getItem('userTotalVolume')) || 0;
localStorage.setItem('userTotalVolume', totalVol + vol);

const share = confirm("Workout complete! Share to Squad Hub?");
if (share) {
    const note = prompt("How did it feel?") || "";

    let container = document.getElementById('temp-file-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'temp-file-container';
        document.body.appendChild(container);
    }

    container.innerHTML = '<input type="file" id="invisible-workout-image" style="display:none;" accept="image/*">';
    const input = document.getElementById('invisible-workout-image');

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result;
                const currentUser = localStorage.getItem('username') || 'You';
                let posts = [];
                try { posts = JSON.parse(localStorage.getItem('squad_posts')) || []; } catch (e) { }
                posts.unshift({
                    author: currentUser,
                    text: note,
                    image: base64,
                    time: Date.now()
                });
                localStorage.setItem('squad_posts', JSON.stringify(posts));

                window.startTime = null;
                window.sessionVolume = 0;
                if (typeof app !== 'undefined') app.navTo('history');
                else if (typeof UI !== 'undefined') UI.renderView('history');
                setTimeout(() => location.reload(), 100);
            };
            reader.readAsDataURL(file);
        } else {
            window.startTime = null;
            window.sessionVolume = 0;
            if (typeof app !== 'undefined') app.navTo('history');
            else if (typeof UI !== 'undefined') UI.renderView('history');
        }
    };
    input.click();
    return; // Halt since the reader evaluates asynchronously
}

window.startTime = null;
window.sessionVolume = 0;

    if (typeof app !== 'undefined') app.navTo('history');
    else if (typeof UI !== 'undefined') UI.renderView('history');
    setTimeout(() => location.reload(), 100);
};


setInterval(() => {
    if (!window.state || !window.state.isSessionActive) { 
        document.querySelectorAll('.arena-footer-container').forEach(el => el.style.setProperty('display', 'none', 'important')); 
        return;
    } else {
        // Force it to show and ensure z-index beats the overlay
        document.querySelectorAll('.arena-footer-container').forEach(el => {
            el.style.cssText = 'display: flex !important; position: fixed; bottom: 0; left: 0; width: 100%; z-index: 9999999 !important;';
        });
    }
    const timer = document.getElementById('arena-timer-display') || document.querySelector('.arena-timer-display');
    if (!timer) return;
    if (!window.startTime) window.startTime = Date.now();
    const diff = Math.floor((Date.now() - window.startTime) / 1000);
    const m = Math.floor(diff / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    timer.innerText = `${m}:${s}`;
}, 1000);

window.Arena = {
    timerInterval: null,
    secondsElapsed: 0,
    exercises: [],

    init() {
        // Init sets a blank slate. If pre-loaded via loadRoutine, this step happens independently before navTo('arena').
        if (this.exercises.length === 0) {
            this.resetState();
        }

        if (window.state && window.state.isSessionActive) {
            if (!window.state.workoutStartTime) {
                window.state.workoutStartTime = Date.now();
            }
            this.startTimer();
        } else {
            if (window.arenaTimer) clearInterval(window.arenaTimer);
        }

        this.renderCards();
        if (typeof this.updateArenaTotals === 'function') {
            this.updateArenaTotals();
        } else if (typeof window.updateArenaTotals === 'function') {
            window.updateArenaTotals();
        }
    },

    resetState() {
        if (window.arenaTimer) clearInterval(window.arenaTimer);
        this.secondsElapsed = 0;
        this.exercises = [];
        if (window.state) {
            window.state.isSessionActive = false;
            window.state.workoutStartTime = null;
        }
    },

    beginSession() {
        if (window.state) {
            window.state.isSessionActive = true;
            window.state.workoutStartTime = Date.now();
            localStorage.setItem('workoutStartTime', window.state.workoutStartTime);
        }
        if (window.openWorkoutOverlay) {
            window.openWorkoutOverlay();
        } else if (typeof UI !== 'undefined') {
            UI.renderView('arena');
        } else if (typeof app !== 'undefined') {
            app.navTo('arena');
        }
    },

    startExerciseDirectly(exerciseId) {
        this.resetState();
        const vault = window.exerciseDB || DB.get().vault || [];
        const dbEx = vault.find(e => String(e.id) === String(exerciseId));
        if (!dbEx) return;

        const exerciseData = {
            name: dbEx.name,
            targetSets: 3,
            targetReps: "8-12",
            sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
            ]
        };

        if (!window.state) window.state = {};
        if (!window.state.activeWorkout) window.state.activeWorkout = { exercises: [] };

        window.state.activeWorkout.exercises = [exerciseData];
        this.exercises = [exerciseData];
        window.state.isSessionActive = true;
        window.state.workoutStartTime = Date.now();
        localStorage.setItem('workoutStartTime', window.state.workoutStartTime);

        if (window.arenaTimer) clearInterval(window.arenaTimer);
        this.startTimer();

        if (window.openWorkoutOverlay) {
            window.openWorkoutOverlay();
        } else if (typeof UI !== 'undefined') {
            UI.renderView('arena');
        } else if (typeof app !== 'undefined') {
            app.navTo('arena');
        }

        if (typeof this.updateArenaTotals === 'function') {
            this.updateArenaTotals();
        } else if (typeof window.updateArenaTotals === 'function') {
            window.updateArenaTotals();
        }
    },

    appendExercise(exerciseId) {
        const vault = window.exerciseDB || DB.get().vault || [];
        const dbEx = vault.find(e => String(e.id) === String(exerciseId));
        if (!dbEx) return;

        const exerciseData = {
            name: dbEx.name,
            targetSets: 3,
            targetReps: "8-12",
            sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
            ]
        };

        if (window.state && window.state.activeWorkout && window.state.activeWorkout.exercises) {
            window.state.activeWorkout.exercises.push(exerciseData);
        }
        this.exercises.push(exerciseData);

        if (window.openWorkoutOverlay) {
            window.openWorkoutOverlay();
        } else if (typeof UI !== 'undefined') {
            UI.renderView('arena');
        } else if (typeof app !== 'undefined') {
            app.navTo('arena');
        }

        setTimeout(() => {
            if (typeof this.updateArenaTotals === 'function') {
                this.updateArenaTotals();
            }
        }, 100);
    },

    loadRoutine(exercises) {
        if (window.arenaTimer) clearInterval(window.arenaTimer);
        this.secondsElapsed = 0;
        // Transform incoming exercises (e.g., from Program_Generator) into Arena's required format
        this.exercises = exercises.map(ex => {
            const targetSets = parseInt(ex.targetSets) || 3;
            const targetReps = ex.targetReps || "8-12";
            const setsArray = [];
            for (let i = 0; i < targetSets; i++) {
                setsArray.push({ weight: '', reps: '', completed: false });
            }
            return {
                name: ex.name,
                targetSets: targetSets,
                targetReps: targetReps,
                sets: setsArray
            };
        });
    },

    startTimer() {
        if (window.arenaTimer) clearInterval(window.arenaTimer);

        window.arenaTimer = setInterval(() => {
            if (!window.state.isSessionActive || !window.state.workoutStartTime) return;

            const elapsedSeconds = Math.floor((Date.now() - window.state.workoutStartTime) / 1000);
            const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
            const secs = String(elapsedSeconds % 60).padStart(2, '0');

            const timerDisplay = document.querySelector('.arena-timer-display') || document.getElementById('arena-timer-display');
            if (timerDisplay) {
                timerDisplay.innerText = `${mins}:${secs}`;
            }
        }, 1000);
    },

    renderCards() {
        const container = document.getElementById('arena-exercises-container');
        if (!container) return;

        let html = '';

        this.exercises.forEach((ex, exIndex) => {
            const vault = window.exerciseDB || (typeof DB !== 'undefined' ? DB.get().vault : []);
            const dbEx = vault ? vault.find(e => String(e.id) === String(ex.name) || e.name === ex.name) : null;
            const displayTitle = dbEx ? dbEx.name : ex.name;
            const isCardio = dbEx && dbEx.muscle && dbEx.muscle.toLowerCase() === 'cardio';

            const labelCol1 = isCardio ? 'Distance (km/mi)' : 'kg';
            const labelCol2 = isCardio ? 'Time (min)' : 'Reps';

            let setsHtml = '';

            ex.sets.forEach((set, setIndex) => {
                const isCompleted = set.completed;
                const rowClass = isCompleted ? "arena-row row-completed" : "arena-row";
                const wStatus = set.weight !== '' ? set.weight : '--';
                const rStatus = set.reps !== '' ? set.reps : '--';

                setsHtml += `
                    <div id="row-${exIndex}-${setIndex}" class="${rowClass} set-row" onclick="window.openLogSheet(this)" data-weight="${set.weight}" data-reps="${set.reps}" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                        <span class="arena-set-num" style="font-weight:bold; color: #FFF; background: #333; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.8rem;">${setIndex + 1}</span>
                        <span style="color: var(--accent-cyan); font-weight: bold; font-size: 1.1rem;"><span class="weight-val">${wStatus}</span> <span style="font-size:0.8rem; color:#A0A0A0; font-weight:normal;">kg</span></span>
                        <span style="color: #FFF; font-weight: bold; font-size: 1.1rem;"><span class="reps-val">${rStatus}</span> <span style="font-size:0.8rem; color:#A0A0A0; font-weight:normal;">reps</span></span>
                    </div>
                `;
            });

            let targetBadgeHTML = '';
            if (ex.targetSets && ex.targetReps) {
                targetBadgeHTML = `
                    <div style="background: rgba(0, 209, 255, 0.1); border: 1px solid rgba(0, 209, 255, 0.3); border-radius: 4px; padding: 4px 8px; margin-bottom: 8px; margin-top: 4px; display: inline-block;">
                        <span style="color: var(--accent-cyan); font-size: 0.8rem; font-weight: bold;">🎯 Target: ${ex.targetReps} Reps</span>
                    </div>
                `;
            }

            html += `
                <div class="arena-card fade-in">
                    <div class="arena-header" style="flex-direction: column; align-items: flex-start; gap: 0;">
                        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                            <h3 style="margin: 0;">${displayTitle}</h3>
                            <button style="background:none; border:none; color: var(--accent-cyan); font-weight: bold; cursor:pointer;" onclick="console.log('Remove Exercise')">✕</button>
                        </div>
                        ${targetBadgeHTML}
                    </div>
                    <div id="ex-rows-${exIndex}" style="margin-top: 12px;">
                        ${setsHtml}
                    </div>
                    <button class="secondary-btn" style="width: 100%; margin-top: 12px; border: 1px dashed rgba(255,255,255,0.2); color: #A0A0A0; padding: 12px;" onclick="Arena.addSet(${exIndex})">
                        + Add Set
                    </button>
                </div>
            `;
        });


        html += `
            <div style="text-align: center; margin-top: var(--space-xl); padding: 0 16px;">
                <button class="secondary-btn" style="border: 1px dashed var(--accent-cyan); color: var(--accent-cyan); background: transparent; width: 100%; padding: 16px;" onclick="document.getElementById('exercise-picker-modal').classList.add('active')">
                    + Add Exercise
                </button>
            </div>
        `;

        container.innerHTML = html;
    },

    updateSetValue(exIndex, setIndex, field, value) {
        this.exercises[exIndex].sets[setIndex][field] = value;
    },

    addSet(exIndex) {
        this.exercises[exIndex].sets.push({ weight: '', reps: '', completed: false });
        this.renderCards();
    },

    addSet(exIndex) {
        this.exercises[exIndex].sets.push({ weight: '', reps: '', completed: false });
        this.renderCards();
    }
};

window.logWater = function (amt) {
    let w = parseInt(localStorage.getItem('hydrationToday')) || 0;
    w += amt;
    if (w < 0) w = 0;
    localStorage.setItem('hydrationToday', w);

    const d = document.querySelector('.hydration-zone .text-right, [style*="0 / 2800"]');
    if (d) d.innerText = w + ' / 2800 ml';

    // Fallbacks connecting to my actual markup while preserving user's precise code rules:
    const hd = document.getElementById('hydration-counter');
    if (hd) hd.innerText = w + ' / 2800 ml';
    const fill = document.getElementById('hydro-fill') || document.getElementById('hydration-bar-fill');
    if (fill) fill.style.width = Math.min((w / 2800) * 100, 100) + '%';
};

// End of Arena_Logic.js

window.createNewSquad = function () {
    const input = document.getElementById('squad-name-input');
    const squadName = input ? input.value.trim() : '';
    if (!squadName) return alert('Enter a squad name');

    const username = localStorage.getItem('username') || 'Guest';
    const squads = JSON.parse(localStorage.getItem('squads') || '[]');

    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    squads.push({
        id: newId,
        name: squadName,
        admin: username,
        members: [username]
    });
    localStorage.setItem('squads', JSON.stringify(squads));

    if (typeof app !== 'undefined') app.navTo('folders');
    else if (typeof UI !== 'undefined') UI.renderView('folders');
};

window.joinExistingSquad = function () {
    const input = document.getElementById('squad-invite-input');
    const code = input ? input.value.trim().toUpperCase() : '';
    if (!code) return alert('Enter an invite code');

    const squads = JSON.parse(localStorage.getItem('squads') || '[]');
    const target = squads.find(s => s.id === code);
    if (!target) return alert('Invalid invite code');

    const username = localStorage.getItem('username') || 'Guest';
    if (!target.members.includes(username)) {
        target.members.push(username);
        localStorage.setItem('squads', JSON.stringify(squads));
    }

    if (typeof app !== 'undefined') app.navTo('folders');
    else if (typeof UI !== 'undefined') UI.renderView('folders');
};

window.kickMember = function (memberUsername) {
    if (!confirm('Remove this user?')) return;
    const username = localStorage.getItem('username') || 'Guest';
    const squads = JSON.parse(localStorage.getItem('squads') || '[]');
    const target = squads.find(s => s.members.includes(username));

    if (target) {
        target.members = target.members.filter(m => m !== memberUsername);
        localStorage.setItem('squads', JSON.stringify(squads));
    }

    if (typeof app !== 'undefined') app.navTo('folders');
    else if (typeof UI !== 'undefined') UI.renderView('folders');
};

window.triggerProfileUpload = function () {
    if (confirm("Upload a new profile picture? (Click 'Cancel' to remove current picture)")) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                const base64 = event.target.result;
                localStorage.setItem('squadfit_avatar', base64);
                document.querySelectorAll('.profile-avatar, .user-avatar, img[src*="avatar"]').forEach(img => {
                    img.src = base64;
                    img.style.display = 'block';
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    } else {
        localStorage.removeItem('squadfit_avatar');
        document.querySelectorAll('.profile-avatar, .user-avatar, img[src*="avatar"]').forEach(img => {
            img.src = 'assets/default-avatar.png'; // Fallback image
        });
    }
};

window.openQuickVault = function () {
    const exName = prompt("Enter exercise name to add:");
    if (!exName || !exName.trim()) return;

    if (typeof Arena !== 'undefined' && Arena.exercises) {
        const newEx = {
            name: exName.trim(),
            targetSets: 3,
            targetReps: "8-12",
            sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
            ]
        };
        const exIndex = Arena.exercises.length;
        Arena.exercises.push(newEx);

        const container = document.getElementById('arena-exercises-container');
        if (!container) return;

        const cardHtml = `
                <div class="arena-card fade-in">
                    <div class="arena-header" style="flex-direction: column; align-items: flex-start; gap: 0;">
                        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                            <h3 style="margin: 0;">${newEx.name}</h3>
                            <button style="background:none; border:none; color: var(--accent-cyan); font-weight: bold; cursor:pointer;" onclick="console.log('Remove Exercise')">✕</button>
                        </div>
                    </div>
                    <div id="ex-rows-${exIndex}" style="margin-top: 12px;">
                        ${newEx.sets.map((s, sIdx) => `
                        <div class="arena-row" data-reps="${newEx.targetReps.split('-')[0]}" data-weight="20" onclick="window.openLogSheet(this)">
                            <div class="arena-set-num">${sIdx + 1}</div>
                            <div style="text-align: center; color: #FFF; font-weight: bold;"><span class="weight-val">--</span> <span style="font-size:0.7rem; color:#A0A0A0;">kg</span></div>
                            <div style="text-align: center; color: #FFF; font-weight: bold;"><span class="reps-val">--</span> <span style="font-size:0.7rem; color:#A0A0A0;">reps</span></div>
                            <button class="arena-check-btn" onclick="event.stopPropagation(); window.openLogSheet(this.parentElement)">✓</button>
                        </div>
                        `).join('')}
                    </div>
                    <button class="secondary-btn" style="width: 100%; margin-top: 12px; border: 1px dashed rgba(255,255,255,0.2); color: #A0A0A0; padding: 12px;" onclick="Arena.addSet(${exIndex})">
                        + Add Set
                    </button>
                </div>
        `;

        if (container.lastElementChild && container.lastElementChild.innerHTML.includes('+ Add Exercise')) {
            container.removeChild(container.lastElementChild);
        }

        container.insertAdjacentHTML('beforeend', cardHtml);

        const footerHtml = `
            <div style="text-align: center; margin-top: var(--space-xl); padding: 0 16px;">
                <button class="secondary-btn" style="border: 1px dashed var(--accent-cyan); color: var(--accent-cyan); background: transparent; width: 100%; padding: 16px;" onclick="window.openQuickVault()">
                    + Add Exercise
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', footerHtml);
    }
};

window.initiateShare = function (noteText, e) {
    if (e) {
        e.currentTarget.innerHTML = 'Sharing...';
        e.currentTarget.disabled = true;
    }

    let scope = 'global';
    if (localStorage.getItem('userSquad')) {
        if (confirm("Share to your squad? Click Cancel to post to Global.")) {
            scope = 'squad';
        }
    }

    const savePost = (images = []) => {
        const currentUser = localStorage.getItem('username') || 'Guest';
        const postObject = {
            text: noteText,
            caption: noteText,
            scope: scope,
            images: images,
            author: currentUser,
            username: currentUser,
            time: Date.now(),
            timestamp: new Date().toISOString()
        };

        const squadPosts = JSON.parse(localStorage.getItem('squad_posts') || '[]');
        squadPosts.unshift(postObject);
        localStorage.setItem('squad_posts', JSON.stringify(squadPosts));

        if (e) {
            e.currentTarget.innerHTML = 'Shared ✓';
            e.currentTarget.style.background = 'rgba(46, 204, 113, 0.2)';
            e.currentTarget.style.color = '#2ECC71';
            e.currentTarget.style.borderColor = '#2ECC71';
            e.currentTarget.disabled = true;
        }
    };

    if (confirm("Would you like to attach photos?")) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        input.setAttribute('capture', 'environment');

        input.onchange = async (ev) => {
            const files = ev.target.files;
            let base64Array = [];
            for (let i = 0; i < files.length; i++) {
                const reader = new FileReader();
                const b64 = await new Promise(r => {
                    reader.onload = eReader => r(eReader.target.result);
                    reader.readAsDataURL(files[i]);
                });
                base64Array.push(b64);
            }
            savePost(base64Array);
        };
        input.click();
    } else {
        savePost([]);
    }
};

window.addSpecificExerciseToArena = function (exerciseId) {
    const modal = document.getElementById('exercise-picker-modal');
    if (modal) modal.classList.remove('active');

    const displayTitle = window.exerciseDB && window.exerciseDB[exerciseId] ? window.exerciseDB[exerciseId].name : exerciseId;

    if (typeof Arena !== 'undefined' && Arena.exercises) {
        const newEx = {
            name: displayTitle.trim(),
            targetSets: 3,
            targetReps: "8-12",
            sets: [
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false },
                { weight: '', reps: '', completed: false }
            ]
        };
        const exIndex = Arena.exercises.length;
        Arena.exercises.push(newEx);

        const exerciseHTML = `
                <div class="arena-card fade-in">
                    <div class="arena-header" style="flex-direction: column; align-items: flex-start; gap: 0;">
                        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                            <h3 style="margin: 0;">${displayTitle}</h3>
                            <button style="background:none; border:none; color: var(--accent-cyan); font-weight: bold; cursor:pointer;" onclick="console.log('Remove Exercise')">✕</button>
                        </div>
                    </div>
                    <div id="ex-rows-${exIndex}" style="margin-top: 12px;">
                        ${newEx.sets.map((s, sIdx) => `
                        <div class="arena-row" data-reps="${newEx.targetReps.split('-')[0]}" data-weight="20" onclick="window.openLogSheet(this, '${exerciseId}', ${sIdx})">
                            <div class="arena-set-num">${sIdx + 1}</div>
                            <div style="text-align: center; color: #FFF; font-weight: bold;"><span class="weight-val">--</span> <span style="font-size:0.7rem; color:#A0A0A0;">kg</span></div>
                            <div style="text-align: center; color: #FFF; font-weight: bold;"><span class="reps-val">--</span> <span style="font-size:0.7rem; color:#A0A0A0;">reps</span></div>
                            <button class="arena-check-btn" onclick="event.stopPropagation(); window.openLogSheet(this.parentElement, '${exerciseId}', ${sIdx})">✓</button>
                        </div>
                        `).join('')}
                    </div>
                    <button class="secondary-btn" style="width: 100%; margin-top: 12px; border: 1px dashed rgba(255,255,255,0.2); color: #A0A0A0; padding: 12px;" onclick="Arena.addSet(${exIndex})">
                        + Add Set
                    </button>
                </div>
        `;

        let container = document.querySelector('#global-workout-overlay .arena-exercises-container') || document.querySelector('.arena-exercises-container');

        if (!container) {
            const overlay = document.getElementById('global-workout-overlay');
            if (!overlay) { console.error("No overlay found."); return; }

            container = document.createElement('div');
            container.className = 'arena-exercises-container';
            // Insert after header, before the finish button
            overlay.insertBefore(container, overlay.children[1] || overlay.firstChild);
        }

        if (container.lastElementChild && container.lastElementChild.innerHTML.includes('+ Add Exercise')) {
            container.removeChild(container.lastElementChild);
        }

        container.insertAdjacentHTML('beforeend', exerciseHTML);

        const footerHtml = `
            <div style="text-align: center; margin-top: var(--space-xl); padding: 0 16px;">
                <button class="secondary-btn" style="border: 1px dashed var(--accent-cyan); color: var(--accent-cyan); background: transparent; width: 100%; padding: 16px;" onclick="document.getElementById('exercise-picker-modal').classList.add('active')">
                    + Add Exercise
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', footerHtml);
    }
};

window.deletePost = function(postId) {
    let posts = JSON.parse(localStorage.getItem('squad_posts') || '[]');
    posts = posts.filter(p => p.id !== postId && String(p.id) !== String(postId) && String(p.time) !== String(postId) && String(p.timestamp) !== String(postId));
    localStorage.setItem('squad_posts', JSON.stringify(posts));
    if(window.app && window.app.renderView) window.app.renderView('profile');
    if(typeof UI !== 'undefined' && UI.renderView) UI.renderView('profile');
};

window.syncGoalCalendar = function() {
    try {
        const currentWt = parseFloat(localStorage.getItem('profile_currentWt')) || 85;
        const targetWt = parseFloat(localStorage.getItem('profile_targetWt')) || 67;
        const goalDateStr = localStorage.getItem('profile_goalDate');
        let daysLeft = 0;

        if (goalDateStr && goalDateStr !== 'undefined') {
            let goalDate;
            if (goalDateStr.includes('-')) {
                const parts = goalDateStr.split('-');
                if (parts[0].length === 4) {
                    goalDate = new Date(goalDateStr); // YYYY-MM-DD
                } else if (parts[2].length === 4) {
                    goalDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // DD-MM-YYYY to YYYY-MM-DD
                } else {
                    goalDate = new Date(goalDateStr);
                }
            } else {
                goalDate = new Date(goalDateStr);
            }

            if (!isNaN(goalDate.getTime())) {
                const today = new Date();
                daysLeft = Math.max(0, Math.ceil((goalDate - today) / (1000 * 60 * 60 * 24)));
            }
        }
        daysLeft = daysLeft > 0 ? daysLeft : 60; // safe fallback

        const kgToLose = Math.max(0, currentWt - targetWt).toFixed(1);
        const reqRate = daysLeft > 0 ? (kgToLose / (daysLeft / 7)).toFixed(2) : 0;

        const daysEl = document.getElementById('dash-days-left');
        const kgEl = document.getElementById('dash-kg-lose');
        const rateEl = document.getElementById('dash-req-rate');

        if (daysEl) daysEl.innerText = daysLeft;
        if (kgEl) kgEl.innerText = kgToLose;
        if (rateEl) rateEl.innerText = reqRate;
    } catch (e) {
        console.error("Dashboard sync failed safely:", e);
    }
};

window.saveProfile = function(btnElement) {
    const currentWt = document.getElementById('prof-current-wt')?.value;
    const targetWt = document.getElementById('prof-target-wt')?.value;
    const goalDate = document.getElementById('prof-goal-date')?.value;

    if(currentWt) localStorage.setItem('profile_currentWt', currentWt);
    if(targetWt) localStorage.setItem('profile_targetWt', targetWt);
    if(goalDate) localStorage.setItem('profile_goalDate', goalDate);

    if (typeof window.syncGoalCalendar === 'function') window.syncGoalCalendar();

    if (btnElement) {
        const oldText = btnElement.innerText;
        btnElement.innerText = "✓ Saved!";
        setTimeout(() => { btnElement.innerText = oldText; }, 2000);
    }
};

