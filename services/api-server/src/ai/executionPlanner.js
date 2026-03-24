const { getAIResponse } = require('../services/ai.service.js');
const logger = require('../utils/logger.js');

const SYSTEM_PROMPT = `You are the execution planner for an AI system.

Your responsibility is to transform an approved AI action into a secure execution plan that can be safely executed by the backend.

You DO NOT directly execute operations.
You ONLY generate structured execution instructions.

CRITICAL OUTPUT RULES
1. Output MUST be valid JSON.
2. Do not include explanations outside JSON.
3. Do not include markdown.
4. Do not include comments.
5. Output exactly one JSON object.

EXECUTION SANDBOX
All operations must occur strictly inside:
workspace/
Any attempt to operate outside this directory must be rejected.

TARGET OPERATING SYSTEMS
Execution must be compatible with:
Windows, macOS, Linux, Unix
Avoid OS-specific shell commands whenever possible.
Prefer filesystem APIs and cross-platform abstractions.

EXECUTION TYPES
Allowed execution types:
file_creation, code_generation, api_call, automation_task, read_file, write_file
If execution does not match these types, mark execution_type as "none".

SECURITY PRINCIPLES
* Prevent path traversal
* Prevent arbitrary command execution
* Sanitize file paths
* Avoid OS shell injection
* Validate all inputs
* Never access system directories
* Never expose secrets

CODE GENERATION SECURITY REQUIREMENTS
When generating code:
* Follow industry production standards (OWASP)
* Enforce secure coding (XSS, SQLi, Command Injection prevention)
* Sanitize inputs and escape output

OUTPUT SCHEMA
{
  "intent": string,
  "execution_type": "file_creation" | "code_generation" | "api_call" | "automation_task" | "read_file" | "write_file" | "none",
  "approved_workspace_path": string | null,
  "execution_plan": [
    {
      "step": number,
      "tool": "filesystem" | "code_generator" | "task_executor",
      "operation": string,
      "path": string | null,
      "description": string
    }
  ],
  "security_checks": string[],
  "confidence": number
}`;

/**
 * AI Execution Planner
 * Transforms an approved action into a secure, tool-specific execution plan.
 */
const generateExecutionPlan = async (intentData, policyResult) => {
    logger.info(`Generating secure execution plan for: ${intentData.intent}`);

    const userPrompt = `Generate a secure execution plan for the following approved action.

Approved Action JSON:
${JSON.stringify({
        intent: intentData.intent,
        target_path: policyResult.safe_workspace_path || policyResult.target_path,
        language: intentData.language,
        type: intentData.type,
        command: intentData.command
    }, null, 2)}

Return only JSON.`;

    try {
        const response = await getAIResponse(userPrompt, SYSTEM_PROMPT);
        const rawContent = response.choices[0].message.content.trim();

        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        const raw = jsonMatch ? jsonMatch[0] : rawContent;

        const parsed = JSON.parse(raw);
        logger.info(`Execution Plan Generated: Steps=${parsed.execution_plan ? parsed.execution_plan.length : 0}, Confidence=${parsed.confidence}`);

        return parsed;
    } catch (err) {
        logger.error(`Execution Planning failure: ${err.message}`);
        // Secure Fallback: Return empty plan if LLM fails
        return {
            intent: intentData.intent,
            execution_type: "none",
            approved_workspace_path: null,
            execution_plan: [],
            security_checks: ["llm_planning_failed"],
            confidence: 0
        };
    }
};

module.exports = {
    generateExecutionPlan
};
