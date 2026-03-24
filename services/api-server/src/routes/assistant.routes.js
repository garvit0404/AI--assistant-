const express = require('express');
const { handleAssistantRequest, getHealthStatus } = require('../controllers/assistant.controller.js');

const router = express.Router();

router.post('/request', handleAssistantRequest);
router.get('/health', getHealthStatus);

module.exports = router;
