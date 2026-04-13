// app.js - Main Application Controller
const API_BASE_URL = 'http://127.0.0.1:5001';

const app = {
    currentView: 'auth',
    viewHistory: [],

    startLockdownEnforcer() {
        setInterval(() => {
            const lockoutUntil = parseInt(localStorage.getItem('lockoutUntil')) || 0;
            const now = Date.now();
            const lockdownScreen = document.getElementById('lockdown-screen');
            const timerObj = document.getElementById('lockdown-timer');
            
            if (now < lockoutUntil) {
                if (lockdownScreen) lockdownScreen.style.display = 'flex';
                
                if (timerObj) {
                    const diff = lockoutUntil - now;
                    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                    const m = Math.floor((diff / 1000 / 60) % 60);
                    const s = Math.floor((diff / 1000) % 60);
                    
                    const p = (n) => n.toString().padStart(2, '0');
                    timerObj.innerHTML = d > 0 ? `${d}d ${p(h)}:${p(m)}:${p(s)}` : `${p(h)}:${p(m)}:${p(s)}`;
                }
            } else {
                if (lockdownScreen) lockdownScreen.style.display = 'none';
            }
        }, 1000);
    },

    init() {
        this.startLockdownEnforcer();
        // Initialize global active session cache
        window.activeSession = { startTime: null, logs: [], timerInterval: null, elapsedStr: '00:00' };

        // Nav to auth initially to hide other screens until Firebase confirms user
        this.navTo('auth');

        this.bindEvents();
    },

    logout(e) {
        if (e) e.stopPropagation();
        if(confirm("Are you sure you want to log out?")) {
            DB.logoutUser();
            if (typeof window.signOutUser === 'function') {
                window.signOutUser();
            }
        }
    },

    lockdownLogout() {
        const strikes = localStorage.getItem('cheatStrikes');
        const lockout = localStorage.getItem('lockoutUntil');
        
        DB.logoutUser();
        if (typeof window.signOutUser === 'function') {
            window.signOutUser();
        }
        
        if (strikes) localStorage.setItem('cheatStrikes', strikes);
        if (lockout) localStorage.setItem('lockoutUntil', lockout);
        
        const lockdownScreen = document.getElementById('lockdown-screen');
        if (lockdownScreen) lockdownScreen.style.display = 'none';
        
        const bottomNav = document.getElementById('bottom-nav');
        if (bottomNav) bottomNav.classList.add('hidden');
    },

    closeExerciseModal() {
        document.getElementById('modal-exercise-detail').classList.add('hidden');
    },

    addTempSet() {
        const w = Number(document.getElementById('modal-log-weight').value);
        const r = Number(document.getElementById('modal-log-reps').value);
        
        if (w > 0 && r > 0) {
            window.tempSets = window.tempSets || [];
            window.tempSets.push({ weight: w, reps: r });
            
            const container = document.getElementById('modal-temp-sets');
            const newIndex = window.tempSets.length;
            const newSetHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.02); border-left: 2px solid var(--accent-cyan); border-radius: 4px; margin-bottom: 8px;">
                    <span style="font-weight: bold; color: var(--text-primary);">Set ${newIndex}</span>
                    <span class="text-sec" style="font-size: 1.1rem; color: var(--text-white);">${w}kg × ${r}</span>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', newSetHtml);
            
            document.getElementById('modal-log-weight').value = '';
            document.getElementById('modal-log-reps').value = '';
        }
    },

    triggerAnalytics(type, exName) {
        const targetExercise = exName || window.currentModalExercise;
        if (!targetExercise) return;
        UI.renderAnalyticsGraph(targetExercise, type);
    },

    finishExerciseDetails() {
        if (!window.tempSets || window.tempSets.length === 0) {
             alert('Add at least one set before submitting.');
             return;
        }
        
        const data = DB.get();
        const exercise = data.vault.find(e => e.name.toLowerCase() === window.currentModalExercise.toLowerCase());
        if (!exercise) return;
        
        window.tempSets.forEach(s => {
            if(typeof window.logSet === 'function') {
                window.logSet(exercise.id, s.weight, s.reps);
            }
        });
        
        this.closeExerciseModal();
        UI.showRestTimer(() => this.navTo('activeWorkout'));
    },


    bindEvents() {
        // Navbar Routing
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.navTo(view);
                
                // Explicity execute the fetch ONLY after navTo DOM injection finishes
                if (view === 'history' && typeof window.loadHistoryHeatmap === 'function') {
                    setTimeout(() => {
                        window.loadHistoryHeatmap();
                    }, 50);
                }
            });
        });
    },

    navTo(view) {
        // Root tracking and logic
        const rootViews = ['dashboard', 'vault', 'folders', 'leaderboard', 'profile'];
        
        if (rootViews.includes(view)) {
            // Reset history when hitting a main tab
            this.viewHistory = [view];
        } else if (this.currentView && this.currentView !== 'auth' && this.currentView !== view) {
            // Push to history
            this.viewHistory.push(this.currentView);
        }

        this.currentView = view;
        
        // Hide/Show Back Button Header
        const header = document.getElementById('global-header');
        if(header) {
            header.style.display = rootViews.includes(view) ? 'none' : 'block';
        }

        document.querySelectorAll('.nav-item').forEach(b => {
            b.classList.remove('active');
            if(b.getAttribute('data-view') === view) b.classList.add('active');
        });
        UI.renderView(view);
    },

    goBack() {
        if (this.viewHistory.length > 0) {
            const previousView = this.viewHistory.pop();
            this.currentView = previousView;
            
            // Re-evaluate Header Visibility
            const rootViews = ['dashboard', 'vault', 'folders', 'leaderboard', 'profile'];
            const header = document.getElementById('global-header');
            if(header) {
                header.style.display = rootViews.includes(previousView) ? 'none' : 'block';
            }

            // Cleanly remount nav active states
            document.querySelectorAll('.nav-item').forEach(b => {
                b.classList.remove('active');
                if(b.getAttribute('data-view') === previousView) b.classList.add('active');
            });

            UI.renderView(previousView);
        } else {
            // Fallback
            this.navTo('dashboard');
        }
    },

    resumeDraft() {
        const draftStr = localStorage.getItem('squadFit_draft');
        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr);
                if (!window.state) window.state = {};
                if (!window.state.activeWorkout) window.state.activeWorkout = { exercises: [] };
                
                window.state.isSessionActive = true;
                
                if (typeof Arena !== 'undefined') {
                    Arena.exercises = draft.exercises || [];
                    if (draft.secondsElapsed) Arena.secondsElapsed = draft.secondsElapsed;
                }
                
                this.navTo('arena');
            } catch (e) {
                console.error("Draft recovery failed", e);
                this.discardDraft();
            }
        }
    },

    discardDraft() {
        localStorage.removeItem('squadFit_draft');
        if (typeof UI !== 'undefined' && UI.renderView) {
            UI.renderView('dashboard');
        }
    },

    startFreestyle() {
        // Hard-reset Arena state so it opens completely empty (no pre-loaded routine)
        if (typeof Arena !== 'undefined') {
            Arena.resetState();
        }
        this.navTo('arena');
    },

    setVaultFilter(filterName) {
        window.vaultFilter = filterName;
        if(this.currentView === 'vault') {
            UI.renderView('vault');
        }
    },

    navToLog(exerciseId) {
        window.currentExerciseId = exerciseId;
        
        if (!window.state.currentSession.startTime) {
            window.state.currentSession.startTime = new Date().getTime();
            this.startGlobalTimer();
        }
        
        this.navTo('activeWorkout');
    },

    startGlobalTimer() {
        if (!window.state.currentSession.timerInterval) {
            window.state.currentSession.timerInterval = setInterval(() => {
                const now = new Date().getTime();
                const diff = Math.floor((now - window.state.currentSession.startTime) / 1000); // seconds
                const m = String(Math.floor(diff / 60)).padStart(2, '0');
                const s = String(diff % 60).padStart(2, '0');
                window.state.currentSession.elapsedStr = `${m}:${s}`;
                
                if(typeof UI !== 'undefined' && UI.updateGlobalTimerDisplays) {
                    UI.updateGlobalTimerDisplays();
                }
            }, 1000);
        }
    },

    getElapsedStr() {
        return window.state.currentSession.elapsedStr || '00:00';
    },

    startSessionIfNeeded() {
        if(!window.activeSession.startTime) {
            window.activeSession.startTime = new Date().getTime();
            
            // Start the Chronos Engine
            window.activeSession.timerInterval = setInterval(() => {
                const now = new Date().getTime();
                const diff = Math.floor((now - window.activeSession.startTime) / 1000); // seconds
                const m = String(Math.floor(diff / 60)).padStart(2, '0');
                const s = String(diff % 60).padStart(2, '0');
                window.activeSession.elapsedStr = `${m}:${s}`;
                
                // Live UI update if the bar exists
                const timerEl = document.getElementById('session-timer-display');
                if(timerEl) timerEl.innerText = window.activeSession.elapsedStr;
            }, 1000);
        }
    },

    endActiveSession() {
        if(window.activeSession.logs.length === 0) return;

        clearInterval(window.activeSession.timerInterval);
        
        // Pass duration and logs
        window.recentWorkout = { 
            logs: window.activeSession.logs, 
            duration: window.activeSession.elapsedStr 
        };
        
        // Clear active session
        window.activeSession = { startTime: null, logs: [], timerInterval: null, elapsedStr: '00:00' };
        
        this.navTo('postWorkout');
    },

    submitActiveSet(exId) {
        const w = Number(document.getElementById('active-weight').value);
        const r = Number(document.getElementById('active-reps').value);

        if (w > 0 && r > 0) {
            window.logSet(exId, w, r);
            document.getElementById('active-weight').value = '';
            document.getElementById('active-reps').value = '';
            
            UI.showRestTimer(() => {
                if (this.currentView !== 'activeWorkout') {
                    this.navTo('activeWorkout');
                }
            });
        } else {
            alert('Please enter weight and reps valid numerical values.');
        }
    },

    async finishActiveWorkout() {
        if (!window.state.isSessionActive) {
            alert("No active session to finish!");
            return;
        }
        
        // --- ABORT GUARD: EMPTY SESSION --- //
        if (window.state.currentSession.loggedExercises.length === 0) {
            if (!window.confirm("Are you sure you want to abort this session? No sets will be saved.")) {
                return;
            }
            
            clearInterval(window.state.currentSession.timerInterval);
            
            // Explicitly tear down the ghost timer DOM UI
            const existingBar = document.getElementById('active-session-bar');
            if (existingBar) {
                existingBar.classList.add('hidden');
                existingBar.style.display = 'none';
            }
            
            // Hard reset system constraints
            window.state.isSessionActive = false;
            window.state.currentSession = {
                mode: 'free',
                routineId: null,
                routineQueue: [],
                exerciseQueue: [],
                currentIndex: 0,
                startTime: null,
                loggedExercises: [],
                totalVolume: 0,
                timerInterval: null,
                elapsedStr: '00:00'
            };
            
            alert("Workout aborted. No sets logged.");
            
            // Route dynamically based on origin
            const originMode = window.state.currentSession ? window.state.currentSession.mode : null;
            if (originMode === 'playlist' || originMode === 'squad') {
                this.navTo('vault');
            } else {
                this.navTo('dashboard');
            }
            return;
        }

        // --- INTERCEPT: OPEN POST-WORKOUT MODAL --- //
        // Pause timer natively to hold metrics while user types
        clearInterval(window.state.currentSession.timerInterval);
        const timerPaused = document.getElementById('session-timer-display');
        if (timerPaused && !timerPaused.innerText.includes("Paused")) {
             timerPaused.innerText += " (Paused)";
        }
        
        // Clear old inputs
        const noteEl = document.getElementById('workout-custom-note');
        if (noteEl) noteEl.value = '';
        
        // Expose modal
        const modal = document.getElementById('post-workout-modal');
        if (modal) modal.classList.remove('hidden');
    },

    async submitFinalWorkout(customCaption) {
        // Modal tear-down
        const modal = document.getElementById('post-workout-modal');
        if (modal) modal.classList.add('hidden');
        
        const dbData = DB.get();
        const durationStr = window.state.currentSession.elapsedStr || '00:00';
        const totalVolume = window.state.currentSession.totalVolume;
        
        // Count unique exercises using a Set
        const uniqueExercises = new Set(window.state.currentSession.loggedExercises.map(ex => ex.exerciseId)).size;
        
        dbData.workout_history = dbData.workout_history || {};
        const todayStr = new Date().toISOString().split('T')[0];
        
        const vault = dbData.vault || [];
        const exercisesMap = {};
        
        window.state.currentSession.loggedExercises.forEach(l => {
            const vx = vault.find(v => v.id === l.exerciseId);
            const exName = vx ? vx.name : "Unknown Exercise";
            if (!exercisesMap[exName]) {
                exercisesMap[exName] = { name: exName, weight: l.weight, reps: l.reps, sets: 0 };
            }
            exercisesMap[exName].sets += 1;
            if (l.weight > exercisesMap[exName].weight) {
                exercisesMap[exName].weight = l.weight;
                exercisesMap[exName].reps = l.reps;
            }
        });
        const exercisesDetailed = Object.values(exercisesMap);

        // Anti-Cheat API Validation Call (Must pass before local state destruction)
        const endTime = Date.now();
        const startTime = window.state.currentSession.startTime || (endTime - 60000); // 1-minute fallback
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
        
        const workoutPayload = {
            username: localStorage.getItem('username') || "bl",
            squad_id: (dbData.user && dbData.user.squadId) ? dbData.user.squadId : null,
            workout_volume: totalVolume,
            start_time: startTime,
            end_time: endTime,
            caption: (customCaption && customCaption.trim() !== '') ? customCaption.trim() : "",
            logs: window.state.currentSession.loggedExercises,
            date: todayStr,
            routineName: window.state.currentSession.mode === 'routine' ? "Custom Routine" : "Free Session",
            exercises: exercisesDetailed,
            notes: `Duration: ${durationStr}`
        };
        
        try {
            const response = await fetch(`${baseUrl}/api/workouts/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workoutPayload)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                let cheatStrikes = parseInt(localStorage.getItem('cheatStrikes')) || 0;
                cheatStrikes++;
                
                const penalties = [5*60000, 30*60000, 2*3600000, 12*3600000, 24*3600000, 3*86400000, 10*86400000];
                const penaltyTime = penalties[Math.min(cheatStrikes - 1, penalties.length - 1)];
                const lockoutUntil = Date.now() + penaltyTime;
                
                localStorage.setItem('cheatStrikes', cheatStrikes);
                localStorage.setItem('lockoutUntil', lockoutUntil);
                
                // --- ZERO-TOLERANCE WIPE --- //
                clearInterval(window.state.currentSession.timerInterval);
                window.state.isSessionActive = false;
                window.state.currentSession.loggedExercises = [];
                
                const historyDom = document.getElementById('session-history');
                if (historyDom) historyDom.innerHTML = '';
                
                const existingBar = document.getElementById('active-session-bar');
                if (existingBar) {
                    existingBar.classList.add('hidden');
                    existingBar.style.display = 'none';
                }
                
                if (typeof UI !== 'undefined' && UI.renderView) {
                    UI.renderView('dashboard');
                }
                
                return false; // HALT EXECUTION
            }
        } catch (e) {
            console.error("Network error validating cheat constraints:", e);
            alert("🚨 Network Error: Could not verify anti-cheat integrity.");
            return false;
        }

        // --- VALIDATION PASSED. EXECUTE DESTRUCTION --- //
        clearInterval(window.state.currentSession.timerInterval);
        
        // Reset state
        window.state.isSessionActive = false;
        window.state.currentSession = {
            mode: 'free',
            routineId: null,
            routineQueue: [],
            exerciseQueue: [],
            currentIndex: 0,
            startTime: null,
            loggedExercises: [],
            totalVolume: 0,
            timerInterval: null,
            elapsedStr: '00:00'
        };
        
        // Hide persistent bar strictly
        const existingBar = document.getElementById('active-session-bar');
        if(existingBar) {
            existingBar.classList.add('hidden');
            existingBar.style.display = 'none';
        }
        
        // Fire Confetti and delay transition
        if(typeof app.fireConfetti === 'function') app.fireConfetti();

        setTimeout(() => {
            this.navTo('history');
            
            // Highlight today visually in the history
            window.selectedHistoryDate = todayStr;
            if(typeof UI !== 'undefined' && UI.renderView) {
                UI.renderView('history');
            }
            if (typeof loadHistoryHeatmap === 'function') {
                loadHistoryHeatmap();
            }
        }, 1500);
    },
    
    showCelebrationModal(uniqueExercises, totalVolume, logs) {
        const modal = document.createElement('div');
        modal.id = 'celebration-modal';
        modal.className = 'fade-in';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(5, 7, 10, 0.95);
            backdrop-filter: blur(10px);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 2000; padding: var(--space-xl); text-align: center;
        `;
        
        modal.innerHTML = `
            <div style="font-size: 5rem; margin-bottom: var(--space-md); filter: drop-shadow(0 0 20px rgba(255, 95, 31, 0.8));">🏆</div>
            <h2 style="color: #FF5F1F; font-size: 2.2rem; margin-bottom: var(--space-sm); font-weight: 800;">Workout Complete!</h2>
            <div class="glass-panel" style="padding: var(--space-lg); margin-bottom: var(--space-xl); border-color: #FF5F1F; max-width: 400px;">
                <p style="font-size: 1.1rem; color: var(--text-white); line-height: 1.6;">
                    Incredible work! You crushed <strong style="color: var(--accent-cyan); font-size: 1.3rem;">${uniqueExercises}</strong> exercises and moved <strong style="color: var(--accent-cyan); font-size: 1.3rem;">${totalVolume} kg</strong> total volume today. Rest up, you earned it.
                </p>
            </div>
            <button class="secondary-btn" style="max-width: 300px; width: 100%; border: 1px solid var(--accent-cyan); color: var(--accent-cyan); margin-bottom: var(--space-sm);" onclick="app.showSummaryModal('${escape(JSON.stringify(logs))}')">📄 View Workout Summary</button>
            <button class="neon-btn" style="max-width: 300px;" onclick="document.getElementById('celebration-modal').remove()">Back to Home</button>
        `;
        
        document.body.appendChild(modal);
        this.fireConfetti();
    },

    showSummaryModal(logsStr) {
        // Remove celebration if it exists
        const cel = document.getElementById('celebration-modal');
        if(cel) cel.remove();

        const logs = JSON.parse(unescape(logsStr));
        const exercises = DB.get().vault;
        
        // Group logs by exercise ID
        const grouped = {};
        logs.forEach(l => {
            if(!grouped[l.exerciseId]) grouped[l.exerciseId] = [];
            grouped[l.exerciseId].push(l);
        });

        let summaryHTML = '';
        for (const [exId, sets] of Object.entries(grouped)) {
            const exName = exercises.find(e => e.id === exId)?.name || 'Unknown Exercise';
            summaryHTML += `
                <div style="margin-bottom: var(--space-lg);">
                    <h4 style="color: var(--accent-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: var(--space-sm); font-size: 1.1rem;">${exName}</h4>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        ${sets.map((s, i) => `
                            <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
                                <span class="text-sec">Set ${i+1}</span>
                                <strong>${s.weight}kg × ${s.reps}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        const modal = document.createElement('div');
        modal.id = 'summary-modal';
        modal.className = 'fade-in';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(5, 7, 10, 0.95); backdrop-filter: blur(10px);
            display: flex; align-items: center; justify-content: center; z-index: 2000; padding: var(--space-md);
        `;

        modal.innerHTML = `
            <div class="glass-panel" style="width: 100%; max-width: 500px; max-height: 80vh; display: flex; flex-direction: column; background: #161B22; border-color: rgba(255,255,255,0.1);">
                <div style="padding: var(--space-md); border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="color: var(--text-white); margin: 0;">Session Summary</h3>
                    <button style="background: none; border: none; color: var(--text-silver); font-size: 1.5rem; cursor: pointer;" onclick="document.getElementById('summary-modal').remove()">✕</button>
                </div>
                <div style="padding: var(--space-lg); overflow-y: auto; flex: 1;">
                    ${summaryHTML}
                </div>
                <div style="padding: var(--space-md); border-top: 1px solid rgba(255,255,255,0.1);">
                    <button class="neon-btn" style="width: 100%;" onclick="document.getElementById('summary-modal').remove()">Close & Go Home</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },

    fireConfetti() {
        const colors = ['#00D1FF', '#FF5F1F', '#FFFFFF', '#0A84FF'];
        for(let i = 0; i < 40; i++) {
            const conf = document.createElement('div');
            conf.style.position = 'fixed';
            conf.style.width = Math.random() * 8 + 4 + 'px';
            conf.style.height = Math.random() * 8 + 4 + 'px';
            conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            conf.style.top = '-10px';
            conf.style.left = Math.random() * 100 + 'vw';
            conf.style.opacity = 1;
            conf.style.zIndex = 2001;
            conf.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            conf.style.transition = 'top 3s ease-in, opacity 2s ease-out 1s, transform 3s linear';
            
            document.body.appendChild(conf);

            // Animate it
            setTimeout(() => {
                conf.style.top = '110vh';
                conf.style.transform = `rotate(${Math.random() * 720}deg) translateX(${(Math.random() - 0.5) * 100}px)`;
                conf.style.opacity = 0;
            }, 50);

            // Cleanup
            setTimeout(() => conf.remove(), 3050);
        }
    },

    submitLog(exId, type) {
        this.startSessionIfNeeded();
        const dbData = DB.get();

        if (type === 'strength') {
            const w = Number(document.getElementById('log-weight').value);
            const r = Number(document.getElementById('log-reps').value);
            const notes = document.getElementById('trainer-notes')?.value || '';
            const volume = w * r;

            const newLog = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                exerciseId: exId,
                notes: notes,
                sets: [{ setNumber: 1, weight: w, reps: r, volume: volume }]
            };
            dbData.strength_logs.push(newLog);
            window.activeSession.logs.push({ type: 'strength', data: newLog });
            
            DB.save(dbData);
            UI.showRestTimer(() => this.navTo('vault')); // Return to vault for multi-exercise
        } else {
            const d = Number(document.getElementById('log-duration').value);
            const s = Number(document.getElementById('log-speed').value);
            const dist = Number(document.getElementById('log-distance').value);
            const notes = document.getElementById('trainer-notes')?.value || '';
            const pace = s > 0 ? (60 / s).toFixed(2) : 0;

            const newLog = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                exerciseId: exId,
                duration: d,
                speed: s,
                distance: dist,
                pace: pace,
                notes: notes
            };
            dbData.cardio_logs.push(newLog);
            window.activeSession.logs.push({ type: 'cardio', data: newLog });
            
            DB.save(dbData);
            this.navTo('vault');
        }
    },

    simulateLogin() {
        if (DB.getUser()) {
            this.navTo('dashboard');
        } else {
            this.navTo('onboarding');
        }
    },

    completeOnboarding() {
        const name = document.getElementById('ob-name').value;
        const height = document.getElementById('ob-height').value;
        const curr = document.getElementById('ob-curr-weight').value;
        const goal = document.getElementById('ob-goal-weight').value;
        const date = document.getElementById('ob-goal-date').value;
        const gender = document.getElementById('ob-gender').value;
        const profileAge = document.getElementById('profile-age') ? document.getElementById('profile-age').value : null;

        const freqInput = document.getElementById('ob-frequency');
        const freq = freqInput ? freqInput.value : 3;
        const scheduleCheckboxes = document.querySelectorAll('input[name="ob-schedule"]:checked');
        const scheduled_days = Array.from(scheduleCheckboxes).map(cb => cb.value);

        if(!name || !height || !curr || !goal || !date || !gender) {
            alert('Please fill out all fields to unlock the arena.');
            return;
        }

        DB.saveUser({
            name,
            gender,
            height: Number(height),
            currentWeight: Number(curr),
            goalWeight: Number(goal),
            goalDate: date,
            age: profileAge ? Number(profileAge) : 25,
            weekly_goal: Number(freq),
            scheduled_days: scheduled_days,
            current_streak: 0
        });

        // Ensure newly onboarded athletes start with a perfectly empty workout history.
        // This neutralizes any fake streaks dynamically seeded by DB.init().
        const dbData = DB.get();
        dbData.workout_history = {};
        DB.save(dbData);

        // Transition from Profile Forms -> Anatomy Selection Grid.
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('view-anatomy').classList.remove('hidden');
        window.targetMuscles = []; 
    },

    switchAnatomyView(view) {
        if (view === 'front') {
            document.getElementById('anatomy-front-view').classList.remove('hidden');
            document.getElementById('anatomy-back-view').classList.add('hidden');
            document.getElementById('btn-view-front').style.borderColor = '#00E5FF';
            document.getElementById('btn-view-front').style.color = '#00E5FF';
            document.getElementById('btn-view-back').style.borderColor = 'transparent';
            document.getElementById('btn-view-back').style.color = '#A0A0A0';
        } else {
            document.getElementById('anatomy-back-view').classList.remove('hidden');
            document.getElementById('anatomy-front-view').classList.add('hidden');
            document.getElementById('btn-view-back').style.borderColor = '#00E5FF';
            document.getElementById('btn-view-back').style.color = '#00E5FF';
            document.getElementById('btn-view-front').style.borderColor = 'transparent';
            document.getElementById('btn-view-front').style.color = '#A0A0A0';
        }
    },

    toggleMuscle(groupId, btnElement) {
        if (!window.targetMuscles) window.targetMuscles = [];
        
        const index = window.targetMuscles.indexOf(groupId);
        const svgFront = document.querySelector(`#svg-front-${groupId}`);
        const svgBack = document.querySelector(`#svg-back-${groupId}`);

        if (index > -1) {
            window.targetMuscles.splice(index, 1);
            if (svgFront) svgFront.classList.remove('muscle-active');
            if (svgBack) svgBack.classList.remove('muscle-active');
            if (btnElement) btnElement.classList.remove('muscle-toggle-active');
        } else {
            window.targetMuscles.push(groupId);
            if (svgFront) svgFront.classList.add('muscle-active');
            if (svgBack) svgBack.classList.add('muscle-active');
            if (btnElement) btnElement.classList.add('muscle-toggle-active');
        }
    },

    completeAnatomy() {
        const dbData = DB.get();
        if (!dbData.user) dbData.user = {};
        dbData.user.target_muscles = window.targetMuscles || [];
        DB.save(dbData);
        
        document.getElementById('view-anatomy').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        
        this.navTo('dashboard');
    },

    enforceScheduleLimit() {
        const freqInput = document.getElementById('ob-frequency');
        if (!freqInput) return;
        const maxDays = parseInt(freqInput.value, 10);
        const checkboxes = document.querySelectorAll('input[name="ob-schedule"]');
        let checkedCount = 0;
        checkboxes.forEach(cb => { if (cb.checked) checkedCount++; });
        
        checkboxes.forEach(cb => {
            if (!cb.checked) {
                cb.disabled = (checkedCount >= maxDays);
            }
        });

        // Constraint B logic (Validation)
        const submitBtn = document.getElementById('ob-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = (checkedCount !== maxDays);
        }
    },

    saveProfile() {
        const user = DB.getUser();
        if(!user) return;

        user.name = document.getElementById('prof-name').value;
        user.age = Number(document.getElementById('prof-age').value);
        user.gender = document.getElementById('prof-gender').value;
        user.height = Number(document.getElementById('prof-height').value);
        user.currentWeight = Number(document.getElementById('prof-current-weight').value);
        user.goalWeight = Number(document.getElementById('prof-goal-weight').value);
        user.goalDate = document.getElementById('prof-goal-date').value;

        if (!user.name || !user.height || !user.currentWeight || !user.goalWeight) {
            alert('Please fill out Name, Height, Current Weight, and Target Weight to save your profile.');
            return;
        }

        DB.saveUser(user);
        alert('Profile Updated Successfully!');
        this.navTo('dashboard');
    },

    openCoachConsultation() {
        const modal = document.getElementById('coach-consultation-modal');
        if (modal) {
            // Restore previous parameters if they exist
            if (window.state && window.state.userProfile && window.state.userProfile.coach_params) {
                const params = window.state.userProfile.coach_params;
                if (document.getElementById('coach-param-goal')) document.getElementById('coach-param-goal').value = params.goal;
                if (document.getElementById('coach-param-equipment')) document.getElementById('coach-param-equipment').value = params.equipment;
                if (document.getElementById('coach-param-frequency')) document.getElementById('coach-param-frequency').value = params.frequency;
                if (document.getElementById('coach-param-experience')) document.getElementById('coach-param-experience').value = params.experience;
            }
            modal.classList.remove('hidden');
        }
    },

    closeCoachConsultation() {
        const modal = document.getElementById('coach-consultation-modal');
        if (modal) modal.classList.add('hidden');
    },

    submitCoachConsultation() {
        const goal = document.getElementById('coach-param-goal').value;
        const equipment = document.getElementById('coach-param-equipment').value;
        const frequency = document.getElementById('coach-param-frequency').value;
        const experience = document.getElementById('coach-param-experience').value;
        
        const params = {
            goal: goal,
            equipment: equipment,
            frequency: parseInt(frequency, 10),
            experience: experience
        };
        
        // Save preferences to state so they repopulate
        if (!window.state) window.state = {};
        if (!window.state.userProfile) window.state.userProfile = {};
        window.state.userProfile.coach_params = params;
        
        this.closeCoachConsultation();
        this.generateAndSaveProgram(params);
    },

    async generateAndSaveProgram(params) {
        if (!window.generateRoutine) {
            alert('Program Generator not loaded.');
            return;
        }
        
        const exerciseDB = window.exerciseDB || DB.get().vault || [];
        
        const generatedSchedule = window.generateRoutine(params, exerciseDB);
        
        if (!generatedSchedule || generatedSchedule.length === 0) {
            alert('Failed to generate schedule. Please add more exercises to your database.');
            return;
        }

        const success = await DB.saveUserRoutineAsync(generatedSchedule);
        
        if (success) {
            if (!window.state) window.state = {};
            if (!window.state.userProfile) window.state.userProfile = {};
            window.state.userProfile.routine = generatedSchedule;
            
            this.navTo('vault');
            alert('Your personalized Auto-Coach Program has been generated!');
        } else {
            alert('Failed to save your generated program to the database.');
        }
    },

    startRoutineDay(dayIndex) {
        if (!window.state || !window.state.userProfile || !window.state.userProfile.routine) {
            alert("Routine not found!");
            return;
        }

        const routine = window.state.userProfile.routine;
        const dayData = routine[dayIndex];
        
        if (!dayData || !dayData.exercises) return;

        if (window.state.isSessionActive) {
            if(!confirm("You already have an active session! Exploring this routine will overwrite your current progress. Proceed?")) return;
        }

        window.state.isSessionActive = true;
        
        if (typeof Arena !== 'undefined' && typeof Arena.loadRoutine === 'function') {
            Arena.loadRoutine(dayData.exercises);
        }

        this.navTo('arena');
    },

    updateWater(amount, eventElement = null) {
        const dbData = DB.get();
        const goal = dbData.dailyWaterGoal || 3000;
        const current = dbData.waterIntake || 0;
        
        let newAmount = current + amount;
        if(newAmount < 0) newAmount = 0;
        if(newAmount > goal) newAmount = goal; // Cap at goal for progress bar visual

        dbData.waterIntake = newAmount;
        DB.save(dbData);

        // Fluid Animation Trigger
        if(eventElement) {
            const icon = eventElement.querySelector('svg') || eventElement;
            icon.classList.remove('tilt-icon');
            icon.classList.remove('filling-glass');
            void icon.offsetWidth; // Trigger reflow
            
            if (amount > 0) {
                icon.classList.add('tilt-icon');

                // Generate fill animation
                const fill = document.createElement('div');
                fill.className = 'fill-anim';
                
                eventElement.appendChild(fill);
                
                // Trigger height fill
                setTimeout(() => fill.style.height = '100%', 10);
                setTimeout(() => fill.style.opacity = '0', 500);
                setTimeout(() => fill.remove(), 800);
            } else {
                // Drain animation (-250ml empty glass)
                icon.classList.add('filling-glass');
                setTimeout(() => icon.classList.remove('filling-glass'), 1500);
            }
        }

        if(this.currentView === 'dashboard') {
            // Update just the bar instead of full re-render for smooth transition
            const bar = document.getElementById('hydration-bar-fill');
            const txt = document.getElementById('hydration-txt');
            if(bar && txt) {
                bar.style.width = `${Math.min(100, (newAmount/goal)*100)}%`;
                txt.innerText = `${newAmount} / ${goal} ml`;
            } else {
                 UI.renderView('dashboard');
            }
        }
    },

    async disbandSquad(squadId) {
        if (!confirm('Are you sure you want to completely disband this squad? This action is irreversible.')) return;
        try {
            const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
            const response = await fetch(`${baseUrl}/api/squads/disband`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ squad_id: squadId })
            });
            const data = await response.json();
            if (data.success) {
                alert('Squad disbanded successfully.');
                const dbData = DB.get();
                if (dbData.user) {
                    dbData.user.squadId = null;
                    dbData.user.inviteCode = null;
                }
                DB.save(dbData);
                this.navTo('folders'); // Refresh view
            } else {
                alert('Error disbanding squad: ' + data.error);
            }
        } catch (e) {
            console.error('Disband failed:', e);
            alert('Failed to connect to server. Please try again later.');
        }
    },
    
    saveOverallNote() {
        const note = document.getElementById('overall-feeling-note')?.value;
        if(note) {
            alert('Workout Chronicle Saved.');
        }
        this.navTo('dashboard');
    },

    setHydrationGoal() {
        // Build Custom DOM Modal instead of prompt()
        const dbData = DB.get();
        const recommended = dbData.user ? Math.round(dbData.user.currentWeight * 35) : 3000;
        
        const modal = document.createElement('div');
        modal.id = 'hydration-modal';
        modal.className = 'fade-in';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(5, 7, 10, 0.9); backdrop-filter: blur(10px);
            display: flex; align-items: center; justify-content: center; z-index: 1000; padding: var(--space-xl);
        `;
        
        modal.innerHTML = `
            <div class="glass-panel" style="padding: var(--space-xl); width: 100%; max-width: 400px; text-align: center;">
                <h2 class="text-highlight" style="margin-bottom: var(--space-sm);">Set Hydration Goal</h2>
                <p class="text-sec" style="margin-bottom: var(--space-lg);">How much water do you want to drink today?</p>
                
                <input type="number" id="custom-hydrate-val" placeholder="e.g. 3000ml" value="${dbData.dailyWaterGoal || ''}" style="text-align: center; font-size: 1.2rem; margin-bottom: var(--space-md); color: #fff;">
                
                <button class="neon-btn" style="margin-bottom: var(--space-md);" onclick="app.saveHydrationFromModal(document.getElementById('custom-hydrate-val').value)">
                    Save Custom Goal
                </button>
                
                <button class="secondary-btn" style="width: 100%; border-color: rgba(255,255,255,0.2); color: var(--text-silver);" onclick="app.saveHydrationFromModal(${recommended})">
                    Calculate for me (${recommended}ml)
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    saveHydrationFromModal(val) {
        if(val && !isNaN(val) && Number(val) > 0) {
            const dbData = DB.get();
            dbData.dailyWaterGoal = Number(val);
            DB.save(dbData);
            
            const modal = document.getElementById('hydration-modal');
            if(modal) modal.remove();
            
            if(this.currentView === 'dashboard') UI.renderView('dashboard');
        } else {
            alert('Please enter a valid number.');
        }
    },

    promptCreateRoutine() {
        const name = prompt("Enter a name for your new routine:");
        if(name && name.trim() !== '') {
            DB.createNewRoutine(name.trim());
            UI.renderView('folders');
        }
    },
    
    async promptCreateSquad() {
        const inputElem = document.getElementById('squad-name-input');
        let name = '';
        if (inputElem && inputElem.value.trim() !== '') {
            name = inputElem.value.trim();
        } else {
            name = prompt("Enter a name for your new squad:");
        }
        
        if(name && name.trim() !== '') {
            const success = await DB.createSquad(name.trim());
            if(success) {
                UI.renderView('folders');
            } else {
                alert("Failed to create squad. Ensure backend is running.");
            }
        }
    },
    
    async promptJoinSquad() {
        const code = prompt("Enter the 6-character squad invite code:");
        if(code && code.trim() !== '') {
            const success = await DB.joinSquad(code.trim());
            if(success) {
                alert("Successfully joined the squad!");
                UI.renderView('folders');
            } else {
                alert("Invalid squad code or network error.");
            }
        }
    },
    
    promptAddExercise(routineId) {
        // Default to the globally tracked preview ID if editing generic
        const activeId = routineId || window.currentRoutineId;
        
        // Build a Vault-style list modal
        const vault = DB.get().vault || [];
        
        let listHTML = vault.map(ex => `
            <div class="modal-ex-item" data-name="${ex.name.toLowerCase()}" style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #FFFFFF;">${ex.name}</strong>
                    <div style="color: #A0A0A0; font-size: 0.85rem;">${ex.target}</div>
                </div>
                <button class="secondary-btn" style="padding: 6px 14px; font-size: 0.85rem; border-color: var(--accent-cyan); color: var(--accent-cyan);" onclick="app.commitExerciseToRoutine('${activeId}', '${ex.id}')">+ Add</button>
            </div>
        `).join('');

        const modal = document.createElement('div');
        modal.id = 'add-exercise-modal';
        modal.className = 'fade-in';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(5, 7, 10, 0.95); backdrop-filter: blur(10px);
            display: flex; align-items: center; justify-content: center; z-index: 2000; padding: var(--space-md);
        `;

        modal.innerHTML = `
            <div class="glass-panel" style="width: 100%; max-width: 500px; height: 80vh; display: flex; flex-direction: column; background: #161B22; border-color: rgba(255,255,255,0.1);">
                <div style="padding: var(--space-md); border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="color: #FFFFFF; margin: 0;">Add to Routine</h3>
                    <button style="background: none; border: none; color: #A0A0A0; font-size: 1.5rem; cursor: pointer;" onclick="document.getElementById('add-exercise-modal').remove()">✕</button>
                </div>
                <div style="padding: var(--space-sm); border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <input type="search" placeholder="Search exercises..." style="width: 100%; padding: 10px; border-radius: var(--radius-md); background: #05070A; border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 1rem;" oninput="app.filterModal(this.value)">
                </div>
                <div style="padding: var(--space-sm); overflow-y: auto; flex: 1;">
                    ${listHTML}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    commitExerciseToRoutine(routineId, exerciseId) {
        DB.addExerciseToRoutine(routineId, exerciseId);
        
        // Remove modal and re-render
        const mod = document.getElementById('add-exercise-modal');
        if(mod) mod.remove();
        
        if (this.currentView === 'folders') {
            UI.renderView('folders');
        } else if (this.currentView === 'routineEdit') {
            UI.renderView('routineEdit');
        }
    },
    
    filterVault(query) {
        const q = query.toLowerCase();
        document.querySelectorAll('.vault-item').forEach(el => {
            if (el.dataset.name.includes(q)) {
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
    },

    filterModal(query) {
        const q = query.toLowerCase();
        document.querySelectorAll('.modal-ex-item').forEach(el => {
            if (el.dataset.name.includes(q)) {
                el.style.display = 'flex';
            } else {
                el.style.display = 'none';
            }
        });
    },

    filterRoutines(query) {
        const q = query.toLowerCase();
        document.querySelectorAll('.routine-item').forEach(el => {
            if (el.dataset.name.includes(q)) {
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
    },
    
    navToExerciseDetail(exerciseId) {
        window.currentExerciseId = exerciseId;
        this.navTo('exerciseDetail');
    },

    navToRoutinePreview(routineId) {
        window.currentRoutineId = routineId;
        this.navTo('routinePreview');
    },

    navToRoutineEdit(routineId) {
        // Clone Rule Check
        const db = DB.get();
        const presets = db.routinePresets || [];
        const isPreset = presets.find(p => p.id === routineId);
        
        if (isPreset) {
            const newId = DB.clonePresetToCustom(routineId);
            if (newId) {
                window.currentRoutineId = newId;
                this.navTo('routineEdit');
            }
        } else {
            window.currentRoutineId = routineId;
            this.navTo('routineEdit');
        }
    },

    removeRoutineExercise(routineId, index) {
        DB.removeExerciseFromRoutine(routineId, index);
        if (this.currentView === 'routineEdit') {
            UI.renderView('routineEdit');
        }
    },

    // HTML5 Drag and Drop Handlers for Routine Edit
    handleDragStart(event, index) {
        window.dragEventIndex = index;
        event.dataTransfer.effectAllowed = 'move';
        event.target.style.opacity = '0.5';
    },

    handleDragOver(event) {
        event.preventDefault(); // Necessary to allow dropping
        event.dataTransfer.dropEffect = 'move';
        return false;
    },

    handleDrop(event, dropIndex, routineId) {
        event.stopPropagation();
        const draggedIndex = window.dragEventIndex;
        
        // Reset opacity of elements (optional UI polish)
        document.querySelectorAll('#routine-edit-list .glass-panel').forEach(el => el.style.opacity = '1');

        if (draggedIndex !== dropIndex && draggedIndex !== undefined) {
            DB.reorderRoutineExercise(routineId, draggedIndex, dropIndex);
            if (this.currentView === 'routineEdit') {
                UI.renderView('routineEdit');
            }
        }
        window.dragEventIndex = null;
        return false;
    },

    startRoutine(routineId) {
        const db = DB.get();
        const routines = db.customRoutines || [];
        const presets = db.routinePresets || [];
        const routine = routines.find(r => r.id === routineId) || presets.find(p => p.id === routineId);
        
        if(!routine || routine.exerciseIds.length === 0) {
            alert("This routine is empty!");
            return;
        }
        
        window.state.isSessionActive = true;
        window.state.currentSession.mode = 'squad';
        window.state.currentSession.routineId = routineId;
        window.state.currentSession.routineQueue = [...routine.exerciseIds];
        window.state.currentSession.currentIndex = 0;
        
        if (!window.state.currentSession.startTime) {
            window.state.currentSession.startTime = new Date().getTime();
            this.startGlobalTimer();
            if(typeof UI !== 'undefined' && UI.renderActiveSessionBar) {
                UI.renderActiveSessionBar();
            }
        }
        
        window.currentExerciseId = window.state.currentSession.routineQueue[window.state.currentSession.currentIndex];
        this.navTo('activeWorkout');
    },
    
    navigateRoutine(direction) {
        if (!window.state.isSessionActive || window.state.currentSession.mode !== 'squad') return;
        
        const queue = window.state.currentSession.routineQueue;
        let nextIndex = window.state.currentSession.currentIndex + direction;
        
        if (nextIndex >= 0 && nextIndex < queue.length) {
            window.state.currentSession.currentIndex = nextIndex;
            window.currentExerciseId = queue[nextIndex];
            
            if(typeof UI !== 'undefined' && UI.renderView) {
                UI.renderView('activeWorkout');
            }
        } else if (nextIndex >= queue.length) {
            this.finishActiveWorkout();
        }
    },
    
    reorderQueue(draggedIndex, targetIndex) {
        if (!window.state.isSessionActive || window.state.currentSession.mode !== 'squad') return;
        
        const queue = window.state.currentSession.routineQueue;
        
        // Remove item from old position
        const item = queue.splice(draggedIndex, 1)[0];
        
        // Insert item at new position
        queue.splice(targetIndex, 0, item);
        
        if(typeof UI !== 'undefined' && UI.renderView) {
            UI.renderView('activeWorkout'); // Re-render to reflect new queue order
        }
    },
    shareRoutine(routineId) {
        const routines = DB.get().customRoutines || [];
        const routine = routines.find(r => r.id === routineId);
        if(!routine) return;
        
        const payload = {
            title: `SquadFit Squad Sync: ${routine.name}`,
            text: `I just built a brutal workout: '${routine.name}'. Click here to view the routine or join my Squad on SquadFit!`,
            url: `https://squadfitapp.com/invite?id=${routineId}`
        };
        
        if (navigator.share) {
            navigator.share(payload).catch(console.error);
        } else {
            prompt("Share this link with your squad:", payload.url);
        }
    },
    
    inviteToRoster() {
        const payload = {
            title: `Join my SquadFit Squad`,
            text: `Join my Squad on SquadFit so we can sync routines and crush the leaderboard!`,
            url: `https://squadfitapp.com/roster_invite?user=current_user`
        };
        
        if (navigator.share) {
            navigator.share(payload).catch(console.error);
        } else {
            prompt("Share this link to invite active friends to your squad:", payload.url);
        }
    },

    dismissLaunchpad() {
        localStorage.setItem('tipBoxDismissed', 'true');
        const lp = document.getElementById('launchpad-box');
        if(lp) lp.remove();
    },

    // --- Workout History & Calendar Ecosystem ---

    generateHistorySlidingBar() {
        const historyData = JSON.parse(localStorage.getItem('workout_history') || '[]');
        window.selectedHistoryDate = window.selectedHistoryDate || new Date().toLocaleDateString('en-CA');

        let html = `<div style="width: 100%; color: #A0A0A0; font-weight: bold; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 8px;">${new Date().toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</div><div style="display: flex; gap: 8px;">`;
        const pastDays = 14;
        const forwardDays = 7;

        const todayDate = new Date();
        const todayStr = todayDate.toLocaleDateString('en-CA');
        const yesterdayDate = new Date(); yesterdayDate.setDate(todayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA');
        const tomorrowDate = new Date(); tomorrowDate.setDate(todayDate.getDate() + 1);
        const tomorrowStr = tomorrowDate.toLocaleDateString('en-CA');
        
        for (let i = pastDays; i >= -forwardDays; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-CA');
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = d.getDate();

            const hasWorkout = historyData.some(w => w.date === dateStr);
            const isSelected = window.selectedHistoryDate === dateStr;

            let borderColor = hasWorkout ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)';
            
            let labelHtml = '';
            if (dateStr === todayStr) labelHtml = '<span class="relative-day-label">Today</span>';
            else if (dateStr === yesterdayStr) labelHtml = '<span class="relative-day-label">Yesterday</span>';
            else if (dateStr === tomorrowStr) labelHtml = '<span class="relative-day-label">Tomorrow</span>';

            html += '<div class="glass-panel history-day-card horizontal-date-card ' + (isSelected ? 'active' : '') + '" ' +
                     'data-date="' + dateStr + '" ' +
                     (dateStr === todayStr ? 'id="history-card-today" ' : '') +
                     'onclick="app.selectHistoryDate(\'' + dateStr + '\')" ' +
                     'style="min-width: 65px; padding: 10px 5px; text-align: center; cursor: pointer; border-radius: var(--radius-sm); border: 1px solid ' + borderColor + '; flex-shrink: 0; transition: all 0.2s ease;">' +
                    '<div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 2px;">' + dayName + '</div>' +
                    '<div style="font-size: 1.2rem; font-weight: bold; line-height: 1;">' + dayNum + '</div>' +
                    labelHtml +
                '</div>';
        }
        html += '</div>';
        return html;
    },

    selectHistoryDate(dateStr) {
        window.selectedHistoryDate = dateStr;
        
        // Sync active class dynamically without total re-render
        document.querySelectorAll('.horizontal-date-card').forEach(c => c.classList.remove('active'));
        const targetCard = document.querySelector(`.horizontal-date-card[data-date="${dateStr}"]`);
        if(targetCard) targetCard.classList.add('active');

        // Delegate UI rendering to the newly refactored exact data fetch method
        if (typeof window.fetchAndDisplayWorkoutDetails === 'function') {
            window.fetchAndDisplayWorkoutDetails(dateStr);
        } else {
            console.error("fetchAndDisplayWorkoutDetails not found on window object.");
        }
        
        this.closeCalendarModal();
    },

    closeCalendarModal() {
        const modal = document.getElementById('full-calendar-modal');
        if (modal) modal.remove();
    },

    navigateCalendarMonth(delta) {
        if (!window.currentCalendarDate) window.currentCalendarDate = new Date();
        window.currentCalendarDate.setMonth(window.currentCalendarDate.getMonth() + delta);
        this.showCalendarModal();
    },

    async showCalendarModal() {
        if (typeof UI === 'undefined' || !UI.generateCalendarGrid) return;
        
        if (!window.currentCalendarDate) {
            // Check if selectedHistoryDate corresponds to a different month
            if (window.selectedHistoryDate) {
                const parts = window.selectedHistoryDate.split('-');
                window.currentCalendarDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else {
                window.currentCalendarDate = new Date();
            }
        }
        
        const currentYear = window.currentCalendarDate.getFullYear();
        const currentMonth = window.currentCalendarDate.getMonth();
        
        const calendarHTML = await UI.generateCalendarGrid(currentYear, currentMonth);

        const oldModal = document.getElementById('full-calendar-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = 'full-calendar-modal';
        modal.className = 'fade-in';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(5, 7, 10, 0.95); backdrop-filter: blur(10px);
            display: flex; align-items: center; justify-content: center; z-index: 2000; padding: var(--space-md);
        `;

        modal.innerHTML = `
            <div class="glass-panel" style="width: 100%; max-width: 500px; background: #161B22; border-color: rgba(255,255,255,0.1); padding: var(--space-lg);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: var(--space-sm);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button style="background: rgba(255,255,255,0.1); border: none; color: #FFF; width: 32px; height: 32px; border-radius: 50%; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="app.navigateCalendarMonth(-1)">
                            &#10094;
                        </button>
                        <h3 style="color: #FFFFFF; margin: 0; width: 140px; text-align: center;">${new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                        <button style="background: rgba(255,255,255,0.1); border: none; color: #FFF; width: 32px; height: 32px; border-radius: 50%; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="app.navigateCalendarMonth(1)">
                            &#10095;
                        </button>
                    </div>
                    <button style="background: none; border: none; color: #A0A0A0; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 32px; line-height: 1;" onclick="app.closeCalendarModal()">✕</button>
                </div>
                ${calendarHTML}
            </div>
        `;
        document.body.appendChild(modal);
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Mobile Drag Drop Polyfill
    MobileDragDrop.polyfill({
        holdToDrag: 300
    });
    // Standard iOS passive listener fix
    window.addEventListener('touchmove', function() {}, {passive: false});

    app.init();
});

window.loadVaultTemplates = function() {
    const un = localStorage.getItem('username');
    if (!un) return;
    
    fetch(`http://127.0.0.1:5001/api/templates?username=${encodeURIComponent(un)}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const container = document.getElementById('templates-list');
                if (!container) return;
                window.activeVaultTemplates = data.templates;
                
                if (data.templates.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; color: #A0A0A0; padding: 40px; border: 1px dashed rgba(255,255,255,0.1); border-radius: var(--radius-md);">
                            No templates yet. Create your first routine!
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = data.templates.map(t => {
                    return `
                        <div class="glass-panel" style="padding: 16px; border-color: rgba(255,255,255,0.1);">
                            <h3 style="color: #FFF; margin: 0 0 8px 0; font-size: 1.3rem;">${t.template_name}</h3>
                            <div style="color: #A0A0A0; font-size: 0.9rem; margin-bottom: 16px;">
                                ${t.exercises.map(e => e.name).join('<span style="color: #555;"> • </span>') || 'Empty Template'}
                            </div>
                            <!-- Card Actions -->
                            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                                <button type="button" class="secondary-btn" style="flex: 1; border-color: rgba(255,255,255,0.1); color: #FFF; font-size: 0.85rem;" onclick="app.editTemplate(event, ${t.id})">Edit</button>
                                <button type="button" class="delete-routine-btn secondary-btn" style="flex: 1; border-color: rgba(255,95,31,0.3); color: #FF5F1F; font-size: 0.85rem;" onclick="app.deleteTemplate(event, ${t.id})">Delete</button>
                            </div>
                            <!-- Start Template Hook -->
                            <button type="button" class="neon-btn" style="width: 100%; font-size: 0.9rem;" onclick="app.startTemplateWorkout(${t.id})">
                                ▶ Start Workout
                            </button>
                        </div>
                    `;
                }).join('');
            }
        })
        .catch(err => console.error(err));
};

app.promptCreateTemplate = function() {
    window.currentEditingTemplateId = null; // Clear edit token
    // Clear old inputs just in case
    const nameInput = document.getElementById('routine-name-input');
    if(nameInput) nameInput.value = '';
    
    const checkboxes = document.querySelectorAll('.routine-exercise-cb');
    checkboxes.forEach(cb => cb.checked = false);
    
    const modal = document.getElementById('routine-creator-modal');
    if(modal) modal.classList.remove('hidden');
};

app.deleteTemplate = function(e, id) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if(!confirm("Delete this routine?")) return;
    
    const un = localStorage.getItem('username');
    fetch(`http://127.0.0.1:5001/api/templates/delete?id=${id}&username=${un}`, {
        method: 'DELETE'
    })
    .then(r => r.json())
    .then(res => {
        if(res.success) {
            window.loadVaultTemplates();
        } else {
            alert("Error deleting routine.");
        }
    })
    .catch(e => console.error(e));
};

app.editTemplate = function(e, id) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if(!window.activeVaultTemplates) return;
    const template = window.activeVaultTemplates.find(t => t.id === id);
    if(!template) return;
    
    app.promptCreateTemplate(); // Opens modal and clears inputs
    window.currentEditingTemplateId = id; // Set active edit token overwriting prompt reset
    
    document.getElementById('routine-name-input').value = template.template_name;
    
    const checkboxes = document.querySelectorAll('.routine-exercise-cb');
    checkboxes.forEach(cb => {
        if(template.exercises.some(e => e.name.toLowerCase().trim() === cb.value.toLowerCase().trim())) {
            cb.checked = true;
        } else {
            cb.checked = false;
        }
    });
};

app.submitRoutineCreator = function() {
    const tName = document.getElementById('routine-name-input').value.trim();
    if (!tName) {
        alert("Please enter a routine name.");
        return;
    }
    
    // Gather all checked items natively from the modal
    const checkboxes = document.querySelectorAll('.routine-exercise-cb');
    let exercises = [];
    checkboxes.forEach(cb => {
        if (cb.checked) {
            exercises.push({ name: cb.value, sets: 0, reps: 0 }); // Pre-injected as placeholders for the UI
        }
    });
    
    if (exercises.length === 0) {
        alert("You must select at least one exercise.");
        return;
    }
    
    const un = localStorage.getItem('username');
    const payload = {
        username: un,
        template_name: tName,
        exercises: exercises
    };
    
    // Inject edit token if updating an existing record
    if (window.currentEditingTemplateId) {
        payload.id = window.currentEditingTemplateId;
    }
    
    fetch('http://127.0.0.1:5001/api/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            const modal = document.getElementById('routine-creator-modal');
            if(modal) modal.classList.add('hidden');
            window.currentEditingTemplateId = null; // Clear token after success
            window.loadVaultTemplates();
        } else {
            alert("Error saving template.");
        }
    })
    .catch(e => console.error(e));
};

app.startTemplateWorkout = function(templateId) {
    if (!window.activeVaultTemplates) return; // safeguard
    
    let template = window.activeVaultTemplates.find(t => t.id === templateId);
    if (!template) {
         alert("Template not found in memory.");
         return;
    }
    
    // Check for an already active session
    if (window.state.isSessionActive) {
        if(!confirm("You already have an active session! Exploring this template will overwrite your current progress. Proceed?")) return;
    }
    
    const dbData = DB.get();
    const vault = dbData.vault || [];
    
    // Map template exercise names to their physical Vault Database counterparts
    let validExerciseIds = [];
    template.exercises.forEach(ex => {
        if (!ex || !ex.name) return;
        const v = vault.find(x => x.name.toLowerCase().trim() === ex.name.toLowerCase().trim());
        if (v) validExerciseIds.push(v.id);
    });
    
    if (validExerciseIds.length === 0) {
        alert("This template has no matching exercises in the predefined Vault database.");
        return;
    }
    
    // Setup the workout queue locally
    window.state.currentSession = {
        routineId: template.id,
        startTime: new Date().getTime(),
        timerInterval: null,
        elapsedStr: '00:00',
        totalVolume: 0,
        mode: 'playlist', // Differentiates from legacy squad mode
        currentIndex: 0,  // Aggressive state reset against legacy squad logic overlapping
        exerciseQueue: [...validExerciseIds].slice(1), // Queue holds all FUTURE exercises
        loggedExercises: [] // Ensure history isn't pre-filled with empty dummies
    };
    
    window.state.isSessionActive = true;
    
    // Initialize Timer
    app.startGlobalTimer();
    
    // First exercise is popped/active
    window.currentExerciseId = validExerciseIds[0];
    
    // Launch
    app.navTo('activeWorkout');
};

app.nextRoutineExercise = function() {
    if (!window.state.isSessionActive) return;

    if (window.state.currentSession.mode === 'playlist') {
        const queue = window.state.currentSession.exerciseQueue;
        if (queue && queue.length > 0) {
            // Pop top exercise
            const nextId = queue.shift();
            window.currentExerciseId = nextId;
            
            // Clear DOM inputs manually before re-render just to be safe
            const wInput = document.getElementById('active-weight');
            const rInput = document.getElementById('active-reps');
            if (wInput) wInput.value = '';
            if (rInput) rInput.value = '';
            
            if (typeof UI !== 'undefined' && UI.renderView) {
                UI.renderView('activeWorkout');
            }
        } else {
            app.finishActiveWorkout();
        }
    } else if (window.state.currentSession.mode === 'squad') {
        app.navigateRoutine(1);
    }
};

app.editLoggedSet = function(exId, index) {
    let logsForEx = window.state.currentSession.loggedExercises.filter(l => l.exerciseId === exId);
    let targetLog = logsForEx[index];
    if (!targetLog) return;
    
    const w = prompt("Enter completed weight (kg):", targetLog.weight);
    if (w === null) return;
    const r = prompt("Enter completed reps:", targetLog.reps);
    if (r === null) return;
    
    const numW = Number(w);
    const numR = Number(r);
    
    if (numW >= 0 && numR >= 0) {
        const oldVol = targetLog.weight * targetLog.reps;
        const newVol = numW * numR;
        
        window.state.currentSession.totalVolume += (newVol - oldVol);
        
        targetLog.weight = numW;
        targetLog.reps = numR;
        targetLog.volume = newVol;
        
        const volumeBadge = document.getElementById('running-volume-badge');
        if (volumeBadge) {
            volumeBadge.innerText = `⚡ Total Volume: ${window.state.currentSession.totalVolume} kg`;
        }
        
        if (typeof UI !== 'undefined' && UI.updateHistoryTable) {
            UI.updateHistoryTable(exId);
        }
    } else {
        alert("Invalid input.");
    }
};
