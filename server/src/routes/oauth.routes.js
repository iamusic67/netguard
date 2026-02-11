/**
 * OAuth Routes
 * Handles social login (Google, Microsoft, GitHub)
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const db = require('../config/database');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');
const { logger } = require('../utils/logger');
const {
  generateState,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getUserInfo,
  getAvailableProviders
} = require('../services/oauth.service');

// Store OAuth states temporarily (in production, use Redis)
const oauthStates = new Map();

// Clean up old states every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (data.expires < now) {
      oauthStates.delete(state);
    }
  }
}, 10 * 60 * 1000);

// ===== GET AVAILABLE PROVIDERS =====
router.get('/providers', (req, res) => {
  res.json({
    success: true,
    data: {
      providers: getAvailableProviders()
    }
  });
});

// ===== INITIATE OAUTH FLOW =====
router.get('/:provider', asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const validProviders = ['google', 'microsoft', 'github'];

  if (!validProviders.includes(provider)) {
    throw new ApiError(400, 'Fournisseur OAuth non supporté');
  }

  const state = generateState();
  const authUrl = getAuthorizationUrl(provider, state);

  if (!authUrl) {
    throw new ApiError(503, `OAuth ${provider} non configuré`);
  }

  // Store state for verification
  oauthStates.set(state, {
    provider,
    expires: Date.now() + 10 * 60 * 1000, // 10 minutes
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  logger.info('OAuth flow initiated:', { provider, ip: req.ip });

  res.redirect(authUrl);
}));

// ===== OAUTH CALLBACK =====
router.get('/callback/:provider', asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state, error } = req.query;

  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Handle OAuth errors
  if (error) {
    logger.warn('OAuth error:', { provider, error });
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_denied`);
  }

  // Verify state
  const stateData = oauthStates.get(state);
  if (!stateData || stateData.provider !== provider) {
    logger.warn('Invalid OAuth state:', { provider, state });
    return res.redirect(`${FRONTEND_URL}/login?error=invalid_state`);
  }

  oauthStates.delete(state);

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(provider, code);
    
    // Get user info
    const userInfo = await getUserInfo(provider, tokens.access_token);

    if (!userInfo.email) {
      throw new Error('Email not provided by OAuth provider');
    }

    // Check if user exists with this email
    let user = await db.queryOne(
      'SELECT * FROM users WHERE email = ?',
      [userInfo.email]
    );

    if (user) {
      // Check if OAuth connection exists
      const existingOAuth = await db.queryOne(
        'SELECT * FROM user_oauth WHERE user_id = ? AND provider = ?',
        [user.id, provider]
      );

      if (!existingOAuth) {
        // Link OAuth to existing account
        await db.query(
          `INSERT INTO user_oauth (user_id, provider, provider_id, access_token, refresh_token)
           VALUES (?, ?, ?, ?, ?)`,
          [user.id, provider, userInfo.providerId, tokens.access_token, tokens.refresh_token || null]
        );
      } else {
        // Update tokens
        await db.query(
          `UPDATE user_oauth SET access_token = ?, refresh_token = ?, updated_at = NOW()
           WHERE user_id = ? AND provider = ?`,
          [tokens.access_token, tokens.refresh_token || null, user.id, provider]
        );
      }

      // Update avatar if not set
      if (!user.avatar_url && userInfo.avatar) {
        await db.query(
          'UPDATE users SET avatar_url = ? WHERE id = ?',
          [userInfo.avatar, user.id]
        );
        user.avatar_url = userInfo.avatar;
      }
    } else {
      // Create new user
      const userUuid = uuidv4();
      const result = await db.query(
        `INSERT INTO users (uuid, email, password, full_name, avatar_url, is_active, is_verified)
         VALUES (?, ?, '', ?, ?, TRUE, TRUE)`,
        [userUuid, userInfo.email, userInfo.name, userInfo.avatar]
      );

      const userId = result.insertId;

      // Create OAuth link
      await db.query(
        `INSERT INTO user_oauth (user_id, provider, provider_id, access_token, refresh_token)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, provider, userInfo.providerId, tokens.access_token, tokens.refresh_token || null]
      );

      user = {
        id: userId,
        uuid: userUuid,
        email: userInfo.email,
        full_name: userInfo.name,
        avatar_url: userInfo.avatar,
        role: 'user',
        is_verified: true
      };

      logger.info('New OAuth user created:', { userId, email: userInfo.email, provider });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.redirect(`${FRONTEND_URL}/login?error=account_disabled`);
    }

    // Check for 2FA
    const twoFactor = await db.queryOne(
      'SELECT is_enabled FROM user_2fa WHERE user_id = ? AND is_enabled = TRUE',
      [user.id]
    );

    if (twoFactor?.is_enabled) {
      // Generate temporary token for 2FA
      const tempToken = jwt.sign(
        {
          type: '2fa_pending',
          userId: user.uuid,
          dbUserId: user.id,
          ip: req.ip,
          userAgent: req.get('user-agent')
        },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      return res.redirect(`${FRONTEND_URL}/login?2fa=required&token=${tempToken}&user=${user.uuid}`);
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create session
    await db.query(
      `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [user.id, token, req.ip, req.get('user-agent')]
    );

    // Update last login
    await db.query(
      'UPDATE users SET last_login = NOW(), login_attempts = 0 WHERE id = ?',
      [user.id]
    );

    // Log login
    await db.query(
      `INSERT INTO login_history (user_id, ip_address, user_agent, status)
       VALUES (?, ?, ?, 'success')`,
      [user.id, req.ip, req.get('user-agent')]
    );

    logger.info('OAuth login successful:', { userId: user.id, provider });

    // Redirect with token
    res.redirect(`${FRONTEND_URL}/oauth-callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: user.uuid,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url
    }))}`);

  } catch (error) {
    logger.error('OAuth callback error:', error);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
}));

// ===== UNLINK OAUTH PROVIDER =====
router.delete('/:provider', asyncHandler(async (req, res) => {
  // This would need authentication middleware
  const { provider } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Non authentifié');
  }

  // Check if user has password (can't unlink if no password)
  const user = await db.queryOne('SELECT password FROM users WHERE id = ?', [userId]);
  
  if (!user.password) {
    // Count OAuth connections
    const oauthCount = await db.queryOne(
      'SELECT COUNT(*) as count FROM user_oauth WHERE user_id = ?',
      [userId]
    );

    if (oauthCount.count <= 1) {
      throw new ApiError(400, 'Vous devez définir un mot de passe avant de délier ce compte');
    }
  }

  await db.query(
    'DELETE FROM user_oauth WHERE user_id = ? AND provider = ?',
    [userId, provider]
  );

  res.json({
    success: true,
    message: `Compte ${provider} délié`
  });
}));

module.exports = router;
