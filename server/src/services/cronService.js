import cron from 'node-cron';
import db from '../models/index.js';
import { Op } from '../models/index.js';

// Note: this app is WhatsApp-only for guest notifications — there is no email or
// SMS provider configured, and none should be added. Every notification is routed
// through the wa.me deep-link flow below, which requires a couple to tap "send"
// per guest (WhatsApp has no free bulk-send API).

// Replace placeholders in templates
export const compileTemplate = (template, data) => {
  return template
    .replace(/{guestName}/g, data.guestName || '')
    .replace(/{eventName}/g, data.eventName || '')
    .replace(/{venue}/g, data.venue || '')
    .replace(/{time}/g, data.time || '')
    .replace(/{date}/g, data.date || '');
};

export const processNotifications = async (io) => {
  try {
    const now = new Date();
    
    // Find all scheduled notifications that should be sent now
    const pendingNotifications = await db.Notification.findAll({
      where: {
        status: 'Scheduled',
        scheduledAt: {
          [Op.lte]: now
        }
      },
      include: [db.Couple, db.Event]
    });

    for (const notification of pendingNotifications) {
      try {
        const couple = notification.Couple;
        const event = notification.Event;

        // Resolve list of guest recipients
        let guests = [];
        if (notification.recipients === 'all') {
          guests = await db.Guest.findAll({ where: { coupleId: couple.id } });
        } else if (notification.recipients === 'HOST_A' || notification.recipients === 'bride-side') {
          guests = await db.Guest.findAll({ where: { coupleId: couple.id, hostGroup: 'HOST_A' } });
        } else if (notification.recipients === 'HOST_B' || notification.recipients === 'groom-side') {
          guests = await db.Guest.findAll({ where: { coupleId: couple.id, hostGroup: 'HOST_B' } });
        } else if (Array.isArray(notification.recipients)) {
          guests = await db.Guest.findAll({
            where: {
              coupleId: couple.id,
              id: { [Op.in]: notification.recipients }
            }
          });
        }

        // Filters guests: only send if the guest is invited to the associated event
        if (event) {
          guests = guests.filter(g => g.inviteEvents && g.inviteEvents.includes(event.id));
        }

        // WhatsApp cannot be sent silently/automatically — there's no free bulk-send API.
        // Mark this notification as 'Pending-Action' so the couple gets a dashboard alert
        // to click "Send on WhatsApp" per guest, which opens a prefilled wa.me link.
        notification.status = 'Pending-Action';
        await notification.save();

        // Broadcast to dashboard client over Socket.io
        if (io) {
          io.to(`couple-${couple.id}`).emit('whatsapp-pending-action', {
            notificationId: notification.id,
            message: `WhatsApp broadcast ready for event: ${event ? event.title : 'General'}`
          });
        }

        await db.AuditLog.create({
          actorId: 'SYSTEM',
          action: 'WHATSAPP_PENDING_ACTION',
          targetId: notification.id,
          reason: `WhatsApp notification queue ready for ${guests.length} recipients. Requires couple interaction.`
        });

      } catch (err) {
        console.error(`Failed to process notification ${notification.id}:`, err);
        notification.status = 'Failed';
        await notification.save();
      }
    }
  } catch (err) {
    console.error('Error in cron notifier:', err);
  }
};

// Initialize Scheduler
export const initScheduler = (io) => {
  // Run every 10 seconds during local testing for quick feedback, otherwise once a minute
  cron.schedule('*/10 * * * * *', () => {
    processNotifications(io);
  });
  console.log('[SCHEDULER] Auto Notification Scheduler Initialized (runs every 10s for fast testing)');
};
