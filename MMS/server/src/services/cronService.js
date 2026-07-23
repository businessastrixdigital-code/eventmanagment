import cron from 'node-cron';
import db from '../models/index.js';
import { Op } from '../models/index.js';
import whatsappClient from './communication/whatsappClient.js';
import crypto from 'crypto';

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
            id: crypto.randomUUID(),
            coupleId: reminder.coupleId,
            eventId: reminder.eventId,
            channel: 'WhatsApp',
            template: template.messageContent,
            recipients: reminder.hostGroup,
            status: 'Scheduled',
            scheduledAt: triggerTimeObj.toISOString(),
            reminderMinutesBefore: minutesBefore
          });
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
          [Op.lte]: now.toISOString()
        }
      },
      include: [db.Couple, db.Event]
    });

    for (const notification of pendingNotifications) {
      try {
        const couple = notification.Couple;
        const event = notification.Event;
        const functionId = couple.id;

        // Resolve list of guest recipients
        let guests = [];
        if (notification.recipients === 'all') {
          guests = await db.Guest.findAll({ where: { coupleId: functionId } });
        } else if (notification.recipients === 'HOST_A' || notification.recipients === 'bride-side') {
          guests = await db.Guest.findAll({ where: { coupleId: functionId, hostGroup: 'HOST_A' } });
        } else if (notification.recipients === 'HOST_B' || notification.recipients === 'groom-side') {
          guests = await db.Guest.findAll({ where: { coupleId: functionId, hostGroup: 'HOST_B' } });
        } else if (Array.isArray(notification.recipients)) {
          guests = await db.Guest.findAll({
            where: {
              coupleId: functionId,
              id: { [Op.in]: notification.recipients }
            }
          });
        }

        if (event) {
          guests = guests.filter(g => g.inviteEvents && g.inviteEvents.includes(event.id));
        }

        // Fetch WhatsApp connection status for both Host Groups
        const connA = await db.WhatsAppConnection.findOne({ where: { functionId, hostGroup: 'HOST_A' } });
        const connB = await db.WhatsAppConnection.findOne({ where: { functionId, hostGroup: 'HOST_B' } });

        const sessionAConnected = connA && connA.status === 'Connected';
        const sessionBConnected = connB && connB.status === 'Connected';

        let processedCount = 0;
        let successCount = 0;

        for (const guest of guests) {
          const guestHostGroup = guest.hostGroup || 'HOST_A';
          const sessionId = `${functionId}_${guestHostGroup}`;
          const isSessionConnected = guestHostGroup === 'HOST_B' ? sessionBConnected : sessionAConnected;

          // Resolve PDF card URL based on guest invitationType (Sahjode vs Sarva)
          const invType = guest.invitationType || 'Sahjode';
          const cardUrl = invType === 'Sarva' ? (couple.sarvaCardUrl || couple.sarvaCard) : (couple.sahjodeCardUrl || couple.sahjodeCard);

          const compiledMessage = compileTemplate(notification.template, {
            guestName: guest.name,
            functionName: guestHostGroup === 'HOST_B' ? (couple.hostGroupBName || 'Groom Family') : (couple.hostGroupAName || 'Bride Family'),
            eventName: event ? event.title : 'Wedding Celebration',
            date: event ? event.date : '',
            time: event ? event.time : '',
            venue: event ? event.venue : '',
            locationLink: event && (event.mapLink || event.mapsLink) ? (event.mapLink || event.mapsLink) : '',
            loginUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${couple.slug}`,
            cardUrl: cardUrl || ''
          });

          let sendResult;
          if (isSessionConnected) {
            if (cardUrl) {
              sendResult = await whatsappClient.sendMediaMessage(sessionId, guest.mobile, compiledMessage, cardUrl);
            } else {
              sendResult = await whatsappClient.sendTextMessage(sessionId, guest.mobile, compiledMessage);
            }
          } else {
            sendResult = { ok: false, error: `WhatsApp session for ${guestHostGroup} is disconnected.` };
          }

          const isSent = sendResult && sendResult.ok;
          if (isSent) successCount++;
          processedCount++;

          // Create CommunicationLog entry
          await db.CommunicationLog.create({
            id: crypto.randomUUID(),
            notificationId: notification.id,
            functionId,
            guestId: guest.id,
            guestName: guest.name,
            hostGroup: guestHostGroup,
            sessionId,
            phone: guest.mobile,
            status: isSent ? 'Sent' : 'Failed',
            sentAt: isSent ? new Date().toISOString() : null,
            error: isSent ? null : (sendResult ? sendResult.error : 'Connection error'),
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        notification.status = (successCount > 0 && successCount === guests.length) ? 'Sent' : 'Pending-Action';
        await notification.save();

        if (io) {
          io.to(`couple-${functionId}`).emit('whatsapp-pending-action', {
            notificationId: notification.id,
            message: `Processed WhatsApp notification for ${processedCount} recipients (${successCount} sent).`
          });
        }

        await db.AuditLog.create({
          actorId: 'SYSTEM',
          action: 'WHATSAPP_AUTO_DISPATCH',
          targetId: notification.id,
          reason: `WhatsApp notification executed for ${processedCount} recipients (${successCount} succeeded).`
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
