// Leaderboard_Service.js - Logic for global ranking simulation

const Leaderboard = {
    getWeeklyVolume(strengthLogs) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        return strengthLogs
            .filter(log => new Date(log.date) > oneWeekAgo)
            .reduce((total, log) => {
                const logVolume = log.sets.reduce((setTotal, set) => setTotal + (set.weight * set.reps), 0);
                return total + logVolume;
            }, 0);
    },

    getWeeklyCardioDistance(cardioLogs) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        return cardioLogs
            .filter(log => new Date(log.date) > oneWeekAgo)
            .reduce((total, log) => total + Number(log.distance), 0);
    },

    getSimulatedLeaderboard(userVolume, type = 'volume') {
        let board = [];
        if(type === 'volume') {
            board = [
                { name: "Chris B.", score: 54000 },
                { name: "Sarah O.", score: 48500 },
                { name: "Mike T.", score: 42000 },
                { name: "Jessica R.", score: 39000 },
                { name: "Tom W.", score: 31000 },
                { name: "You", score: userVolume, isUser: true }
            ];
        } else {
            board = [
                { name: "Alex K.", score: 105 },
                { name: "Sam L.", score: 82 },
                { name: "David P.", score: 64 },
                { name: "Emily C.", score: 45 },
                { name: "You", score: userVolume, isUser: true }
            ];
        }

        board.sort((a, b) => b.score - a.score);
        return board.map((entry, index) => {
            entry.rank = index + 1;
            return entry;
        });
    },

    checkTop10Percent(board) {
        const userEntry = board.find(b => b.isUser);
        if(!userEntry) return false;
        
        // Simulating: If user is rank 1 
        return userEntry.rank === 1;
    }
};

window.setLeaderboardScope = function(scope, btnElement) {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    
    const container = document.getElementById('arena-leaderboard-container');
    if(container) container.innerHTML = `<div style="text-align: center; padding: var(--space-xl);"><div class="loader"></div></div>`;
    
    window.loadLeaderboard(scope);
};

window.loadLeaderboard = async function(scope = 'global') {
    const container = document.getElementById('arena-leaderboard-container');
    if (!container) return;

    try {
        const db = DB.get();
        const sid = db.user ? db.user.squadId : '';
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:5001';
        
        let url = `${baseUrl}/api/leaderboard?scope=squad`;
        if(!sid) {
            container.innerHTML = `<div style="text-align:center; color: #A0A0A0; padding: var(--space-xl);">You must join a squad first to view it here.</div>`;
            return;
        }
        url += `&squad_id=${sid}`;

        const response = await fetch(url);
        const users = await response.json();
        users.sort((a,b) => (b.progress_percentage || 0) - (a.progress_percentage || 0));
        
        let html = '';
        users.forEach((u, index) => {
            const rank = index + 1;
            const prog = Math.round(u.progress_percentage || 0);
            const rankData = window.getRank ? window.getRank(prog) : { name: "Iron", color: "#808080" };
            
            const radius = 18;
            const circ = 2 * Math.PI * radius;
            const offset = circ - (prog / 100) * circ;
            const glow = rank === 1 ? 'box-shadow: 0 0 15px rgba(0, 209, 255, 0.4); border-color: #00D1FF;' : 'border-color: #222;';
            
            html += `
                <div class="leaderboard-row" style="${glow}">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <span style="font-weight: 800; color: ${rank===1 ? '#00D1FF' : '#A0A0A0'}; width: 24px;">#${rank}</span>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 600; color: #FFF;">${u.name}</span>
                            <span style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: ${rankData.color}; margin-top: 2px;">${rankData.name}</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 0.9rem; font-weight: bold; color: #00D1FF;">${prog}%</span>
                        <svg width="40" height="40" viewBox="0 0 40 40" style="transform: rotate(-90deg);">
                            <circle cx="20" cy="20" r="18" fill="none" stroke="#161B22" stroke-width="4"></circle>
                            <circle cx="20" cy="20" r="18" fill="none" stroke="#00D1FF" stroke-width="4" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"></circle>
                        </svg>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch(e) {
        console.error("Leaderboard error:", e);
        container.innerHTML = `<div style="text-align:center; color: #FF5F1F; padding: var(--space-xl);">Network error loading Arena database.</div>`;
    }
};
