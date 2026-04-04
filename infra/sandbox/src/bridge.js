const express = require('express');
const { exec } = require('child_process');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const WORKSPACE = '/home/sandboxuser/workspace';

// ─── Browser Tool (Stateful Singleton) ──────────────────────────────────────
let _browser = null;
let _page = null;

async function getPage() {
    if (!_browser) {
        _browser = await chromium.launch({ headless: true });
        const context = await _browser.newContext();
        _page = await context.newPage();
    }
    return _page;
}

app.post('/browser/navigate', async (req, res) => {
    const { url } = req.body;
    try {
        const page = await getPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const title = await page.title();
        res.json({ status: 'success', title, url });
    } catch (err) {
        res.status(500).json({ status: 'failed', error: err.message });
    }
});

app.post('/browser/click', async (req, res) => {
    const { selector } = req.body;
    try {
        const page = await getPage();
        await page.click(selector, { timeout: 10000 });
        res.json({ status: 'success', clicked: selector });
    } catch (err) {
        res.status(500).json({ status: 'failed', error: err.message });
    }
});

app.post('/browser/fill', async (req, res) => {
    const { selector, value } = req.body;
    try {
        const page = await getPage();
        await page.fill(selector, value, { timeout: 10000 });
        res.json({ status: 'success', filled: selector });
    } catch (err) {
        res.status(500).json({ status: 'failed', error: err.message });
    }
});

app.post('/browser/search', async (req, res) => {
    const { query } = req.body;
    try {
        const page = await getPage();
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
        const results = await page.$$eval('h3', nodes => nodes.map(n => n.innerText));
        res.json({ status: 'success', results: results.slice(0, 5) });
    } catch (err) {
        res.status(500).json({ status: 'failed', error: err.message });
    }
});

app.post('/browser/close', async (req, res) => {
    if (_browser) {
        await _browser.close();
        _browser = null;
        _page = null;
    }
    res.json({ status: 'success', message: 'Browser session closed' });
});

// ─── Filesystem Tools ───────────────────────────────────────────────────────
app.post('/fs/write', (req, res) => {
    const { filePath, content } = req.body;
    const fullPath = path.join(WORKSPACE, filePath);
    
    // Safety check: ensure path is within workspace
    if (!fullPath.startsWith(WORKSPACE)) {
        return res.status(403).json({ status: 'failed', error: 'Path outside workspace' });
    }

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    res.json({ status: 'success', message: `File written to ${filePath}` });
});

app.post('/fs/read', (req, res) => {
    const { filePath } = req.body;
    const fullPath = path.join(WORKSPACE, filePath);
    
    if (!fullPath.startsWith(WORKSPACE)) {
        return res.status(403).json({ status: 'failed', error: 'Path outside workspace' });
    }

    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ status: 'failed', error: 'File not found' });
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ status: 'success', content });
});

// ─── System Execution ───────────────────────────────────────────────────────
app.post('/exec', (req, res) => {
    const { command } = req.body;
    exec(command, { cwd: WORKSPACE }, (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ status: 'failed', error: error.message, stderr });
        } else {
            res.json({ status: 'success', stdout, stderr });
        }
    });
});

const PORT = 3010;
app.listen(PORT, () => {
    console.log(`Sandbox Bridge running on port ${PORT}`);
});
