const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const logger = require('./logger');

const app = express();
app.use(bodyParser.json());

const API_SERVER_URL = process.env.API_SERVER_URL || 'http://ai_api_server:3001';

let BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || null;

const fs = require('fs');
const configPath = '/app/config/telegram_bot_token.json';
if (fs.existsSync(configPath)) {
    try {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (data.token) {
            BOT_TOKEN = data.token;
            logger.info('[TELEGRAM] Loaded bot token from persistent volume');
        }
    } catch(err) {
        logger.error('[TELEGRAM] Failed to read persistent token', err.message);
    }
}

let lastUpdateId = 0;
let pollingInterval = null;

// The UI payload when we forward to the assistant
const forwardToAssistant = async (text, chatId) => {
    try {
        const payload = {
            prompt: text,
            source: 'telegram',
            userId: String(chatId)
        };
        const response = await axios.post(`${API_SERVER_URL}/api/assistant/request`, payload);
        const output = response.data.response || response.data.output || "Execution completed";
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: output
        });
    } catch (err) {
        logger.error('Failed to communicate with AI server: ' + err.message);
        try {
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: "❌ Error connecting to AI Operating System."
            });
        } catch(e) {}
    }
};

const pollTelegram = async () => {
    if (!BOT_TOKEN) return;
    try {
        const res = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`, {
            params: { offset: lastUpdateId + 1, timeout: 50 },
            timeout: 60000
        });

        if (res.data && res.data.ok) {
            const updates = res.data.result;
            for (const update of updates) {
                lastUpdateId = update.update_id;
                
                if (update.message && update.message.text) {
                    const text = update.message.text.trim();
                    const chatId = update.message.chat.id;
                    logger.info(`[TELEGRAM] Msg from ${chatId}: ${text}`);

                    if (text === '/start') {
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            chat_id: chatId,
                            text: 'AI OS Telegram Bot Connected.\n\nCommands:\n/mode local - Switch to Ollama\n/mode cloud - Switch to OpenAI\n/mode auto - Enable smart routing\n/status - Show current mode + model'
                        });
                        continue;
                    }

                    if (text === '/status') {
                        try {
                            const llmStatus = await axios.get('http://ai_llm_layer:3020/status');
                            const { mode, local_model, cloud_model } = llmStatus.data;
                            const statusMsg = `Mode: ${mode}\nLocal: ${local_model}\nCloud: ${cloud_model}`;
                            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                                chat_id: chatId,
                                text: statusMsg
                            });
                        } catch (e) {
                            logger.error('[TELEGRAM] Status error: ' + e.message);
                        }
                        continue;
                    }

                    if (text.startsWith('/mode ')) {
                        const newMode = text.split(' ')[1];
                        try {
                            let payload = {};
                            if (newMode === 'auto') payload = { auto: true };
                            else if (['local', 'cloud'].includes(newMode)) payload = { mode: newMode, auto: false };
                            
                            if (Object.keys(payload).length > 0) {
                                await axios.post('http://ai_llm_layer:3020/mode', payload);
                                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                                    chat_id: chatId,
                                    text: `✅ Mode updated to: ${newMode.toUpperCase()}`
                                });
                            }
                        } catch (e) {
                            logger.error('[TELEGRAM] Mode update error: ' + e.message);
                        }
                        continue;
                    }

                    // Forward to AI server for NLP processing
                    await forwardToAssistant(text, chatId);
                }
            }
        }
    } catch (err) {
        logger.error(`[TELEGRAM] Polling error: ${err.message}`);
    }
    
    pollingInterval = setTimeout(pollTelegram, 2000);
};

const startPolling = () => {
    if (pollingInterval) clearTimeout(pollingInterval);
    if (BOT_TOKEN) {
        logger.info('[TELEGRAM] Starting to poll telegram API...');
        pollTelegram();
    }
}

// Start polling if token in ENV
startPolling();

// Internal route called by Dashboard via api-server
app.post('/internal/update_token', (req, res) => {
    const { token } = req.body;
    if (token) {
        BOT_TOKEN = token;
        logger.info('[TELEGRAM] Received new Bot Token dynamically');
        startPolling();
        return res.json({ success: true, message: 'Token updated.' });
    }
    return res.status(400).json({ error: 'Missing token' });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', botConnected: !!BOT_TOKEN });
});

const PORT = process.env.PORT || 3011;
app.listen(PORT, () => {
    logger.info(`[TELEGRAM] Service listening on port ${PORT}`);
});
