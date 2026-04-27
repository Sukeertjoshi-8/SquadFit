// UI_Components.js - Centralized logic for UI rendering
// UI_Components.js - Handles DOM rendering and events
// UI_Components.js - Handles DOM rendering and events

window.minimizeWorkout = function() {
    const overlay = document.getElementById('global-workout-overlay');
    const mini = document.getElementById('workout-mini-player');
    if (overlay) overlay.style.display = 'none';
    if (mini) mini.style.display = 'block';
};

window.openWorkoutOverlay = function() {
    const overlay = document.getElementById('global-workout-overlay');
    const mini = document.getElementById('workout-mini-player');
    if (overlay) {
        overlay.innerHTML = UI.templates.workoutOverlay();
        overlay.style.display = 'block';
    }
    if (mini) mini.style.display = 'none';
    if (typeof Arena !== 'undefined' && typeof Arena.init === 'function') {
        Arena.init();
    }
};

window.startGlobalWorkout = window.startGlobalWorkout || function(id) {
    console.error("Fallback: startGlobalWorkout undefined when trying to start", id);
};

const UI = {
    container: document.getElementById('app-container'),
    nav: document.getElementById('bottom-nav'),

    showRestTimer(onComplete) {
        const overlay = document.getElementById('rest-timer-overlay');
        const display = document.getElementById('timer-display');
        const ring = document.getElementById('timer-progress-ring');
        overlay.classList.remove('hidden');
        
        let timeLeft = 90;
        display.innerText = '01:30';
        ring.style.strokeDashoffset = 0;
        
        if('vibrate' in navigator) navigator.vibrate(200);

        window.restInterval = setInterval(() => {
            timeLeft--;
            const min = String(Math.floor(timeLeft / 60)).padStart(2, '0');
            const sec = String(timeLeft % 60).padStart(2, '0');
            display.innerText = `${min}:${sec}`;
            
            const pct = timeLeft / 90;
            const offset = 283 - (283 * pct);
            ring.style.strokeDashoffset = offset;

            if(timeLeft <= 0) {
                clearInterval(window.restInterval);
                overlay.classList.add('hidden');
                if('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
                if(typeof onComplete === 'function') onComplete();
                else app.navTo('vault');
            }
        }, 1000);

        document.getElementById('skip-timer-btn').onclick = () => {
            clearInterval(window.restInterval);
            overlay.classList.add('hidden');
            if(typeof onComplete === 'function') onComplete();
            else app.navTo('vault');
        };
    },

    renderRestTimer(seconds) {
        let existingTimer = document.getElementById('render-rest-timer');
        if (existingTimer) existingTimer.remove();

        const overlay = document.createElement('div');
        overlay.id = 'render-rest-timer';
        overlay.style.cssText = `
            position: fixed;
            bottom: 90px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(10, 13, 20, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(0, 209, 255, 0.3);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 209, 255, 0.1);
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            padding: 16px 24px;
            z-index: 1000;
            width: 250px;
            transition: opacity 0.3s ease;
        `;
        overlay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <button id="render-sub-time-btn" style="background: rgba(255,255,255,0.05); color: #FFF; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; font-weight: bold; cursor: pointer;">-15s</button>
                <span id="render-rest-time-display" style="color: var(--accent-cyan); font-size: 2rem; font-weight: 800; font-family: monospace; letter-spacing: 2px;">00:00</span>
                <button id="render-add-time-btn" style="background: rgba(0, 209, 255, 0.1); color: var(--accent-cyan); border: 1px solid rgba(0,209,255,0.3); border-radius: 8px; padding: 8px 12px; font-weight: bold; cursor: pointer;">+30s</button>
            </div>
            <button id="render-skip-rest-btn" style="width: 100%; background: transparent; color: #A0A0A0; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 8px 12px; font-size: 0.9rem; font-weight: bold; cursor: pointer; transition: 0.2s;">Skip Rest</button>
        `;
        document.body.appendChild(overlay);

        const display = document.getElementById('render-rest-time-display');
        const skipBtn = document.getElementById('render-skip-rest-btn');
        const addBtn = document.getElementById('render-add-time-btn');
        const subBtn = document.getElementById('render-sub-time-btn');

        window.restTimeRemaining = seconds || 90;

        const updateDisplay = () => {
            display.innerText = `${String(Math.floor(window.restTimeRemaining / 60)).padStart(2, '0')}:${String(window.restTimeRemaining % 60).padStart(2, '0')}`;
        };
        updateDisplay();

        const triggerSuccessFlash = () => {
            const flash = document.createElement('div');
            flash.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 209, 255, 0.3); z-index: 9999; pointer-events: none; transition: opacity 0.5s ease; opacity: 1; mix-blend-mode: overlay;';
            document.body.appendChild(flash);
            setTimeout(() => { flash.style.opacity = '0'; }, 50);
            setTimeout(() => { flash.remove(); }, 550);
        };
        
        if (window.renderRestInterval) clearInterval(window.renderRestInterval);
        
        window.renderRestInterval = setInterval(() => {
            window.restTimeRemaining--;
            updateDisplay();

            if (window.restTimeRemaining <= 0) {
                if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
                clearInterval(window.renderRestInterval);
                triggerSuccessFlash();
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            }
        }, 1000);

        addBtn.onclick = () => {
            window.restTimeRemaining += 30;
            updateDisplay();
        };

        subBtn.onclick = () => {
            window.restTimeRemaining -= 15;
            if (window.restTimeRemaining < 0) window.restTimeRemaining = 0;
            updateDisplay();
        };

        skipBtn.onclick = () => {
            clearInterval(window.renderRestInterval);
            triggerSuccessFlash();
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        };
    },

    async openExerciseModal(exerciseName) {
        const history = await DB.getExerciseHistoryAsync(exerciseName);
        const modal = document.getElementById('modal-exercise-detail');
        const title = document.getElementById('modal-ex-title');
        const subtitle = document.getElementById('modal-ex-subtitle');
        const tempSetsContainer = document.getElementById('modal-temp-sets');
        
        window.tempSets = [];
        window.currentModalExercise = exerciseName;
        
        title.innerText = exerciseName;
        document.getElementById('modal-log-weight').value = '';
        document.getElementById('modal-log-reps').value = '';
        tempSetsContainer.innerHTML = '';
        
        if (history.length > 0) {
            const lastSession = history[history.length - 1];
            subtitle.innerText = `Last performed on: ${lastSession.date}`;
        } else {
            subtitle.innerText = 'First time performing this exercise!';
        }
        
        modal.classList.remove('hidden');
    },

    async renderAnalyticsGraph(exerciseName, type) {
        const history = await DB.getExerciseHistoryAsync(exerciseName);
        const modal = document.getElementById('modal-analytics');
        const title = document.getElementById('analytics-title');
        const ctx = document.getElementById('analyticsChart')?.getContext('2d');
        if (!ctx) return;
        
        if (window.activeChart) {
            window.activeChart.destroy();
        }
        
        let labels = [];
        let dataPoints = [];
        let labelName = '';
        
        if (type === 'volume') {
            title.innerText = 'Volume Analytics';
            labelName = 'Total Volume (kg)';
            history.forEach(h => {
                labels.push(h.date);
                dataPoints.push(h.max_volume);
            });
        } else if (type === '1rm') {
            title.innerText = '1RM Progression';
            labelName = 'Estimated 1RM (kg)';
            history.forEach(h => {
                labels.push(h.date);
                dataPoints.push(h.estimated_1rm);
            });
        }
        
        window.activeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: labelName,
                    data: dataPoints,
                    borderColor: '#00E5FF',
                    backgroundColor: 'rgba(0, 229, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: '#00E5FF',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#E0E0E0' } }
                },
                scales: {
                    x: {
                        ticks: { color: '#A0A0A0' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    y: {
                        ticks: { color: '#A0A0A0' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                }
            }
        });
        
        modal.classList.remove('hidden');
    },

    renderView(viewName, param) {
        if (!window.state.userProfile && viewName !== 'auth') {
            console.warn("Render blocked: No profile data found. Forcing onboarding.");
            return;
        }
        
        try {
            this.container.innerHTML = ``;
            window.scrollTo(0, 0);
            
            if (viewName === 'auth') {
                this.nav.classList.add('hidden');
                this.container.innerHTML = this.templates.auth();
            } 
            else if (viewName === 'activeWorkout') {
                this.nav.classList.add('hidden');
                this.container.innerHTML = this.templates.activeWorkout(window.currentExerciseId);
                if (window.state && window.state.currentSession) {
                    this.updateHistoryTable(window.currentExerciseId);
                }
            } 
            else if (viewName === 'exerciseDetail') {
                this.nav.classList.add('hidden');
                const footerHide = document.querySelector('.arena-footer-container'); 
                if(footerHide) footerHide.style.display = 'none';
                this.container.innerHTML = this.templates.exerciseDetail(param || window.currentExerciseId);
            } 
            else if (viewName === 'dashboard') {
                document.querySelectorAll('.arena-footer-container').forEach(el => el.style.setProperty('display', 'none', 'important'));
                this.nav.classList.remove('hidden');
                const savedDraft = localStorage.getItem('squadFit_draft');
                let draftBannerHTML = ``;
                if (savedDraft) {
                    draftBannerHTML = `
                        <div id="draft-recovery-banner" style="background: rgba(255, 95, 31, 0.2); border: 1px solid #ff5f1f; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                            <span style="color: #FFF; font-weight: bold; display: block; margin-bottom: 8px;">Resume active session?</span>
                            <div style="display: flex; gap: 8px;">
                                <button class="neon-btn" style="flex: 1; padding: 8px;" onclick="app.resumeDraft()">Continue</button>
                                <button class="secondary-btn" style="flex: 1; padding: 8px;" onclick="app.discardDraft()">Discard</button>
                            </div>
                        </div>`;
                }
                const streakVal = parseInt(localStorage.getItem('currentStreak')) || 0;
                this.container.innerHTML = draftBannerHTML + this.templates.dashboard(streakVal);
                
                setTimeout(() => { if (typeof window.syncGoalCalendar === 'function') window.syncGoalCalendar(); }, 50);
                
                // Hydration Logic bindings
                setTimeout(() => {
                    const hydroValEl = document.getElementById('hydro-val');
                    const hydroFillEl = document.getElementById('hydro-fill');
                    const waterGoal = 3000;
                    let currentWater = parseInt(localStorage.getItem('hydrationToday')) || 0;
                    
                    const renderWater = () => {
                        if (hydroValEl) hydroValEl.innerText = `${currentWater}ml / ${waterGoal}ml`;
                        if (hydroFillEl) hydroFillEl.style.width = `${Math.min((currentWater / waterGoal) * 100, 100)}%`;
                    };
                    
                    renderWater();
                    
                    document.querySelectorAll('.hydro-quick-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const amt = parseInt(e.currentTarget.dataset.amount);
                            const prevWater = currentWater;
                            currentWater += amt;
                            if (currentWater < 0) currentWater = 0;
                            localStorage.setItem('hydrationToday', currentWater);
                            renderWater();
                            
                            if (currentWater >= waterGoal && prevWater < waterGoal) {
                                if (typeof app !== 'undefined' && typeof app.fireConfetti === 'function') {
                                    app.fireConfetti();
                                } else {
                                    alert("CONGRATS! Water goal reached!");
                                }
                            }
                        });
                    });
                }, 50);
            } 
            else if (viewName === 'onboarding') {
                this.nav.classList.add('hidden');
                this.container.innerHTML = this.templates.onboarding();
                setTimeout(() => this.bindBMILogic(), 100);
            } 
            else if (viewName === 'vault') {
                document.querySelectorAll('.arena-footer-container').forEach(el => el.style.setProperty('display', 'none', 'important'));
                this.nav.classList.remove('hidden');
                this.container.innerHTML = this.templates.vault();
                if (window.state && window.state.vaultTab === 'routines') {
                    if (window.loadVaultTemplates) window.loadVaultTemplates();
                }
            } 
            else if (viewName === 'log') {
                this.nav.classList.add('hidden');
                this.container.innerHTML = this.templates.logSession(window.currentExerciseId);
            } 
            else if (viewName === 'folders') {
                this.nav.classList.remove('hidden');
                this.container.innerHTML = this.templates.folders();
            } 
            else if (viewName === 'arena') {
                this.nav.classList.remove('hidden');
                const footerShow = document.querySelector('.arena-footer-container'); 
                if(footerShow) footerShow.style.display = 'flex';
                this.container.innerHTML = this.templates.arena();
                if (typeof Arena !== 'undefined' && typeof Arena.init === 'function') Arena.init();
                
                // Trigger Arena Tour
                if (localStorage.getItem('arena_tour_completed') !== 'true' && typeof window.startArenaTour === 'function') {
                    setTimeout(() => window.startArenaTour(), 500);
                }
            } 
            else if (viewName === 'postWorkout') {
                this.nav.classList.add('hidden');
                this.container.innerHTML = this.templates.postWorkout();
                this.initPostWorkoutChart();
            } 
            else if (viewName === 'profile') {
                document.querySelectorAll('.arena-footer-container').forEach(el => el.style.setProperty('display', 'none', 'important'));
                this.nav.classList.remove('hidden');
                this.container.innerHTML = this.templates.profile();
                setTimeout(() => this.bindProfileLogic(), 100);
            } 
            else if (viewName === 'history') {
                document.querySelectorAll('.arena-footer-container').forEach(el => el.style.setProperty('display', 'none', 'important'));
                this.nav.classList.remove('hidden');
                this.container.innerHTML = this.templates.history();
            } 
            else {
                this.container.innerHTML = `<h1>Feature coming soon!</h1>`;
            }

            setTimeout(() => {
                const av = localStorage.getItem('squadfit_avatar');
                if(av) {
                    document.querySelectorAll('.profile-avatar, .user-avatar, img[src*="avatar"]').forEach(img => {
                        img.src = av;
                        img.style.display = 'block';
                        if(img.previousElementSibling && img.previousElementSibling.tagName === 'SPAN') {
                            img.previousElementSibling.style.display = 'none';
                        }
                    });
                }
            }, 50);

            this.renderActiveSessionBar();

        } catch (error) {
            console.error("FATAL RENDER CRASH:", error);
            const container = document.querySelector('#app-container') || document.querySelector('#main-content') || document.querySelector('main') || document.body;
            if (container) {
                container.innerHTML = `<div style="color: #ff4444; padding: 40px; text-align: center; font-family: monospace;">
                    <h2>System Crash</h2>
                    <p>${error.name}: ${error.message}</p>
                    <p style="font-size: 12px; color: #888;">Check developer console for trace.</p>
                </div>`;
            }
        }
    },

    renderActiveSessionBar() {
        const existingBar = document.getElementById('active-session-bar');
        if(existingBar) existingBar.remove();

        if(window.state && window.state.isSessionActive && !['auth', 'onboarding'].includes(app.currentView)) {
            const bar = document.createElement('div');
            bar.id = 'active-session-bar';
            bar.className = 'session-floating-bar slide-up';
            bar.style.cssText = `
                position: fixed;
                bottom: 70px;
                left: 0;
                right: 0;
                background: rgba(22, 27, 34, 0.95);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border-top: 1px solid var(--accent-cyan);
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                z-index: 1000;
                box-shadow: 0 -4px 10px rgba(0,0,0,0.5);
                border-radius: 15px 15px 0 0;
            `;
            
            const timerStr = window.state.currentSession.elapsedStr || '00:00';
            const vol = window.state.currentSession.totalVolume;
            const mode = window.state.currentSession.mode;

            let actionBtnHTML = '';
            if (mode === 'squad') {
                const queue = window.state.currentSession.routineQueue;
                const idx = window.state.currentSession.currentIndex;
                
                let prevBtn = '';
                if (idx > 0) {
                    prevBtn = `<button class="neon-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 12px; border-radius: var(--radius-md); font-size: 0.9rem; margin-right: 8px;" onclick="app.navigateRoutine(-1); event.stopPropagation();">⏮</button>`;
                }
                
                let nextBtn = '';
                if (idx < queue.length - 1) {
                    nextBtn = `<button class="neon-btn" style="background: transparent; border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 8px 16px; border-radius: var(--radius-md); font-size: 0.9rem;" onclick="app.navigateRoutine(1); event.stopPropagation();">Next ⏭</button>`;
                } else {
                    nextBtn = `<button class="neon-btn" style="background: #FF5F1F; border: none; color: #FFF; padding: 8px 16px; border-radius: var(--radius-md); font-size: 0.9rem;" onclick="app.finishActiveWorkout(); event.stopPropagation();">🏆 Finish</button>`;
                }
                
                actionBtnHTML = `<div style="display:flex; align-items:center;">${prevBtn}${nextBtn}</div>`;
            } else {
                actionBtnHTML = `<button class="neon-btn" style="background: #FF5F1F; border: none; color: #FFF; padding: 8px 16px; border-radius: var(--radius-md); font-size: 0.9rem;" onclick="app.finishActiveWorkout(); event.stopPropagation();">🏆 Finish</button>`;
            }

            bar.innerHTML = `
                <div id="global-live-timer" style="font-size:1.2rem; font-weight: bold; color: #FFF; font-variant-numeric: tabular-nums;">${timerStr}</div>
                <div id="global-live-volume" style="font-size:1rem; color: var(--accent-cyan); font-weight: bold;">⚡ ${vol} kg</div>
                <div>${actionBtnHTML}</div>
            `;
            document.body.appendChild(bar);
        }
    },
    
    updateGlobalTimerDisplays() {
        if(window.state && window.state.isSessionActive) {
             const timerStr = window.state.currentSession.elapsedStr || '00:00';
             const globalTimer = document.getElementById('global-live-timer');
             const viewTimer = document.getElementById('session-live-timer');
             
             if (globalTimer) globalTimer.innerText = timerStr;
             if (viewTimer) viewTimer.innerText = timerStr;
        }
    },
    
    updateGlobalVolumeDisplays() {
        if(window.state && window.state.isSessionActive) {
             const vol = window.state.currentSession.totalVolume;
             const globalVol = document.getElementById('global-live-volume');
             const viewVol = document.getElementById('running-volume-badge');
             
             if (globalVol) globalVol.innerText = `⚡ ${vol} kg`;
             if (viewVol) viewVol.innerText = `⚡ Total Volume: ${vol} kg`;
        }
    },

    bindBMILogic() {
        const currInput = document.getElementById('ob-curr-weight');
        const goalInput = document.getElementById('ob-goal-weight');
        const heightInput = document.getElementById('ob-height');
        const insightTxt = document.getElementById('bmi-insight');

        const updateBMI = () => {
            const w = Number(currInput.value);
            const gw = Number(goalInput.value);
            const h = Number(heightInput.value) / 100; // m
            
            if(w > 0 && gw > 0 && h > 0) {
                const bmi = (w / (h*h)).toFixed(1);
                const tBmi = (gw / (h*h)).toFixed(1);
                const diff = (((w - gw) / w) * 100).toFixed(1);
                
                if(diff > 0) {
                    insightTxt.innerHTML = `Current BMI: <strong style="color:var(--text-primary)">${bmi}</strong> ➔ Target: <strong style="color:var(--electric-volt)">${tBmi}</strong><br>Targeting a ${diff}% reduction in body mass. A bold and healthy goal!`;
                } else if (diff < 0) {
                    insightTxt.innerHTML = `Current BMI: <strong style="color:var(--text-primary)">${bmi}</strong> ➔ Target: <strong style="color:var(--electric-volt)">${tBmi}</strong><br>Targeting a ${Math.abs(diff)}% increase in body mass. Time to build!`;
                } else {
                    insightTxt.innerHTML = `Current BMI: <strong style="color:var(--text-primary)">${bmi}</strong><br>Maintaining current composition.`;
                }
            } else {
                insightTxt.innerHTML = '';
            }
        };

        currInput.addEventListener('input', updateBMI);
        goalInput.addEventListener('input', updateBMI);
        heightInput.addEventListener('input', updateBMI);

        // Initialize Flatpickr for Onboarding Goal Target Date
        if (typeof flatpickr !== 'undefined' && document.getElementById('ob-goal-date')) {
            flatpickr("#ob-goal-date", { 
                monthSelectorType: "dropdown",
                dateFormat: "d-m-Y",
                disableMobile: true
            });
        }
    },

    bindProfileLogic() {
        const currInput = document.getElementById('prof-current-weight');
        const goalInput = document.getElementById('prof-goal-weight');
        const heightInput = document.getElementById('prof-height');
        
        // Find existing psy message block or create one
        let psychBlock = document.getElementById('prof-psych-message');
        if(!psychBlock) {
            psychBlock = document.createElement('div');
            psychBlock.id = 'prof-psych-message';
            const saveBtn = document.getElementById('prof-goal-date').nextElementSibling;
            saveBtn.parentNode.insertBefore(psychBlock, saveBtn);
        }

        const updateBMI = () => {
            const w = Number(currInput.value);
            const gw = Number(goalInput.value);
            const h = Number(heightInput.value) / 100;
            
            if(w > 0 && gw > 0 && h > 0) {
                const bmi = (w / (h*h)).toFixed(1);
                const diff = gw - w;
                const pct = Math.abs((diff / w) * 100).toFixed(1);
                
                psychBlock.innerHTML = `
                    <p class="text-sec" style="font-size: 0.9rem; margin-top: var(--space-sm); text-align: center; font-style: italic;">
                        Live BMI: <strong style="color:var(--text-primary)">${bmi}</strong>. Targeting a ${Math.abs(diff).toFixed(1)}kg shift (${pct}%).
                    </p>
                `;
            } else {
                psychBlock.innerHTML = '';
            }
        };

        if (currInput && goalInput && heightInput) {
            currInput.addEventListener('input', updateBMI);
            goalInput.addEventListener('input', updateBMI);
            heightInput.addEventListener('input', updateBMI);
        }

        // Initialize Flatpickr for Profile Goal Target Date
        if (typeof flatpickr !== 'undefined' && document.getElementById('prof-goal-date')) {
            flatpickr("#prof-goal-date", { 
                monthSelectorType: "dropdown",
                dateFormat: "d-m-Y",
                disableMobile: true
            });
        }
        
        if (typeof window.loadProfileData === 'function') {
            window.loadProfileData();
        }
        if (typeof window.updateProgressRing === 'function') {
            window.updateProgressRing();
        }
        if (typeof UI.loadUserPosts === 'function') {
            UI.loadUserPosts();
        }

        if (typeof window.fetchUserAnalytics === 'function') {
            window.fetchUserAnalytics().then(({labels, data}) => {
                const ctx = document.getElementById('volumeChart');
                if (ctx) {
                    if (window.volumeChartInstance) window.volumeChartInstance.destroy();
                    window.volumeChartInstance = new Chart(ctx.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Total Volume (kg)',
                                data: data,
                                backgroundColor: '#00ffcc',
                                borderRadius: 4
                            }]
                        },
                        options: { scales: { y: { beginAtZero: true } } }
                    });
                }
            }).catch(e => console.error("Chart error:", e));
        }
    },

    initPostWorkoutChart() {
        const ctx = document.getElementById('analytics-chart')?.getContext('2d');
        if(!ctx) return;

        const { logs } = window.recentWorkout; // Array of logs
        if(!logs || logs.length === 0) return;

        // Just pulling the first exercise for a trend sample, to keep it simple
        const sampleLog = logs[0];
        const db = DB.get();

        if (sampleLog.type === 'strength') {
            const pastLogs = db.strength_logs.filter(l => l.exerciseId === sampleLog.data.exerciseId).slice(-5);
            const labels = pastLogs.map((_, i) => `Set ${i+1}`);
            const dataPoints = pastLogs.map(l => l.sets[0].weight);

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Working Weight Trend (kg)',
                        data: dataPoints,
                        borderColor: '#00D1FF',
                        backgroundColor: 'rgba(0, 209, 255, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#FFFFFF' } } },
                    scales: {
                        y: { ticks: { color: '#A0A0A0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: '#A0A0A0' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
        } else {
            const pastLogs = db.cardio_logs.filter(l => l.exerciseId === sampleLog.data.exerciseId).slice(-5);
            const labels = pastLogs.map((_, i) => `Run ${i+1}`);
            const speeds = pastLogs.map(l => l.speed);
            const durations = pastLogs.map(l => l.duration);

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: 'Avg Speed (kph)', data: speeds, borderColor: '#FF5F1F', yAxisID: 'y' },
                        { label: 'Time Spent (mins)', data: durations, borderColor: '#00D1FF', yAxisID: 'y1' }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { position: 'left', ticks: { color: '#FF5F1F' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y1: { position: 'right', ticks: { color: '#00D1FF' }, grid: { drawOnChartArea: false } },
                        x: { ticks: { color: '#A0A0A0' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
        }
    },

    updateHistoryTable(exerciseId) {
        const list = document.getElementById('active-history-list');
        if (!list) return;
        
        const logs = window.state.currentSession.loggedExercises.filter(l => l.exerciseId === exerciseId);
        
        list.innerHTML = logs.map((log, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.02); border-left: 2px solid ${log.weight > 0 ? 'var(--accent-cyan)' : 'var(--text-silver)'}; border-radius: 4px; cursor: pointer; transition: background 0.2s;" onclick="app.editLoggedSet('${log.exerciseId}', ${index})" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'">
                <span style="font-weight: bold; color: ${log.weight > 0 ? '#00D1FF' : 'var(--text-silver)'};">${log.weight > 0 ? '✓' : '○'} Set ${index + 1}</span>
                <span class="text-sec" style="font-size: 1.1rem; color: var(--text-white);">${log.weight}kg × ${log.reps}</span>
            </div>
        `).join('');
    },

    async generateCalendarGrid(year, month) {
        let historyObj = {};
        try {
            const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
            const req = await fetch(`${baseUrl}/api/workouts/history`);
            const res = await req.json();
            const historyList = res.history || [];
            
            historyList.forEach(h => {
                historyObj[h.date] = { has_workout: true, ...h };
            });
        } catch(e) {
            console.error("Failed to fetch calendar history:", e);
        }
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let html = '<div class="calendar-grid">';
        
        dayNames.forEach(d => {
            html += `<div class="calendar-header-cell">${d}</div>`;
        });
        
        for (let i = 0; i < startingDayOfWeek; i++) {
            html += '<div class="calendar-cell empty"></div>';
        }
        
        const todayStr = new Date().toISOString().split('T')[0];
        window.selectedHistoryDate = window.selectedHistoryDate || todayStr;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const m = String(month + 1).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            const dateStr = `${year}-${m}-${d}`;
            
            const record = historyObj[dateStr];
            const hasWorkout = record && record.has_workout;
            const isSelected = window.selectedHistoryDate === dateStr;
            
            let classes = 'calendar-cell';
            if (hasWorkout) classes += ' has-workout';
            if (isSelected) classes += ' selected';
            
            html += `<div class="${classes}" onclick="app.selectHistoryDate('${dateStr}'); app.closeCalendarModal()">${day}</div>`;
        }
        
        html += '</div>';
        return html;
    },

    templates: {
        activeWorkout: (exId) => {
            const exercises = DB.get().vault;
            const ex = exercises.find(e => e.id === exId);
            if(!ex) return '<h1>Error</h1>';

            const history = []; // Sync history placeholder for the template (rendered immediately). Analytics requests dynamic load dynamically anyway.
            let subtitleText = 'First time performing this exercise! (Sync loaded)';
            if (history.length > 0) {
                subtitleText = `Last performed on: ${history[history.length - 1].date}`;
            }

            const mode = window.state.currentSession.mode;
            let timerColor = 'var(--text-primary)';
            let timerLabel = '';
            let progressDots = '';
            let bottomButton = `
                <button id="back-to-vault-btn" class="secondary-btn" style="width: 100%; border: 1px solid var(--text-silver); color: var(--text-silver); height: 50px; font-size: 1.1rem; border-radius: var(--radius-md);" onclick="app.navTo('vault')">
                    ← Back to Vault
                </button>
            `;

            if (mode === 'squad' || mode === 'playlist') {
                 timerColor = mode === 'squad' ? '#FF5F1F' : '#00D1FF';
                 const labelText = mode === 'squad' ? 'Sync Clock' : 'Playlist Active';
                 timerLabel = `<div style="color: ${timerColor}; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${labelText}</div>`;
                 
                 const queue = mode === 'squad' ? window.state.currentSession.routineQueue : window.state.currentSession.exerciseQueue;
                 
                 let totalEx = 0;
                 let remainingEx = queue ? queue.length : 0;
                 let currentIndex = 0;
                 
                 if (mode === 'squad') {
                     const routine = DB.get().customRoutines.find(r => r.id === window.state.currentSession.routineId);
                     if (routine) {
                         totalEx = routine.exerciseIds.length;
                         currentIndex = window.state.currentSession.currentIndex;
                         remainingEx = queue.length - currentIndex - 1; 
                     }
                 }
                 
                 if (remainingEx > 0) {
                     const nextExId = mode === 'squad' ? queue[currentIndex + 1] : queue[0];
                     const nextExName = exercises.find(e => e.id === nextExId)?.name || 'Next';
                     bottomButton = `
                        <button id="next-exercise-btn" class="neon-btn" style="background: transparent; border: 1px solid ${timerColor}; color: ${timerColor}; width: 100%; height: 50px; font-size: 1.1rem; border-radius: var(--radius-md);" onclick="app.nextRoutineExercise()">
                            Next Exercise: ${nextExName} ⏭
                        </button>
                     `;
                 } else {
                     bottomButton = `
                        <button id="finish-routine-btn" class="neon-btn" style="width: 100%; height: 50px; font-size: 1.1rem; border-radius: var(--radius-md);" onclick="app.nextRoutineExercise()">
                            Finish Routine 🏆
                        </button>
                     `;
                 }
                 
                 // Generate dots for squad mode
                 if (mode === 'squad' && totalEx > 0) {
                     let dotsHTML = '';
                     for(let i=0; i<totalEx; i++) {
                         if(i === currentIndex) {
                             dotsHTML += '<div style="width: 12px; height: 12px; border-radius: 50%; background: #FF5F1F; box-shadow: 0 0 8px #FF5F1F;"></div>';
                         } else if(i < currentIndex) {
                             dotsHTML += '<div style="width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.4);"></div>';
                         } else {
                             dotsHTML += '<div style="width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.1);"></div>';
                         }
                     }
                     progressDots = `<div style="display: flex; gap: 8px; justify-content: center; margin-bottom: var(--space-md);">${dotsHTML}</div>`;
                 }
            }

            return `
            <div class="active-workout-wrapper fade-in" style="min-height: 100vh; padding-bottom: 120px;">
                <header style="margin-bottom: var(--space-lg); display: flex; flex-direction: column; align-items: center; text-align: center;">
                    ${progressDots}
                    <h2 class="text-highlight" style="font-size: 2rem; margin-bottom: 4px;">${ex.name}</h2>
                    <p class="text-sec" style="font-size: 0.9rem; margin-bottom: var(--space-sm);">${subtitleText}</p>
                    ${timerLabel}
                </header>
                
                <div class="glass-panel" style="padding: var(--space-lg); margin-bottom: var(--space-md); background: rgba(10, 13, 20, 0.9);">
                    <div style="display: flex; gap: var(--space-md);">
                        <div style="flex: 1;">
                            <label class="text-sec" style="font-size: 0.9rem; margin-bottom: 8px; display: block; text-align: center;">Weight (kg)</label>
                            <input type="number" id="active-weight" value="" placeholder="0" style="font-size: 2rem; height: 60px; text-align: center; font-weight: bold; background: #05070A; color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-md);">
                        </div>
                        <div style="flex: 1;">
                            <label class="text-sec" style="font-size: 0.9rem; margin-bottom: 8px; display: block; text-align: center;">Reps</label>
                            <input type="number" id="active-reps" value="" placeholder="0" style="font-size: 2rem; height: 60px; text-align: center; font-weight: bold; background: #05070A; color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-md);">
                        </div>
                    </div>
                    <button class="neon-btn" style="margin-top: var(--space-md); height: 60px; font-size: 1.2rem;" onclick="app.submitActiveSet('${ex.id}')">
                        Log Set
                    </button>
                    
                    <div style="margin-top: 16px;">
                        ${bottomButton}
                    </div>
                </div>

                <div class="history-table glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-md); background: transparent; border: 1px solid rgba(255,255,255,0.05); max-height: 250px; overflow-y: auto;">
                    <h3 class="text-sec" style="font-size: 1rem; margin-bottom: var(--space-sm); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">Exercise History</h3>
                    <div id="active-history-list" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Sets will be injected here -->
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px; margin-bottom: var(--space-md);">
                    <button id="btn-volume-analytics" class="secondary-btn" style="flex: 1; border-color: var(--accent-cyan); color: var(--accent-cyan); font-size: 0.85rem;" onclick="app.triggerAnalytics('volume', '${ex.name.replace(/'/g, "\\'")}')">Volume Analytics</button>
                    <button id="btn-1rm-analytics" class="secondary-btn" style="flex: 1; border-color: #FF5F1F; color: #FF5F1F; font-size: 0.85rem;" onclick="app.triggerAnalytics('1rm', '${ex.name.replace(/'/g, "\\'")}')">1RM Progression</button>
                </div>
                
                ${(mode === 'squad' || mode === 'playlist') ? `
                <div style="margin-top: var(--space-lg); padding: var(--space-md);" class="glass-panel">
                    <h3 class="text-sec" style="font-size: 1rem; margin-bottom: var(--space-sm);">Upcoming Queue</h3>
                    <ul id="upcoming-queue-list" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-sm);">
                        ${(function() {
                            let upcoming = [];
                            let dragBaseIndex = 0;
                            
                            if (mode === 'squad') {
                                const queue = window.state.currentSession.routineQueue || [];
                                const idx = window.state.currentSession.currentIndex;
                                upcoming = queue.slice(idx + 1);
                                dragBaseIndex = idx + 1;
                            } else { // playlist
                                upcoming = window.state.currentSession.exerciseQueue || []; 
                                dragBaseIndex = 0;
                            }
                            
                            if (upcoming.length === 0) {
                                return '<li style="color: var(--text-dim); text-align: center; font-size: 0.9rem; padding: var(--space-sm);">Routine Complete</li>';
                            }
                            
                            return upcoming.map((uId, i) => {
                                const listIndex = dragBaseIndex + i;
                                const uEx = exercises.find(e => e.id === uId);
                                if(!uEx) return '';
                                
                                let htmlStr = '';
                                if (mode === 'squad') {
                                    htmlStr += '<li draggable="true" ondragstart="event.dataTransfer.setData(' + "'text/plain'" + ', ' + listIndex + ')" ondragover="event.preventDefault(); this.style.borderColor=' + "'#FF5F1F'" + ';" ondragleave="this.style.borderColor=' + "'rgba(255,255,255,0.1)'" + ';" ondrop="event.preventDefault(); this.style.borderColor=' + "'rgba(255,255,255,0.1)'" + '; app.reorderQueue(parseInt(event.dataTransfer.getData(' + "'text/plain'" + ')), ' + listIndex + ');" style="padding: var(--space-md); background: #161B22; border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; cursor: grab; transition: border-color 0.2s;">';
                                } else {
                                    htmlStr += '<li style="padding: var(--space-md); background: #161B22; border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; cursor: default;">';
                                }
                                htmlStr += '<span style="color: #FFF; font-weight: bold; font-size: 1rem;">' + uEx.name + '</span>';
                                htmlStr += '<span style="color: var(--text-dim); font-size: 1.2rem;">≡</span>';
                                htmlStr += '</li>';
                                return htmlStr;
                            }).join('');
                        })()}
                    </ul>
                </div>` : ''}
            </div>
            `;
        },
        vault: () => {
            const currentTab = window.state.vaultTab || 'universal';
            const hideProTip = localStorage.getItem('hideProTip') === 'true';
            
            const toggleHTML = `
                ${!hideProTip ? `
                <div id="swipe-hint-banner" style="background: rgba(0, 209, 255, 0.1); border: 1px solid rgba(0, 209, 255, 0.3); border-radius: var(--radius-sm); padding: 12px; display: flex; justify-content: space-between; align-items: center; color: var(--accent-cyan); font-size: 0.85rem; margin-bottom: var(--space-md); transition: opacity 0.5s ease;">
                    <span>💡 Pro Tip: Swipe right on a set to quickly log it!</span>
                    <button style="background: none; border: none; color: var(--accent-cyan); font-size: 1.2rem; cursor: pointer; padding: 0 5px;" onclick="localStorage.setItem('hideProTip', 'true'); document.getElementById('swipe-hint-banner').style.display='none';">✕</button>
                </div>
                ` : ''}
                <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-md); background: rgba(255,255,255,0.05); padding: 4px; border-radius: var(--radius-md); backdrop-filter: blur(10px);">
                    <button style="flex: 1; padding: 10px; border-radius: 4px; border: none; font-weight: bold; cursor: pointer; transition: 0.3s; background: ${currentTab === 'universal' ? 'rgba(0, 209, 255, 0.2)' : 'transparent'}; color: ${currentTab === 'universal' ? '#00D1FF' : '#A0A0A0'}; box-shadow: ${currentTab === 'universal' ? '0 0 10px rgba(0, 209, 255, 0.1)' : 'none'};" onclick="window.state.vaultTab='universal'; app.navTo('vault');">Universal Database</button>
                    <button style="flex: 1; padding: 10px; border-radius: 4px; border: none; font-weight: bold; cursor: pointer; transition: 0.3s; background: ${currentTab === 'routines' ? 'rgba(255, 95, 31, 0.2)' : 'transparent'}; color: ${currentTab === 'routines' ? '#FF5F1F' : '#A0A0A0'}; box-shadow: ${currentTab === 'routines' ? '0 0 10px rgba(255, 95, 31, 0.1)' : 'none'};" onclick="window.state.vaultTab='routines'; app.navTo('vault');">My Routines</button>
                </div>
            `;
            
            let mainContent = '';
            
            if (currentTab === 'universal') {
                const exercises = window.exerciseDB || [];
                
                const exerciseHTML = exercises.map(ex => {
                    return `
                    <li class="lean-list-item" style="cursor: pointer; position: relative" onclick="UI.renderView('exerciseDetail', '${ex.id}')" data-name="${ex.name.toLowerCase()}" data-muscle="${(ex.muscle || '').toLowerCase()}">
                        <div style="width: 100%;">
                            <div style="font-weight: bold; font-size: 1rem; color: #FFF;">${ex.name}</div>
                            <div style="font-size: 0.8rem; color: #A0A0A0; margin-top: 4px;">${ex.muscle} / ${ex.equipment}</div>
                        </div>
                        <div style="color: var(--accent-cyan); font-size: 1.2rem;">
                            ›
                        </div>
                    </li>
                    `;
                }).join('');

                mainContent = `
                    <div style="margin-bottom: var(--space-md); position: sticky; top: 0; z-index: 10;">
                        <input type="search" id="exercise-search" placeholder="Search exercises..." style="width: 100%; padding: 12px 16px; border-radius: var(--radius-md); background: rgba(22, 27, 34, 0.9); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 1rem;">
                    </div>
                    
                    <ul class="lean-list exercise-list">
                        ${exerciseHTML}
                    </ul>
                `;
            } else if (currentTab === 'routines') {
                const autoRoutine = window.state && window.state.userProfile && window.state.userProfile.routine;
                
                let autoRoutineHTML = '';
                if (!autoRoutine || autoRoutine.length === 0) {
                    autoRoutineHTML = `
                        <div style="margin-bottom: var(--space-xl); padding: 24px; background: rgba(0, 209, 255, 0.05); border: 1px solid rgba(0, 209, 255, 0.2); border-radius: var(--radius-md); text-align: center;">
                            <h3 style="color: var(--accent-cyan); margin-bottom: 8px;">Need a Personalized Plan?</h3>
                            <p style="color: var(--text-silver); font-size: 0.9rem; margin-bottom: 16px;">Configure parameters to let Auto-Coach generate a custom split tailored to your goals and equipment.</p>
                            <button class="neon-btn" style="width: 100%; padding: 14px;" onclick="app.openCoachConsultation()">
                                Generate My Personalized Program ⚡
                            </button>
                        </div>
                    `;
                } else {
                    autoRoutineHTML = `
                        <div style="margin-bottom: var(--space-xl);">
                            <h3 style="margin-bottom: 12px; color: var(--accent-cyan); display: flex; justify-content: space-between; align-items: center;">
                                My Auto-Coach Program
                                <button style="background: none; border: none; color: #ff5f1f; font-size: 0.8rem; cursor: pointer; text-decoration: underline;" onclick="app.openCoachConsultation()">Regenerate</button>
                            </h3>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                ${autoRoutine.map((day, i) => {
                                    if (day.type === 'rest') {
                                        return `
                                            <div class="glass-panel" style="padding: 16px; opacity: 0.6; border: 1px dashed rgba(255,255,255,0.2);">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                                    <h4 style="color: #A0A0A0; margin: 0; font-size: 0.9rem;">${day.date}</h4>
                                                </div>
                                                <h3 style="color: #fff; margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                                                    <span>💤</span> ${day.dayName}
                                                </h3>
                                            </div>
                                        `;
                                    } else {
                                        return `
                                            <div class="glass-panel" style="padding: 16px;">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                                    <div>
                                                        <h4 style="color: #A0A0A0; margin: 0; font-size: 0.9rem; margin-bottom: 4px;">${day.date}</h4>
                                                        <h3 style="color: #fff; margin: 0;">${day.dayName}</h3>
                                                    </div>
                                                    <button class="neon-btn" style="padding: 6px 14px; font-size: 0.85rem;" onclick="app.startRoutineDay(${i})">Start ⚡️</button>
                                                </div>
                                                <ul style="list-style: none; padding: 0; margin: 0; margin-top: 12px;">
                                                    ${(day.exercises || []).map(ex => `
                                                        <li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;">
                                                            <span style="color: #ccc;">${ex.name}</span>
                                                            <span style="color: var(--accent-cyan); font-weight: bold;">${ex.targetSets}x${ex.targetReps}</span>
                                                        </li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        `;
                                    }
                                }).join('')}
                            </div>
                        </div>
                    `;
                }

                mainContent = `
                    ${autoRoutineHTML}
                    
                    <h3 style="margin-bottom: 12px; color: #fff;">My Custom Templates</h3>
                    <div style="margin-bottom: var(--space-lg);">
                        <button class="neon-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1.1rem; padding: 16px;" onclick="app.promptCreateTemplate()">
                            <span>+ Create New Template</span>
                        </button>
                    </div>
                    
                    <div id="templates-list" style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="text-align: center; color: #A0A0A0; padding: 40px; border: 1px dashed rgba(255,255,255,0.1); border-radius: var(--radius-md);">
                            Loading templates from database...
                        </div>
                    </div>
                `;
            }

            return `
            <div class="vault-wrapper fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: var(--space-md);">
                    <h2 class="text-highlight">The Vault</h2>
                </header>
                ${toggleHTML}
                ${mainContent}
            </div>
            `;
        },
        logSession: (exId) => {
            const exercises = DB.get().vault;
            const ex = exercises.find(e => e.id === exId);
            if(!ex) return '<h1>Error</h1>';

            const isCardio = ex.type === 'cardio';

            let formHTML = '';
            if(!isCardio) {
                formHTML = `
                    <div class="glass-panel" style="padding: var(--space-lg); margin-bottom: var(--space-md);">
                        <h3 style="margin-bottom: var(--space-md);">Log Set 1</h3>
                        <div style="display: flex; gap: var(--space-md);">
                            <div style="flex: 1;">
                                <label class="text-sec" style="font-size: 0.8rem;">Weight (kg)</label>
                                <input type="number" id="log-weight" value="0">
                            </div>
                            <div style="flex: 1;">
                                <label class="text-sec" style="font-size: 0.8rem;">Reps</label>
                                <input type="number" id="log-reps" value="0">
                            </div>
                        </div>
                        <div style="margin-top: var(--space-md);">
                            <label class="text-sec" style="font-size: 0.8rem;">Trainer Notes</label>
                            <textarea id="trainer-notes" rows="2" style="width: 100%; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px; border-radius: var(--radius-sm);" placeholder="Seat height: 6, focus on tempo..."></textarea>
                        </div>
                    </div>
                `;
            } else {
                formHTML = `
                    <div class="glass-panel" style="padding: var(--space-lg); margin-bottom: var(--space-md);">
                        <h3 style="margin-bottom: var(--space-md);">Log Run/Ride</h3>
                        <div>
                            <label class="text-sec" style="font-size: 0.8rem;">Duration (Mins)</label>
                            <input type="number" id="log-duration" value="30">
                        </div>
                        <div style="display: flex; gap: var(--space-md);">
                            <div style="flex: 1;">
                                <label class="text-sec" style="font-size: 0.8rem;">Distance (KM)</label>
                                <input type="number" id="log-distance" value="5">
                            </div>
                            <div style="flex: 1;">
                                <label class="text-sec" style="font-size: 0.8rem;">Avg Speed (KPH)</label>
                                <input type="number" id="log-speed" value="10">
                            </div>
                        </div>
                        <div style="margin-top: var(--space-md);">
                            <label class="text-sec" style="font-size: 0.8rem;">Trainer Notes</label>
                            <textarea id="trainer-notes" rows="2" style="width: 100%; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px; border-radius: var(--radius-sm);" placeholder="Felt knee pain, breathing pattern..."></textarea>
                        </div>
                    </div>
                `;
            }

            return `
            <div class="log-wrapper fade-in" style="min-height: 100vh;">
                <header style="margin-bottom: var(--space-lg); display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: var(--space-md);">
                        <button class="secondary-btn" style="padding: 8px 12px; border-radius: 50%; border: none;" onclick="app.navTo('vault')">←</button>
                        <div>
                            <h2 class="text-highlight">${ex.name}</h2>
                            <p class="text-sec">${isCardio ? 'Endurance Run' : 'Strength Session'}</p>
                        </div>
                    </div>
                </header>
                
                ${formHTML}

                <button class="neon-btn" onclick="app.submitLog('${ex.id}', '${ex.type}')">
                    Add to Session
                </button>
            </div>
            `;
        },
        arena: () => {
            const currentTab = window.state.arenaTab || 'global';
            
            const toggleHTML = `
                <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-md); background: rgba(255,255,255,0.05); padding: 4px; border-radius: var(--radius-md); backdrop-filter: blur(10px);">
                    <button style="flex: 1; padding: 10px; border-radius: 4px; border: none; font-weight: bold; cursor: pointer; transition: 0.3s; background: ${currentTab === 'global' ? 'rgba(0, 209, 255, 0.2)' : 'transparent'}; color: ${currentTab === 'global' ? '#00D1FF' : '#A0A0A0'};" onclick="window.state.arenaTab='global'; UI.renderView('arena');">Global Ranks</button>
                    <button style="flex: 1; padding: 10px; border-radius: 4px; border: none; font-weight: bold; cursor: pointer; transition: 0.3s; background: ${currentTab === 'squad' ? 'rgba(255, 95, 31, 0.2)' : 'transparent'}; color: ${currentTab === 'squad' ? '#FF5F1F' : '#A0A0A0'};" onclick="window.state.arenaTab='squad'; UI.renderView('arena');">My Squad</button>
                </div>
            `;
            
            const myVolume = parseInt(localStorage.getItem('userTotalVolume')) || 0;
            const currentUser = localStorage.getItem('username') || 'You';

            let leaderboardData = [];
            if (currentTab === 'global') {
                leaderboardData = [
                    { name: currentUser, vol: myVolume, isMe: true },
                    { name: 'Alex', vol: 24500, isMe: false },
                    { name: 'Sam', vol: 18200, isMe: false },
                    { name: 'Jordan', vol: 9400, isMe: false }
                ];
            } else {
                leaderboardData = [
                    { name: 'SquadLeader_01', vol: 15000, isMe: false },
                    { name: currentUser, vol: myVolume, isMe: true },
                    { name: 'IronLifter99', vol: 3200, isMe: false }
                ];
            }

            leaderboardData.sort((a, b) => b.vol - a.vol);

            const getRank = (vol) => {
                if (vol >= 20000) return { label: 'APEX TIER', color: 'rgba(255, 95, 31, 0.2)', text: '#FFF' };
                if (vol >= 15000) return { label: 'TITAN', color: 'rgba(0, 209, 255, 0.2)', text: '#FFF' };
                if (vol >= 10000) return { label: 'GLADIATOR', color: 'rgba(155, 89, 182, 0.3)', text: '#FFF' };
                if (vol >= 5000) return { label: 'CONTENDER', color: 'rgba(46, 204, 113, 0.2)', text: '#FFF' };
                return { label: 'INITIATE', color: 'rgba(255, 255, 255, 0.1)', text: '#FFF' };
            };

            let rowsHTML = leaderboardData.map((user, idx) => {
                const rankObj = getRank(user.vol);
                const isFirst = idx === 0;
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: ${user.isMe ? 'none' : '1px solid rgba(255,255,255,0.05)'}; padding: 12px ${user.isMe ? '8px' : '0'}; background: ${user.isMe ? 'rgba(0, 209, 255, 0.05)' : 'transparent'}; border-radius: ${user.isMe ? '8px' : '0'}; margin-top: ${user.isMe ? '8px' : '0'};">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-weight: bold; color: ${isFirst ? 'var(--accent-cyan)' : (user.isMe ? '#FFF' : '#A0A0A0')};">${idx + 1}.</span>
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${user.isMe ? 'var(--accent-cyan)' : '#333'}; color: ${user.isMe ? '#000' : '#FFF'}; display: flex; align-items: center; justify-content: center; font-weight: bold; text-transform: uppercase;">
                                ${user.name.substring(0, 2)}
                            </div>
                            <div>
                                <div style="font-weight: bold; color: #FFF;">${user.name}</div>
                                <div style="font-size: 0.75rem; color: ${rankObj.text}; background: ${rankObj.color}; padding: 2px 6px; border-radius: 4px; display: inline-block;">${rankObj.label}</div>
                            </div>
                        </div>
                        <div style="text-align: right; padding-right: ${user.isMe ? '8px' : '0'};">
                            <div style="font-weight: bold; color: var(--accent-cyan);">${user.vol.toLocaleString()} kg</div>
                            <div style="font-size: 0.75rem; color: var(--text-sec);">Vol.</div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
            <div class="arena-wrapper fade-in" style="padding-bottom: 120px; padding-top: 20px;">
                <header style="margin-bottom: var(--space-md);">
                    <h2 class="text-highlight" style="margin: 0;">Arena Leaderboards</h2>
                    <p class="text-sec" style="font-size: 0.9rem;">Compete globally or dominate your squad.</p>
                </header>
                
                ${toggleHTML}
                
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;">
                    ${rowsHTML}
                </div>
            </div>
            `;
        },
        workoutOverlay: () => {
            return `
            <div class="arena-wrapper fade-in" style="padding-bottom: 120px; min-height: 100vh; padding: 20px;">
                <header style="margin-bottom: var(--space-md); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: var(--bg-midnight); z-index: 100; padding: 10px 0;">
                    <button class="secondary-btn" style="border: none; color: #A0A0A0; font-weight: bold; font-size: 1rem;" onclick="window.minimizeWorkout()">
                        🔽 Minimize
                    </button>
                    ${(window.state && window.state.isSessionActive === true) ? `
                         <button class="neon-btn" style="background: var(--accent-success); border-color: var(--accent-success); box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4); padding: 8px 16px; font-size: 0.9rem;" onclick="window.finishGlobalWorkout()">
                            Finish
                        </button>
                    ` : ``}
                </header>

                <div style="display: flex; flex-direction: column; text-align: center; margin-bottom: 20px; padding: 10px; background: rgba(0, 209, 255, 0.05); border-radius: 12px; border: 1px solid rgba(0, 209, 255, 0.1);">
                    <span id="arena-timer-display" style="font-family: monospace; font-size: 2rem; color: #FFF; font-weight: bold; letter-spacing: 2px;">00:00</span>
                    <span id="arena-total-volume" style="font-size: 1rem; color: var(--accent-cyan); font-weight: bold;">⚡ 0 kg</span>
                </div>

                <div id="arena-exercises-container">
                    <!-- Exercise Cards are injected here via Arena_Logic.js -->
                </div>

                <!-- EXERCISE PICKER MODAL -->
                <div id="exercise-picker-modal" class="bottom-sheet" style="padding-bottom: 20px !important; z-index: 9500;">
                    <div class="sheet-header">
                        <h3>Add Exercise</h3>
                        <button class="sheet-close-btn" onclick="document.getElementById('exercise-picker-modal').classList.remove('active')">✕</button>
                    </div>
                    <input type="text" id="picker-search" placeholder="Search exercises..." style="width: calc(100% - 32px); padding: 12px; margin: 0 16px 15px 16px; border-radius: 8px; background: #2c2c2e; color: #fff; border: none; font-size: 1rem; box-sizing: border-box;" onkeyup="
                        const val = this.value.toLowerCase();
                        const btns = document.querySelectorAll('.ex-picker-btn');
                        btns.forEach(btn => {
                            if (btn.innerText.toLowerCase().includes(val)) btn.style.display = 'block';
                            else btn.style.display = 'none';
                        });
                    ">
                    <div class="sheet-controls" style="max-height: 50vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 0 16px;">
                        ${(() => {
                            if (window.exerciseDB) {
                                return Object.keys(window.exerciseDB).map(exKey => {
                                    const exName = window.exerciseDB[exKey].name || exKey;
                                    return `<button class="secondary-btn ex-picker-btn" style="width: 100%; border: 1px solid rgba(255,255,255,0.1); color: #FFF; padding: 12px; text-align: left; background: rgba(0,0,0,0.2);" onclick="window.addSpecificExerciseToArena('${exName.replace(/'/g, "\\'")}')">${exName}</button>`;
                                }).join('');
                            }
                            return `<div style="text-align: center; color: var(--text-dim);">No exercises found</div>`;
                        })()}
                    </div>
                </div>

                <!-- BOTTOM SHEET MODAL (LOGGER) -->
                <div id="arena-bottom-sheet" class="bottom-sheet" style="z-index: 10000000 !important;">
                    <div class="sheet-header">
                        <h3>Log Set</h3>
                        <button class="sheet-close-btn" onclick="window.closeLogSheet()">✕</button>
                    </div>
                    <div class="sheet-controls">
                        <div class="sheet-block" style="text-align: center; display: flex; flex-direction: column; gap: 8px;">
                            <div style="color: #A0A0A0; font-size: 0.85rem; text-transform: uppercase;">Reps</div>
                            <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                                <button class="qty-btn" onclick="window.adjReps(-1)">-</button>
                                <input type="number" id="bs-reps" value="10" class="qty-display" style="background: transparent; border: none; color: #FFF; font-size: 2rem; font-weight: bold; text-align: center; width: 80px; outline: none; -moz-appearance: textfield; appearance: none;">
                                <button class="qty-btn" onclick="window.adjReps(1)">+</button>
                            </div>
                        </div>
                        <div class="sheet-block" style="text-align: center; display: flex; flex-direction: column; gap: 8px;">
                            <div style="color: #A0A0A0; font-size: 0.85rem; text-transform: uppercase;">Weight (kg)</div>
                            <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                                <button class="qty-btn" onclick="window.adjWeight(-2.5)">-</button>
                                <input type="number" id="bs-weight" value="20" class="qty-display" style="background: transparent; border: none; color: #FFF; font-size: 2rem; font-weight: bold; text-align: center; width: 80px; outline: none; -moz-appearance: textfield; appearance: none;">
                                <button class="qty-btn" onclick="window.adjWeight(2.5)">+</button>
                            </div>
                        </div>
                    </div>
                    <button class="neon-btn log-btn" style="width: 100%; background: #2ecc71; border-color: #2ecc71; color: #111; margin-top: 10px; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);" onclick="window.submitLogSheet()">
                        ✅ Log Set
                    </button>
                </div>
            </div>
            `;
        },
        folders: () => {
            const currentTab = window.state.squadTab || 'feed';
            const db = DB.get();
            const squad = (db.user && db.user.squadId) ? DB.getSquad(db.user.squadId) : null;

            let mainContent = '';

            const toggleHTML = `
                <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-md); background: rgba(255,255,255,0.05); padding: 4px; border-radius: var(--radius-md); backdrop-filter: blur(10px);">
                    <button id="tour-target-feed" style="flex: 1; padding: 10px; border-radius: 4px; border: none; font-weight: bold; cursor: pointer; transition: 0.3s; background: ${currentTab === 'feed' ? 'rgba(0, 209, 255, 0.2)' : 'transparent'}; color: ${currentTab === 'feed' ? '#00D1FF' : '#A0A0A0'}; box-shadow: ${currentTab === 'feed' ? '0 0 10px rgba(0, 209, 255, 0.1)' : 'none'};" onclick="window.state.squadTab='feed'; app.navTo('folders');">Feed</button>
                    <button id="tour-target-manage" style="flex: 1; padding: 10px; border-radius: 4px; border: none; font-weight: bold; cursor: pointer; transition: 0.3s; background: ${currentTab === 'manage' ? 'rgba(255, 95, 31, 0.2)' : 'transparent'}; color: ${currentTab === 'manage' ? '#FF5F1F' : '#A0A0A0'}; box-shadow: ${currentTab === 'manage' ? '0 0 10px rgba(255, 95, 31, 0.1)' : 'none'};" onclick="window.state.squadTab='manage'; app.navTo('folders');">My Squad</button>
                </div>
            `;

            if (currentTab === 'feed') {
                const fabHTML = `
                    <button id="new-post-fab" class="fab-add-post" style="position: fixed; bottom: 100px; right: 20px; width: 60px; height: 60px; border-radius: 50%; background: var(--accent-cyan); box-shadow: 0 0 20px rgba(0,209,255,0.6); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #000; cursor: pointer; z-index: 1000; border: none; font-weight: 300; transition: transform 0.2s;">
                        +
                    </button>
                `;
                
                // Trigger Async Network Fetch replacing container immediately post-render
                setTimeout(() => {
                    if(typeof UI !== 'undefined' && UI.loadSocialFeed) {
                        UI.loadSocialFeed();
                    }
                    if (!localStorage.getItem('tour_completed') && typeof window.startSquadTour === 'function') {
                        window.startSquadTour();
                    }
                }, 50);

                mainContent = `
                    <div id="social-feed-container" style="display: flex; flex-direction: column; gap: 24px; min-height: 50vh; align-items: center; justify-content: center;">
                        <div style="color: var(--accent-cyan); font-weight: bold; font-size: 1.2rem; filter: drop-shadow(0 0 8px rgba(0,209,255,0.5));">Loading Arena Network...</div>
                    </div>
                    ${fabHTML}
                `;
            } else if (currentTab === 'manage') {
                const username = localStorage.getItem('username') || 'Guest';
                const squads = JSON.parse(localStorage.getItem('squads') || '[]');
                const targetSquad = squads.find(s => s.members.includes(username));

                if (!targetSquad) {
                    mainContent = `
                        <div style="text-align: center; margin-top: 40px; padding: var(--space-xl);">
                            <div style="font-size: 3rem; margin-bottom: var(--space-md); color: #A0A0A0;">🛡️</div>
                            <h3 style="color: #FFFFFF; font-size: 1.5rem; margin-bottom: var(--space-sm);">No Squad Assigned</h3>
                            <p style="color: #A0A0A0; font-size: 1rem; margin-bottom: var(--space-xl);">Join forces with other athletes to crush the leaderboard.</p>
                            
                            <div style="display: flex; flex-direction: column; gap: var(--space-md); max-width: 300px; margin: 0 auto;">
                                <input type="text" id="squad-name-input" placeholder="Enter Squad Name" maxlength="20" style="padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); color: #FFF; border-radius: var(--radius-sm); text-align: center; font-size: 1rem;">
                                <button class="neon-btn" style="width: 100%; box-shadow: 0 4px 15px rgba(0, 209, 255, 0.2);" onclick="window.createNewSquad()">
                                    + Create Squad
                                </button>
                                <input type="text" id="squad-invite-input" placeholder="Invite Code (e.g. ABC123)" maxlength="6" style="padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); color: #FFF; border-radius: var(--radius-sm); text-align: center; font-size: 1rem; margin-top: 10px; text-transform: uppercase;">
                                <button class="secondary-btn" style="width: 100%; border: 1px solid var(--accent-cyan); color: var(--accent-cyan);" onclick="window.joinExistingSquad()">
                                    Join Squad
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    mainContent = `
                        <div style="text-align: center; margin-top: 40px; padding: var(--space-xl);">
                            <div style="font-size: 3rem; margin-bottom: var(--space-md); color: #A0A0A0;">🏆</div>
                            <h3 style="color: #FFFFFF; font-size: 1.5rem; margin-bottom: var(--space-sm);">You are in: <span class="text-highlight">${targetSquad.name}</span></h3>
                            <p style="color: #A0A0A0; font-size: 1rem; margin-bottom: var(--space-xl);">Invite your friends to compete together!</p>
                            
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0, 209, 255, 0.1); border: 2px solid var(--accent-cyan); border-radius: var(--radius-md); padding: var(--space-lg); box-shadow: 0 0 20px rgba(0,209,255,0.2); position: relative;">
                                <span style="font-size: 0.8rem; color: #FFF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Invite Code</span>
                                <h1 id="squad-invite-display" style="font-size: 3rem; color: #FFF; font-weight: 800; letter-spacing: 5px; margin: 0; filter: drop-shadow(0 0 10px rgba(0,209,255,0.5));">${targetSquad.id}</h1>
                                <button onclick="navigator.clipboard.writeText('${targetSquad.id}'); alert('Copied!');" style="margin-top: 12px; background: transparent; color: var(--accent-cyan); border: 1px solid var(--accent-cyan); padding: 4px 12px; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8rem;">
                                    📋 Copy to Clipboard
                                </button>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: var(--space-md); display: flex; justify-content: flex-end;">
                            <button class="secondary-btn disband-btn" style="background: transparent; color: #FF5F1F; border: 1px solid rgba(255, 95, 31, 0.5); padding: 6px 14px; font-size: 0.8rem;" onclick="if(confirm('Leave Squad?')) { window.kickMember('${username}'); }">
                                Leave Squad
                            </button>
                        </div>
                        
                        <h4 style="color: #A0A0A0; margin-bottom: var(--space-sm); font-size: 0.9rem; text-transform: uppercase;">Squad Roster</h4>
                    `;
                    
                    if(targetSquad.members) {
                        mainContent += targetSquad.members.map(member => `
                            <div class="glass-panel" style="margin-bottom: var(--space-sm); padding: var(--space-md); background: #161B22; border-color: rgba(255,255,255,0.05); display: flex; align-items: center; gap: var(--space-md);">
                                <div style="width: 45px; height: 45px; border-radius: 50%; background: #00D1FF; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #05070A; font-size: 1.2rem; box-shadow: 0 0 10px rgba(0,209,255,0.4);">
                                    ${member.charAt(0).toUpperCase()}
                                </div>
                                <div style="flex: 1;">
                                    <h4 style="margin: 0; color: #FFFFFF; font-size: 1.1rem; margin-bottom: 4px;">
                                        ${member} ${targetSquad.admin === member ? '👑' : ''}
                                    </h4>
                                    <p style="color: #A0A0A0; font-size: 0.85rem;">${targetSquad.admin === member ? 'Squad Admin' : 'Active Member'}</p>
                                </div>
                                ${(targetSquad.admin === username && member !== username) ? `
                                <button onclick="window.kickMember('${member}')" style="background: transparent; border: 1px solid #FF5F1F; color: #FF5F1F; border-radius: 4px; padding: 4px 8px; cursor: pointer;">
                                    🗑️ Remove
                                </button>
                                ` : ''}
                            </div>
                        `).join('');
                    }
                }
            }

            return `
            <div class="folders-wrapper fade-in" style="padding-bottom: 120px; position: relative; min-height: 100vh;">
                <header style="margin-bottom: var(--space-md); display: flex; justify-content: space-between; align-items: center;">
                    <h2 class="text-highlight" style="color: #FFFFFF; font-size: 2.2rem; margin-bottom: 0;">Squad Hub</h2>
                    <div style="background: rgba(0, 209, 255, 0.1); padding: 6px 12px; border-radius: 20px; border: 1px solid var(--accent-cyan); font-size: 0.8rem; color: var(--accent-cyan); font-weight: 600;">
                        ${squad ? squad.name : 'Global Arena'}
                    </div>
                </header>
                
                ${toggleHTML}
                ${mainContent}
            </div>
            `;
        },
        postWorkout: () => {
            const { logs } = window.recentWorkout;
            // Aggregate totals for the summary
            let totalVol = 0;
            let totalDist = 0;

            logs.forEach(l => {
                if(l.type === 'strength') totalVol += l.data.sets[0].volume;
                if(l.type === 'cardio') totalDist += l.data.distance;
            });

            const messages = [
                "Great work, keep going!",
                "New Personal Best Unlocked!",
                "Iron sharpens Iron.",
                "Today's effort is tomorrow's strength."
            ];
            const msg = messages[Math.floor(Math.random() * messages.length)];

            let statsHTML = `
                <div style="display: flex; justify-content: center; gap: var(--space-lg);">
                    ${totalVol > 0 ? `<div>
                        <div style="font-size: 2rem; font-weight: 800; color: var(--accent-primary);">${totalVol} <span style="font-size: 1rem; color: var(--text-dim); font-weight: 500;">KG Vol</span></div>
                    </div>` : ''}
                    ${totalDist > 0 ? `<div>
                        <div style="font-size: 2rem; font-weight: 800; color: var(--accent-success);">${totalDist} <span style="font-size: 1rem; color: var(--text-dim); font-weight: 500;">KM</span></div>
                    </div>` : ''}
                </div>
                <div class="text-sec" style="font-size: 0.9rem; margin-top: var(--space-md);">${logs.length} Exercises Logged</div>
            `;

            return `
            <div class="fade-in" style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: var(--space-xl);">
                <div style="font-size: 4rem; margin-bottom: var(--space-md);">🔥</div>
                <h2 class="text-highlight" style="margin-bottom: var(--space-sm);">Session Complete</h2>
                
                <div class="glass-panel" style="padding: var(--space-lg); width: 100%; margin-bottom: var(--space-lg); margin-top: var(--space-md);">
                    ${statsHTML}
                </div>

                <div class="glass-panel" style="width: 100%; text-align: left; padding: var(--space-md); margin-bottom: var(--space-lg);">
                    <label class="text-sec" style="font-size: 0.8rem; margin-bottom: var(--space-sm); display: block;">The Chronicler • Overall Feeling</label>
                    <textarea id="overall-feeling-note" rows="3" style="width: 100%; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px; border-radius: var(--radius-sm);" placeholder="Felt incredibly strong today, marathon training is paying off..."></textarea>
                    <button class="neon-btn" style="width: 100%; margin-top: var(--space-md); padding: 8px;" onclick="app.saveOverallNote()">Save Chronicle</button>
                </div>

                <div style="font-size: 1.2rem; font-weight: 700; font-style: italic; color: var(--electric-volt); margin-bottom: var(--space-xl);">
                    "${msg}"
                </div>

                <div style="width: 100%; height: 200px; margin-bottom: var(--space-xl);">
                    <canvas id="analytics-chart"></canvas>
                </div>

                <button class="neon-btn" onclick="app.navTo('dashboard')">Back to Home</button>
            </div>
            `;
        },
        profile: () => {
            const p = window.state.userProfile || {};
            
            let userStreak = parseInt(localStorage.getItem('streakCount')) || 0;
            let currentRank = 'INITIATE';
            if (userStreak >= 30) currentRank = 'APEX';
            else if (userStreak >= 21) currentRank = 'TITAN';
            else if (userStreak >= 14) currentRank = 'GLADIATOR';
            else if (userStreak >= 7) currentRank = 'CONTENDER';

            const user = { 
                name: p.name || 'Athlete', 
                currentWeight: p.current_weight || p.start_weight || 80, 
                goalWeight: p.target_weight || 75, 
                height: p.height || 180,
                age: p.age || '',
                gender: p.gender || '',
                goalDate: p.goal_date || localStorage.getItem('profile_goalDate') || '',
                rank: currentRank
            };
            
            // Calculate BMI Status and Psych Message
            let bmiStatusHTML = '';
            let psychMessage = '';
            if (user.height && user.currentWeight && user.goalWeight) {
                const h = Number(user.height) / 100;
                const bmi = (user.currentWeight / (h*h)).toFixed(1);
                
                let badgeTxt = "Average Zone";
                if (bmi >= 18.5 && bmi <= 24.9) badgeTxt = "Peak Performance Range";
                else if (bmi < 18.5) badgeTxt = "Building Phase";
                else badgeTxt = "Mass Movement Range";

                bmiStatusHTML = `
                <div style="background: rgba(0, 209, 255, 0.1); padding: var(--space-md); border-radius: var(--radius-md); text-align: center; margin-bottom: var(--space-lg);">
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--electric-volt);">${bmi} BMI</div>
                    <div style="color: var(--text-primary); font-size: 0.9rem; font-weight: bold; margin-top: 4px;">🛡️ ${badgeTxt}</div>
                </div>`;

                const diff = user.goalWeight - user.currentWeight;
                const pct = Math.abs(((diff) / user.currentWeight) * 100).toFixed(1);
                psychMessage = `<p class="text-sec" style="font-size: 0.9rem; margin-top: var(--space-sm); text-align: center; font-style: italic;">
                    "You're targeting a ${Math.abs(diff).toFixed(1)}kg shift. That’s ${pct}% of your body mass. Let's make it happen, ${user.name}!"
                </p>`;
            }

            return `
            <div class="profile-wrapper fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: var(--space-lg); display: flex; justify-content: space-between; align-items: center;">
                    <h2 class="text-highlight">Profile & Settings</h2>
                    <div onclick="window.triggerProfileUpload()" style="width: 60px; height: 60px; border-radius: 50%; background: #222; border: 2px solid var(--accent-cyan); display: flex; justify-content: center; align-items: center; font-size: 1.8rem; overflow: hidden; cursor: pointer; position: relative; box-shadow: 0 0 15px rgba(0,209,255,0.3);">
                        ${localStorage.getItem('squadfit_avatar') 
                            ? `<img src="${localStorage.getItem('squadfit_avatar')}" class="profile-avatar" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top:0; left:0;">` 
                            : `<span style="display: ${localStorage.getItem('squadfit_avatar')?'none':'block'}">👤</span><img class="profile-avatar" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top:0; left:0; display: none;">`
                        }
                    </div>
                </header>
                
                ${bmiStatusHTML}

                <div class="glass-panel" style="padding: var(--space-lg);">
                    <div style="margin-bottom: var(--space-xl); display: flex; flex-direction: column; align-items: center;">
                        <div style="position: relative; width: 120px; height: 120px; margin-bottom: var(--space-md);">
                            <svg width="120" height="120" viewBox="0 0 120 120" style="transform: rotate(-90deg);">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="#161B22" stroke-width="8"></circle>
                                <circle id="profile-progress-ring" class="progress-ring" cx="60" cy="60" r="54" fill="none" stroke="#00D1FF" stroke-width="8" stroke-dasharray="339.292" stroke-dashoffset="339.292" stroke-linecap="round"></circle>
                            </svg>
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <span id="profile-progress-text" style="font-size: 1.2rem; font-weight: bold; color: #FFF;">0%</span>
                                <span style="font-size: 0.6rem; color: #A0A0A0; text-transform: uppercase; letter-spacing: 1px;">Shift</span>
                            </div>
                        </div>
                    </div>

                    <label class="text-sec" style="font-size: 0.8rem; margin-bottom: 4px; display: block;">Full Name</label>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <input type="text" id="profile-name" value="${user.name || ''}" style="color: #fff; flex: 1;">
                        <div id="profile-rank-badge" style="display: block; padding: 4px 12px; border-radius: 12px; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: #808080; border: 1px solid #808080; background: rgba(0,0,0,0.3);">${user.rank}</div>
                    </div>
                    
                    <div style="display: flex; gap: var(--space-md);">
                        <div style="flex: 1;">
                            <label class="text-sec" style="font-size: 0.8rem; margin-bottom: 4px; display: block;">Age</label>
                            <input type="number" id="prof-age" value="${user.age || ''}" style="color: #fff;">
                        </div>
                        <div style="flex: 1;">
                            <label class="text-sec" style="font-size: 0.8rem; margin-bottom: 4px; display: block;">Gender</label>
                            <select id="prof-gender" style="color: #fff;">
                                <option value="male" ${user.gender === 'male'? 'selected':''}>Male</option>
                                <option value="female" ${user.gender === 'female'? 'selected':''}>Female</option>
                                <option value="non-binary" ${user.gender === 'non-binary'? 'selected':''}>Non-Binary</option>
                            </select>
                        </div>
                    </div>

                    <label class="text-sec" style="font-size: 0.8rem; margin-bottom: 4px; display: block;">Height (cm)</label>
                    <input type="number" id="prof-height" value="${user.height || ''}" style="color: #fff;">
                    
                    <div style="display: flex; gap: var(--space-md);">
                        <div style="flex: 1;">
                            <label class="text-sec" style="font-size: 0.8rem; margin-bottom: 4px; display: block;">Current Wt (kg)</label>
                            <input type="number" id="prof-current-wt" value="${user.currentWeight || ''}" style="color: #fff;">
                        </div>
                        <div style="flex: 1;">
                            <label class="text-sec" style="font-size: 0.8rem; margin-bottom: 4px; display: block;">Target Wt (kg)</label>
                            <input type="number" id="prof-target-wt" value="${user.goalWeight || ''}" style="color: #fff;">
                        </div>
                    </div>
                    
                    <label class="text-sec" style="font-size: 0.8rem; margin-bottom: 4px; display: block;">Goal Target Date</label>
                    <input type="date" id="prof-goal-date" value="${user.goalDate || ''}" style="color: #fff;">
                    
                    ${psychMessage}
                    
                    <button id="save-profile-btn" class="neon-btn" onclick="window.saveProfile(this)" style="margin-top: var(--space-md); width: 100%;">
                        Save Profile
                    </button>
                    <button id="logout-btn" class="secondary-btn" onclick="app.logout()" style="margin-top: var(--space-md); width: 100%; border-color: rgba(255, 95, 31, 0.5); color: #FF5F1F;">
                        Log Out
                    </button>
                </div>

                <div class="analytics-card" style="background: #1c1c1e; padding: 20px; border-radius: 12px; margin-top: 20px; margin-bottom: 20px;">
                    <h3 style="color: #00ffcc; margin-bottom: 15px;">Progressive Overload</h3>
                    <canvas id="volumeChart" width="400" height="200"></canvas>
                </div>

                <div style="margin-top: var(--space-lg);">
                    <h3 class="text-highlight" style="margin-bottom: var(--space-md); text-align: center;">My Posts</h3>
                    <div id="user-posts-grid" class="posts-grid" style="display: flex; flex-direction: column; gap: 10px;">
                        ${(() => {
                            const currentUser = localStorage.getItem('username') || 'Guest';
                            const posts = JSON.parse(localStorage.getItem('squad_posts') || '[]');
                            const myPosts = posts.filter(p => p.author === currentUser || p.username === currentUser);
                            if (myPosts.length === 0) return '<div style="color:var(--text-dim);text-align:center;">No posts yet.</div>';
                            return myPosts.map((p, idx) => `
                                <div class="glass-panel" style="padding: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                                    <div style="flex: 1;">
                                        <div style="color: #FFF; font-size: 0.9rem;">${p.caption || p.text}</div>
                                        <div style="color: var(--text-dim); font-size: 0.75rem;">${new Date(p.time || p.timestamp || Date.now()).toLocaleString()}</div>
                                    </div>
                                    <button onclick="window.deletePost('${p.time || idx}')" style="background: rgba(255,59,48,0.1); border: 1px solid #FF3B30; color: #FF3B30; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">Delete</button>
                                </div>
                            `).join('');
                        })()}
                    </div>
                </div>
            </div>
            `;
        },
        auth: () => '',
        onboarding: () => `
            <div class="onboarding-wrapper fade-in" style="padding-bottom: 20px;">
                <h2 style="margin-bottom: var(--space-md); font-size: 1.5rem; text-align: center;">Build Your Profile</h2>
                <div class="glass-panel" style="padding: var(--space-md);">
                    <input type="text" id="ob-name" placeholder="Full Name" style="margin-bottom: 8px; font-size: 0.9rem;">
                    <input type="number" id="profile-age" placeholder="Age" min="13" max="100" style="margin-bottom: 8px; font-size: 0.9rem;">
                    <select id="ob-gender" style="margin-bottom: 8px; font-size: 0.9rem;">
                        <option value="" disabled selected>Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                    <input type="number" id="ob-height" placeholder="Height (cm)" style="margin-bottom: 8px; font-size: 0.9rem;">
                    <div style="display: flex; gap: var(--space-sm);">
                        <input type="number" id="ob-curr-weight" placeholder="Current Wt (kg)" style="margin-bottom: 8px; font-size: 0.9rem;">
                        <input type="number" id="ob-goal-weight" placeholder="Target Wt (kg)" style="margin-bottom: 8px; font-size: 0.9rem;">
                    </div>
                    
                    <p id="bmi-insight" class="text-sec" style="font-size: 0.85rem; margin-bottom: 8px; min-height: 20px;"></p>

                    <label class="text-sec" style="font-size: 0.75rem; margin-bottom: 2px; display: block;">Goal Target Date</label>
                    <input type="date" id="ob-goal-date" style="margin-bottom: 12px; font-size: 0.9rem;">

                    <label class="text-sec" style="font-size: 0.75rem; margin-bottom: 2px; display: block;">Target Frequency (Days/Week)</label>
                    <select id="ob-frequency" style="margin-bottom: 12px; font-size: 0.9rem;" onchange="app.enforceScheduleLimit()">
                        <option value="1">1 Day</option>
                        <option value="2">2 Days</option>
                        <option value="3" selected>3 Days</option>
                        <option value="4">4 Days</option>
                        <option value="5">5 Days</option>
                        <option value="6">6 Days</option>
                        <option value="7">7 Days</option>
                    </select>

                    <label class="text-sec" style="font-size: 0.75rem; margin-bottom: 6px; display: block;">Preferred Schedule</label>
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-md);">
                        ${['M','T','W','Th','F','S','Su'].map(day => `
                            <label style="display: flex; flex-direction: column; align-items: center; font-size: 0.75rem; color: var(--text-primary); cursor: pointer;">
                                <input type="checkbox" name="ob-schedule" value="${day}" style="margin-bottom: 4px; width: auto;" onchange="app.enforceScheduleLimit()">
                                ${day}
                            </label>
                        `).join('')}
                    </div>

                    <button id="ob-submit-btn" class="neon-btn" onclick="app.completeOnboarding()" style="margin-top: 8px;" disabled>
                        Lock In
                    </button>
                </div>
            </div>
        `,
        dashboard: (streakVal = 0) => {
            if (localStorage.getItem('username') === '69noobsslayer') { localStorage.setItem('username', 'Athlete'); }
            const user = DB.getUser() || { name: 'Athlete' };
            const currentStreak = streakVal || (DB.calculateUserStreak ? DB.calculateUserStreak() : 4);
            
            // 1. Header & Streak
            const headerHTML = `
                <div style="width: 100%; display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
                    <div style="width: 100%; background: #161b22; border: 1px solid #ff4500; border-radius: 50px; padding: 10px; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 10px rgba(255,69,0,0.2);">
                        <span id="streak-counter" style="color: #ff4500; font-weight: bold; font-size: 0.9rem;">Current Streak: 🔥 ${currentStreak} Days</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="font-size: 1.5rem; font-weight: 700; color: #FFF; margin: 0;">
                            Welcome back,<br><span style="color: #00d2ff;">${user.name}</span>
                        </h2>
                        <div onclick="window.triggerProfileUpload()" style="width: 50px; height: 50px; border-radius: 50%; background: #222; border: 2px solid #00d2ff; display: flex; justify-content: center; align-items: center; font-size: 1.5rem; overflow: hidden; cursor: pointer; position: relative;">
                            ${localStorage.getItem('squadfit_avatar') 
                                ? `<img src="${localStorage.getItem('squadfit_avatar')}" class="user-avatar" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top:0; left:0;">` 
                                : `<span>👤</span><img class="user-avatar" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top:0; left:0; display: none;">`
                            }
                        </div>
                    </div>
                </div>
            `;

            // 2. Recommended For You Section
            const recommendedHTML = `
                <div style="width: 100%; margin-bottom: 24px;">
                    <h3 style="color: #FFF; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">Recommended For You</h3>
                    <div class="horizontal-scroll" style="display: flex; gap: 12px; padding-bottom: 8px;">
                        <button class="rec-btn" onclick="UI.renderView('exerciseDetail', 'PPL | Push')">PPL | Push</button>
                        <button class="rec-btn" onclick="UI.renderView('exerciseDetail', 'PPL | Pull')">PPL | Pull</button>
                        <button class="rec-btn" onclick="UI.renderView('exerciseDetail', 'PPL | Legs')">PPL | Legs</button>
                        <button class="rec-btn" onclick="UI.renderView('exerciseDetail', 'Cardio Core')">Cardio Core</button>
                    </div>
                </div>
            `;

            const daysLeft = 65;
            const progressHue = 65; 
            
            const goalCalendarHTML = `
                <div class="dark-card" style="margin-bottom: 24px;">
                    <h3 class="card-header" style="margin-bottom: 16px;">Goal Calendar</h3>
                    <div style="display: flex; justify-content: center; margin: 20px 0;">
                        <div class="goal-ring" style="background: conic-gradient(#00d2ff ${progressHue}%, #333 0);">
                            <div class="goal-ring-inner">
                                <span class="goal-number" id="dash-days-left">--</span>
                                <span class="goal-label">Days Left</span>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
                        <div style="text-align: center; flex: 1; border-right: 1px solid rgba(255,255,255,0.05);">
                            <div style="font-size: 1.4rem; font-weight: bold; color: #FFF;"><span id="dash-kg-lose">--</span> kg</div>
                            <div style="font-size: 0.75rem; color: #888; text-transform: uppercase;">To Lose</div>
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 1.4rem; font-weight: bold; color: #FFF;"><span id="dash-req-rate">--</span> <span style="font-size: 0.9rem;">kg/w</span></div>
                            <div style="font-size: 0.75rem; color: #888; text-transform: uppercase;">Req. Rate</div>
                        </div>
                    </div>
                </div>
            `;

            // 4. Hydration Zone (Advanced)
            const hydrationHTML = `
                <div class="dark-card" style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h3 class="card-header" style="margin: 0;">Hydration Zone</h3>
                        <span id="hydration-counter" style="color: #00d2ff; font-weight: bold; font-size: 0.9rem;">0 / 2800 ml</span>
                    </div>
                    <div class="hydro-progress-bar">
                        <div id="hydration-bar-fill" class="hydro-progress-fill"></div>
                    </div>
                    <div class="hydro-btn-row" style="display: flex; justify-content: space-between; gap: 10px; margin-top: 15px;">
                        <button class="hydro-quick-btn" onclick="window.logWater(-250)" data-amount="-250">
                            <span class="hydro-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>
                            </span>
                            <span class="hydro-text">-250</span>
                        </button>
                        <button class="hydro-quick-btn" onclick="window.logWater(250)" data-amount="250">
                            <span class="hydro-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2l1.5 18h9L18 2H6z"/><path d="M7 10h10"/></svg>
                            </span>
                            <span class="hydro-text">+250</span>
                        </button>
                        <button class="hydro-quick-btn" onclick="window.logWater(500)" data-amount="500">
                            <span class="hydro-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h12v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z"/><path d="M17 10h1a3 3 0 0 1 0 6h-1"/><path d="M8 3v2"/><path d="M12 3v2"/><path d="M16 3v2"/></svg>
                            </span>
                            <span class="hydro-text">+500</span>
                        </button>
                        <button class="hydro-quick-btn" onclick="window.logWater(750)" data-amount="750">
                            <span class="hydro-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v2H9z"/><path d="M10 4v3l-2 3v10h8V10l-2-3V4"/></svg>
                            </span>
                            <span class="hydro-text">+750</span>
                        </button>
                        <button class="hydro-quick-btn" onclick="window.logWater(1000)" data-amount="1000">
                            <span class="hydro-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2h8v2H8z"/><path d="M10 4v3l-3 3v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V10l-3-3V4"/><path d="M17 12h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/></svg>
                            </span>
                            <span class="hydro-text">+1000</span>
                        </button>
                    </div>
                </div>
            `;

            // Nuke block has been removed safely here
            setTimeout(() => { if(typeof window.syncGoalCalendar === 'function') window.syncGoalCalendar(); }, 100);

            return `
            <div class="dashboard-wrapper fade-in" style="padding: 20px 16px; padding-bottom: 90px; width: 100%; max-width: 500px; margin: 0 auto; box-sizing: border-box;">
                ${headerHTML}
                ${recommendedHTML}
                ${goalCalendarHTML}
                ${hydrationHTML}
            </div>
            `;
        },
        exerciseDetail: (exerciseId) => {
            const vault = window.exerciseDB || DB.get().vault || [];
            const ex = vault.find(e => String(e.id) === String(exerciseId));
            if (!ex) {
                return `
                <div style="padding: 20px; text-align: center; color: #fff; padding-top: 50px;">
                    <button class="secondary-btn" style="margin-bottom: 20px;" onclick="UI.renderView('vault')">← Back</button>
                    <h2>Exercise Not Found</h2>
                </div>`;
            }

            const history = DB.get().history || [];
            const pastSessions = [];

            for (let act of history) {
                if (act.type === 'workout_logged' && act.workout && act.workout.exercises) {
                    const loggedEx = act.workout.exercises.find(e => e.name === ex.name);
                    if (loggedEx) {
                        pastSessions.push({
                            date: act.date,
                            weight: loggedEx.weight || 0,
                            reps: loggedEx.reps || 0
                        });
                    }
                }
            }

            pastSessions.sort((a,b) => new Date(b.date) - new Date(a.date));
            const top5 = pastSessions.slice(0, 5);

            let performanceHTML = '';
            if (top5.length > 0) {
                performanceHTML = top5.map(session => `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #A0A0A0; font-size: 0.9rem;">${session.date}</span>
                        <div style="text-align: right;">
                            <span style="color: #FFF; font-weight: bold; font-size: 1.1rem;">${session.weight}kg <span style="font-size: 0.8rem; color: #888;">x${session.reps}</span></span>
                        </div>
                    </div>
                `).join('');
            } else {
                performanceHTML = `
                    <div style="text-align: center; color: #888; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 8px; font-style: italic;">
                        No data yet. Time to set a baseline.
                    </div>
                `;
            }

            return `
            <div class="fade-in" style="padding: 0 16px; padding-bottom: 120px;">
                <div style="display: flex; gap: 12px; align-items: center; padding: 16px 0; position: sticky; top: 0; background: var(--bg-midnight); z-index: 10;">
                    <div onclick="UI.renderView('vault')" style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; justify-content: center; align-items: center; color: #FFF; cursor: pointer;">
                        ← 
                    </div>
                    <div style="flex: 1;">
                        <h2 style="color: #FFF; margin: 0; font-size: 1.4rem;">${ex.name}</h2>
                        <span style="color: var(--accent-cyan); font-size: 0.85rem; font-weight: bold; text-transform: uppercase;">${ex.muscle || 'General'} / ${ex.equipment || 'Various'}</span>
                    </div>
                </div>

                <div style="margin-top: 24px;">
                    <h3 style="color: #FFF; font-size: 1rem; margin-bottom: 16px;">Past Performance</h3>
                    ${performanceHTML}
                </div>

                <div style="position: fixed; bottom: 80px; left: 20px; right: 20px; z-index: 100;">
                    ${(window.state && window.state.isSessionActive) ? 
                        `<button class="btn-start-routine" id="start-single-exercise-btn" style="width: 100%; padding: 15px; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(0, 210, 255, 0.3); background: var(--accent-success); border-color: var(--accent-success);" onclick="Arena.appendExercise('${exerciseId}')">➕ Add to Current Workout</button>` 
                        : 
                        `<button class="btn-start-routine" id="start-single-exercise-btn" style="width: 100%; padding: 15px; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(0, 210, 255, 0.3);" onclick="window.startGlobalWorkout('${exerciseId}')">🚀 START WORKOUT</button>`
                    }
                </div>
            </div>
            `;
        },
        routinePreview: (routineId) => {
            const customRoutines = DB.get().customRoutines || [];
            const presets = DB.get().routinePresets || [];
            const r = customRoutines.find(x => x.id === routineId) || presets.find(x => x.id === routineId);
            if (!r) return `<div style="padding: 20px; text-align: center;">Routine not found.</div>`;

            const vault = DB.get().vault || [];
            const exList = r.exerciseIds.map(id => vault.find(v => v.id === id)).filter(Boolean);

            return `
            <div class="fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: var(--space-lg); text-align: center;">
                    <h2 class="text-highlight" style="font-size: 2rem;">${r.name}</h2>
                    ${r.isPreset ? `<span style="font-size: 0.8rem; background: rgba(0,209,255,0.1); color: var(--accent-cyan); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--accent-cyan);">PRESET</span>` : ''}
                    ${r.description ? `<p class="text-sec" style="margin-top: var(--space-sm);">${r.description}</p>` : ''}
                </header>

                <div class="glass-panel" style="margin-bottom: var(--space-lg); padding: var(--space-md); background: #161B22; border-color: rgba(255,255,255,0.1);">
                    <h3 style="color: #FFFFFF; font-size: 1.2rem; margin-bottom: var(--space-md);">Workout Overview</h3>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${exList.map((ex, i) => `
                            <li style="color: #A0A0A0; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: var(--space-sm);">
                                <span style="color: var(--accent-cyan); font-weight: bold; width: 24px;">${i + 1}.</span>
                                <span style="color: #FFF;">${ex.name}</span>
                                <span style="font-size: 0.8rem; margin-left: auto;">${ex.target}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div style="display: flex; flex-direction: column; gap: var(--space-md);">
                    <button class="neon-btn" style="width: 100%; font-size: 1.1rem; padding: 16px; box-shadow: 0 4px 15px rgba(0, 209, 255, 0.2);" onclick="app.startRoutine('${r.id}')">
                        ▶ Start Workout
                    </button>
                    <button class="secondary-btn" style="width: 100%; border: 1px solid rgba(255,255,255,0.2); color: #FFFFFF;" onclick="app.navToRoutineEdit('${r.id}')">
                        ⚙️ Edit / Customize
                    </button>
                </div>
            </div>
            `;
        },
        routineEdit: (routineId) => {
            const routines = DB.get().customRoutines || [];
            const r = routines.find(x => x.id === routineId);
            if (!r) return `<div style="padding: 20px; text-align: center;">Routine not found.</div>`;

            const vault = DB.get().vault || [];
            const exList = r.exerciseIds.map(id => vault.find(v => v.id === id)).filter(Boolean);

            return `
            <div class="fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: var(--space-lg);">
                    <h2 class="text-highlight">Customize</h2>
                    <p class="text-sec">${r.name}</p>
                </header>

                <div id="routine-edit-list" style="margin-bottom: var(--space-lg);">
                    ${exList.map((ex, index) => `
                        <div class="glass-panel" draggable="true" ondragstart="app.handleDragStart(event, ${index})" ondragover="app.handleDragOver(event)" ondrop="app.handleDrop(event, ${index}, '${r.id}')" style="margin-bottom: var(--space-sm); padding: 12px; background: #161B22; border-color: rgba(255,255,255,0.1); display: flex; align-items: center; gap: var(--space-md); cursor: grab;">
                            <span style="color: #666; font-size: 1.2rem; cursor: grab;">☰</span>
                            <div style="flex: 1;">
                                <strong style="color: #FFFFFF; display: block;">${ex.name}</strong>
                                <span style="color: var(--text-dim); font-size: 0.8rem;">${ex.category} • ${ex.target}</span>
                            </div>
                            <button style="background: rgba(255, 59, 48, 0.1); border: 1px solid rgba(255, 59, 48, 0.3); color: #FF3B30; border-radius: 4px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" onclick="app.removeRoutineExercise('${r.id}', ${index})">
                                ✕
                            </button>
                        </div>
                    `).join('')}
                    ${exList.length === 0 ? `<div style="text-align: center; color: var(--text-dim); padding: var(--space-lg);">No exercises in this routine.</div>` : ''}
                </div>

                <div style="text-align: center; margin-bottom: var(--space-xl);">
                    <button class="secondary-btn" style="border: 1px dashed var(--accent-cyan); color: var(--accent-cyan); background: transparent; width: 100%; padding: 16px;" onclick="app.promptAddExercise('${r.id}')">
                        + Add Exercise
                    </button>
                </div>
            </div>
            `;
        },
        history: () => {
            try {
                const workoutHistory = JSON.parse(localStorage.getItem('workout_history') || '[]');
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                
                let gridHtml = `<div class="heatmap-month-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin: 15px 0; padding: 10px; background: #1c1c1e; border-radius: 12px;">`;
                
                for (let i = 1; i <= daysInMonth; i++) {
                    const d = new Date(year, month, i);
                    const formattedDate = window.getLocalISO ? window.getLocalISO(d) : d.toISOString().split('T')[0];
                    const hasWorkout = workoutHistory.some(w => w.date === formattedDate);
                    
                    const style = hasWorkout 
                        ? 'background: #00ffcc; color: #000; font-weight: bold;' 
                        : 'background: rgba(255,255,255,0.05); color: #888;';
                        
                    gridHtml += `<div class="heatmap-square" style="${style} border-radius: 4px; padding: 6px; text-align: center; font-size: 0.8rem; cursor: pointer;" onclick="app.selectHistoryDate('${formattedDate}')">${i}</div>`;
                }
                gridHtml += `</div>`;

            setTimeout(async () => {
                try {
                    const barHtml = await app.generateHistorySlidingBar();
                    const slider = document.getElementById('history-sliding-bar');
                    if (slider) slider.innerHTML = barHtml;
                    await app.selectHistoryDate(window.selectedHistoryDate || new Date().toISOString().split('T')[0]);
                    
                    setTimeout(() => {
                        const activeCard = document.querySelector('.horizontal-date-card.active');
                        if (activeCard) {
                            activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }
                    }, 50);
                } catch(e) {
                    console.error("History injection failure:", e);
                }
            }, 0);

            return `
            <div class="history-wrapper fade-in" style="min-height: 100vh; padding-bottom: 100px;">
                <header style="margin-bottom: var(--space-md);">
                    <h2 class="text-highlight">Workout History</h2>
                    <p class="text-sec">Review past performance & notes</p>
                </header>
                
                <div style="margin-bottom: var(--space-xl);">
                    <h3 class="text-highlight" style="font-size: 1.1rem; text-align: center; margin-bottom: 8px;">${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                    ${gridHtml}
                </div>
                
                <!-- Sliding Date Bar & Calendar Pivot -->
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: var(--space-lg);">
                    <div id="history-sliding-bar" style="flex: 1; display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none;">
                        <span style="color:var(--text-dim); padding: 10px;">Loading Timeline...</span>
                    </div>
                    <!-- Full Calendar Trigger -->
                    <button class="glass-panel" style="padding: 12px; border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.2);" onclick="app.showCalendarModal()">
                        📅
                    </button>
                </div>

                <!-- Hydrated Data Container -->
                <div id="history-summary-card" class="glass-panel" style="padding: var(--space-lg); min-height: 250px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                    <div class="loader"></div>
                    <p class="text-sec" style="margin-top: 10px;">Loading historical records...</p>
                </div>
            </div>
            `;
            } catch(error) {
                console.error("History generation failed:", error);
                return `<div style="text-align:center;color:red;padding:20px;">Error rendering history tab.</div>`;
            }
        }
    }
};

