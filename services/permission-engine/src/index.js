const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('redis');
const ToolRegistry = require('@repo/tool-registry');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: REDIS_URL });

async function initRedis() {
    try {
        await redisClient.connect();
        logger.info(`[PERMISSION] Connected to Redis at ${REDIS_URL}`);
    } catch (err) {
        logger.error(`[PERMISSION] Redis connection error: ${err.message}`);
    }
}
initRedis();

app.post('/request', async (req, res) => {
    const { taskId, tool, parameters } = req.body;
    
    if (!ToolRegistry.validateTool(tool)) {
        return res.status(400).json({ status: 'failed', error: 'Unknown tool' });
    }

    const riskLevel = ToolRegistry.getRiskLevel(tool);
    logger.info(`[PERMISSION] Task ${taskId}: Requesting ${tool} (${riskLevel})`);

    // Rule 1: LOW risk tools are auto-approved
    if (riskLevel === 'LOW') {
        logger.info(`[PERMISSION] Task ${taskId}: Auto-approved LOW risk tool: ${tool}`);
        return res.json({ taskId, tool, status: 'approved', riskLevel, method: 'Auto-approved' });
    }

    // Rule 2: MEDIUM, HIGH, CRITICAL require manual approval
    const requestId = uuidv4();
    const request = {
        requestId,
        taskId,
        tool,
        parameters,
        riskLevel,
        status: 'pending',
        timestamp: Date.now()
    };

    // Store in Redis with TTL (1 hour)
    await redisClient.set(`perm:${requestId}`, JSON.stringify(request), { EX: 3600 });
    
    logger.info(`[PERMISSION] Task ${taskId}: Manual approval required for ${tool} (Request ID: ${requestId})`);

    // Notify Telegram Bot (Bridge Integration)
    const TELEGRAM_SERVICE = process.env.TELEGRAM_URL || 'http://telegram-bot:3011';
    axios.post(`${TELEGRAM_SERVICE}/notify`, {
        request: { requestId, taskId, tool, riskLevel, parameters }
    }).catch(err => logger.error(`[PERMISSION] Failed to notify Telegram: ${err.message}`));

    return res.json({ taskId, tool, status: 'pending', requestId, riskLevel });
});

app.post('/approve', async (req, res) => {
    const { requestId } = req.body;
    const data = await redisClient.get(`perm:${requestId}`);
    if (!data) return res.status(404).json({ status: 'failed', error: 'Request not found' });

    const request = JSON.parse(data);
    request.status = 'approved';
    await redisClient.set(`perm:${requestId}`, JSON.stringify(request), { EX: 3600 });
    
    logger.info(`[PERMISSION] Task ${request.taskId}: Approved request ${requestId}`);
    return res.json({ status: 'success', data: request });
});

app.post('/reject', async (req, res) => {
    const { requestId } = req.body;
    const data = await redisClient.get(`perm:${requestId}`);
    if (!data) return res.status(404).json({ status: 'failed', error: 'Request not found' });

    const request = JSON.parse(data);
    request.status = 'rejected';
    await redisClient.set(`perm:${requestId}`, JSON.stringify(request), { EX: 3600 });
    
    logger.warn(`[PERMISSION] Task ${request.taskId}: Rejected request ${requestId}`);
    return res.json({ status: 'success', data: request });
});

// --- Health Check ---
app.get('/health', (req, res) => {
    const redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
    res.status(200).json({ status: 'ok', redis: redisStatus });
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    logger.info(`[PERMISSION] Service started on port ${PORT}`);
});
