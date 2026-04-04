const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const config = require('./config');
const OpenAI = require('openai');

const { createClient } = require('redis');
const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY
});

// Redis client for chat memory
const redisClient = createClient({ url: config.REDIS_URL });
redisClient.on('error', (err) => logger.error('[BRAIN] Redis Error:', err));

async function startRedis() {
    try {
        await redisClient.connect();
        logger.info('[BRAIN] Connected to Redis for memory');
    } catch (err) {
        logger.error('[BRAIN] Redis connection failed:', err.message);
    }
}
startRedis();

const app = express();
app.use(bodyParser.json());

const getSystemMode = async () => {
    try {
        const mode = await redisClient.get('AI_EXECUTION_MODE');
        return mode || config.AI_MODE || 'mock';
    } catch {
        return config.AI_MODE || 'mock';
    }
};

const SERVICES = {
    INTENT: process.env.INTENT_PARSER_URL || 'http://ai_intent_parser:3007',
    PLANNER: process.env.PLANNER_AGENT_URL || 'http://ai_planner:3008',
    POLICY: process.env.POLICY_ENGINE_URL || 'http://ai_policy_engine:3005',
    PERMISSION: process.env.PERMISSION_ENGINE_URL || 'http://ai_permission_engine:3006',
    EXECUTOR: process.env.EXECUTOR_AGENT_URL || 'http://ai_executor:3004',
    OBSERVER: process.env.OBSERVER_AGENT_URL || 'http://ai_observer:3009'
};

async function logEvent(taskId, stage, message, data = {}) {
    try {
        await axios.post(`${SERVICES.OBSERVER}/log`, { taskId, stage, message, data });
    } catch (err) {
        logger.error(`[BRAIN] Task ${taskId}: Failed to log event: ${err.message}`);
    }
}

app.post('/process', async (req, res) => {
    const taskId = `task_${uuidv4().substring(0, 8)}`;
    const { prompt, clientIp } = req.body;
    
    logger.info(`[BRAIN] Starting Task ${taskId} for prompt: "${prompt}"`);
    await logEvent(taskId, 'brain', `Initializing Task: ${taskId}`, { prompt, clientIp });

    try {
        // 1. INTENT PARSER
        await logEvent(taskId, 'intent_parser', 'Analyzing user intent...');
        const intentResponse = await axios.post(`${SERVICES.INTENT}/parse`, { taskId, prompt });
        const intent = intentResponse.data.intent;
        await logEvent(taskId, 'intent_parser', `Intent parsed: ${intent.intent}`);

        // 2. PLANNER AGENT
        await logEvent(taskId, 'planner', 'Generating execution plan...');
        const planResponse = await axios.post(`${SERVICES.PLANNER}/plan`, { taskId, intent, prompt });
        const plan = planResponse.data.plan;
        await logEvent(taskId, 'planner', `Execution plan generated with ${plan.length} steps`);

        // 3. POLICY VALIDATOR
        await logEvent(taskId, 'policy_engine', 'Validating plan against security policies...');
        const policyResponse = await axios.post(`${SERVICES.POLICY}/validate`, { taskId, plan, intent, prompt });
        if (!policyResponse.data.approved) {
            const error = `Policy Violation: ${policyResponse.data.violations[0].reason}`;
            await logEvent(taskId, 'policy_engine', error, { violations: policyResponse.data.violations });
            return res.status(403).json({ taskId, success: false, error });
        }
        await logEvent(taskId, 'policy_engine', 'Plan validated successfully');

        // 4. PERMISSION ENGINE & EXECUTION
        // The Brain sends the plan to the Executor. 
        // The Executor handles the per-step permission requests.
        await logEvent(taskId, 'executor', 'Sending plan for execution...');
        
        // Asynchronous Execution (Fire and Forget or WebSocket return)
        executePlanInSteps(taskId, intent, plan);

        return res.json({ 
            taskId, 
            success: true, 
            status: 'executing', 
            message: 'Task successfully passed control plane and is now in execution plane.',
            intent: intent.intent,
            plan_length: plan.length
        });

    } catch (error) {
        logger.error(`[BRAIN] Task ${taskId}: Unexpected error: ${error.message}`);
        await logEvent(taskId, 'brain', `System Error: ${error.message}`, { error: error.message });
        return res.status(500).json({ taskId, success: false, error: error.message });
    }
});

