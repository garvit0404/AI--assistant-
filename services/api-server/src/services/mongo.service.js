const mongoose = require('mongoose');
const { config } = require('../config/env.js');
const logger = require('../utils/logger.js');

let retryCount = 0;
const MAX_BACKOFF = 60000; // Cap backoff at 60 seconds

const connectMongo = async () => {
    try {
        if (!config.MONGO_URL) {
            logger.warn('MONGO_URL not defined, skipping MongoDB connection.');
            return;
        }

        await mongoose.connect(config.MONGO_URL, {
            serverSelectionTimeoutMS: 5000
        });

        logger.info('Connected to MongoDB');
        retryCount = 0; // Reset on success
    } catch (error) {
        logger.error(`MongoDB connection error: ${error.message}`);

        // Exponential backoff
        const backoff = Math.min(1000 * Math.pow(2, retryCount), MAX_BACKOFF);
        retryCount++;

        logger.info(`Retrying MongoDB connection in ${backoff / 1000} seconds...`);
        setTimeout(connectMongo, backoff);
    }
};

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting reconnect flow...');
    // We don't reset retryCount here, to keep using backoff if server is flapping
    const backoff = Math.min(1000 * Math.pow(2, retryCount), MAX_BACKOFF);
    retryCount++;
    setTimeout(connectMongo, backoff);
});

module.exports = connectMongo;
