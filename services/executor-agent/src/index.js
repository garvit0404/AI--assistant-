const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { createClient } = require('redis');
const ToolRegistry = require('../../../packages/tool-registry');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://ai_redis:6379';
const redisClient = createClient({ url: REDIS_URL });
redisClient.connect().catch(err => logger.error(`[EXECUTOR] Redis Error: ${err.message}`));

async function getExecutionMode() {
    try {
        const mode = await redisClient.get('AI_EXECUTION_MODE');
        return mode || process.env.AI_EXECUTION_MODE || 'mock';
    } catch (err) {
        return 'mock';
    }
}

const app = express();
app.use(bodyParser.json());

const SANDBOX_URL = process.env.SANDBOX_URL || 'http://ai_sandbox:3010';

app.post('/execute', async (req, res) => {
    const { taskId, tool, parameters } = req.body;
    
    if (!ToolRegistry.validateTool(tool)) {
        return res.status(400).json({ status: 'failed', error: `Unknown tool: ${tool}` });
    }

    const EXECUTION_MODE = await getExecutionMode();
    const metadata = ToolRegistry.getToolMetadata(tool);
    logger.info(`[EXECUTOR] Task ${taskId}: Executing ${tool} in ${EXECUTION_MODE} mode`);

    try {
        let result;
        if (EXECUTION_MODE === 'mock') {
            result = await simulateTool(tool, parameters);
        } else {
            result = await executeInSandbox(tool, parameters);
        }

        return res.json({ taskId, tool, result });
    } catch (error) {
        logger.error(`[EXECUTOR] Task ${taskId}: Error executing ${tool}: ${error.message}`);
        return res.status(500).json({ taskId, tool, status: 'failed', error: error.message });
    }
});

async function simulateTool(tool, parameters) {
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 800));

    switch (tool) {
        case 'browser.open_page':
            return { status: 'simulated', url: parameters.url || 'https://example.com', title: 'Mock Page Title' };
        case 'browser.search':
            return { status: 'simulated', query: parameters.query, results: ['Result 1', 'Result 2', 'Result 3'] };
        case 'filesystem.read':
            return { status: 'simulated', content: 'Mock content for ' + (parameters.path || 'unnamed file') };
        case 'filesystem.write':
            return { status: 'simulated', message: 'File written successfully to ' + parameters.path };
        case 'system.exec':
            return { status: 'simulated', stdout: 'Mock output for command: ' + parameters.command, stderr: '' };
        case 'telegram.send_message':
            return { status: 'simulated', messageId: 'mock_msg_' + Date.now() };
        default:
            return { status: 'simulated', message: `${tool} simulated successfully` };
    }
}

async function executeInSandbox(tool, parameters) {
    logger.info(`[EXECUTOR] Routing ${tool} to Sandbox...`);
    
    try {
        let endpoint = '';
        let payload = {};

        switch (tool) {
            case 'browser.search':
                endpoint = '/browser/search';
                payload = { query: parameters.query };
                break;
            case 'filesystem.read':
                endpoint = '/fs/read';
                payload = { filePath: parameters.path };
                break;
            case 'filesystem.write':
                endpoint = '/fs/write';
                payload = { filePath: parameters.path, content: parameters.content };
                break;
            case 'system.exec':
                endpoint = '/exec';
                payload = { command: parameters.command };
                break;
            default:
                throw new Error(`Tool ${tool} not yet connected to sandbox`);
        }

        const response = await axios.post(`${SANDBOX_URL}${endpoint}`, payload);
        return response.data;
    } catch (err) {
        logger.error(`[EXECUTOR] Sandbox error: ${err.message}`);
        
        // Report sandbox failure to Observer for failsafe revert
        try {
            const OBSERVER_URL = process.env.OBSERVER_URL || 'http://ai_observer:3014';
            await axios.post(`${OBSERVER_URL}/security/log`, {
                taskId: 'SYSTEM',
                eventType: 'GENERAL_EVENT',
                severity: 'CRITICAL',
                message: `SANDBOX_FAILURE: Detected failure during live execution: ${err.message}`,
                data: { error: err.message, tool }
            }).catch(() => {});
        } catch (reportErr) {}

        return { status: 'failed', error: err.message };
    }
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'executor-agent' });
});

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'AI Executor Agent is running.' });
});

const PORT = 3004;
app.listen(PORT, () => {
    logger.info(`[EXECUTOR] Service started on port ${PORT}`);
});
