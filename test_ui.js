const queue = ['ex1', 'ex2'];
const idx = 0;
const upcoming = queue.slice(idx + 1);
const exercises = [{id: 'ex2', name: 'Test Exercise'}];

const htmlStr = upcoming.map((uId, i) => {
    const listIndex = idx + 1 + i;
    const uEx = exercises.find(e => e.id === uId);
    
    return `<li 
        draggable="true" 
        ondragstart="event.dataTransfer.setData('text/plain', ${listIndex})"
        ondragover="event.preventDefault(); this.style.borderColor='#FF5F1F';"
        ondragleave="this.style.borderColor='rgba(255,255,255,0.1)';"
        ondrop="event.preventDefault(); this.style.borderColor='rgba(255,255,255,0.1)'; const draggedIdx = parseInt(event.dataTransfer.getData('text/plain')); app.reorderQueue(draggedIdx, ${listIndex});"
        style="padding: var(--space-md); background: #161B22; border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; cursor: grab; transition: border-color 0.2s;"
    >
        <span style="color: #FFF; font-weight: bold; font-size: 1rem;">${uEx.name}</span>
        <span style="color: var(--text-dim); font-size: 1.2rem;">≡</span>
    </li>`;
}).join('');

console.log(htmlStr);
