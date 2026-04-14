/**
 * WebSocket client for the GSPL Agent streaming interface.
 * Falls back to HTTP POST /api/agent/query when WebSocket is unavailable.
 */

const API_URL = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

function getWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const base = `${protocol}//${host}`;
  const token = sessionStorage.getItem('paradigm_jwt');
  return `${base}/ws/agent${token ? `?token=${token}` : ''}`;
}

export class AgentWebSocket {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.pending = [];
    this.onMessage = null;
    this.onConnect = null;
    this.onDisconnect = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(getWsUrl());
    } catch {
      this.connected = false;
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      if (this.onConnect) this.onConnect();
      // Flush any pending queries
      for (const q of this.pending) {
        this.ws.send(JSON.stringify({ query: q.query }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onMessage) this.onMessage(data);
        // Resolve pending promise if it's a result/error
        if ((data.type === 'result' || data.type === 'error') && this.pending.length > 0) {
          const p = this.pending.shift();
          if (p) p.resolve(data);
        }
      } catch {
        // Ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      if (this.onDisconnect) this.onDisconnect();
      // Reject any pending queries
      for (const p of this.pending) {
        p.resolve({ type: 'error', message: 'WebSocket disconnected' });
      }
      this.pending = [];
      // Auto-reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
      }
    };

    this.ws.onerror = () => {
      // Will trigger onclose
    };
  }

  send(query) {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        // Queue for when connected, or fail immediately if not connecting
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.pending.push({ query, resolve });
        } else {
          resolve({ type: 'error', message: 'WebSocket not connected' });
        }
        return;
      }
      this.pending.push({ query, resolve });
      this.ws.send(JSON.stringify({ query }));
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

// Singleton
let instance = null;

export function getAgentWs() {
  if (!instance) {
    instance = new AgentWebSocket();
  }
  return instance;
}
