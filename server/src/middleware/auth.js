import jwt from 'jsonwebtoken';
import db from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_wedding_jwt_key_12345';

// In-memory registry to enforce single active session per user ID
// Structure: { userId: activeJwtToken }
export const activeSessions = new Map();

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Enforce single active session
    const currentActiveToken = activeSessions.get(decoded.id);
    if (currentActiveToken && currentActiveToken !== token) {
      return res.status(401).json({ 
        error: 'Session superseded', 
        code: 'SESSION_SUPERSEDED',
        message: 'New login detected on another device. You have been logged out.' 
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token.', code: 'INVALID_TOKEN' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

export const verifyCouplePermission = (action) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'superadmin') {
        return next(); // SuperAdmin can do anything (support mode)
      }

      if (req.user.role !== 'couple') {
        return res.status(403).json({ error: 'Access denied. Couple role required.' });
      }

      // If couple is logged in, check role-based permissions matrix
      // JWT token payload includes: { id: coupleId, role: 'couple', subRole: 'bride' | 'groom' }
      const couple = await db.Couple.findByPk(req.user.id);
      if (!couple) {
        return res.status(404).json({ error: 'Couple account not found.' });
      }

      const subRole = req.user.subRole || 'bride'; // default to bride if not specified
      const rolePermissions = couple.permissions[subRole];

      if (!rolePermissions || !rolePermissions[action]) {
        return res.status(403).json({ 
          error: `Access denied. ${subRole.toUpperCase()} does not have permission to perform: ${action}` 
        });
      }

      req.couple = couple;
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Permission check failed.', details: err.message });
    }
  };
};
