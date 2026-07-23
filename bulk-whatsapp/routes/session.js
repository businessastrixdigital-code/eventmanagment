const express = require('express');
const router = express.Router();
const sessionManager = require('../services/sessionManager');
const apiKeyMiddleware = require('../middleware/auth');
const QRCode = require('qrcode');

// Protect all session routes with API Key
router.use(apiKeyMiddleware);

/**
 * POST /session/create - Create or initialize a WhatsApp session
 * Input: { functionId, hostGroup, sessionId }
 */
router.post('/create', async (req, res) => {
    try {
        const { functionId, hostGroup, sessionId } = req.body;
        const targetSessionId = sessionId || sessionManager.resolveSessionId(functionId, hostGroup);

        const sessionInfo = await sessionManager.createSession(targetSessionId);
        return res.json({
            success: true,
            sessionId: targetSessionId,
            status: sessionInfo.status,
            qr: sessionInfo.qr,
            phone: sessionInfo.phone,
            connectedAt: sessionInfo.connectedAt,
            lastSeen: sessionInfo.lastSeen
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: `Failed to create session: ${err.message}`
        });
    }
});

/**
 * GET /session/list - List all active session summaries
 */
router.get('/list', (req, res) => {
    const sessions = sessionManager.getAllSessions();
    return res.json({
        success: true,
        count: sessions.length,
        data: sessions
    });
});

/**
 * GET /session/:sessionId/status - Get status of a specific session
 */
router.get('/:sessionId/status', (req, res) => {
    const { sessionId } = req.params;
    const sessionInfo = sessionManager.getSessionInfo(sessionId);

    return res.json({
        success: true,
        sessionId: sessionInfo.sessionId,
        status: sessionInfo.status,
        phone: sessionInfo.phone,
        connectedAt: sessionInfo.connectedAt,
        lastSeen: sessionInfo.lastSeen,
        error: sessionInfo.error
    });
});

/**
 * GET /session/:sessionId/qr - Get QR code string for a session
 */
router.get('/:sessionId/qr', async (req, res) => {
    const { sessionId } = req.params;
    let sessionInfo = sessionManager.getSessionInfo(sessionId);

    // Auto-create session if not registered yet
    if (sessionInfo.error === 'Session not found') {
        sessionInfo = await sessionManager.createSession(sessionId);
    }

    let finalQr = sessionInfo.qr;
    if (finalQr && !finalQr.startsWith('data:')) {
        try {
            finalQr = await QRCode.toDataURL(finalQr, { errorCorrectionLevel: 'L', margin: 4, scale: 8 });
        } catch (e) {
            // Keep raw QR if conversion fails
        }
    }

    return res.json({
        success: true,
        sessionId: sessionInfo.sessionId,
        status: sessionInfo.status,
        qr: finalQr,
        rawQr: sessionInfo.rawQr || sessionInfo.qr
    });
});

/**
 * POST /session/:sessionId/disconnect - Disconnect and destroy a session
 */
router.post('/:sessionId/disconnect', async (req, res) => {
    const { sessionId } = req.params;
    const result = await sessionManager.disconnectSession(sessionId);

    return res.json({
        success: result.success,
        message: result.message,
        sessionId
    });
});

/**
 * POST /session/:sessionId/reconnect - Reconnect a session
 */
router.post('/:sessionId/reconnect', async (req, res) => {
    const { sessionId } = req.params;
    try {
        const sessionInfo = await sessionManager.reconnectSession(sessionId);
        return res.json({
            success: true,
            message: `Session [${sessionId}] reconnected.`,
            session: sessionInfo
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: `Failed to reconnect session: ${err.message}`
        });
    }
});

module.exports = router;
