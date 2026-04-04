const API_URL = "http://127.0.0.1:3001/api/assistant/request";

// Setup context menu on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "ai-assistant-summarize",
        title: "Summarize with AI Assistant",
        contexts: ["selection"]
    });
    chrome.contextMenus.create({
        id: "ai-assistant-research",
        title: "Deep Research with AI",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.selectionText) {
        let prompt = "";
        
        if (info.menuItemId === "ai-assistant-summarize") {
            prompt = `Summarize this text: ${info.selectionText}`;
        } else if (info.menuItemId === "ai-assistant-research") {
            prompt = `Conduct deep research based on this highlighted paragraph: ${info.selectionText}`;
        }

        // Notify UI to open or show loading state
        sendPromptToBrain(prompt, tab.id);
    }
});

async function sendPromptToBrain(prompt, tabId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, source: "chrome-extension" })
        });

        const data = await response.json();
        
        // Let the content script know that processing started
        chrome.tabs.sendMessage(tabId, { 
            action: 'AI_STARTED', 
            taskId: data.taskId 
        });

    } catch (error) {
        console.error("AI Server connection failed:", error);
    }
}
