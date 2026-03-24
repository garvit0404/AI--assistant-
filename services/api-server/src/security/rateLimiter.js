const logger = require('../utils/logger.js');

/**
 * Basic Redis-based Rate Limiter.
 * Uses a simple fixed window counter for demonstration.
 */
const checkRateLimit = async (redisClient, identifier, limit = 10, windowSeconds = 60) => {
    if (!redisClient || !redisClient.isReady) {
        logger.warn('Rate Limiter: Redis not available. Bypassing check.');
        return { allowed: true, remaining: -1 };
    }

    const key = `rate_limit:${identifier}`;

    try {
        const current = await redisClient.incr(key);

        if (current === 1) {
            await redisClient.expire(key, windowSeconds);
        }

        if (current > limit) {
            logger.warn(`Rate Limiter BLOCKED: ${identifier} has exceeded ${limit} requests/${windowSeconds}s.`);
            return { allowed: false, remaining: 0, current, limit };
        }

        return { allowed: true, remaining: limit - current, current, limit };
    } catch (error) {
        logger.error(`Rate Limiter error: ${error.message}`);
        // Default to allow in case of failures (avoid locking system)
        return { allowed: true, error: true };
    }
};

module.exports = { checkRateLimit };
