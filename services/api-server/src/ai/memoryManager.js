const { getAIResponse } = require('../services/ai.service.js');
const logger = require('../utils/logger.js');

const SYSTEM_PROMPT = `You are the memory manager for an AI system.

Your responsibility is to determine how information should be stored in the system memory architecture.

You DO NOT store data.
You ONLY decide the correct storage layer and produce a structured storage plan.

CRITICAL OUTPUT RULES
1. Output MUST be valid JSON.
2. Do not include explanations outside JSON.
3. Do not include markdown.
4. Do not include comments.
5. Output exactly one JSON object.

MEMORY ARCHITECTURE
REDIS (Short-term): session context, temporary prompts, active task queues, intermediate execution data.
MONGODB (Persistent): chat history, task history, execution logs, audit logs.

STORAGE DECISION RULES
Use Redis if temporary, session-related, or frequently updated.
Use MongoDB if historical, audit-related, or long-term state.

SECURITY RULES
Never store system secrets, API keys, or credentials.

OUTPUT SCHEMA
{
  "memory_type": "redis" | "mongodb" | "none",
  "collection_or_key": string | null,
  "operation": "set" | "update" | "append" | "insert" | "none",
  "data_category": string,
  "ttl_seconds": number | null,
  "reason": string,
  "confidence": number
}`;

/**
 * AI Memory Manager
 * Decides the storage strategy for any given data payload.
 */
const planMemoryStorage = async (payload) => {
    logger.info(`Planning memory storage for category: ${payload.type || 'unknown'}`);

    const userPrompt = `Determine the appropriate memory storage strategy for the following data.

Data:
${JSON.stringify(payload, null, 2)}

Return only JSON.`;

    try {
        const response = await getAIResponse(userPrompt, SYSTEM_PROMPT);
        const rawContent = response.choices[0].message.content.trim();

        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        const raw = jsonMatch ? jsonMatch[0] : rawContent;

        const parsed = JSON.parse(raw);
        logger.info(`Memory Decision: Layer='${parsed.memory_type}', Target='${parsed.collection_or_key}', Confidence=${parsed.confidence}`);

        return parsed;
    } catch (err) {
        logger.error(`Memory Planning failure: ${err.message}`);
        return {
            memory_type: "none",
            collection_or_key: null,
            operation: "none",
            data_category: "error_fallback",
            ttl_seconds: null,
            reason: `Planning failure: ${err.message}`,
            confidence: 0
        };
    }
};

module.exports = {
    planMemoryStorage
};
