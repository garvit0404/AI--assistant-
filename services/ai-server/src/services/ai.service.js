const OpenAI = require('openai');
const { config } = require('../config/env.js');
const logger = require('../utils/logger.js');

const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY || 'dummy_key'
});

const getAIResponse = async (prompt, systemPrompt = 'You are a helpful assistant.') => {
    try {
        if (config.AI_MODE === 'mock') {
            logger.info('AI Service: Mock response generated.');
            return {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            intent: 'generate_code',
                            language: 'nodejs',
                            task: 'hello-world'
                        })
                    }
                }]
            };
        }

        const response = await openai.chat.completions.create({
            model: config.OPENAI_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        return response;
    } catch (error) {
        logger.error(`AI Service Error: ${error.message}`);
        throw new Error(`AI communication failed: ${error.message}`);
    }
};

module.exports = { getAIResponse };
