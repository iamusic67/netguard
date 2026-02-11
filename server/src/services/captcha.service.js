/**
 * reCAPTCHA Service
 * Handles Google reCAPTCHA verification
 */

const https = require('https');
const { logger } = require('../utils/logger');

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || '';
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Verify reCAPTCHA token
 * @param {string} token - reCAPTCHA token from client
 * @param {string} remoteIp - User's IP address
 * @returns {Promise<{success: boolean, score?: number, action?: string, errorCodes?: string[]}>}
 */
const verifyCaptcha = async (token, remoteIp = '') => {
  // Skip verification if no secret key is configured
  if (!RECAPTCHA_SECRET) {
    logger.warn('reCAPTCHA secret not configured, skipping verification');
    return { success: true, score: 1.0, skipped: true };
  }

  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  return new Promise((resolve) => {
    const postData = new URLSearchParams({
      secret: RECAPTCHA_SECRET,
      response: token,
      remoteip: remoteIp
    }).toString();

    const options = {
      hostname: 'www.google.com',
      port: 443,
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.success) {
            logger.info('reCAPTCHA verification successful', { score: result.score });
          } else {
            logger.warn('reCAPTCHA verification failed', { errorCodes: result['error-codes'] });
          }

          resolve({
            success: result.success,
            score: result.score,
            action: result.action,
            challengeTs: result.challenge_ts,
            hostname: result.hostname,
            errorCodes: result['error-codes']
          });
        } catch (error) {
          logger.error('reCAPTCHA parse error:', error);
          resolve({ success: false, errorCodes: ['json-parse-error'] });
        }
      });
    });

    req.on('error', (error) => {
      logger.error('reCAPTCHA request error:', error);
      resolve({ success: false, errorCodes: ['network-error'] });
    });

    req.write(postData);
    req.end();
  });
};

/**
 * Middleware to verify reCAPTCHA
 * @param {number} minScore - Minimum score required (0.0 to 1.0, default 0.5)
 * @returns {Function} Express middleware
 */
const captchaMiddleware = (minScore = 0.5) => {
  return async (req, res, next) => {
    const token = req.body.captchaToken || req.body.recaptchaToken || req.headers['x-captcha-token'];

    const result = await verifyCaptcha(token, req.ip);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Vérification CAPTCHA échouée. Veuillez réessayer.',
        errorCodes: result.errorCodes
      });
    }

    // For reCAPTCHA v3, check score
    if (result.score !== undefined && result.score < minScore) {
      logger.warn('reCAPTCHA score too low', { score: result.score, minScore });
      return res.status(400).json({
        success: false,
        message: 'Vérification CAPTCHA échouée. Score trop bas.'
      });
    }

    req.captchaResult = result;
    next();
  };
};

module.exports = {
  verifyCaptcha,
  captchaMiddleware
};
