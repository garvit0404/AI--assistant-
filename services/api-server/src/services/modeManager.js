const { redisClient } = require('./redis.service.js');
const logger = require('../utils/logger.js');

class ModeManager {
    constructor() {
        this.fallbackMode = process.env.AI_MODE || 'mock';
        this.cacheKey = 'AI_EXECUTION_MODE';
        logger.info(`ModeManager initialized with default fallback: ${this.fallbackMode}`);
    }

    async getMode() {
        try {
            // Attempt to fetch from Redis
            if (redisClient && redisClient.isReady) {
                const mode = await redisClient.get(this.cacheKey);
                if (mode) return mode;
            }
        } catch (err) {
            logger.error(`ModeManager: Error reading from Redis: ${err.message}`);
        }
        
        // Fallback to in-memory/env
        return this.fallbackMode;
    }

    async setMode(mode) {
        if (!['mock', 'live'].includes(mode)) {
            throw new Error(`Invalid mode: ${mode}. Must be 'mock' or 'live'.`);
        }

        try {
            // Update Redis
            if (redisClient && redisClient.isReady) {
                await redisClient.set(this.cacheKey, mode);
            }
            
            // Update internal fallback for consistency
            this.fallbackMode = mode;
            logger.info(`ModeManager: System mode updated to ${mode}`);
            return true;
        } catch (err) {
            logger.error(`ModeManager: Error saving mode: ${err.message}`);
            this.fallbackMode = mode; // Store in memory anyway
            return false;
        }
    }
}

// Export a singleton instance
module.exports = new ModeManager();
