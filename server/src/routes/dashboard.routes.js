/**
 * Dashboard Routes
 * Dashboard data endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');
const { authenticate } = require('../middleware/auth.middleware');

// ===== GET DASHBOARD STATS =====
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get device counts
  const [deviceStats] = await db.query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
       SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline,
       SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle
     FROM devices WHERE user_id = ?`,
    [userId]
  );

  // Get alert counts
  const [alertStats] = await db.query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread,
       SUM(CASE WHEN type = 'critical' AND is_read = FALSE THEN 1 ELSE 0 END) as critical
     FROM alerts WHERE user_id = ?`,
    [userId]
  );

  // Get today's network stats
  const todayStats = await db.queryOne(
    `SELECT * FROM network_stats WHERE user_id = ? AND date = CURDATE()`,
    [userId]
  );

  // Get weekly threats blocked
  const [weeklyThreats] = await db.query(
    `SELECT SUM(threats_blocked) as total
     FROM network_stats
     WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
    [userId]
  );

  res.json({
    success: true,
    data: {
      protection: {
        value: '99.8%',
        trend: '+0.2%',
        trendDirection: 'up'
      },
      connections: {
        value: deviceStats?.online || 0,
        total: deviceStats?.total || 0,
        trend: '+12%',
        trendDirection: 'up'
      },
      threats: {
        value: weeklyThreats?.total || 0,
        trend: '-8%',
        trendDirection: 'down'
      },
      bandwidth: {
        value: todayStats ? formatBandwidth(todayStats.bandwidth_down) : '0 Mb/s',
        trend: '+5%',
        trendDirection: 'up'
      },
      alerts: {
        total: alertStats?.total || 0,
        unread: alertStats?.unread || 0,
        critical: alertStats?.critical || 0
      }
    }
  });
}));

// ===== GET NETWORK CHART DATA =====
router.get('/chart', authenticate, asyncHandler(async (req, res) => {
  const { period = '7d' } = req.query;
  const userId = req.user.id;

  let days = 7;
  switch (period) {
    case '24h': days = 1; break;
    case '7d': days = 7; break;
    case '30d': days = 30; break;
    case '90d': days = 90; break;
  }

  const stats = await db.query(
    `SELECT date, connections, bandwidth_up, bandwidth_down, threats_blocked
     FROM network_stats
     WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY date ASC`,
    [userId, days]
  );

  // Format data for chart
  const chartData = stats.map(stat => ({
    date: stat.date,
    label: formatDateLabel(stat.date, period),
    connections: stat.connections,
    bandwidthUp: stat.bandwidth_up,
    bandwidthDown: stat.bandwidth_down,
    threats: stat.threats_blocked
  }));

  res.json({
    success: true,
    data: { chartData, period }
  });
}));

// ===== GET RECENT ALERTS =====
router.get('/alerts', authenticate, asyncHandler(async (req, res) => {
  const { limit = 10, unreadOnly = false } = req.query;
  const userId = req.user.id;

  let whereClause = 'user_id = ?';
  const params = [userId];

  if (unreadOnly === 'true') {
    whereClause += ' AND is_read = FALSE';
  }

  const alerts = await db.query(
    `SELECT id, type, title, message, is_read, created_at
     FROM alerts
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...params, parseInt(limit)]
  );

  // Format alerts
  const formattedAlerts = alerts.map(alert => ({
    id: alert.id,
    type: alert.type,
    title: alert.title,
    message: alert.message,
    isRead: alert.is_read,
    time: formatTimeAgo(alert.created_at),
    icon: getAlertIcon(alert.type),
    status: getAlertStatus(alert.type)
  }));

  res.json({
    success: true,
    data: { alerts: formattedAlerts }
  });
}));

// ===== MARK ALERT AS READ =====
router.put('/alerts/:alertId/read', authenticate, asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const userId = req.user.id;

  await db.query(
    'UPDATE alerts SET is_read = TRUE WHERE id = ? AND user_id = ?',
    [alertId, userId]
  );

  res.json({
    success: true,
    message: 'Alerte marquée comme lue'
  });
}));

// ===== MARK ALL ALERTS AS READ =====
router.put('/alerts/read-all', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await db.query(
    'UPDATE alerts SET is_read = TRUE WHERE user_id = ?',
    [userId]
  );

  res.json({
    success: true,
    message: 'Toutes les alertes marquées comme lues'
  });
}));

// ===== GET DEVICES =====
router.get('/devices', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const devices = await db.query(
    `SELECT id, name, type, ip_address, mac_address, status, last_seen
     FROM devices
     WHERE user_id = ?
     ORDER BY
       CASE status
         WHEN 'online' THEN 1
         WHEN 'idle' THEN 2
         WHEN 'offline' THEN 3
       END,
       last_seen DESC`,
    [userId]
  );

  // Format devices
  const formattedDevices = devices.map(device => ({
    id: device.id,
    name: device.name,
    type: device.type,
    ip: device.ip_address,
    mac: device.mac_address,
    status: device.status,
    statusText: getStatusText(device.status),
    lastSeen: device.last_seen,
    icon: getDeviceIcon(device.type)
  }));

  res.json({
    success: true,
    data: { devices: formattedDevices }
  });
}));

// ===== ADD DEVICE =====
router.post('/devices', authenticate, asyncHandler(async (req, res) => {
  const { name, type, ipAddress, macAddress } = req.body;
  const userId = req.user.id;

  const result = await db.query(
    `INSERT INTO devices (user_id, name, type, ip_address, mac_address, status, last_seen)
     VALUES (?, ?, ?, ?, ?, 'online', NOW())`,
    [userId, name, type || 'other', ipAddress, macAddress]
  );

  res.status(201).json({
    success: true,
    message: 'Appareil ajouté',
    data: { deviceId: result.insertId }
  });
}));

// ===== UPDATE DEVICE =====
router.put('/devices/:deviceId', authenticate, asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const { name, type, status } = req.body;
  const userId = req.user.id;

  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  if (type) {
    updates.push('type = ?');
    params.push(type);
  }
  if (status) {
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length === 0) {
    return res.json({ success: true, message: 'Aucune modification' });
  }

  params.push(deviceId, userId);

  await db.query(
    `UPDATE devices SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  );

  res.json({
    success: true,
    message: 'Appareil mis à jour'
  });
}));

// ===== DELETE DEVICE =====
router.delete('/devices/:deviceId', authenticate, asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const userId = req.user.id;

  await db.query(
    'DELETE FROM devices WHERE id = ? AND user_id = ?',
    [deviceId, userId]
  );

  res.json({
    success: true,
    message: 'Appareil supprimé'
  });
}));

// ===== HELPER FUNCTIONS =====
function formatBandwidth(bytes) {
  if (!bytes) return '0 Mb/s';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} Gb/s`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} Mb/s`;
}

function formatDateLabel(date, period) {
  const d = new Date(date);
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  if (period === '24h') {
    return `${d.getHours()}h`;
  }
  if (period === '7d') {
    return days[d.getDay()];
  }
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  return `Il y a ${days} jours`;
}

function getAlertIcon(type) {
  const icons = {
    critical: '🚨',
    warning: '⚠️',
    info: '🔒',
    success: '✅'
  };
  return icons[type] || '📢';
}

function getAlertStatus(type) {
  const statuses = {
    critical: 'Critique',
    warning: 'Important',
    info: 'Info',
    success: 'Succès'
  };
  return statuses[type] || 'Info';
}

function getStatusText(status) {
  const texts = {
    online: 'En ligne',
    offline: 'Hors ligne',
    idle: 'Inactif'
  };
  return texts[status] || status;
}

function getDeviceIcon(type) {
  const icons = {
    desktop: '🖥️',
    laptop: '💻',
    mobile: '📱',
    tablet: '📱',
    tv: '📺',
    gaming: '🎮',
    iot: '🔌',
    other: '📟'
  };
  return icons[type] || '📟';
}

module.exports = router;
