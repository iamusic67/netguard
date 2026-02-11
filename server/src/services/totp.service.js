/**
 * TOTP (2FA) Service
 * Handles Two-Factor Authentication using TOTP
 */

const crypto = require('crypto');

// Base32 encoding/decoding
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random secret for TOTP
 * @param {number} length - Secret length (default 20 bytes = 32 base32 chars)
 * @returns {string} Base32 encoded secret
 */
const generateSecret = (length = 20) => {
  const buffer = crypto.randomBytes(length);
  let secret = '';
  
  for (let i = 0; i < buffer.length; i++) {
    secret += BASE32_CHARS[buffer[i] % 32];
  }
  
  return secret;
};

/**
 * Decode base32 string to buffer
 * @param {string} base32 - Base32 encoded string
 * @returns {Buffer}
 */
const base32Decode = (base32) => {
  const cleaned = base32.replace(/\s/g, '').toUpperCase();
  let bits = '';
  
  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  
  return Buffer.from(bytes);
};

/**
 * Generate TOTP code for a given time
 * @param {string} secret - Base32 encoded secret
 * @param {number} timeStep - Time step in seconds (default 30)
 * @param {number} digits - Number of digits (default 6)
 * @param {number} counter - Optional counter override
 * @returns {string} TOTP code
 */
const generateTOTP = (secret, timeStep = 30, digits = 6, counter = null) => {
  const time = counter !== null ? counter : Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = Buffer.alloc(8);
  
  // Write time as big-endian 64-bit integer
  for (let i = 7; i >= 0; i--) {
    timeBuffer[i] = time & 0xff;
    time = Math.floor(time / 256);
  }
  
  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const code = ((hash[offset] & 0x7f) << 24) |
               ((hash[offset + 1] & 0xff) << 16) |
               ((hash[offset + 2] & 0xff) << 8) |
               (hash[offset + 3] & 0xff);
  
  return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
};

/**
 * Verify TOTP code with time window tolerance
 * @param {string} token - User provided token
 * @param {string} secret - Base32 encoded secret
 * @param {number} window - Number of time steps to check before/after (default 1)
 * @returns {boolean}
 */
const verifyTOTP = (token, secret, window = 1) => {
  if (!token || !secret) return false;
  
  const timeStep = 30;
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);
  
  for (let i = -window; i <= window; i++) {
    const expectedToken = generateTOTP(secret, timeStep, 6, currentCounter + i);
    if (token === expectedToken) {
      return true;
    }
  }
  
  return false;
};

/**
 * Generate QR code URL for authenticator apps
 * @param {string} secret - Base32 encoded secret
 * @param {string} email - User email
 * @param {string} issuer - App name (default NetGUARD)
 * @returns {string} otpauth URL
 */
const generateQRCodeURL = (secret, email, issuer = 'NetGUARD') => {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
};

/**
 * Generate backup codes
 * @param {number} count - Number of codes to generate (default 10)
 * @returns {string[]} Array of backup codes
 */
const generateBackupCodes = (count = 10) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
};

/**
 * Hash backup code for storage
 * @param {string} code - Backup code
 * @returns {string} Hashed code
 */
const hashBackupCode = (code) => {
  return crypto.createHash('sha256').update(code.replace(/-/g, '')).digest('hex');
};

module.exports = {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateQRCodeURL,
  generateBackupCodes,
  hashBackupCode
};
