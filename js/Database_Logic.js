// Database_Logic.js - Simulates Relational DB using localStorage

const DB_KEY = 'myfit_data';



const defaultSchema = {
    user: null, // { name, age, height, currentWeight, goalWeight, goalDate, gender, current_streak }
    waterIntake: 0, // Tracked in ML
    vault: [], // Exercises catalog
    strength_logs: [], // { id, date, exerciseId, sets: [{setNumber, weight, reps, volume}] }
    cardio_logs: [], // { id, date, exerciseId, duration, speed, distance, pace }
    cardio_logs: [], // { id, date, exerciseId, duration, speed, distance, pace }
    folders: [], // { id, name, exerciseIds: [] }
    workout_history: {}, // { "2026-03-15": {has_workout, total_volume, routine_name, exercises: [], notes} }
    customRoutines: [], // { id, name, exerciseIds: [] }
    routinePresets: [], // { id, name, description, exerciseIds: [] }
    squads: [] // { id, name, code, members: [] }
};

const state = {
    isSessionActive: false,
    squadTab: 'routines', // 'routines' or 'roster'
    currentSession: {
        mode: 'free', // 'free' or 'squad'
        routineId: null,
        routineQueue: [],
        currentIndex: 0,
        startTime: null,
        loggedExercises: [],
        totalVolume: 0
    }
};
window.state = state;

function logSet(exerciseId, weight, reps) {
    state.isSessionActive = true;
    
    const vol = weight * reps;
    
    state.currentSession.loggedExercises.push({
        exerciseId,
        weight,
        reps,
        volume: vol
    });
    
    state.currentSession.totalVolume += vol;
    
    const volumeBadge = document.getElementById('running-volume-badge');
    if (volumeBadge) {
        volumeBadge.innerText = `⚡ Total Volume: ${state.currentSession.totalVolume} kg`;
    }
    
    if (typeof UI !== 'undefined') {
        if (UI.updateHistoryTable) UI.updateHistoryTable(exerciseId);
        if (UI.renderActiveSessionBar) UI.renderActiveSessionBar();
    }
}
window.logSet = logSet;

