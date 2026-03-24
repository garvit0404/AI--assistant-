const { getAIResponse } = require('../services/ai.service.js');
const logger = require('../utils/logger.js');

const SYSTEM_PROMPT = `You are a security permission classifier inside an AI operating system.

Your task is to evaluate the security level of a requested AI action.

You DO NOT execute actions.
You ONLY classify permission levels.

CRITICAL RULES
1. Output MUST be valid JSON.
2. Do not include explanations.
3. Do not include markdown.
4. Do not include comments.
5. Output a single JSON object only.

SECURITY MODEL
Permission Levels:
SAFE, MEDIUM, HIGH, CRITICAL

Definitions:
SAFE: Informational actions that cannot modify system state.
MEDIUM: Operations that read or write within the workspace sandbox.
HIGH: Operations that modify files or resources that could affect system behavior.
CRITICAL: Operations that attempt system-level access, host control, network abuse, or privilege escalation.

POLICY RULES
If the action attempts:
- host system access
- OS commands
- network exploitation
- environment secrets access
- root privileges
Then classify as CRITICAL.

If the action deletes files or modifies important workspace resources → HIGH.
If the action reads or writes within workspace safely → MEDIUM.
If the action is informational only → SAFE.

OUTPUT SCHEMA
{
  "intent": string,
  "permission_level": "SAFE" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reason": string,
  "requires_confirmation": boolean,
  "confidence": number
}`;

/**
 * AI Permission Classifier
 * Uses LLM to determine the security risk of a parsed intent.
 */
const classifyPermission = async (intentJson) => {
    logger.info(`Classifying permission for intent: ${intentJson.intent}`);

    const userPrompt = `Evaluate the security permission level of the following AI action.\n\nAction JSON:\n${JSON.stringify(intentJson, null, 2)}\n\nReturn only JSON.`;

    try {
        const response = await getAIResponse(userPrompt, SYSTEM_PROMPT);
        const rawContent = response.choices[0].message.content.trim();

        // Attempt to extract JSON
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        const raw = jsonMatch ? jsonMatch[0] : rawContent;

        const parsed = JSON.parse(raw);
        logger.info(`LLM Security Classification: Intent='${parsed.intent}', Level='${parsed.permission_level}', Confidence=${parsed.confidence}`);

        return {
            intent: parsed.intent || intentJson.intent,
            permission_level: parsed.permission_level || "CRITICAL",
            reason: parsed.reason || "Automatic fall-through to safest state.",
            requires_confirmation: parsed.requires_confirmation ?? true,
            confidence: parsed.confidence || 0
        };
    } catch (err) {
        logger.error(`AI Security Classification failure: ${err.message}`);

        // Fallback if LLM fails
        return {
            intent: intentJson.intent,
            permission_level: "CRITICAL",
            reason: `Classification failure: ${err.message}`,
            requires_confirmation: true,
            confidence: 0
        };
    }
};

module.exports = {
    classifyPermission
};
