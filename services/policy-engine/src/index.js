const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger');

const app = express();
app.use(bodyParser.json());

const RESTRICTED_PATHS = ['/etc/passwd', '/etc/shadow', '/root', '/var/run/docker.sock', '.env', 'config.js'];

function policyCheck(taskId, plan, intent, prompt) {
    const violations = [];
    const SAFE_BASE = "/workspace";

    // ✅ New Workspace-only rule
    if (intent && intent.intent && intent.intent.startsWith('FILE')) {
        if (!prompt || !prompt.includes(SAFE_BASE)) {
            violations.push({ reason: 'operation outside workspace', action: intent.tool });
        }
    }

    plan.forEach((step, index) => {
        // Path Boundary Check
        if (step.parameters && (step.parameters.path || step.path)) {
            const targetPath = (step.parameters.path || step.path).toLowerCase();
            if (RESTRICTED_PATHS.some(restricted => targetPath.includes(restricted))) {
                violations.push({ step: index, action: step.tool, reason: `Access to restricted path: ${targetPath}` });
            }
        }

        // Command Injection Check (Basic)
        if (step.tool === 'system.exec' && step.parameters?.command) {
            const unsafeChars = [';', '&&', '||', '|', '>', '<', '`', '$'];
            if (unsafeChars.some(char => step.parameters.command.includes(char))) {
                violations.push({ step: index, action: step.tool, reason: 'Unsafe command characters detected' });
            }
        }
    });

    return violations;
}

app.post('/validate', (req, res) => {
    const { taskId, plan, intent, prompt } = req.body;
    logger.info(`[POLICY] Task ${taskId}: Validating ${plan.length} steps`);

    const violations = policyCheck(taskId, plan, intent, prompt);
    
    if (violations.length > 0) {
        logger.warn(`[POLICY] Task ${taskId}: Validation FAILED with ${violations.length} violations`);
        return res.json({ taskId, approved: false, violations });
    }

    logger.info(`[POLICY] Task ${taskId}: Validation PASSED`);
    return res.json({ taskId, approved: true });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'policy-engine' });
});

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'AI Policy Engine is running.' });
});

const PORT = 3005;
app.listen(PORT, () => {
    logger.info(`[POLICY] Service started on port ${PORT}`);
});
