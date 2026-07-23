const express = require('express');
const router = express.Router();
const statusRouter = require('./status');
const messageRouter = require('./message');
const sessionRouter = require('./session');
const healthRouter = require('./health');
const { getDeliveryLogs } = require('../services/logger');
const apiKeyMiddleware = require('../middleware/auth');

// Mount Sub-routers
router.use('/health', healthRouter);
router.use('/status', statusRouter);
router.use('/send', messageRouter);

// Session routes mounted under both plural /sessions and singular /session
router.use('/session', sessionRouter);
router.use('/sessions', sessionRouter);

// GET /logs - Delivery logs endpoint
router.get('/logs', apiKeyMiddleware, (req, res) => {
    const limit = parseInt(req.query.limit || '100', 10);
    const sessionId = req.query.sessionId || null;
    const logs = getDeliveryLogs(limit, sessionId);

    return res.json({
        success: true,
        count: logs.length,
        data: logs
    });
});

module.exports = router;
