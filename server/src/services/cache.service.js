/**
 * Redis Cache Service
 * Handles caching for sessions, rate limiting, and general caching
 */

const { logger } = require('../utils/logger');

// In-memory fallback cache when Redis is not available
const memoryCache = new Map();
const memoryCacheTTL = new Map();

// Redis client (optional)
let redisClient = null;
let isRedisConnected = false;

/**
 * Initialize Redis connection
 */
const initRedis = async () => {
  const REDIS_URL = process.env.REDIS_URL;
  
  if (!REDIS_URL) {
    logger.info('Redis URL not configured, using in-memory cache');
    return false;
  }

  try {
    // Dynamic import for optional Redis dependency
    const Redis = require('ioredis');
    
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis connection failed, falling back to memory cache');
          return null;
        }
        return Math.min(times * 100, 3000);
      }
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis error:', error.message);
      isRedisConnected = false;
    });

    redisClient.on('close', () => {
      isRedisConnected = false;
      logger.warn('Redis connection closed');
    });

    return true;
  } catch (error) {
    logger.warn('Redis not available, using in-memory cache:', error.message);
    return false;
  }
};

/**
 * Clean expired entries from memory cache
 */
const cleanMemoryCache = () => {
  const now = Date.now();
  for (const [key, expiry] of memoryCacheTTL.entries()) {
    if (expiry && expiry < now) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  }
};

// Clean memory cache every 5 minutes
setInterval(cleanMemoryCache, 5 * 60 * 1000);

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds
 */
const set = async (key, value, ttlSeconds = 3600) => {
  const stringValue = JSON.stringify(value);

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.setex(key, ttlSeconds, stringValue);
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error.message);
    }
  }

  // Fallback to memory cache
  memoryCache.set(key, stringValue);
  memoryCacheTTL.set(key, Date.now() + ttlSeconds * 1000);
  return true;
};

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>}
 */
const get = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error.message);
    }
  }

  // Fallback to memory cache
  const expiry = memoryCacheTTL.get(key);
  if (expiry && expiry < Date.now()) {
    memoryCache.delete(key);
    memoryCacheTTL.delete(key);
    return null;
  }

  const value = memoryCache.get(key);
  return value ? JSON.parse(value) : null;
};

/**
 * Delete a key from cache
 * @param {string} key - Cache key
 */
const del = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error.message);
    }
  }

  memoryCache.delete(key);
  memoryCacheTTL.delete(key);
};

/**
 * Delete keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., "session:*")
 */
const delPattern = async (pattern) => {
  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      logger.error('Redis DEL pattern error:', error.message);
    }
  }

  // Memory cache pattern matching
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  }
};

/**
 * Increment a counter
 * @param {string} key - Cache key
 * @param {number} ttlSeconds - TTL for new keys
 * @returns {Promise<number>}
 */
const incr = async (key, ttlSeconds = 3600) => {
  if (isRedisConnected && redisClient) {
    try {
      const value = await redisClient.incr(key);
      if (value === 1) {
        await redisClient.expire(key, ttlSeconds);
      }
      return value;
    } catch (error) {
      logger.error('Redis INCR error:', error.message);
    }
  }

  // Memory cache increment
  const current = await get(key);
  const newValue = (current || 0) + 1;
  await set(key, newValue, ttlSeconds);
  return newValue;
};

/**
 * Check if Redis is connected
 * @returns {boolean}
 */
const isConnected = () => isRedisConnected;

/**
 * Get cache statistics
 */
const getStats = () => {
  return {
    type: isRedisConnected ? 'redis' : 'memory',
    connected: isRedisConnected,
    memoryCacheSize: memoryCache.size
  };
};

/**
 * Session cache helpers
 */
const sessionCache = {
  set: (sessionId, sessionData, ttlSeconds = 86400) => 
    set(`session:${sessionId}`, sessionData, ttlSeconds),
  
  get: (sessionId) => 
    get(`session:${sessionId}`),
  
  del: (sessionId) => 
    del(`session:${sessionId}`),
  
  delUser: (userId) => 
    delPattern(`session:*:${userId}`)
};

/**
 * Rate limit cache helpers
 */
const rateLimitCache = {
  check: async (key, maxRequests, windowSeconds) => {
    const cacheKey = `ratelimit:${key}`;
    const current = await incr(cacheKey, windowSeconds);
    return {
      allowed: current <= maxRequests,
      current,
      remaining: Math.max(0, maxRequests - current)
    };
  }
};

module.exports = {
  initRedis,
  set,
  get,
  del,
  delPattern,
  incr,
  isConnected,
  getStats,
  sessionCache,
  rateLimitCache
};
