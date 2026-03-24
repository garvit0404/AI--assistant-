const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger');

const app = express();
app.use(bodyParser.json());

app.post('/plan', async (req, res) => {
    const { taskId, intent, prompt } = req.body;
    logger.info(`[PLANNER] Task ${taskId}: Planning for intent: ${intent.intent}`);

    try {
        let plan;
        if (process.env.AI_MODE === 'mock') {
            plan = generateMockPlan(intent, prompt);
        } else {
            // Future AI integration hook
            plan = generateMockPlan(intent, prompt);
        }

        logger.info(`[PLANNER] Task ${taskId}: Generated plan with ${plan.length} steps`);
        return res.json({ taskId, plan });
    } catch (error) {
        logger.error(`[PLANNER] Task ${taskId}: Error generating plan: ${error.message}`);
        return res.status(500).json({ taskId, status: 'failed', error: error.message });
    }
});

function generateMockPlan(intent, prompt) {
    switch (intent.intent) {
        case 'FILE_WRITE':
            return [
                { id: 'step_1', tool: 'filesystem.write', operation: 'write_file', parameters: { path: (prompt.match(/\/[\w./-]+/))?.[0] || 'workspace/output.txt', content: 'AI-Generated Content' } }
            ];
        case 'FILE_READ':
            return [
                { id: 'step_1', tool: 'filesystem.read', operation: 'read_file', parameters: { path: (prompt.match(/\/[\w./-]+/))?.[0] || 'workspace/output.txt' } }
            ];
        case 'WEB_SEARCH':
            return [
                { id: 'step_1', tool: 'browser.search', operation: 'search', parameters: { query: prompt.replace(/search for |find |google /gi, '') } },
                { id: 'step_2', tool: 'browser.extract', operation: 'extract', parameters: { target: 'results' } }
            ];
        case 'FILE_DELETE':
            return [
                { id: 'step_1', tool: 'filesystem.delete', operation: 'delete_file', parameters: { path: (prompt.match(/\/[\w./-]+/))?.[0] || 'workspace/temp.txt' } }
            ];
        case 'SYSTEM_EXEC':
            return [
                { id: 'step_1', tool: 'system.exec', operation: 'execute', parameters: { command: (prompt.match(/run `([^`]+)`|run "([^"]+)"|run ([\w\d -]+)/))?.[1] || 'echo "Running mock command"' } }
            ];
        default:
            return [{ id: 'step_1', tool: 'web.fetch', operation: 'info', parameters: { message: 'Greeting User: ' + prompt } }];
    }
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'planner-agent' });
});

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'AI Planner Agent is running.' });
});

const PORT = 3008;
app.listen(PORT, () => {
    logger.info(`[PLANNER] Service started on port ${PORT}`);
});
