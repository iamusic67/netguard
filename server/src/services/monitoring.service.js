/**
 * Monitoring Service
 * Handles error tracking, performance monitoring with Sentry integration
 */

const { logger } = require('../utils/logger');

let Sentry = null;
let isInitialized = false;

/**
 * Initialize Sentry monitoring
 */
const initMonitoring = () => {
  const SENTRY_DSN = process.env.SENTRY_DSN;

  if (!SENTRY_DSN) {
    logger.info('Sentry DSN not configured, monitoring disabled');
    return false;
  }

  try {
    Sentry = require('@sentry/node');

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || '1.0.0',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        // HTTP integration for request tracking
        Sentry.httpIntegration(),
        // Express integration
        Sentry.expressIntegration()
      ],
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
        }
        return event;
      }
    });

    isInitialized = true;
    logger.info('Sentry monitoring initialized');
    return true;
  } catch (error) {
    logger.warn('Sentry not available:', error.message);
    return false;
  }
};

/**
 * Sentry request handler middleware
 */
const requestHandler = () => {
  if (Sentry && isInitialized) {
    return Sentry.expressErrorHandler();
  }
  return (req, res, next) => next();
};

/**
 * Sentry error handler middleware
 */
const errorHandler = () => {
  if (Sentry && isInitialized) {
    return Sentry.expressErrorHandler();
  }
  return (err, req, res, next) => next(err);
};

/**
 * Capture an exception
 * @param {Error} error - Error to capture
 * @param {object} context - Additional context
 */
const captureException = (error, context = {}) => {
  logger.error('Exception captured:', error.message, context);

  if (Sentry && isInitialized) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  }
};

/**
 * Capture a message
 * @param {string} message - Message to capture
 * @param {string} level - Log level (info, warning, error)
 * @param {object} context - Additional context
 */
const captureMessage = (message, level = 'info', context = {}) => {
  logger[level](message, context);

  if (Sentry && isInitialized) {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureMessage(message);
    });
  }
};

/**
 * Set user context for error tracking
 * @param {object} user - User data
 */
const setUser = (user) => {
  if (Sentry && isInitialized && user) {
    Sentry.setUser({
      id: user.id || user.uuid,
      email: user.email,
      username: user.full_name
    });
  }
};

/**
 * Clear user context
 */
const clearUser = () => {
  if (Sentry && isInitialized) {
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb for debugging
 * @param {object} breadcrumb - Breadcrumb data
 */
const addBreadcrumb = (breadcrumb) => {
  if (Sentry && isInitialized) {
    Sentry.addBreadcrumb({
      timestamp: Date.now() / 1000,
      ...breadcrumb
    });
  }
};

/**
 * Start a performance transaction
 * @param {string} name - Transaction name
 * @param {string} op - Operation type
 * @returns {object|null} Transaction object
 */
const startTransaction = (name, op = 'http') => {
  if (Sentry && isInitialized) {
    return Sentry.startSpan({ name, op });
  }
  return null;
};

/**
 * Performance monitoring middleware
 */
const performanceMiddleware = () => {
  return (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const route = req.route?.path || req.path;

      // Log slow requests
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          method: req.method,
          route,
          duration: `${duration}ms`,
          statusCode: res.statusCode
        });

        captureMessage('Slow request', 'warning', {
          method: req.method,
          route,
          duration,
          statusCode: res.statusCode
        });
      }
    });

    next();
  };
};

/**
 * Health check data
 */
const getHealthData = () => {
  return {
    monitoring: isInitialized ? 'sentry' : 'disabled',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };
};

module.exports = {
  initMonitoring,
  requestHandler,
  errorHandler,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  performanceMiddleware,
  getHealthData
};
