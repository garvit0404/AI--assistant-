const { z } = require('zod');

const TaskSchema = z.object({
    taskId: z.string().uuid(),
    request: z.string(),
    steps: z.array(z.object({
        id: z.string(),
        tool: z.string(),
        parameters: z.any()
    })),
    status: z.enum(['CREATED', 'PLANNED', 'WAITING_PERMISSION', 'QUEUED', 'EXECUTING', 'FAILED', 'COMPLETED']),
    createdAt: z.string().datetime()
});

module.exports = { TaskSchema };
