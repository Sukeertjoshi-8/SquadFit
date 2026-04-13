// js/Arena_Logic.js
// Handles state management and interaction for the active "Arena" workout logger.

window.startForcedSession = function(exerciseId) {
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

window.openLogSheet = function(rowElement) {
    if (rowElement.classList.contains('completed') || rowElement.classList.contains('row-completed')) {
        return; // Already logged.
    }
    
    window.activeSetRow = rowElement;
    
    // Parse weight and reps
    const wVal = rowElement.dataset.weight || '20';
    const rVal = rowElement.dataset.reps || '10';
    
    document.getElementById('bs-weight').innerText = wVal;
    document.getElementById('bs-reps').innerText = rVal;
    
    document.getElementById('arena-bottom-sheet').classList.add('active');
};

window.closeLogSheet = function() {
    document.getElementById('arena-bottom-sheet').classList.remove('active');
};

window.adjReps = function(delta) {
    const el = document.getElementById('bs-reps');
    let v = parseInt(el.innerText) || 0;
    v += delta;
    if (v < 0) v = 0;
    el.innerText = v;
};

window.adjWeight = function(delta) {
    const el = document.getElementById('bs-weight');
    let v = parseFloat(el.innerText) || 0;
    v += delta;
    if (v < 0) v = 0;
    el.innerText = v;
};

window.submitLogSheet = function() {
    if (!window.activeSetRow) return;
    
    const wVal = parseFloat(document.getElementById('bs-weight').innerText) || 0;
    const rVal = parseInt(document.getElementById('bs-reps').innerText) || 0;
    
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
};

window.forceSaveWorkout = function() {
    const history = JSON.parse(localStorage.getItem('workout_history') || '[]');
    const todayISO = new Date().toISOString().split('T')[0];

    // Read tracked volume from the screen wrapper since window.sessionVolume was being unreliable on reboot.
    const volText = document.querySelector('#arena-total-volume') ? document.querySelector('#arena-total-volume').innerText : (document.querySelector('.arena-volume-display') ? document.querySelector('.arena-volume-display').innerText : '0');
    const vol = parseInt(volText.replace(/[^0-9]/g, '')) || 0;

    if (vol === 0) {
        if(confirm("No weight lifted. Abort session?")) {
            window.startTime = null;
            if(typeof app !== 'undefined') app.navTo('dashboard');
            else if(typeof UI !== 'undefined') UI.renderView('dashboard');
        }
        return;
    }

    let completedExercises = [];
    const cards = document.querySelectorAll('.arena-card');
    cards.forEach(card => {
        const titleEl = card.querySelector('.arena-header h3');
        if (!titleEl) return;
        const title = titleEl.innerText.trim();
        const rows = card.querySelectorAll('.set-row.completed, .arena-row.completed');
        if (rows.length > 0) {
             let sets = [];
             rows.forEach(r => {
                 sets.push({
                     weight: parseFloat(r.dataset.weight || r.querySelector('.weight-val')?.innerText) || 0,
                     reps: parseInt(r.dataset.reps || r.querySelector('.reps-val')?.innerText) || 0
                 });
             });
             completedExercises.push({ name: title, setDetails: sets, sets: sets.length, weight: Math.max(...sets.map(s=>s.weight)), reps: Math.max(...sets.map(s=>s.reps)) });
        }
    });

    history.push({
        id: Date.now(),
        date: todayISO,
        exercises: completedExercises,
        volume: vol
    });
    localStorage.setItem('workout_history', JSON.stringify(history));

    window.startTime = null;
    window.sessionVolume = 0;
    
    alert(`Workout Saved!\nTotal Volume: ${vol}kg`);
    
    if(typeof app !== 'undefined') app.navTo('history');
    else if(typeof UI !== 'undefined') UI.renderView('history');
};

setInterval(() => {
    const timer = document.getElementById('arena-timer-display') || document.querySelector('.arena-timer-display');
    if (!timer || (window.state && window.state.currentView !== 'arena')) return;
    if (!window.startTime) window.startTime = Date.now();
    const diff = Math.floor((Date.now() - window.startTime) / 1000);
    const m = Math.floor(diff/60).toString().padStart(2,'0');
    const s = (diff%60).toString().padStart(2,'0');
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
        this.updateArenaTotals();
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
        }
        if (typeof UI !== 'undefined') {
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

        if (window.arenaTimer) clearInterval(window.arenaTimer);
        this.startTimer();

        if (typeof UI !== 'undefined') {
            UI.renderView('arena');
        } else if (typeof app !== 'undefined') {
            app.navTo('arena');
        }

        this.updateArenaTotals();
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
        
        if (typeof UI !== 'undefined') {
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
            for(let i = 0; i < targetSets; i++) {
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
            const dbEx = window.exerciseDB ? window.exerciseDB.find(e => e.name === ex.name) : null;
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
                            <h3 style="margin: 0;">${ex.name}</h3>
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
                <button class="secondary-btn" style="border: 1px dashed var(--accent-cyan); color: var(--accent-cyan); background: transparent; width: 100%; padding: 16px;" onclick="if(typeof UI !== 'undefined') { UI.renderView('vault'); } else { app.navTo('vault'); }">
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

// End of Arena_Logic.js