window.app = window.app || {};


window.onload = () => {
    const submitBtn = document.getElementById('FINAL_UI_SUBMIT_BTN');
    console.log("Check: Submit button found?", !!submitBtn);

    if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("SENDING DATA TO: http://127.0.0.1:5001/api/posts");
            console.log("Button clicked! Starting upload process...");

            const fileInput = document.getElementById('FINAL_UI_IMAGE_INPUT');
            const captionInput = document.getElementById('FINAL_UI_CAPTION_INPUT');

            if (!fileInput.files[0]) {
                alert("Please select a file first.");
                return;
            }

            const nameFromLS = localStorage.getItem('username');
            if (!nameFromLS) {
                alert("Please set a name in your profile first!");
                return;
            }

            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            formData.append('caption', captionInput.value);
            formData.append('username', nameFromLS);

            try {
                console.log("Sending fetch request to backend...");
                const response = await fetch('http://127.0.0.1:5001/api/posts', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    console.log("Upload Success!");
                    location.reload(); // Refresh to see the new post
                } else {
                    const err = await response.json();
                    console.error("Server rejected upload:", err);
                }
            } catch (error) {
                console.error("Network Error:", error);
            }
        });
    }
};

UI.loadSocialFeed = async function() {
    const container = document.getElementById('social-feed-container');
    if(!container) return;

    try {
        const username = localStorage.getItem('username') || 'Guest';
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
        const response = await fetch(`${baseUrl}/api/posts?request_user=${encodeURIComponent(username)}`);
        const data = await response.json();

        const localPosts = JSON.parse(localStorage.getItem('squad_posts') || '[]');
        const allPosts = [...localPosts, ...(data.success && data.posts ? data.posts : [])];

        if (allPosts.length > 0) {
            let html = '';
            allPosts.forEach(post => {
                let badgeHTML = '';
                let avatarColor = '#334155';
                let borderStyle = 'border: 1px solid rgba(255,255,255,0.02);';
                
                if (post.is_close_friends) {
                    badgeHTML = `<span style="font-size: 0.8rem; background: rgba(0,209,255,0.15); color: #00D1FF; padding: 2px 6px; border-radius: 12px; border: 1px solid rgba(0,209,255,0.3); display: flex; align-items: center; gap: 4px;">⭐ Squad</span>`;
                    avatarColor = 'linear-gradient(135deg, #00D1FF, #B026FF)';
                    borderStyle = 'border: 1px solid rgba(0,209,255,0.2);';
                } else {
                    badgeHTML = `<span style="font-size: 0.75rem; color: #A0A0A0;">🌐 Global</span>`;
                }

                // Time mapping
                let timeStr = 'Just now';
                if(post.timestamp) {
                    const postDate = new Date(post.timestamp.endsWith('Z') ? post.timestamp : post.timestamp + "Z").getTime();
                    const diff = Date.now() - postDate;
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    if(hours > 0) timeStr = `${hours} hours ago`;
                }

                html += `
                    <div class="feed-post fade-in" style="${borderStyle}">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: ${avatarColor}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; font-size: 1.1rem; border: 2px solid #161B22;">
                                    ${post.username.charAt(0).toUpperCase()}
                                </div>
                                <div style="display: flex; flex-direction: column;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <h4 class="post-username">${post.username}</h4>
                                        ${badgeHTML}
                                    </div>
                                    <span style="color: #A0A0A0; font-size: 0.75rem;">${timeStr}</span>
                                </div>
                            </div>
                            <div style="position: relative;">
                                <button onclick="this.nextElementSibling.classList.toggle('active')" style="background: none; border: none; color: #A0A0A0; font-size: 1.2rem; cursor: pointer; padding: 4px;">⋮</button>
                                <div class="post-menu-dropdown">
                                    <button class="post-menu-btn text-danger" onclick="UI.deletePost(event, ${post.post_id})">Delete Post</button>
                                    <button class="post-menu-btn" onclick="this.parentElement.classList.remove('active')">Cancel</button>
                                </div>
                            </div>
                        </div>
                        ${post.images && post.images.length > 0 ? `
                        <div class="post-image-container">
                            <img src="${post.images[0]}" alt="Post image" class="post-image" />
                        </div>
                        ` : (post.image_url ? `
                        <div class="post-image-container">
                            <img src="${post.image_url}" alt="Post image" class="post-image" />
                        </div>
                        ` : '')}
                        <div class="post-actions">
                            <button type="button" class="post-like-btn" onclick="UI.toggleLike(event, ${post.post_id}, this, this.querySelector('.like-count'))" style="cursor: pointer; transition: transform 0.2s;">
                                <span class="heart-icon ${post.is_liked_by_me ? 'icon-liked' : ''}" style="filter: drop-shadow(0 0 8px rgba(255,255,255,0.4)); display: inline-block; transition: transform 0.2s;">
                                    ${post.is_liked_by_me ? '❤️' : '🤍'}
                                </span> 
                                <span class="like-count" style="margin-left: 4px;">${post.total_likes || 0}</span>
                            </button>
                            <button type="button" onclick="UI.openComments(event, ${post.post_id})">💬 <span style="margin-left: 4px;">0</span></button>
                            <button style="margin-left: auto;">↗️</button>
                        </div>
                        
                        <div class="post-caption">
                            <strong>${post.username}</strong> ${post.caption}
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-dim) !important; margin-top:20px;">
                    <div style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;">📸</div>
                    <div>No posts on the timeline yet. Be the first!</div>
                </div>
            `;
        }
    } catch (e) {
        console.error("Error loading feed:", e);
        container.innerHTML = `<div style="color: #FF5F1F; text-align: center;">Connection Error loading Timeline.</div>`;
    }
};

// Event delegation for opening/closing modals and submitting dynamically
document.addEventListener('click', (e) => {
    // 1. Open New Post Modal
    const newPostFab = e.target.closest('#new-post-fab');
    if (newPostFab) {
        const postModal = document.getElementById('new-post-modal');
        if (postModal) {
            postModal.classList.remove('hidden');
            postModal.style.display = 'flex';
        }
        return;
    }

    // 2. Close New Post Modal
    const closePostBtn = e.target.closest('#close-post-modal');
    if (closePostBtn) {
        const postModal = document.getElementById('new-post-modal');
        if (postModal) {
            postModal.classList.add('hidden');
            postModal.style.display = 'none';
        }
        return;
    }

    // (Submit Post Event Listener removed from delegation and moved to DOMContentLoaded)

});

UI.loadUserPosts = async function() {
    const container = document.getElementById('user-posts-grid');
    if(!container) return;

    try {
        const username = localStorage.getItem('username') || 'Guest';
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
        const response = await fetch(`${baseUrl}/api/posts?username=${encodeURIComponent(username)}&request_user=${encodeURIComponent(username)}`);
        const data = await response.json();

        if (data.success && data.posts.length > 0) {
            let html = '';
            data.posts.forEach(post => {
                html += `
                    <div class="post-card" style="position: relative; aspect-ratio: 1; border-radius: var(--radius-sm); overflow: hidden; background: #0F172A;">
                        <img src="${post.image_url}" alt="Post" style="width: 100%; height: 100%; object-fit: cover;">
                        <button onclick="UI.deletePost(event, ${post.post_id})" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); border: none; color: #FFF; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">🗑️</button>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: var(--space-lg);">
                    No posts yet. Show them what you're made of!
                </div>
            `;
        }
    } catch (e) {
        console.error("Error loading user posts:", e);
        container.innerHTML = '<div style="grid-column: 1 / -1; color: #FF5F1F; text-align: center;">Error loading your posts.</div>';
    }
};

UI.deletePost = async function(e, postId) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (confirm("Delete this post?")) {
        try {
            const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
            const response = await fetch(`${baseUrl}/api/posts/${postId}`, { method: 'DELETE' });
            if (response.ok) {
                if (e && e.target) {
                    const postCard = e.target.closest('.feed-post') || e.target.closest('.post-card');
                    if (postCard) {
                        postCard.remove();
                    }
                }
            } else {
                alert("Failed to delete post.");
            }
        } catch (err) {
            console.error("Error deleting post:", err);
            alert("Error deleting post.");
        }
    }
};

window.saveProfileData = function() {
    const data = {
        name: document.getElementById('profile-name')?.value || '',
        age: document.getElementById('prof-age')?.value || '',
        gender: document.getElementById('prof-gender')?.value || '',
        height: document.getElementById('prof-height')?.value || '',
        currentWeight: document.getElementById('prof-current-weight')?.value || '',
        goalWeight: document.getElementById('prof-goal-weight')?.value || '',
        goalDate: document.getElementById('prof-goal-date')?.value || ''
    };
    if(data.name) {
        localStorage.setItem('username', data.name);
    }
    localStorage.setItem('profileData', JSON.stringify(data));
    if (typeof window.updateProgressRing === 'function') {
        window.updateProgressRing();
    }
    
    const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
    const db = DB.get();
    const sid = db.user ? db.user.squadId : '';

    localStorage.setItem('profile_currentWt', data.currentWeight);
    localStorage.setItem('profile_targetWt', data.goalWeight);
    localStorage.setItem('profile_goalDate', data.goalDate);

    fetch(`${baseUrl}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: data.name,
            start_weight: 80,
            current_weight: data.currentWeight,
            target_weight: data.goalWeight,
            squad_id: sid
        })
    }).catch(e => console.error(e));
    
    const btn = document.getElementById('save-profile-btn');
    if (btn) {
        const og = btn.innerHTML;
        btn.innerHTML = '✓ Saved!';
        btn.style.background = 'rgba(46, 204, 113, 0.4)';
        btn.style.color = '#FFF';
        setTimeout(() => {
            btn.innerHTML = og;
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
    }
    
    if (typeof window.syncGoalCalendar === 'function') {
        window.syncGoalCalendar();
    }
};

window.loadProfileData = function() {
    const dataStr = localStorage.getItem('profileData');
    if(dataStr) {
        try {
            const data = JSON.parse(dataStr);
            const nameEl = document.getElementById('profile-name');
            if(nameEl) nameEl.value = data.name || '';
            const ageEl = document.getElementById('prof-age');
            if(ageEl) ageEl.value = data.age || '';
            const genderEl = document.getElementById('prof-gender');
            if(genderEl) genderEl.value = data.gender || '';
            const heightEl = document.getElementById('prof-height');
            if(heightEl) heightEl.value = data.height || '';
            const currWtEl = document.getElementById('prof-current-weight');
            if(currWtEl) currWtEl.value = data.currentWeight || '';
            const goalWtEl = document.getElementById('prof-goal-weight');
            if(goalWtEl) goalWtEl.value = data.goalWeight || '';
            const goalDateEl = document.getElementById('prof-goal-date');
            if(goalDateEl) goalDateEl.value = data.goalDate || '';
        } catch(e) {
            console.error("Error loading profile Data:", e);
        }
    }
};

window.getRank = function(percent) {
    if (percent >= 100) return { name: "Radiant", color: "#FF5F1F" };
    if (percent >= 81) return { name: "Platinum", color: "#00D1FF" };
    if (percent >= 61) return { name: "Gold", color: "#FFD700" };
    if (percent >= 41) return { name: "Silver", color: "#C0C0C0" };
    if (percent >= 21) return { name: "Bronze", color: "#CD7F32" };
    return { name: "Iron", color: "#808080" };
};

window.calculateProgress = function(current, target, start) {
    if (current > 0 && target > 0 && target !== start) {
        return Math.min(100, Math.max(0, ((start - current) / (start - target)) * 100));
    }
    return 0;
};

window.drawProgressRing = function(percent) {
    const ring = document.getElementById('profile-progress-ring');
    const text = document.getElementById('profile-progress-text');
    if (!ring || !text) return;

    try {
        let progress = Math.min(100, Math.max(0, Number(percent) || 0));
        
        const radius = ring.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        
        ring.style.strokeDasharray = `${circumference} ${circumference}`;
        ring.style.strokeDashoffset = circumference - (progress / 100) * circumference;
        
        text.innerText = `${Math.round(progress)}%`;
        
        const badge = document.getElementById('profile-rank-badge');
        if (badge) {
            const rank = window.getRank(progress);
            badge.innerText = rank.name;
            badge.style.borderColor = rank.color;
            badge.style.color = rank.color;
            badge.style.display = 'inline-block';
        }
    } catch(e) {
        console.error("Error drawing progress ring:", e);
    }
};

window.updateProgressRing = function() {
    try {
        const dataStr = localStorage.getItem('profileData');
        let currentWeight = 0;
        let targetWeight = 0;
        
        if(dataStr) {
            const data = JSON.parse(dataStr);
            currentWeight = Number(data.currentWeight) || 0;
            targetWeight = Number(data.goalWeight) || 0;
        } else {
            const user = typeof DB !== 'undefined' ? DB.getUser() : null;
            if(user) {
                currentWeight = Number(user.currentWeight) || 0;
                targetWeight = Number(user.goalWeight) || 0;
            }
        }
        
        const startWeight = 80;
        const progress = window.calculateProgress(currentWeight, targetWeight, startWeight);

        window.drawProgressRing(progress);
    } catch (e) {
        console.error("Error updating progress ring:", e);
    }
};

window.handleCreateSquad = async function() {
    const input = document.getElementById('squad-name-input');
    const squadName = input ? input.value.trim() : '';
    if (!squadName) return alert('Enter a squad name');
    
    const db = DB.get();
    let rawProf = localStorage.getItem('profileData');
    let profObj = rawProf ? JSON.parse(rawProf) : {};
    
    let username = localStorage.getItem('username') || profObj.name || (db.user ? db.user.name : '');
    
    if(!username || username === 'Guest') {
        alert("Please save your profile name first!");
        return;
    }
    
    console.log("Creating squad with data:", { squadName, username });

    const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
    try {
        const response = await fetch(`${baseUrl}/api/squads/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ squad_name: squadName, username: username })
        });
        const result = await response.json();
        if (result.success) {
            if(!db.user) db.user = {};
            db.user.squadId = result.squad_id;
            db.user.squadName = result.squad_name;
            db.user.inviteCode = result.invite_code;
            DB.save(db);
            alert(`Squad created! Invite code: ${result.invite_code}`);
            UI.renderView('folders');
        } else {
            alert(result.error);
        }
    } catch(e) { console.error(e); alert('Failed to create squad'); }
};

