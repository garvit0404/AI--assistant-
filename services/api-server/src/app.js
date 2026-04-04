const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const assistantRoutes = require('./routes/assistant.routes.js');
const permissionRoutes = require('./routes/permission.routes.js');
const authRoutes = require('./routes/auth.routes.js');
const { errorHandler } = require('./middleware/errorHandler.js');
const logger = require('./utils/logger.js');
const prom = require('prom-client');

const app = express();

// --- Prometheus Metrics ---
const register = new prom.Registry();
prom.collectDefaultMetrics({ register });

const aiRequestsTotal = new prom.Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI requests processed',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Middleware to track requests
app.use((req, res, next) => {
    res.on('finish', () => {
        if (req.url !== '/metrics') {
            aiRequestsTotal.inc({
                method: req.method,
                route: req.route ? req.route.path : req.url,
                status: res.statusCode
            });
        }
    });
    next();
});
// -------------------------

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Incoming request: ${req.method} ${req.url}`);
    next();
});

const dashboardRoutes = require('./routes/dashboard.routes.js');
const integrationRoutes = require('./routes/integration.routes.js');

app.use('/api/auth', authRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/', dashboardRoutes);
app.get('/health', (req, res) => {
    const mongoState = mongoose.connection.readyState;
    const mongoStatus = mongoState === 1 ? 'connected' : 'disconnected';

    // Redis client is attached to app by redis.service when ready
    const redisClient = app.get('redisClient');
    const redisStatus = redisClient && redisClient.isReady ? 'connected' : 'disconnected';

    res.status(200).json({
        status: 'ok',
        services: {
            api: 'running',
            mongodb: mongoStatus,
            redis: redisStatus,
        },
        uptime: Math.floor(process.uptime()),
    });
});

app.get('/routes', (req, res) => {
    const list = [];
    app._router.stack.forEach(layer => {
        if (layer.route && layer.route.path) {
            Object.keys(layer.route.methods).forEach(method => {
                list.push({ path: layer.route.path, method: method.toUpperCase() });
            });
        }
        if (layer.name === 'router') {
            const basePath = layer.regexp.toString().split('\\/')[1] || '';
            layer.handle.stack.forEach(subLayer => {
                if (subLayer.route && subLayer.route.path) {
                    Object.keys(subLayer.route.methods).forEach(method => {
                        let fullPath = subLayer.route.path;
                        if (basePath && basePath.length > 0 && basePath !== '^') {
                             fullPath = '/' + basePath.split('?')[0] + fullPath;
                        }
                        list.push({ path: fullPath.replace('//', '/'), method: method.toUpperCase() });
                    });
                }
            });
        }
    });
    res.json({ routes: list });
});

app.get('/', (req, res) => {
    res.send('AI Assistant API Server is running.');
});

app.use(errorHandler);

module.exports = app;
