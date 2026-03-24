require('dotenv').config({ path: '../../.env' });

/**
 * Smart Host Transformation
 * When running natively on Windows (npm run dev), Docker service names like 'redis' 
 * are not resolvable. This helper swaps them to 'localhost' for local development
 * without affecting the Docker environment (which runs on Linux).
 */
const transformUrl = (url) => {
    if (!url || process.platform !== 'win32') return url;
    return url.replace(/:\/\/redis(:|\/|$)/, '://localhost$1')
        .replace(/:\/\/mongodb(:|\/|$)/, '://localhost$1')
        .replace(/@redis(:|\/|$)/, '@localhost$1')
        .replace(/@mongodb(:|\/|$)/, '@localhost$1');
};

let portsConfig = {};
try {
    portsConfig = require('../../../config/ports.js');
} catch (err) {
    try {
        portsConfig = require('../../../../config/ports.js');
    } catch (e) {
        console.warn('Warning: Could not find centralized ports.js, falling back to defaults.');
    }
}

module.exports = {
    config: {
        PORT: process.env.API_PORT || portsConfig.API_PORT || 3001,
        MONGO_URL: transformUrl(process.env.MONGO_URI || process.env.MONGO_URL),
        REDIS_URL: transformUrl(process.env.REDIS_URL || `redis://redis:${portsConfig.REDIS_PORT || 6379}`),
        OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
        AI_MODE: process.env.AI_MODE || 'mock',
        AI_EXECUTION_MODE: process.env.AI_EXECUTION_MODE || 'mock',
        NODE_ENV: process.env.NODE_ENV || 'production'
    }
};
