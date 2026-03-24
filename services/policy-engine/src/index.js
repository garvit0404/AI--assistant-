const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger');

const app = express();
app.use(bodyParser.json());

const RESTRICTED_PATHS = ['/etc/passwd', '/etc/shadow', '/root', '/var/run/docker.sock', '.env', 'config.js'];

app.post('/validate', (req, res) => {
    const { taskId, plan } = req.body;
    logger.info(`[POLICY] Task ${taskId}: Validating ${plan.length} steps`);

    const violations = [];
    
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
