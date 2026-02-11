/**
 * Authentication Middleware
 * JWT Token Verification
 */

const jwt = require('jsonwebtoken');
const { ApiError, asyncHandler } = require('./error.middleware');
const db = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Verify JWT Token
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Accès non autorisé. Token manquant.');
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if session is valid
    const session = await db.queryOne(
      'SELECT * FROM sessions WHERE token = ? AND is_valid = TRUE AND expires_at > NOW()',
      [token]
    );

    if (!session) {
      throw new ApiError(401, 'Session invalide ou expirée.');
    }

    // Get user
    const user = await db.queryOne(
      'SELECT id, uuid, email, full_name, role, is_active, is_verified FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      throw new ApiError(401, 'Utilisateur non trouvé.');
    }

    if (!user.is_active) {
      throw new ApiError(403, 'Compte désactivé. Contactez l\'administrateur.');
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Token invalide.');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expiré. Veuillez vous reconnecter.');
    }
    throw error;
  }
});

/**
 * Check if user has required role
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Accès non autorisé.');
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt:', {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path
      });
      throw new ApiError(403, 'Vous n\'avez pas les permissions nécessaires.');
    }

    next();
  };
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await db.queryOne(
      'SELECT id, uuid, email, full_name, role FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (user) {
      req.user = user;
      req.token = token;
    }
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
  }

  next();
});

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Accès non autorisé.'
    });
  }

  if (req.user.role !== 'admin') {
    logger.warn('Admin access denied:', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path
    });
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs.'
    });
  }

  next();
};

module.exports = {
  authenticate,
  authenticateToken: authenticate, // Alias
  authorize,
  optionalAuth,
  requireAdmin
};
