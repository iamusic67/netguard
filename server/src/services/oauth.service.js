/**
 * OAuth Service
 * Handles social login (Google, Microsoft, GitHub)
 */

const https = require('https');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

// OAuth Configuration
const OAUTH_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['email', 'profile']
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'email', 'profile']
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    emailUrl: 'https://api.github.com/user/emails',
    scopes: ['user:email']
  }
};

const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/callback';

/**
 * Generate OAuth state token for CSRF protection
 * @returns {string}
 */
const generateState = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Get OAuth authorization URL
 * @param {string} provider - OAuth provider (google, microsoft, github)
 * @param {string} state - CSRF state token
 * @returns {string|null}
 */
const getAuthorizationUrl = (provider, state) => {
  const config = OAUTH_CONFIG[provider];
  if (!config || !config.clientId) {
    logger.warn(`OAuth provider ${provider} not configured`);
    return null;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${REDIRECT_URI}/${provider}`,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state,
    access_type: 'offline',
    prompt: 'select_account'
  });

  return `${config.authUrl}?${params.toString()}`;
};

/**
 * Make HTTPS request
 * @param {string} url - Request URL
 * @param {object} options - Request options
 * @param {string} postData - POST data
 * @returns {Promise<object>}
 */
const httpsRequest = (url, options = {}, postData = null) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      port: 443,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Handle both JSON and form-urlencoded responses
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            resolve(JSON.parse(data));
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            resolve(Object.fromEntries(new URLSearchParams(data)));
          } else {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ raw: data });
            }
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

/**
 * Exchange authorization code for tokens
 * @param {string} provider - OAuth provider
 * @param {string} code - Authorization code
 * @returns {Promise<object>}
 */
const exchangeCodeForTokens = async (provider, code) => {
  const config = OAUTH_CONFIG[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: code,
    redirect_uri: `${REDIRECT_URI}/${provider}`,
    grant_type: 'authorization_code'
  });

  const response = await httpsRequest(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    }
  }, params.toString());

  if (response.error) {
    logger.error(`OAuth token exchange failed for ${provider}:`, response);
    throw new Error(response.error_description || response.error);
  }

  return response;
};

/**
 * Get user info from OAuth provider
 * @param {string} provider - OAuth provider
 * @param {string} accessToken - Access token
 * @returns {Promise<{email: string, name: string, avatar: string, providerId: string}>}
 */
const getUserInfo = async (provider, accessToken) => {
  const config = OAUTH_CONFIG[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const response = await httpsRequest(config.userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'NetGUARD'
    }
  });

  let userInfo;

  switch (provider) {
    case 'google':
      userInfo = {
        email: response.email,
        name: response.name,
        avatar: response.picture,
        providerId: response.id,
        verified: response.verified_email
      };
      break;

    case 'microsoft':
      userInfo = {
        email: response.mail || response.userPrincipalName,
        name: response.displayName,
        avatar: null, // Microsoft Graph requires separate call for photo
        providerId: response.id,
        verified: true
      };
      break;

    case 'github':
      // GitHub might not return email directly, need separate call
      let email = response.email;
      if (!email && config.emailUrl) {
        const emails = await httpsRequest(config.emailUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'NetGUARD'
          }
        });
        if (Array.isArray(emails)) {
          const primaryEmail = emails.find(e => e.primary) || emails[0];
          email = primaryEmail?.email;
        }
      }
      userInfo = {
        email: email,
        name: response.name || response.login,
        avatar: response.avatar_url,
        providerId: response.id.toString(),
        verified: true
      };
      break;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  return userInfo;
};

/**
 * Get available OAuth providers
 * @returns {string[]}
 */
const getAvailableProviders = () => {
  return Object.entries(OAUTH_CONFIG)
    .filter(([_, config]) => config.clientId && config.clientSecret)
    .map(([provider]) => provider);
};

module.exports = {
  generateState,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getUserInfo,
  getAvailableProviders,
  OAUTH_CONFIG
};
