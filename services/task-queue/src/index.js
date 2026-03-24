const express = require('express');
const { Queue, Worker, QueueEvents } = require('bullmq');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.Console()]
});

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
logger.info(`[TASK-QUEUE] Connecting to Redis via ${REDIS_URL}`);
const taskQueue = new Queue('execution_tasks', REDIS_URL);
const queueEvents = new QueueEvents('execution_tasks', REDIS_URL);

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'task-queue' });
});

// Task State Machine implementation (Simulation)
const updateTaskStatus = async (taskId, status, metadata = {}) => {
    logger.info(`Task ${taskId} transitioned to ${status}`, { metadata });
    // In a real app, we would update MongoDB here as well.
};

app.post('/tasks/enqueue', async (req, res) => {
    const { request, steps } = req.body;
    const taskId = uuidv4();

    const taskData = {
        taskId,
        request,
        steps,
        status: 'QUEUED',
        createdAt: new Date().toISOString()
    };

    await taskQueue.add('execute_plan', taskData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
    });

    await updateTaskStatus(taskId, 'QUEUED');

    res.json({ taskId, status: 'QUEUED' });
});

// Mock Executor Worker
const worker = new Worker('execution_tasks', async job => {
    const { taskId, steps } = job.data;
    
    await updateTaskStatus(taskId, 'EXECUTING');

    for (const step of steps) {
        logger.info(`Executing step ${step.id} for task ${taskId}: ${step.tool}`);
        // Simulate execution time
        await new Promise(r => setTimeout(r, 1000));
    }

    await updateTaskStatus(taskId, 'COMPLETED');
}, { connection: REDIS_URL });

worker.on('completed', job => {
    logger.info(`Job ${job.id} (Task ${job.data.taskId}) completed`);
});

worker.on('failed', (job, err) => {
    logger.error(`Job ${job.id} (Task ${job.data.taskId}) failed: ${err.message}`);
});

const PORT = process.env.PORT || 3013;
app.listen(PORT, () => {
    logger.info(`Task Queue Service (BullMQ) started on port ${PORT}`);
});
