const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    userId: { type: String, default: 'default_user' },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    taskId: { type: String },
    status: { type: String },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
