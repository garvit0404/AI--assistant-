const express = require('express');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.Console()]
});

const app = express();
app.use(express.json());

const ACTIVE_MONITORS = new Map();

app.post('/observe/start', (req, res) => {
    const { taskId, tool, timeout } = req.body;
    
    const monitor = {
        taskId,
        tool,
        startTime: Date.now(),
        timeout: timeout || 30000, // Default 30s
        status: 'MONITORING'
    };

    ACTIVE_MONITORS.set(taskId, monitor);
    
    // Set watchdog for execution timeout
    setTimeout(() => {
        const m = ACTIVE_MONITORS.get(taskId);
        if (m && m.status === 'MONITORING') {
            handleViolation(taskId, 'execution_timeout', `Task exceeded timeout of ${m.timeout}ms`);
        }
    }, monitor.timeout);

    res.json({ status: 'monitoring_started', taskId });
});

app.post('/observe/event', (req, res) => {
    const { taskId, eventType, message } = req.body;
    
    logger.warn(`Observer detected event: ${eventType} for task ${taskId}`, { message });
    
    if (['policy_violation', 'infinite_loop_detected'].includes(eventType)) {
        handleViolation(taskId, eventType, message);
    }

    res.json({ recorded: true });
});

function handleViolation(taskId, type, message) {
    logger.error(`CRITICAL_OBSERVER_VIOLATION: ${type} on Task ${taskId}`, { message });
    
    const monitor = ACTIVE_MONITORS.get(taskId);
    if (monitor) monitor.status = 'VIOLATED';

    // In a real system, this would call the Executor to pause/kill
    logger.warn(`ACTION TAKEN: Task ${taskId} has been PAUSED by Observer.`);
}

app.post('/observe/complete', (req, res) => {
    const { taskId } = req.body;
    ACTIVE_MONITORS.delete(taskId);
    res.json({ status: 'monitoring_completed', taskId });
});

const PORT = 3014;
app.listen(PORT, () => {
    logger.info(`Observer Agent Service started on port ${PORT}`);
});
