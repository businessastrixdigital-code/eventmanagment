import express from 'express';
import multer from 'multer';
import path from 'path';
import db from '../models/index.js';
import { authenticate, verifyCouplePermission } from '../middleware/auth.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService.js';

const router = express.Router();

// Multer holds the upload in memory only (never touches local disk) — the buffer
// is streamed straight to Cloudinary. This is required because the server's local
// filesystem is ephemeral on free hosting platforms and would silently lose files.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed (jpg, jpeg, png, webp, gif)'));
  }
});

// Middleware helper to handle multer errors gracefully
const handleUpload = (fieldname) => {
  const single = upload.single(fieldname);
  return (req, res, next) => {
    single(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
};

// Check auth and verify permissions for couple actions
router.use(authenticate);

// GET /api/couple/profile - Get couple details (for Settings or Dashboard profile view)
router.get('/profile', async (req, res) => {
  try {
    const couple = await db.Couple.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash', 'bridePasswordHash', 'groomPasswordHash'] }
    });
    if (!couple) {
      return res.status(404).json({ error: 'Couple not found.' });
    }
    return res.json(couple);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch couple profile.', details: err.message });
  }
});

// 1. PROFILE SETUP
// PUT /api/couple/profile - Update couple names, wedding date, story/bio, cover photo
router.put('/profile', verifyCouplePermission('editEvents'), handleUpload('coverPhoto'), async (req, res) => {
  try {
    const coupleId = req.user.id;
    const couple = await db.Couple.findByPk(coupleId);
    if (!couple) return res.status(404).json({ error: 'Couple not found.' });

    const { brideName, groomName, weddingDate, storyBio } = req.body;

    if (brideName) couple.brideName = brideName;
    if (groomName) couple.groomName = groomName;
    if (weddingDate) couple.weddingDate = weddingDate;
    if (storyBio !== undefined) couple.storyBio = storyBio;

    if (req.file) {
      if (couple.coverPhotoPublicId) {
        await deleteFromCloudinary(couple.coverPhotoPublicId);
      }
      const { url, publicId } = await uploadBufferToCloudinary(req.file.buffer, 'mms/couple-covers');
      couple.coverPhoto = url;
      couple.coverPhotoPublicId = publicId;
    }

    await couple.save();

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'UPDATE_PROFILE',
      targetId: coupleId,
      reason: 'Couple updated profile text/cover photo.'
    });

    return res.json({ success: true, couple });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile.', details: err.message });
  }
});

// 2. EVENT MANAGEMENT
// GET /api/couple/events - List all events
router.get('/events', async (req, res) => {
  try {
    const events = await db.Event.findAll({ where: { coupleId: req.user.id }, order: [['date', 'ASC'], ['time', 'ASC']] });
    return res.json(events);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch events.', details: err.message });
  }
});

// POST /api/couple/events - Create new event
router.post('/events', verifyCouplePermission('editEvents'), handleUpload('coverImage'), async (req, res) => {
  try {
    const { type, title, date, time, venue, mapLink, dressCode, description } = req.body;

    if (!type || !title || !date || !time || !venue) {
      return res.status(400).json({ error: 'Type, title, date, time, and venue are required.' });
    }

    let coverImage = null;
    let coverImagePublicId = null;
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, 'mms/event-covers');
      coverImage = uploaded.url;
      coverImagePublicId = uploaded.publicId;
    }

    const event = await db.Event.create({
      coupleId: req.user.id,
      type,
      title,
      date,
      time,
      venue,
      mapLink,
      dressCode,
      description,
      coverImage,
      coverImagePublicId
    });

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'CREATE_EVENT',
      targetId: event.id,
      reason: `Created event: ${title} (${type})`
    });

    return res.status(201).json(event);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create event.', details: err.message });
  }
});

