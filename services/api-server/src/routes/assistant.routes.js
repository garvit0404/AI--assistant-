const express = require('express');
const { handleAssistantRequest, getHealthStatus, getChatHistory } = require('../controllers/assistant.controller.js');

const router = express.Router();

router.post('/request', handleAssistantRequest);
router.get('/history', getChatHistory);
router.get('/health', getHealthStatus);

module.exports = router;
