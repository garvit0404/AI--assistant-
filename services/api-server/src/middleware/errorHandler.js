const logger = require('../utils/logger.js');

module.exports = {
    errorHandler: (err, req, res, next) => {
        logger.error(`${err.name}: ${err.message}`);

        const statusCode = err.status || 500;

        res.status(statusCode).json({
            success: false,
            error: err.message || 'Internal Server Error'
        });
    }
};
