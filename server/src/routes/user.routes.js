/**
 * User Routes
 * User profile management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const router = express.Router();
const db = require('../config/database');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { logger } = require('../utils/logger');

// ===== Validation Rules =====
const updateProfileValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('URL d\'avatar invalide')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre')
];

// ===== GET USER PROFILE =====
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const user = await db.queryOne(
    `SELECT uuid, email, full_name, avatar_url, role, is_verified, created_at, last_login
     FROM users WHERE id = ?`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: {
      user: {
        id: user.uuid,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        role: user.role,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    }
  });
}));

// ===== UPDATE USER PROFILE =====
router.put('/profile', authenticate, updateProfileValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { fullName, avatarUrl } = req.body;
  const updates = [];
  const params = [];

  if (fullName) {
    updates.push('full_name = ?');
    params.push(fullName);
  }

  if (avatarUrl !== undefined) {
    updates.push('avatar_url = ?');
    params.push(avatarUrl || null);
  }

  if (updates.length === 0) {
    throw new ApiError(400, 'Aucune donnée à mettre à jour');
  }

  params.push(req.user.id);

  await db.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  logger.info('User profile updated:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Profil mis à jour avec succès'
  });
}));

// ===== CHANGE PASSWORD =====
router.put('/change-password', authenticate, changePasswordValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { currentPassword, newPassword } = req.body;

  // Get current password hash
  const user = await db.queryOne(
    'SELECT password FROM users WHERE id = ?',
    [req.user.id]
  );

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    throw new ApiError(400, 'Mot de passe actuel incorrect');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await db.query(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedPassword, req.user.id]
  );

  // Invalidate all sessions except current
  await db.query(
    'UPDATE sessions SET is_valid = FALSE WHERE user_id = ? AND token != ?',
    [req.user.id, req.token]
  );

  logger.info('User password changed:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Mot de passe modifié avec succès'
  });
}));

// ===== GET LOGIN HISTORY =====
router.get('/login-history', authenticate, asyncHandler(async (req, res) => {
  const history = await db.query(
    `SELECT ip_address, user_agent, location, status, failure_reason, created_at
     FROM login_history
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 20`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: { history }
  });
}));

// ===== GET ACTIVE SESSIONS =====
router.get('/sessions', authenticate, asyncHandler(async (req, res) => {
  const sessions = await db.query(
    `SELECT id, ip_address, user_agent, created_at,
            (token = ?) as is_current
     FROM sessions
     WHERE user_id = ? AND is_valid = TRUE AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [req.token, req.user.id]
  );

  res.json({
    success: true,
    data: { sessions }
  });
}));

// ===== REVOKE SESSION =====
router.delete('/sessions/:sessionId', authenticate, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await db.queryOne(
    'SELECT id FROM sessions WHERE id = ? AND user_id = ?',
    [sessionId, req.user.id]
  );

  if (!session) {
    throw new ApiError(404, 'Session non trouvée');
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
router.delete('/sessions', authenticate, asyncHandler(async (req, res) => {
  await db.query(
    'UPDATE sessions SET is_valid = FALSE WHERE user_id = ? AND token != ?',
    [req.user.id, req.token]
  );

  logger.info('All other sessions revoked:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Toutes les autres sessions ont été révoquées'
  });
}));

// ===== ADMIN: GET ALL USERS =====
router.get('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (email LIKE ? OR full_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const users = await db.query(
    `SELECT uuid, email, full_name, role, is_active, is_verified, created_at, last_login
     FROM users
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  const [{ total }] = await db.query(
    `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
    params
  );

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}));

// ===== ADMIN: UPDATE USER =====
router.put('/:userId', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role, isActive } = req.body;

  const user = await db.queryOne(
    'SELECT id FROM users WHERE uuid = ?',
    [userId]
  );

  if (!user) {
    throw new ApiError(404, 'Utilisateur non trouvé');
  }

  const updates = [];
  const params = [];

  if (role && ['admin', 'user', 'moderator'].includes(role)) {
    updates.push('role = ?');
    params.push(role);
  }

  if (typeof isActive === 'boolean') {
    updates.push('is_active = ?');
    params.push(isActive);
  }

  if (updates.length === 0) {
    throw new ApiError(400, 'Aucune donnée à mettre à jour');
  }

  params.push(user.id);

  await db.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  logger.info('Admin updated user:', { adminId: req.user.id, targetUserId: userId, updates: { role, isActive } });

  res.json({
    success: true,
    message: 'Utilisateur mis à jour'
  });
}));

module.exports = router;
