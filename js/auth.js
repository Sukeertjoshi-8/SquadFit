import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBu5XnvFm3dBXcJqeG6cd8QHmFx-RQq1sU",
    authDomain: "squadfit-89582.firebaseapp.com",
    projectId: "squadfit-89582",
    storageBucket: "squadfit-89582.firebasestorage.app",
    messagingSenderId: "24215069019",
    appId: "1:24215069019:web:f0bcaad619adf49486ba7e",
    measurementId: "G-2DTLPL6EPZ"
};

const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const provider = new GoogleAuthProvider();
const db = getFirestore(appFirebase);
window.auth = auth;

window.saveWorkoutToCloud = async function(workoutData) {
    if (!auth.currentUser) {
        console.warn("No user logged in, cannot sync workout.");
        return;
    }
    try {
        const userWorkoutsRef = collection(db, 'users', auth.currentUser.uid, 'workouts');
        await addDoc(userWorkoutsRef, workoutData);
        console.log("✅ Workout synced to Firestore.");
    } catch (e) {
        console.error("❌ Failed to sync workout to cloud:", e);
    }
};

window.fetchUserAnalytics = async function() {
    let labels = [];
    let data = [];
    
    try {
        if (!auth.currentUser) throw new Error("No user logged in");
        const userWorkoutsRef = collection(db, 'users', auth.currentUser.uid, 'workouts');
        const q = query(userWorkoutsRef, orderBy('date', 'asc'), limit(10));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
            const w = doc.data();
            labels.push(w.date.split('T')[0]);
            data.push(w.volume || 0);
        });
        
        if (labels.length === 0) throw new Error("No data found in Firebase");
        return { labels, data };
    } catch (e) {
        console.warn("Firebase fetch failed or empty, falling back to localStorage", e);
        const history = JSON.parse(localStorage.getItem('workout_history') || '[]');
        const last10 = history.slice(-10);
        last10.forEach(w => {
            labels.push(w.date ? w.date.split('T')[0] : 'Unknown');
            data.push(w.total_volume || w.volume || 0);
        });
        return { labels, data };
    }
};

// Expose signOut globally for app.js to use
window.signOutUser = () => {
    if(document.getElementById('app-container')) document.getElementById('app-container').style.display = 'none';
    if(document.getElementById('login-view')) document.getElementById('login-view').style.display = 'flex';
    if(document.getElementById('onboarding-view')) document.getElementById('onboarding-view').style.display = 'none';
    localStorage.clear();
    signOut(auth).then(() => {
        window.location.reload();
    }).catch(err => console.error(err));
};

document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'logout-btn' || e.target.id === 'temp-logout-btn')) {
        if(document.getElementById('app-container')) document.getElementById('app-container').style.display = 'none';
        if(document.getElementById('login-view')) document.getElementById('login-view').style.display = 'flex';
        if(document.getElementById('onboarding-view')) document.getElementById('onboarding-view').style.display = 'none';
        localStorage.clear();
        signOut(auth).then(() => {
            window.location.reload(); // Hard refresh to clear all states
        }).catch(err => console.error(err));
    }
});

function getFriendlyErrorMessage(errorCode) {
    if (errorCode.includes('invalid-credential')) return "Invalid email or password. Please try again.";
    if (errorCode.includes('weak-password')) return "Password is too weak. Use at least 6 characters.";
    if (errorCode.includes('email-already-in-use')) return "This email is already in use. Try logging in.";
    return "An unexpected error occurred. Please try again.";
}

document.getElementById('link-to-signup').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('auth-login-form').style.display = 'none';
    document.getElementById('auth-signup-form').style.display = 'flex';
    document.getElementById('auth-error-message').textContent = '';
});

document.getElementById('link-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('auth-signup-form').style.display = 'none';
    document.getElementById('auth-login-form').style.display = 'flex';
    document.getElementById('auth-error-message').textContent = '';
});

document.getElementById('google-login-btn').addEventListener('click', () => {
    document.getElementById('auth-error-message').textContent = '';
    signInWithPopup(auth, provider).catch(error => {
        console.error("FIREBASE AUTH ERROR:", error.code, error.message);
        document.getElementById('auth-error-message').textContent = getFriendlyErrorMessage(error.code);
    });
});

