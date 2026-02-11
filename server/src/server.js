/**
 * NetGUARD Backend Server
 * Main entry point
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logger } = require('./utils/logger');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const twoFactorRoutes = require('./routes/2fa.routes');
const oauthRoutes = require('./routes/oauth.routes');
const sessionRoutes = require('./routes/session.routes');
const profileRoutes = require('./routes/profile.routes');
const exportRoutes = require('./routes/export.routes');
const adminRoutes = require('./routes/admin.routes');
const networkToolsRoutes = require('./routes/networktools.routes');
const { errorHandler } = require('./middleware/error.middleware');
const db = require('./config/database');
const { initRedis } = require('./services/cache.service');
const { initWebSocket } = require('./services/websocket.service');
const { initMonitoring, performanceMiddleware } = require('./services/monitoring.service');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ===== Initialize Monitoring (Sentry) =====
initMonitoring();

// ===== Security Middleware =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
      frameSrc: ["https://www.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"]
    }
  }
}));

// ===== Performance Monitoring =====
app.use(performanceMiddleware());

// ===== CORS Configuration =====
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ===== Rate Limiting =====
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// ===== Stricter rate limit for auth routes =====
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
  }
});

// ===== Body Parser =====
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ===== Request Logging =====
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ===== Health Check =====
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'NetGUARD API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ===== API Routes =====
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth/2fa', twoFactorRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tools', networkToolsRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// ===== Error Handler =====
app.use(errorHandler);

// ===== Database Connection & Server Start =====
const startServer = async () => {
  try {
    // Test database connection
    await db.testConnection();
    logger.info('Database connected successfully');

    // Initialize Redis cache
    await initRedis();

    // Initialize WebSocket server
    initWebSocket(server);

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 NetGUARD API Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
      logger.info(`🔌 WebSocket URL: ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// ===== Graceful Shutdown =====
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  db.pool.end(() => {
    logger.info('Database pool closed.');
    process.exit(0);
  });
});

module.exports = app;
