import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../models/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to slugify couple names
const generateSlug = (bride, groom) => {
  const base = `${bride}-${groom}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const randomHex = Math.random().toString(36).substring(2, 6);
  return `${base}-${randomHex}`;
};

// Apply auth and role check to all superadmin routes
router.use(authenticate, requireRole(['superadmin']));

// GET /api/superadmin/dashboard - Live counts
router.get('/dashboard', async (req, res) => {
  try {
    const totalCouples = await db.Couple.count();
    const totalEvents = await db.Event.count();
    const totalGuests = await db.Guest.count();
    const totalPhotos = await db.Photo.count();
    const totalWishes = await db.Wish.count();

    // 1 photo = ~1.5 MB in storage
    const storageUsedMB = (totalPhotos * 1.5).toFixed(1);

    return res.json({
      counts: {
        couples: totalCouples,
        events: totalEvents,
        guests: totalGuests,
        wishes: totalWishes,
        photos: totalPhotos,
        storageUsedMB,
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch dashboard metrics.', details: err.message });
  }
});

// GET /api/superadmin/couples - Get list of couples (paginated)
router.get('/couples', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await db.Couple.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['passwordHash'] }
    });

    return res.json({
      couples: rows,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch couples.', details: err.message });
  }
});

// GET /api/superadmin/couples/:coupleId - View couple detail (support mode)
router.get('/couples/:coupleId', async (req, res) => {
  try {
    const couple = await db.Couple.findByPk(req.params.coupleId, {
      include: [
        { model: db.Event },
        { model: db.Guest },
        { model: db.Wish },
        { model: db.Photo }
      ]
    });

    if (!couple) {
      return res.status(404).json({ error: 'Couple not found.' });
    }

    return res.json(couple);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch couple details.', details: err.message });
  }
});

// POST /api/superadmin/couples - Create Bride & Groom account
router.post('/couples', async (req, res) => {
  const { 
    brideName, 
    groomName, 
    mobile, 
    weddingDate, 
    commonPassword,
    brideMobile,
    brideUsername,
    bridePassword,
    groomMobile,
    groomUsername,
    groomPassword
  } = req.body;

  if (!brideName || !groomName || !mobile || !brideMobile || !groomMobile || !brideUsername || !groomUsername) {
    return res.status(400).json({ error: 'All names, mobile numbers, and usernames are required.' });
  }

  try {
    // Check if common username, bride username, or groom username already exists
    const existing = await db.Couple.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { mobile },
          { brideUsername },
          { groomUsername }
        ]
      }
    });
    if (existing) {
      return res.status(400).json({ error: 'A couple account, bride, or groom account with these usernames/mobile numbers already exists.' });
    }

    const cleanCommonPassword = commonPassword || `${mobile}@Common`;
    const cleanBridePassword = bridePassword || `${brideMobile}@${brideName.replace(/\s+/g, '')}`;
    const cleanGroomPassword = groomPassword || `${groomMobile}@${groomName.replace(/\s+/g, '')}`;

    // Hash passwords
    const passwordHash = await bcrypt.hash(cleanCommonPassword, 10);
    const bridePasswordHash = await bcrypt.hash(cleanBridePassword, 10);
    const groomPasswordHash = await bcrypt.hash(cleanGroomPassword, 10);
    const slug = generateSlug(brideName, groomName);

    const newCouple = await db.Couple.create({
      brideName,
      groomName,
      mobile,
      passwordHash,
      brideMobile,
      brideUsername,
      bridePasswordHash,
      groomMobile,
      groomUsername,
      groomPasswordHash,
      slug,
      weddingDate: weddingDate || null,
      mustResetPassword: false,
      hostGroupAName: req.body.hostGroupAName || 'Bride Family',
      hostGroupBName: req.body.hostGroupBName || 'Groom Family'
    });

    // Write to audit log
    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'CREATE_COUPLE',
      targetId: newCouple.id,
      reason: `Created common and separate accounts for ${brideName} & ${groomName}. Slug: ${slug}`
    });

    // Return the couple and the temporary passwords (shown ONCE)
    return res.status(201).json({
      success: true,
      couple: {
        id: newCouple.id,
        brideName: newCouple.brideName,
        groomName: newCouple.groomName,
        mobile: newCouple.mobile,
        slug: newCouple.slug,
        weddingDate: newCouple.weddingDate,
        brideMobile: newCouple.brideMobile,
        brideUsername: newCouple.brideUsername,
        groomMobile: newCouple.groomMobile,
        groomUsername: newCouple.groomUsername,
        hostGroupAName: newCouple.hostGroupAName,
        hostGroupBName: newCouple.hostGroupBName
      },
      tempPassword: cleanCommonPassword,
      bridePassword: cleanBridePassword,
      groomPassword: cleanGroomPassword
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create couple account.', details: err.message });
  }
});

// PUT /api/superadmin/couples/:coupleId - Update Couple details
router.put('/couples/:coupleId', async (req, res) => {
  const { 
    brideName, 
    groomName, 
    mobile, 
    brideMobile,
    brideUsername,
    bridePassword,
    groomMobile,
    groomUsername,
    groomPassword,
    commonPassword,
    weddingDate, 
    permissions,
    hostGroupAName,
    hostGroupBName
  } = req.body;

  try {
    const couple = await db.Couple.findByPk(req.params.coupleId);
    if (!couple) {
      return res.status(404).json({ error: 'Couple not found.' });
    }

    if (brideName) couple.brideName = brideName;
    if (groomName) couple.groomName = groomName;
    if (mobile) couple.mobile = mobile;
    if (brideMobile) couple.brideMobile = brideMobile;
    if (brideUsername) couple.brideUsername = brideUsername;
    if (groomMobile) couple.groomMobile = groomMobile;
    if (groomUsername) couple.groomUsername = groomUsername;
    if (weddingDate) couple.weddingDate = weddingDate;
    if (permissions) couple.permissions = permissions;
    if (hostGroupAName) couple.hostGroupAName = hostGroupAName;
    if (hostGroupBName) couple.hostGroupBName = hostGroupBName;

    if (commonPassword) {
      couple.passwordHash = await bcrypt.hash(commonPassword, 10);
    }
    if (bridePassword) {
      couple.bridePasswordHash = await bcrypt.hash(bridePassword, 10);
    }
    if (groomPassword) {
      couple.groomPasswordHash = await bcrypt.hash(groomPassword, 10);
    }

    await couple.save();

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'UPDATE_COUPLE',
      targetId: couple.id,
      reason: `Updated couple account details for ${couple.brideName} & ${couple.groomName}.`
    });

    return res.json({ success: true, couple });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update couple account.', details: err.message });
  }
});

// DELETE /api/superadmin/couples/:coupleId - Delete Couple account
router.delete('/couples/:coupleId', async (req, res) => {
  try {
    const couple = await db.Couple.findByPk(req.params.coupleId);
    if (!couple) {
      return res.status(404).json({ error: 'Couple not found.' });
    }

    const coupleNames = `${couple.brideName} & ${couple.groomName}`;
    await couple.destroy();

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'DELETE_COUPLE',
      targetId: req.params.coupleId,
      reason: `Deleted account for ${coupleNames}`
    });

    return res.json({ success: true, message: `Successfully deleted account for ${coupleNames}` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete couple account.', details: err.message });
  }
});

// POST /api/superadmin/couples/:coupleId/reset-password - Trigger reset password
router.post('/couples/:coupleId/reset-password', async (req, res) => {
  try {
    const couple = await db.Couple.findByPk(req.params.coupleId);
    if (!couple) {
      return res.status(404).json({ error: 'Couple not found.' });
    }

    // Generate dynamic passwords
    const cleanBrideName = couple.brideName.replace(/\s+/g, '');
    const cleanGroomName = couple.groomName.replace(/\s+/g, '');
    
    const tempPassword = `${couple.mobile}@Common`;
    const bridePassword = `${couple.brideMobile || couple.mobile}@${cleanBrideName}`;
    const groomPassword = `${couple.groomMobile || couple.mobile}@${cleanGroomName}`;

    // Hash passwords
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const bridePasswordHash = await bcrypt.hash(bridePassword, 10);
    const groomPasswordHash = await bcrypt.hash(groomPassword, 10);

    couple.passwordHash = passwordHash;
    couple.bridePasswordHash = bridePasswordHash;
    couple.groomPasswordHash = groomPasswordHash;
    couple.mustResetPassword = false;
    await couple.save();

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'TRIGGER_PASSWORD_RESET',
      targetId: couple.id,
      reason: 'Admin triggered password reset. Regenerated passwords for common, bride, and groom accounts.'
    });

    return res.json({
      success: true,
      message: 'Passwords reset successfully.',
      tempPassword,
      bridePassword,
      groomPassword
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset passwords.', details: err.message });
  }
});

// GET /api/superadmin/logs - Audit logs
router.get('/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await db.AuditLog.findAndCountAll({
      limit,
      offset,
      order: [['timestamp', 'DESC']]
    });

    return res.json({
      logs: rows,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch audit logs.', details: err.message });
  }
});

// GET /api/superadmin/languages - Get all languages
router.get('/languages', async (req, res) => {
  try {
    const languages = await db.Language.findAll({ order: [['code', 'ASC']] });
    return res.json(languages);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch languages.', details: err.message });
  }
});

// POST /api/superadmin/languages - Add new language
router.post('/languages', async (req, res) => {
  const { code, label, strings } = req.body;

  if (!code || !label || !strings) {
    return res.status(400).json({ error: 'Code, label, and translation strings (JSON) are required.' });
  }

  try {
    const existing = await db.Language.findByPk(code);
    if (existing) {
      return res.status(400).json({ error: 'Language with this code already exists.' });
    }

    const language = await db.Language.create({ code, label, strings });

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'ADD_LANGUAGE',
      targetId: code,
      reason: `Added language: ${label} (${code})`
    });

    return res.status(201).json(language);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add language.', details: err.message });
  }
});

// PUT /api/superadmin/languages/:code - Edit translation strings
router.put('/languages/:code', async (req, res) => {
  const { label, strings } = req.body;

  try {
    const language = await db.Language.findByPk(req.params.code);
    if (!language) {
      return res.status(404).json({ error: 'Language not found.' });
    }

    if (label) language.label = label;
    if (strings) language.strings = strings;

    await language.save();

    await db.AuditLog.create({
      actorId: req.user.id,
      action: 'UPDATE_LANGUAGE',
      targetId: language.code,
      reason: `Updated translation strings for ${language.label}`
    });

    return res.json(language);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update language.', details: err.message });
  }
});

export default router;