document.getElementById('btn-login').addEventListener('click', () => {
    document.getElementById('auth-error-message').textContent = '';
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) {
        document.getElementById('auth-error-message').textContent = "Please enter both email and password.";
        return;
    }
    
    signInWithEmailAndPassword(auth, email, password).catch(error => {
        console.error("FIREBASE LOGIN ERROR:", error.code, error.message);
        document.getElementById('auth-error-message').textContent = getFriendlyErrorMessage(error.code);
    });
});

document.getElementById('btn-signup').addEventListener('click', () => {
    document.getElementById('auth-error-message').textContent = '';
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    if (!email || !password) {
        document.getElementById('auth-error-message').textContent = "Please enter a valid email and password.";
        return;
    }
    
    createUserWithEmailAndPassword(auth, email, password).catch(error => {
        console.error("FIREBASE SIGNUP ERROR:", error.code, error.message);
        document.getElementById('auth-error-message').textContent = getFriendlyErrorMessage(error.code);
    });
});

onAuthStateChanged(auth, async (user) => {
    if (!user) return; // Prevent null reference errors
    
    window.state = window.state || {};
    const loginView = document.getElementById('login-view');
    const appContainer = document.getElementById('app-container');
    const bottomNav = document.getElementById('bottom-nav');
    const onboardingView = document.getElementById('onboarding-view');
    const obName = document.getElementById('ob-name');

    window.state.currentUser = user.displayName || user.email;
        localStorage.setItem('username', window.state.currentUser);
        
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
        try {
            const resp = await fetch(`${baseUrl}/api/profile?username=${encodeURIComponent(user.uid)}`);
            if (!resp.ok) {
                if (resp.status === 404) {
                    console.log("FORCE TRIGGER: Onboarding");
                    window.state.userProfile = null;
                    document.getElementById('login-view').style.display = 'none';
                    if(document.getElementById('main-app')) document.getElementById('main-app').style.display = 'none';
                    if(document.getElementById('app-container')) document.getElementById('app-container').style.display = 'none';

                    const onboardDiv = document.getElementById('onboarding-view');
                    onboardDiv.classList.remove('hidden'); // Safety override
                    onboardDiv.style.setProperty('display', 'flex', 'important');
                    onboardDiv.style.visibility = 'visible';
                    onboardDiv.style.opacity = '1';
                    
                    if (user.displayName && !obName.value) {
                        obName.value = user.displayName;
                    }
                    return; 
                }
                throw new Error('Failed to fetch profile');
            }
            const data = await resp.json();
            
            if(!data.profile || !data.profile.current_weight) throw new Error("Profile incomplete");

            // Sync backend profile to the local DB for UI rendering
            if (typeof DB !== 'undefined') {
                const p = data.profile;
                DB.saveUser({
                    name: p.name || user.displayName || 'Athlete',
                    currentWeight: p.current_weight || 80,
                    goalWeight: p.target_weight || 75,
                    goalDate: p.goal_date || new Date().toISOString(),
                    height: p.height || 180,
                    weekly_goal: p.frequency || 3,
                    squadId: p.squad_id || ''
                });
            }
            
            // Full profile found
            window.state.userProfile = data.profile;
            if (typeof DB !== 'undefined' && DB.loadUserRoutineAsync) {
                DB.loadUserRoutineAsync().catch(console.error);
            }
            
            loginView.style.display = 'none';
            onboardingView.style.display = 'none';
            appContainer.style.display = 'block';
            
            if (typeof app !== 'undefined' && app.currentView === 'auth') {
                 app.navTo('dashboard');
            } else if (typeof app !== 'undefined' && !app.viewHistory.length) {
                 app.navTo('dashboard');
            }
        } catch(e) {
            console.error("Profile check error:", e);
            // Profile checks failed, enforce Tollbooth
            window.state.userProfile = null;
            loginView.style.display = 'none';
            appContainer.style.display = 'none';
            onboardingView.style.display = 'flex';
            
            if (user.displayName && !obName.value) {
                obName.value = user.displayName;
            }
            return;
        }
});

