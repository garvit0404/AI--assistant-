require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error("**************************************************");
    console.error("CRITICAL SECURITY ERROR: OPENAI_API_KEY IS MISSING");
    console.error("AI-Brain cannot function without an API key.");
    console.error("Check your root .env file.");
    console.error("**************************************************");
    process.exit(1);
}

const PORT = process.env.BRAIN_PORT || 3003;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

module.exports = {
    OPENAI_API_KEY: OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
    AI_MODE: process.env.AI_MODE || 'mock',
    PORT: PORT,
    REDIS_URL: REDIS_URL
};
