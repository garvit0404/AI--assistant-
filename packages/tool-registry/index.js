const tools = [
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
        "tool": "filesystem.read",
        "service": "file_service",
        "permission": "read_file",
        "risk_level": "low",
        "sandbox": true,
        "rate_limit": 10,
        "timeout": 2000
    },
    {
        "tool": "filesystem.write",
        "service": "file_service",
        "permission": "write_file",
        "risk_level": "high",
        "sandbox": true,
        "rate_limit": 5,
        "timeout": 2000
    },
    {
        "tool": "system.exec",
        "service": "shell_service",
        "permission": "execute_command",
        "risk_level": "critical",
        "sandbox": false,
        "rate_limit": 1,
        "timeout": 30000
    }
];

const validateTool = (toolName) => {
    return tools.some(t => t.tool === toolName);
};

const getRiskLevel = (toolName) => {
    const tool = tools.find(t => t.tool === toolName);
    return tool ? tool.risk_level.toUpperCase() : 'UNKNOWN';
};

const getAllTools = () => tools;

module.exports = {
    validateTool,
    getRiskLevel,
    getAllTools,
    tools
};
