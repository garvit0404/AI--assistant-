const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const SECRET_KEY = process.env.JWT_SECRET || 'ai-assistant-secret-2026';

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Contains id, username, role
        logger.info(`Verified token for user ${decoded.username}`);
        next();
    } catch (err) {
        logger.error(`JWT Verification Error: ${err.message}`);
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
};

module.exports = { authMiddleware };