async function executePlanInSteps(taskId, intent, plan) {
    for (const step of plan) {
        try {
            // Check Permissions
            await logEvent(taskId, 'permission_engine', `Checking permission for ${step.tool}...`);
            const permResponse = await axios.post(`${SERVICES.PERMISSION}/request`, { 
                taskId, 
                tool: step.tool, 
                parameters: step.parameters 
            });

            if (permResponse.data.status === 'pending') {
                await logEvent(taskId, 'permission_engine', `Waiting for manual approval for ${step.tool}`, { requestId: permResponse.data.requestId });
                
                // Block until approved (Polled/Resolved via Redis in a real system)
                // For this demo, we can wait for the status to change
                const approved = await waitForApproval(permResponse.data.requestId);
                if (!approved) {
                    await logEvent(taskId, 'executor', `Step aborted: Permission denied for ${step.tool}`);
                    return;
                }
            }

            // Execute Tool
            await logEvent(taskId, 'executor', `Executing ${step.tool}...`);
            const executionResponse = await axios.post(`${SERVICES.EXECUTOR}/execute`, { 
                taskId, 
                tool: step.tool, 
                parameters: step.parameters 
            });

            await logEvent(taskId, 'executor', `${step.tool} completed successfully`, { result: executionResponse.data.result });
            
        } catch (err) {
            const error = `Execution Failed at ${step.tool}: ${err.message}`;
            logger.error(`[BRAIN] Task ${taskId}: ${error}`);
            await logEvent(taskId, 'executor', error, { error: err.message });
            return;
        }
    }
    
    await logEvent(taskId, 'brain', 'All tasks completed successfully. Task transition: COMPLETED');
}

async function waitForApproval(requestId) {
    return new Promise((resolve) => {
        const pollInterval = setInterval(async () => {
            try {
                // Poll the permission-engine for the status of this specific request
                const response = await axios.get(`${SERVICES.PERMISSION}/requests/${requestId}`);
                const { status } = response.data;
                
                if (status === 'approved') {
                    clearInterval(pollInterval);
                    resolve(true);
                } else if (status === 'rejected') {
                    clearInterval(pollInterval);
                    resolve(false);
                }
                // Still 'pending'... log and wait for next interval
                logger.info(`[BRAIN] Task for request ${requestId} is still pending approval...`);
            } catch (err) {
                logger.error(`[BRAIN] Error polling permission for ${requestId}: ${err.message}`);
                // If the request is not found (404), stop polling and resolve as denied
                if (err.response && err.response.status === 404) {
                    clearInterval(pollInterval);
                    resolve(false);
                }
            }
        }, 3000); // Poll every 3 seconds
    });
}

// --- INTERNAL AI SERVICE ENDPOINT WITH MEMORY ---
app.post('/ai/chat', async (req, res) => {
    const { prompt, systemPrompt, userId = 'default_user', jsonMode = true } = req.body;
    const historyKey = `chat_history:${userId}`;
    
    // 1. Fetch History from Redis
    let history = [];
    try {
        const historyData = await redisClient.get(historyKey);
        if (historyData) {
            history = JSON.parse(historyData);
        }
    } catch (err) {
        logger.warn(`[BRAIN:AI] Failed to fetch history for ${userId}: ${err.message}`);
    }

    const currentMode = await getSystemMode();
    if (currentMode === 'mock') {
        logger.info(`[BRAIN:AI] Mock AI request received for ${userId}`);
        return res.json({ 
            choices: [{ message: { content: JSON.stringify({
                intent: "GENERAL_CHAT",
                message: "Mock Response: System is in MOCK mode.",
                confidence: 1.0
            }) } }]
        });
    }

    try {
        const llmLayerUrl = process.env.LLM_LAYER_URL || 'http://ai_llm_layer:3020';
        logger.info(`[BRAIN:AI] Forwarding request to LLM Layer for ${userId}...`);
        
        const response = await axios.post(`${llmLayerUrl}/chat`, {
            prompt,
            system_prompt: systemPrompt,
            user_id: userId,
            options: {
                json_mode: jsonMode,
                model: config.OPENAI_MODEL // Pass as preferred cloud model
            }
        });

        const result = response.data.data;
        const assistantText = result.text;
        
        // Format to match OpenAI response structure if possible or simplify
        const formattedResponse = {
            choices: [{
                message: {
                    content: assistantText,
                    role: 'assistant'
                }
            }],
            usage: result.usage,
            model: result.model,
            source: result.source
        };

        // 2. Save new message and response to history
        history.push({ role: 'user', content: prompt });
        history.push({ role: 'assistant', content: assistantText });
        
        // Trim and persist
        await redisClient.set(historyKey, JSON.stringify(history.slice(-50)), {
            EX: 86400 * 7 // Expire in 7 days
        });

        return res.json(formattedResponse);
    } catch (err) {
        logger.error(`[BRAIN:AI] LLM Layer Error: ${err.message}`);
        return res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ai-brain', mode: config.AI_MODE });
});

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'AI Brain Orchestrator is running.' });
});

const PORT = config.PORT;
app.listen(PORT, () => {
    logger.info(`[BRAIN] AI Brain (Control Plane Orchestrator) started on port ${PORT}`);
});
