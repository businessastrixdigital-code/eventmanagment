const express = require('express');
const router = express.Router();
const sessionManager = require('../services/sessionManager');
const process = require('process');

/**
 * GET /health - System & Session Health Monitoring Endpoint
 */
router.get('/', (req, res) => {
    const allSessions = sessionManager.getAllSessions();
    const connectedSessions = allSessions.filter(s => s.status === 'Connected').length;

    const memory = process.memoryUsage();
    const formattedMemory = {
        rss: `${(memory.rss / (1024 * 1024)).toFixed(2)} MB`,
        heapTotal: `${(memory.heapTotal / (1024 * 1024)).toFixed(2)} MB`,
        heapUsed: `${(memory.heapUsed / (1024 * 1024)).toFixed(2)} MB`,
        external: `${(memory.external / (1024 * 1024)).toFixed(2)} MB`
    };

    const cpu = process.cpuUsage();

    return res.json({
        status: 'Running',
        connectedSessionsCount: connectedSessions,
        totalSessionsCount: allSessions.length,
        memoryUsage: formattedMemory,
        cpuUsage: cpu,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
