import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import { activeSessions, authenticate } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_wedding_jwt_key_12345';

// Mock OTP storage for guest logins
// Structure: { mobile: { otp, expiresAt } }
const mockOtps = new Map();

// Helper to generate JWT token and track it
const generateToken = (payload, expires = '24h') => {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: expires });
  // Store in activeSessions to enforce single active session rule
  activeSessions.set(payload.id, token);
  return token;
};

// POST /api/auth/admin/login - Super Admin login (isolated route)
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const admin = await db.SuperAdmin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken({ id: admin.id, email: admin.email, role: 'superadmin' });

    await db.AuditLog.create({
      actorId: admin.id,
      action: 'ADMIN_LOGIN',
      targetId: admin.id,
      reason: 'Super Admin logged in.'
    });

    return res.json({ token, role: 'superadmin', user: { email: admin.email } });
  } catch (err) {
    return res.status(500).json({ error: 'Admin login failed.', details: err.message });
  }
});

// POST /api/auth/login - Couple login only
router.post('/login', async (req, res) => {
  const { username, password, subRole: requestedSubRole } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    // Find couple matching either the common username (mobile), bride username, or groom username
    const couple = await db.Couple.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { mobile: username },
          { brideUsername: username },
          { groomUsername: username }
        ]
      }
    });
    if (!couple) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    let subRole = requestedSubRole || 'bride';
    let passwordHashToCheck = couple.passwordHash;

    if (username === couple.mobile) {
      passwordHashToCheck = couple.passwordHash;
      subRole = requestedSubRole || 'bride';
    } else if (username === couple.brideUsername) {
      passwordHashToCheck = couple.bridePasswordHash;
      subRole = 'bride';
    } else if (username === couple.groomUsername) {
      passwordHashToCheck = couple.groomPasswordHash;
      subRole = 'groom';
    }

    const hostGroup = subRole === 'groom' ? 'HOST_B' : 'HOST_A';

    const isMatch = await bcrypt.compare(password, passwordHashToCheck);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Check if password reset is forced (mustResetPassword flag) - only for common login
    if (couple.mustResetPassword && username === couple.mobile) {
      const token = jwt.sign(
        { id: couple.id, mobile: couple.mobile, role: 'couple', subRole: 'bride', hostGroup: 'HOST_A', mustReset: true },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      return res.status(200).json({ 
        mustReset: true, 
        token, 
        message: 'First time login. Password reset required.' 
      });
    }

    const token = generateToken({ id: couple.id, mobile: couple.mobile, role: 'couple', subRole, hostGroup });
    return res.json({ 
      token, 
      role: 'couple', 
      subRole,
      hostGroup,
      user: { 
        id: couple.id, 
        brideName: couple.brideName, 
        groomName: couple.groomName,
        slug: couple.slug,
        permissions: couple.permissions,
        hostGroup,
        hostGroupAName: couple.hostGroupAName || 'Bride Family',
        hostGroupBName: couple.hostGroupBName || 'Groom Family'
      } 
    });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed.', details: err.message });
  }
});

// POST /api/auth/otp/request - Send Guest OTP (mocked)
router.post('/otp/request', async (req, res) => {
  const { mobile, coupleSlug } = req.body;

  if (!mobile || !coupleSlug) {
    return res.status(400).json({ error: 'Mobile number and couple slug are required.' });
  }

  try {
    const couple = await db.Couple.findOne({ where: { slug: coupleSlug } });
    if (!couple) {
      return res.status(404).json({ error: 'Wedding page not found.' });
    }

    // Find if guest exists under this couple
    let guest = await db.Guest.findOne({ where: { coupleId: couple.id, mobile } });

    // If guest doesn't exist, we will create one during OTP verification if they supply a name
    // Generate a 6-digit OTP code (mock)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    mockOtps.set(mobile, { otp, expiresAt, coupleId: couple.id, guestExists: !!guest });

    console.log(`[MOCK OTP] Send SMS to ${mobile}: Your OTP code is ${otp}`);

    return res.json({ 
      success: true, 
      message: 'OTP sent to your registered mobile number.', 
      otp, // Sending back OTP for convenience during local mock tests
      guestExists: !!guest 
    });
  } catch (err) {
    return res.status(500).json({ error: 'OTP request failed.', details: err.message });
  }
});

