// data/mockData.ts

import type { PC, PCMetrics, Alert, Log, Process } from '../types';

export const initialPCs: PC[] = [
  {
    id: 'pc-finance-01',
    hostname: 'PC-FINANCE-01',
    ip: '192.168.1.12',
    mac: 'A4:C3:F0:11:22:33',
    user: 'Ahmad S.',
    department: 'Finance',
    status: 'online',
    os: 'Windows 10 Pro',
    cpuModel: 'Intel Core i5-10400',
    ramTotal: 16,
    gpuModel: 'Intel UHD Graphics 630',
    antivirus: 'Updated',
    uptime: 36000,
  },
  {
    id: 'pc-it-03',
    hostname: 'PC-IT-03',
    ip: '192.168.1.45',
    mac: 'A4:C3:F0:22:11:BE',
    user: 'Budi Rahardjo',
    department: 'IT Support',
    status: 'warning',
    os: 'Windows 11 Pro 23H2',
    cpuModel: 'Intel Core i7-12700',
    ramTotal: 32,
    gpuModel: 'NVIDIA RTX 3060',
    antivirus: 'Updated',
    uptime: 12134,
  },
  {
    id: 'pc-hr-02',
    hostname: 'PC-HR-02',
    ip: '192.168.1.77',
    mac: 'A4:C3:F0:44:55:66',
    user: 'Sari W.',
    department: 'HR',
    status: 'offline',
    os: 'Windows 10 Pro',
    cpuModel: 'Intel Core i3-10100',
    ramTotal: 8,
    gpuModel: 'Intel UHD Graphics 630',
    antivirus: 'Outdated',
    uptime: 0,
    lastOnline: Date.now() - 2 * 3600 * 1000, // 2 hours ago
    offlineDuration: 2 * 3600 + 14 * 60, // 2h 14m
  },
  {
    id: 'pc-dev-05',
    hostname: 'PC-DEV-05',
    ip: '192.168.1.21',
    mac: 'A4:C3:F0:77:88:99',
    user: 'Rina H.',
    department: 'Development',
    status: 'online',
    os: 'Ubuntu 22.04 LTS',
    cpuModel: 'AMD Ryzen 7 5800X',
    ramTotal: 32,
    gpuModel: 'NVIDIA RTX 3070',
    antivirus: 'N/A',
    uptime: 86400 * 2,
  },
  {
    id: 'pc-mgr-01',
    hostname: 'PC-MGR-01',
    ip: '192.168.1.5',
    mac: 'A4:C3:F0:AA:BB:CC',
    user: 'Dedi P.',
    department: 'Management',
    status: 'online',
    os: 'macOS Sonoma',
    cpuModel: 'Apple M2 Pro',
    ramTotal: 16,
    gpuModel: 'Apple M2 Pro GPU',
    antivirus: 'Updated',
    uptime: 86400 * 5,
  },
];

export const generateInitialMetrics = (pcs: PC[]): Record<string, PCMetrics> => {
  const metrics: Record<string, PCMetrics> = {};
  pcs.forEach((pc) => {
    metrics[pc.id] = {
      pcId: pc.id,
      cpuUsage: pc.status === 'offline' ? 0 : pc.status === 'warning' ? 85 + Math.random() * 10 : 10 + Math.random() * 40,
      ramUsage: pc.status === 'offline' ? 0 : pc.status === 'warning' ? 80 + Math.random() * 15 : 30 + Math.random() * 40,
      diskUsage: pc.status === 'offline' ? 0 : 40 + Math.random() * 30,
      diskRead: pc.status === 'offline' ? 0 : Math.random() * 150,
      diskWrite: pc.status === 'offline' ? 0 : Math.random() * 100,
      ping: pc.status === 'offline' ? 0 : 2 + Math.random() * 15,
      bandwidthDown: pc.status === 'offline' ? 0 : Math.random() * 50,
      bandwidthUp: pc.status === 'offline' ? 0 : Math.random() * 20,
      packetLoss: pc.status === 'offline' ? 0 : Math.random() * 0.5,
      timestamp: Date.now(),
    };
  });
  return metrics;
};

export const mockAlerts: Alert[] = [
  {
    id: 'a1',
    pcId: 'pc-it-03',
    type: 'warning',
    title: 'CPU tinggi berkelanjutan',
    description: 'CPU > 85% selama 14 menit',
    timestamp: Date.now() - 14 * 60 * 1000,
  },
  {
    id: 'a2',
    pcId: 'pc-it-03',
    type: 'warning',
    title: 'RAM mendekati batas',
    description: 'RAM > 80%',
    timestamp: Date.now() - 18 * 60 * 1000,
  },
  {
    id: 'a3',
    pcId: 'pc-it-03',
    type: 'info',
    title: 'Windows Update tersedia',
    description: '3 update pending',
    timestamp: Date.now() - 3 * 3600 * 1000,
  },
  {
    id: 'a4',
    pcId: 'pc-hr-02',
    type: 'error',
    title: 'Perangkat Offline',
    description: 'Tidak ada respon ping selama 2 jam',
    timestamp: Date.now() - 2 * 3600 * 1000,
  }
];

export const mockProcesses: Process[] = [
  { id: 'p1', name: 'chrome.exe', cpu: 25.4, ram: 1240, user: 'Budi Rahardjo' },
  { id: 'p2', name: 'docker.exe', cpu: 15.2, ram: 4096, user: 'SYSTEM' },
  { id: 'p3', name: 'vmmem', cpu: 12.0, ram: 8192, user: 'SYSTEM' },
  { id: 'p4', name: 'Code.exe', cpu: 8.5, ram: 850, user: 'Budi Rahardjo' },
  { id: 'p5', name: 'Teams.exe', cpu: 5.1, ram: 620, user: 'Budi Rahardjo' },
  { id: 'p6', name: 'MsMpEng.exe', cpu: 4.2, ram: 310, user: 'SYSTEM' },
  { id: 'p7', name: 'explorer.exe', cpu: 1.5, ram: 150, user: 'Budi Rahardjo' },
  { id: 'p8', name: 'Spotify.exe', cpu: 1.0, ram: 220, user: 'Budi Rahardjo' },
];

export const mockLogs: Log[] = [
  { id: 'l1', pcId: 'pc-it-03', type: 'alert', message: 'CPU usage exceeded 85%', timestamp: Date.now() - 14 * 60 * 1000 },
  { id: 'l2', pcId: 'pc-it-03', type: 'software', message: 'Installed Docker Desktop', timestamp: Date.now() - 24 * 3600 * 1000 },
  { id: 'l3', pcId: 'pc-it-03', type: 'login', message: 'User Budi Rahardjo logged in', timestamp: Date.now() - 3 * 3600 * 1000 },
  { id: 'l4', pcId: 'pc-it-03', type: 'system', message: 'System restarted', timestamp: Date.now() - 3 * 3600 * 1000 - 60000 },
];
