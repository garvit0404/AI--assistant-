const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger');

const app = express();
app.use(bodyParser.json());

const AI_MODE = process.env.AI_MODE || 'mock';

// ────────────────────────────────────────────────────────────────────────────
// Intent Pattern Map (ordered – most specific first to avoid drift)
// ────────────────────────────────────────────────────────────────────────────
const INTENT_PATTERNS = [
    // ── FILE WRITE ──────────────────────────────────────────────────────────
    {
        intent: 'FILE_WRITE',
        tool: 'filesystem.write',
        confidence: 0.97,
        patterns: [
            /\b(create|generate|write|save)\b.*\bfile(s)?\b/i,
            /\bwrite\s+(some\s+)?code\b/i,
            /\b(create|generate)\b.*\b(script|module|component|function)(s)?\b/i,
            /\boutput\s+to\s+\S+\.(js|ts|py|txt|json|md|sh)\b/i,
            /\bappend\s+(to\s+)?\S+\.(js|ts|py|txt|json|md|sh)\b/i,
            /\btouch\s+\S+\.(js|ts|py|txt|json|md|sh)\b/i,
            /\bsave\s+to\s+\S+/i,
            /\boverwrite\b.*\bfile(s)?\b/i,
            /\bupdate\b.*\b(content|code)\b/i,
        ]
    },
    // ── SYSTEM EXEC ─────────────────────────────────────────────────────────
    {
        intent: 'SYSTEM_EXEC',
        tool: 'system.exec',
        confidence: 0.98,
        patterns: [
            /\brun\s+(the\s+)?(command|cmd|script|program|binary)\b/i,
            /\bexecute\s+(a\s+)?(command|script|program|binary)\b/i,
            /\blaunch\s+(the\s+)?(process|script|program|binary)\b/i,
            /\brun\s+`[^`]+`/i,
            /\brun\s+"[^"]+"/i,
            /\bnpm\s+(run|install|build|start)\b/i,
            /\bsh\s+\S+\.sh\b/i,
            /\bbash\s+\S+\.sh\b/i,
            /\bnode\s+\S+\.(js|mjs)\b/i,
            /\bdocker\s+(run|ps|stop|start|build)\b/i,
            
            // ✅ ADD THESE
            /\blist\s+(docker\s+)?containers\b/i,
            /\b(show|list|get)\s+(running\s+)?containers\b/i,
            /\bwhat\s+(containers|docker)\s+(are\s+)?(running|active)\b/i,

            /\bpip\s+install\b/i,
            /\bpython\s+\S+\.py\b/i,
            /\brestart\s+(the\s+)?(server|service|system)\b/i,
        ]
    },
    // ── FILE DELETE ──────────────────────────────────────────────────────────
    {
        intent: 'FILE_DELETE',
        tool: 'filesystem.delete',
        confidence: 0.98,
        patterns: [
            /\b(delete|remove|clean|purge|destroy)\b.*\b(file|directory|folder|bin)(s|ies)?\b/i,
            /\bpurge\s+\S+\.(js|ts|py|txt|json|md|sh)\b/i,
        ]
    },
    // ── WEB SEARCH ─────────────────────────────────────────────────────────
    {
        intent: 'WEB_SEARCH',
        tool: 'browser.search',
        confidence: 0.90,
        patterns: [
            /\bsearch\s+(for|the\s+web\s+for)?\b/i,
            /\bgoogle\s+(for)?\b/i,
            /\bfind\s+information\s+(on|about)\b/i,
            /\blook\s+up\b/i,
            /\bwhat\s+is\b.*\?/i,
        ]
    },
    // ── FILE READ ──────────────────────────────────────────────────────────
    {
        intent: 'FILE_READ',
        tool: 'filesystem.read',
        confidence: 0.92,
        patterns: [
            /\b(read|show|open|list|print)\b.*\b(file|content|directory|folder)s?\b/i,
            /\bcat\s+\S+/i,
        ]
    },
    // ── HTTP FETCH ─────────────────────────────────────────────────────────
    {
        intent: 'HTTP_FETCH',
        tool: 'http.fetch',
        confidence: 0.88,
        patterns: [
            /\bfetch\s+(from\s+)?(https?:\/\/\S+|\burl\b|\bapi\b)\b/i,
            /\bmake\s+(a\s+)?(get|post|put|patch|delete)\s+request\b/i,
            /\bcall\s+(the\s+)?(api|endpoint|url)\b/i,
            /\bdownload\s+(from\s+)?(https?:\/\/\S+)\b/i,
        ]
    },
];

/**
 * Match a prompt against intent patterns using a scoring approach.
 * Returns the highest-confidence single-match intent.
 */
function parseIntent(prompt) {
    const p = prompt.trim();
    let best = null;
    let bestScore = 0;

    for (const rule of INTENT_PATTERNS) {
        let matchCount = 0;
        for (const pattern of rule.patterns) {
            if (pattern.test(p)) matchCount++;
        }
        if (matchCount > 0) {
            // confidence inflated slightly when multiple patterns hit
            const score = rule.confidence + (matchCount - 1) * 0.005;
            if (score > bestScore) {
                bestScore = score;
                best = { intent: rule.intent, tool: rule.tool, confidence: Math.min(score, 0.99) };
            }
        }
    }

    if (!best || bestScore < 0.6) {
        return { intent: 'GENERAL_CHAT', tool: null, confidence: 0.5 };
    }

    return best;
}

// ────────────────────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────────────────────

const axios = require('axios');
const LOG_URL = process.env.LOG_URL || 'http://localhost:3001/api/logs';

async function logEvent(taskId, stage, status, message, meta = {}) {
    try {
        await axios.post(LOG_URL, { taskId, stage, status, message, meta });
    } catch (e) {
        logger.error(`[INTENT LOG FAILED]: ${e.message}`);
    }
}

app.post('/parse', async (req, res) => {
    const { taskId, prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ taskId, status: 'failed', error: 'prompt is required' });
    }

    await logEvent(taskId, 'intent_parser', 'running', `Parsing prompt: "${prompt}"`);
    logger.info(`[INTENT] Task ${taskId}: Parsing: "${prompt}"`);

    try {
        const intent = parseIntent(prompt);
        await logEvent(taskId, 'intent_parser', 'success', `Intent identified: ${intent.intent}`, { intent });
        logger.info(`[INTENT] Task ${taskId}: → ${intent.intent} (${(intent.confidence * 100).toFixed(0)}% conf) via ${intent.tool || 'N/A'}`);
        return res.json({ taskId, intent });
    } catch (error) {
        await logEvent(taskId, 'intent_parser', 'failed', `Error: ${error.message}`);
        logger.error(`[INTENT] Task ${taskId}: Error: ${error.message}`);
        return res.status(500).json({ taskId, status: 'failed', error: error.message });
    }
});

/** Health / debug route */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: AI_MODE, patterns: INTENT_PATTERNS.length });
});

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'AI Intent Parser is running.' });
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
    logger.info(`[INTENT] Service started on port ${PORT} (MODE: ${AI_MODE}, patterns: ${INTENT_PATTERNS.reduce((a, r) => a + r.patterns.length, 0)})`);
});
