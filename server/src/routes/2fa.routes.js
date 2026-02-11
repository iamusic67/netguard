/**
 * 2FA Routes
 * Handles two-factor authentication setup and verification
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const db = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');
const { logger } = require('../utils/logger');
const {
  generateSecret,
  verifyTOTP,
  generateQRCodeURL,
  generateBackupCodes,
  hashBackupCode
} = require('../services/totp.service');

// ===== GET 2FA STATUS =====
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const twoFactor = await db.queryOne(
    'SELECT is_enabled, created_at FROM user_2fa WHERE user_id = ?',
    [req.user.id]
  );

  res.json({
    success: true,
    data: {
      enabled: twoFactor?.is_enabled || false,
      setupAt: twoFactor?.created_at || null
    }
  });
}));

// ===== SETUP 2FA (Step 1: Generate secret) =====
router.post('/setup', authenticate, asyncHandler(async (req, res) => {
  // Check if already enabled
  const existing = await db.queryOne(
    'SELECT is_enabled FROM user_2fa WHERE user_id = ? AND is_enabled = TRUE',
    [req.user.id]
  );

  if (existing) {
    throw new ApiError(400, 'L\'authentification à deux facteurs est déjà activée');
  }

  // Generate new secret
  const secret = generateSecret();
  const qrCodeUrl = generateQRCodeURL(secret, req.user.email);

  // Store pending setup (not yet verified)
  await db.query(
    `INSERT INTO user_2fa (user_id, secret, is_enabled, created_at)
     VALUES (?, ?, FALSE, NOW())
     ON DUPLICATE KEY UPDATE secret = ?, is_enabled = FALSE, updated_at = NOW()`,
    [req.user.id, secret, secret]
  );

  logger.info('2FA setup initiated:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Scannez le QR code avec votre application d\'authentification',
    data: {
      secret,
      qrCodeUrl,
      // For manual entry
      manualEntry: {
        account: req.user.email,
        key: secret,
        type: 'TOTP',
        digits: 6,
        period: 30
      }
    }
  });
}));

// ===== VERIFY 2FA SETUP (Step 2: Confirm setup) =====
router.post('/verify-setup', [
  authenticate,
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Code invalide')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Code invalide', errors.array());
  }

  const { code } = req.body;

  // Get pending setup
  const twoFactor = await db.queryOne(
    'SELECT secret FROM user_2fa WHERE user_id = ? AND is_enabled = FALSE',
    [req.user.id]
  );

  if (!twoFactor) {
    throw new ApiError(400, 'Aucune configuration 2FA en attente. Recommencez le processus.');
  }

  // Verify code
  const isValid = verifyTOTP(code, twoFactor.secret);

  if (!isValid) {
    throw new ApiError(400, 'Code invalide. Veuillez réessayer.');
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes(10);
  const hashedCodes = backupCodes.map(code => hashBackupCode(code));

  // Enable 2FA
  await db.query(
    'UPDATE user_2fa SET is_enabled = TRUE, updated_at = NOW() WHERE user_id = ?',
    [req.user.id]
  );

  // Store backup codes
  await db.query('DELETE FROM user_2fa_backup_codes WHERE user_id = ?', [req.user.id]);
  
  for (const hashedCode of hashedCodes) {
    await db.query(
      'INSERT INTO user_2fa_backup_codes (user_id, code_hash, used) VALUES (?, ?, FALSE)',
      [req.user.id, hashedCode]
    );
  }

  logger.info('2FA enabled:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Authentification à deux facteurs activée avec succès !',
    data: {
      backupCodes,
      warning: 'Sauvegardez ces codes de récupération dans un endroit sûr. Ils ne seront plus affichés.'
    }
  });
}));

// ===== VERIFY 2FA CODE (During login) =====
router.post('/verify', [
  body('userId').notEmpty().withMessage('ID utilisateur requis'),
  body('code').isLength({ min: 6, max: 8 }).withMessage('Code invalide'),
  body('tempToken').notEmpty().withMessage('Token temporaire requis')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { userId, code, tempToken } = req.body;

  // Verify temp token
  const jwt = require('jsonwebtoken');
  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (decoded.type !== '2fa_pending' || decoded.userId !== userId) {
      throw new Error('Invalid temp token');
    }
  } catch {
    throw new ApiError(401, 'Session expirée. Veuillez vous reconnecter.');
  }

  // Get 2FA settings
  const twoFactor = await db.queryOne(
    'SELECT secret FROM user_2fa WHERE user_id = ? AND is_enabled = TRUE',
    [decoded.dbUserId]
  );

  if (!twoFactor) {
    throw new ApiError(400, '2FA non configurée');
  }

  // Try TOTP code first
  let isValid = verifyTOTP(code, twoFactor.secret);

  // If not valid, try backup code
  if (!isValid && code.includes('-')) {
    const hashedCode = hashBackupCode(code);
    const backupCode = await db.queryOne(
      'SELECT id FROM user_2fa_backup_codes WHERE user_id = ? AND code_hash = ? AND used = FALSE',
      [decoded.dbUserId, hashedCode]
    );

    if (backupCode) {
      await db.query(
        'UPDATE user_2fa_backup_codes SET used = TRUE, used_at = NOW() WHERE id = ?',
        [backupCode.id]
      );
      isValid = true;
      logger.warn('Backup code used:', { userId: decoded.dbUserId });
    }
  }

  if (!isValid) {
    throw new ApiError(401, 'Code invalide');
  }

  // Get user and generate final token
  const user = await db.queryOne(
    'SELECT * FROM users WHERE id = ?',
    [decoded.dbUserId]
  );

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: decoded.remember ? '30d' : '7d' }
  );

  // Create session
  const expiresAt = decoded.remember ? 'DATE_ADD(NOW(), INTERVAL 30 DAY)' : 'DATE_ADD(NOW(), INTERVAL 7 DAY)';
  await db.query(
    `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ${expiresAt})`,
    [user.id, token, decoded.ip, decoded.userAgent]
  );

  // Log login
  await db.query(
    `INSERT INTO login_history (user_id, ip_address, user_agent, status)
     VALUES (?, ?, ?, 'success')`,
    [user.id, decoded.ip, decoded.userAgent]
  );

  logger.info('2FA verified, user logged in:', { userId: user.id });

  res.json({
    success: true,
    message: 'Connexion réussie !',
    data: {
      user: {
        id: user.uuid,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isVerified: user.is_verified,
        avatarUrl: user.avatar_url
      },
      token
    }
  });
}));

// ===== DISABLE 2FA =====
router.post('/disable', [
  authenticate,
  body('password').notEmpty().withMessage('Mot de passe requis'),
  body('code').isLength({ min: 6 }).withMessage('Code 2FA requis')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { password, code } = req.body;

  // Verify password
  const bcrypt = require('bcryptjs');
  const user = await db.queryOne('SELECT password FROM users WHERE id = ?', [req.user.id]);
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Mot de passe incorrect');
  }

  // Verify 2FA code
  const twoFactor = await db.queryOne(
    'SELECT secret FROM user_2fa WHERE user_id = ? AND is_enabled = TRUE',
    [req.user.id]
  );

  if (!twoFactor || !verifyTOTP(code, twoFactor.secret)) {
    throw new ApiError(401, 'Code 2FA invalide');
  }

  // Disable 2FA
  await db.query('DELETE FROM user_2fa WHERE user_id = ?', [req.user.id]);
  await db.query('DELETE FROM user_2fa_backup_codes WHERE user_id = ?', [req.user.id]);

  logger.info('2FA disabled:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Authentification à deux facteurs désactivée'
  });
}));

// ===== REGENERATE BACKUP CODES =====
router.post('/backup-codes/regenerate', [
  authenticate,
  body('code').isLength({ min: 6 }).withMessage('Code 2FA requis')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { code } = req.body;

  // Verify 2FA code
  const twoFactor = await db.queryOne(
    'SELECT secret FROM user_2fa WHERE user_id = ? AND is_enabled = TRUE',
    [req.user.id]
  );

  if (!twoFactor || !verifyTOTP(code, twoFactor.secret)) {
    throw new ApiError(401, 'Code 2FA invalide');
  }

  // Generate new backup codes
  const backupCodes = generateBackupCodes(10);
  const hashedCodes = backupCodes.map(c => hashBackupCode(c));

  // Replace old codes
  await db.query('DELETE FROM user_2fa_backup_codes WHERE user_id = ?', [req.user.id]);
  
  for (const hashedCode of hashedCodes) {
    await db.query(
      'INSERT INTO user_2fa_backup_codes (user_id, code_hash, used) VALUES (?, ?, FALSE)',
      [req.user.id, hashedCode]
    );
  }

  logger.info('Backup codes regenerated:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Codes de récupération régénérés',
    data: {
      backupCodes,
      warning: 'Les anciens codes sont maintenant invalides.'
    }
  });
}));

module.exports = router;