window.handleJoinSquad = async function() {
    const input = document.getElementById('squad-invite-input');
    const code = input ? input.value.trim().toUpperCase() : '';
    if (!code) return alert('Enter an invite code');
    
    const db = DB.get();
    const username = db.user ? db.user.name : '';
    if(!username || username === 'Guest') return alert('Please save your profile first to join a squad.');

    const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
    try {
        const response = await fetch(`${baseUrl}/api/squads/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invite_code: code, username: username })
        });
        const result = await response.json();
        if (result.success) {
            if(!db.user) db.user = {};
            db.user.squadId = result.squad_id;
            db.user.squadName = result.squad_name;
            db.user.inviteCode = code;
            DB.save(db);
            alert(`Successfully joined ${result.squad_name}!`);
            UI.renderView('folders');
        } else {
            alert(result.error || 'Invalid invite code.');
        }
    } catch(e) { console.error(e); alert('Failed to join squad'); }
};

UI.toggleLike = async function(e, postId, btn, countSpan) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    const username = localStorage.getItem('username');
    if(!username || username === 'Guest') {
        alert("Save your profile name to like posts!");
        return;
    }
    
    const iconSpan = btn.querySelector('.heart-icon');
    const isCurrentlyLiked = iconSpan.classList.contains('icon-liked');
    
    const newLikedState = !isCurrentlyLiked;
    iconSpan.classList.toggle('icon-liked', newLikedState);
    iconSpan.innerText = newLikedState ? '❤️' : '🤍';
    let currentCount = parseInt(countSpan.innerText) || 0;
    countSpan.innerText = newLikedState ? currentCount + 1 : currentCount - 1;
    
    iconSpan.style.transform = 'scale(1.2)';
    setTimeout(() => iconSpan.style.transform = 'scale(1)', 200);

    try {
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
        const res = await fetch(`${baseUrl}/api/posts/${postId}/like`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username})
        });
        const data = await res.json();
        
        if (data.success) {
            countSpan.innerText = data.total_likes;
        } else {
            iconSpan.classList.toggle('icon-liked', isCurrentlyLiked);
            iconSpan.innerText = isCurrentlyLiked ? '❤️' : '🤍';
            countSpan.innerText = currentCount;
        }
    } catch(e) {
        iconSpan.classList.toggle('icon-liked', isCurrentlyLiked);
        iconSpan.innerText = isCurrentlyLiked ? '❤️' : '🤍';
        countSpan.innerText = currentCount;
    }
};

UI.activeWorkoutType = null;
UI.workoutStartTime = null;
UI.workoutInterval = null;
UI.isWorkoutPaused = false;
UI.pausedTime = 0;

UI.startWorkoutTimer = function(type) {
    UI.activeWorkoutType = type;
    UI.workoutStartTime = Date.now();
    UI.isWorkoutPaused = false;
    UI.pausedTime = 0;
    
    document.getElementById('timer-title').innerText = `Active Session: ${type}`;
    document.getElementById('workout-clock').innerText = '00:00:00';
    document.getElementById('timer-pause-btn').innerText = 'Pause';
    document.getElementById('workout-timer-modal').classList.remove('hidden');
    
    if(UI.workoutInterval) clearInterval(UI.workoutInterval);
    UI.workoutInterval = setInterval(UI.updateWorkoutClock, 1000);
};

UI.updateWorkoutClock = function() {
    if(UI.isWorkoutPaused) return;
    
    const now = Date.now();
    let elapsed = now - UI.workoutStartTime;
    
    const h = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
    const m = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
    document.getElementById('workout-clock').innerText = `${h}:${m}:${s}`;
};

UI.toggleWorkoutTimer = function() {
    UI.isWorkoutPaused = !UI.isWorkoutPaused;
    const btn = document.getElementById('timer-pause-btn');
    if(UI.isWorkoutPaused) {
        btn.innerText = 'Resume';
        UI.pausedTime = Date.now();
    } else {
        btn.innerText = 'Pause';
        const pauseDuration = Date.now() - UI.pausedTime;
        UI.workoutStartTime += pauseDuration;
    }
};

UI.cancelWorkoutTimer = function() {
    if(confirm("Are you sure you want to cancel this workout?")) {
        clearInterval(UI.workoutInterval);
        document.getElementById('workout-timer-modal').classList.add('hidden');
    }
};

UI.finishWorkoutTimer = async function() {
    clearInterval(UI.workoutInterval);
    const durationStr = document.getElementById('workout-clock').innerText;
    
    const note = prompt("How was the workout? Add a quick note:");
    if (note === null) {
        UI.workoutInterval = setInterval(UI.updateWorkoutClock, 1000);
        return;
    }
    
    const username = localStorage.getItem('username') || 'Guest';
    let defaultImg = "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=500&auto=format&fit=crop"; 
    if (UI.activeWorkoutType === 'Cardio') {
        defaultImg = "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=500&auto=format&fit=crop";
    }
    
    const caption = `${note} - Completed a ${durationStr} ${UI.activeWorkoutType} workout! 🏆`;
    
    const formData = new FormData();
    formData.append('username', username);
    formData.append('caption', caption);
    formData.append('image_url', defaultImg);
    formData.append('is_close_friends', 'false');
    
    try {
        console.log("Workout logged. Share manually if desired.");
    } catch(e) {
        console.error("Error internally handling workout:", e);
    }
    
    document.getElementById('workout-timer-modal').classList.add('hidden');
    app.navTo('history');
};

window.getLocalISO = (dateObj) => {
    const offset = dateObj.getTimezoneOffset();
    dateObj = new Date(dateObj.getTime() - (offset*60*1000));
    return dateObj.toISOString().split('T')[0];
};

async function loadHistoryHeatmap() {
    const container = document.getElementById('heatmap-grid');
    if (!container) return;

    try {
        const workoutHistory = JSON.parse(localStorage.getItem('workout_history') || '[]');

        container.innerHTML = ''; 

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            const formattedDate = window.getLocalISO(d); 
            
            const square = document.createElement('div');
            square.className = 'heatmap-square';
            square.title = formattedDate;
            square.innerText = d.getDate();
            
            square.style.display = 'flex';
            square.style.alignItems = 'center';
            square.style.justifyContent = 'center';
            square.style.fontSize = '12px';
            square.style.fontWeight = 'bold';
            square.style.color = 'rgba(255, 255, 255, 0.6)';
            square.style.cursor = 'pointer';
            
            const hasWorkout = workoutHistory.some(w => w.date === formattedDate);
            if (hasWorkout) {
                square.classList.add('active-day');
                square.style.color = '#0b0f19';
            }

            square.onclick = async () => {
                // Visual Selection
                document.querySelectorAll('.heatmap-square').forEach(sq => {
                    sq.style.border = '';
                    sq.classList.remove('selected-day');
                });
                square.classList.add('selected-day');
                square.style.border = '2px solid #00D1FF';

                if (typeof window.fetchAndDisplayWorkoutDetails === 'function') {
                    window.fetchAndDisplayWorkoutDetails(formattedDate);
                }
            };

            container.appendChild(square);
        }
    } catch (error) {
        console.error("Heatmap Error:", error);
    }
}

window.fetchAndDisplayWorkoutDetails = async function(formattedDate) {
    const cardContainer = document.getElementById('history-summary-card');
    if (!cardContainer) return;

    cardContainer.innerHTML = '<div style="padding: 20px;"><div class="loader"></div><p class="text-sec" style="margin-top: 10px;">Loading details...</p></div>';

    try {
        const historyData = JSON.parse(localStorage.getItem('workout_history') || '[]');
        const daysWorkouts = historyData.filter(w => w.date === formattedDate);
        
        console.log("Checking history for:", formattedDate, "Found:", daysWorkouts);

        // Parse date for ui display
        const [y, m, dNumToken] = formattedDate.split('-');
        const d = new Date(Number(y), Number(m)-1, Number(dNumToken));
        const prettyDate = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric"});

        if (daysWorkouts.length > 0) {
            let exercisesHtml = '<ul style="list-style-type: none; padding-left: 0; margin-bottom: var(--space-md);">';
            
            daysWorkouts.forEach(workout => {
                if (workout.exercises && workout.exercises.length > 0) {
                    workout.exercises.forEach(ex => {
                        const dbEx = window.exerciseDB ? window.exerciseDB.find(e => e.name === ex.name) : null;
                        const isCardio = dbEx && dbEx.muscle && dbEx.muscle.toLowerCase() === 'cardio';
                        const wUnit = isCardio ? 'km/mi' : 'kg';
                        const rUnit = isCardio ? 'min' : 'reps';

                        let setHTML = '';
                        if (ex.setDetails && ex.setDetails.length > 0) {
                            const firstSet = ex.setDetails[0];
                            const allSame = ex.setDetails.every(s => s.weight === firstSet.weight && s.reps === firstSet.reps);

                            if (allSame) {
                                setHTML = `<span>${firstSet.weight}${wUnit} × ${firstSet.reps} ${rUnit}</span><span style="opacity: 0.5; margin-left: 8px;">(${ex.setDetails.length} sets)</span>`;
                            } else {
                                setHTML = ex.setDetails.map((s, i) => `<div style="margin-top: 2px;">Set ${i+1}: ${s.weight}${wUnit} × ${s.reps} ${rUnit}</div>`).join('');
                            }
                        } else {
                            setHTML = `<span>${ex.weight || 0}${wUnit} × ${ex.reps || 0} ${rUnit}</span><span style="opacity: 0.5; margin-left: 8px;">(${ex.sets || 0} sets)</span>`;
                        }

                        exercisesHtml += `<li style="padding: 10px; background: rgba(0, 209, 255, 0.05); margin-bottom: 8px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-cyan);">
                            <strong style="color: #FFF; font-size: 1.05rem;">${ex.name}</strong>
                            <div style="color: var(--text-silver); font-size: 0.9rem; margin-top: 4px;">
                                ${setHTML}
                            </div>
                        </li>`;
                    });
                }
            });
            exercisesHtml += '</ul>';
            
            const workoutCap = daysWorkouts.find(w => w.note || w.caption)?.note || daysWorkouts.find(w => w.note || w.caption)?.caption || 'No caption';
            
            cardContainer.innerHTML = `
                <div class="fade-in" style="width: 100%; text-align: left; padding: var(--space-lg);">
                    <span style="font-size: 0.8rem; color: var(--accent-cyan); text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">${prettyDate}</span>
                    <h3 class="text-highlight" style="font-size: 1.5rem; margin-top: 4px; margin-bottom: var(--space-md);">Completed Workout</h3>
                    ${exercisesHtml}
                    <div style="display: flex; gap: var(--space-md); margin-bottom: var(--space-md);">
                        <div style="background: rgba(0, 209, 255, 0.1); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid rgba(0, 209, 255, 0.3);">
                            <span style="display: block; font-size: 0.75rem; color: var(--accent-cyan);">Notes / Caption</span>
                            <strong style="color: #FFF; font-size: 0.9rem;">${workoutCap}</strong>
                        </div>
                    </div>
                    <button class="neon-btn btn-share-workout" style="width: 100%; margin-top: var(--space-sm);" onclick="window.initiateShare('${workoutCap.replace(/'/g, "\\'")}', event)">
                        Share to Squad 🚀
                    </button>
                </div>
            `;
        } else {
            cardContainer.innerHTML = `
                <div class="fade-in" style="width: 100%; text-align: center; padding: var(--space-xl);">
                    <span style="font-size: 0.8rem; color: var(--text-silver); text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">${prettyDate}</span>
                    <div style="font-size: 3rem; margin: 15px 0;">🛋️</div>
                    <h3 class="text-sec" style="font-size: 1.2rem; color: #FFF;">Rest Day</h3>
                    <p style="color: var(--text-dim); font-size: 0.9rem;">No workouts recorded.</p>
                </div>
            `;
        }
    } catch (e) {
        console.error("Failed parsing history:", e);
        cardContainer.innerHTML = `<p class="text-sec fade-in">Error loading data.</p>`;
    }
};

UI.shareWorkout = async function(e, summaryText) {
    const btn = e.currentTarget;
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Sharing...';

    const username = localStorage.getItem('username') || 'Guest';
    let sharedImage = 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=500&auto=format&fit=crop';
    
    let displayName = username;
    if (window.state && window.state.userProfile && window.state.userProfile.name) {
        displayName = window.state.userProfile.name;
    } else if (username.includes('@')) {
        displayName = username.split('@')[0];
    }

    const formData = new FormData();
    formData.append('username', displayName);
    formData.append('caption', summaryText);
    formData.append('image_url', sharedImage);
    formData.append('is_close_friends', 'false');

    const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';

    try {
        const res = await fetch(`${baseUrl}/api/posts`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if(data.success) {
            btn.innerHTML = 'Shared ✓';
            btn.style.background = 'rgba(46, 204, 113, 0.2)';
            btn.style.color = '#2ECC71';
            btn.style.borderColor = '#2ECC71';
            btn.style.boxShadow = 'none';
        } else {
            console.error("Share failed", data);
            btn.disabled = false;
            btn.innerHTML = originalText;
            alert("Failed to share workout.");
        }
    } catch(err) {
        console.error("Error sharing", err);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

window.currentActivePostId = null;
window.currentActiveCommentCountSpan = null;

UI.openComments = function(e, postId) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    window.currentActivePostId = postId;
    
    const countSpan = e.currentTarget.querySelector('span');
    if(countSpan) {
        window.currentActiveCommentCountSpan = countSpan;
    } else {
        window.currentActiveCommentCountSpan = null;
    }
    
    const modal = document.getElementById('comments-modal');
    if(!modal) return;
    
    const input = document.getElementById('comment-input');
    if(input) input.value = '';
    
    modal.classList.remove('hidden');
    UI.loadComments(postId);
};

UI.loadComments = async function(postId) {
    const list = document.getElementById('comments-list');
    if(!list) return;
    
    list.innerHTML = '<div style="text-align: center; color: #A0A0A0; padding: 20px;">Loading comments...</div>';
    
    try {
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
        const res = await fetch(`${baseUrl}/api/comments?post_id=${postId}`);
        const data = await res.json();
        
        if(data.success) {
            if(data.comments.length === 0) {
                list.innerHTML = '<div style="text-align: center; color: #A0A0A0; padding: 20px;">No comments yet. Be the first!</div>';
            } else {
                list.innerHTML = data.comments.map(c => `
                    <div style="background: rgba(255,255,255,0.02); padding: 10px 14px; border-radius: var(--radius-sm); border-left: 2px solid var(--accent-cyan);">
                        <div style="font-size: 0.8rem; color: var(--accent-cyan); margin-bottom: 4px; display: flex; justify-content: space-between;">
                            <strong>${c.username}</strong>
                            <span style="color: rgba(255,255,255,0.3);">${new Date(c.timestamp).toLocaleString()}</span>
                        </div>
                        <div style="color: #FFF; font-size: 0.95rem; line-height: 1.4;">${typeof UI.escapeHTML === 'function' ? UI.escapeHTML(c.comment_text) : c.comment_text}</div>
                    </div>
                `).join('');
                
                list.scrollTop = list.scrollHeight;
                
                if(window.currentActiveCommentCountSpan) {
                    window.currentActiveCommentCountSpan.innerText = data.comments.length;
                }
            }
        } else {
            list.innerHTML = '<div class="text-danger" style="padding: 20px;">Error loading comments.</div>';
        }
    } catch(err) {
        list.innerHTML = '<div class="text-danger" style="padding: 20px;">Network error.</div>';
        console.error(err);
    }
};

UI.postComment = async function() {
    const postId = window.currentActivePostId;
    if(!postId) return;
    
    const input = document.getElementById('new-comment-input');
    if(!input) return;
    
    const text = input.value.trim();
    if(text.length === 0) {
        alert("Comment cannot be empty!");
        return;
    }
    
    if(text.length > 250) {
        alert("Comment must be under 250 characters.");
        return;
    }
    
    const username = localStorage.getItem('username') || 'Guest';
    
    const btn = document.getElementById('submit-comment-btn');
    if(btn) btn.disabled = true;
    
    try {
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
        const res = await fetch(`${baseUrl}/api/comments/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                post_id: postId,
                username: username,
                comment_text: text
            })
        });
        
        const data = await res.json();
        if(data.success) {
            input.value = '';
            UI.loadComments(postId);
        } else {
            alert('Failed to post comment.');
        }
    } catch(err) {
        console.error(err);
        alert('Network error posting comment.');
    } finally {
        if(btn) btn.disabled = false;
    }
};
