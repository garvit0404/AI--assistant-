const logger = require('../utils/logger.js');

class TelegramService {
    async sendPermissionRequest(request) {
        logger.info(`[MOCK TELEGRAM] Sending permission request to bot:
            AI wants to perform action: ${request.tool}.${request.operation}
            Target: ${request.parameters.path || 'N/A'}
            Risk Level: ${request.riskLevel}
            
            [Buttons: Approve / Deny]
        `);
        
        // In a real scenario, this would send a message via Telegram API
        // and include a callback data with the requestId.
        return { success: true, messageId: 'mock_msg_123' };
    }
}

module.exports = new TelegramService();
