// Listens to background script for feedback from API Server
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'AI_STARTED') {
        showToast(`AI Task Started: ${request.taskId}`, 'info');
    }
});

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.backgroundColor = type === 'info' ? '#3b82f6' : '#10b981';
    toast.style.color = '#fff';
    toast.style.zIndex = '999999';
    toast.style.fontFamily = 'system-ui, sans-serif';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
    toast.style.transition = 'opacity 0.3s ease';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Form Autofill Listener (Triggered by shortcut or popup)
function handleAutoFill(intentData) {
    if (!intentData) return;
    
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        const name = input.name || input.id;
        if (name && intentData[name]) {
            input.value = intentData[name];
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
}
