/**
 * Backend Unit Tests
 * Using Jest
 */

const request = require('supertest');

// Mock dependencies
jest.mock('../config/database', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true)
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

const db = require('../config/database');

describe('Auth Routes', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    const express = require('express');
    app = express();
    app.use(express.json());
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for invalid email', async () => {
      const authRoutes = require('../routes/auth.routes');
      app.use('/api/auth', authRoutes);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for wrong password', async () => {
      db.queryOne.mockResolvedValueOnce({
        id: 1,
        email: 'test@test.com',
        password: '$2b$12$invalidhash',
        is_active: true,
        login_attempts: 0
      });

      const authRoutes = require('../routes/auth.routes');
      app.use('/api/auth', authRoutes);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 for weak password', async () => {
      const authRoutes = require('../routes/auth.routes');
      app.use('/api/auth', authRoutes);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@test.com',
          password: 'weak',
          fullName: 'Test User'
        });

      expect(res.status).toBe(400);
    });

    it('should return 409 for existing email', async () => {
      db.queryOne.mockResolvedValueOnce({ id: 1 });

      const authRoutes = require('../routes/auth.routes');
      app.use('/api/auth', authRoutes);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@test.com',
          password: 'Password123!',
          fullName: 'Test User'
        });

      expect(res.status).toBe(409);
    });
  });
});

describe('TOTP Service', () => {
  const totpService = require('../services/totp.service');

  describe('generateSecret', () => {
    it('should generate a 32-character secret', () => {
      const secret = totpService.generateSecret();
      expect(secret).toHaveLength(32);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });
  });

  describe('generateTOTP', () => {
    it('should generate a 6-digit code', () => {
      const secret = totpService.generateSecret();
      const code = totpService.generateTOTP(secret);
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });
  });

  describe('verifyTOTP', () => {
    it('should verify correct code', () => {
      const secret = totpService.generateSecret();
      const code = totpService.generateTOTP(secret);
      expect(totpService.verifyTOTP(code, secret)).toBe(true);
    });

    it('should reject incorrect code', () => {
      const secret = totpService.generateSecret();
      expect(totpService.verifyTOTP('000000', secret)).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes by default', () => {
      const codes = totpService.generateBackupCodes();
      expect(codes).toHaveLength(10);
      codes.forEach(code => {
        expect(/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)).toBe(true);
      });
    });
  });
});

describe('Cache Service', () => {
  const cacheService = require('../services/cache.service');

  describe('Memory cache fallback', () => {
    it('should set and get values', async () => {
      await cacheService.set('test-key', { value: 'test' }, 60);
      const result = await cacheService.get('test-key');
      expect(result).toEqual({ value: 'test' });
    });

    it('should delete values', async () => {
      await cacheService.set('delete-key', 'value', 60);
      await cacheService.del('delete-key');
      const result = await cacheService.get('delete-key');
      expect(result).toBeNull();
    });

    it('should increment counters', async () => {
      const key = 'counter-' + Date.now();
      const result1 = await cacheService.incr(key, 60);
      const result2 = await cacheService.incr(key, 60);
      expect(result1).toBe(1);
      expect(result2).toBe(2);
    });
  });
});

describe('Export Service', () => {
  const exportService = require('../services/export.service');

  describe('toCSV', () => {
    it('should convert data to CSV format', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];
      const csv = exportService.toCSV(data);
      expect(csv).toContain('name,age');
      expect(csv).toContain('John,30');
      expect(csv).toContain('Jane,25');
    });

    it('should escape commas and quotes', () => {
      const data = [{ text: 'Hello, "World"' }];
      const csv = exportService.toCSV(data);
      expect(csv).toContain('"Hello, ""World"""');
    });
  });

  describe('parseUserAgent', () => {
    it('should detect Windows', () => {
      const result = exportService.parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(result).toBe('Windows');
    });

    it('should detect macOS', () => {
      const result = exportService.parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)');
      expect(result).toBe('macOS');
    });

    it('should detect Android', () => {
      const result = exportService.parseUserAgent('Mozilla/5.0 (Linux; Android 12)');
      expect(result).toBe('Android');
    });
  });
});

describe('Monitoring Service', () => {
  const monitoring = require('../services/monitoring.service');

  describe('Health data', () => {
    it('should return health information', () => {
      const health = monitoring.getHealthData();
      expect(health).toHaveProperty('monitoring');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('memory');
    });
  });
});

describe('Auth Middleware', () => {
  const { authenticate } = require('../middleware/auth.middleware');

  it('should reject requests without token', async () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    await authenticate(req, res, next).catch(() => {});
    
    expect(next).not.toHaveBeenCalledWith();
  });
});
