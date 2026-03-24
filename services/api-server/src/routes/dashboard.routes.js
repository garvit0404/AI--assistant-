const express = require('express');
const { 
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
} = require('../controllers/dashboard.controller.js');

const router = express.Router();

// Container Management
router.get('/api/containers', getContainers);
router.post('/api/containers/:id/:action', handleContainerAction);
router.get('/api/containers/:id/logs', getContainerLogs);

// Database (MongoDB) Browser
router.get('/api/database/collections', getCollections);
router.get('/api/database/collections/:name', getCollectionData);

// Workspace (Filesystem) Browser
router.get('/api/workspace/files', getWorkspaceFiles);
router.get('/api/workspace/content', getWorkspaceFileContent);

// System Mode (Persistent)
router.get('/api/mode', getSystemMode);
router.post('/api/mode', setSystemMode);

// Real AI Chat
router.post('/api/chat', handleChat);

// Legacy support for older UI components
router.get('/api/system/mode', getSystemMode);
router.post('/api/system/mode', setSystemMode);

module.exports = router;
