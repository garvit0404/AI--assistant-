const path = require('path');
const logger = require('../utils/logger.js');

/**
 * Deterministic Policy Guard
 * Re-validates the LLM-produced output against strict, manual checks.
 * This is the final layer of defense.
 */
function enforceDeterministicPolicy(policyResult) {
    const { target_path, intent } = policyResult;

    // No target path? It's informational (SAFE) or unknown.
    if (!target_path) return { approved: true, risk: 'NONE' };

    // 1. Normalize and Resolve Path
    const normalizedPath = path.normalize(target_path).replace(/\\/g, '/');
    logger.info(`Policy Guard: Normalizing ${target_path} -> ${normalizedPath}`);

    // 2. Path Traversal Check
    const traversalPatterns = [
        '../',
        '..\\',
        '/etc',
        '/system',
        'C:/Windows',
        'C:\\Windows',
        '\\etc',
        '\\system'
    ];
    if (traversalPatterns.some(pattern => target_path.includes(pattern) || normalizedPath.includes(pattern))) {
        logger.error(`Policy Guard: Path traversal attempt detected: ${target_path}`);
        return {
            approved: false,
            risk: 'CRITICAL',
            reason: 'PATH_TRAVERSAL_DETECTED',
            details: `Path '${target_path}' contains blacklisted traversal patterns.`
        };
    }

    // 3. Workspace Boundary Check
    if (!normalizedPath.startsWith('workspace/')) {
        logger.error(`Policy Guard: Boundary violation: ${normalizedPath}`);
        return {
            approved: false,
            risk: 'CRITICAL',
            reason: 'WORKSPACE_BOUNDARY_VIOLATION',
            details: `Path '${normalizedPath}' is outside the 'workspace/' sandbox.`
        };
    }

    // 4. File Extension Check
    const dangerousExtensions = ['.sh', '.bat', '.ps1', '.system', '.dll', '.exe'];
    const lowerPath = normalizedPath.toLowerCase();
    if (dangerousExtensions.some(ext => lowerPath.endsWith(ext))) {
        // Only block if it's a modification intent
        const modificationIntents = ['write_file', 'create_file', 'modify_file', 'run_command'];
        if (modificationIntents.includes(intent)) {
            logger.error(`Policy Guard: Disallowed file type: ${normalizedPath}`);
            return {
                approved: false,
                risk: 'HIGH',
                reason: 'DANGEROUS_FILE_EXTENSION',
                details: `Action '${intent}' on extension '${path.extname(normalizedPath)}' is prohibited.`
            };
        }
    }

    return { approved: true, risk: 'LOW', path: normalizedPath };
}

module.exports = {
    enforceDeterministicPolicy
};
