const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger');

const app = express();
app.use(bodyParser.json());

const INJECTION_PATTERNS = [
    /ignore previous instructions/i,
    /ignore all previous/i,
    /system.*prompt/i,
    /reveal.*prompt/i,
    /bypass.*security/i,
    /access.*local.*file/i,
    /execute.*code/i,
    /delete.*everything/i,
    /truncate.*table/i,
    /sudo/i,
    /rm -rf/i
];

app.post('/scan', (req, res) => {
    const { taskId, prompt } = req.body;
    logger.info(`[SECURITY] Task ${taskId}: Scanning for prompt injection...`);

    const matches = INJECTION_PATTERNS.filter(pattern => pattern.test(prompt));

    if (matches.length > 0) {
        logger.warn(`[SECURITY] Task ${taskId}: Prompt injection detected! Patterns: ${matches.map(m => m.toString()).join(', ')}`);
        return res.json({ 
            taskId, 
            detected: true, 
            reason: 'Malicious pattern detected',
            patterns: matches.map(m => m.toString())
        });
    }

    logger.info(`[SECURITY] Task ${taskId}: Prompt scan passed`);
    return res.json({ taskId, detected: false });
});

const PORT = 3010;
app.listen(PORT, () => {
    logger.info(`[SECURITY] Prompt Injection Filter started on port ${PORT}`);
});
