const Docker = require('dockerode');
const fs = require('fs');
const logger = require('../utils/logger.js');

class DockerService {
    constructor() {
        // Handle socket path based on OS safely
        const socketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';
        const forceMock = process.env.FORCE_MOCK_MODE === 'true';
        
        this.isMock = forceMock || !fs.existsSync(socketPath);
        this.mode = this.isMock ? 'mock' : 'live';

        if (this.isMock) {
            const reason = forceMock ? 'FORCE_MOCK_MODE is enabled' : 'Docker socket not available at ' + socketPath;
            logger.warn(`[DOCKER] ${reason}, running in MOCK MODE`);
            this.docker = null;
        } else {
            try {
                this.docker = new Docker({ socketPath });
                logger.info(`[DOCKER] Connected to Docker socket at ${socketPath}`);
            } catch (err) {
                logger.error(`[DOCKER] Failed to initialize Docker client: ${err.message}`);
                this.isMock = true;
                this.mode = 'mock';
                this.docker = null;
            }
        }

        // Mock Data for Fallback
        this.mockContainers = [
            { id: "mock-1", name: "ai_api_server", image: "ai-assistant/api-server", state: "running", status: "Up 2 hours" },
            { id: "mock-2", name: "ai_brain", image: "ai-assistant/ai-brain", state: "running", status: "Up 2 hours" },
            { id: "mock-3", name: "ai_mongodb", image: "mongo:7", state: "running", status: "Up 2 hours" },
            { id: "mock-4", name: "ai_redis", image: "redis:7-alpine", state: "running", status: "Up 2 hours" }
        ];
    }

    async listContainers(options = { all: true }) {
        if (this.isMock) {
            return this.mockContainers;
        }

        try {
            const containers = await this.docker.listContainers(options);
            return containers.map(c => ({
                id: c.Id.substring(0, 12),
                name: c.Names[0].replace('/', ''),
                image: c.Image,
                state: c.State,
                status: c.Status
            }));
        } catch (err) {
            logger.error(`[DOCKER] listContainers failed: ${err.message}`);
            // Fallback to mock on unexpected live failure to keep API functional
            return this.mockContainers;
        }
    }

    async getContainerLogs(id) {
        if (this.isMock || (typeof id === 'string' && id.startsWith('mock-'))) {
            return [
                `[MOCK LOG] Service ${id} initialized successfully`,
                `[MOCK LOG] Mode: ${this.getMode()}`,
                `[MOCK LOG] Heartbeat ok at ${new Date().toISOString()}`
            ];
        }

        try {
            const container = this.docker.getContainer(id);
            const logsBuffer = await container.logs({ stdout: true, stderr: true, tail: 100 });
            return logsBuffer.toString('utf8')
                .split('\n')
                .filter(l => l.trim() !== '')
                .map(l => l.replace(/[^\x20-\x7E]/g, ''));
        } catch (err) {
            logger.error(`[DOCKER] getContainerLogs failed for ${id}: ${err.message}`);
            return [`[ERROR] Could not retrieve logs: ${err.message}`];
        }
    }

    async performAction(id, action) {
        if (this.isMock || (typeof id === 'string' && id.startsWith('mock-'))) {
            logger.info(`[DOCKER] Mock ${action} performed on ${id}`);
            return { message: `Mock container ${id} ${action}ed (simulated)` };
        }

        try {
            const container = this.docker.getContainer(id);
            if (action === 'start') await container.start();
            else if (action === 'stop') await container.stop();
            else if (action === 'restart') await container.restart();
            return { message: `Container ${id} ${action}ed` };
        } catch (err) {
            logger.error(`[DOCKER] Action ${action} failed for ${id}: ${err.message}`);
            throw err;
        }
    }

    getMode() {
        return this.mode;
    }
}

module.exports = new DockerService();
