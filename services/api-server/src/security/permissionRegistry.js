/**
 * Deterministic Permission Registry
 * Maps intents to their pre-defined security risk levels.
 * Standardized to match the IntentSchema taxonomy.
 */
const PERMISSION_REGISTRY = {
    // SAFE: Informational only
    WEB_SEARCH: "SAFE",
    HTTP_FETCH: "SAFE",
    GENERAL_CHAT: "SAFE",

    // MEDIUM: Workspace read/write
    FILE_READ: "MEDIUM",
    FILE_WRITE: "MEDIUM",

    // HIGH: Modification of system/important state
    FILE_DELETE: "HIGH",

    // CRITICAL: Host access, OS commands, network, etc.
    SYSTEM_EXEC: "CRITICAL",
    unknown: "CRITICAL"
};

/**
 * Priority for "Stricter level wins" logic
 * Higher value = Stricter (more restrictive)
 */
const LEVEL_PRIORITY = {
    "SAFE": 0,
    "MEDIUM": 1,
    "HIGH": 2,
    "CRITICAL": 3
};

module.exports = {
    PERMISSION_REGISTRY,
    LEVEL_PRIORITY
};
