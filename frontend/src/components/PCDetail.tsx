// components/PCDetail.tsx

import { useState } from 'react';
import type { PC, PCMetrics, Alert, Log, Process } from '../types';
import { ArrowLeft, Monitor, Bell,  HardDrive, Terminal, Settings, AlertTriangle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import MiniChart from './MiniChart';

interface PCDetailProps {
  pc: PC;
  metrics: PCMetrics;
  history: PCMetrics[];
  alerts: Alert[];
  logs: Log[];
  processes: Process[];
  onBack: () => void;
}

export default function PCDetail({ pc, metrics, history, alerts, logs, processes, onBack }: PCDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'network' | 'processes' | 'logs'>('overview');

  const isWarning = pc.status === 'warning';
  const isOffline = pc.status === 'offline';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            Dashboard
          </button>
          <span className="text-gray-600">/</span>
          <h1 className="text-xl font-bold text-white">{pc.hostname}</h1>
        </div>

        <div className="flex items-center gap-2 bg-[#1E1F23] p-1 rounded-lg border border-gray-800">
          {(['overview', 'network', 'processes', 'logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={twMerge(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                activeTab === tab
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              )}
            >
              {tab === 'network' ? 'Jaringan' : tab === 'processes' ? 'Proses' : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span>Update: 5 detik lalu</span>
          <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className={twMerge("p-4 rounded-xl", isWarning ? "bg-amber-500/20 text-amber-500" : isOffline ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500")}>
            <Monitor className="w-10 h-10" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white">{pc.hostname}</h2>
              {isWarning && <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-500 rounded-full">Warning</span>}
            </div>
            <p className="text-sm text-gray-400 mb-1">
              {pc.ip} · MAC: {pc.mac} · {pc.user}
            </p>
            <p className="text-sm text-gray-500">
              {pc.os} · {pc.cpuModel} · {pc.ramTotal}GB RAM · Uptime: {Math.floor(pc.uptime / 3600)}h {Math.floor((pc.uptime % 3600) / 60)}m
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors border border-gray-700">
            Remote
          </button>
          <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alert!
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard 
              title="CPU Usage" 
              value={`${Math.round(metrics.cpuUsage)}%`} 
              subtitle={`${pc.cpuModel} · 12 core · 3.6 GHz`}
              color="#f59e0b"
              data={history}
              dataKey="cpuUsage"
            />
            <MetricCard 
              title="RAM Usage" 
              value={`${Math.round(metrics.ramUsage)}%`} 
              subtitle={`${(metrics.ramUsage / 100 * pc.ramTotal).toFixed(1)} GB / ${pc.ramTotal} GB · Swap: 0%`}
              color="#f59e0b"
              data={history}
              dataKey="ramUsage"
            />
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Disk</div>
              <div className="text-4xl font-bold text-emerald-500 mb-6">{Math.round(metrics.diskUsage)}%</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">C: (SSD)</span>
                  <span className="text-gray-200">240 / 400 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">D: (HDD)</span>
                  <span className="text-gray-200">600 GB / 1 TB</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-800">
                  <span className="text-gray-400">Read / Write</span>
                  <span className="text-gray-200">{Math.round(metrics.diskRead)} / {Math.round(metrics.diskWrite)} MB/s</span>
                </div>
              </div>
            </div>
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Jaringan</div>
              <div className="text-3xl font-bold text-white mb-1">↓ {Math.round(metrics.bandwidthDown)} Mbps</div>
              <div className="text-lg text-gray-400 mb-6">↑ {Math.round(metrics.bandwidthUp)} Mbps</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Ping</span>
                  <span className="text-gray-200">{Math.round(metrics.ping)} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Packet loss</span>
                  <span className="text-gray-200">{metrics.packetLoss.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-800">
                  <span className="text-gray-400">IP Gateway</span>
                  <span className="text-gray-200 font-mono">192.168.1.1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
              <h3 className="font-bold text-lg text-white mb-4">Informasi Sistem</h3>
              <div className="space-y-3">
                <InfoRow label="Hostname" value={pc.hostname} />
                <InfoRow label="OS" value={pc.os} />
                <InfoRow label="CPU" value={pc.cpuModel} />
                <InfoRow label="RAM" value={`${pc.ramTotal} GB DDR5`} />
                <InfoRow label="GPU" value={pc.gpuModel} />
                <InfoRow label="Antivirus" value={pc.antivirus} valueColor="text-emerald-500" />
                <InfoRow label="Uptime" value={`${Math.floor(pc.uptime / 3600)}h ${Math.floor((pc.uptime % 3600) / 60)}m 14s`} />
                <InfoRow label="Departemen" value={pc.department} />
              </div>
            </div>
            
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
              <h3 className="font-bold text-lg text-white mb-4">Alert & Notifikasi</h3>
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id} className={twMerge("p-4 rounded-lg border", alert.type === 'warning' ? "bg-amber-500/10 border-amber-500/20" : alert.type === 'error' ? "bg-red-500/10 border-red-500/20" : "bg-gray-800 border-gray-700")}>
                    <div className="flex gap-3">
                      <AlertTriangle className={twMerge("w-5 h-5 shrink-0", alert.type === 'warning' ? "text-amber-500" : alert.type === 'error' ? "text-red-500" : "text-gray-400")} />
                      <div>
                        <div className={twMerge("font-medium", alert.type === 'warning' ? "text-amber-500" : alert.type === 'error' ? "text-red-500" : "text-gray-200")}>{alert.title}</div>
                        <div className="text-sm text-gray-400 mt-1">{alert.description} · {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                Lihat semua log <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'processes' && (
        <div className="bg-[#1E1F23] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800/50 text-gray-400 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">Nama Proses</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">CPU (%)</th>
                <th className="px-6 py-4 font-medium">RAM (MB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {processes.map(p => (
                <tr key={p.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 text-gray-200 font-medium">{p.name}</td>
                  <td className="px-6 py-4 text-gray-400">{p.user}</td>
                  <td className="px-6 py-4 text-amber-500">{p.cpu.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-emerald-500">{p.ram.toLocaleString()} MB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'network' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
            <h3 className="font-bold text-lg text-white mb-4">Statistik Jaringan</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg border border-gray-800">
                <div className="text-gray-400">Download</div>
                <div className="text-xl font-bold text-emerald-500">{metrics.bandwidthDown.toFixed(1)} Mbps</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg border border-gray-800">
                <div className="text-gray-400">Upload</div>
                <div className="text-xl font-bold text-blue-500">{metrics.bandwidthUp.toFixed(1)} Mbps</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg border border-gray-800">
                <div className="text-gray-400">Ping</div>
                <div className="text-xl font-bold text-gray-200">{metrics.ping.toFixed(1)} ms</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg border border-gray-800">
                <div className="text-gray-400">Packet Loss</div>
                <div className="text-xl font-bold text-amber-500">{metrics.packetLoss.toFixed(2)}%</div>
              </div>
            </div>
          </div>
          <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
            <h3 className="font-bold text-lg text-white mb-4">Koneksi Aktif</h3>
            <div className="space-y-3">
              {[
                { proto: 'TCP', local: '192.168.1.45:443', remote: '104.18.2.1:443', state: 'ESTABLISHED' },
                { proto: 'UDP', local: '192.168.1.45:53', remote: '8.8.8.8:53', state: 'ACTIVE' },
                { proto: 'TCP', local: '192.168.1.45:8080', remote: '0.0.0.0:0', state: 'LISTEN' },
                { proto: 'TCP', local: '192.168.1.45:3389', remote: '192.168.1.10:54321', state: 'ESTABLISHED' },
              ].map((conn, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800/50 last:border-0 text-sm">
                  <div>
                    <span className="text-blue-400 font-mono mr-2">{conn.proto}</span>
                    <span className="text-gray-300 font-mono">{conn.local}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400 font-mono">{conn.remote}</div>
                    <div className="text-xs text-emerald-500">{conn.state}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-[#1E1F23] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-gray-800/30 flex justify-between items-center">
            <h3 className="font-bold text-white">System Logs</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs rounded text-white transition-colors">Export</button>
              <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs rounded text-white transition-colors">Clear</button>
            </div>
          </div>
          <div className="divide-y divide-gray-800/50">
            {logs.map(log => (
              <div key={log.id} className="p-4 hover:bg-gray-800/30 transition-colors flex items-start gap-4">
                <div className={twMerge(
                  "p-2 rounded-lg shrink-0",
                  log.type === 'alert' ? "bg-red-500/20 text-red-500" :
                  log.type === 'software' ? "bg-blue-500/20 text-blue-500" :
                  log.type === 'login' ? "bg-emerald-500/20 text-emerald-500" :
                  "bg-gray-700 text-gray-300"
                )}>
                  {log.type === 'alert' ? <AlertTriangle className="w-4 h-4" /> :
                   log.type === 'software' ? <HardDrive className="w-4 h-4" /> :
                   log.type === 'login' ? <Terminal className="w-4 h-4" /> :
                   <Settings className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-gray-200 font-medium">{log.message}</span>
                    <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-400 capitalize">Type: {log.type}</div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="p-8 text-center text-gray-500">Tidak ada log tersedia.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle, color, data, dataKey }: { title: string, value: string, subtitle: string, color: string, data: any[], dataKey: string }) {
  return (
    <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6 flex flex-col">
      <div className="text-sm text-gray-400 mb-2">{title}</div>
      <div className="text-4xl font-bold mb-2" style={{ color }}>{value}</div>
      <MiniChart data={data} dataKey={dataKey} color={color} />
      <div className="text-xs text-gray-500 mt-auto pt-4">{subtitle}</div>
    </div>
  );
}

function InfoRow({ label, value, valueColor = "text-gray-200" }: { label: string, value: string, valueColor?: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-800/50 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className={twMerge("font-medium text-right", valueColor)}>{value}</span>
    </div>
  );
}