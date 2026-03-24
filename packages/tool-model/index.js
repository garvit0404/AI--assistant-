const { z } = require('zod');

const ToolSchema = z.object({
    tool: z.string(),
    service: z.string(),
    permission: z.string(),
    risk_level: z.enum(['low', 'medium', 'high', 'critical']),
    sandbox: z.boolean().default(true),
    rate_limit: z.number().optional(),
    timeout: z.number().default(5000)
});

module.exports = { ToolSchema };
