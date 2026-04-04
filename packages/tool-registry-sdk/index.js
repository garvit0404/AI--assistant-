const registry = require('./registry.json').tools;

class ToolRegistry {
    static getToolMetadata(toolName) {
        return registry[toolName] || null;
    }

    static validateTool(toolName) {
        return !!registry[toolName];
    }

    static getRiskLevel(toolName) {
        return registry[toolName]?.risk_level || 'LOW';
    }

    static isSandboxRequired(toolName) {
        return registry[toolName]?.sandbox !== false;
    }

    static listToolsByService(serviceName) {
        return Object.entries(registry)
            .filter(([_, meta]) => meta.service === serviceName)
            .map(([name, _]) => name);
    }
}

module.exports = ToolRegistry;
