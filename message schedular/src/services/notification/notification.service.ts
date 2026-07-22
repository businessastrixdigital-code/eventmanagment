import dbConnect from '@/lib/db';
import NotificationJob, { INotificationJob, ProviderType, MessageType } from '@/models/NotificationJob';
import { providerFactory } from './providers/factory';

export class NotificationService {
  /**
   * Helper to interpolate variables into template text.
   */
  static interpolateTemplate(text: string, variables: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(placeholder, value || '');
    }
    return result;
  }

  /**
   * Enqueue a new notification job. Never duplicates for the same guest + event + type.
   */
  static async enqueueJob(data: {
    marriageId: string;
    guestId?: string;
    recipient: string;
    type: MessageType;
    provider: ProviderType;
    templateName: string;
    variables: Record<string, string>;
    creatorId: string;
  }): Promise<INotificationJob> {
    await dbConnect();

    // Check if duplicate job already exists
    if (data.guestId) {
      const duplicate = await NotificationJob.findOne({
        marriageId: data.marriageId,
        guestId: data.guestId,
        type: data.type,
      });
      if (duplicate) {
        return duplicate; // Reuse existing job instead of duplicating
      }
    }

    const nextAttempt = new Date();

    return NotificationJob.create({
      marriageId: data.marriageId,
      guestId: data.guestId,
      recipient: data.recipient,
      type: data.type,
      provider: data.provider,
      templateName: data.templateName,
      variables: data.variables,
      status: 'pending',
      attempts: 0,
      maxAttempts: 5,
      nextAttemptAt: nextAttempt,
      createdBy: data.creatorId,
    });
  }

  /**
   * Queue processor executing pending runs.
   */
  static async processPendingJobs(): Promise<{ processed: number; successes: number; failures: number }> {
    await dbConnect();

    const now = new Date();
    const pendingJobs = await NotificationJob.find({
      status: { $in: ['pending', 'queued'] },
      nextAttemptAt: { $lte: now },
      attempts: { $lt: 5 },
    });

    let successes = 0;
    let failures = 0;

    for (const job of pendingJobs) {
      try {
        job.status = 'processing';
        await job.save();

        const providerInstance = providerFactory.getProvider(job.provider);

        // Execute dispatch
        const sendResult = await providerInstance.send(
          job.recipient,
          job.templateName,
          job.variables
        );

        const newAttempt = {
          attemptedAt: new Date(),
          status: sendResult.success ? ('sent' as const) : ('failed' as const),
          error: sendResult.error,
          providerUsed: job.provider,
        };

        job.attemptsLog.push(newAttempt);
        job.attempts += 1;
        job.lastAttemptAt = new Date();

        if (sendResult.success) {
          job.status = 'sent';
          job.messageId = sendResult.messageId;
          job.error = undefined;
          successes++;
        } else {
          job.error = sendResult.error;

          if (job.attempts >= job.maxAttempts) {
            // DLQ: Dead Letter Queue limit reached
            job.status = 'failed';
            failures++;
          } else {
            // Exponential retry backoff: 2 ^ attempts * 60 seconds (1: 2m, 2: 4m, 3: 8m, etc.)
            const delayInMinutes = Math.pow(2, job.attempts) * 2;
            job.nextAttemptAt = new Date(Date.now() + delayInMinutes * 60 * 1000);
            job.status = 'queued';
          }
        }

        await job.save();
      } catch (err: any) {
        failures++;
        job.attempts += 1;
        job.status = job.attempts >= job.maxAttempts ? 'failed' : 'queued';
        job.error = err.message || 'Unknown processing runtime exception.';
        job.attemptsLog.push({
          attemptedAt: new Date(),
          status: 'failed',
          error: err.message || 'Execution error.',
          providerUsed: job.provider,
        });

        // Set next backoff run
        const delayInMinutes = Math.pow(2, job.attempts) * 2;
        job.nextAttemptAt = new Date(Date.now() + delayInMinutes * 60 * 1000);

        await job.save();
      }
    }

    return {
      processed: pendingJobs.length,
      successes,
      failures,
    };
  }

  /**
   * Manually trigger retry for a failed DLQ job.
   */
  static async retryJob(jobId: string, updaterId: string): Promise<INotificationJob> {
    await dbConnect();

    const job = await NotificationJob.findById(jobId);
    if (!job) throw new Error('Notification job not found.');

    job.status = 'pending';
    job.attempts = 0;
    job.nextAttemptAt = new Date();
    job.error = undefined;
    job.updatedBy = updaterId;

    return job.save();
  }

  /**
   * Cancel an enqueued notification job.
   */
  static async cancelJob(jobId: string, updaterId: string): Promise<INotificationJob> {
    await dbConnect();

    const job = await NotificationJob.findById(jobId);
    if (!job) throw new Error('Notification job not found.');

    job.status = 'cancelled';
    job.updatedBy = updaterId;

    return job.save();
  }
}

export default NotificationService;
