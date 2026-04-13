// Database_Logic.js - Simulates Relational DB using localStorage

const DB_KEY = 'myfit_data';

const defaultSchema = {
    user: null, // { name, age, height, currentWeight, goalWeight, goalDate, gender }
    waterIntake: 0, // Tracked in ML
    vault: [], // Exercises catalog
    strength_logs: [], // { id, date, exerciseId, sets: [{setNumber, weight, reps, volume}] }
    cardio_logs: [], // { id, date, exerciseId, duration, speed, distance, pace }
    folders: [], // { id, name, exerciseIds: [] }
    workout_history: [],
    customRoutines: [] // { id, name, exerciseIds: [] }
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
            this.seedVault(); // This should be called to populate initial DB state if empty
        } else {
             // Handle migration logic if a user updates their app
             const data = this.get();
             if(data.vault.length < 15) {
                 this.seedVault(); // Force seed new vault structure if old one exists
             }
        }
    },
    
    get() {
        return JSON.parse(localStorage.getItem(DB_KEY));
    },
    
    save(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    },

    getUser() {
        return this.get().user;
    },

    saveUser(userObj) {
        const data = this.get();
        data.user = userObj;
        this.save(data);
    },

    seedVault() {
        const data = this.get();
        // 20 Elite Exercises
        data.vault = [
            // Push (5)
            { id: '1', name: 'Flat Bench Press', category: 'Barbell', target: 'Chest', trainerCue: 'Keep shoulder blades retracted and feet planted.', type: 'strength' },
            { id: '2', name: 'Overhead Press', category: 'Barbell', target: 'Shoulders', trainerCue: 'Brace your core to prevent lower back arching.', type: 'strength' },
            { id: '3', name: 'Incline Dumbbell Press', category: 'Dumbbell', target: 'Upper Chest', trainerCue: 'Focus on a 45-degree angle for upper chest activation.', type: 'strength' },
            { id: '4', name: 'Lateral Raises', category: 'Dumbbell', target: 'Shoulders', trainerCue: 'Lead with your elbows, not your hands.', type: 'strength' },
            { id: '5', name: 'Skull Crushers', category: 'Barbell', target: 'Triceps', trainerCue: 'Keep elbows fixed; lower bar to forehead slowly.', type: 'strength' },
            
            // Pull (5)
            { id: '6', name: 'Deadlift', category: 'Barbell', target: 'Back', trainerCue: 'Keep the bar close to your shins throughout the lift.', type: 'strength' },
            { id: '7', name: 'Pull-ups', category: 'Bodyweight', target: 'Back', trainerCue: 'Pull your elbows toward your hips for maximum lat engagement.', type: 'strength' },
            { id: '8', name: 'Bent-over Rows', category: 'Barbell', target: 'Back', trainerCue: 'Pull toward your belly button, keeping a flat back.', type: 'strength' },
            { id: '9', name: 'Face Pulls', category: 'Cable', target: 'Shoulders', trainerCue: 'Pull toward your forehead and rotate your thumbs back.', type: 'strength' },
            { id: '10', name: 'Hammer Curls', category: 'Dumbbell', target: 'Biceps', trainerCue: 'Keep your wrists neutral and don\'t swing your shoulders.', type: 'strength' },

            // Legs (5)
            { id: '11', name: 'Back Squat', category: 'Barbell', target: 'Quads', trainerCue: 'Drive through your heels and keep your chest upright.', type: 'strength' },
            { id: '12', name: 'Romanian Deadlift', category: 'Dumbbell', target: 'Hamstrings', trainerCue: 'Hinge at the hips until you feel a stretch in your hamstrings.', type: 'strength' },
            { id: '13', name: 'Leg Press', category: 'Machine', target: 'Quads', trainerCue: 'Don\'t lock your knees at the top of the movement.', type: 'strength' },
            { id: '14', name: 'Bulgarian Split Squat', category: 'Dumbbell', target: 'Quads', trainerCue: 'Keep your front foot far enough forward to protect the knee.', type: 'strength' },
            { id: '15', name: 'Calf Raises', category: 'Bodyweight', target: 'Calves', trainerCue: 'Pause at the top for a full contraction.', type: 'strength' },

            // Cardio (5)
            { id: '16', name: 'Treadmill Run', category: 'Cardio', target: 'Endurance', trainerCue: 'Maintain a steady cadence and land mid-foot.', type: 'cardio' },
            { id: '17', name: 'Cycling', category: 'Cardio', target: 'Endurance', trainerCue: 'Adjust the seat height so your leg is almost straight at the bottom.', type: 'cardio' },
            { id: '18', name: 'Rowing Machine', category: 'Cardio', target: 'Endurance', trainerCue: 'Drive with your legs first, then pull with your arms.', type: 'cardio' },
            { id: '19', name: 'Jump Rope', category: 'Cardio', target: 'Endurance', trainerCue: 'Stay on the balls of your feet and use small wrist circles.', type: 'cardio' },
            { id: '20', name: 'Stair Climber', category: 'Cardio', target: 'Endurance', trainerCue: 'Don\'t lean on the handrails; keep your posture vertical.', type: 'cardio' }
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

    deleteRoutine(routineId) {
        const data = this.get();
        if(!data.customRoutines) return;
        data.customRoutines = data.customRoutines.filter(r => r.id !== routineId);
        this.save(data);
    }
};

DB.init();
