const express = require('express');
const router = express.Router();
const queueManager = require('../services/queueManager');
const sessionManager = require('../services/sessionManager');
const apiKeyMiddleware = require('../middleware/auth');

// Protect message routes with API Key
router.use(apiKeyMiddleware);

/**
 * POST /send - Queue a message for sending via WhatsApp Session
 * Input: { sessionId, functionId, hostGroup, phone, message, attachments, mediaUrl }
 */
router.post('/', async (req, res) => {
    const { sessionId, functionId, hostGroup, message, attachments, mediaUrl } = req.body;
    const phone = req.body.phone || req.body.to;

    const targetSessionId = sessionId || sessionManager.resolveSessionId(functionId, hostGroup);

    // Input Validation
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'Invalid phone number. It must be a non-empty string.'
        });
    }

    const hasText = message && typeof message === 'string' && message.trim() !== '';
    const hasMedia = (Array.isArray(attachments) && attachments.length > 0) || (mediaUrl && typeof mediaUrl === 'string');

    if (!hasText && !hasMedia) {
        return res.status(400).json({
            success: false,
            error: 'Invalid request. Message text or attachment media URL must be provided.'
        });
    }

    // Check Session Registration Status
    const sessionInfo = sessionManager.getSessionInfo(targetSessionId);
    if (sessionInfo.status === 'Disconnected') {
        return res.status(503).json({
            success: false,
            error: `WhatsApp session [${targetSessionId}] is disconnected. Please connect the session first.`
        });
    }

    try {
        const jobList = Array.isArray(attachments) ? attachments : (mediaUrl ? [mediaUrl] : []);

        const job = queueManager.enqueueJob({
            sessionId: targetSessionId,
            phone,
            message: message || '',
            attachments: jobList
        });

        return res.json({
            success: true,
            message: 'Message queued successfully for delivery.',
            jobId: job.id,
            sessionId: targetSessionId,
            recipient: phone
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: `Failed to queue message: ${error.message}`
        });
    }
});

module.exports = router;
