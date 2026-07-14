import express from 'express';
import db from '../models/index.js';

const router = express.Router();

// GET /api/public/wedding/:slug - Fetch full public wedding site configuration
router.get('/wedding/:slug', async (req, res) => {
  try {
    const couple = await db.Couple.findOne({
      where: { slug: req.params.slug },
      attributes: { exclude: ['passwordHash', 'mobile'] } // omit credentials and contact
    });

    if (!couple) {
      return res.status(404).json({ error: 'Wedding website not found.' });
    }

    // Fetch associated public information
    const events = await db.Event.findAll({
      where: { coupleId: couple.id },
      order: [['date', 'ASC'], ['time', 'ASC']]
    });

    const customFields = await db.CustomField.findAll({
      where: { coupleId: couple.id }
    });

    const wishes = await db.Wish.findAll({
      where: { coupleId: couple.id, approved: true },
      order: [['createdAt', 'DESC']]
    });

    const languages = await db.Language.findAll();

    // Fetch only public photos (privacy = 'Public')
    const photos = await db.Photo.findAll({
      where: { coupleId: couple.id, privacy: 'Public' },
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      couple,
      events,
      customFields,
      wishes,
      photos,
      languages
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch wedding details.', details: err.message });
  }
});

// POST /api/public/wedding/:slug/wish - Add guest wish (publicly accessible, moderated)
router.post('/wedding/:slug/wish', async (req, res) => {
  const { guestName, message } = req.body;

  if (!guestName || !message) {
    return res.status(400).json({ error: 'Guest name and message are required.' });
  }

  try {
    const couple = await db.Couple.findOne({ where: { slug: req.params.slug } });
    if (!couple) {
      return res.status(404).json({ error: 'Wedding website not found.' });
    }

    const wish = await db.Wish.create({
      coupleId: couple.id,
      guestName,
      message,
      approved: false // defaults to false for admin review
    });

    return res.status(201).json({
      success: true,
      message: 'Your wish has been submitted for moderation! Thank you.',
      wish
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit wish.', details: err.message });
  }
});

export default router;
