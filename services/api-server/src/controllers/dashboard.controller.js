const dockerService = require('../services/docker.service.js');
const mongoose = require('mongoose');
const axios = require('axios');
const logger = require('../utils/logger.js');
const modeManager = require('../services/modeManager.js');
const Orchestrator = require('../ai/orchestrator.js');
const fs = require('fs-extra');
const path = require('path');

const transformServiceUrl = (url) => {
    if (!url || process.platform !== 'win32') return url;
    return url.replace(/ai[_-](task[_-]queue|tool[_-]registry|observer[_-]agent|permission[_-]engine|planner[_-]agent|policy[_-]engine|context[_-]builder|executor[_-]agent|brain|intent[_-]parser)/, 'localhost');
};

const getContainers = async (req, res) => {
    try {
        const containers = await dockerService.listContainers();
        res.json({
            success: true,
            mode: await modeManager.getMode(),
            data: containers
        });
    } catch (err) {
        logger.error(`[CONTROLLER] getContainers failed: ${err.message}`);
        res.json({
            success: true,
            mode: 'mock',
            data: []
        });
    }
};

const handleContainerAction = async (req, res) => {
    const { id, action } = req.params;
    try {
        const result = await dockerService.performAction(id, action);
        res.json({ 
            success: true,
            ...result
        });
    } catch (err) {
        logger.error(`[CONTROLLER] handleContainerAction (${action}) failed for ${id}: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
};

const getContainerLogs = async (req, res) => {
    const { id } = req.params;
    try {
        const logs = await dockerService.getContainerLogs(id);
        res.json({ 
            success: true,
            mode: await modeManager.getMode(),
            logs 
        });
    } catch (err) {
        logger.error(`[CONTROLLER] getContainerLogs failed for ${id}: ${err.message}`);
        res.json({ 
            success: true,
            mode: 'error',
            logs: [`Error retrieving logs: ${err.message}`] 
        });
    }
};

const getSystemMode = async (req, res) => {
    const mode = await modeManager.getMode();
    res.json({ mode });
};

const setSystemMode = async (req, res) => {
    const { mode, user } = req.body;
    try {
        const oldMode = await modeManager.getMode();
        await modeManager.setMode(mode);
        
        // Sync to Redis for other components to pick up immediately
        const redisClient = req.app.get('redisClient');
        if (redisClient) await redisClient.set('AI_EXECUTION_MODE', mode);

        // Audit Logging (Fire and forget)
        const OBSERVER_URL = process.env.OBSERVER_URL || 'http://ai_observer:3009';
        axios.post(`${transformServiceUrl(OBSERVER_URL)}/security/log`, {
            taskId: 'SYSTEM',
            eventType: 'GENERAL_EVENT',
            severity: 'HIGH',
            message: `Execution mode changed from ${oldMode} to ${mode}`,
            data: { old_mode: oldMode, new_mode: mode, user: user || 'admin' },
            timestamp: new Date().toISOString()
        }).catch(err => logger.error(`Failed to log mode change: ${err.message}`));

        res.json({ success: true, mode, message: `System mode updated to ${mode}` });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

const handleChat = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user ? req.user.id : 'anonymous';
        
        if (!message) return res.status(400).json({ success: false, error: 'Message required' });

        logger.info(`Chat Request from ${userId}: "${message}"`);
        const orchestrator = new Orchestrator(req.app);
        const result = await orchestrator.runTask(message, req.ip, userId);
        
        const mode = await modeManager.getMode();

        console.log("FINAL RESPONSE:", result.message); // TASK 3 & 6

        res.json({
            success: result.success,
            taskId: result.taskId, // Added for frontend tracking
            message: result.message, // TASK 3
            mode: mode,
            trace: result.trace,
            error: result.error
        });
    } catch (err) {
        logger.error(`[CHAT] Error: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
};

const getCollections = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        const collections = await mongoose.connection.db.listCollections().toArray();
        res.json(collections.map(c => ({ name: c.name })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getCollectionData = async (req, res) => {
    const { name } = req.params;
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        const data = await mongoose.connection.db.collection(name).find().limit(50).toArray();
        res.json({ docs: data, count: data.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const workspacePath = path.resolve(__dirname, '../../../../workspace');

const getWorkspaceFiles = async (req, res) => {
    try {
        await fs.ensureDir(workspacePath);
        const files = await fs.readdir(workspacePath);
        const stats = await Promise.all(files.map(async f => {
            const s = await fs.stat(path.join(workspacePath, f));
            return { name: f, isDir: s.isDirectory(), size: s.size, mtime: s.mtime };
        }));
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getWorkspaceFileContent = async (req, res) => {
    const { name } = req.query;
    try {
        const fullPath = path.resolve(workspacePath, name);
        if (!fullPath.startsWith(workspacePath)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const content = await fs.readFile(fullPath, 'utf8');
        res.json({ content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getContainers,
    handleContainerAction,
    getContainerLogs,
    getCollections,
    getCollectionData,
    getWorkspaceFiles,
    getWorkspaceFileContent,
    getSystemMode,
    setSystemMode,
    handleChat
};
