const { z } = require('zod');
const { getAIResponse } = require('../services/ai.service.js');
const logger = require('../utils/logger.js');

/**
 * Intent taxonomy validation schema using Zod
 */
const IntentSchema = z.object({
    intent: z.enum([
        "FILE_WRITE",
        "FILE_READ",
        "FILE_DELETE",
        "SYSTEM_EXEC",
        "WEB_SEARCH",
        "HTTP_FETCH",
        "GENERAL_CHAT",
        "LLM_GENERATION",
        "unknown"
    ]),
    language: z.string().nullable(),
    type: z.string().nullable(),
    target: z.string().nullable(),
    command: z.string().nullable(),
    confidence: z.number().min(0).max(1)
});

const SYSTEM_PROMPT = `You are an intent parser for an AI system.

Your job is to convert natural language user requests into structured JSON instructions.

CRITICAL RULES:
1. Output MUST be valid JSON.
2. DO NOT include explanations.
3. DO NOT include markdown.
4. DO NOT include comments.
5. Output only the JSON object.

SECURITY RULES:
- Never invent actions.
- Only extract intents that are explicitly stated.
- If the request is ambiguous or unsafe, return intent = "unknown".

INTENT TAXONOMY:
Allowed intents:
FILE_WRITE: Use ONLY if the user explicitly wants to save/store/write to a physical file (e.g., "save to file.js", "write code into app.py").
LLM_GENERATION: Use for requests to "generate", "create code", "example of", "explain", or "write function" where no specific save target is mentioned.
FILE_READ, FILE_DELETE, SYSTEM_EXEC, WEB_SEARCH, HTTP_FETCH, GENERAL_CHAT, unknown

FIELDS:
intent: string
language: string | null
type: string | null
target: string | null
command: string | null
confidence: number (0-1)`;

/**
 * Few-shot examples to improve intent accuracy
 */
const FEW_SHOT_EXAMPLES = `
Examples:
User: "Generate a linked list in python"
Output: { "intent":"LLM_GENERATION", "language":"python", "type":"code", "target":null, "command":null, "confidence":0.98 }

User: "Save this script to hello.js"
Output: { "intent":"FILE_WRITE", "language":"javascript", "type":"script", "target":"hello.js", "command":null, "confidence":0.95 }

User: "Delete the logs folder"
Output: { "intent":"FILE_DELETE", "language":null, "type":"directory", "target":"logs", "command":null, "confidence":0.92 }

User: "Search for the latest Next.js features"
Output: { "intent":"WEB_SEARCH", "language":null, "type":"search", "target":null, "command":"latest Next.js features", "confidence":0.96 }

User: "Hello, how are you?"
Output: { "intent":"GENERAL_CHAT", "language":null, "type":null, "target":null, "command":null, "confidence":0.99 }
`;

/**
 * Core parsing function using OpenAI and Zod validation
 */
async function parseIntent(userInput) {
    logger.info(`Parsing intent for message: "${userInput}"`);

    const fullPrompt = `${FEW_SHOT_EXAMPLES}\n\nParse the following user request into structured JSON.\n\nUser request:\n"${userInput}"`;

    try {
        const response = await getAIResponse(fullPrompt, SYSTEM_PROMPT);
        const rawContent = response.choices[0].message.content.trim();

        // Attempt to extract JSON even if model includes some extra text (though prompt says don't)
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        const raw = jsonMatch ? jsonMatch[0] : rawContent;

        const parsed = JSON.parse(raw);
        const validated = IntentSchema.parse(parsed);

        return validated;
    } catch (err) {
        logger.error(`Intent parser failure: ${err.message}`);
        throw err;
    }
}

/**
 * Fallback system to handle failures safely
 */
async function safeIntentParse(input) {
    try {
        return await parseIntent(input);
    } catch (err) {
        return {
            intent: "unknown",
            language: null,
            type: null,
            target: null,
            command: null,
            confidence: 0
        };
    }
}

module.exports = {
    parseIntent,
    safeIntentParse,
    IntentSchema
};
