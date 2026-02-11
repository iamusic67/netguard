/**
 * Session Routes
 * Handles session management (view, revoke)
 */

const express = require('express');
const router = express.Router();

const db = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');
const { logger } = require('../utils/logger');

/**
 * Parse user agent to get device info
 */
const parseUserAgent = (ua) => {
  if (!ua) return { browser: 'Inconnu', os: 'Inconnu', device: 'Inconnu' };

  let browser = 'Autre';
  let os = 'Autre';
  let device = 'Desktop';

  // Browser detection
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera')) browser = 'Opera';

  // OS detection
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) { os = 'Android'; device = 'Mobile'; }
  else if (ua.includes('iPhone')) { os = 'iOS'; device = 'Mobile'; }
  else if (ua.includes('iPad')) { os = 'iPadOS'; device = 'Tablet'; }

  return { browser, os, device };
};

// ===== GET ALL SESSIONS =====
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const sessions = await db.query(
    `SELECT id, ip_address, user_agent, created_at, expires_at, token
     FROM sessions 
     WHERE user_id = ? AND is_valid = TRUE AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [req.user.id]
  );

  const formattedSessions = sessions.map(session => {
    const { browser, os, device } = parseUserAgent(session.user_agent);
    return {
      id: session.id,
      ipAddress: session.ip_address,
      browser,
      os,
      device,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
      isCurrent: session.token === req.token
    };
  });

  res.json({
    success: true,
    data: {
      sessions: formattedSessions,
      count: formattedSessions.length
    }
  });
}));

// ===== GET LOGIN HISTORY =====
router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  const history = await db.query(
    `SELECT ip_address, user_agent, status, failure_reason, created_at, location
     FROM login_history 
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user.id, parseInt(limit), parseInt(offset)]
  );

  const total = await db.queryOne(
    'SELECT COUNT(*) as count FROM login_history WHERE user_id = ?',
    [req.user.id]
  );

  const formattedHistory = history.map(entry => {
    const { browser, os, device } = parseUserAgent(entry.user_agent);
    return {
      ipAddress: entry.ip_address,
      browser,
      os,
      device,
      status: entry.status,
      failureReason: entry.failure_reason,
      location: entry.location,
      createdAt: entry.created_at
    };
  });

  res.json({
    success: true,
    data: {
      history: formattedHistory,
      total: total.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

// ===== REVOKE A SESSION =====
router.delete('/:sessionId', authenticate, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  // Check if session belongs to user
  const session = await db.queryOne(
    'SELECT id, token FROM sessions WHERE id = ? AND user_id = ?',
    [sessionId, req.user.id]
  );

  if (!session) {
    throw new ApiError(404, 'Session non trouvée');
  }

  // Prevent revoking current session via this endpoint
  if (session.token === req.token) {
    throw new ApiError(400, 'Utilisez la déconnexion pour terminer votre session actuelle');
  }

  await db.query(
    'UPDATE sessions SET is_valid = FALSE WHERE id = ?',
    [sessionId]
  );

  logger.info('Session revoked:', { userId: req.user.id, sessionId });

  res.json({
    success: true,
    message: 'Session révoquée'
  });
}));

// ===== REVOKE ALL OTHER SESSIONS =====
router.delete('/', authenticate, asyncHandler(async (req, res) => {
  const result = await db.query(
    'UPDATE sessions SET is_valid = FALSE WHERE user_id = ? AND token != ?',
    [req.user.id, req.token]
  );

  logger.info('All other sessions revoked:', { 
    userId: req.user.id, 
    count: result.affectedRows 
  });

  res.json({
    success: true,
    message: `${result.affectedRows} session(s) révoquée(s)`
  });
}));

module.exports = router;
