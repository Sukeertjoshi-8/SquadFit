window.generateRoutine = function(params, exerciseDB) {
    if (!params) return [];
    if (!exerciseDB) exerciseDB = window.exerciseDB || [];

    // Step 1: Equipment Filter
    let validEquipment = ['Bodyweight']; // Default safe
    
    if (params.equipment === 'Full Commercial Gym') {
        validEquipment = ['Barbell', 'Dumbbell', 'Bodyweight', 'Cable', 'Machine', 'Kettlebell'];
    } else if (params.equipment === 'Dumbbells & Benches Only') {
        validEquipment = ['Dumbbell', 'Bodyweight'];
    }

    let filteredDB = exerciseDB.filter(ex => {
        let equipmentMatch = true;
        if (ex.equipment) {
            equipmentMatch = validEquipment.some(eq => ex.equipment.toLowerCase().includes(eq.toLowerCase()));
        }
        return equipmentMatch;
    });

    // Level Filtering
    if (params.experience === 'Beginner') {
        filteredDB = filteredDB.filter(ex => ex.level === 'Beginner');
    } else if (params.experience === 'Intermediate') {
        filteredDB = filteredDB.filter(ex => ex.level === 'Beginner' || ex.level === 'Intermediate');
    }
    
    // Baseline Capability checks
    const userProfile = window.state ? window.state.userProfile : {};
    const canPushup = userProfile.can_pushup === 1 || userProfile.can_pushup === '1' || userProfile.can_pushup === true || userProfile.can_pushup === 'true';
    const canPullup = userProfile.can_pullup === 1 || userProfile.can_pullup === '1' || userProfile.can_pullup === true || userProfile.can_pullup === 'true';

    if (!canPushup) {
        filteredDB = filteredDB.filter(ex => !['Push-Up', 'Incline Push-Up', 'Decline Push-Up', 'Plyometric Push-Up'].includes(ex.name));
    }
    if (!canPullup) {
        filteredDB = filteredDB.filter(ex => !['Pull-Up', 'Chin-Up', 'Weighted Pull-Up'].includes(ex.name));
    }

    if (filteredDB.length < 5) filteredDB = exerciseDB; // Extreme Fallback

    // Step 2: Parameter Setter
    let targetReps = "8-12";
    let targetSets = 3;
    let includeCardio = false;

    if (params.goal === 'Maximize Strength') {
        targetReps = "4-6";
        targetSets = 4;
    } else if (params.goal === 'Build Muscle (Hypertrophy)') {
        targetReps = "8-12";
        targetSets = 3;
    } else if (params.goal === 'Lose Weight/Fat') {
        targetReps = "12-15";
        targetSets = 3;
        includeCardio = true;
    } else if (params.goal === 'General Fitness') {
        targetReps = "10-12";
        targetSets = 3;
        includeCardio = true;
    }

    // Determine volume based on experience
    let baseExerciseCount = 5;
    if (params.experience === 'Beginner') baseExerciseCount = 4;
    if (params.experience === 'Advanced') baseExerciseCount = 6;

    // Helper functions
    const getExercisesByMuscle = (muscles, count) => {
        let pool = filteredDB.filter(ex => {
            if (!ex.muscle) return false;
            return muscles.some(m => ex.muscle.toLowerCase().includes(m.toLowerCase()));
        });
        
        let selected = [];
        let poolCopy = [...pool];

        for(let i=0; i<count; i++){
            if(poolCopy.length === 0) {
                // Fallback: Out of safe exercises. Duplicate a selected one and append a variation note.
                if (selected.length > 0) {
                    const fallbackEx = selected[Math.floor(Math.random() * selected.length)];
                    const variations = ["(Slow Eccentric)", "(Pause at Bottom)", "(1.5 Reps)", "(Speed Reps)"];
                    const variant = variations[Math.floor(Math.random() * variations.length)];
                    selected.push({ ...fallbackEx, id: fallbackEx.id + '_var_' + i, name: fallbackEx.name + ' ' + variant });
                } else {
                    // Extreme fallback (if pool was completely empty from the start)
                    if (filteredDB.length > 0) {
                        const randomEx = filteredDB[Math.floor(Math.random() * filteredDB.length)];
                        selected.push(randomEx);
                    }
                }
                continue;
            }
            const idx = Math.floor(Math.random() * poolCopy.length);
            selected.push(poolCopy[idx]);
            poolCopy.splice(idx, 1);
        }
        return selected;
    };

    const appendCardio = (workoutArray) => {
        if (includeCardio && validEquipment.includes('Bodyweight')) { // Try to find bodyweight cardio/core 
            const cardioEx = exerciseDB.filter(ex => ex.muscle && ex.muscle.toLowerCase() === 'cardio');
            if (cardioEx.length > 0) {
                workoutArray.push(cardioEx[Math.floor(Math.random() * cardioEx.length)]);
            } else {
                // Fallback core
                const coreEx = getExercisesByMuscle(['core'], 1);
                if (coreEx.length) workoutArray.push(coreEx[0]);
            }
        }
    };

    const formatDay = (name, exercises) => {
        appendCardio(exercises);
        return {
            dayName: name,
            exercises: exercises.map(ex => ({
                id: ex.id,
                name: ex.name,
                muscle: ex.muscle,
                equipment: ex.equipment,
                targetReps: targetReps,
                targetSets: targetSets
            }))
        };
    };

    // Step 3: Architecture mapping
    const freq = parseInt(params.frequency) || 3;
    let schedule = [];

    if (freq === 4) {
        // Upper / Lower / Upper / Lower
        const upperA = getExercisesByMuscle(['chest', 'back', 'shoulder'], baseExerciseCount);
        const lowerA = getExercisesByMuscle(['legs', 'calves', 'glutes', 'core'], baseExerciseCount);
        const upperB = getExercisesByMuscle(['back', 'chest', 'biceps', 'triceps'], baseExerciseCount);
        const lowerB = getExercisesByMuscle(['legs', 'core'], baseExerciseCount);

        const workoutDays = [
            formatDay('Upper Body A', upperA),
            formatDay('Lower Body A', lowerA),
            formatDay('Upper Body B', upperB),
            formatDay('Lower Body B', lowerB)
        ];
        // 4 Days: Workouts on 1, 2, 4, 5
        schedule = [workoutDays[0], workoutDays[1], null, workoutDays[2], workoutDays[3], null, null];
    } else if (freq === 5) {
        // Bro Split
        const chestEx = getExercisesByMuscle(['chest', 'triceps'], baseExerciseCount);
        const backEx = getExercisesByMuscle(['back', 'biceps'], baseExerciseCount);
        const legsEx = getExercisesByMuscle(['legs', 'calves'], baseExerciseCount);
        const shoulderEx = getExercisesByMuscle(['shoulder', 'core'], baseExerciseCount);
        const armEx = getExercisesByMuscle(['biceps', 'triceps', 'forearms'], baseExerciseCount);
        
        const workoutDays = [
            formatDay('Chest Focus', chestEx),
            formatDay('Back Focus', backEx),
            formatDay('Leg Day', legsEx),
            formatDay('Shoulders & Core', shoulderEx),
            formatDay('Arm Day', armEx)
        ];
        // 5 Days: Workouts on 1-5
        schedule = [workoutDays[0], workoutDays[1], workoutDays[2], workoutDays[3], workoutDays[4], null, null];
    } else {
        // Fallback for 3 days
        const pushEx = getExercisesByMuscle(['chest', 'shoulder', 'triceps'], baseExerciseCount);
        const pullEx = getExercisesByMuscle(['back', 'biceps'], baseExerciseCount);
        const legsEx = getExercisesByMuscle(['legs', 'core'], baseExerciseCount);
        
        const workoutDays = [
            formatDay('Push', pushEx),
            formatDay('Pull', pullEx),
            formatDay('Legs & Core', legsEx)
        ];
        // 3 Days: Workouts on 1, 3, 5
        schedule = [workoutDays[0], null, workoutDays[1], null, workoutDays[2], null, null];
    }

    // Map the 7-day schedule to actual dates starting from today
    const calendar = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateString = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        
        const dayData = schedule[i];
        if (dayData) {
            calendar.push({
                type: 'workout',
                date: dateString,
                dayName: dayData.dayName,
                exercises: dayData.exercises
            });
        } else {
            calendar.push({
                type: 'rest',
                date: dateString,
                dayName: 'Rest & Recover'
            });
        }
    }

    return calendar;
};