// POST /api/auth/otp/verify - Verify Guest OTP and issue JWT
router.post('/otp/verify', async (req, res) => {
  const { mobile, otp, name } = req.body;

  if (!mobile || !otp) {
    return res.status(400).json({ error: 'Mobile number and OTP are required.' });
  }

  const storedOtp = mockOtps.get(mobile);
  if (!storedOtp) {
    return res.status(400).json({ error: 'OTP request not found. Request a new OTP.' });
  }

  if (new Date() > storedOtp.expiresAt) {
    mockOtps.delete(mobile);
    return res.status(400).json({ error: 'OTP has expired. Request a new OTP.' });
  }

  if (storedOtp.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP code.' });
  }

  try {
    let guest = await db.Guest.findOne({ where: { coupleId: storedOtp.coupleId, mobile } });

    if (!guest) {
      if (!name) {
        return res.status(400).json({ error: 'Guest does not exist. Name required to register.' });
      }
      guest = await db.Guest.create({
        coupleId: storedOtp.coupleId,
        name,
        mobile,
        hostGroup: 'HOST_A', // default
        group: 'Other',
        inviteEvents: [],
        rsvpStatus: {}
      });
      console.log(`[AUTH] Auto-registered guest: ${name} (${mobile})`);
    }

    mockOtps.delete(mobile);

    // Issue JWT token
    const token = generateToken({ 
      id: guest.id, 
      name: guest.name, 
      mobile: guest.mobile, 
      role: 'guest',
      coupleId: guest.coupleId
    });

    return res.json({
      token,
      role: 'guest',
      user: {
        id: guest.id,
        name: guest.name,
        mobile: guest.mobile,
        coupleId: guest.coupleId
      }
    });

  } catch (err) {
    return res.status(500).json({ error: 'OTP verification failed.', details: err.message });
  }
});

// POST /api/auth/reset-password - Force Reset Password (or standard reset)
router.post('/reset-password', async (req, res) => {
  const { newPassword } = req.body;
  const authHeader = req.headers.authorization;

  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required.' });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role === 'couple') {
      const couple = await db.Couple.findByPk(decoded.id);
      if (!couple) {
        return res.status(404).json({ error: 'Couple account not found.' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      couple.passwordHash = passwordHash;
      couple.mustResetPassword = false;
      await couple.save();

      // Clear the temporary reset token from active sessions, force standard login
      activeSessions.delete(couple.id);

      await db.AuditLog.create({
        actorId: couple.id,
        action: 'RESET_PASSWORD',
        targetId: couple.id,
        reason: 'Forced first-login password reset completed.'
      });

      return res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
    }

    return res.status(400).json({ error: 'Password reset not allowed for this account type.' });

  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired reset token.', details: err.message });
  }
});

// GET /api/auth/me - Validate token and return current session
router.get('/me', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'superadmin') {
      const admin = await db.SuperAdmin.findByPk(req.user.id);
      if (!admin) return res.status(404).json({ error: 'Admin not found.' });
      return res.json({ role: 'superadmin', user: { email: admin.email } });
    }

    if (req.user.role === 'couple') {
      const couple = await db.Couple.findByPk(req.user.id);
      if (!couple) return res.status(404).json({ error: 'Couple not found.' });
      const resolvedHostGroup = req.user.hostGroup || (req.user.subRole === 'groom' ? 'HOST_B' : 'HOST_A');
      return res.json({ 
        role: 'couple', 
        subRole: req.user.subRole,
        hostGroup: resolvedHostGroup,
        user: { 
          id: couple.id, 
          brideName: couple.brideName, 
          groomName: couple.groomName,
          slug: couple.slug,
          permissions: couple.permissions,
          hostGroup: resolvedHostGroup,
          hostGroupAName: couple.hostGroupAName || 'Bride Family',
          hostGroupBName: couple.hostGroupBName || 'Groom Family'
        } 
      });
    }

    if (req.user.role === 'guest') {
      const guest = await db.Guest.findByPk(req.user.id);
      if (!guest) return res.status(404).json({ error: 'Guest not found.' });
      return res.json({
        role: 'guest',
        user: {
          id: guest.id,
          name: guest.name,
          mobile: guest.mobile,
          coupleId: guest.coupleId
        }
      });
    }

    return res.status(400).json({ error: 'Unknown role.' });
  } catch (err) {
    return res.status(500).json({ error: 'Fetch session failed.', details: err.message });
  }
});

// POST /api/auth/logout - Clear active session
router.post('/logout', authenticate, (req, res) => {
  if (req.user) {
    activeSessions.delete(req.user.id);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
