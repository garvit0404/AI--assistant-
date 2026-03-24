const { safeIntentParse } = require('./intentParser.js');
const { generateExecutionPlan } = require('./executionPlanner.js');
const { evaluatePermission } = require('../security/permissionEvaluator.js');
const { validatePolicy } = require('./policyValidator.js');
const { enforceDeterministicPolicy } = require('../security/policyGuard.js');
const { executeIntent } = require('../execution/executionManager.js');
const { planMemoryStorage } = require('./memoryManager.js');
const { executeMemoryPlan } = require('../services/storage.service.js');
const { analyzeSecurityHardening } = require('./securityAnalyzer.js');
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

    async runTask(userPrompt, clientIp) {
        const taskId = `task_${uuidv4().substring(0, 8)}`;
        logger.info(`Orchestrator: Starting task ${taskId} for prompt: "${userPrompt}"`);
        await timelineService.log(taskId, 'intent_parser', `Processing intent for: "${userPrompt}"`);

        const trace = {
            taskId,
            steps: [],
            startTime: new Date()
        };

        try {
            // 1. PLANNER AGENT: Analyze & Plan
            const intent = await safeIntentParse(userPrompt);
            trace.steps.push({ agent: 'planner', action: 'intent_parse', result: intent });
            await timelineService.log(taskId, 'intent_parser', `Intent parsed: ${intent.intent}`);

            // 2. SECURITY CHECK (Permission Engine)
            const permission = await evaluatePermission(intent);
            trace.steps.push({ agent: 'security_engine', action: 'permission_check', result: permission });
            await timelineService.log(taskId, 'policy_validator', `Permission check: ${permission.permission_level}`);

            if (permission.permission_level === 'CRITICAL') {
                throw new Error(`CRITICAL_DENIAL: ${permission.reason}`);
            }

            // 3. POLICY VALIDATOR
            const policy = await validatePolicy(intent);
            const guard = enforceDeterministicPolicy(policy);
            trace.steps.push({ agent: 'policy_validator', action: 'policy_check', result: { policy, guard } });
            await timelineService.log(taskId, 'policy_validator', `Policy validation: ${guard.approved ? 'Approved' : 'Denied'}`);

            if (!guard.approved) {
                throw new Error(`POLICY_DENIAL: Access to ${guard.path} is restricted.`);
            }

            // 4. PLANNER AGENT: Generate Detailed Steps
            const plan = await generateExecutionPlan(intent, policy);
            trace.steps.push({ agent: 'planner', action: 'execution_planning', result: plan });
            await timelineService.log(taskId, 'planner', `Execution plan generated with ${plan.execution_plan.length} steps`);

            // 5. EXECUTOR AGENT: Secure Execution
            const execution = await executeIntent(taskId, { 
                ...intent, 
                originalMessage: userPrompt 
            }, plan);
            trace.steps.push({ agent: 'executor', action: 'execution', result: execution });

            // 6. OBSERVER AGENT: Memory & Audit
            const auditPayload = {
                type: 'agent_task_summary',
                prompt: userPrompt,
                intent: intent.intent,
                result: execution.status,
                audit_id: permission.audit_id,
                ip: clientIp
            };
            const memoryPlan = await planMemoryStorage(auditPayload);
            const storage = await executeMemoryPlan(memoryPlan, auditPayload);
            trace.steps.push({ agent: 'observer', action: 'audit_logging', result: { memoryPlan, storage } });

            // 7. SECURITY AUDITOR: Hardening recommendations
            const hardening = await analyzeSecurityHardening({ intent, execution });
            trace.steps.push({ agent: 'security_auditor', action: 'hardening_analysis', result: hardening });

            return {
                success: true,
                trace,
                final_result: execution.message,
                status: execution.status
            };

        } catch (error) {
            logger.error(`Orchestrator Error: ${error.message}`);
            trace.steps.push({ agent: 'orchestrator', action: 'error', result: error.message });

            return {
                success: false,
                error: error.message,
                trace
            };
        }
    }
}

module.exports = Orchestrator;
