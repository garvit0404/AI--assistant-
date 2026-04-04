const Orchestrator = require('../ai/orchestrator.js');
const { checkRateLimit } = require('../security/rateLimiter.js');
const { scanPrompt } = require('../security/promptFilter.js');
const logger = require('../utils/logger.js');
const ChatMessage = require('../models/ChatMessage.js');

const handleAssistantRequest = async (req, res, next) => {
    try {
        const message =
            req.body.message ||
            req.body.prompt ||
            req.body.input ||
            "";

        if (!message.trim()) {
            return res.status(400).json({ 
                success: false, 
                error: "Message is required",
                received: req.body
            });
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

        // Save user message to history
        await ChatMessage.create({ role: 'user', content: message, userId: req.ip });

        // AGENT ORCHESTRATION
        const orchestrator = new Orchestrator(req.app);
        const result = await orchestrator.runTask(message, req.ip);

        const finalResponse = result.response || result.output || result.result || "Execution completed";

        // Save AI response to history
        if (result.success || result.response) {
            await ChatMessage.create({ 
                role: 'assistant', 
                content: finalResponse, 
                taskId: result.taskId, 
                status: result.status, 
                userId: req.ip 
            });
        }

        return res.status(result.success ? 200 : 400).json({
            success: result.success,
            intent: result.intent,
            response: finalResponse,
            taskId: result.taskId,
            status: result.status,
            meta: result.meta
        });

    } catch (error) {
        next(error);
    }
};

const getHealthStatus = (req, res) => {
    res.status(200).json({ status: 'ok', service: 'api-server' });
};

const getChatHistory = async (req, res, next) => {
    try {
        const history = await ChatMessage.find({ userId: req.ip }).sort({ timestamp: 1 }).limit(100);
        res.json({ success: true, history: history.map(h => ({
            role: h.role,
            content: h.content,
            taskId: h.taskId,
            status: h.status,
            timestamp: new Date(h.timestamp).toLocaleTimeString()
        }))});
    } catch (error) {
        next(error);
    }
};

module.exports = { handleAssistantRequest, getHealthStatus, getChatHistory };
