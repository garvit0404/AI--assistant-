const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [new winston.transports.Console()]
});

const app = express();
app.use(bodyParser.json());

// In-memory registry for mock mode
const tools = new Map();

// Initial registration of core tools logic
const registerTool = (definition) => {
    const { tool, risk_level, rate_limit } = definition;
    tools.set(tool, {
        ...definition,
        status: 'active',
        usage_count: 0
    });
    logger.info(`Tool registered: ${tool} (Risk: ${risk_level})`);
};

// Seed initial tools
[
    {
        "tool": "browser.open_page",
        "service": "browser_service",
        "permission": "browse_web",
        "risk_level": "medium",
        "sandbox": true,
        "rate_limit": 10,
        "timeout": 5000
    },
    {
        "tool": "browser.search",
        "service": "browser_service",
        "permission": "browse_web",
        "risk_level": "low",
        "sandbox": true,
        "rate_limit": 20,
        "timeout": 10000
    },
    {
        "tool": "filesystem.write",
        "service": "file_service",
        "permission": "write_file",
        "risk_level": "high",
        "sandbox": true,
        "rate_limit": 5,
        "timeout": 2000
    }
].forEach(registerTool);

app.post('/tools/register', (req, res) => {
    const definition = req.body;
    if (!definition.tool) return res.status(400).json({ error: 'Tool name required' });
    registerTool(definition);
    res.json({ message: 'Tool registered', tool: definition.tool });
});

app.get('/tools', (req, res) => {
    res.json(Array.from(tools.values()));
});

app.get('/tools/:name', (req, res) => {
    const tool = tools.get(req.params.name);
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    res.json(tool);
});

app.post('/tools/validate', (req, res) => {
    const { tool: toolName, parameters } = req.body;
    const tool = tools.get(toolName);

    if (!tool) {
        return res.status(404).json({ valid: false, reason: 'Tool not found in registry' });
    }

    // Mock validation logic
    if (tool.rate_limit && tool.usage_count >= tool.rate_limit) {
        return res.status(429).json({ valid: false, reason: 'Rate limit exceeded' });
    }

    // Update usage for mock tracking
    tool.usage_count++;

    res.json({
        valid: true,
        metadata: tool,
        risk_level: tool.risk_level
    });
});

// --- Health Check ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', tools: tools.size });
});

const PORT = process.env.PORT || 3012;
app.listen(PORT, () => {
    logger.info(`Tool Registry Service started on port ${PORT}`);
});
