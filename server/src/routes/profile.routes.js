/**
 * Profile Routes
 * Handles user profile management (update, avatar, password)
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const router = express.Router();

const db = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');
const { logger } = require('../utils/logger');

// ===== GET PROFILE =====
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const user = await db.queryOne(
    `SELECT uuid, email, full_name, avatar_url, role, is_verified, created_at, last_login
     FROM users WHERE id = ?`,
    [req.user.id]
  );

  // Get OAuth connections
  const oauthConnections = await db.query(
    'SELECT provider, created_at FROM user_oauth WHERE user_id = ?',
    [req.user.id]
  );

  // Get 2FA status
  const twoFactor = await db.queryOne(
    'SELECT is_enabled FROM user_2fa WHERE user_id = ?',
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
      },
      security: {
        twoFactorEnabled: twoFactor?.is_enabled || false,
        oauthConnections: oauthConnections.map(o => o.provider)
      }
    }
  });
}));

// ===== UPDATE PROFILE =====
router.patch('/', [
  authenticate,
  body('fullName').optional().trim().isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { fullName } = req.body;
  const updates = [];
  const values = [];

  if (fullName) {
    updates.push('full_name = ?');
    values.push(fullName);
  }

  if (updates.length === 0) {
    throw new ApiError(400, 'Aucune donnée à mettre à jour');
  }

  values.push(req.user.id);

  await db.query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values
  );

  logger.info('Profile updated:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Profil mis à jour'
  });
}));

// ===== UPDATE AVATAR =====
router.patch('/avatar', [
  authenticate,
  body('avatarUrl').isURL().withMessage('URL d\'avatar invalide')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { avatarUrl } = req.body;

  await db.query(
    'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
    [avatarUrl, req.user.id]
  );

  logger.info('Avatar updated:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Avatar mis à jour',
    data: { avatarUrl }
  });
}));

// ===== DELETE AVATAR =====
router.delete('/avatar', authenticate, asyncHandler(async (req, res) => {
  await db.query(
    'UPDATE users SET avatar_url = NULL, updated_at = NOW() WHERE id = ?',
    [req.user.id]
  );

  res.json({
    success: true,
    message: 'Avatar supprimé'
  });
}));

// ===== CHANGE PASSWORD =====
router.post('/change-password', [
  authenticate,
  body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { currentPassword, newPassword } = req.body;

  // Get current password
  const user = await db.queryOne(
    'SELECT password FROM users WHERE id = ?',
    [req.user.id]
  );

  // Check if user has password (OAuth users might not)
  if (!user.password) {
    throw new ApiError(400, 'Vous devez d\'abord définir un mot de passe');
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    throw new ApiError(401, 'Mot de passe actuel incorrect');
  }

  // Check new password is different
  const isSame = await bcrypt.compare(newPassword, user.password);
  if (isSame) {
    throw new ApiError(400, 'Le nouveau mot de passe doit être différent de l\'ancien');
  }

  // Hash and save new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await db.query(
    'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
    [hashedPassword, req.user.id]
  );

  // Invalidate all other sessions for security
  await db.query(
    'UPDATE sessions SET is_valid = FALSE WHERE user_id = ? AND token != ?',
    [req.user.id, req.token]
  );

  logger.info('Password changed:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Mot de passe modifié. Les autres sessions ont été déconnectées.'
  });
}));

// ===== SET PASSWORD (for OAuth users) =====
router.post('/set-password', [
  authenticate,
  body('password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { password } = req.body;

  // Check if user already has password
  const user = await db.queryOne(
    'SELECT password FROM users WHERE id = ?',
    [req.user.id]
  );

  if (user.password) {
    throw new ApiError(400, 'Vous avez déjà un mot de passe. Utilisez "Changer mot de passe".');
  }

  // Hash and save password
  const hashedPassword = await bcrypt.hash(password, 12);
  await db.query(
    'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
    [hashedPassword, req.user.id]
  );

  logger.info('Password set for OAuth user:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Mot de passe défini avec succès'
  });
}));

// ===== CHANGE EMAIL =====
router.post('/change-email', [
  authenticate,
  body('newEmail').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { newEmail, password } = req.body;

  // Verify password
  const user = await db.queryOne(
    'SELECT password, email FROM users WHERE id = ?',
    [req.user.id]
  );

  if (user.email === newEmail) {
    throw new ApiError(400, 'C\'est déjà votre adresse email');
  }

  if (user.password) {
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new ApiError(401, 'Mot de passe incorrect');
    }
  }

  // Check if email is already used
  const existingUser = await db.queryOne(
    'SELECT id FROM users WHERE email = ? AND id != ?',
    [newEmail, req.user.id]
  );

  if (existingUser) {
    throw new ApiError(409, 'Cette adresse email est déjà utilisée');
  }

  // Update email and mark as unverified
  await db.query(
    'UPDATE users SET email = ?, is_verified = FALSE, updated_at = NOW() WHERE id = ?',
    [newEmail, req.user.id]
  );

  // TODO: Send verification email to new address

  logger.info('Email changed:', { userId: req.user.id, oldEmail: user.email, newEmail });

  res.json({
    success: true,
    message: 'Email modifié. Veuillez vérifier votre nouvelle adresse.'
  });
}));

// ===== DELETE ACCOUNT =====
router.delete('/', [
  authenticate,
  body('password').notEmpty().withMessage('Mot de passe requis'),
  body('confirmation').equals('DELETE').withMessage('Confirmation requise')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { password } = req.body;

  // Verify password
  const user = await db.queryOne(
    'SELECT password FROM users WHERE id = ?',
    [req.user.id]
  );

  if (user.password) {
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new ApiError(401, 'Mot de passe incorrect');
    }
  }

  // Soft delete - mark as inactive
  await db.query(
    'UPDATE users SET is_active = FALSE, email = CONCAT(email, "_deleted_", ?), updated_at = NOW() WHERE id = ?',
    [Date.now(), req.user.id]
  );

  // Invalidate all sessions
  await db.query(
    'UPDATE sessions SET is_valid = FALSE WHERE user_id = ?',
    [req.user.id]
  );

  logger.info('Account deleted:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Compte supprimé'
  });
}));

module.exports = router;
