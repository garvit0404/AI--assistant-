const { getAIResponse } = require('../services/ai.service.js');
const logger = require('../utils/logger.js');

const SYSTEM_PROMPT = `You are a security policy validator and execution planner inside an AI operating system.

Your task is to inspect a requested action and determine whether it is safe to execute inside a sandboxed workspace.

You NEVER execute actions.
You ONLY validate policies and produce an execution plan.

CRITICAL OUTPUT RULES
1. Output MUST be valid JSON.
2. Do not include explanations outside JSON.
3. Do not include markdown.
4. Do not include comments.
5. Output exactly one JSON object.

SECURITY MODEL
All operations must occur strictly inside:
workspace/
Any operation targeting outside this directory must be blocked.

POLICY CHECKS
PATH TRAVERSAL
Block any path containing:
../
..
absolute system paths
/etc
/system
C:\\Windows

WORKSPACE BOUNDARY
Allowed paths must start with:
workspace/
If not → BLOCK.

FILE TYPE RESTRICTIONS
Potentially dangerous files include:
.sh, .bat, .ps1, .system, .dll, .exe
If these appear and the intent involves execution or modification, classify as BLOCKED.

EXECUTION TYPES
Allowed execution categories:
file_creation, code_generation, api_call, automation_task, read_file, write_file

OUTPUT SCHEMA
{
  "intent": string,
  "target_path": string | null,
  "execution_type": "file_creation" | "code_generation" | "api_call" | "automation_task" | "read_file" | "write_file" | "none",
  "policy_decision": "ALLOW" | "REJECT",
  "violations": string[],
  "safe_workspace_path": string | null,
  "confidence": number
}`;

/**
 * AI Security Policy Validator
 * Inspects a parsed intent against security constraints.
 */
const validatePolicy = async (intentJson) => {
    logger.info(`Validating policy for intent: ${intentJson.intent}`);

    const userPrompt = `Validate the following AI action against security policies.\n\nAction JSON:\n${JSON.stringify(intentJson, null, 2)}\n\nReturn only JSON.`;

    try {
        const response = await getAIResponse(userPrompt, SYSTEM_PROMPT);
        const rawContent = response.choices[0].message.content.trim();

        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        const raw = jsonMatch ? jsonMatch[0] : rawContent;

        const parsed = JSON.parse(raw);
        logger.info(`LLM Policy Decision: Intent='${parsed.intent}', Decision='${parsed.policy_decision}', Confidence=${parsed.confidence}`);

        return {
            intent: parsed.intent || intentJson.intent,
            target_path: parsed.target_path || intentJson.target || null,
            execution_type: parsed.execution_type || "none",
            policy_decision: parsed.policy_decision || "REJECT",
            violations: Array.isArray(parsed.violations) ? parsed.violations : ["LLM_classification_error"],
            safe_workspace_path: parsed.safe_workspace_path || null,
            confidence: parsed.confidence || 0
        };
    } catch (err) {
        logger.error(`AI Policy Validation failure: ${err.message}`);
        return {
            intent: intentJson.intent,
            target_path: intentJson.target || null,
            execution_type: "none",
            policy_decision: "REJECT",
            violations: [`Validation failure: ${err.message}`],
            safe_workspace_path: null,
            confidence: 0
        };
    }
};

module.exports = {
    validatePolicy
};
