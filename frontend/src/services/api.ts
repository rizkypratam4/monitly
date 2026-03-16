export const BASE_URL = 'http://localhost:8000';
async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error ${res.status}: ${path}`);
  return res.json();
}

export interface DeviceRaw {
  _id: string;
  hostname: string;
  ip: string;
  mac: string;
  username: string;
  department: string;
  os: string;
  cpu_model: string;
  ram_total: number;
  gpu: string;
  status: 'online' | 'warning' | 'offline' | 'critical';
  last_seen: number;
  created_at: number;
  // metrik terbaru (di-join dari metrics)
  cpu_percent?: number;
  ram_percent?: number;
  disk_percent?: number;
  net_download?: number;
  net_upload?: number;
  ping_ms?: number;
  packet_loss?: number;
  alert_count?: number;
}

export interface MetricRaw {
  _id: string;
  device_id: string;
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  disk_percent: number;
  disk_read: number;
  disk_write: number;
  net_download: number;
  net_upload: number;
  ping_ms: number;
  packet_loss: number;
  timestamp: number;
}

export interface ProcessRaw {
  pid: number;
  name: string;
  username: string;
  cpu_percent: number;
  ram_mb: number;
  status: string;
}

export interface ConnectionRaw {
  protocol: string;
  local_addr: string;
  remote_addr: string;
  status: string;
}

export interface AlertRaw {
  _id: string;
  device_id: string;
  type: string;
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  resolved: boolean;
  created_at: number;
}

export interface LogRaw {
  _id: string;
  device_id: string;
  level: 'info' | 'warning' | 'error';
  category: string;
  message: string;
  timestamp: number;
}

export interface SummaryRaw {
  total: number;
  online: number;
  warning: number;
  offline: number;
  activeAlerts: number;
  avgCpu: number;
  totalDownload: number;
  totalUpload: number;
}

export interface DeviceDetailRaw {
  device: DeviceRaw;
  latestMetric: MetricRaw;
  processes: ProcessRaw[];
  connections: ConnectionRaw[];
  alerts: AlertRaw[];
}

// ── API Calls ────────────────────────────────────────────────

// Ambil semua device + metrik terbaru
export const fetchDevices = (params?: { status?: string; search?: string }) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return fetchAPI<{ count: number; devices: DeviceRaw[] }>(`/api/devices${query ? '?' + query : ''}`);
};

// Ambil ringkasan jaringan (untuk summary bar)
export const fetchSummary = () =>
  fetchAPI<SummaryRaw>('/api/devices/summary');

// Ambil detail satu device
export const fetchDeviceDetail = (hostname: string) =>
  fetchAPI<DeviceDetailRaw>(`/api/devices/${hostname}`);

// Ambil metrik historis untuk grafik
export const fetchMetricsHistory = (hostname: string, range: '1h' | '6h' | '24h' | '7d' = '1h') =>
  fetchAPI<{ metrics: MetricRaw[] }>(`/api/metrics/${hostname}?range=${range}`);

// Ambil metrik terbaru satu device
export const fetchLatestMetric = (hostname: string) =>
  fetchAPI<MetricRaw & { processes: ProcessRaw[]; connections: ConnectionRaw[] }>(
    `/api/metrics/${hostname}/latest`
  );

// Ambil alert (aktif atau semua)
export const fetchAlerts = (params?: { deviceId?: string; resolved?: boolean }) => {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params || {}).map(([k, v]) => [k, String(v)]))
  ).toString();
  return fetchAPI<{ count: number; alerts: AlertRaw[] }>(`/api/alerts${query ? '?' + query : ''}`);
};

// Resolve alert
export const resolveAlert = (alertId: string) =>
  fetchAPI(`/api/alerts/${alertId}/resolve`, { method: 'PUT' });

// Ambil logs
export const fetchLogs = (params?: { deviceId?: string; level?: string; limit?: number }) => {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params || {}).map(([k, v]) => [k, String(v)]))
  ).toString();
  return fetchAPI<{ count: number; logs: LogRaw[] }>(`/api/logs${query ? '?' + query : ''}`);
};

// ── Mapper: convert backend format → frontend types ──────────
import type { PC, PCMetrics, Alert, Log, Process } from '../types';

export function mapDeviceToPC(d: DeviceRaw): PC {
  return {
    id: d.hostname,
    hostname: d.hostname,
    ip: d.ip || '',
    mac: d.mac || '',
    user: d.username || '',
    department: d.department || '',
    status: (d.status === 'critical' ? 'warning' : d.status) as PC['status'],
    os: d.os || '',
    cpuModel: d.cpu_model || '',
    ramTotal: d.ram_total || 0,
    gpuModel: d.gpu || '',
    antivirus: 'Updated',
    uptime: d.last_seen ? Math.floor((Date.now() - d.last_seen) / 1000) : 0,
    lastOnline: d.last_seen,
  };
}

export function mapMetric(d: DeviceRaw): PCMetrics {
  return {
    pcId: d.hostname,
    cpuUsage: d.cpu_percent || 0,
    ramUsage: d.ram_percent || 0,
    diskUsage: d.disk_percent || 0,
    diskRead: 0,
    diskWrite: 0,
    ping: d.ping_ms || 0,
    bandwidthDown: d.net_download || 0,
    bandwidthUp: d.net_upload || 0,
    packetLoss: d.packet_loss || 0,
    timestamp: d.last_seen || Date.now(),
  };
}

export function mapMetricRaw(m: MetricRaw, hostname: string): PCMetrics {
  return {
    pcId: hostname,
    cpuUsage: m.cpu_percent || 0,
    ramUsage: m.ram_percent || 0,
    diskUsage: m.disk_percent || 0,
    diskRead: m.disk_read || 0,
    diskWrite: m.disk_write || 0,
    ping: m.ping_ms || 0,
    bandwidthDown: m.net_download || 0,
    bandwidthUp: m.net_upload || 0,
    packetLoss: m.packet_loss || 0,
    timestamp: m.timestamp || Date.now(),
  };
}

export function mapAlert(a: AlertRaw): Alert {
  return {
    id: a._id,
    pcId: a.device_id,
    type: a.severity === 'critical' ? 'error' : 'warning',
    title: a.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: a.message,
    timestamp: a.created_at,
  };
}

export function mapLog(l: LogRaw): Log {
  return {
    id: l._id,
    pcId: l.device_id || '',
    type: l.category as Log['type'] || 'system',
    message: l.message,
    timestamp: l.timestamp,
  };
}

export function mapProcess(p: ProcessRaw, idx: number): Process {
  return {
    id: String(p.pid || idx),
    name: p.name,
    cpu: p.cpu_percent,
    ram: p.ram_mb,
    user: p.username,
  };
}