// BMI Dynamics and Date Formatting
const heightInput = document.getElementById('ob-height');
const currWeightInput = document.getElementById('ob-curr-weight');
const goalWeightInput = document.getElementById('ob-goal-weight');
const bmiDisplay = document.getElementById('dynamic-bmi-display');
const goalDateInput = document.getElementById('ob-goal-date');

// Set min date to today
if (goalDateInput) {
    goalDateInput.min = new Date().toISOString().split('T')[0];
}

function updateBMI() {
    let h, w, gw;
    const unit = document.getElementById('ob-unit-toggle').value;
    
    if (unit === 'metric') {
        h = Number(document.getElementById('ob-height-cm').value) / 100;
        w = Number(document.getElementById('ob-curr-weight-kg').value);
        gw = Number(document.getElementById('ob-goal-weight-kg').value);
    } else {
        const ft = Number(document.getElementById('ob-height-ft').value);
        const inch = Number(document.getElementById('ob-height-in').value);
        h = ((ft * 12) + inch) * 0.0254;
        w = Number(document.getElementById('ob-curr-weight-lbs').value) * 0.453592;
        gw = Number(document.getElementById('ob-goal-weight-lbs').value) * 0.453592;
    }
    
    if (h > 0 && w > 0 && gw > 0) {
        const currentBmi = (w / (h * h)).toFixed(1);
        const targetBmi = (gw / (h * h)).toFixed(1);
        const diff = w - gw;
        const pct = Math.abs((diff / w) * 100).toFixed(1);
        
        let directionTxt = diff >= 0 ? "reduction" : "increase";
        
        bmiDisplay.innerHTML = `Current BMI: <strong style="color:var(--text-primary)">${currentBmi}</strong> -> Target: <strong style="color:var(--electric-volt)">${targetBmi}</strong><br>Targeting a <strong style="color:var(--electric-volt)">${pct}%</strong> ${directionTxt} in body mass. A bold and healthy goal!`;
    } else {
        bmiDisplay.innerHTML = '';
    }
}
document.getElementById('ob-height-cm').addEventListener('input', updateBMI);
document.getElementById('ob-curr-weight-kg').addEventListener('input', updateBMI);
document.getElementById('ob-goal-weight-kg').addEventListener('input', updateBMI);
document.getElementById('ob-height-ft').addEventListener('input', updateBMI);
document.getElementById('ob-height-in').addEventListener('input', updateBMI);
document.getElementById('ob-curr-weight-lbs').addEventListener('input', updateBMI);
document.getElementById('ob-goal-weight-lbs').addEventListener('input', updateBMI);

// Handle Unit Toggle
document.getElementById('ob-unit-toggle').addEventListener('change', (e) => {
    if (e.target.value === 'imperial') {
        document.getElementById('ob-metrics-metric').style.display = 'none';
        document.getElementById('ob-metrics-imperial').style.display = 'block';
    } else {
        document.getElementById('ob-metrics-metric').style.display = 'block';
        document.getElementById('ob-metrics-imperial').style.display = 'none';
    }
    updateBMI();
});

// Handle Fitness Level Checklists
document.getElementById('ob-fitness-level').addEventListener('change', (e) => {
    const val = e.target.value;
    const pullupLabel = document.getElementById('label-pullups');
    const pushupLabel = document.getElementById('label-pushups');
    
    if (val === 'Beginner') {
        pullupLabel.innerText = 'At least 1 Pull-up';
        pushupLabel.innerText = 'At least 1 Push-up';
    } else if (val === 'Intermediate') {
        pullupLabel.innerText = 'At least 5 Pull-ups';
        pushupLabel.innerText = 'At least 5 Push-ups';
    } else if (val === 'Advanced') {
        pullupLabel.innerText = 'At least 10 Pull-ups';
        pushupLabel.innerText = 'At least 20 Push-ups';
    }
});

