const { PERMISSION_REGISTRY, LEVEL_PRIORITY } = require('./permissionRegistry.js');
const { logPermissionDecision } = require('./auditLogger.js');
const { classifyPermission } = require('../ai/permissionClassifier.js');
const logger = require('../utils/logger.js');

/**
 * Composite Permission Evaluator
 * Combines deterministic registry and AI-based classification.
 */
async function evaluatePermission(intentData) {
    const intentName = intentData.intent;

    // 1. Get Registry Baseline
    const registryLevel = PERMISSION_REGISTRY[intentName] || "CRITICAL";
    const registryValue = LEVEL_PRIORITY[registryLevel];

    // 2. Get AI Dynamic Classification
    const aiClassification = await classifyPermission(intentData);
    const aiLevel = aiClassification.permission_level;
    const aiValue = LEVEL_PRIORITY[aiLevel] || 3; // Default to CRITICAL on error

    // 3. APPLY SECURITY RULE: Stricter level wins (Highest risk wins)
    // This behaves as min(registry_rank, llm_rank) in a 0-indexed restrictive ranking
    let finalLevel;
    if (registryValue >= aiValue) {
        finalLevel = registryLevel;
        logger.info(`Final Decision: Registry strictly applied (${registryLevel} >= ${aiLevel})`);
    } else {
        finalLevel = aiLevel;
        logger.info(`Final Decision: AI classification escalated risk (${aiLevel} > ${registryLevel})`);
    }

    // 4. PREPARE RESULT
    const decision = {
        intent: intentName,
        permission_level: finalLevel,
        reason: aiClassification.reason,
        requires_confirmation: (finalLevel === "HIGH" || finalLevel === "CRITICAL" || aiClassification.requires_confirmation),
        confidence: aiClassification.confidence,
        audit_id: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };

    // 5. AUDIT LOGGING
    logPermissionDecision(decision);

    return decision;
}

module.exports = {
    evaluatePermission
};
