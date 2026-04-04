const express = require('express');
const { connectTelegramBot, getTelegramStatus } = require('../controllers/integration.controller');

const router = express.Router();

router.post('/telegram/connect', connectTelegramBot);
router.get('/telegram/status', getTelegramStatus);

module.exports = router;
