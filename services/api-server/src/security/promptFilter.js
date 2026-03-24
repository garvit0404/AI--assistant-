const logger = require('../utils/logger.js');

const INJECTION_PATTERNS = [
    /ignore (all )?previous instructions/i,
    /reveal (your )?system prompt/i,
    /access\s+system\s+files/i,
    /bypass\s+permission/i,
    /forget\s+everything/i,
    /you\s+are\s+now\s+a\s+root/i,
    /cat\s+\/etc\//i,
    /(rm|mv|del|cp)\s+-\S+\s+/i // Potentially dangerous command fragments
];

/**
 * Scans user messages for potential prompt injection attempts.
 * @param {string} prompt - User message to scan
 * @returns {Object} - Result with detected flag and list of violations
 */
const scanPrompt = (prompt) => {
    if (!prompt || typeof prompt !== 'string') {
        return { detected: false, alert_level: 'NONE' };
    }

    const violations = INJECTION_PATTERNS
        .filter(pattern => pattern.test(prompt))
        .map(pattern => pattern.toString());

    if (violations.length > 0) {
        logger.warn(`Prompt Injection Filter DETECTED violations in user request: [${violations.join(', ')}]`);
        return {
            detected: true,
            alert_level: 'CRITICAL',
            violations,
            reason: 'Potential prompt injection attempt or command execution bypass.'
        };
    }

    return { detected: false, alert_level: 'SAFE' };
};

module.exports = { scanPrompt };
