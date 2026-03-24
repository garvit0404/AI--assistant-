const { createClient } = require('redis');
const logger = require('./logger');

class TaskQueue {
    constructor(redisUrl) {
        this.client = createClient({ url: redisUrl });
        this.client.on('error', (err) => logger.error(`[TASK_QUEUE] Redis error: ${err.message}`));
    }

    async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
            logger.info('[TASK_QUEUE] Connected to Redis');
        }
    }

    async enqueue(taskId, payload) {
        await this.connect();
        await this.client.lPush('tasks', JSON.stringify({ taskId, payload, status: 'CREATED', timestamp: Date.now() }));
        logger.info(`[TASK_QUEUE] Task ${taskId} enqueued`);
    }

    async dequeue() {
        await this.connect();
        const data = await this.client.brPop('tasks', 0);
        if (data) {
            const task = JSON.parse(data.element);
            logger.info(`[TASK_QUEUE] Task ${task.taskId} dequeued`);
            return task;
        }
        return null;
    }

    async updateStatus(taskId, status) {
        await this.connect();
        await this.client.hSet('task_status', taskId, status);
        logger.info(`[TASK_QUEUE] Task ${taskId} status updated: ${status}`);
    }

    async getStatus(taskId) {
        await this.connect();
        return await this.client.hGet('task_status', taskId);
    }
}

module.exports = TaskQueue;
