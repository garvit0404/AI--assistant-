const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const logger = require('./logger');

const app = express();
app.use(bodyParser.json());

const PERMISSION_SERVICE = 'http://localhost:3006';

app.post('/webhook', async (req, res) => {
    const { message } = req.body;
    logger.info(`[TELEGRAM] Received message: "${message.text}"`);

    if (message.text === '/start') {
        return res.json({ text: 'AI OS Telegram Bot Active. I will notify you of pending permissions.' });
    }

    // Simulate approval from Telegram
    if (message.text.startsWith('/approve ')) {
        const requestId = message.text.split(' ')[1];
        try {
            await axios.post(`${PERMISSION_SERVICE}/approve`, { requestId });
            return res.json({ text: `✅ Permission ${requestId} approved via Telegram.` });
        } catch (err) {
            return res.json({ text: `❌ Failed to approve: ${err.message}` });
        }
    }

    return res.json({ text: 'Command not recognized. Use /approve <id> to authorize actions.' });
});

app.post('/notify', (req, res) => {
    const { request } = req.body;
    logger.info(`[TELEGRAM] NOTIFICATION: AI wants to perform ${request.tool}. Risk: ${request.riskLevel}. ID: ${request.requestId}`);
    // In a real bot, we'd use the Telegram Bot API here
    return res.json({ status: 'sent', mock: true });
});

const PORT = 3011;
app.listen(PORT, () => {
    logger.info(`[TELEGRAM] Mock Bot Service started on port ${PORT}`);
});
