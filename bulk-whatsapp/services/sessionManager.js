const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const { log, logError } = require('./logger');

const sessionsDir = path.join(__dirname, '../sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

const cleanStaleSessionLocks = (sessionId) => {
    try {
        const sessionFolder = path.join(sessionsDir, `session-${sessionId}`);
        if (!fs.existsSync(sessionFolder)) return;

        const lockFiles = [
            path.join(sessionFolder, 'DevToolsActivePort'),
            path.join(sessionFolder, 'SingletonLock'),
            path.join(sessionFolder, 'SingletonCookie'),
            path.join(sessionFolder, 'SingletonSocket'),
            path.join(sessionFolder, 'Default', 'LOCK'),
            path.join(sessionFolder, 'Default', 'SingletonLock')
        ];

        for (const file of lockFiles) {
            if (fs.existsSync(file)) {
                try { fs.unlinkSync(file); } catch (e) {}
            }
        }
    } catch (e) {}
};

class SessionManager {
    constructor() {
        // Map<sessionId, SessionInfo>
        this.sessions = new Map();
    }

    /**
     * Resolves standardized sessionId from functionId and hostGroup if passed separately.
     */
    resolveSessionId(functionId, hostGroup) {
        if (functionId && hostGroup) {
            return `${functionId}_${hostGroup}`;
        }
        if (functionId) {
            return functionId;
        }
        return 'default';
    }

    /**
     * Create or retrieve a WhatsApp session instance.
     * @param {string} sessionId 
     * @returns {Promise<Object>} session object
     */
    async createSession(sessionId) {
        const id = sessionId || 'default';

        if (this.sessions.has(id)) {
            const existing = this.sessions.get(id);
            if (existing.status === 'Connected' || existing.status === 'Connecting' || existing.status === 'QR_Ready') {
                return this.getSessionInfo(id);
            }
        }

        // Clean stale lock files before creating browser
        cleanStaleSessionLocks(id);

        log(`Initializing WhatsApp session [${id}]...`);

        const sessionObj = {
            sessionId: id,
            client: null,
            phone: null,
            status: 'Connecting',
            qr: null,
            connectedAt: null,
            lastSeen: new Date().toISOString(),
            error: null
        };

        const puppeteerArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--no-first-run',
            '--no-zygote',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        ];

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: id,
                dataPath: sessionsDir
            }),
            puppeteer: {
                headless: true,
                handleSIGINT: false,
                args: puppeteerArgs
            }
        });

        sessionObj.client = client;
        this.sessions.set(id, sessionObj);

        // Client Event Listeners
        client.on('loading_screen', (percent, message) => {
            log(`[${id}] Loading ${percent}% - ${message}`);
        });

        client.on('change_state', (state) => {
            log(`[${id}] State: ${state}`);
        });

        client.on('qr', async (qr) => {
            log(`QR Code generated for session [${id}]`);
            sessionObj.status = 'QR_Ready';
            sessionObj.rawQr = qr;
            sessionObj.qrTimestamp = Date.now();
            sessionObj.lastSeen = new Date().toISOString();

            try {
                // Generate native Base64 PNG Data URL (100% browser compatible with zero rendering bugs)
                const pngDataUrl = await QRCode.toDataURL(qr, { errorCorrectionLevel: 'M', margin: 2, scale: 10 });
                sessionObj.qr = pngDataUrl;
                sessionObj.svgQr = pngDataUrl;
            } catch (err) {
                sessionObj.qr = qr;
                sessionObj.svgQr = qr;
            }

            // Also output terminal QR code for local debugging
            qrcodeTerminal.generate(qr, { small: true });
        });

        client.on('ready', async () => {
            log(`WhatsApp session [${id}] is READY & CONNECTED.`);
            sessionObj.status = 'Connected';
            sessionObj.qr = null;
            sessionObj.svgQr = null;
            sessionObj.connectedAt = new Date().toISOString();
            sessionObj.lastSeen = new Date().toISOString();
            sessionObj.error = null;

            try {
                if (client.info && client.info.wid) {
                    sessionObj.phone = client.info.wid.user;
                }
            } catch (e) {
                // Ignore wid read error
            }
        });

        client.on('authenticated', () => {
            log(`Session [${id}] authenticated.`);
            sessionObj.status = 'Connecting';
            sessionObj.lastSeen = new Date().toISOString();
        });

        client.on('auth_failure', async (msg) => {
            logError(`Session [${id}] Authentication Failure:`, msg);
            sessionObj.status = 'Disconnected';
            sessionObj.phone = null;
            sessionObj.qr = null;
            sessionObj.svgQr = null;
            sessionObj.error = `Authentication Failure: ${msg}`;
            sessionObj.lastSeen = new Date().toISOString();

            // Clear session directory on auth failure to allow clean repair
            const sessionPath = path.join(sessionsDir, `session-${id}`);
            if (fs.existsSync(sessionPath)) {
                try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
            }
        });

        client.on('disconnected', (reason) => {
            log(`Session [${id}] Disconnected:`, reason);
            sessionObj.status = 'Disconnected';
            sessionObj.phone = null;
            sessionObj.qr = null;
            sessionObj.svgQr = null;
            sessionObj.error = `Disconnected: ${reason}`;
            sessionObj.lastSeen = new Date().toISOString();
        });

        // Initialize background client without blocking Event Loop
        client.initialize().catch((err) => {
            logError(`Error during initialization of session [${id}]:`, err.message);
            sessionObj.status = 'Disconnected';
            sessionObj.error = err.message;
            if (err.message && err.message.includes('already running')) {
                cleanStaleSessionLocks(id);
            }
        });

        return this.getSessionInfo(id);
    }

    /**
     * Get clean session info without client object circular refs.
     */
    getSessionInfo(sessionId) {
        const id = sessionId || 'default';
        const sessionObj = this.sessions.get(id);

        if (!sessionObj) {
            return {
                sessionId: id,
                status: 'Disconnected',
                phone: null,
                qr: null,
                svgQr: null,
                connectedAt: null,
                lastSeen: null,
                error: 'Session not found'
            };
        }

        return {
            sessionId: sessionObj.sessionId,
            status: sessionObj.status,
            phone: sessionObj.phone,
            qr: sessionObj.svgQr || sessionObj.qr,
            pngQr: sessionObj.qr,
            rawQr: sessionObj.rawQr,
            qrTimestamp: sessionObj.qrTimestamp,
            connectedAt: sessionObj.connectedAt,
            lastSeen: sessionObj.lastSeen,
            error: sessionObj.error
        };
    }

    /**
     * Get active whatsapp-web.js Client instance.
     */
    getClient(sessionId) {
        const id = sessionId || 'default';
        const sessionObj = this.sessions.get(id);
        return sessionObj ? sessionObj.client : null;
    }

    /**
     * Get list of all session summaries.
     */
    getAllSessions() {
        const list = [];
        for (const [id, sessionObj] of this.sessions.entries()) {
            list.push(this.getSessionInfo(id));
        }
        return list;
    }

    /**
     * Disconnect and destroy a session safely.
     */
    async disconnectSession(sessionId) {
        const id = sessionId || 'default';
        const sessionObj = this.sessions.get(id);

        if (!sessionObj) {
            // Clean up session directory if present
            const sessionPath = path.join(sessionsDir, `session-${id}`);
            if (fs.existsSync(sessionPath)) {
                try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
            }
            return { success: true, message: 'Session cleaned.' };
        }

        log(`Disconnecting session [${id}]...`);
        try {
            if (sessionObj.client) {
                await sessionObj.client.logout().catch(() => {});
                await sessionObj.client.destroy().catch(() => {});
            }
        } catch (err) {
            logError(`Error destroying client for session [${id}]:`, err.message);
        }

        this.sessions.delete(id);

        // Remove local session files
        const sessionPath = path.join(sessionsDir, `session-${id}`);
        if (fs.existsSync(sessionPath)) {
            try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
        }

        return { success: true, message: `Session [${id}] disconnected and cleaned.` };
    }

    /**
     * Reconnect an existing session.
     */
    async reconnectSession(sessionId) {
        const id = sessionId || 'default';
        await this.disconnectSession(id);
        return await this.createSession(id);
    }

    /**
     * Auto-restore existing saved sessions on service boot.
     */
    async autoRestoreSessions() {
        try {
            if (!fs.existsSync(sessionsDir)) return;
            const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith('session-')) {
                    const sessionId = entry.name.replace('session-', '');
                    log(`Restoring session from storage: [${sessionId}]`);
                    this.createSession(sessionId).catch(err => {
                        logError(`Failed auto-restoring session [${sessionId}]:`, err.message);
                    });
                }
            }
        } catch (err) {
            logError('Error auto-restoring sessions:', err.message);
        }
    }
}

const sessionManager = new SessionManager();
module.exports = sessionManager;
