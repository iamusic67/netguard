/**
 * WebSocket Service
 * Handles real-time notifications and events
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.pendingMessages = [];
    this.pingInterval = null;
  }

  /**
   * Connect to WebSocket server
   * @param {string} token - JWT token
   */
  connect(token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL);
      this.token = token;

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.authenticate(token);
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[WS] Parse error:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code);
        this.isConnected = false;
        this.isAuthenticated = false;
        this.stopPing();
        
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.stopPing();
    this.isConnected = false;
    this.isAuthenticated = false;
  }

  /**
   * Authenticate with token
   */
  authenticate(token) {
    this.send({ type: 'auth', token });
  }

  /**
   * Send message to server
   * @param {object} data - Message data
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.pendingMessages.push(data);
    }
  }

  /**
   * Handle incoming message
   * @param {object} data - Message data
   */
  handleMessage(data) {
    switch (data.type) {
      case 'auth_success':
        this.isAuthenticated = true;
        this.emit('authenticated');
        this.flushPendingMessages();
        break;

      case 'auth_error':
        this.isAuthenticated = false;
        this.emit('auth_error', data.message);
        break;

      case 'notification':
        this.emit('notification', data.data);
        break;

      case 'broadcast':
        this.emit('broadcast', data);
        break;

      case 'pong':
        // Ping response received
        break;

      case 'subscribed':
        this.emit('subscribed', data.channel);
        break;

      default:
        this.emit(data.type, data);
    }
  }

  /**
   * Subscribe to a channel
   * @param {string} channel - Channel name
   */
  subscribe(channel) {
    this.send({ type: 'subscribe', channel });
  }

  /**
   * Unsubscribe from a channel
   * @param {string} channel - Channel name
   */
  unsubscribe(channel) {
    this.send({ type: 'unsubscribe', channel });
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[WS] Listener error:', error);
        }
      });
    }
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  /**
   * Start ping interval
   */
  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  /**
   * Stop ping interval
   */
  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Flush pending messages
   */
  flushPendingMessages() {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      this.send(message);
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Singleton instance
const wsService = new WebSocketService();

export default wsService;
export { wsService };
