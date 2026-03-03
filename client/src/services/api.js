/**
 * API Service
 * Handles all HTTP requests to the backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Get stored auth token
 */
const getToken = () => localStorage.getItem('ng-token');

/**
 * Set auth token
 */
const setToken = (token) => {
  if (token) {
    localStorage.setItem('ng-token', token);
  } else {
    localStorage.removeItem('ng-token');
  }
};

/**
 * Get stored user
 */
const getUser = () => {
  const user = localStorage.getItem('ng-user');
  return user ? JSON.parse(user) : null;
};

/**
 * Set user data
 */
const setUser = (user) => {
  if (user) {
    localStorage.setItem('ng-user', JSON.stringify(user));
  } else {
    localStorage.removeItem('ng-user');
  }
};

/**
 * Clear all auth data
 */
const clearAuth = () => {
  localStorage.removeItem('ng-token');
  localStorage.removeItem('ng-user');
};

/**
 * Base fetch wrapper with error handling
 */
const request = async (endpoint, options = {}) => {
  const token = getToken();

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        clearAuth();
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }

      throw {
        status: response.status,
        message: data.message || 'Une erreur est survenue',
        errors: data.errors || []
      };
    }

    return data;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    // Network error
    throw {
      status: 0,
      message: 'Erreur de connexion au serveur. Vérifiez votre connexion.',
      errors: []
    };
  }
};

/**
 * Auth API
 */
