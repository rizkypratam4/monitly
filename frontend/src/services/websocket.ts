// src/services/websocket.ts
// Koneksi WebSocket ke backend untuk update real-time
// Data dari agen dikirim setiap 10 detik via WebSocket

import { BASE_URL } from './api';

const WS_URL = BASE_URL.replace('http', 'ws') + '/ws';

export type WSEvent =
  | { type: 'connected'; clientId: string }
  | { type: 'metrics_update'; deviceId: string; data: any }
  | { type: 'new_alert'; alertType: string; severity: string; value: number; message: string; deviceId: string }
  | { type: 'alert_resolved'; alertType: string; deviceId: string }
  | { type: 'device_offline'; deviceId: string; hostname: string };

type WSListener = (event: WSEvent) => void;

class NetWatchWS {
  private ws: WebSocket | null = null;
  private listeners: Set<WSListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private reconnectDelay = 3000;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected ke backend');
        this.reconnectDelay = 3000; // reset delay
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WSEvent = JSON.parse(event.data);
          this.listeners.forEach(fn => fn(data));
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.warn('⚠️ WebSocket disconnected, reconnect dalam', this.reconnectDelay / 1000, 'detik');
        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000); // exponential backoff max 30s
            this.connect();
          }, this.reconnectDelay);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WS error:', err);
      };

    } catch (e) {
      console.error('WS connect failed:', e);
    }
  }

  // Subscribe ke device tertentu (halaman detail)
  subscribeDevice(deviceId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', deviceId }));
    }
  }

  // Tambah listener
  on(fn: WSListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn); // return unsubscribe fn
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton — satu koneksi untuk seluruh app
const wsClient = new NetWatchWS();
export default wsClient;