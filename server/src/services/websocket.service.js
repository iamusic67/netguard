/**
 * WebSocket Service
 * Handles real-time notifications and events
 */

const { logger } = require('../utils/logger');
const jwt = require('jsonwebtoken');

let wss = null;
const userConnections = new Map(); // userId -> Set of WebSocket connections

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
const initWebSocket = (server) => {
  try {
    const WebSocket = require('ws');
    
    wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      verifyClient: (info, callback) => {
        // Allow connection, but require auth message after connection
        callback(true);
      }
    });

    wss.on('connection', handleConnection);

    logger.info('WebSocket server initialized');
    return wss;
  } catch (error) {
    logger.warn('WebSocket not available:', error.message);
    return null;
  }
};

/**
 * Handle new WebSocket connection
 * @param {WebSocket} ws - WebSocket connection
 * @param {http.IncomingMessage} req - HTTP request
 */
const handleConnection = (ws, req) => {
  let userId = null;
  let authenticated = false;
  let pingInterval = null;

  // Set connection timeout
  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      ws.close(4001, 'Authentication timeout');
    }
  }, 10000);

  // Ping to keep connection alive
  pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'auth':
          // Authenticate user
          const token = data.token;
          if (!token) {
            ws.send(JSON.stringify({ type: 'error', message: 'Token required' }));
            return;
          }

          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;
            authenticated = true;
            clearTimeout(authTimeout);

            // Store connection
            if (!userConnections.has(userId)) {
              userConnections.set(userId, new Set());
            }
            userConnections.get(userId).add(ws);

            ws.send(JSON.stringify({ 
              type: 'auth_success', 
              message: 'Authenticated successfully' 
            }));

            logger.info('WebSocket authenticated:', { userId });
          } catch (error) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
            ws.close(4002, 'Invalid token');
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'subscribe':
          // Handle channel subscriptions
          if (!authenticated) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
            return;
          }
          ws.channels = ws.channels || new Set();
          ws.channels.add(data.channel);
          ws.send(JSON.stringify({ 
            type: 'subscribed', 
            channel: data.channel 
          }));
          break;

        case 'unsubscribe':
          if (ws.channels) {
            ws.channels.delete(data.channel);
          }
          break;

        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (error) {
      logger.error('WebSocket message error:', error.message);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    clearTimeout(authTimeout);
    clearInterval(pingInterval);

    if (userId && userConnections.has(userId)) {
      userConnections.get(userId).delete(ws);
      if (userConnections.get(userId).size === 0) {
        userConnections.delete(userId);
      }
    }

    logger.debug('WebSocket connection closed:', { userId });
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error.message);
  });
};

/**
 * Send notification to a specific user
 * @param {number|string} userId - User ID
 * @param {object} notification - Notification data
 */
const sendToUser = (userId, notification) => {
  const connections = userConnections.get(userId);
  if (!connections || connections.size === 0) {
    return false;
  }

  const message = JSON.stringify({
    type: 'notification',
    data: notification,
    timestamp: Date.now()
  });

  let sent = 0;
  for (const ws of connections) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
      sent++;
    }
  }

  return sent > 0;
};

/**
 * Broadcast to all connected users
 * @param {object} notification - Notification data
 * @param {string} channel - Optional channel filter
 */
const broadcast = (notification, channel = null) => {
  if (!wss) return 0;

  const message = JSON.stringify({
    type: 'broadcast',
    channel,
    data: notification,
    timestamp: Date.now()
  });

  let sent = 0;
  wss.clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      if (!channel || (ws.channels && ws.channels.has(channel))) {
        ws.send(message);
        sent++;
      }
    }
  });

  return sent;
};

/**
 * Send alert notification
 * @param {number|string} userId - User ID
 * @param {object} alert - Alert data
 */
const sendAlert = (userId, alert) => {
  return sendToUser(userId, {
    type: 'alert',
    ...alert,
    id: Date.now(),
    read: false
  });
};

/**
 * Send system notification to all users
 * @param {object} notification - Notification data
 */
const sendSystemNotification = (notification) => {
  return broadcast({
    type: 'system',
    ...notification
  }, 'system');
};

/**
 * Get connection statistics
 */
const getStats = () => {
  return {
    totalConnections: wss ? wss.clients.size : 0,
    authenticatedUsers: userConnections.size,
    connectionsByUser: Object.fromEntries(
      Array.from(userConnections.entries()).map(([userId, conns]) => [userId, conns.size])
    )
  };
};

/**
 * Notification types
 */
const NotificationType = {
  ALERT: 'alert',
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  ERROR: 'error',
  SECURITY: 'security',
  LOGIN: 'login',
  DEVICE: 'device'
};

module.exports = {
  initWebSocket,
  sendToUser,
  broadcast,
  sendAlert,
  sendSystemNotification,
  getStats,
  NotificationType
};
