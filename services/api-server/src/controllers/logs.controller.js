const timelineService = require('../services/timeline.service.js');
const logger = require('../utils/logger.js');

// TASK 4: In-Memory Memory (Temporary Memory Store)
const logsStore = {};

const pushLog = async (req, res) => {
    try {
        const { taskId, stage, status, message, meta } = req.body;
        
        if (!taskId) return res.status(400).json({ error: 'taskId required' });

        const logEntry = {
            taskId,
            stage,
            status,
            message,
            meta: meta || {},
            timestamp: new Date().toISOString()
        };

        // Store in memory
        if (!logsStore[taskId]) logsStore[taskId] = [];
        logsStore[taskId].push(logEntry);

        // PERSIST in MongoDB (Timeline Service)
        await timelineService.log(taskId, stage, message, { status, ...meta });

        // Real-time LOGGING console for Docker (TASK 10)
        console.log(`[LOG] ${stage.toUpperCase()} [${status.toUpperCase()}] ${taskId}: ${message}`);

        res.json({ success: true });
    } catch (err) {
        logger.error(`Failed to push log: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

const getLogs = async (req, res) => {
    const { taskId } = req.params;
    // Try memory first, fallback to MongoDB if not present
    const memoryLogs = logsStore[taskId] || [];
    
    if (memoryLogs.length > 0) {
        return res.json({ success: true, logs: memoryLogs });
    }

    try {
        const dbLogs = await timelineService.getByTaskId(taskId);
        res.json({ success: true, logs: dbLogs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getAllLogs = async (req, res) => {
    try {
        const allLogs = Object.values(logsStore).flat()
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 500);
        res.json({ success: true, logs: allLogs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    pushLog,
    getLogs,
    getAllLogs
};
