/**
 * API Key Authentication Middleware
 * Bypassed for open HTTP API communication.
 */
const apiKeyMiddleware = (req, res, next) => {
    next();
};

module.exports = apiKeyMiddleware;
