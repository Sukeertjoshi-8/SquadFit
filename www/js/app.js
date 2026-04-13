// app.js - Main Application Controller

const app = {
    currentView: 'auth',

    init() {
        // Initialize global active session cache
        window.activeSession = { startTime: null, logs: [], timerInterval: null, elapsedStr: '00:00' };

        const user = DB.getUser();
        if (!user) {
            this.navTo('auth');
        } else {
            this.navTo('dashboard');
            
            // Check Hydration Goal on Home load
            const dbData = DB.get();
            if (!dbData.dailyWaterGoal) {
                setTimeout(() => this.setHydrationGoal(), 500);
            }
        }

        this.bindEvents();
    },

    bindEvents() {
        // Navbar Routing
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.navTo(view);
            });
        });
    },

    navTo(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-item').forEach(b => {
            b.classList.remove('active');
            if(b.getAttribute('data-view') === view) b.classList.add('active');
        });
        UI.renderView(view);
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

    finishActiveWorkout() {
        if (!window.state.isSessionActive || window.state.currentSession.loggedExercises.length === 0) {
            alert("No active session to finish!");
            return;
        }

        clearInterval(window.state.currentSession.timerInterval);
        
        const dbData = DB.get();
        const durationStr = window.state.currentSession.elapsedStr || '00:00';
        const totalVolume = window.state.currentSession.totalVolume;
        
        // Count unique exercises using a Set
        const uniqueExercises = new Set(window.state.currentSession.loggedExercises.map(ex => ex.exerciseId)).size;
        
        dbData.workout_history = dbData.workout_history || [];
        dbData.workout_history.push({
            date: new Date().toISOString(),
            duration: durationStr,
            totalVolume: totalVolume,
            uniqueExercises: uniqueExercises,
            logs: window.state.currentSession.loggedExercises
        });
        
        // Group logged exercises to push to strength_logs for Arena Sync
        const logsByEx = {};
        window.state.currentSession.loggedExercises.forEach(l => {
            if (!logsByEx[l.exerciseId]) {
                logsByEx[l.exerciseId] = [];
            }
            logsByEx[l.exerciseId].push(l);
        });

        dbData.strength_logs = dbData.strength_logs || [];
        for (const [exId, sets] of Object.entries(logsByEx)) {
            const formattedSets = sets.map((s, index) => ({
                setNumber: index + 1,
                weight: s.weight,
                reps: s.reps,
                volume: s.volume
            }));
            
            dbData.strength_logs.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                date: new Date().toISOString(),
                exerciseId: exId,
                notes: '',
                sets: formattedSets
            });
        }
        
        DB.save(dbData);
        
        // Store logs before resetting state for the summary
        const finalLogs = [...window.state.currentSession.loggedExercises];
        
        // Reset state
        window.state.isSessionActive = false;
        window.state.currentSession = {
            mode: 'free',
            routineId: null,
            routineQueue: [],
            currentIndex: 0,
            startTime: null,
            loggedExercises: [],
            totalVolume: 0,
            timerInterval: null,
            elapsedStr: '00:00'
        };
        
        // Hide persistent bar
        if(typeof UI !== 'undefined' && UI.renderActiveSessionBar) {
            UI.renderActiveSessionBar();
        }
        
        this.navTo('dashboard');
        this.showCelebrationModal(uniqueExercises, totalVolume, finalLogs);
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
            goalDate: date
        });

        this.navTo('dashboard');
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

                // Generate particle
                const particle = document.createElement('div');
                particle.className = 'pour-animation';
                
                const rect = eventElement.getBoundingClientRect();
                particle.style.left = `${rect.left + (rect.width / 2)}px`;
                particle.style.top = `${rect.top - 20}px`;
                
                document.body.appendChild(particle);
                setTimeout(() => particle.remove(), 800);
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
    
    promptAddExercise(routineId) {
        // Build a Vault-style list modal
        const vault = DB.get().vault || [];
        
        let listHTML = vault.map(ex => `
            <div style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #FFFFFF;">${ex.name}</strong>
                    <div style="color: #A0A0A0; font-size: 0.85rem;">${ex.target}</div>
                </div>
                <button class="secondary-btn" style="padding: 6px 14px; font-size: 0.85rem; border-color: var(--accent-cyan); color: var(--accent-cyan);" onclick="app.commitExerciseToRoutine('${routineId}', '${ex.id}')">+ Add</button>
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
        }
    },
    
    startRoutine(routineId) {
        const routines = DB.get().customRoutines || [];
        const routine = routines.find(r => r.id === routineId);
        
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
