const logger = require('../utils/logger.js');

/**
 * Audit Logger for Security Decisions
 */
function logPermissionDecision(entry) {
    const auditEntry = {
        timestamp: new Date().toISOString(),
        intent: entry.intent,
        permission: entry.permission_level,
        approved: entry.permission_level !== "CRITICAL" && entry.permission_level !== "BLOCK",
        requires_confirmation: entry.requires_confirmation || false,
        confidence: entry.confidence || 0,
        reason: entry.reason || "Automatic auditing"
    };

    // Log to structured JSON as requested
    console.log(`[AUDIT] ${JSON.stringify(auditEntry)}`);

    // Also log via system logger for persistence/monitoring
    logger.info(`Security Decision: Intent='${auditEntry.intent}', Permission='${auditEntry.permission}', Approved=${auditEntry.approved}`);
}

module.exports = {
    logPermissionDecision
};
