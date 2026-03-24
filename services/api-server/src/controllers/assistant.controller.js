const Orchestrator = require('../ai/orchestrator.js');
const { checkRateLimit } = require('../security/rateLimiter.js');
const { scanPrompt } = require('../security/promptFilter.js');
const logger = require('../utils/logger.js');

const handleAssistantRequest = async (req, res, next) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        // ENTRY GUARD 1: Rate Limiting
        const redisClient = req.app.get('redisClient');
        const rateLimit = await checkRateLimit(redisClient, req.ip, 12, 60);
        if (!rateLimit.allowed) {
            return res.status(429).json({ success: false, error: 'Rate limit exceeded.' });
        }

        // ENTRY GUARD 2: Prompt Injection Scan
        const promptSecurity = scanPrompt(message);
        if (promptSecurity.detected) {
            return res.status(403).json({ success: false, error: 'Security Violation: Malicious prompt detected.' });
        }

        // AGENT ORCHESTRATION
        const orchestrator = new Orchestrator(req.app);
        const result = await orchestrator.runTask(message, req.ip);

        return res.status(result.success ? 200 : 400).json(result);

    } catch (error) {
        next(error);
    }
};

const getHealthStatus = (req, res) => {
    res.status(200).json({ status: 'ok', service: 'api-server' });
};

module.exports = { handleAssistantRequest, getHealthStatus };
