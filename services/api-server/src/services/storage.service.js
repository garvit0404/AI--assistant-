const mongoose = require('mongoose');
const { createClient } = require('redis');
const { config } = require('../config/env.js');
const logger = require('../utils/logger.js');

let redisClient;

const initRedis = async () => {
    if (redisClient) return redisClient;
    try {
        redisClient = createClient({ url: config.REDIS_URL });
        redisClient.on('error', (err) => logger.error('Redis Client Error', err));
        await redisClient.connect();
        logger.info('Storage Service: Redis connection established.');
        return redisClient;
    } catch (err) {
        logger.error(`Storage Service: Redis initialization failed: ${err.message}`);
        return null;
    }
};

/**
 * Executes a memory storage plan.
 * Enforces backend safety checks.
 */
const executeMemoryPlan = async (plan, payload) => {
    const { memory_type, collection_or_key, operation, ttl_seconds } = plan;

    if (memory_type === 'none') return { status: 'skipped', reason: plan.reason };

    try {
        // 1. Redis Path
        if (memory_type === 'redis') {
            const client = await initRedis();
            if (!client) throw new Error('Redis not available');

            // Sanitize key namespace
            const safeKey = collection_or_key.startsWith('session:') || collection_or_key.startsWith('task:')
                ? collection_or_key
                : `tmp:${collection_or_key}`;

            if (operation === 'set' || operation === 'update') {
                await client.set(safeKey, JSON.stringify(payload), {
                    EX: ttl_seconds || 3600
                });
            }
            return { status: 'success', layer: 'redis', key: safeKey };
        }

        // 2. MongoDB Path
        if (memory_type === 'mongodb') {
            if (mongoose.connection.readyState !== 1) throw new Error('MongoDB not connected');

            // Collection Allowlist Check
            const allowedCollections = ['chat_logs', 'task_history', 'execution_logs', 'audit_logs', 'system_events'];
            if (!allowedCollections.includes(collection_or_key)) {
                throw new Error(`Unauthorized collection access: ${collection_or_key}`);
            }

            const db = mongoose.connection.db;
            if (operation === 'insert' || operation === 'append') {
                await db.collection(collection_or_key).insertOne({
                    ...payload,
                    createdAt: new Date()
                });
            }
            return { status: 'success', layer: 'mongodb', collection: collection_or_key };
        }

    } catch (err) {
        logger.error(`Storage execution failed: ${err.message}`);
        return { status: 'failed', error: err.message };
    }
};

module.exports = {
    executeMemoryPlan
};
