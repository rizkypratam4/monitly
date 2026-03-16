// components/PCDetail.tsx

import { useState } from "react";
import type { PC, PCMetrics, Alert, Log, Process } from "../types";
import {
  ArrowLeft,
  Monitor,
  Bell,
  HardDrive,
  Terminal,
  Settings,
  AlertTriangle,
  Activity,
  Wifi,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import MiniChart from "./MiniChart";
import RemoteDesktop from "./RemoteDesktop";

interface Connection {
  protocol: string;
  local_addr: string;
  remote_addr: string;
  status: string;
}

interface PCDetailProps {
  pc: PC;
  metrics: PCMetrics;
  history: PCMetrics[];
  alerts: Alert[];
  logs: Log[];
  processes: Process[];
  connections?: Connection[];
  onBack: () => void;
}

export default function PCDetail({
  pc,
  metrics,
  history,
  alerts,
  logs,
  processes,
  connections = [],
  onBack,
}: PCDetailProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "network" | "processes" | "logs" | "activity"
  >("overview");

  const isWarning = pc.status === "warning";
  const isOffline = pc.status === "offline";

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "network", label: "Jaringan" },
    { key: "processes", label: "Proses" },
    { key: "activity", label: "Aktivitas" },
    { key: "logs", label: "Logs" },
  ] as const;

  const [showRemote, setShowRemote] = useState(false);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Dashboard
          </button>
          <span className="text-gray-600">/</span>
          <h1 className="text-xl font-bold text-white">{pc.hostname}</h1>
        </div>

        <div className="flex items-center gap-2 bg-[#1E1F23] p-1 rounded-lg border border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={twMerge(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                activeTab === tab.key
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800",
              )}
            >
              {tab.label}
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
          <div
            className={twMerge(
              "p-4 rounded-xl",
              isWarning
                ? "bg-amber-500/20 text-amber-500"
                : isOffline
                  ? "bg-red-500/20 text-red-500"
                  : "bg-emerald-500/20 text-emerald-500",
            )}
          >
            <Monitor className="w-10 h-10" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white">{pc.hostname}</h2>
              {isWarning && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-500 rounded-full">
                  Warning
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-1">
              {pc.ip} · MAC: {pc.mac} · {pc.user}
            </p>
            <p className="text-sm text-gray-500">
              {pc.os} · {pc.cpuModel} · {pc.ramTotal}GB RAM · Uptime:{" "}
              {Math.floor(pc.uptime / 3600)}h{" "}
              {Math.floor((pc.uptime % 3600) / 60)}m
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRemote(true)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors border border-gray-700"
          >
            Remote
          </button>
          {showRemote && (
            <RemoteDesktop pc={pc} onClose={() => setShowRemote(false)} />
          )}
          <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alert!
          </button>
        </div>
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
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
              subtitle={`${((metrics.ramUsage / 100) * pc.ramTotal).toFixed(1)} GB / ${pc.ramTotal} GB · Swap: 0%`}
              color="#f59e0b"
              data={history}
              dataKey="ramUsage"
            />

            {/* Card Disk */}
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Disk</div>
              <div
                className={`text-4xl font-bold mb-6 ${
                  metrics.diskUsage >= 90
                    ? "text-red-500"
                    : metrics.diskUsage >= 80
                      ? "text-amber-500"
                      : "text-emerald-500"
                }`}
              >
                {Math.round(metrics.diskUsage)}%
              </div>
              <div className="space-y-3 text-sm">
                {metrics.diskPartitions && metrics.diskPartitions.length > 0 ? (
                  metrics.diskPartitions.map((p, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-400">
                        {p.name} ({p.type})
                      </span>
                      <span className="text-gray-200">
                        {p.used_gb} / {p.total_gb} GB
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Disk</span>
                    <span className="text-gray-200">-</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-800">
                  <span className="text-gray-400">Read / Write</span>
                  <span className="text-gray-200">
                    {Math.round(metrics.diskRead)} /{" "}
                    {Math.round(metrics.diskWrite)} MB/s
                  </span>
                </div>
              </div>
            </div>

            {/* Card Jaringan */}
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-2">Jaringan</div>
              <div className="text-3xl font-bold text-white mb-1">
                ↓ {Math.round(metrics.bandwidthDown)} Mbps
              </div>
              <div className="text-lg text-gray-400 mb-6">
                ↑ {Math.round(metrics.bandwidthUp)} Mbps
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Ping</span>
                  <span
                    className={
                      (metrics.ping || 0) >= 100
                        ? "text-red-400"
                        : (metrics.ping || 0) >= 50
                          ? "text-amber-400"
                          : "text-gray-200"
                    }
                  >
                    {Math.round(metrics.ping || 0)} ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Packet loss</span>
                  <span
                    className={
                      (metrics.packetLoss || 0) >= 5
                        ? "text-red-400"
                        : (metrics.packetLoss || 0) >= 1
                          ? "text-amber-400"
                          : "text-gray-200"
                    }
                  >
                    {(metrics.packetLoss || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-800">
                  <span className="text-gray-400">IP Gateway</span>
                  <span className="text-gray-200 font-mono">
                    {metrics.gateway || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
              <h3 className="font-bold text-lg text-white mb-4">
                Informasi Sistem
              </h3>
              <div className="space-y-3">
                <InfoRow label="Hostname" value={pc.hostname} />
                <InfoRow label="OS" value={pc.os} />
                <InfoRow label="CPU" value={pc.cpuModel} />
                <InfoRow label="RAM" value={`${pc.ramTotal} GB DDR5`} />
                <InfoRow label="GPU" value={pc.gpuModel} />
                <InfoRow
                  label="Antivirus"
                  value={pc.antivirus}
                  valueColor="text-emerald-500"
                />
                <InfoRow
                  label="Uptime"
                  value={`${Math.floor(pc.uptime / 3600)}h ${Math.floor((pc.uptime % 3600) / 60)}m`}
                />
                <InfoRow label="Departemen" value={pc.department} />
              </div>
            </div>

            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
              <h3 className="font-bold text-lg text-white mb-4">
                Alert & Notifikasi
              </h3>
              <div className="space-y-3">
                {alerts.length === 0 && (
                  <p className="text-gray-500 text-sm">
                    Tidak ada alert aktif.
                  </p>
                )}
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={twMerge(
                      "p-4 rounded-lg border",
                      alert.type === "warning"
                        ? "bg-amber-500/10 border-amber-500/20"
                        : alert.type === "error"
                          ? "bg-red-500/10 border-red-500/20"
                          : "bg-gray-800 border-gray-700",
                    )}
                  >
                    <div className="flex gap-3">
                      <AlertTriangle
                        className={twMerge(
                          "w-5 h-5 shrink-0",
                          alert.type === "warning"
                            ? "text-amber-500"
                            : alert.type === "error"
                              ? "text-red-500"
                              : "text-gray-400",
                        )}
                      />
                      <div>
                        <div
                          className={twMerge(
                            "font-medium",
                            alert.type === "warning"
                              ? "text-amber-500"
                              : alert.type === "error"
                                ? "text-red-500"
                                : "text-gray-200",
                          )}
                        >
                          {alert.title}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {alert.description} ·{" "}
                          {new Date(alert.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
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

      {/* ── Tab: Proses ── */}
      {activeTab === "processes" && (
        <div className="bg-[#1E1F23] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-gray-800/30 flex justify-between items-center">
            <h3 className="font-bold text-white">Proses Aktif</h3>
            <span className="text-xs text-gray-400">
              {processes.length} proses berjalan
            </span>
          </div>
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
              {processes.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4 text-gray-200 font-medium">
                    {p.name}
                  </td>
                  <td className="px-6 py-4 text-gray-400">{p.user}</td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        p.cpu > 50
                          ? "text-red-400"
                          : p.cpu > 20
                            ? "text-amber-500"
                            : "text-gray-300"
                      }
                    >
                      {p.cpu.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-emerald-500">
                    {p.ram.toLocaleString()} MB
                  </td>
                </tr>
              ))}
              {processes.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Tidak ada data proses.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab: Jaringan ── */}
      {activeTab === "network" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
            <h3 className="font-bold text-lg text-white mb-4">
              Statistik Jaringan
            </h3>
            <div className="space-y-4">
              {[
                {
                  label: "Download",
                  value: `${metrics.bandwidthDown.toFixed(1)} Mbps`,
                  color: "text-emerald-500",
                },
                {
                  label: "Upload",
                  value: `${metrics.bandwidthUp.toFixed(1)} Mbps`,
                  color: "text-blue-500",
                },
                {
                  label: "Ping",
                  value: `${metrics.ping.toFixed(1)} ms`,
                  color: "text-gray-200",
                },
                {
                  label: "Packet Loss",
                  value: `${metrics.packetLoss.toFixed(2)}%`,
                  color: "text-amber-500",
                },
                {
                  label: "IP Gateway",
                  value: metrics.gateway || "N/A",
                  color: "text-gray-200",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg border border-gray-800"
                >
                  <div className="text-gray-400">{item.label}</div>
                  <div className={`text-xl font-bold ${item.color}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
            <h3 className="font-bold text-lg text-white mb-4">Koneksi Aktif</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {connections.length > 0 ? (
                connections.map((conn, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 border-b border-gray-800/50 last:border-0 text-sm"
                  >
                    <div>
                      <span className="text-blue-400 font-mono mr-2">
                        {conn.protocol}
                      </span>
                      <span className="text-gray-300 font-mono">
                        {conn.local_addr}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 font-mono">
                        {conn.remote_addr || "—"}
                      </div>
                      <div
                        className={`text-xs ${
                          conn.status === "ESTABLISHED"
                            ? "text-emerald-500"
                            : conn.status === "LISTEN"
                              ? "text-blue-400"
                              : conn.status === "ACTIVE"
                                ? "text-amber-400"
                                : "text-gray-500"
                        }`}
                      >
                        {conn.status}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">
                  Tidak ada koneksi aktif.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Aktivitas ── */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          {/* Ringkasan aktivitas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">App Berjalan</div>
              <div className="text-2xl font-bold text-white">
                {processes.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">proses aktif</div>
            </div>
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">Koneksi Aktif</div>
              <div className="text-2xl font-bold text-blue-400">
                {connections.filter((c) => c.status === "ESTABLISHED").length}
              </div>
              <div className="text-xs text-gray-500 mt-1">established</div>
            </div>
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">App Teratas</div>
              <div className="text-lg font-bold text-amber-400 truncate">
                {processes.length > 0 ? processes[0].name : "-"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {processes.length > 0
                  ? `${processes[0].cpu.toFixed(1)}% CPU`
                  : ""}
              </div>
            </div>
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">Port Listening</div>
              <div className="text-2xl font-bold text-purple-400">
                {connections.filter((c) => c.status === "LISTEN").length}
              </div>
              <div className="text-xs text-gray-500 mt-1">port terbuka</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aplikasi yang sedang dipakai */}
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white">Aplikasi Aktif</h3>
                <span className="ml-auto text-xs text-gray-500">
                  by CPU usage
                </span>
              </div>
              <div className="space-y-3">
                {processes.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {/* Icon placeholder */}
                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-xs text-gray-400 font-mono">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-200 truncate">
                          {p.name}
                        </span>
                        <span
                          className={`text-xs ml-2 shrink-0 ${
                            p.cpu > 50
                              ? "text-red-400"
                              : p.cpu > 20
                                ? "text-amber-400"
                                : "text-gray-400"
                          }`}
                        >
                          {p.cpu.toFixed(1)}%
                        </span>
                      </div>
                      {/* CPU bar */}
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            p.cpu > 50
                              ? "bg-red-500"
                              : p.cpu > 20
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, p.cpu)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 shrink-0 w-16 text-right">
                      {p.ram >= 1000
                        ? `${(p.ram / 1024).toFixed(1)} GB`
                        : `${Math.round(p.ram)} MB`}
                    </div>
                  </div>
                ))}
                {processes.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Tidak ada data.
                  </p>
                )}
              </div>
            </div>

            {/* Koneksi keluar (apa yang diakses user) */}
            <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wifi className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white">Sedang Mengakses</h3>
                <span className="ml-auto text-xs text-gray-500">
                  koneksi keluar
                </span>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {connections
                  .filter(
                    (c) =>
                      c.status === "ESTABLISHED" &&
                      c.remote_addr &&
                      c.remote_addr !== "0.0.0.0:0",
                  )
                  .map((conn, i) => {
                    const port = conn.remote_addr?.split(":").pop();
                    const proto =
                      port === "443"
                        ? "HTTPS"
                        : port === "80"
                          ? "HTTP"
                          : port === "3389"
                            ? "RDP"
                            : port === "53"
                              ? "DNS"
                              : port === "22"
                                ? "SSH"
                                : port === "21"
                                  ? "FTP"
                                  : port === "25"
                                    ? "SMTP"
                                    : `Port ${port}`;

                    const protoColor =
                      proto === "HTTPS"
                        ? "text-emerald-400 bg-emerald-500/10"
                        : proto === "HTTP"
                          ? "text-blue-400 bg-blue-500/10"
                          : proto === "RDP"
                            ? "text-red-400 bg-red-500/10"
                            : proto === "SSH"
                              ? "text-purple-400 bg-purple-500/10"
                              : proto === "DNS"
                                ? "text-amber-400 bg-amber-500/10"
                                : "text-gray-400 bg-gray-700/50";

                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${protoColor}`}
                          >
                            {proto}
                          </span>
                          <span className="text-gray-300 font-mono text-xs truncate">
                            {conn.remote_addr}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0 ml-2">
                          {conn.protocol}
                        </span>
                      </div>
                    );
                  })}
                {connections.filter(
                  (c) =>
                    c.status === "ESTABLISHED" &&
                    c.remote_addr &&
                    c.remote_addr !== "0.0.0.0:0",
                ).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Tidak ada koneksi keluar aktif.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Port yang sedang dibuka / listen */}
          <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white">Port Terbuka (Listening)</h3>
              <span className="ml-auto text-xs text-gray-500">
                {connections.filter((c) => c.status === "LISTEN").length} port
                aktif
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {connections
                .filter((c) => c.status === "LISTEN")
                .map((conn, i) => {
                  const port = conn.local_addr?.split(":").pop();
                  return (
                    <span
                      key={i}
                      className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono rounded-lg"
                    >
                      {conn.protocol} :{port}
                    </span>
                  );
                })}
              {connections.filter((c) => c.status === "LISTEN").length ===
                0 && (
                <p className="text-gray-500 text-sm">
                  Tidak ada port listening.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Logs ── */}
      {activeTab === "logs" && (
        <div className="bg-[#1E1F23] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-gray-800/30 flex justify-between items-center">
            <h3 className="font-bold text-white">System Logs</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs rounded text-white transition-colors">
                Export
              </button>
              <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs rounded text-white transition-colors">
                Clear
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-800/50">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-gray-800/30 transition-colors flex items-start gap-4"
              >
                <div
                  className={twMerge(
                    "p-2 rounded-lg shrink-0",
                    log.type === "alert"
                      ? "bg-red-500/20 text-red-500"
                      : log.type === "software"
                        ? "bg-blue-500/20 text-blue-500"
                        : log.type === "login"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "bg-gray-700 text-gray-300",
                  )}
                >
                  {log.type === "alert" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : log.type === "software" ? (
                    <HardDrive className="w-4 h-4" />
                  ) : log.type === "login" ? (
                    <Terminal className="w-4 h-4" />
                  ) : (
                    <Settings className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-gray-200 font-medium">
                      {log.message}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 capitalize">
                    Type: {log.type}
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Tidak ada log tersedia.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  color,
  data,
  dataKey,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
  data: any[];
  dataKey: string;
}) {
  return (
    <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-6 flex flex-col">
      <div className="text-sm text-gray-400 mb-2">{title}</div>
      <div className="text-4xl font-bold mb-2" style={{ color }}>
        {value}
      </div>
      <MiniChart data={data} dataKey={dataKey} color={color} />
      <div className="text-xs text-gray-500 mt-auto pt-4">{subtitle}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueColor = "text-gray-200",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-800/50 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className={twMerge("font-medium text-right", valueColor)}>
        {value}
      </span>
    </div>
  );
}