export const authApi = {
  /**
   * Register a new user
   */
  register: async ({ email, password, firstName, lastName }) => {
    const response = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName })
    });

    if (response.success && response.data) {
      setToken(response.data.token);
      setUser(response.data.user);
    }

    return response;
  },

  /**
   * Login user
   */
  login: async ({ email, password, remember = false }) => {
    const response = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember })
    });

    if (response.success && response.data) {
      setToken(response.data.token);
      setUser(response.data.user);
    }

    return response;
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore errors on logout
    } finally {
      clearAuth();
    }
  },

  /**
   * Request password reset
   */
  forgotPassword: async (email) => {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  /**
   * Reset password with token
   */
  resetPassword: async ({ token, password }) => {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
  },

  /**
   * Verify email
   */
  verifyEmail: async (token) => {
    return request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  /**
   * Get current user
   */
  me: async () => {
    return request('/auth/me');
  },

  /**
   * Refresh token
   */
  refresh: async () => {
    const response = await request('/auth/refresh', { method: 'POST' });

    if (response.success && response.data?.token) {
      setToken(response.data.token);
    }

    return response;
  },

  /**
   * Force change password (temp password users)
   */
  forceChangePassword: async (newPassword) => {
    return request('/auth/force-change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => !!getToken(),

  /**
   * Get current user from storage
   */
  getCurrentUser: getUser,

  /**
   * Clear authentication
   */
  clear: clearAuth
};

/**
 * OAuth API
 */
export const oauthApi = {
  /**
   * Get available OAuth providers
   */
  getProviders: () => request('/auth/oauth/providers'),

  /**
   * Get OAuth login URL
   */
  getLoginUrl: (provider) => `${API_URL}/auth/oauth/${provider}`,

  /**
   * Handle OAuth callback
   */
  handleCallback: (token, userData) => {
    if (token) {
      setToken(token);
    }
    if (userData) {
      setUser(typeof userData === 'string' ? JSON.parse(userData) : userData);
    }
  }
};

/**
 * Session API
 */
export const sessionApi = {
  /**
   * Get all active sessions
   */
  getAll: () => request('/sessions'),

  /**
   * Get login history
   */
  getHistory: ({ limit = 20, offset = 0 } = {}) =>
    request(`/sessions/history?limit=${limit}&offset=${offset}`),

  /**
   * Revoke a session
   */
  revoke: (sessionId) => request(`/sessions/${sessionId}`, { method: 'DELETE' }),

  /**
   * Revoke all other sessions
   */
  revokeAll: () => request('/sessions', { method: 'DELETE' })
};

/**
 * Profile API
 */
export const profileApi = {
  /**
   * Get profile
   */
  get: () => request('/profile'),

  /**
   * Update profile
   */
  update: (data) => request('/profile', {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),

  /**
   * Update avatar
   */
  updateAvatar: (avatarUrl) => request('/profile/avatar', {
    method: 'PATCH',
    body: JSON.stringify({ avatarUrl })
  }),

  /**
   * Delete avatar
   */
  deleteAvatar: () => request('/profile/avatar', { method: 'DELETE' }),

  /**
   * Change password
   */
  changePassword: ({ currentPassword, newPassword }) =>
    request('/profile/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  /**
   * Set password (for OAuth users)
   */
  setPassword: (password) => request('/profile/set-password', {
    method: 'POST',
    body: JSON.stringify({ password })
  }),

  /**
   * Change email
   */
  changeEmail: ({ newEmail, password }) => request('/profile/change-email', {
    method: 'POST',
    body: JSON.stringify({ newEmail, password })
  }),

  /**
   * Delete account
   */
  deleteAccount: ({ password, confirmation }) => request('/profile', {
    method: 'DELETE',
    body: JSON.stringify({ password, confirmation })
  })
};

/**
 * Export API
 */
export const exportApi = {
  /**
   * Export login history
   */
  loginHistory: (format = 'csv') => `${API_URL}/export/login-history/${format}`,

  /**
   * Export user data (GDPR)
   */
  myData: (format = 'json') => `${API_URL}/export/my-data/${format}`,

  /**
   * Download export with auth
   */
  download: async (url) => {
    const token = getToken();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response;
  }
};

/**
 * User API
 */
export const userApi = {
  /**
   * Get user profile
   */
  getProfile: () => request('/users/profile'),

  /**
   * Update user profile
   */
  updateProfile: (data) => request('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  /**
   * Change password
   */
  changePassword: ({ currentPassword, newPassword }) =>
    request('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  /**
   * Get login history
   */
  getLoginHistory: () => request('/users/login-history'),

  /**
   * Get active sessions
   */
  getSessions: () => request('/users/sessions'),

  /**
   * Revoke a session
   */
  revokeSession: (sessionId) => request(`/users/sessions/${sessionId}`, {
    method: 'DELETE'
  }),

  /**
   * Revoke all other sessions
   */
  revokeAllSessions: () => request('/users/sessions', {
    method: 'DELETE'
  })
};

/**
 * Dashboard API
 */
export const dashboardApi = {
  /**
   * Get dashboard stats
   */
  getStats: () => request('/dashboard/stats'),

  /**
   * Get chart data
   */
  getChartData: (period = '7d') => request(`/dashboard/chart?period=${period}`),

  /**
   * Get alerts
   */
  getAlerts: ({ limit = 10, unreadOnly = false } = {}) =>
    request(`/dashboard/alerts?limit=${limit}&unreadOnly=${unreadOnly}`),

  /**
   * Mark alert as read
   */
  markAlertRead: (alertId) => request(`/dashboard/alerts/${alertId}/read`, {
    method: 'PUT'
  }),

  /**
   * Mark all alerts as read
   */
  markAllAlertsRead: () => request('/dashboard/alerts/read-all', {
    method: 'PUT'
  }),

  /**
   * Get devices
   */
  getDevices: () => request('/dashboard/devices'),

  /**
   * Add device
   */
  addDevice: (device) => request('/dashboard/devices', {
    method: 'POST',
    body: JSON.stringify(device)
  }),

  /**
   * Update device
   */
  updateDevice: (deviceId, data) => request(`/dashboard/devices/${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  /**
   * Delete device
   */
  deleteDevice: (deviceId) => request(`/dashboard/devices/${deviceId}`, {
    method: 'DELETE'
  })
};

/**
 * Admin API (Admin only)
 */
export const adminApi = {
  /**
   * Get all users
   */
  getUsers: () => request('/admin/users'),

  /**
   * Get single user
   */
  getUser: (userId) => request(`/admin/users/${userId}`),

  /**
   * Update user
   */
  updateUser: (userId, data) => request(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  /**
   * Toggle user active status
   */
  toggleUserStatus: (userId, isActive) => request(`/admin/users/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ isActive })
  }),

  /**
   * Send password reset email
   */
  sendResetEmail: (userId) => request(`/admin/users/${userId}/reset-password-email`, {
    method: 'POST'
  }),

  /**
   * Generate temporary password
   */
  generateTempPassword: (userId) => request(`/admin/users/${userId}/temp-password`, {
    method: 'POST'
  }),

  /**
   * Delete user
   */
  deleteUser: (userId) => request(`/admin/users/${userId}`, {
    method: 'DELETE'
  })
};

/**
 * Network Tools API
 */
export const networkToolsApi = {
  ping: (target, count = 4) => request('/tools/ping', {
    method: 'POST',
    body: JSON.stringify({ target, count })
  }),
  traceroute: (target) => request('/tools/traceroute', {
    method: 'POST',
    body: JSON.stringify({ target })
  }),
  dnsLookup: (target, type = 'A') => request('/tools/dns', {
    method: 'POST',
    body: JSON.stringify({ target, type })
  }),
  whois: (target) => request('/tools/whois', {
    method: 'POST',
    body: JSON.stringify({ target })
  }),
  portScan: (target, ports) => request('/tools/portscan', {
    method: 'POST',
    body: JSON.stringify({ target, ports })
  }),
  nmapScan: (target, scanType = 'quick') => request('/tools/nmap', {
    method: 'POST',
    body: JSON.stringify({ target, scanType })
  })
};

/**
 * Health check
 */
export const healthCheck = () => request('/health');

export default {
  auth: authApi,
  oauth: oauthApi,
  session: sessionApi,
  profile: profileApi,
  export: exportApi,
  user: userApi,
  dashboard: dashboardApi,
  admin: adminApi,
  networkTools: networkToolsApi,
  healthCheck
};
