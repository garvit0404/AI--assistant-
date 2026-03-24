const { createClient } = require('redis');
const { config } = require('../config/env.js');
const logger = require('../utils/logger.js');

const redisClient = createClient({
    url: config.REDIS_URL
});

redisClient.on('error', (err) => logger.error(`Redis Client Error: ${err}`));
redisClient.on('connect', () => logger.info('Connecting to Redis...'));
redisClient.on('ready', () => logger.info('Redis Client Ready'));

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        logger.error(`Failed to connect to Redis: ${error.message}`);
        setTimeout(connectRedis, 5000);
    }
};

module.exports = { redisClient, connectRedis };
