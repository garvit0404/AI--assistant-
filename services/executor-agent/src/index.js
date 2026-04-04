const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { createClient } = require('redis');
const ToolRegistry = require('@repo/tool-registry-sdk');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://ai_redis:6379';
const redisClient = createClient({ url: REDIS_URL });
redisClient.connect().catch(err => logger.error(`[EXECUTOR] Redis Error: ${err.message}`));

const SANDBOX_URL = process.env.SANDBOX_URL || 'http://ai_sandbox:5000';

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

const LOG_URL = process.env.LOG_URL || 'http://localhost:3001/api/logs';

async function logEvent(taskId, stage, status, message, meta = {}) {
    try {
        await axios.post(LOG_URL, { taskId, stage, status, message, meta });
    } catch (e) {
        logger.error(`[EXECUTOR LOG FAILED]: ${e.message}`);
    }
}

app.post('/execute', async (req, res) => {
    const { taskId, tool, parameters } = req.body;
    
    await logEvent(taskId, 'executor', 'running', `Executing tool: ${tool}`, { parameters });
    
    if (!ToolRegistry.validateTool(tool)) {
        const err = `Unknown tool: ${tool}`;
        await logEvent(taskId, 'executor', 'failed', err, { tool });
        return res.status(400).json({ 
            success: false, // TASK 7
            error: err, 
            tool, 
            step: 'executor' 
        });
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

        await logEvent(taskId, 'executor', 'success', `Tool ${tool} executed successfully`);
        return res.json({ taskId, tool, result });
    } catch (error) {
        await logEvent(taskId, 'executor', 'failed', error.message, { tool });
        logger.error(`[EXECUTOR] Task ${taskId}: Error executing ${tool}: ${error.message}`);
        return res.status(500).json({ 
            success: false, // TASK 7
            error: error.message, 
            tool, 
            step: 'executor' 
        });
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
            case 'browser.navigate':
                endpoint = '/browser/navigate';
                payload = { url: parameters.url };
                break;
            case 'browser.click':
                endpoint = '/browser/click';
                payload = { selector: parameters.selector };
                break;
            case 'browser.fill':
                endpoint = '/browser/fill';
                payload = { selector: parameters.selector, value: parameters.value };
                break;
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
