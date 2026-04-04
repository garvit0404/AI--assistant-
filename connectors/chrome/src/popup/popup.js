document.getElementById('ai-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const promptEl = document.getElementById('prompt');
    const responseArea = document.getElementById('response-area');
    const btn = document.getElementById('send-btn');
    const prompt = promptEl.value.trim();

    if (!prompt) return;

    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
        const res = await fetch('http://127.0.0.1:3001/api/assistant/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, source: 'chrome_popup' })
        });

        const data = await res.json();
        
        responseArea.style.display = 'block';
        responseArea.innerHTML = `<strong>Status:</strong> ${data.status}<br/><strong>Task ID:</strong> ${data.taskId}<br/><strong>Intent:</strong> ${data.intent || 'Unknown'}`;
        
    } catch (err) {
        responseArea.style.display = 'block';
        responseArea.innerHTML = `<span style="color: #ef4444">Connection Failed. Is api-server running on port 3001?</span>`;
    } finally {
        btn.textContent = 'Process Command';
        btn.disabled = false;
        promptEl.value = '';
    }
});
