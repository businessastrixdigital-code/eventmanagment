const sessionManager = require('./sessionManager');
const queueManager = require('./queueManager');

/**
 * Backward-compatible service wrapper.
 * Integrates legacy calls with Multi-Session SessionManager & QueueManager.
 */
const initializeWhatsApp = () => {
    // Auto-restore all saved sessions on service startup
    sessionManager.autoRestoreSessions().catch(() => {});
};

const sendMessage = async (phone, message, sessionId = 'default', attachments = []) => {
    return queueManager.enqueueJob({
        sessionId,
        phone,
        message,
        attachments
    });
};

const getStatus = (sessionId = 'default') => {
    const info = sessionManager.getSessionInfo(sessionId);
    return info.status === 'Connected';
};

module.exports = {
    initializeWhatsApp,
    sendMessage,
    getStatus,
    sessionManager,
    queueManager
};
