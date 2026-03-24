const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// --- Prometheus Metrics ---
const prom = require('prom-client');
const register = new prom.Registry();
prom.collectDefaultMetrics({ register });

const aiRequestsTotal = new prom.Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI requests processed',
  labelNames: ['source', 'status'],
  registers: [register]
});

const toolExecutionDuration = new prom.Histogram({
  name: 'tool_execution_duration_seconds',
  help: 'Duration of tool executions in seconds',
  labelNames: ['tool'],
  registers: [register]
});

const activeTasksGauge = new prom.Gauge({
  name: 'ai_active_tasks',
  help: 'Number of currently active AI tasks',
  registers: [register]
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
// -------------------------

// Mock State for Task Pipeline
let currentTask = null;

// Mock pipeline stages
const STAGES = [
  'user',
  'interface',
  'intent_parser',
  'context_builder',
  'planner_agent',
  'policy_validator',
  'permission_engine',
  'task_queue',
  'executor_agent',
  'tool_registry',
  'sandbox_execution',
  'observer_agent',
  'result'
];

// Helper to emit state updates
const emitUpdate = (update) => {
  io.emit('pipeline_update', update);
  const stageName = update.currentStage || 'system';
  const stageStatus = update.task?.stages?.[stageName] || update.task?.status || 'idle';
  console.log(`[PIPELINE] ${stageName.toUpperCase()}: ${stageStatus}`);
};

// Mock Agent Logic
const runMockPipeline = async (taskRequest) => {
  try {
    currentTask = {
      id: Math.random().toString(36).substr(2, 9),
      request: taskRequest,
      source: 'dashboard',
      status: 'running',
      stages: STAGES.reduce((acc, s) => ({ ...acc, [s]: 'idle' }), {}),
      plan: [],
      permissions: [],
      toolCalls: [],
      logs: []
    };

    emitUpdate({ task: currentTask });
    activeTasksGauge.inc();

    for (const stage of STAGES) {
      if (!currentTask) break;
      
      currentTask.stages[stage] = 'running';
      currentTask.logs.push(`[${new Date().toLocaleTimeString()}] Entering stage: ${stage}`);
      emitUpdate({ task: currentTask, currentStage: stage });

      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (stage === 'planner_agent') {
        currentTask.plan = [
          { step: 1, tool: 'browser.search', query: taskRequest },
          { step: 2, tool: 'browser.extract', target: 'article content' },
          { step: 3, tool: 'summarize', target: 'extracted text' }
        ];
        
        // Initialize tool calls here to prevent undefined access later
        currentTask.toolCalls = [
            { tool: 'browser.search', status: 'pending', time: '-', params: taskRequest },
            { tool: 'browser.extract', status: 'pending', time: '-', params: 'content' },
            { tool: 'summarize', status: 'pending', time: '-', params: 'summary' }
        ];
        
        currentTask.logs.push(`[${new Date().toLocaleTimeString()}] Plan generated with ${currentTask.plan.length} steps.`);
      }

      if (stage === 'permission_engine') {
        currentTask.stages[stage] = 'waiting_permission';
        currentTask.permissions.push({
          id: 'perm_1',
          action: 'browser.search',
          target: 'external_web',
          risk: 'MEDIUM',
          status: 'pending'
        });
        emitUpdate({ task: currentTask, currentStage: stage });
        
        currentTask.logs.push(`[${new Date().toLocaleTimeString()}] Waiting for user permission...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); 
        
        currentTask.permissions[0].status = 'approved';
        currentTask.logs.push(`[${new Date().toLocaleTimeString()}] Permission approved.`);
      }

      if (stage === 'executor_agent') {
        if (currentTask.toolCalls.length > 0) {
            currentTask.toolCalls[0].status = 'running';
            emitUpdate({ task: currentTask, currentStage: stage });
            await new Promise(resolve => setTimeout(resolve, 800));
            currentTask.toolCalls[0].status = 'completed';
            currentTask.toolCalls[0].time = '1.2s';
        }
      }

      if (stage === 'sandbox_execution') {
        if (currentTask.toolCalls.length > 1) {
            currentTask.toolCalls[1].status = 'running';
            emitUpdate({ task: currentTask, currentStage: stage });
            await new Promise(resolve => setTimeout(resolve, 800));
            currentTask.toolCalls[1].status = 'completed';
            currentTask.toolCalls[1].time = '0.8s';
            
            currentTask.toolCalls[2].status = 'running';
            emitUpdate({ task: currentTask, currentStage: stage });
            await new Promise(resolve => setTimeout(resolve, 800));
            currentTask.toolCalls[2].status = 'completed';
            currentTask.toolCalls[2].time = '0.5s';
        }
      }

      currentTask.stages[stage] = 'completed';
      emitUpdate({ task: currentTask, currentStage: stage });
    }

    currentTask.status = 'completed';
    currentTask.logs.push(`[${new Date().toLocaleTimeString()}] Execution pipeline completed successfully.`);
    emitUpdate({ task: currentTask });
    aiRequestsTotal.inc({ source: currentTask.source, status: 'completed' });
    activeTasksGauge.dec();
  } catch (err) {
    console.error("Pipeline crashed:", err);
    if (currentTask) {
        currentTask.status = 'failed';
        currentTask.logs.push(`[ERROR] ${err.message}`);
        emitUpdate({ task: currentTask });
        aiRequestsTotal.inc({ source: currentTask.source, status: 'failed' });
        activeTasksGauge.dec();
    }
  }
};

app.post('/api/tasks', async (req, res) => {
  const { request } = req.body;
  if (!request) return res.status(400).json({ error: 'Request is required' });
  
  // Start pipeline in background
  runMockPipeline(request);
  
  res.json({ message: 'Task started', taskId: 'mock_id' });
});

app.get('/', (req, res) => {
  res.send('AI-OS Mock Control Plane API is Active.');
});

app.get('/api/tasks/current', (req, res) => {
    res.json(currentTask || { status: 'idle', message: 'No active task' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  if (currentTask) {
    socket.emit('pipeline_update', { task: currentTask });
  }
  
  socket.on('approve_permission', (data) => {
      console.log('Permission approved via socket:', data);
      // Logic to resume pipeline would go here
  });
});

const PORT = 3005;
server.listen(PORT, () => {
  console.log(`Control Plane API running on port ${PORT}`);
});