// PUT /api/couple/events/:id - Edit event
router.put('/events/:id', verifyCouplePermission('editEvents'), handleUpload('coverImage'), async (req, res) => {
  try {
    const event = await db.Event.findOne({ where: { id: req.params.id, coupleId: req.user.id } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const { type, title, date, time, venue, mapLink, dressCode, description } = req.body;

    if (type) event.type = type;
    if (title) event.title = title;
    if (date) event.date = date;
    if (time) event.time = time;
    if (venue) event.venue = venue;
    if (mapLink !== undefined) event.mapLink = mapLink;
    if (dressCode !== undefined) event.dressCode = dressCode;
    if (description !== undefined) event.description = description;

    if (req.file) {
      if (event.coverImagePublicId) {
        await deleteFromCloudinary(event.coverImagePublicId);
      }
      const { url, publicId } = await uploadBufferToCloudinary(req.file.buffer, 'mms/event-covers');
      event.coverImage = url;
      event.coverImagePublicId = publicId;
    }

    await event.save();

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'UPDATE_EVENT',
      targetId: event.id,
      reason: `Updated event details for: ${event.title}`
    });

    return res.json(event);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update event.', details: err.message });
  }
});

// DELETE /api/couple/events/:id - Delete event
router.delete('/events/:id', verifyCouplePermission('editEvents'), async (req, res) => {
  try {
    const event = await db.Event.findOne({ where: { id: req.params.id, coupleId: req.user.id } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const title = event.title;
    await event.destroy();

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'DELETE_EVENT',
      targetId: req.params.id,
      reason: `Deleted event: ${title}`
    });

    return res.json({ success: true, message: `Event ${title} deleted.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete event.', details: err.message });
  }
});

// 3. GUEST MANAGEMENT
// GET /api/couple/guests - List all guests (with pagination & query options)
router.get('/guests', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereCondition = { coupleId: req.user.id };
    if (search) {
      const { Op } = db.Sequelize;
      whereCondition.name = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await db.Guest.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [['name', 'ASC']]
    });

    return res.json({
      guests: rows,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch guests.', details: err.message });
  }
});

// POST /api/couple/guests - Add manual guest
router.post('/guests', verifyCouplePermission('manageGuests'), async (req, res) => {
  try {
    const { name, mobile, email, side, group, inviteEvents } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ error: 'Guest name and mobile number are required.' });
    }

    const guest = await db.Guest.create({
      coupleId: req.user.id,
      name,
      mobile,
      email,
      side: side || 'Bride',
      group: group || 'Other',
      inviteEvents: inviteEvents || [],
      rsvpStatus: {} // Initially empty RSVP status
    });

    return res.status(201).json(guest);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add guest.', details: err.message });
  }
});

// PUT /api/couple/guests/:id - Edit guest
router.put('/guests/:id', verifyCouplePermission('manageGuests'), async (req, res) => {
  try {
    const guest = await db.Guest.findOne({ where: { id: req.params.id, coupleId: req.user.id } });
    if (!guest) return res.status(404).json({ error: 'Guest not found.' });

    const { name, mobile, email, side, group, inviteEvents, rsvpStatus, customFieldValues } = req.body;

    if (name) guest.name = name;
    if (mobile) guest.mobile = mobile;
    if (email !== undefined) guest.email = email;
    if (side) guest.side = side;
    if (group) guest.group = group;
    if (inviteEvents) guest.inviteEvents = inviteEvents;
    if (rsvpStatus) guest.rsvpStatus = rsvpStatus;
    if (customFieldValues) guest.customFieldValues = customFieldValues;

    await guest.save();
    return res.json(guest);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update guest.', details: err.message });
  }
});

// DELETE /api/couple/guests/:id - Delete guest
router.delete('/guests/:id', verifyCouplePermission('manageGuests'), async (req, res) => {
  try {
    const guest = await db.Guest.findOne({ where: { id: req.params.id, coupleId: req.user.id } });
    if (!guest) return res.status(404).json({ error: 'Guest not found.' });

    await guest.destroy();
    return res.json({ success: true, message: 'Guest deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete guest.', details: err.message });
  }
});

// POST /api/couple/guests/bulk - Parse and load guest list from CSV string
router.post('/guests/bulk', verifyCouplePermission('manageGuests'), async (req, res) => {
  const { csvText } = req.body; // post raw csv text
  if (!csvText) return res.status(400).json({ error: 'CSV data is empty.' });

  try {
    // Simple robust CSV parser
    const lines = csvText.split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
    
    // Required headers: name, mobile
    const nameIndex = headers.indexOf('name');
    const mobileIndex = headers.indexOf('mobile');
    
    if (nameIndex === -1 || mobileIndex === -1) {
      return res.status(400).json({ error: 'CSV must contain "name" and "mobile" columns.' });
    }

    const emailIndex = headers.indexOf('email');
    const sideIndex = headers.indexOf('side');
    const groupIndex = headers.indexOf('group');

    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split line accounting for simple comma values
      const cols = line.split(',').map(c => c.trim().replace(/["']/g, ''));
      if (cols.length < Math.max(nameIndex, mobileIndex) + 1) continue;

      const name = cols[nameIndex];
      const mobile = cols[mobileIndex];
      if (!name || !mobile) continue;

      const email = emailIndex !== -1 ? cols[emailIndex] : '';
      const sideRaw = sideIndex !== -1 ? cols[sideIndex] : 'Bride';
      const side = (sideRaw.toLowerCase() === 'groom' || sideRaw.toLowerCase() === 'groom side') ? 'Groom' : 'Bride';
      const group = groupIndex !== -1 ? cols[groupIndex] : 'Other';

      // Deduplicate: check if this couple already has this mobile
      const existing = await db.Guest.findOne({
        where: { coupleId: req.user.id, mobile }
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      await db.Guest.create({
        coupleId: req.user.id,
        name,
        mobile,
        email: email || null,
        side,
        group,
        inviteEvents: [],
        rsvpStatus: {}
      });

      createdCount++;
    }

    return res.json({
      success: true,
      message: `Bulk CSV Import completed. Imported: ${createdCount}, Skipped duplicates/empty: ${skippedCount}`
    });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to process bulk guest upload.', details: err.message });
  }
});

// 4. CUSTOM RSVP FORM BUILDER
// GET /api/couple/custom-fields - List all fields
router.get('/custom-fields', async (req, res) => {
  try {
    const fields = await db.CustomField.findAll({ where: { coupleId: req.user.id } });
    return res.json(fields);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch custom fields.', details: err.message });
  }
});

// POST /api/couple/custom-fields - Create custom field
router.post('/custom-fields', verifyCouplePermission('editEvents'), async (req, res) => {
  try {
    const { label, type, required, options } = req.body;
    if (!label || !type) return res.status(400).json({ error: 'Label and type are required.' });

    const field = await db.CustomField.create({
      coupleId: req.user.id,
      label,
      type,
      required: !!required,
      options: options || []
    });

    return res.status(201).json(field);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create custom field.', details: err.message });
  }
});

// DELETE /api/couple/custom-fields/:id - Delete custom field
router.delete('/custom-fields/:id', verifyCouplePermission('editEvents'), async (req, res) => {
  try {
    const field = await db.CustomField.findOne({ where: { id: req.params.id, coupleId: req.user.id } });
    if (!field) return res.status(404).json({ error: 'Field not found.' });

    await field.destroy();
    return res.json({ success: true, message: 'Custom RSVP field deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete custom field.', details: err.message });
  }
});

// 5. NOTIFICATION SCHEDULER
// GET /api/couple/notifications - List scheduled & historical notifications
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await db.Notification.findAll({
      where: { coupleId: req.user.id },
      order: [['scheduledAt', 'DESC']]
    });
    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notifications queue.', details: err.message });
  }
});

// POST /api/couple/notifications - Create/schedule a notification (broadcast or event reminder)
// WhatsApp is the only supported channel in this build — there is no email/SMS provider configured.
router.post('/notifications', verifyCouplePermission('sendNotifications'), async (req, res) => {
  try {
    const { eventId, template, recipients, scheduledAt, reminderMinutesBefore } = req.body;

    if (!template || !scheduledAt) {
      return res.status(400).json({ error: 'Template and scheduledAt date/time are required.' });
    }

    const notification = await db.Notification.create({
      coupleId: req.user.id,
      eventId: eventId || null,
      channel: 'WhatsApp',
      template,
      recipients: recipients || 'all',
      status: 'Scheduled',
      scheduledAt: new Date(scheduledAt),
      reminderMinutesBefore: reminderMinutesBefore || null
    });

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'SCHEDULE_NOTIFICATION',
      targetId: notification.id,
      reason: `Scheduled WhatsApp broadcast for: ${scheduledAt}`
    });

    return res.status(201).json(notification);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to schedule notification.', details: err.message });
  }
});

// DELETE /api/couple/notifications/:id - Cancel scheduled notification
router.delete('/notifications/:id', verifyCouplePermission('sendNotifications'), async (req, res) => {
  try {
    const notification = await db.Notification.findOne({
      where: { id: req.params.id, coupleId: req.user.id, status: 'Scheduled' }
    });
    if (!notification) {
      return res.status(404).json({ error: 'Scheduled notification not found or already sent.' });
    }

    await notification.destroy();
    return res.json({ success: true, message: 'Scheduled notification cancelled successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to cancel notification.', details: err.message });
  }
});

// POST /api/couple/notifications/:id/sent - Mark a WhatsApp notification as sent
router.post('/notifications/:id/sent', verifyCouplePermission('sendNotifications'), async (req, res) => {
  try {
    const notification = await db.Notification.findOne({
      where: { id: req.params.id, coupleId: req.user.id }
    });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    notification.status = 'Sent';
    await notification.save();

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'NOTIFICATION_SENT',
      targetId: notification.id,
      reason: `WhatsApp notification queue marked as sent by couple.`
    });

    return res.json({ success: true, message: 'Notification status updated to Sent.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notification status.', details: err.message });
  }
});

// GET /api/couple/whatsapp-url/:id - Generate WhatsApp prefilled link for pending items
router.get('/whatsapp-url/:id', verifyCouplePermission('sendNotifications'), async (req, res) => {
  try {
    const notification = await db.Notification.findOne({
      where: { id: req.params.id, coupleId: req.user.id }
    });
    if (!notification) return res.status(404).json({ error: 'Notification not found.' });

    const guestId = req.query.guestId;
    if (!guestId) return res.status(400).json({ error: 'Guest ID is required.' });

    const guest = await db.Guest.findByPk(guestId);
    if (!guest) return res.status(404).json({ error: 'Guest not found.' });

    const event = notification.eventId ? await db.Event.findByPk(notification.eventId) : null;

    const data = {
      guestName: guest.name,
      eventName: event ? event.title : 'Wedding Celebration',
      venue: event ? event.venue : '',
      time: event ? event.time : '',
      date: event ? event.date : ''
    };

    // Helper function import/usage (defined locally for now)
    const compileTemplate = (template, data) => {
      return template
        .replace(/{guestName}/g, data.guestName || '')
        .replace(/{eventName}/g, data.eventName || '')
        .replace(/{venue}/g, data.venue || '')
        .replace(/{time}/g, data.time || '')
        .replace(/{date}/g, data.date || '');
    };

    const message = compileTemplate(notification.template, data);
    const encodedText = encodeURIComponent(message);
    const cleanMobile = guest.mobile.replace(/[^0-9]/g, '');

    // Generate wa.me deep link
    const waMeUrl = `https://wa.me/${cleanMobile}?text=${encodedText}`;

    return res.json({ waMeUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate WhatsApp link.', details: err.message });
  }
});

// 6. PHOTO GALLERY MANAGEMENT
// GET /api/couple/photos - List photos
router.get('/photos', async (req, res) => {
  try {
    const photos = await db.Photo.findAll({
      where: { coupleId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    return res.json(photos);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch gallery.', details: err.message });
  }
});

// POST /api/couple/photos - Upload a photo to gallery
router.post('/photos', verifyCouplePermission('managePhotos'), handleUpload('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Photo file is required.' });

  try {
    const { eventId, privacy } = req.body;

    const { url, publicId } = await uploadBufferToCloudinary(req.file.buffer, 'mms/gallery');

    const photo = await db.Photo.create({
      coupleId: req.user.id,
      eventId: eventId || null,
      uploadedBy: 'Admin',
      privacy: privacy || 'Public',
      url,
      publicId
    });

    return res.status(201).json(photo);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to upload photo.', details: err.message });
  }
});

// PUT /api/couple/photos/:id - Change photo privacy
router.put('/photos/:id', verifyCouplePermission('managePhotos'), async (req, res) => {
  try {
    const photo = await db.Photo.findOne({ where: { id: req.params.id, coupleId: req.user.id } });
    if (!photo) return res.status(404).json({ error: 'Photo not found.' });

    const { privacy } = req.body;
    if (privacy) photo.privacy = privacy;

    await photo.save();
    return res.json(photo);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update photo privacy.', details: err.message });
  }
});

// DELETE /api/couple/photos/:id - Delete photo
router.delete('/photos/:id', verifyCouplePermission('managePhotos'), async (req, res) => {
  try {
    const photo = await db.Photo.findOne({ where: { id: req.params.id, coupleId: req.user.id } });
    if (!photo) return res.status(404).json({ error: 'Photo not found.' });

    await deleteFromCloudinary(photo.publicId);
    await photo.destroy();
    return res.json({ success: true, message: 'Photo deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete photo.', details: err.message });
  }
});

// GET /api/couple/photo-requests - View guest photo access requests
router.get('/photo-requests', async (req, res) => {
  try {
    const requests = await db.PhotoAccessRequest.findAll({
      where: { coupleId: req.user.id },
      include: [db.Guest],
      order: [['createdAt', 'DESC']]
    });
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch photo requests.', details: err.message });
  }
});

// PUT /api/couple/photo-requests/:id - Approve or deny access
router.put('/photo-requests/:id', verifyCouplePermission('managePhotos'), async (req, res) => {
  const { status } = req.body; // 'Approved' | 'Denied'
  if (!status || !['Approved', 'Denied'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be Approved or Denied.' });
  }

  try {
    const request = await db.PhotoAccessRequest.findOne({
      where: { id: req.params.id, coupleId: req.user.id }
    });
    if (!request) return res.status(404).json({ error: 'Request not found.' });

    request.status = status;
    await request.save();

    return res.json({ success: true, request });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process photo request.', details: err.message });
  }
});

// 7. WEBSITE LAYOUT EDITOR
// PUT /api/couple/website-config - Update website theme & layout configs
router.put('/website-config', verifyCouplePermission('editEvents'), async (req, res) => {
  const { sections, colors, activeTemplate } = req.body;

  try {
    const couple = await db.Couple.findByPk(req.user.id);
    if (!couple) return res.status(404).json({ error: 'Couple not found.' });

    let currentConfig = couple.themeConfig || {};

    if (sections) currentConfig.sections = sections;
    if (colors) currentConfig.colors = colors;
    if (activeTemplate) currentConfig.activeTemplate = activeTemplate;

    couple.themeConfig = currentConfig;
    // Set changed manually to ensure Sequelize updates the JSON field
    couple.changed('themeConfig', true);

    await couple.save();

    return res.json({ success: true, themeConfig: couple.themeConfig });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update website editor config.', details: err.message });
  }
});

// 8. PERMISSIONS MATRIX
// PUT /api/couple/permissions - Bride vs Groom configuration toggle
router.put('/permissions', async (req, res) => {
  // Only the main admin account can update this (e.g. bride/groom permissions mapping)
  const { permissions } = req.body;
  if (!permissions) return res.status(400).json({ error: 'Permissions object required.' });

  try {
    const couple = await db.Couple.findByPk(req.user.id);
    if (!couple) return res.status(404).json({ error: 'Couple not found.' });

    couple.permissions = permissions;
    couple.changed('permissions', true);
    await couple.save();

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'UPDATE_PERMISSIONS',
      targetId: couple.id,
      reason: 'Updated Bride/Groom permissions matrix.'
    });

    return res.json({ success: true, permissions: couple.permissions });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update permissions.', details: err.message });
  }
});

// 9. DEVICE / SESSION MANAGEMENT
// GET /api/couple/sessions - Get current active sessions (mock representation)
router.get('/sessions', async (req, res) => {
  // We can return a simulated list of sessions including the current one.
  return res.json({
    sessions: [
      { id: 'sess-1', device: 'Chrome / Windows (Current)', ip: '127.0.0.1', loginAt: new Date(Date.now() - 3600000) },
      { id: 'sess-2', device: 'Safari / iPhone', ip: '192.168.1.15', loginAt: new Date(Date.now() - 86400000) }
    ]
  });
});

export default router;
