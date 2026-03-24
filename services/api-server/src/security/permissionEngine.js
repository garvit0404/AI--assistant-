const { redisClient } = require('../services/redis.service.js');
const logger = require('../utils/logger.js');
const timelineService = require('../services/timeline.service.js');
const telegramService = require('../services/telegram.service.js');
const { v4: uuidv4 } = require('uuid');

const RISK_LEVELS = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};

const TOOL_RISK_MAP = {
    'browse_web': RISK_LEVELS.LOW,
    'search_docs': RISK_LEVELS.LOW,
    'read_file': RISK_LEVELS.MEDIUM,
    'api_fetch': RISK_LEVELS.MEDIUM,
    'write_file': RISK_LEVELS.HIGH,
    'send_telegram': RISK_LEVELS.HIGH,
    'execute_script': RISK_LEVELS.HIGH,
    'delete_file': RISK_LEVELS.CRITICAL,
    'system_command': RISK_LEVELS.CRITICAL,
    'docker_run': RISK_LEVELS.CRITICAL
};

class PermissionEngine {
    getRiskLevel(tool, operation) {
        // More specific matching if needed
        if (tool === 'filesystem') {
            if (operation === 'read_file') return RISK_LEVELS.MEDIUM;
            if (operation === 'write_file' || operation === 'create_file') return RISK_LEVELS.HIGH;
            if (operation === 'delete_file') return RISK_LEVELS.CRITICAL;
        }
        return TOOL_RISK_MAP[tool] || RISK_LEVELS.LOW;
    }

    async requestPermission(taskId, stepId, tool, operation, parameters) {
        const riskLevel = this.getRiskLevel(tool, operation);

        if (riskLevel === RISK_LEVELS.LOW) {
            logger.info(`Auto-approving LOW risk tool: ${tool}`);
            return { status: 'approved', riskLevel };
        }

        const requestId = uuidv4();
        const request = {
            id: requestId,
            taskId,
            stepId,
            tool,
            operation,
            parameters,
            riskLevel,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Store in Redis with expiration (e.g., 1 hour)
        await redisClient.set(`perm:${requestId}`, JSON.stringify(request), { EX: 3600 });
        
        // Also index by taskId for quick lookup
        await redisClient.sAdd(`task_perms:${taskId}`, requestId);

        await timelineService.log(taskId, 'permission_engine', `Permission requested for ${tool}.${operation} (${riskLevel})`, { requestId });

        // Broadcast to UI/Telegram
        if (global.io) {
            global.io.emit('permission_requested', request);
        }

        if (riskLevel === RISK_LEVELS.HIGH || riskLevel === RISK_LEVELS.CRITICAL) {
            await telegramService.sendPermissionRequest(request);
        }

        return { status: 'pending', requestId, riskLevel };
    }

    async approvePermission(requestId, validation = {}) {
        const data = await redisClient.get(`perm:${requestId}`);
        if (!data) throw new Error('Permission request not found or expired');

        const request = JSON.parse(data);
        
        // Security Check: Verify taskId if provided
        if (validation.taskId && request.taskId !== validation.taskId) {
            throw new Error('Unauthorized approval attempt: taskId mismatch');
        }

        request.status = 'approved';
        request.updatedAt = new Date().toISOString();

        await redisClient.set(`perm:${requestId}`, JSON.stringify(request), { EX: 3600 });
        
        await timelineService.log(request.taskId, 'permission_engine', `Permission approved for ${request.tool}.${request.operation}`, { requestId });

        if (global.io) {
            global.io.emit('permission_updated', request);
        }

        return request;
    }

    async rejectPermission(requestId) {
        const data = await redisClient.get(`perm:${requestId}`);
        if (!data) throw new Error('Permission request not found or expired');

        const request = JSON.parse(data);
        request.status = 'rejected';
        request.updatedAt = new Date().toISOString();

        await redisClient.set(`perm:${requestId}`, JSON.stringify(request), { EX: 3600 });
        
        await timelineService.log(request.taskId, 'permission_engine', `Permission rejected for ${request.tool}.${request.operation}`, { requestId });

        if (global.io) {
            global.io.emit('permission_updated', request);
        }

        return request;
    }

    async getPendingPermissions() {
        const keys = await redisClient.keys('perm:*');
        const pending = [];
        for (const key of keys) {
            const data = await redisClient.get(key);
            if (data) {
                const req = JSON.parse(data);
                if (req.status === 'pending') pending.push(req);
            }
        }
        return pending;
    }

    async checkStatus(requestId) {
        const data = await redisClient.get(`perm:${requestId}`);
        if (!data) return null;
        return JSON.parse(data).status;
    }
}

module.exports = new PermissionEngine();
