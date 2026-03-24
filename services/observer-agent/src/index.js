const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://ai_redis:6379';
const redisClient = createClient({ url: REDIS_URL });
redisClient.connect().catch(err => logger.error(`[OBSERVER] Redis error: ${err.message}`));

async function revertToMock(reason) {
    try {
        const currentMode = await redisClient.get('AI_EXECUTION_MODE');
        if (currentMode === 'live') {
            await redisClient.set('AI_EXECUTION_MODE', 'mock');
            logger.warn(`[FAILSAFE] Reverted to MOCK mode due to: ${reason}`);
                if (global.io) {
                    global.io.emit('mode_updated', { mode: 'mock' });
                    global.io.emit('system_alert', {
                        type: 'FAILSAFE_TRIGGERED',
                        message: `System automatically reverted to MOCK mode: ${reason}`
                    });
                }
        }
    } catch (err) {
        logger.error(`[FAILSAFE] Revert failed: ${err.message}`);
    }
}

const app = express();
app.use(bodyParser.json());

// ─── MongoDB ────────────────────────────────────────────────────────────────
const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongodb:27017/ai_os';

mongoose.connect(MONGO_URL)
    .then(() => logger.info(`[OBSERVER] Connected to MongoDB at ${MONGO_URL}`))
    .catch(err => logger.error(`[OBSERVER] MongoDB connection error: ${err.message}`));

// ─── Schemas ─────────────────────────────────────────────────────────────────

/** General pipeline event timeline */
const timelineSchema = new mongoose.Schema({
    taskId:    { type: String, required: true, index: true },
    stage:     { type: String, required: true },
    message:   { type: String, required: true },
    data:      { type: Object, default: {} },
    timestamp: { type: Date, default: Date.now }
});
const Timeline = mongoose.model('Timeline', timelineSchema);

/** Security-specific events for audit and Grafana */
const securityEventSchema = new mongoose.Schema({
    taskId:    { type: String, required: true, index: true },
    eventType: {
        type: String,
        required: true,
        enum: [
            'PERMISSION_REQUESTED', 'PERMISSION_APPROVED', 'PERMISSION_REJECTED',
            'POLICY_VIOLATION', 'EXECUTION_TIMEOUT', 'INFINITE_LOOP_DETECTED',
            'BOUNDARY_CHECK_FAILED', 'UNAUTHORIZED_TOOL', 'RATE_LIMIT_EXCEEDED',
            'GENERAL_EVENT'
        ]
    },
    severity: {
        type: String,
        required: true,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'LOW'
    },
    tool:      { type: String, default: null },
    message:   { type: String, required: true },
    data:      { type: Object, default: {} },
    resolved:  { type: Boolean, default: false },
    tags:      { type: [String], default: [] },
    timestamp: { type: Date, default: Date.now }
});
const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);

/** Knowledge Base for long-term facts extracted from tasks */
const knowledgeSchema = new mongoose.Schema({
    fact:      { type: String, required: true },
    source:    { type: String, default: 'agent_observation' },
    taskId:    { type: String, default: null },
    tags:      { type: [String], default: [] },
    confidence: { type: Number, default: 0.8 },
    timestamp: { type: Date, default: Date.now }
});
const Knowledge = mongoose.model('Knowledge', knowledgeSchema);

// ─── In-memory metrics counters (Prometheus-compatible) ─────────────────────
const metrics = {
    tasks_total:              0,
    tasks_completed:          0,
    tasks_failed:             0,
    security_events_total:    0,
    permission_requests:      0,
    permission_approved:      0,
    permission_rejected:      0,
    policy_violations:        0,
    execution_timeouts:       0,
    tool_executions:          0,
};

function incrementMetric(key, by = 1) {
    if (key in metrics) metrics[key] += by;
}

// ─── Routes: Timeline ────────────────────────────────────────────────────────

app.post('/log', async (req, res) => {
    const { taskId, stage, message, data } = req.body;
    logger.info(`[OBSERVER] Task ${taskId} | ${stage} | ${message}`);

    try {
        // Track global task lifecycle metrics
        if (stage === 'brain' && message.startsWith('Initializing')) incrementMetric('tasks_total');
        if (message.includes('All tasks completed')) incrementMetric('tasks_completed');
        if (stage === 'executor' && message.includes('Execution Failed')) incrementMetric('tasks_failed');
        if (stage === 'executor' && message.includes('completed successfully')) incrementMetric('tool_executions');

        const entry = new Timeline({ taskId, stage, message, data });
        await entry.save();

        if (global.io) global.io.emit('timeline_update', entry);

        return res.json({ taskId, status: 'logged', id: entry._id });
    } catch (error) {
        logger.error(`[OBSERVER] Task ${taskId}: Error logging timeline: ${error.message}`);
        return res.status(500).json({ taskId, status: 'failed', error: error.message });
    }
});

app.get('/timeline/:taskId', async (req, res) => {
    const { taskId } = req.params;
    const history = await Timeline.find({ taskId }).sort({ timestamp: 1 });
    return res.json({ taskId, history });
});

app.get('/timeline', async (req, res) => {
    const { limit = 50, since } = req.query;
    const filter = since ? { timestamp: { $gt: new Date(since) } } : {};
    const history = await Timeline.find(filter)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));
    return res.json({ history: history.reverse() });
});

// ─── Routes: Security Events ──────────────────────────────────────────────────

