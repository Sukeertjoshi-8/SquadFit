// UI_Components.js - Handles DOM rendering and events

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

    renderView(viewName) {
        this.container.innerHTML = ''; // Clear container
        window.scrollTo(0, 0);
        
        switch(viewName) {
            case 'auth':
                this.nav.classList.add('hidden');
                this.container.innerHTML = this.templates.auth();
                break;
            case 'activeWorkout':
                this.nav.classList.add('hidden');
                this.container.innerHTML = this.templates.activeWorkout(window.currentExerciseId);
                if (window.state && window.state.currentSession) {
                    this.updateHistoryTable(window.currentExerciseId);
                }
                break;
            case 'dashboard':
                this.nav.classList.remove('hidden');
                this.container.innerHTML = this.templates.dashboard();
                break;
            case 'onboarding':
                this.nav.classList.add('hidden');
                this.container.innerHTML = this.templates.onboarding();
                setTimeout(() => this.bindBMILogic(), 100);
                break;
            case 'vault':
                this.nav.classList.remove('hidden');
                this.container.innerHTML = this.templates.vault();
                break;
            case 'log':
                this.nav.classList.add('hidden');
                this.container.innerHTML = this.templates.logSession(window.currentExerciseId);
                break;
            case 'folders':
                this.nav.classList.remove('hidden');
                this.container.innerHTML = this.templates.folders();
                break;
            case 'leaderboard':
                this.nav.classList.remove('hidden');
                this.container.innerHTML = this.templates.leaderboard();
                
                // Top 10% Alert Check
                const db = DB.get();
                const v = Leaderboard.getWeeklyVolume(db.strength_logs);
                const board = Leaderboard.getSimulatedLeaderboard(v, 'volume');
                if(v > 0 && Leaderboard.checkTop10Percent(board)) {
                    setTimeout(() => alert("🏅 You're out-lifting the competition! Keep that momentum!"), 500);
                }
                break;
            case 'postWorkout':
                this.nav.classList.add('hidden');
                this.container.innerHTML = this.templates.postWorkout();
                this.initPostWorkoutChart();
                break;
            case 'profile':
                this.nav.classList.remove('hidden');
                this.container.innerHTML = this.templates.profile();
                setTimeout(() => this.bindProfileLogic(), 100);
                break;
            default:
                this.container.innerHTML = `<h1>Feature coming soon!</h1>`;
        }

        this.renderActiveSessionBar();
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
                bottom: 0px;
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
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.02); border-left: 2px solid var(--accent-cyan); border-radius: 4px;">
                <span style="font-weight: bold; color: var(--text-primary);">✓ Set ${index + 1}</span>
                <span class="text-sec" style="font-size: 1.1rem; color: var(--text-white);">${log.weight}kg × ${log.reps}</span>
            </div>
        `).join('');
    },

    templates: {
        activeWorkout: (exId) => {
            const exercises = DB.get().vault;
            const ex = exercises.find(e => e.id === exId);
            if(!ex) return '<h1>Error</h1>';

            const mode = window.state.currentSession.mode;
            let timerColor = 'var(--text-primary)';
            let timerLabel = '';
            let progressDots = '';
            let bottomButton = `
                <button id="back-to-vault-btn" class="secondary-btn" style="width: 100%; border: 1px solid var(--text-silver); color: var(--text-silver); height: 50px; font-size: 1.1rem; border-radius: var(--radius-md);" onclick="app.navTo('vault')">
                    ← Back to Vault
                </button>
            `;

            if (mode === 'squad') {
                timerColor = '#FF5F1F';
                timerLabel = '<div style="color: #FF5F1F; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Sync Clock</div>';
                
                const routine = DB.get().customRoutines.find(r => r.id === window.state.currentSession.routineId);
                if(routine) {
                    const totalEx = routine.exerciseIds.length;
                    const remainingEx = window.state.currentSession.routineQueue.length;
                    const currentIndex = totalEx - remainingEx - 1;
                    
                    let dotsHTML = '';
                    for(let i=0; i<totalEx; i++) {
                        if(i === currentIndex) {
                            dotsHTML += '<div style="width: 12px; height: 12px; border-radius: 50%; background: #00D1FF; box-shadow: 0 0 8px #00D1FF;"></div>';
                        } else if(i < currentIndex) {
                            dotsHTML += '<div style="width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.4);"></div>';
                        } else {
                            dotsHTML += '<div style="width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.1);"></div>';
                        }
                    }
                    progressDots = `<div style="display: flex; gap: 8px; justify-content: center; margin-bottom: var(--space-md);">${dotsHTML}</div>`;
                    
                    if (remainingEx > 0) {
                         const nextExId = window.state.currentSession.routineQueue[0];
                         const nextExName = exercises.find(e => e.id === nextExId)?.name || 'Next';
                         bottomButton = `
                            <button id="next-exercise-btn" class="neon-btn" style="background: transparent; border: 1px solid #00D1FF; color: #00D1FF; width: 100%; height: 50px; font-size: 1.1rem; border-radius: var(--radius-md);" onclick="app.nextRoutineExercise()">
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
                }
            }

            return `
            <div class="active-workout-wrapper fade-in" style="min-height: 100vh; padding-bottom: 120px;">
                <header style="margin-bottom: var(--space-lg); display: flex; flex-direction: column; align-items: center; text-align: center;">
                    ${progressDots}
                    <h2 class="text-highlight" style="font-size: 2rem; margin-bottom: var(--space-sm);">${ex.name}</h2>
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
                </div>

                <div class="history-table glass-panel" style="padding: var(--space-md); background: transparent; border: 1px solid rgba(255,255,255,0.05); max-height: 250px; overflow-y: auto;">
                    <h3 class="text-sec" style="font-size: 1rem; margin-bottom: var(--space-sm); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">Exercise History</h3>
                    <div id="active-history-list" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Sets will be injected here -->
                    </div>
                </div>
                
                ${mode === 'squad' ? `
                <div style="margin-top: var(--space-lg); padding: var(--space-md);">
                    <h3 class="text-sec" style="font-size: 1rem; margin-bottom: var(--space-sm);">Upcoming Queue</h3>
                    <ul id="upcoming-queue-list" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-sm);">
                        ${(function() {
                            const queue = window.state.currentSession.routineQueue;
                            const idx = window.state.currentSession.currentIndex;
                            const upcoming = queue.slice(idx + 1);
                            
                            if (upcoming.length === 0) {
                                return '<li style="color: var(--text-dim); text-align: center; font-size: 0.9rem; padding: var(--space-sm);">Routine Complete</li>';
                            }
                            
                            return upcoming.map((uId, i) => {
                                const listIndex = idx + 1 + i;
                                const uEx = exercises.find(e => e.id === uId);
                                if(!uEx) return '';
                                
                                let htmlStr = '';
                                htmlStr += '<li draggable="true" ondragstart="event.dataTransfer.setData(' + "'text/plain'" + ', ' + listIndex + ')" ondragover="event.preventDefault(); this.style.borderColor=' + "'#FF5F1F'" + ';" ondragleave="this.style.borderColor=' + "'rgba(255,255,255,0.1)'" + ';" ondrop="event.preventDefault(); this.style.borderColor=' + "'rgba(255,255,255,0.1)'" + '; app.reorderQueue(parseInt(event.dataTransfer.getData(' + "'text/plain'" + ')), ' + listIndex + ');" style="padding: var(--space-md); background: #161B22; border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; cursor: grab; transition: border-color 0.2s;">';
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
            const exercises = DB.get().vault;
            // Get current filter from state or assume 'all'
            const currentFilter = window.vaultFilter || 'All';
            
            const filteredEx = exercises.filter(ex => {
                if(currentFilter === 'All') return true;
                if(currentFilter === 'Cardio' && ex.type === 'cardio') return true;
                if(currentFilter === 'Strength' && ex.type === 'strength') return true;
                return ex.category.toLowerCase() === currentFilter.toLowerCase();
            });
            
            // Generate list items
            const exerciseHTML = filteredEx.map(ex => `
                <div class="glass-panel" style="margin-bottom: var(--space-md); overflow: hidden; background: var(--bg-card);">
                    <!-- Media Placeholder -->
                    <div style="width: 100%; height: 160px; background: rgba(5,7,10,0.8); display: flex; align-items: center; justify-content: center; position: relative;">
                        <span class="text-sec" style="font-size: 2rem;">▶</span>
                        <div class="glass-panel" style="position: absolute; bottom: 8px; right: 8px; padding: 4px 8px; font-size: 0.7rem; color: var(--text-main); backdrop-filter: blur(4px);">
                            ${ex.category}
                        </div>
                    </div>
                    
                    <div style="padding: var(--space-md);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-sm);">
                            <h3 style="margin: 0;">${ex.name}</h3>
                            <span style="font-size: 0.75rem; color: var(--accent-primary); border: 1px solid var(--accent-primary); padding: 2px 6px; border-radius: var(--radius-sm);">${ex.target}</span>
                        </div>
                        
                        <div style="background: rgba(255, 255, 255, 0.02); border-left: 2px solid var(--accent-primary); padding: var(--space-sm); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; margin-bottom: var(--space-md);">
                            <strong style="font-size: 0.8rem; color: var(--accent-primary); display: block; margin-bottom: 2px;">Trainer's Corner</strong>
                            <p class="text-sec" style="font-size: 0.85rem; font-style: italic;">"${ex.trainerCue}"</p>
                        </div>
                        <button class="secondary-btn" style="width: 100%; border: 1px solid var(--accent-primary); color: var(--accent-primary);" onclick="app.navToLog('${ex.id}')">
                            Log Session ➔
                        </button>
                    </div>
                </div>
            `).join('');

            return `
            <div class="vault-wrapper fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: var(--space-lg);">
                    <h2 class="text-highlight">The Vault</h2>
                    <p class="text-sec">Universal Exercise Library</p>
                </header>
                
                <div style="display: flex; gap: var(--space-sm); overflow-x: auto; padding-bottom: var(--space-sm); margin-bottom: var(--space-md); scrollbar-width: none;">
                    <button class="glass-panel ${currentFilter === 'All' ? 'active-filter' : ''}" style="padding: 6px 16px; border-color: ${currentFilter === 'All' ? 'var(--electric-volt)' : ''}; white-space: nowrap; color: ${currentFilter === 'All' ? 'var(--electric-volt)' : 'var(--text-primary)'};" onclick="app.setVaultFilter('All')">All</button>
                    <button class="glass-panel ${currentFilter === 'Strength' ? 'active-filter' : ''}" style="padding: 6px 16px; border-color: ${currentFilter === 'Strength' ? 'var(--electric-volt)' : ''}; white-space: nowrap; color: ${currentFilter === 'Strength' ? 'var(--electric-volt)' : 'var(--text-primary)'};" onclick="app.setVaultFilter('Strength')">Strength</button>
                    <button class="glass-panel ${currentFilter === 'Cardio' ? 'active-filter' : ''}" style="padding: 6px 16px; border-color: ${currentFilter === 'Cardio' ? 'var(--electric-volt)' : ''}; white-space: nowrap; color: ${currentFilter === 'Cardio' ? 'var(--electric-volt)' : 'var(--text-primary)'};" onclick="app.setVaultFilter('Cardio')">Cardio</button>
                    <button class="glass-panel ${currentFilter === 'Barbell' ? 'active-filter' : ''}" style="padding: 6px 16px; border-color: ${currentFilter === 'Barbell' ? 'var(--electric-volt)' : ''}; white-space: nowrap; color: ${currentFilter === 'Barbell' ? 'var(--electric-volt)' : 'var(--text-primary)'};" onclick="app.setVaultFilter('Barbell')">Barbell</button>
                </div>
                
                <div class="exercise-list">
                    ${exerciseHTML}
                </div>
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
        leaderboard: () => {
            const db = DB.get();
            const volume = Leaderboard.getWeeklyVolume(db.strength_logs);
            const cardio = Leaderboard.getWeeklyCardioDistance(db.cardio_logs);

            const volBoard = Leaderboard.getSimulatedLeaderboard(volume, 'volume');
            const cardBoard = Leaderboard.getSimulatedLeaderboard(cardio, 'distance');

            const renderBoard = (items, unit) => items.map(b => `
                <div class="glass-panel" style="margin-bottom: var(--space-sm); padding: var(--space-md); display: flex; align-items: center; justify-content: space-between; border-color: ${b.isUser ? 'var(--accent-primary)' : 'var(--border-subtle)'}; background: ${b.isUser ? 'rgba(0, 209, 255, 0.05)' : 'transparent'};">
                    <div style="display: flex; align-items: center; gap: var(--space-md);">
                        <strong style="font-size: 1.2rem; min-width: 24px; color: ${b.isUser ? 'var(--accent-primary)' : 'var(--text-main)'};">#${b.rank}</strong>
                        <span>${b.name}</span>
                    </div>
                    <strong>${b.score.toLocaleString()} <span style="font-size: 0.75rem; color: var(--text-dim);">${unit}</span></strong>
                </div>
            `).join('');

            return `
            <div class="arena-wrapper fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: var(--space-lg); text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: var(--space-sm);">🏆</div>
                    <h2 class="text-highlight" style="font-size: 2.2rem;">The Iron Arena</h2>
                    <p class="text-sec">Global Performance Leaderboard</p>
                </header>

                <h3 style="margin-bottom: var(--space-md); color: var(--text-primary);">Strength <span class="text-sec" style="font-size:0.9rem">(Weekly Vol)</span></h3>
                <div style="margin-bottom: var(--space-xl);">
                    ${renderBoard(volBoard, 'KG')}
                </div>

                <h3 style="margin-bottom: var(--space-md); color: var(--text-primary);">Endurance <span class="text-sec" style="font-size:0.9rem">(Weekly Dist)</span></h3>
                <div>
                    ${renderBoard(cardBoard, 'KM')}
                </div>
            </div>
            `;
        },
        folders: () => {
            const currentTab = window.state.squadTab || 'routines';
            let mainContent = '';

            // Sub-nav Toggle
            const toggleHTML = `
                <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-md); background: rgba(255,255,255,0.05); padding: 4px; border-radius: var(--radius-md); backdrop-filter: blur(10px);">
                    <button style="flex: 1; padding: 10px; border-radius: 4px; border: none; font-weight: bold; cursor: pointer; transition: 0.3s; background: ${currentTab === 'routines' ? 'rgba(0, 209, 255, 0.2)' : 'transparent'}; color: ${currentTab === 'routines' ? '#00D1FF' : '#A0A0A0'}; box-shadow: ${currentTab === 'routines' ? '0 0 10px rgba(0, 209, 255, 0.1)' : 'none'};" onclick="window.state.squadTab='routines'; app.navTo('folders');">My Routines</button>
                    <button style="flex: 1; padding: 10px; border-radius: 4px; border: none; font-weight: bold; cursor: pointer; transition: 0.3s; background: ${currentTab === 'roster' ? 'rgba(255, 95, 31, 0.2)' : 'transparent'}; color: ${currentTab === 'roster' ? '#FF5F1F' : '#A0A0A0'}; box-shadow: ${currentTab === 'roster' ? '0 0 10px rgba(255, 95, 31, 0.1)' : 'none'};" onclick="window.state.squadTab='roster'; app.navTo('folders');">The Roster</button>
                </div>
            `;

            if (currentTab === 'routines') {
                const routines = DB.get().customRoutines || [];
                const vault = DB.get().vault || [];

                if (routines.length === 0) {
                    mainContent = `
                        <div style="text-align: center; margin-top: 40px; padding: var(--space-xl);">
                            <p style="color: #A0A0A0; font-size: 1.1rem; margin-bottom: var(--space-lg);">No routines yet. Build your first custom workout!</p>
                            <button class="neon-btn" style="background: transparent; color: #00D1FF; border: 1px solid #00D1FF; max-width: 250px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0, 209, 255, 0.2);" onclick="app.promptCreateRoutine()">
                                + Create New Routine
                            </button>
                        </div>
                    `;
                } else {
                    mainContent = routines.map(r => {
                        const exList = r.exerciseIds.map(id => vault.find(v => v.id === id)).filter(Boolean);
                        return `
                        <div class="glass-panel" style="margin-bottom: var(--space-md); padding: var(--space-md); background: #161B22; border-color: rgba(255,255,255,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: var(--space-sm);">
                                <h3 style="margin: 0; color: #FFFFFF; font-size: 1.3rem;">${r.name}</h3>
                                <div style="display: flex; gap: 8px;">
                                    <button style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #A0A0A0; border-radius: 4px; padding: 4px 8px; font-size: 0.85rem; cursor: pointer; backdrop-filter: blur(10px);" onclick="app.shareRoutine('${r.id}')">🔗 Share</button>
                                    <button style="background: none; border: none; color: #A0A0A0; font-size: 1.2rem; cursor: pointer;" onclick="if(confirm('Delete Routine?')) { DB.deleteRoutine('${r.id}'); UI.renderView('folders'); }">🗑️</button>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: var(--space-md);">
                                <p style="color: #A0A0A0; font-size: 0.9rem; margin-bottom: 4px;">Exercises: ${exList.length}</p>
                                ${exList.length > 0 ? 
                                    `<p style="color: #FFFFFF; font-size: 0.95rem; line-height: 1.4;">${exList.map(e => e.name).join('<span style="color:#A0A0A0;"> • </span>')}</p>` 
                                    : '<p style="color: #A0A0A0; font-style: italic;">Empty routine</p>'
                                }
                            </div>
                            
                            <div style="display: flex; gap: var(--space-sm);">
                                <button class="secondary-btn" style="flex: 1; border: 1px solid rgba(255,255,255,0.2); color: #FFFFFF;" onclick="app.promptAddExercise('${r.id}')">
                                    + Add
                                </button>
                                <button class="neon-btn" style="flex: 2; ${exList.length === 0 ? 'opacity: 0.5; pointer-events: none;' : ''}" onclick="app.startRoutine('${r.id}')">
                                    ▶ Start
                                </button>
                            </div>
                        </div>
                        `;
                    }).join('');
                    
                    mainContent = `
                        <div style="margin-bottom: var(--space-md); text-align: right;">
                            <button class="neon-btn" style="background: transparent; color: #00D1FF; border: 1px solid #00D1FF; padding: 8px 16px; font-size: 0.9rem; box-shadow: none;" onclick="app.promptCreateRoutine()">
                                + New Routine
                            </button>
                        </div>
                        ${mainContent}
                    `;
                }
            } else {
                // Roster Mock List
                const roster = [
                    { name: 'Alex K.', status: 'Active 2h ago', avatar: '#00D1FF' },
                    { name: 'Sarah O.', status: 'Weekly Vol: 45,000kg', avatar: '#FF5F1F' },
                    { name: 'David M.', status: 'Active 1d ago', avatar: '#A0A0A0' }
                ];
                const db = DB.get();
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                let myVol = 0;
                if(db && db.strength_logs) {
                    db.strength_logs.forEach(l => {
                        if (new Date(l.date) >= oneWeekAgo) {
                            myVol += l.sets.reduce((sum, s) => sum + (s.volume || 0), 0);
                        }
                    });
                }
                
                mainContent = `
                    <div style="margin-bottom: var(--space-md); display: flex; justify-content: flex-end;">
                        <button class="neon-btn" style="background: transparent; color: #FF5F1F; border: 1px solid #FF5F1F; padding: 8px 16px; font-size: 0.9rem; box-shadow: 0 0 10px rgba(255, 95, 31, 0.2);" onclick="app.inviteToRoster()">
                            + Invite to Roster
                        </button>
                    </div>

                    <div class="glass-panel" style="margin-bottom: var(--space-md); padding: var(--space-md); background: rgba(0, 209, 255, 0.05); border-color: var(--accent-cyan); display: flex; align-items: center; justify-content: space-between;">
                         <div>
                             <h3 style="margin: 0; color: #FFFFFF; font-size: 1.1rem;">My Squad Volume</h3>
                             <p style="color: #A0A0A0; font-size: 0.85rem;">Last 7 Days</p>
                         </div>
                         <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-cyan);">
                             ${myVol.toLocaleString()} kg
                         </div>
                    </div>
                `;
                
                mainContent += roster.map(f => `
                    <div class="glass-panel" style="margin-bottom: var(--space-sm); padding: var(--space-md); background: #161B22; border-color: rgba(255,255,255,0.05); display: flex; align-items: center; gap: var(--space-md);">
                        <div style="width: 45px; height: 45px; border-radius: 50%; background: ${f.avatar}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #05070A; font-size: 1.2rem; box-shadow: 0 0 10px ${f.avatar}40;">
                            ${f.name.charAt(0)}
                        </div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0; color: #FFFFFF; font-size: 1.1rem; margin-bottom: 4px;">${f.name}</h4>
                            <p style="color: #A0A0A0; font-size: 0.85rem;">${f.status}</p>
                        </div>
                        <button style="background: rgba(255,255,255,0.1); border: none; color: #FFFFFF; border-radius: 50%; width: 35px; height: 35px; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            ⋯
                        </button>
                    </div>
                `).join('');
            }

            return `
            <div class="folders-wrapper fade-in" style="padding-bottom: 120px;">
                <header style="margin-bottom: var(--space-md);">
                    <h2 class="text-highlight" style="color: #FFFFFF; font-size: 2.2rem; margin-bottom: 4px;">Squad Sync</h2>
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
            const user = DB.getUser() || {};
            
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
                <header style="margin-bottom: var(--space-lg);">
                    <h2 class="text-highlight">Profile & Settings</h2>
                </header>
                
                ${bmiStatusHTML}

                <div class="glass-panel" style="padding: var(--space-lg);">
                    <div style="display: flex; justify-content: center; margin-bottom: var(--space-lg);">
                       <div style="width: 80px; height: 80px; border-radius: 50%; border: 2px dashed rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer;" onclick="alert('Module: Uploading to LocalStorage placeholder.')">
                            Tap to Upload
                       </div>
                    </div>

                    <label class="text-sec" style="font-size: 0.8rem; margin-bottom: 4px; display: block;">Full Name</label>
                    <input type="text" id="prof-name" value="${user.name || ''}" style="color: #fff;">
                    
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
                            <input type="number" id="prof-current-weight" value="${user.currentWeight || ''}" style="color: #fff;">
                        </div>
                        <div style="flex: 1;">
                            <label class="text-sec" style="font-size: 0.8rem; margin-bottom: 4px; display: block;">Target Wt (kg)</label>
                            <input type="number" id="prof-goal-weight" value="${user.goalWeight || ''}" style="color: #fff;">
                        </div>
                    </div>
                    
                    <label class="text-sec" style="font-size: 0.8rem; margin-bottom: 4px; display: block;">Goal Target Date</label>
                    <input type="date" id="prof-goal-date" value="${user.goalDate || ''}" style="color: #fff;">
                    
                    ${psychMessage}
                    
                    <button class="neon-btn" onclick="app.saveProfile()" style="margin-top: var(--space-md); width: 100%;">
                        Save Profile
                    </button>
                </div>
            </div>
            `;
        },
        auth: () => `
            <div class="auth-wrapper" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; text-align: center;">
                <div style="margin-bottom: var(--space-xl);">
                    <h1 class="text-highlight" style="font-size: 3rem;">SquadFit</h1>
                    <p class="text-sec">The Ultimate Iron Arena.</p>
                </div>
                <button class="neon-btn" onclick="app.simulateLogin()" style="margin-bottom: var(--space-md);">
                    <span style="font-size: 1.2rem;">⚡</span>
                    Continue with Supabase
                </button>
            </div>
        `,
        onboarding: () => `
            <div class="onboarding-wrapper fade-in">
                <h2 style="margin-bottom: var(--space-lg);">Build Your Profile</h2>
                <div class="glass-panel" style="padding: var(--space-lg);">
                    <input type="text" id="ob-name" placeholder="Full Name">
                    <select id="ob-gender">
                        <option value="" disabled selected>Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                    <input type="number" id="ob-height" placeholder="Height (cm)">
                    <div style="display: flex; gap: var(--space-md);">
                        <input type="number" id="ob-curr-weight" placeholder="Current Wt (kg)">
                        <input type="number" id="ob-goal-weight" placeholder="Target Wt (kg)">
                    </div>
                    
                    <p id="bmi-insight" class="text-sec" style="font-size: 0.85rem; margin-bottom: var(--space-md); min-height: 40px;"></p>

                    <label class="text-sec" style="font-size: 0.8rem; margin-bottom: 4px; display: block;">Goal Target Date</label>
                    <input type="date" id="ob-goal-date">
                    <button class="neon-btn" onclick="app.completeOnboarding()" style="margin-top: var(--space-md);">
                        Lock In
                    </button>
                </div>
            </div>
        `,
        dashboard: () => {
            const user = DB.getUser() || { name: 'Athlete', currentWeight: 80, goalWeight: 75, goalDate: new Date().toISOString() };
            
            // Goal Logic
            const now = new Date();
            const gDate = new Date(user.goalDate || now);
            const diffTime = gDate - now;
            const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            const kgToGoal = Math.abs(user.goalWeight - user.currentWeight);
            const weeksToDate = diffDays / 7;
            const weeklyRate = weeksToDate > 0 ? (kgToGoal / weeksToDate).toFixed(2) : 0;
            const isGaining = user.goalWeight > user.currentWeight;

            // Simple progress sim (assumes starting weight was +/- 5kg, purely visual for now)
            const progressPct = 65; // Simulated 65% progress toward goal
            const offset = 283 - (283 * progressPct) / 100;

            const dbData = DB.get();
            const hydrationGoal = dbData.dailyWaterGoal || 3000;
            const hasLogs = (dbData.strength_logs.length + dbData.cardio_logs.length) > 0;
            const dismissed = localStorage.getItem('tipBoxDismissed');

            let launchpadHTML = '';
            if(!hasLogs && !dismissed) {
                launchpadHTML = `
                <div id="launchpad-box" class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-lg); border-color: var(--accent-cyan); position: relative;">
                    <div style="position: absolute; top: var(--space-sm); right: var(--space-md); font-size: 1.2rem; color: var(--text-silver); cursor: pointer;" onclick="app.dismissLaunchpad()">✕</div>
                    <h3 style="margin-bottom: var(--space-sm); color: var(--accent-cyan) !important;">Welcome! Let's get you set up:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: var(--space-sm);">
                            <a href="#" style="color: var(--text-white); text-decoration: none; display: flex; align-items: center; gap: var(--space-sm);" onclick="app.navTo('profile'); return false;">
                                <span style="font-size: 1.2rem;">📸</span> Update your profile photo
                            </a>
                        </li>
                        <li style="margin-bottom: var(--space-sm);">
                            <a href="#" style="color: var(--text-white); text-decoration: none; display: flex; align-items: center; gap: var(--space-sm);" onclick="app.setHydrationGoal(); return false;">
                                <span style="font-size: 1.2rem;">💧</span> Set a daily hydration goal
                            </a>
                        </li>
                        <li>
                            <a href="#" style="color: var(--text-white); text-decoration: none; display: flex; align-items: center; gap: var(--space-sm);" onclick="app.navTo('vault'); return false;">
                                <span style="font-size: 1.2rem;">🏋️</span> Set workout preferences
                            </a>
                        </li>
                    </ul>
                </div>
                `;
            }

            return `
            <div class="dashboard-wrapper fade-in" style="padding-bottom: 80px; display: flex; flex-direction: column; gap: 20px; align-items: center; width: 100%;">
                <header style="width: 100%; max-width: 500px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p class="text-sec">Welcome back,</p>
                        <h2 class="text-highlight" id="dash-name" style="color: var(--accent-cyan); text-shadow: 0 0 10px var(--accent-cyan);">${user.name}</h2>
                    </div>
                    <div class="avatar-placeholder" style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-midnight); border: 2px solid var(--accent-cyan); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; color: var(--accent-cyan); text-shadow: 0 0 10px var(--accent-cyan); cursor: pointer; box-shadow: 0 0 15px rgba(0, 209, 255, 0.4);" onclick="app.navTo('profile')">
                        ${user.name ? user.name.charAt(0) : 'S'}
                    </div>
                </header>
                
                ${launchpadHTML}

                <div class="glass-panel" style="padding: var(--space-lg); width: 100%; max-width: 500px; display: flex; flex-direction: column; align-items: center;">
                    <h3 style="align-self: flex-start; margin-bottom: var(--space-md);">Goal Calendar</h3>
                    
                    <div class="progress-ring-container" style="position: relative; max-width: 200px; max-height: 200px; width: 100%; aspect-ratio: 1; margin: 0 auto;">
                        <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8"></circle>
                            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-primary)" stroke-width="8" stroke-dasharray="283" stroke-dashoffset="${offset}" stroke-linecap="round" style="transition: stroke-dashoffset 1s ease-in-out;"></circle>
                        </svg>
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                            <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); line-height: 1;">${diffDays}</div>
                            <div class="text-sec" style="font-size: 0.75rem;">Days Left</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; width: 100%; margin-top: var(--space-md); border-top: 1px solid rgba(255,255,255,0.05); padding-top: var(--space-md);">
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 1.2rem; font-weight: 700;">${kgToGoal} <span style="font-size: 0.8rem; color: var(--text-secondary);">kg</span></div>
                            <div class="text-sec" style="font-size: 0.75rem;">To ${isGaining ? 'Gain' : 'Lose'}</div>
                        </div>
                        <div style="text-align: center; flex: 1; border-left: 1px solid rgba(255,255,255,0.05);">
                            <div style="font-size: 1.2rem; font-weight: 700;">${weeklyRate} <span style="font-size: 0.8rem; color: var(--text-secondary);">kg/w</span></div>
                            <div class="text-sec" style="font-size: 0.75rem;">Req. Rate</div>
                        </div>
                    </div>
                </div>

                <div class="glass-panel" style="padding: var(--space-md); width: 100%; max-width: 500px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-white) !important;" onclick="app.setHydrationGoal()">Hydration Zone</h3>
                        </div>
                        <span class="text-highlight" id="hydration-txt" style="font-weight: bold;">${dbData.waterIntake || 0} / ${hydrationGoal} ml</span>
                    </div>
                    <div style="width: 100%; height: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden; margin-bottom: var(--space-md);">
                        <div id="hydration-bar-fill" style="height: 100%; width: ${Math.min(100, ((dbData.waterIntake || 0)/hydrationGoal)*100)}%; background: var(--accent-cyan); border-radius: 5px; box-shadow: 0 0 15px var(--accent-cyan); transition: width 1s ease-out;"></div>
                    </div>
                    
                    <div class="horizontal-scroll" style="display: flex; gap: var(--space-md); padding-bottom: 8px; flex-wrap: nowrap;">
                        <!-- -250ml Empty Glass -->
                        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; min-width: 60px;" onclick="app.updateWater(-250, this)">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 4px; filter: drop-shadow(0 0 5px rgba(0,209,255,0.4));">
                                <path d="M6 2L8 22H16L18 2H6Z"></path>
                            </svg>
                            <span style="font-size: 0.75rem; color: var(--text-silver);">-250</span>
                        </div>
                        
                        <!-- +250ml Glass -->
                        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; min-width: 60px;" onclick="app.updateWater(250, this)">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 4px; filter: drop-shadow(0 0 5px rgba(0,209,255,0.8));">
                                <path d="M6 2L8 22H16L18 2H6Z"></path>
                                <path d="M6.5 7H17.5" stroke="var(--accent-cyan)"></path>
                                <path d="M7 12H17" stroke="var(--accent-cyan)"></path>
                            </svg>
                            <span style="font-size: 0.75rem; color: var(--text-silver);">+250</span>
                        </div>

                        <!-- +500ml Mug -->
                        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; min-width: 60px;" onclick="app.updateWater(500, this)">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 4px; filter: drop-shadow(0 0 5px rgba(0,209,255,0.8));">
                                <path d="M16 4H4V20H16V4Z"></path>
                                <path d="M16 8H19C19.5523 8 20 8.44772 20 9V15C20 15.5523 19.5523 16 19 16H16"></path>
                                <path d="M4 12H16"></path>
                            </svg>
                            <span style="font-size: 0.75rem; color: var(--text-silver);">+500</span>
                        </div>

                        <!-- +750ml Bottle -->
                        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; min-width: 60px;" onclick="app.updateWater(750, this)">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 4px; filter: drop-shadow(0 0 5px rgba(0,209,255,0.8));">
                                <path d="M10 2H14V5L16 7V22H8V7L10 5V2Z"></path>
                                <path d="M8 12H16"></path>
                                <path d="M8 17H16"></path>
                            </svg>
                            <span style="font-size: 0.75rem; color: var(--text-silver);">+750</span>
                        </div>

                        <!-- +1000ml Sport -->
                        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; min-width: 60px;" onclick="app.updateWater(1000, this)">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 4px; filter: drop-shadow(0 0 5px rgba(0,209,255,0.8));">
                                <path d="M9 2H15V4H9V2Z"></path>
                                <path d="M12 4V7"></path>
                                <path d="M7 7H17V22H7V7Z"></path>
                                <path d="M7 11H17"></path>
                                <path d="M7 16H17"></path>
                            </svg>
                            <span style="font-size: 0.75rem; color: var(--text-silver);">+1000</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: var(--space-sm); align-items: center; margin-top: var(--space-sm);">
                        <input type="number" id="custom-water" placeholder="Manual input (ml)..." style="margin: 0; padding: 6px 12px; font-size: 0.85rem; border: none; border-bottom: 1px solid rgba(255,255,255,0.2); border-radius: 0; background: transparent; flex: 1; color: var(--text-white);">
                        <button class="secondary-btn" style="padding: 6px 16px; font-size: 0.85rem; color: var(--accent-cyan); border-color: var(--accent-cyan);" onclick="const val = document.getElementById('custom-water').value; if(val>0) { app.updateWater(Number(val)); document.getElementById('custom-water').value=''; }">Add</button>
                    </div>
                </div>

                <div style="width: 100%; max-width: 500px;">
                    <h3 style="margin-bottom: var(--space-md);">Quick Start</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                        <button class="glass-panel" style="padding: var(--space-lg); text-align: center; border: 1px solid rgba(255, 255, 255, 0.1) !important; background: var(--bg-card) !important;" onclick="app.navTo('vault'); app.setVaultFilter('Strength')">
                            <div style="font-size: 2rem; margin-bottom: var(--space-sm); color: var(--text-white);">🏋️</div>
                            <strong style="color: var(--text-white);">Strength</strong>
                        </button>
                        <button class="glass-panel" style="padding: var(--space-lg); text-align: center; border: 1px solid rgba(255, 255, 255, 0.1) !important; background: var(--bg-card) !important;" onclick="app.navTo('vault'); app.setVaultFilter('Cardio')">
                            <div style="font-size: 2rem; margin-bottom: var(--space-sm); color: var(--text-white);">🏃</div>
                            <strong style="color: var(--text-white);">Cardio</strong>
                        </button>
                    </div>
                </div>
            </div>
            `;
        }
    }
};
