import cron from 'node-cron';
import db from '../models/index.js';
import { Op } from '../models/index.js';

// Note: this app is WhatsApp-only for guest notifications — there is no email or
// SMS provider configured, and none should be added. Every notification is routed
// through the wa.me deep-link flow below, which requires a couple to tap "send"
// per guest (WhatsApp has no free bulk-send API).

// Convert timing string or custom minutes into minutes before event
export const getTimingMinutes = (timing, customMinutesBefore) => {
  switch (timing) {
    case '7_days_before': return 7 * 24 * 60;
    case '3_days_before': return 3 * 24 * 60;
    case '1_day_before': return 1 * 24 * 60;
    case '2_hours_before': return 2 * 60;
    case '30_mins_before': return 30;
    case 'custom': return parseInt(customMinutesBefore || 0, 10);
    default: return 0;
  }
};

// Replace placeholders in templates
export const compileTemplate = (template, data) => {
  let msg = (template || '')
    .replace(/\{\{guestName\}\}|\{guestName\}/g, data.guestName || '')
    .replace(/\{\{functionName\}\}|\{functionName\}/g, data.functionName || '')
    .replace(/\{\{eventName\}\}|\{eventName\}/g, data.eventName || '')
    .replace(/\{\{eventDate\}\}|\{eventDate\}|\{date\}/g, data.date || '')
    .replace(/\{\{eventTime\}\}|\{eventTime\}|\{time\}/g, data.time || '')
    .replace(/\{\{venue\}\}|\{venue\}/g, data.venue || '')
    .replace(/\{\{googleMap\}\}|\{googleMap\}|\{location\}/g, data.locationLink || data.venue || '')
    .replace(/\{\{guestPortal\}\}|\{guestPortal\}|\{loginUrl\}/g, data.loginUrl || '');

  if (data.cardUrl) {
    if (msg.includes('{{cardUrl}}') || msg.includes('{cardUrl}')) {
      msg = msg.replace(/\{\{cardUrl\}\}|\{cardUrl\}/g, data.cardUrl);
    } else if (!msg.includes(data.cardUrl)) {
      msg = `${msg}\n\nInvitation Card: ${data.cardUrl}`;
    }
  }

  return msg;
};

export const processNotifications = async (io) => {
  try {
    const now = new Date();

    // 1. Process active MessageReminders that are due
    try {
      const activeReminders = await db.MessageReminder.findAll({
        where: { isEnabled: true },
        include: [db.Event, db.MessageTemplate]
      });

      for (const reminder of activeReminders) {
        if (!reminder.Event || !reminder.MessageTemplate) continue;
        if (!reminder.MessageTemplate.isActive) continue;

        const event = reminder.Event;
        const template = reminder.MessageTemplate;

        // Parse event date and time
        const eventTime24 = event.time.includes('M') || event.time.includes('m') ? event.time : `${event.time}:00`;
        const eventDateTimeStr = `${event.date}T${eventTime24}`;
        const eventDateObj = new Date(eventDateTimeStr);
        if (isNaN(eventDateObj.getTime())) continue;

        const minutesBefore = getTimingMinutes(reminder.timing, reminder.customMinutesBefore);
        const triggerTimeObj = new Date(eventDateObj.getTime() - minutesBefore * 60 * 1000);

        // Check if reminder trigger threshold is met and hasn't been triggered yet
        if (now >= triggerTimeObj && !reminder.lastTriggeredAt) {
          reminder.lastTriggeredAt = now.toISOString();
          reminder.status = 'Triggered';
          await reminder.save();

          // Create notification queue item
          await db.Notification.create({
            coupleId: reminder.coupleId,
            eventId: reminder.eventId,
            channel: 'WhatsApp',
            template: template.messageContent,
            recipients: reminder.hostGroup,
            status: 'Pending-Action',
            scheduledAt: triggerTimeObj,
            reminderMinutesBefore: minutesBefore
          });

          if (io) {
            io.to(`couple-${reminder.coupleId}`).emit('whatsapp-pending-action', {
              reminderId: reminder.id,
              message: `Event reminder triggered for ${event.title}`
            });
          }
        }
      }
    } catch (reminderErr) {
      console.error('Error evaluating message reminders:', reminderErr);
    }
    
    // 2. Find all scheduled notifications that should be sent now
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
