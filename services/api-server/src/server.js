require('dotenv').config();
const { config } = require('./config/env.js');
const app = require('./app.js');
const connectMongo = require('./services/mongo.service.js');
const { connectRedis, redisClient } = require('./services/redis.service.js');
const logger = require('./utils/logger.js');
const http = require('http');
const { Server } = require('socket.io');

const startServer = async () => {
    try {
        logger.info('Initializing API Server...');

        // Database Connections (Non-blocking)
        connectMongo();
        connectRedis();

        // Create HTTP server
        const server = http.createServer(app);
        
        // Initialize Socket.io
        const io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        io.on('connection', (socket) => {
            logger.info(`Client connected to WebSocket: ${socket.id}`);
            socket.on('disconnect', () => {
                logger.info(`Client disconnected: ${socket.id}`);
            });
        });

        // Make io globally accessible for services
        global.io = io;

        // Make redisClient accessible to the health endpoint in app.js
        app.set('redisClient', redisClient);

        // Listen on Port
        server.listen(config.PORT, '0.0.0.0', () => {
            logger.info(`[INFO] API Server started on port ${config.PORT}`);
            logger.info(`Environment: ${config.NODE_ENV}`);
        });

    } catch (error) {
        logger.error(`Failed to start API Server: ${error.message}`);
        process.exit(1);
    }
};

startServer();
