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
