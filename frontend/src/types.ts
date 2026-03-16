// types.ts
export type PCStatus = 'online' | 'warning' | 'offline';

export interface PC {
  id: string;
  hostname: string;
  ip: string;
  mac: string;
  user: string;
  department: string;
  status: PCStatus;
  os: string;
  cpuModel: string;
  ramTotal: number; // in GB
  gpuModel: string;
  antivirus: string;
  uptime: number; // in seconds
  lastOnline?: number; // timestamp
  offlineDuration?: number; // in seconds
}

export interface PCMetrics {
  pcId: string;
  cpuUsage: number; // 0-100
  ramUsage: number; // 0-100
  diskUsage: number; // 0-100
  diskRead: number; // MB/s
  diskWrite: number; // MB/s
  ping: number; // ms
  bandwidthDown: number; // Mbps
  bandwidthUp: number; // Mbps
  packetLoss: number; // 0-100
  timestamp: number;
}

export interface Alert {
  id: string;
  pcId: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  timestamp: number;
}

export interface Process {
  id: string;
  name: string;
  cpu: number;
  ram: number; // MB
  user: string;
}

export interface Log {
  id: string;
  pcId: string;
  type: 'alert' | 'login' | 'software' | 'system';
  message: string;
  timestamp: number;
}
