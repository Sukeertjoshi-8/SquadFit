# ⚡️ SquadFit: Next-Gen Fitness Tracker & Social Hub

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)

> **SquadFit** is a full-stack, responsive web application designed to track workouts, calculate progressive overload, and foster community through an interactive "Squad Hub". 

## ✨ Core Features

* 🎧 **Global Workout Overlay:** A persistent, Spotify-style background player that allows users to seamlessly log sets while navigating the rest of the application.
* 📈 **Dynamic Analytics Engine:** Real-time data visualization using **Chart.js** to track volume progression and progressive overload over time.
* 🗄️ **Interactive Vault:** A fully searchable, dynamic database of exercises that can be injected into an active workout session on the fly.
* 🏆 **The Arena (Leaderboards):** A competitive hub featuring custom fitness ranks (Initiate, Contender, Gladiator, Titan, Apex) based on total volume output.
* 🌐 **Squad Hub:** A social feed where users can share post-workout updates, attach images, and interact with global or squad-specific communities.
* 🎯 **Smart Dashboard:** Live calculation of weight loss goals, required weekly pacing, and daily hydration tracking with automated resets.

## 🏗️ Architecture & Tech Stack

### Frontend
* **Core:** Vanilla JavaScript (ES6+), HTML5, CSS3
* **State Management:** Custom hybrid local state (`window.state`) and `localStorage` caching.
* **UI/UX:** Dynamic DOM manipulation, custom Modals/Bottom Sheets, and CSS Grid/Flexbox layouts.
* **Libraries:** Chart.js (Data Visualization).

### Backend & Database
* **Server:** Python (`app.py`)
* **Database:** Firebase Firestore (NoSQL)
* **Authentication:** Firebase Auth / Admin SDK

## 🚀 Local Installation & Setup

To run this project locally, you will need to start both the Python backend server and a local server for the frontend.

**1. Clone the repository**
```bash
git clone [https://github.com/yourusername/SquadFit.git](https://github.com/yourusername/SquadFit.git)
cd SquadFit

2. Setup the Python Backend
Bash

cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt

3. Firebase Configuration

    Place your Firebase Admin SDK serviceAccountKey.json directly into the /backend folder.

    (Note: This file is included in .gitignore for security).

4. Run the Backend Server
Bash

python app.py

5. Run the Frontend

    Open the root folder in VS Code.

    Start a local server (e.g., using the Live Server extension on index.html).

🧠 V1 Retrospective & Lessons Learned

This repository serves as a V1 Architectural Prototype. During development, a major pivot was executed to decouple the active workout logger from the main navigation router.

Key Takeaways:

    State Management: Transitioning from a static "Arena Tab" to a "Global Overlay" highlighted the importance of strict DOM target referencing and null-safe UI rendering.

    Phantom DOM Elements: Learned how to safely sanitize and re-bind event listeners (like the Start Workout button) when massive HTML containers are dynamically destroyed and recreated.

    Data Persistence: Transitioned from volatile localStorage string arrays to structured Firebase Firestore collections to ensure user analytics survive browser cache clears.

Designed and built by [Your Name/Handle].
