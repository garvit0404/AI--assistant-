const mongoose = require('mongoose');
const logger = require('../utils/logger.js');

const timelineSchema = new mongoose.Schema({
    taskId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    stage: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Object, default: {} }
});

const Timeline = mongoose.model('Timeline', timelineSchema);

class TimelineService {
    async log(taskId, stage, message, metadata = {}) {
        try {
            const entry = new Timeline({
                taskId,
                stage,
                message,
                metadata
            });
            await entry.save();
            logger.info(`[TIMELINE] ${taskId} - ${stage}: ${message}`);
            
            // TASK 10: Docker Console Logs
            console.log(`[LOG] ${stage.toUpperCase()} [${metadata.status || 'INFO'}] ${taskId}: ${message}`);

            // Broadcast via WebSocket (if available)
            if (global.io) {
                global.io.emit('timeline_update', {
                    taskId,
                    timestamp: entry.timestamp,
                    stage,
                    message,
                    metadata
                });
            }
            return entry;
        } catch (error) {
            logger.error(`Failed to log timeline entry: ${error.message}`);
        }
    }

    async getByTaskId(taskId) {
        return await Timeline.find({ taskId }).sort({ timestamp: 1 });
    }
}

module.exports = new TimelineService();