// Select Card Helper
window.selectCard = function(el, type) {
    const parent = el.closest('.ob-card-grid');
    parent.querySelectorAll('.ob-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    
    if (type === 'gym-val') {
        document.getElementById('ob-gym-type').value = el.getAttribute('data-val');
    } else if (type === 'goal-val') {
        document.getElementById('ob-primary-goal').value = el.getAttribute('data-val');
    }
}

// Multi-Step Onboarding Navigation
function setProgress(step) {
    document.getElementById('step-indicator').innerText = `Step ${step}/5`;
    document.getElementById('ob-progress-bar').style.width = `${step * 20}%`;
}

document.getElementById('ob-next-to-step-2').addEventListener('click', () => {
    const name = document.getElementById('ob-name').value;
    const unit = document.getElementById('ob-unit-toggle').value;
    let heightValid = false;
    let weightValid = false;
    
    if (unit === 'metric') {
        if(document.getElementById('ob-height-cm').value) heightValid = true;
        if(document.getElementById('ob-curr-weight-kg').value && document.getElementById('ob-goal-weight-kg').value) weightValid = true;
    } else {
        if(document.getElementById('ob-height-ft').value && document.getElementById('ob-height-in').value) heightValid = true;
        if(document.getElementById('ob-curr-weight-lbs').value && document.getElementById('ob-goal-weight-lbs').value) weightValid = true;
    }
    
    if(!name || !heightValid || !weightValid) {
        alert("Please fill out your Name, Height, and Weights before proceeding.");
        return;
    }
    
    const date = document.getElementById('ob-goal-date').value;
    if (date) {
        const selectedDate = new Date(date);
        const todayUrl = new Date();
        todayUrl.setHours(0,0,0,0);
        if (selectedDate < todayUrl) {
            alert("Your Goal Target Date cannot be in the past.");
            return;
        }
    }

    setProgress(2);
    document.getElementById('ob-step-1').style.display = 'none';
    document.getElementById('ob-step-2').style.display = 'block';
});

document.getElementById('ob-next-to-step-3').addEventListener('click', () => {
    const gymType = document.getElementById('ob-gym-type').value;
    if(!gymType) {
        alert("Please select a Gym Location.");
        return;
    }
    setProgress(3);
    document.getElementById('ob-step-2').style.display = 'none';
    document.getElementById('ob-step-3').style.display = 'block';
});

document.getElementById('ob-next-to-step-4').addEventListener('click', () => {
    const primaryGoal = document.getElementById('ob-primary-goal').value;
    if(!primaryGoal) {
        alert("Please select a Primary Goal.");
        return;
    }
    
    const gymType = document.getElementById('ob-gym-type').value;
    // Auto-select equip checkboxes based on gym type
    const equipCbs = document.querySelectorAll('.ob-equip-cb');
    equipCbs.forEach(cb => cb.checked = false); // Clear
    
    if (gymType === 'Commercial Gym') {
        equipCbs.forEach(cb => cb.checked = true);
    } else if (gymType === 'Garage Gym') {
        const garageGear = ['Barbell', 'Bench', 'Rack', 'Dumbbells'];
        equipCbs.forEach(cb => {
            if (garageGear.includes(cb.value)) cb.checked = true;
        });
    } else if (gymType === 'Warehouse Gym') {
        const warehouseGear = ['Barbell', 'Axle Bar', 'Bench', 'Rack', 'Dumbbells', 'Kettlebells', 'EZ Bar'];
        equipCbs.forEach(cb => {
            if (warehouseGear.includes(cb.value)) cb.checked = true;
        });
    } else if (gymType === 'Local Gym') {
        const localGear = ['Dumbbells', 'Barbell', 'EZ Bar', 'Bench', 'Rack', 'Cables'];
        equipCbs.forEach(cb => {
            if (localGear.includes(cb.value)) cb.checked = true;
        });
    } else if (gymType === 'Home') {
        const homeGear = ['Dumbbells', 'Kettlebells'];
        equipCbs.forEach(cb => {
            if (homeGear.includes(cb.value)) cb.checked = true;
        });
    }
    
    setProgress(4);
    document.getElementById('ob-step-3').style.display = 'none';
    document.getElementById('ob-step-4').style.display = 'block';
});

document.getElementById('ob-next-to-step-5').addEventListener('click', () => {
    setProgress(5);
    document.getElementById('ob-step-4').style.display = 'none';
    document.getElementById('ob-step-5').style.display = 'block';
});

document.getElementById('ob-back-to-step-1').addEventListener('click', () => {
    setProgress(1);
    document.getElementById('ob-step-2').style.display = 'none';
    document.getElementById('ob-step-1').style.display = 'block';
});

document.getElementById('ob-back-to-step-2').addEventListener('click', () => {
    setProgress(2);
    document.getElementById('ob-step-3').style.display = 'none';
    document.getElementById('ob-step-2').style.display = 'block';
});

document.getElementById('ob-back-to-step-3').addEventListener('click', () => {
    setProgress(3);
    document.getElementById('ob-step-4').style.display = 'none';
    document.getElementById('ob-step-3').style.display = 'block';
});

document.getElementById('ob-back-to-step-4').addEventListener('click', () => {
    setProgress(4);
    document.getElementById('ob-step-5').style.display = 'none';
    document.getElementById('ob-step-4').style.display = 'block';
});

// Handle Verification Submit Lock-In
document.getElementById('ob-submit-btn').addEventListener('click', async () => {
    if(!auth.currentUser) return;
    
    const name = document.getElementById('ob-name').value;
    const age = document.getElementById('profile-age').value;
    const gender = document.getElementById('ob-gender').value;
    const date = document.getElementById('ob-goal-date').value;
    const freq = document.getElementById('ob-frequency').value;
    const gymType = document.getElementById('ob-gym-type').value;
    const primaryGoal = document.getElementById('ob-primary-goal').value;
    
    let height, currWt, goalWt;
    const unit = document.getElementById('ob-unit-toggle').value;
    if (unit === 'metric') {
        height = Number(document.getElementById('ob-height-cm').value);
        currWt = Number(document.getElementById('ob-curr-weight-kg').value);
        goalWt = Number(document.getElementById('ob-goal-weight-kg').value);
    } else {
        const ft = Number(document.getElementById('ob-height-ft').value);
        const inch = Number(document.getElementById('ob-height-in').value);
        height = Math.round(((ft * 12) + inch) * 2.54); // cm
        currWt = Number((Number(document.getElementById('ob-curr-weight-lbs').value) * 0.453592).toFixed(1)); // kg
        goalWt = Number((Number(document.getElementById('ob-goal-weight-lbs').value) * 0.453592).toFixed(1)); // kg
    }
    
    const checkboxes = document.querySelectorAll('input[name="ob-schedule"]:checked');
    const schedule = Array.from(checkboxes).map(cb => cb.value);
    
    const equipment = Array.from(document.querySelectorAll('.ob-equip-cb:checked')).map(cb => cb.value);
    const canPullup = document.getElementById('ob-can-pullup').checked ? 1 : 0;
    const canDip = document.getElementById('ob-can-dip').checked ? 1 : 0;
    const canPushup = document.getElementById('ob-can-pushup').checked ? 1 : 0;
    const canBBPress = document.getElementById('ob-can-bbpress').checked ? 1 : 0;
    
    const payload = {
        username: auth.currentUser.uid,
        name: name,
        age: age,
        gender: gender,
        height: height,
        start_weight: currWt,
        current_weight: currWt,
        target_weight: goalWt,
        goal_date: date,
        frequency: freq,
        schedule: schedule,
        gym_type: gymType,
        primary_goal: primaryGoal,
        equipment: equipment,
        can_pullup: canPullup,
        can_dip: canDip,
        can_pushup: canPushup,
        can_barbell_press: canBBPress
    };
    
    const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
    
    try {
        const resp = await fetch(`${baseUrl}/api/profile`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        if (resp.ok) {
            window.state.userProfile = payload; // Unlock renderView!
            document.getElementById('onboarding-view').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            if(typeof app !== 'undefined') {
                app.navTo('dashboard');
            }
        } else {
            const err = await resp.json();
            alert('Error saving profile: ' + (err.error || 'Unknown Error'));
        }
    } catch(err) {
        alert('Network Error');
    }
});
