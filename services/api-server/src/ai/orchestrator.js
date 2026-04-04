const { safeIntentParse } = require('./intentParser.js');
const { generateExecutionPlan } = require('./executionPlanner.js');
const { evaluatePermission } = require('../security/permissionEvaluator.js');
const { validatePolicy } = require('./policyValidator.js');
const { enforceDeterministicPolicy } = require('../security/policyGuard.js');
const { executeIntent } = require('../execution/executionManager.js');
const { planMemoryStorage } = require('./memoryManager.js');
const { executeMemoryPlan } = require('../services/storage.service.js');
const { analyzeSecurityHardening } = require('./securityAnalyzer.js');
const { getAIResponse } = require('../services/ai.service.js');
const logger = require('../utils/logger.js');
const { v4: uuidv4 } = require('uuid');
const timelineService = require('../services/timeline.service.js');

/**
 * Orchestrator Agent
 * Coordinates the multi-agent workflow: Planner -> Executor -> Observer
 */
class Orchestrator {
    constructor(app) {
        this.app = app;
    }

    async runTask(userPrompt, clientIp, userId = 'default_user') {
        const taskId = `task_${uuidv4().substring(0, 8)}`;
        logger.info(`Orchestrator: Starting task ${taskId} for user ${userId} with prompt: "${userPrompt}"`);
        await timelineService.log(taskId, 'intent_parser', `Processing intent for: "${userPrompt}"`);

        const trace = {
            taskId,
            steps: [],
            startTime: new Date()
        };

        try {
            // TASK 8: Log original user input
            await timelineService.log(taskId, 'input', userPrompt, { status: 'running', userId });

            // 1. INTENT PARSER
            await timelineService.log(taskId, 'intent_parser', 'Analyzing intent...', { status: 'running' });
            const intent = await safeIntentParse(userPrompt);
            trace.steps.push({ agent: 'planner', action: 'intent_parse', result: intent });
            await timelineService.log(taskId, 'intent_parser', `Intent parsed: ${intent.intent}`, { status: 'success', metadata: intent });

            // Special Case: General Chat
            if (intent.intent === 'GENERAL_CHAT') {
                await timelineService.log(taskId, 'orchestrator', 'General chat response generated', { status: 'success' });
                const response = await getAIResponse(userPrompt, 'You are a helpful AI assistant. Answer short and concise.', userId, false);
                const content = response.choices[0].message.content;
                return {
                    success: true,
                    taskId,
                    trace,
                    intent: intent.intent,
                    riskLevel: 'LOW',
                    response: content,
                    status: 'success'
                };
            }

            // 2. POLICY ENGINE
            await timelineService.log(taskId, 'policy_engine', 'Evaluating safety policy...', { status: 'running' });
            const policy = await validatePolicy({ prompt: userPrompt, intent, userId });
            trace.steps.push({ agent: 'policy_engine', action: 'validate', result: policy });
            await timelineService.log(taskId, 'policy_engine', `Policy valid: ${policy.policy_decision === 'ALLOW'}`, { status: 'success' });

            if (policy.policy_decision !== 'ALLOW') {
                const reason = policy.violations ? (Array.isArray(policy.violations) ? policy.violations.join(', ') : policy.violations) : 'Unknown violation';
                await timelineService.log(taskId, 'policy_engine', `DENIED: ${reason}`, { status: 'failed' });
                return {
                    success: false,
                    taskId,
                    error: `Policy Denied: ${reason}`,
                    intent: intent.intent || "unknown",
                    riskLevel: policy.risk_level || "CRITICAL",
                    response: `I'm sorry, I cannot perform that action. ${reason}`,
                    trace
                };
            }

            // 3. EXECUTION PLANNER
            await timelineService.log(taskId, 'planner', 'Generating execution plan...', { status: 'running' });
            const plan = await generateExecutionPlan(intent, policy);
            trace.steps.push({ agent: 'planner', action: 'plan', result: plan });
            await timelineService.log(taskId, 'planner', `Plan generated with ${plan.execution_plan ? plan.execution_plan.length : 0} steps`, { status: 'success' });

            // 4. SECURITY AUDITOR
            await timelineService.log(taskId, 'security_auditor', 'Reviewing security hardening...', { status: 'running' });
            const hardening = await analyzeSecurityHardening({ intent, execution: {} });
            trace.steps.push({ agent: 'security_auditor', action: 'hardening_analysis', result: hardening });
            await timelineService.log(taskId, 'security_auditor', 'Security audit complete', { status: 'success' });

            // 5. EXECUTOR MANAGER
            await timelineService.log(taskId, 'executor', 'Beginning execution flow...', { status: 'running' });
            const execution = await executeIntent(taskId, { 
                ...intent, 
                originalMessage: userPrompt 
            }, plan);
            
            trace.steps.push({ agent: 'executor', action: 'execute', result: execution });

            // Output Filter -> Prevents leaking sensitive tokens/paths
            const sanitize = (text) => {
                if (typeof text !== 'string') return text;
                return text.replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED API KEY]')
                           .replace(/\/etc\/[a-zA-Z0-9_\-\/]+/g, '[REDACTED SYSTEM PATH]')
                           .replace(/(password|secret|token)\s*=\s*['"][^'"]+['"]/gi, '$1="[REDACTED]"');
            };

            const rawOutput = execution.output || execution.message || "Execution completed";
            const output = sanitize(rawOutput);

            console.log("ORCHESTRATOR OUTPUT:", output);
            
            // TASK 9: If executor failed, ensure this is returned correctly
            if (execution.status === 'failed' || execution.success === false) {
                 await timelineService.log(taskId, 'executor', `Failed: ${execution.error}`, { status: 'failed', tool: execution.tool });
                 return {
                    success: false,
                    taskId,
                    error: execution.error,
                    tool: execution.tool,
                    step: "executor",
                    intent: intent.intent || "unknown",
                    riskLevel: policy.risk_level || "CRITICAL",
                    response: output,
                    trace
                 };
            }

            await timelineService.log(taskId, 'executor', 'Execution completed', { status: 'success' });
            
            return {
                success: true,
                taskId, 
                trace,
                intent: intent.intent || "unknown",
                riskLevel: policy.risk_level || "LOW",
                response: output,
                status: execution.status,
                meta: execution.results 
            };

        } catch (error) {
            logger.error(`Orchestrator Error: ${error.message}`);
            trace.steps.push({ agent: 'orchestrator', action: 'error', result: error.message });
            await timelineService.log(taskId, 'orchestrator', `ERROR: ${error.message}`, { status: 'failed', error: error.message, stack: error.stack });

            return {
                success: false,
                taskId: taskId || `err_${Date.now()}`,
                error: error.message,
                intent: "unknown",
                riskLevel: "CRITICAL",
                response: `Orchestrator Error: ${error.message}`,
                trace
            };
        }
    }
}

module.exports = Orchestrator;
