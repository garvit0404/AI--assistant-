const { z } = require('zod');

const PermissionRequestSchema = z.object({
    id: z.string().uuid(),
    taskId: z.string().uuid(),
    tool: z.string(),
    risk_level: z.enum(['low', 'medium', 'high', 'critical']),
    status: z.enum(['pending', 'approved', 'rejected']),
    approvedBy: z.string().optional(),
    timestamp: z.string().datetime()
});

module.exports = { PermissionRequestSchema };
