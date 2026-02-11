/**
 * Authentication Routes
 * Handles login, register, password reset
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const router = express.Router();
const db = require('../config/database');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/email.service');
const { logger } = require('../utils/logger');

// ===== Validation Rules =====
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email invalide'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email invalide'),
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email invalide')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token requis'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre')
];

// ===== Helper Functions =====
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// ===== REGISTER =====
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { email, password, firstName, lastName } = req.body;
  const fullName = `${firstName} ${lastName}`;

  // Check if user exists
  const existingUser = await db.queryOne(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existingUser) {
    throw new ApiError(409, 'Cette adresse email est déjà utilisée');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);
  const userUuid = uuidv4();
  const verificationToken = generateResetToken();

  // Create user
  const result = await db.query(
    `INSERT INTO users (uuid, email, password, full_name, first_name, last_name, is_active, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, TRUE, FALSE)`,
    [userUuid, email, hashedPassword, fullName, firstName, lastName]
  );

  const userId = result.insertId;

  // Create verification token
  await db.query(
    `INSERT INTO email_verifications (user_id, token, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
    [userId, verificationToken]
  );

  // Send welcome email
  try {
    await sendWelcomeEmail(email, fullName, verificationToken);
  } catch (emailError) {
    logger.error('Failed to send welcome email:', emailError);
  }

  // Generate JWT token
  const token = generateToken(userId);

  // Create session
  await db.query(
    `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
    [userId, token, req.ip, req.get('user-agent')]
  );

  logger.info('New user registered:', { userId, email });

  res.status(201).json({
    success: true,
    message: 'Compte créé avec succès ! Un email de vérification a été envoyé.',
    data: {
      user: {
        id: userUuid,
        email,
        firstName,
        lastName,
        fullName,
        role: 'user',
        isVerified: false
      },
      token
    }
  });
}));

// ===== LOGIN =====
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { email, password, remember = false } = req.body;

  // Get user
  const user = await db.queryOne(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  // Check if user exists
  if (!user) {
    // Log failed attempt
    logger.warn('Login attempt with non-existent email:', { email, ip: req.ip });
    throw new ApiError(401, 'Email ou mot de passe incorrect');
  }

  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const lockMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    throw new ApiError(423, `Compte temporairement verrouillé. Réessayez dans ${lockMinutes} minutes.`);
  }

  // Check if account is active
  if (!user.is_active) {
    throw new ApiError(403, 'Compte désactivé. Contactez l\'administrateur.');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    // Increment login attempts
    const newAttempts = user.login_attempts + 1;

    if (newAttempts >= 5) {
      // Lock account for 15 minutes
      await db.query(
        'UPDATE users SET login_attempts = ?, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?',
        [newAttempts, user.id]
      );

      // Log login failure
      await db.query(
        `INSERT INTO login_history (user_id, ip_address, user_agent, status, failure_reason)
         VALUES (?, ?, ?, 'blocked', 'Account locked after 5 failed attempts')`,
        [user.id, req.ip, req.get('user-agent')]
      );

      throw new ApiError(423, 'Compte verrouillé après 5 tentatives échouées. Réessayez dans 15 minutes.');
    }

    await db.query(
      'UPDATE users SET login_attempts = ? WHERE id = ?',
      [newAttempts, user.id]
    );

    // Log failed attempt
    await db.query(
      `INSERT INTO login_history (user_id, ip_address, user_agent, status, failure_reason)
       VALUES (?, ?, ?, 'failed', 'Invalid password')`,
      [user.id, req.ip, req.get('user-agent')]
    );

    throw new ApiError(401, 'Email ou mot de passe incorrect');
  }

  // Reset login attempts on successful login
  await db.query(
    'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
    [user.id]
  );

  // Generate JWT token
  const expiresIn = remember ? '30d' : '7d';
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  // Invalidate old sessions (optional: keep last 5)
  await db.query(
    `UPDATE sessions SET is_valid = FALSE
     WHERE user_id = ? AND id NOT IN (
       SELECT id FROM (SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5) t
     )`,
    [user.id, user.id]
  );

  // Create new session
  const expiresAt = remember ? 'DATE_ADD(NOW(), INTERVAL 30 DAY)' : 'DATE_ADD(NOW(), INTERVAL 7 DAY)';
  await db.query(
    `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ${expiresAt})`,
    [user.id, token, req.ip, req.get('user-agent')]
  );

  // Log successful login
  await db.query(
    `INSERT INTO login_history (user_id, ip_address, user_agent, status)
     VALUES (?, ?, ?, 'success')`,
    [user.id, req.ip, req.get('user-agent')]
  );

  logger.info('User logged in:', { userId: user.id, email: user.email, ip: req.ip });

  res.json({
    success: true,
    message: 'Connexion réussie !',
    data: {
      user: {
        id: user.uuid,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: user.full_name,
        role: user.role,
        isVerified: user.is_verified,
        avatarUrl: user.avatar_url,
        mustChangePassword: user.must_change_password || false
      },
      token
    }
  });
}));

// ===== LOGOUT =====
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // Invalidate current session
  await db.query(
    'UPDATE sessions SET is_valid = FALSE WHERE token = ?',
    [req.token]
  );

  logger.info('User logged out:', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
}));

// ===== FORGOT PASSWORD =====
router.post('/forgot-password', forgotPasswordValidation, asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { email } = req.body;

  // Get user (don't reveal if email exists or not)
  const user = await db.queryOne(
    'SELECT id, email, full_name FROM users WHERE email = ? AND is_active = TRUE',
    [email]
  );

  // Always return success to prevent email enumeration
  if (!user) {
    logger.info('Password reset requested for non-existent email:', { email });
    return res.json({
      success: true,
      message: 'Si cette adresse existe, un email de réinitialisation a été envoyé.'
    });
  }

  // Invalidate old reset tokens
  await db.query(
    'UPDATE password_resets SET used = TRUE WHERE user_id = ?',
    [user.id]
  );

  // Generate reset token
  const resetToken = generateResetToken();

  // Save reset token
  await db.query(
    `INSERT INTO password_resets (user_id, token, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
    [user.id, resetToken]
  );

  // Send reset email
  try {
    await sendPasswordResetEmail(user.email, resetToken, user.full_name);
  } catch (emailError) {
    logger.error('Failed to send password reset email:', emailError);
  }

  logger.info('Password reset requested:', { userId: user.id, email: user.email });

  res.json({
    success: true,
    message: 'Si cette adresse existe, un email de réinitialisation a été envoyé.'
  });
}));

// ===== RESET PASSWORD =====
router.post('/reset-password', resetPasswordValidation, asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Données invalides', errors.array());
  }

  const { token, password } = req.body;

  // Find valid reset token
  const resetRecord = await db.queryOne(
    `SELECT pr.*, u.id as user_id, u.email
     FROM password_resets pr
     JOIN users u ON pr.user_id = u.id
     WHERE pr.token = ? AND pr.used = FALSE AND pr.expires_at > NOW()`,
    [token]
  );

  if (!resetRecord) {
    throw new ApiError(400, 'Lien de réinitialisation invalide ou expiré');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Update password
  await db.query(
    'UPDATE users SET password = ?, login_attempts = 0, locked_until = NULL WHERE id = ?',
    [hashedPassword, resetRecord.user_id]
  );

  // Mark token as used
  await db.query(
    'UPDATE password_resets SET used = TRUE WHERE id = ?',
    [resetRecord.id]
  );

  // Invalidate all sessions
  await db.query(
    'UPDATE sessions SET is_valid = FALSE WHERE user_id = ?',
    [resetRecord.user_id]
  );

  logger.info('Password reset successful:', { userId: resetRecord.user_id, email: resetRecord.email });

  res.json({
    success: true,
    message: 'Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter.'
  });
}));

// ===== VERIFY EMAIL =====
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ApiError(400, 'Token de vérification requis');
  }

  // Find valid verification token
  const verification = await db.queryOne(
    `SELECT ev.*, u.id as user_id
     FROM email_verifications ev
     JOIN users u ON ev.user_id = u.id
     WHERE ev.token = ? AND ev.verified_at IS NULL AND ev.expires_at > NOW()`,
    [token]
  );

  if (!verification) {
    throw new ApiError(400, 'Lien de vérification invalide ou expiré');
  }

  // Mark user as verified
  await db.query(
    'UPDATE users SET is_verified = TRUE WHERE id = ?',
    [verification.user_id]
  );

  // Mark verification as complete
  await db.query(
    'UPDATE email_verifications SET verified_at = NOW() WHERE id = ?',
    [verification.id]
  );

  logger.info('Email verified:', { userId: verification.user_id });

  res.json({
    success: true,
    message: 'Email vérifié avec succès !'
  });
}));

// ===== GET CURRENT USER =====
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.uuid,
        email: req.user.email,
        fullName: req.user.full_name,
        role: req.user.role,
        isVerified: req.user.is_verified
      }
    }
  });
}));

// ===== REFRESH TOKEN =====
router.post('/refresh', authenticate, asyncHandler(async (req, res) => {
  // Generate new token
  const newToken = generateToken(req.user.id);

  // Invalidate old session
  await db.query(
    'UPDATE sessions SET is_valid = FALSE WHERE token = ?',
    [req.token]
  );

  // Create new session
  await db.query(
    `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
    [req.user.id, newToken, req.ip, req.get('user-agent')]
  );

  res.json({
    success: true,
    message: 'Token rafraîchi',
    data: { token: newToken }
  });
}));

module.exports = router;
