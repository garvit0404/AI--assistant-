const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const winston = require('winston');
require('dotenv').config({ path: '../../.env' });

// Setup Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

const app = express();
const upload = multer({ dest: 'uploads/' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_BRAIN_URL = process.env.AI_BRAIN_URL || 'http://ai_brain:3003';
const PORT = process.env.PORT || 3016;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Real-time LOGGING console helper
const logToObserver = async (taskId, stage, message, level = 'info') => {
    try {
        await axios.post(`${process.env.OBSERVER_AGENT_URL || 'http://ai_observer:3009'}/log`, {
            taskId, stage, status: level, message
        });
    } catch (err) {
        logger.error(`[VOICE] Failed to report to observer: ${err.message}`);
    }
};

app.post('/api/voice/process', upload.single('audio'), async (req, res) => {
    const taskId = `voice_${Date.now()}`;
    logger.info(`[VOICE] Received new audio request: ${taskId}`);

    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioPath = req.file.path;

    try {
        await logToObserver(taskId, 'voice_connector', 'Converting Speech-To-Text...');

        let transcript = "";
        
        // --- STT Phase ---
        if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
            logger.warn(`[VOICE] No OpenAI Key found. Running in MOCK mode.`);
            transcript = "This is a mock voice command to list files in my workspace.";
        } else {
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(audioPath),
                model: "whisper-1",
            });
            transcript = transcription.text;
        }

        await logToObserver(taskId, 'voice_connector', `Transcript ready: "${transcript}"`);

        // --- BRAIN Phase ---
        logger.info(`[VOICE] Forwarding transcript to AI Brain: ${transcript}`);
        const brainResponse = await axios.post(`${AI_BRAIN_URL}/process`, {
            prompt: transcript,
            clientIp: req.ip,
            origin: 'voice'
        });

        res.json({
            taskId,
            transcript,
            brainResponse: brainResponse.data
        });

    } catch (error) {
        logger.error(`[VOICE] Error processing voice: ${error.message}`);
        await logToObserver(taskId, 'voice_connector', `Error: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    } finally {
        // Clean up uploaded file
        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'voice-connector', mock: !OPENAI_API_KEY });
});

app.get('/', (req, res) => {
    res.json({ message: 'Personal AI Assistant: Voice Connector is running.' });
});

app.listen(PORT, () => {
    logger.info(`[VOICE] Connector listening on port ${PORT}`);
});