const DB = {
    init() {
        if (!localStorage.getItem(DB_KEY)) {
            localStorage.setItem(DB_KEY, JSON.stringify(defaultSchema));
            this.seedVault(); 
        } else {
             // Handle migration logic if a user updates their app
             const data = this.get();
             if(data.vault.length < 40) {
                 this.seedVault(); // Force seed new vault structure if old one exists
             }
             if(!data.routinePresets || data.routinePresets.length === 0) {
                 this.seedPresets();
             }
             if(Array.isArray(data.workout_history)) {
                 data.workout_history = {}; // Migrate flat array to object map
                 this.save(data);
             }
        }
        this.seedDummySquads();
        this.seedHistoryData();
    },
    
    seedDummySquads() {
        const data = this.get();
        if (!data.squads || data.squads.length === 0) {
            data.squads = [
                { id: 'squad_mock1', name: 'Iron Titans', code: 'IRN001', members: ['John'], weekly_volume: 45000 },
                { id: 'squad_mock2', name: 'Cyber Lifters', code: 'CYB999', members: ['Alice', 'Bob'], weekly_volume: 38500 },
                { id: 'squad_mock3', name: 'Neon Crushers', code: 'NEO333', members: ['Charlie'], weekly_volume: 27000 },
                { id: 'squad_mock4', name: 'Midnight Movers', code: 'MID777', members: ['Dave', 'Eve'], weekly_volume: 15400 }
            ];
            this.save(data);
        }
    },
    
    seedHistoryData() {
        const data = this.get();
        if (Object.keys(data.workout_history || {}).length === 0) {
            data.workout_history = {};
            
            // Helper to subtract days from today
            const getPastDateString = (daysAgo) => {
                const d = new Date();
                d.setDate(d.getDate() - daysAgo);
                return d.toISOString().split('T')[0];
            };

            // Seed 5 arbitrary days
            data.workout_history[getPastDateString(1)] = {
                has_workout: true,
                total_volume: 12500,
                routine_name: "Push Day Alpha",
                exercises: ["Flat Bench Press", "Incline Dumbbell Press", "Overhead Press"],
                notes: "Felt strong on the bench today. Upped the weight by 2.5kg."
            };
            
            data.workout_history[getPastDateString(3)] = {
                has_workout: true,
                total_volume: 18200,
                routine_name: "Heavy Legs",
                exercises: ["Back Squat", "Romanian Deadlift", "Leg Press"],
                notes: "Squats felt deep and controlled. Cardio was tough afterwards."
            };
            
            data.workout_history[getPastDateString(4)] = {
                has_workout: true,
                total_volume: 14000,
                routine_name: "Pull Day Beta",
                exercises: ["Deadlift", "Pull-ups", "Bent-over Rows"],
                notes: ""
            };
            
            data.workout_history[getPastDateString(7)] = {
                has_workout: true,
                total_volume: 8500,
                routine_name: "Core & Mobility",
                exercises: ["Plank", "Russian Twists", "Cable Crunches"],
                notes: "Light active recovery day."
            };
            
            data.workout_history[getPastDateString(10)] = {
                has_workout: true,
                total_volume: 15400,
                routine_name: "Full Body Spartan",
                exercises: ["Flat Bench Press", "Deadlift", "Back Squat"],
                notes: "Pr'd on the deadlift! 140kg x 3."
            };

            this.save(data);
        }
    },
    
    get() {
        return JSON.parse(localStorage.getItem(DB_KEY));
    },

    async getExerciseHistoryAsync(exerciseName) {
        try {
            const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
            const req = await fetch(`${baseUrl}/api/workouts/history`);
            const res = await req.json();
            const historyList = res.history || [];

            const grouped = {};
            const data = this.get();
            const exercise = data.vault.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
            if (!exercise) return [];
            const exId = exercise.id;

            historyList.forEach(session => {
                const date = session.date;
                if (!grouped[date]) {
                    grouped[date] = { date: date, max_volume: 0, estimated_1rm: 0 };
                }

                const relevantSets = (session.logs || []).filter(l => l.exerciseId === exId);
                
                if (relevantSets.length > 0) {
                    let sessionVolume = 0;
                    let sessionMax1RM = 0;
                    
                    relevantSets.forEach(set => {
                        sessionVolume += (set.weight * set.reps);
                        const oneRM = Math.round(set.weight * (1 + (set.reps / 30)));
                        if (oneRM > sessionMax1RM) sessionMax1RM = oneRM;
                    });
                    
                    grouped[date].max_volume += sessionVolume;
                    if (sessionMax1RM > grouped[date].estimated_1rm) {
                        grouped[date].estimated_1rm = sessionMax1RM;
                    }
                } else {
                    delete grouped[date];
                }
            });

            return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
        } catch (e) {
            console.error("Failed to fetch exercise history from API:", e);
            return [];
        }
    },
    
    save(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    },

    getUser() {
        return this.get().user;
    },

    saveUser(userObj) {
        if (typeof window.auth !== 'undefined' && !window.auth.currentUser) return; // The Clear & Kill Protocol
        const data = this.get();
        if (userObj && userObj.current_streak === undefined) {
            userObj.current_streak = 0;
        }
        data.user = userObj;
        this.save(data);
    },

    calculateUserStreak() {
        const data = this.get();
        const history = data.workout_history || {};
        
        const workoutDates = Object.keys(history)
            .filter(dateStr => history[dateStr].has_workout)
            .sort((a, b) => new Date(b) - new Date(a));
            
        if (workoutDates.length === 0) return 0;

        const getStartOfDay = (dateValue) => {
            const d = new Date(dateValue);
            d.setHours(0, 0, 0, 0);
            return d;
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const mostRecentDate = getStartOfDay(workoutDates[0]);
        
        const diffInTime = Math.abs(today - mostRecentDate);
        const diffInDays = Math.round(diffInTime / (1000 * 60 * 60 * 24));

        if (diffInDays > 1) {
            return 0;
        }

        let currentStreak = 1;

        for (let i = 0; i < workoutDates.length - 1; i++) {
            const current = getStartOfDay(workoutDates[i]);
            const prev = getStartOfDay(workoutDates[i + 1]);
            
            const gapTime = Math.abs(current - prev);
            const gapDays = Math.round(gapTime / (1000 * 60 * 60 * 24));
            
            if (gapDays === 1) {
                currentStreak++;
            } else if (gapDays > 1) {
                break;
            }
        }
        
        return currentStreak;
    },

    seedVault() {
        const data = this.get();
        // 50 Elite Exercises
        data.vault = [
            // Chest
            { id: '1', name: 'Flat Bench Press', category: 'Barbell', target: 'Chest', trainerCue: 'Keep shoulder blades retracted and feet planted.', type: 'strength' },
            { id: '2', name: 'Incline Dumbbell Press', category: 'Dumbbell', target: 'Upper Chest', trainerCue: 'Focus on a 45-degree angle for upper chest activation.', type: 'strength' },
            { id: '3', name: 'Decline Bench Press', category: 'Barbell', target: 'Lower Chest', trainerCue: 'Keep elbows tucked at a 45-degree angle.', type: 'strength' },
            { id: '4', name: 'Dumbbell Flyes', category: 'Dumbbell', target: 'Chest', trainerCue: 'Maintain a slight bend in your elbows and focus on the stretch.', type: 'strength' },
            { id: '5', name: 'Cable Crossover', category: 'Cable', target: 'Chest', trainerCue: 'Squeeze your chest at the peak of the contraction.', type: 'strength' },
            { id: '6', name: 'Push-ups', category: 'Bodyweight', target: 'Chest', trainerCue: 'Keep your core braced and body in a straight line.', type: 'strength' },
            { id: '7', name: 'Pec Deck Machine', category: 'Machine', target: 'Chest', trainerCue: 'Keep your back flat against the pad and squeeze at the center.', type: 'strength' },
            { id: '8', name: 'Weighted Dips', category: 'Bodyweight', target: 'Lower Chest', trainerCue: 'Lean forward slightly to target the chest over triceps.', type: 'strength' },

            // Back
            { id: '9', name: 'Deadlift', category: 'Barbell', target: 'Back', trainerCue: 'Keep the bar close to your shins throughout the lift.', type: 'strength' },
            { id: '10', name: 'Pull-ups', category: 'Bodyweight', target: 'Back', trainerCue: 'Pull your elbows toward your hips for maximum lat engagement.', type: 'strength' },
            { id: '11', name: 'Bent-over Rows', category: 'Barbell', target: 'Back', trainerCue: 'Pull toward your belly button, keeping a flat back.', type: 'strength' },
            { id: '12', name: 'Lat Pulldown', category: 'Cable', target: 'Lats', trainerCue: 'Pull the bar to your upper chest; control the eccentric phase.', type: 'strength' },
            { id: '13', name: 'Seated Cable Row', category: 'Cable', target: 'Mid Back', trainerCue: 'Squeeze your shoulder blades together; do not use momentum.', type: 'strength' },
            { id: '14', name: 'T-Bar Row', category: 'Machine', target: 'Back', trainerCue: 'Keep your chest supported and pull with your elbows.', type: 'strength' },
            { id: '15', name: 'Single-arm Dumbbell Row', category: 'Dumbbell', target: 'Lats', trainerCue: 'Keep your back parallel to the floor; pull to your hip.', type: 'strength' },
            { id: '16', name: 'Face Pulls', category: 'Cable', target: 'Rear Delts', trainerCue: 'Pull toward your forehead and rotate your thumbs back.', type: 'strength' },

            // Legs
            { id: '17', name: 'Back Squat', category: 'Barbell', target: 'Quads', trainerCue: 'Drive through your heels and keep your chest upright.', type: 'strength' },
            { id: '18', name: 'Front Squat', category: 'Barbell', target: 'Quads', trainerCue: 'Keep your elbows high and torso vertical.', type: 'strength' },
            { id: '19', name: 'Romanian Deadlift', category: 'Barbell', target: 'Hamstrings', trainerCue: 'Hinge at the hips until you feel a stretch in your hamstrings.', type: 'strength' },
            { id: '20', name: 'Leg Press', category: 'Machine', target: 'Quads', trainerCue: 'Don\'t lock your knees at the top of the movement.', type: 'strength' },
            { id: '21', name: 'Bulgarian Split Squat', category: 'Dumbbell', target: 'Quads', trainerCue: 'Keep your front foot far enough forward to protect the knee.', type: 'strength' },
            { id: '22', name: 'Leg Extensions', category: 'Machine', target: 'Quads', trainerCue: 'Squeeze at the top and control the weight down.', type: 'strength' },
            { id: '23', name: 'Lying Leg Curls', category: 'Machine', target: 'Hamstrings', trainerCue: 'Keep your hips pressed against the pad.', type: 'strength' },
            { id: '24', name: 'Walking Lunges', category: 'Dumbbell', target: 'Glutes/Quads', trainerCue: 'Take long strides to target glutes, short for quads.', type: 'strength' },
            { id: '25', name: 'Standing Calf Raises', category: 'Machine', target: 'Calves', trainerCue: 'Pause at the top for a full contraction.', type: 'strength' },

            // Shoulders
            { id: '26', name: 'Overhead Press', category: 'Barbell', target: 'Shoulders', trainerCue: 'Brace your core to prevent lower back arching.', type: 'strength' },
            { id: '27', name: 'Seated Dumbbell Press', category: 'Dumbbell', target: 'Shoulders', trainerCue: 'Lower the dumbbells to ear level; do not lock out elbows.', type: 'strength' },
            { id: '28', name: 'Lateral Raises', category: 'Dumbbell', target: 'Side Delts', trainerCue: 'Lead with your elbows, not your hands.', type: 'strength' },
            { id: '29', name: 'Cable Lateral Raises', category: 'Cable', target: 'Side Delts', trainerCue: 'Keep constant tension on the muscle throughout the movement.', type: 'strength' },
            { id: '30', name: 'Reverse Pec Deck', category: 'Machine', target: 'Rear Delts', trainerCue: 'Keep a slight bend in your elbows and focus on rear delts.', type: 'strength' },
            { id: '31', name: 'Arnorld Press', category: 'Dumbbell', target: 'Shoulders', trainerCue: 'Rotate the dumbbells as you press upward.', type: 'strength' },

            // Arms (Biceps & Triceps)
            { id: '32', name: 'Barbell Curl', category: 'Barbell', target: 'Biceps', trainerCue: 'Keep elbows pinned to your sides; do not swing.', type: 'strength' },
            { id: '33', name: 'Hammer Curls', category: 'Dumbbell', target: 'Biceps/Brachialis', trainerCue: 'Keep your wrists neutral and squeeze at the top.', type: 'strength' },
            { id: '34', name: 'Preacher Curl', category: 'Machine', target: 'Biceps', trainerCue: 'Fully extend the arm at the bottom for maximum stretch.', type: 'strength' },
            { id: '35', name: 'Incline Dumbbell Curl', category: 'Dumbbell', target: 'Biceps', trainerCue: 'Let your arms hang straight down behind your torso.', type: 'strength' },
            { id: '36', name: 'Triceps Rope Pushdown', category: 'Cable', target: 'Triceps', trainerCue: 'Pull the rope apart at the bottom of the movement.', type: 'strength' },
            { id: '37', name: 'Skull Crushers', category: 'Barbell', target: 'Triceps', trainerCue: 'Keep elbows fixed; lower bar to forehead slowly.', type: 'strength' },
            { id: '38', name: 'Overhead Tricep Extension', category: 'Dumbbell', target: 'Triceps', trainerCue: 'Keep elbows pointing up and close to your head.', type: 'strength' },
            { id: '39', name: 'Close-Grip Bench Press', category: 'Barbell', target: 'Triceps', trainerCue: 'Keep elbows tucked close to your body.', type: 'strength' },

            // Core
            { id: '40', name: 'Crunches', category: 'Bodyweight', target: 'Core', trainerCue: 'Focus on contracting the abs, not pulling the neck.', type: 'strength' },
            { id: '41', name: 'Hanging Leg Raises', category: 'Bodyweight', target: 'Lower Core', trainerCue: 'Control the descent to prevent swinging.', type: 'strength' },
            { id: '42', name: 'Plank', category: 'Bodyweight', target: 'Core', trainerCue: 'Keep your body in a straight line from head to heels.', type: 'strength' },
            { id: '43', name: 'Cable Crunches', category: 'Cable', target: 'Core', trainerCue: 'Round your back to fully contract the abs.', type: 'strength' },
            { id: '44', name: 'Russian Twists', category: 'Bodyweight', target: 'Obliques', trainerCue: 'Rotate your torso, not just your arms.', type: 'strength' },
            { id: '45', name: 'Ab Wheel Rollout', category: 'Equipment', target: 'Core', trainerCue: 'Do not let your lower back sag; keep core tight.', type: 'strength' },

            // Cardio
            { id: '46', name: 'Treadmill Run', category: 'Cardio', target: 'Endurance', trainerCue: 'Maintain a steady cadence and land mid-foot.', type: 'cardio' },
            { id: '47', name: 'Cycling', category: 'Cardio', target: 'Endurance', trainerCue: 'Adjust the seat height so your leg is almost straight at the bottom.', type: 'cardio' },
            { id: '48', name: 'Rowing Machine', category: 'Cardio', target: 'Endurance', trainerCue: 'Drive with your legs first, then pull with your arms.', type: 'cardio' },
            { id: '49', name: 'Jump Rope', category: 'Cardio', target: 'Endurance', trainerCue: 'Stay on the balls of your feet and use small wrist circles.', type: 'cardio' },
            { id: '50', name: 'Stair Climber', category: 'Cardio', target: 'Endurance', trainerCue: 'Don\'t lean on the handrails; keep your posture vertical.', type: 'cardio' }
        ];
        this.save(data);
    },

    loadExercises(jsonArray) {
        const data = this.get();
        if (Array.isArray(jsonArray)) {
            data.vault = jsonArray.map(ex => ({
                id: ex.id,
                name: ex.name,
                type: ex.type || 'Strength',
                equipment: ex.equipment || 'Bodyweight',
                target_muscle: ex.target_muscle || 'Full Body',
                trainer_tip: ex.trainer_tip || '',
                media_url: ex.media_url || '',
                media_type: ex.media_type || ''
            }));
            this.save(data);
        }
    },

    seedPresets() {
        const data = this.get();
        data.routinePresets = [
            {
                id: 'preset_1',
                name: 'Beginner Full Body',
                description: 'A balanced routine targeting all major muscle groups.',
                category: 'Beginner',
                exerciseIds: ['17', '1', '11', '26', '32', '42'] // Squat, Bench, Rows, OHP, Curls, Plank
            },
            {
                id: 'preset_2',
                name: 'Dumbbell Only Push',
                description: 'Chest, shoulders, and triceps using only dumbbells.',
                category: 'Beginner',
                exerciseIds: ['2', '27', '28', '4', '38'] // Incline DB, Seated DB, Lat Raise, Flyes, Overhead DB
            },
            {
                id: 'preset_3',
                name: 'Core Starter',
                description: 'Quick core activation for strength and stability.',
                category: 'Beginner',
                exerciseIds: ['40', '42', '44', '41'] // Crunches, Plank, Russian Twists, Hanging Leg Raises
            }
        ];
        this.save(data);
    },

    createNewRoutine(name) {
        const data = this.get();
        if(!data.customRoutines) data.customRoutines = [];
        data.customRoutines.push({
            id: 'routine_' + Date.now().toString(),
            name: name,
            exerciseIds: []
        });
        this.save(data);
    },

    addExerciseToRoutine(routineId, exerciseId) {
        const data = this.get();
        if(!data.customRoutines) return;
        const routine = data.customRoutines.find(r => r.id === routineId);
        if(routine && !routine.exerciseIds.includes(exerciseId)) {
            routine.exerciseIds.push(exerciseId);
            this.save(data);
        }
    },

    clonePresetToCustom(presetId) {
        const data = this.get();
        const preset = (data.routinePresets || []).find(p => p.id === presetId);
        if (!preset) return null;

        if (!data.customRoutines) data.customRoutines = [];
        const newId = 'routine_' + Date.now().toString();
        
        data.customRoutines.push({
            id: newId,
            name: `Custom: ${preset.name}`,
            description: `Cloned from ${preset.name}`,
            exerciseIds: [...preset.exerciseIds]
        });
        
        this.save(data);
        return newId;
    },

    removeExerciseFromRoutine(routineId, index) {
        const data = this.get();
        if(!data.customRoutines) return;
        const routine = data.customRoutines.find(r => r.id === routineId);
        if(routine && routine.exerciseIds.length > index) {
            routine.exerciseIds.splice(index, 1);
            this.save(data);
        }
    },

    reorderRoutineExercise(routineId, fromIndex, toIndex) {
        const data = this.get();
        if(!data.customRoutines) return;
        const routine = data.customRoutines.find(r => r.id === routineId);
        if(routine) {
            const arr = routine.exerciseIds;
            if (fromIndex >= 0 && fromIndex < arr.length && toIndex >= 0 && toIndex < arr.length) {
                const element = arr[fromIndex];
                arr.splice(fromIndex, 1);
                arr.splice(toIndex, 0, element);
                this.save(data);
            }
        }
    },

    deleteRoutine(routineId) {
        const data = this.get();
        if(!data.customRoutines) return;
        data.customRoutines = data.customRoutines.filter(r => r.id !== routineId);
        this.save(data);
    },

    async loadUserRoutineAsync() {
        const username = localStorage.getItem('username');
        if (!username) return null;
        try {
            const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
            const req = await fetch(`${baseUrl}/api/routines?username=${encodeURIComponent(username)}`);
            const res = await req.json();
            if (res.success && res.routine) {
                if(!window.state) window.state = {};
                if(!window.state.userProfile) window.state.userProfile = {};
                window.state.userProfile.routine = res.routine.schedule;
                return res.routine.schedule;
            }
        } catch(e) {
            console.error("Error loading routine:", e);
        }
        return null;
    },

    async saveUserRoutineAsync(routineArray) {
        const username = localStorage.getItem('username');
        if (!username) return false;
        try {
            const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
            const req = await fetch(`${baseUrl}/api/routines`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    routine_name: 'My Auto-Coach Program',
                    schedule: routineArray
                })
            });
            const res = await req.json();
            return res.success;
        } catch(e) {
            console.error("Error saving routine:", e);
            return false;
        }
    },

    getSquad(squadId) {
        const data = this.get();
        return (data.squads || []).find(s => s.id === squadId);
    },

    async createSquad(name) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/squads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ squad_name: name })
            });
            const result = await response.json();
            
            if (result.success) {
                const data = this.get();
                if(!data.squads) data.squads = [];
                
                const newSquad = {
                    id: result.squad_id.toString(), // Store local mapping
                    name: name,
                    code: result.invite_code,
                    members: [data.user ? data.user.name : 'Athlete']
                };
                
                data.squads.push(newSquad);
                if(!data.user) data.user = {};
                data.user.squadId = newSquad.id;
                
                this.save(data);
                return newSquad;
            } else {
                console.error("Failed to create squad on backend", result.error);
                return null;
            }
        } catch (e) {
            console.error("Network error creating squad", e);
            return null;
        }
    },

    async joinSquad(code) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/squads/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ invite_code: code })
            });
            const result = await response.json();
            
            if(result.success) {
                const data = this.get();
                if(!data.squads) data.squads = [];
                
                // Locally mock the squad attachment
                const squad = data.squads.find(s => s.id === result.squad_id.toString() || s.code.toUpperCase() === code.toUpperCase());
                let localSquadId = result.squad_id.toString();
                
                if(squad) {
                    if(!data.user) data.user = { name: 'Athlete' };
                    if(!squad.members.includes(data.user.name)) {
                        squad.members.push(data.user.name);
                    }
                    localSquadId = squad.id;
                } else {
                    // Create a dummy local representation if joining a squad not in mock DB yet
                    const importedSquad = {
                        id: localSquadId,
                        name: result.squad_name || 'Joined Squad',
                        code: code.toUpperCase(),
                        members: [(data.user && data.user.name) ? data.user.name : 'Athlete']
                    };
                    data.squads.push(importedSquad);
                }
                
                if(!data.user) data.user = {};
                data.user.squadId = localSquadId;
                this.save(data);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Network error joining squad", e);
            return false;
        }
    },
    
    logoutUser() {
        // Clear all persistent DB items
        localStorage.removeItem(DB_KEY);
        // Optionally, reset the state variable locally
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
        window.activeSession = window.state.currentSession;
        // Trigger generic app reload logic if attached
        if(typeof location !== 'undefined') location.reload();
    }
};

DB.init();
