/**
 * Export Routes
 * Handles data export (CSV, PDF)
 */

const express = require('express');
const router = express.Router();

const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logger } = require('../utils/logger');
const {
  toCSV,
  toPDFHTML,
  formatLoginHistory,
  formatAlerts,
  sendExport
} = require('../services/export.service');

// ===== EXPORT LOGIN HISTORY =====
router.get('/login-history/:format', authenticate, asyncHandler(async (req, res) => {
  const { format } = req.params;
  const { limit = 100 } = req.query;

  const history = await db.query(
    `SELECT ip_address, user_agent, status, failure_reason, created_at
     FROM login_history 
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [req.user.id, parseInt(limit)]
  );

  const formattedData = formatLoginHistory(history);
  const filename = `netguard-login-history-${Date.now()}`;

  if (format === 'csv') {
    const csv = toCSV(formattedData);
    sendExport(res, csv, `${filename}.csv`, 'csv');
  } else if (format === 'pdf') {
    const html = toPDFHTML({
      title: 'Historique des connexions',
      subtitle: `Compte: ${req.user.email}`,
      data: formattedData
    });
    sendExport(res, html, `${filename}.html`, 'html');
  } else {
    sendExport(res, JSON.stringify(formattedData, null, 2), `${filename}.json`, 'json');
  }

  logger.info('Login history exported:', { userId: req.user.id, format });
}));

// ===== EXPORT USER DATA (GDPR) =====
router.get('/my-data/:format', authenticate, asyncHandler(async (req, res) => {
  const { format } = req.params;

  // Get user data
  const user = await db.queryOne(
    'SELECT uuid, email, full_name, role, created_at, last_login FROM users WHERE id = ?',
    [req.user.id]
  );

  // Get sessions
  const sessions = await db.query(
    'SELECT ip_address, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? AND is_valid = TRUE',
    [req.user.id]
  );

  // Get login history
  const loginHistory = await db.query(
    'SELECT ip_address, status, created_at FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );

  // Get OAuth connections
  const oauthConnections = await db.query(
    'SELECT provider, created_at FROM user_oauth WHERE user_id = ?',
    [req.user.id]
  );

  const exportData = {
    account: {
      id: user.uuid,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      createdAt: user.created_at,
      lastLogin: user.last_login
    },
    activeSessions: sessions.length,
    sessions: sessions.map(s => ({
      ipAddress: s.ip_address,
      createdAt: s.created_at,
      expiresAt: s.expires_at
    })),
    loginHistory: loginHistory.map(h => ({
      ipAddress: h.ip_address,
      status: h.status,
      date: h.created_at
    })),
    connectedAccounts: oauthConnections.map(o => ({
      provider: o.provider,
      connectedAt: o.created_at
    }))
  };

  const filename = `netguard-my-data-${Date.now()}`;

  if (format === 'json') {
    sendExport(res, JSON.stringify(exportData, null, 2), `${filename}.json`, 'json');
  } else {
    const html = toPDFHTML({
      title: 'Mes données personnelles',
      subtitle: `Export pour: ${user.email}`,
      data: [exportData.account],
      stats: {
        'Sessions actives': sessions.length,
        'Connexions OAuth': oauthConnections.length,
        'Historique de connexion': loginHistory.length
      }
    });
    sendExport(res, html, `${filename}.html`, 'html');
  }

  logger.info('User data exported:', { userId: req.user.id, format });
}));

// ===== ADMIN: EXPORT ALL USERS =====
router.get('/admin/users/:format', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { format } = req.params;

  const users = await db.query(
    `SELECT uuid, email, full_name, role, is_active, is_verified, last_login, created_at
     FROM users ORDER BY created_at DESC`
  );

  const formattedUsers = users.map(u => ({
    ID: u.uuid,
    Email: u.email,
    Nom: u.full_name,
    Rôle: u.role,
    Actif: u.is_active ? 'Oui' : 'Non',
    Vérifié: u.is_verified ? 'Oui' : 'Non',
    'Dernière connexion': u.last_login?.toLocaleString('fr-FR') || 'Jamais',
    'Créé le': u.created_at?.toLocaleString('fr-FR')
  }));

  const filename = `netguard-users-export-${Date.now()}`;

  if (format === 'csv') {
    const csv = toCSV(formattedUsers);
    sendExport(res, csv, `${filename}.csv`, 'csv');
  } else if (format === 'pdf') {
    const html = toPDFHTML({
      title: 'Liste des utilisateurs',
      subtitle: `Total: ${users.length} utilisateurs`,
      data: formattedUsers,
      stats: {
        'Total utilisateurs': users.length,
        'Utilisateurs actifs': users.filter(u => u.is_active).length,
        'Utilisateurs vérifiés': users.filter(u => u.is_verified).length,
        'Administrateurs': users.filter(u => u.role === 'admin').length
      }
    });
    sendExport(res, html, `${filename}.html`, 'html');
  } else {
    sendExport(res, JSON.stringify(formattedUsers, null, 2), `${filename}.json`, 'json');
  }

  logger.info('Admin users export:', { adminId: req.user.id, format, count: users.length });
}));

// ===== ADMIN: EXPORT DASHBOARD STATS =====
router.get('/admin/stats/:format', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { format } = req.params;

  // Get various stats
  const userStats = await db.queryOne(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as newThisWeek
    FROM users
  `);

  const sessionStats = await db.queryOne(`
    SELECT COUNT(*) as active FROM sessions WHERE is_valid = TRUE AND expires_at > NOW()
  `);

  const loginStats = await db.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM login_history
    WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `);

  const stats = {
    users: {
      total: userStats.total,
      active: userStats.active,
      newThisWeek: userStats.newThisWeek
    },
    sessions: {
      active: sessionStats.active
    },
    loginHistory: loginStats
  };

  const filename = `netguard-stats-export-${Date.now()}`;

  if (format === 'json') {
    sendExport(res, JSON.stringify(stats, null, 2), `${filename}.json`, 'json');
  } else {
    const html = toPDFHTML({
      title: 'Statistiques du Dashboard',
      stats: {
        'Utilisateurs totaux': stats.users.total,
        'Utilisateurs actifs': stats.users.active,
        'Nouveaux cette semaine': stats.users.newThisWeek,
        'Sessions actives': stats.sessions.active
      },
      data: loginStats.map(l => ({
        Date: l.date,
        'Total connexions': l.total,
        Réussies: l.success,
        Échouées: l.failed
      }))
    });
    sendExport(res, html, `${filename}.html`, 'html');
  }

  logger.info('Admin stats export:', { adminId: req.user.id, format });
}));

module.exports = router;