app.post('/security/log', async (req, res) => {
    const { taskId, eventType, severity, tool, message, data = {}, tags = [] } = req.body;

    if (!taskId || !eventType || !message) {
        return res.status(400).json({ status: 'failed', error: 'taskId, eventType, message required' });
    }

    logger.warn(`[OBSERVER:SECURITY] Task ${taskId} | ${severity || 'LOW'} | ${eventType} | ${message}`);

    try {
        incrementMetric('security_events_total');

        // Map event → specific counters
        if (eventType === 'PERMISSION_REQUESTED') incrementMetric('permission_requests');
        if (eventType === 'PERMISSION_APPROVED')  incrementMetric('permission_approved');
        if (eventType === 'PERMISSION_REJECTED')  incrementMetric('permission_rejected');
        if (eventType === 'POLICY_VIOLATION' || severity === 'CRITICAL') {
            await revertToMock(`${eventType} with ${severity} severity: ${message}`);
            if (eventType === 'POLICY_VIOLATION') incrementMetric('policy_violations');
        }
        if (eventType === 'EXECUTION_TIMEOUT')    incrementMetric('execution_timeouts');

        const event = new SecurityEvent({ taskId, eventType, severity: severity || 'LOW', tool, message, data, tags });
        await event.save();

        if (global.io) global.io.emit('security_event', event);

        return res.json({ status: 'logged', id: event._id, eventType, severity: event.severity });
    } catch (err) {
        logger.error(`[OBSERVER:SECURITY] Failed to log event: ${err.message}`);
        return res.status(500).json({ status: 'failed', error: err.message });
    }
});

app.get('/security/events', async (req, res) => {
    const { limit = 100, severity, resolved, eventType } = req.query;
    const filter = {};
    if (severity)  filter.severity  = severity;
    if (eventType) filter.eventType = eventType;
    if (resolved !== undefined) filter.resolved = resolved === 'true';

    const events = await SecurityEvent.find(filter)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));
    return res.json({ count: events.length, events });
});

app.patch('/security/events/:id/resolve', async (req, res) => {
    const event = await SecurityEvent.findByIdAndUpdate(
        req.params.id,
        { resolved: true },
        { new: true }
    );
    if (!event) return res.status(404).json({ status: 'not_found' });
    return res.json({ status: 'resolved', event });
});

// ─── Routes: Knowledge (Long-term Memory) ──────────────────────────────────────

app.post('/knowledge', async (req, res) => {
    const { fact, source, taskId, tags = [], confidence = 0.8 } = req.body;
    if (!fact) return res.status(400).json({ status: 'failed', error: 'fact is required' });

    try {
        const entry = new Knowledge({ fact, source, taskId, tags, confidence });
        await entry.save();
        logger.info(`[OBSERVER:KNOWLEDGE] New fact recorded: "${fact}"`);
        return res.json({ status: 'recorded', id: entry._id });
    } catch (err) {
        logger.error(`[OBSERVER:KNOWLEDGE] Failed to record fact: ${err.message}`);
        return res.status(500).json({ status: 'failed', error: err.message });
    }
});

app.get('/knowledge', async (req, res) => {
    const { query, tag, limit = 100 } = req.query;
    const filter = {};
    if (query) filter.fact = { $regex: query, $options: 'i' };
    if (tag) filter.tags = tag;

    const facts = await Knowledge.find(filter)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));
    return res.json({ count: facts.length, facts });
});

// ─── Routes: Prometheus Metrics ───────────────────────────────────────────────

app.get('/metrics', (req, res) => {
    const lines = [
        '# HELP ai_os_tasks_total Total tasks processed by brain',
        '# TYPE ai_os_tasks_total counter',
        `ai_os_tasks_total ${metrics.tasks_total}`,

        '# HELP ai_os_tasks_completed Tasks completed successfully',
        '# TYPE ai_os_tasks_completed counter',
        `ai_os_tasks_completed ${metrics.tasks_completed}`,

        '# HELP ai_os_tasks_failed Tasks that failed during execution',
        '# TYPE ai_os_tasks_failed counter',
        `ai_os_tasks_failed ${metrics.tasks_failed}`,

        '# HELP ai_os_tool_executions Total tool execution events',
        '# TYPE ai_os_tool_executions counter',
        `ai_os_tool_executions ${metrics.tool_executions}`,

        '# HELP ai_os_security_events_total Total security events logged',
        '# TYPE ai_os_security_events_total counter',
        `ai_os_security_events_total ${metrics.security_events_total}`,

        '# HELP ai_os_permission_requests Permission requests raised',
        '# TYPE ai_os_permission_requests counter',
        `ai_os_permission_requests ${metrics.permission_requests}`,

        '# HELP ai_os_permission_approved Permissions approved by human',
        '# TYPE ai_os_permission_approved counter',
        `ai_os_permission_approved ${metrics.permission_approved}`,

        '# HELP ai_os_permission_rejected Permissions rejected by human',
        '# TYPE ai_os_permission_rejected counter',
        `ai_os_permission_rejected ${metrics.permission_rejected}`,

        '# HELP ai_os_policy_violations Security policy violations detected',
        '# TYPE ai_os_policy_violations counter',
        `ai_os_policy_violations ${metrics.policy_violations}`,

        '# HELP ai_os_execution_timeouts Tasks that exceeded execution timeout',
        '# TYPE ai_os_execution_timeouts counter',
        `ai_os_execution_timeouts ${metrics.execution_timeouts}`,
    ];

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(lines.join('\n') + '\n');
});

// ─── Routes: Health ───────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    res.json({
        status: 'ok',
        db: dbState === 1 ? 'connected' : 'disconnected',
        metrics
    });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3014;
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`[OBSERVER] Service started on port ${PORT} (Bound to 0.0.0.0)`);
});
