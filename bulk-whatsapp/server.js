require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { initializeWhatsApp } = require('./services/whatsappService');
const { log, logError } = require('./services/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Process Error Monitoring - Prevent uncaught exceptions from bringing down service
process.on('uncaughtException', (err) => {
    logError('Uncaught Exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Middleware
app.use(cors());

// Custom Request Logger Middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// JSON Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes under both /api and root / for full caller compatibility
app.use('/api', routes);
app.use('/', routes);

// Fallback JSON 404 Handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint Not Found'
    });
});

// Global JSON Error Handler Middleware
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: `Invalid JSON payload: ${err.message}`
        });
    }

    logError('Express global error handler:', err.message, err.stack);

    return res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error'
    });
});

// Start Server
app.listen(PORT, () => {
    log(`========================================================`);
    log(`  Bulk WhatsApp Multi-Session Service active on port ${PORT}`);
    log(`========================================================`);
    
    // Auto-restore existing WhatsApp sessions on boot
    initializeWhatsApp();
});
