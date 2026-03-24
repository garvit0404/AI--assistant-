const express = require('express');
const router = express.Router();
const permissionEngine = require('../security/permissionEngine.js');
const timelineService = require('../services/timeline.service.js');

router.post('/approve', async (req, res, next) => {
    try {
        const { requestId } = req.body;
        const result = await permissionEngine.approvePermission(requestId);
        res.json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
});

router.post('/reject', async (req, res, next) => {
    try {
        const { requestId } = req.body;
        const result = await permissionEngine.rejectPermission(requestId);
        res.json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
});

router.get('/pending', async (req, res, next) => {
    try {
        const pending = await permissionEngine.getPendingPermissions();
        res.json({ status: 'success', data: pending });
    } catch (error) {
        next(error);
    }
});

router.get('/tasks/:taskId/timeline', async (req, res, next) => {
    try {
        const { taskId } = req.params;
        const timeline = await timelineService.getByTaskId(taskId);
        res.json({ status: 'success', data: timeline });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
