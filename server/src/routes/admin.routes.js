/**
 * Admin Routes
 * Admin-only endpoints for user management
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { logger } = require('../utils/logger');
const emailService = require('../services/email.service');

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /admin/users
 * Get all users
 */
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, uuid, email, full_name, first_name, last_name, role, is_active, 
              is_verified, last_login, created_at, updated_at,
              must_change_password
       FROM users 
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
});

/**
 * GET /admin/users/:id
 * Get single user
 */
router.get('/users/:id', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, uuid, email, full_name, first_name, last_name, role, is_active, 
              is_verified, last_login, created_at, updated_at
       FROM users 
       WHERE id = ?`,
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur'
    });
  }
});

/**
 * PUT /admin/users/:id
 * Update user
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { firstName, lastName, email, role } = req.body;
    const userId = req.params.id;

    // Prevent assigning admin role
    if (role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Impossible d\'attribuer le rôle administrateur'
      });
    }

    // Prevent admin from modifying their own role
    if (parseInt(userId) === req.user.id && role) {
      const [currentUser] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
      if (currentUser.length > 0 && currentUser[0].role !== role) {
        return res.status(400).json({
          success: false,
          message: 'Vous ne pouvez pas modifier votre propre rôle'
        });
      }
    }

    // Check if email already exists for another user
    if (email) {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }
    }

    const fullName = `${firstName || ''} ${lastName || ''}`.trim();

    await pool.query(
      `UPDATE users
       SET first_name = ?, last_name = ?, full_name = ?, email = ?, role = ?, updated_at = NOW()
       WHERE id = ?`,
      [firstName, lastName, fullName, email, role, userId]
    );

    logger.info(`User ${userId} updated by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès'
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'utilisateur'
    });
  }
});

/**
 * PUT /admin/users/:id/status
 * Toggle user active status
 */
router.put('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    const userId = req.params.id;

    // Prevent admin from deactivating themselves
    if (parseInt(userId) === req.user.id && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas vous désactiver vous-même'
      });
    }

    await pool.query(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [isActive, userId]
    );

    logger.info(`User ${userId} ${isActive ? 'activated' : 'deactivated'} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`
    });
  } catch (error) {
    logger.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de statut'
    });
  }
});

/**
 * POST /admin/users/:id/reset-password-email
 * Send password reset email to user
 */
router.post('/users/:id/reset-password-email', async (req, res) => {
  try {
    const userId = req.params.id;

    const [users] = await pool.query(
      'SELECT id, email, full_name FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const user = users[0];

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save token to database
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at), used = FALSE`,
      [userId, token, expiresAt]
    );

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    
    await emailService.sendEmail({
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe NetGUARD',
      html: `
        <h2>Bonjour ${user.full_name},</h2>
        <p>Un administrateur a demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#00d4ff;color:#0d1117;border-radius:6px;text-decoration:none;font-weight:500;">
          Réinitialiser mon mot de passe
        </a>
        <p style="margin-top:20px;color:#888;">Ce lien expire dans 24 heures.</p>
      `
    });

    logger.info(`Password reset email sent to user ${userId} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Email de réinitialisation envoyé avec succès'
    });
  } catch (error) {
    logger.error('Error sending reset email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de l\'email'
    });
  }
});

/**
 * POST /admin/users/:id/temp-password
 * Generate temporary password for user
 */
router.post('/users/:id/temp-password', async (req, res) => {
  try {
    const userId = req.params.id;

    const [users] = await pool.query(
      'SELECT id, email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Generate secure temporary password
    const tempPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Update user with new password and flag to change on next login
    await pool.query(
      `UPDATE users 
       SET password = ?, must_change_password = TRUE, updated_at = NOW()
       WHERE id = ?`,
      [hashedPassword, userId]
    );

    logger.info(`Temporary password generated for user ${userId} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Mot de passe temporaire généré',
      data: {
        temporaryPassword: tempPassword
      }
    });
  } catch (error) {
    logger.error('Error generating temp password:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du mot de passe'
    });
  }
});

/**
 * DELETE /admin/users/:id
 * Delete user
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas vous supprimer vous-même'
      });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    logger.info(`User ${userId} deleted by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'utilisateur'
    });
  }
});

/**
 * Generate a secure random password
 */
function generateSecurePassword(length = 16) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  // Ensure at least one of each type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

module.exports = router;
