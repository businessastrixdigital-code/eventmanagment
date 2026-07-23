const sessionManager = require('./sessionManager');
const { downloadAndCreateMedia, cleanupTempFile } = require('./mediaHelper');
const { log, logError, logDelivery } = require('./logger');

class QueueManager {
    constructor() {
        // Queue of jobs: [{ id, sessionId, phone, message, attachments, attempts, maxAttempts, createdAt }]
        this.queue = [];
        this.isProcessing = false;
        this.delayMs = 1500; // 1.5s delay between message dispatches to prevent WhatsApp spam flags
    }

    /**
     * Enqueue a new message job.
     */
    enqueueJob(jobData) {
        const job = {
            id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            sessionId: jobData.sessionId || 'default',
            phone: jobData.phone,
            message: jobData.message,
            attachments: Array.isArray(jobData.attachments) ? jobData.attachments : (jobData.mediaUrl ? [jobData.mediaUrl] : []),
            attempts: 0,
            maxAttempts: 3,
            createdAt: new Date().toISOString()
        };

        this.queue.push(job);
        log(`Enqueued message job [${job.id}] for session [${job.sessionId}] to recipient [${job.phone}]. Queue size: ${this.queue.length}`);

        // Start processing queue if idle
        setImmediate(() => this.processQueue());

        return job;
    }

    /**
     * Background Queue Processor Loop
     */
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const job = this.queue.shift();
            await this.executeJob(job);
            // Delay before processing next message to preserve WhatsApp socket rate limits
            await new Promise(resolve => setTimeout(resolve, this.delayMs));
        }

        this.isProcessing = false;
    }

    /**
     * Executes a single message dispatch with retries up to maxAttempts (3).
     */
    async executeJob(job) {
        const startTime = Date.now();
        job.attempts += 1;

        const sessionInfo = sessionManager.getSessionInfo(job.sessionId);
        const client = sessionManager.getClient(job.sessionId);

        // Validation check
        if (sessionInfo.status !== 'Connected' || !client) {
            const errReason = `Session [${job.sessionId}] is not connected (Status: ${sessionInfo.status}).`;
            logError(`Job [${job.id}] attempt ${job.attempts}/${job.maxAttempts} failed:`, errReason);

            if (job.attempts < job.maxAttempts) {
                log(`Re-queueing job [${job.id}] for retry attempt ${job.attempts + 1}...`);
                this.queue.push(job);
            } else {
                logDelivery({
                    id: job.id,
                    sessionId: job.sessionId,
                    phone: job.phone,
                    status: 'Failed',
                    duration: Date.now() - startTime,
                    attempts: job.attempts,
                    error: errReason
                });
            }
            return;
        }

        const cleanPhone = String(job.phone).replace(/\D/g, '');
        const formattedPhone = `${cleanPhone}@c.us`;

        let tempFilePath = null;
        try {
            log(`Dispatching message via session [${job.sessionId}] to [${formattedPhone}]...`);

            // Handle Attachments (Images, PDFs, Documents, Cloudinary URLs)
            if (job.attachments && job.attachments.length > 0) {
                for (const mediaUrl of job.attachments) {
                    const { media, tempFilePath: tmpPath } = await downloadAndCreateMedia(mediaUrl);
                    tempFilePath = tmpPath;

                    await client.sendMessage(formattedPhone, media, { caption: job.message || '' });
                    cleanupTempFile(tempFilePath);
                    tempFilePath = null;
                }
            } else {
                // Send plain text message
                await client.sendMessage(formattedPhone, job.message);
            }

            const duration = Date.now() - startTime;
            log(`Job [${job.id}] sent SUCCESSFULLY in ${duration}ms via session [${job.sessionId}].`);

            logDelivery({
                id: job.id,
                sessionId: job.sessionId,
                phone: job.phone,
                status: 'Sent',
                duration,
                attempts: job.attempts,
                error: null
            });

        } catch (err) {
            const duration = Date.now() - startTime;
            logError(`Job [${job.id}] attempt ${job.attempts}/${job.maxAttempts} error:`, err.message);

            if (tempFilePath) {
                cleanupTempFile(tempFilePath);
            }

            if (job.attempts < job.maxAttempts) {
                log(`Re-queueing job [${job.id}] for retry attempt ${job.attempts + 1}...`);
                this.queue.push(job);
            } else {
                logDelivery({
                    id: job.id,
                    sessionId: job.sessionId,
                    phone: job.phone,
                    status: 'Failed',
                    duration,
                    attempts: job.attempts,
                    error: err.message
                });
            }
        }
    }
}

const queueManager = new QueueManager();
module.exports = queueManager;
