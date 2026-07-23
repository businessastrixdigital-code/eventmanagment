import express from 'express';
import db from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all guest routes
router.use(authenticate);

// Helper check to verify guest role
const requireGuest = (req, res, next) => {
  if (req.user.role !== 'guest') {
    return res.status(403).json({ error: 'Access denied. Guest session required.' });
  }
  next();
};

router.use(requireGuest);

// GET /api/guest/rsvp-status - Get details of current guest profile
router.get('/rsvp-status', async (req, res) => {
  try {
    const guest = await db.Guest.findByPk(req.user.id, {
      include: [{ model: db.Couple, attributes: ['brideName', 'groomName', 'slug'] }]
    });

    if (!guest) {
      return res.status(404).json({ error: 'Guest profile not found.' });
    }

    // Load events this guest is invited to
    const events = await db.Event.findAll({
      where: {
        coupleId: guest.coupleId,
        id: guest.inviteEvents || []
      }
    });

    return res.json({ guest, events });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch RSVP details.', details: err.message });
  }
});

// POST /api/guest/rsvp - Submit RSVP responses
router.post('/rsvp', async (req, res) => {
  const { rsvpStatus, customFieldValues } = req.body;

  if (!rsvpStatus) {
    return res.status(400).json({ error: 'rsvpStatus map is required.' });
  }

  try {
    const guest = await db.Guest.findByPk(req.user.id);
    if (!guest) return res.status(404).json({ error: 'Guest not found.' });

    // Update guest record
    guest.rsvpStatus = rsvpStatus;
    if (customFieldValues) {
      guest.customFieldValues = customFieldValues;
    }
    
    // Explicitly let Sequelize know the JSON values changed
    guest.changed('rsvpStatus', true);
    guest.changed('customFieldValues', true);

    await guest.save();

    // Broadcast live RSVP ticker update to the couple dashboard room over Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`couple-${guest.coupleId}`).emit('live-rsvp', {
        id: guest.id,
        name: guest.name,
        rsvpStatus: guest.rsvpStatus,
        customFieldValues: guest.customFieldValues,
        updatedAt: new Date()
      });
    }

    return res.json({ success: true, message: 'RSVP submitted successfully!', guest });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit RSVP.', details: err.message });
  }
});

// POST /api/guest/photo-request - Request access to restricted photo gallery albums
router.post('/photo-request', async (req, res) => {
  try {
    const guest = await db.Guest.findByPk(req.user.id);
    if (!guest) return res.status(404).json({ error: 'Guest not found.' });

    // Check if request already exists
    const existing = await db.PhotoAccessRequest.findOne({
      where: { guestId: guest.id, coupleId: guest.coupleId }
    });

    if (existing) {
      return res.json({ 
        success: true, 
        message: 'Photo access request already submitted.', 
        status: existing.status 
      });
    }

    const request = await db.PhotoAccessRequest.create({
      guestId: guest.id,
      coupleId: guest.coupleId,
      status: 'Pending'
    });

    // Broadcast alert to couple dashboard room
    const io = req.app.get('io');
    if (io) {
      io.to(`couple-${guest.coupleId}`).emit('live-photo-request', {
        requestId: request.id,
        guestId: guest.id,
        guestName: guest.name,
        requestedAt: new Date()
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Photo access request submitted successfully. Pending couple approval.',
      request
    });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit photo access request.', details: err.message });
  }
});

// GET /api/guest/photos - Retrieve photos that this guest has permission to view
router.get('/photos', async (req, res) => {
  try {
    const guest = await db.Guest.findByPk(req.user.id);
    if (!guest) return res.status(404).json({ error: 'Guest not found.' });

    // Check photo access request status
    const accessRequest = await db.PhotoAccessRequest.findOne({
      where: { guestId: guest.id, coupleId: guest.coupleId }
    });

    const isApproved = accessRequest && accessRequest.status === 'Approved';

    let photos = [];
    if (isApproved) {
      // Approved guests can view Public and Approved-guests-only albums
      const { Op } = db.Sequelize;
      photos = await db.Photo.findAll({
        where: {
          coupleId: guest.coupleId,
          privacy: {
            [Op.in]: ['Public', 'Approved-guests-only']
          }
        },
        order: [['createdAt', 'DESC']]
      });
    } else {
      // Non-approved guests can only view Public albums
      photos = await db.Photo.findAll({
        where: {
          coupleId: guest.coupleId,
          privacy: 'Public'
        },
        order: [['createdAt', 'DESC']]
      });
    }

    return res.json({
      photos,
      photoAccessStatus: accessRequest ? accessRequest.status : 'None'
    });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch photos.', details: err.message });
  }
});

// GET /api/guest/checkin - Verify guest status for QR code day checkin
router.get('/checkin', async (req, res) => {
  try {
    const guest = await db.Guest.findByPk(req.user.id, {
      attributes: ['id', 'name', 'mobile', 'side', 'group', 'inviteEvents', 'rsvpStatus']
    });

    if (!guest) {
      return res.status(404).json({ error: 'Invalid check-in details.' });
    }

    // Load details of invited events
    const events = await db.Event.findAll({
      where: {
        id: guest.inviteEvents || []
      },
      attributes: ['id', 'title', 'date', 'time', 'venue']
    });

    return res.json({
      guest,
      events,
      verified: true,
      timestamp: new Date()
    });

  } catch (err) {
    return res.status(500).json({ error: 'Check-in validation failed.', details: err.message });
  }
});

export default router;
