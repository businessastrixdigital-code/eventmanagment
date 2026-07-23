const express = require('express');
const router = express.Router();
const sessionManager = require('../services/sessionManager');

/**
 * GET /status - Service and Session status monitoring endpoint
 * Backward compatible with legacy single-session calls
 */
router.get('/', (req, res) => {
    const sessionId = req.query.sessionId || req.query.session || 'default';
    const sessionInfo = sessionManager.getSessionInfo(sessionId);
    const allSessions = sessionManager.getAllSessions();

    const isTargetConnected = sessionInfo.status === 'Connected';
    const isAnyConnected = allSessions.some(s => s.status === 'Connected');

    return res.json({
        status: 'online',
        whatsappConnection: isTargetConnected ? 'connected' : (isAnyConnected ? 'connected' : 'disconnected'),
        session: sessionInfo,
        totalActiveSessions: allSessions.length
    });
});

module.exports = router;
