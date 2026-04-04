const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Simple file-based storage or use redis
const botTokenFile = path.resolve('/app/config/telegram_bot_token.json');

const connectTelegramBot = async (req, res) => {
    const { botToken } = req.body;

    if (!botToken) {
        return res.status(400).json({ success: false, error: 'botToken is required' });
    }

    try {
        const telegramRes = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);
        
        if (telegramRes.data && telegramRes.data.ok) {
            const botInfo = telegramRes.data.result;
            
            // Start polling container logic would go here.
            // Since telegram-bot service lives in its own container, 
            // storing it in the DB or Redis would be best. For now, since they 
            // share redis, let's put it in redis.
            const redisClient = req.app.get('redisClient');
            if (redisClient && redisClient.isReady) {
                await redisClient.set('TELEGRAM_BOT_TOKEN', botToken);
            }
            
            // Create config dir if not exists inside api-server
            try { fs.mkdirSync(path.dirname(botTokenFile), { recursive: true }); } catch (e) {}
            fs.writeFileSync(botTokenFile, JSON.stringify({ token: botToken, info: botInfo }));

            // Notify the telegram container to reload token via some pubsub or simple REST call
            // We can just rely on telegram-bot checking Redis or exposing an endpoint
            try {
                await axios.post('http://ai_telegram_bot:3011/internal/update_token', { token: botToken });
            } catch (err) {
                logger.warn('Could not notify telegram container live, it might need restart.');
            }

            return res.json({
                success: true,
                botName: botInfo.first_name,
                botUsername: botInfo.username
            });
        }
    } catch (err) {
        return res.status(400).json({ 
            success: false, 
            error: 'Failed to validate bot token. ' + (err.response?.data?.description || err.message)
        });
    }
};

const getTelegramStatus = async (req, res) => {
    try {
        if (fs.existsSync(botTokenFile)) {
            const data = JSON.parse(fs.readFileSync(botTokenFile, 'utf8'));
            if (data.info || data.token) {
                return res.json({ connected: true, botInfo: data.info });
            }
        }
    } catch (err) {}
    return res.json({ connected: false });
};

module.exports = { connectTelegramBot, getTelegramStatus };
