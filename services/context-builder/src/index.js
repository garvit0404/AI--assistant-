const express = require('express');
const { createClient } = require('redis');
const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.Console()]
});

const app = express();
app.use(express.json());

// DB Connections
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/ai_os';

const redisClient = createClient({ url: REDIS_URL });
mongoose.connect(MONGO_URL);

app.post('/context/build', async (req, res) => {
    const { userId, prompt } = req.body;
    logger.info(`Building context for user ${userId}`);

    try {
        await redisClient.connect();
        
        // 1. Fetch Short-Term Memory (Redis)
        const sessionState = await redisClient.get(`session:${userId}`) || "{}";
        const activeTasks = await redisClient.sMembers(`active_tasks:${userId}`) || [];

        // 2. Fetch Long-Term Memory (MongoDB - Mocked for now)
        // In a real scenario, we'd query a ConversationModel
        const conversationHistory = [
            { role: 'user', content: 'Previous message' },
            { role: 'assistant', content: 'Previous response' }
        ];

        // 3. Environment State (Mocked)
        const environmentState = {
            os_version: 'AI-OS v1.0',
            workspace_ready: true,
            network_status: 'online'
        };

        const context = {
            user_request: prompt,
            conversation_history: conversationHistory,
            environment_state: environmentState,
            session_state: JSON.parse(sessionState),
            active_tasks: activeTasks,
            timestamp: new Date().toISOString()
        };

        await redisClient.disconnect();
        res.json(context);

    } catch (error) {
        logger.error(`Context building failed: ${error.message}`);
        res.status(500).json({ error: 'Context retrieval error' });
    }
});

// --- Health Check ---
app.get('/health', (req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(200).json({ status: 'ok', mongo: mongoStatus });
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
    logger.info(`Context Builder Service started on port ${PORT}`);
});
