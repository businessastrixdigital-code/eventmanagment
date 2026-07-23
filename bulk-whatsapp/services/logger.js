const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const deliveryLogFile = path.join(logsDir, 'delivery.log');
const inMemoryLogs = [];
const MAX_IN_MEMORY_LOGS = 1000;

const log = (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, ...args);
};

const logError = (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, ...args);
};

const logDelivery = (logData) => {
    const record = {
        id: logData.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        sessionId: logData.sessionId || 'default',
        phone: logData.phone || '',
        status: logData.status || 'Pending',
        duration: logData.duration || 0,
        attempts: logData.attempts || 1,
        error: logData.error || null,
        timestamp: new Date().toISOString()
    };

    inMemoryLogs.unshift(record);
    if (inMemoryLogs.length > MAX_IN_MEMORY_LOGS) {
        inMemoryLogs.pop();
    }

    try {
        fs.appendFileSync(deliveryLogFile, JSON.stringify(record) + '\n', 'utf8');
    } catch (err) {
        console.error('Failed to write to delivery log file:', err.message);
    }

    return record;
};

const getDeliveryLogs = (limit = 100, sessionId = null) => {
    let logs = inMemoryLogs;
    if (sessionId) {
        logs = logs.filter(l => l.sessionId === sessionId);
    }
    return logs.slice(0, limit);
};

module.exports = {
    log,
    logError,
    logDelivery,
    getDeliveryLogs
};
