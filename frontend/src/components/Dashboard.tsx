// components/Dashboard.tsx
import React, { useState } from "react";
import type { PC, PCMetrics, PCStatus } from "../types";
import { Search, Monitor } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface DashboardProps {
  pcs: PC[];
  metrics: Record<string, PCMetrics>;
  onSelectPC: (pc: PC) => void;
  totalAlerts: number;
}

export default function Dashboard({
  pcs,
  metrics,
  onSelectPC,
  totalAlerts,
}: DashboardProps) {
  const [filter, setFilter] = useState<"all" | PCStatus>("all");
  const [search, setSearch] = useState("");

  const filteredPCs = pcs.filter((pc) => {
    if (filter !== "all" && pc.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        pc.hostname.toLowerCase().includes(s) ||
        pc.ip.includes(s) ||
        pc.user.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const onlineCount = pcs.filter((p) => p.status === "online").length;
  const warningCount = pcs.filter((p) => p.status === "warning").length;
  const offlineCount = pcs.filter((p) => p.status === "offline").length;

  const totalRegistered = pcs.length;
  const onlinePercent =
    totalRegistered > 0 ? Math.round((onlineCount / totalRegistered) * 100) : 0;

  const totalBandwidth = Object.values(metrics).reduce(
    (acc, m) => acc + m.bandwidthDown + m.bandwidthUp,
    0,
  );
  const avgCpu =
    Object.values(metrics).reduce((acc, m) => acc + m.cpuUsage, 0) /
    (Object.keys(metrics).length || 1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-gray-100">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Monitly
          </h1>
          <p className="mt-1">
            {onlinePercent}%{" "}
            <span
              className={
                onlinePercent === 100
                  ? "text-emerald-500"
                  : onlinePercent >= 75
                    ? "text-amber-500"
                    : "text-red-500"
              }
            >
              {onlinePercent === 100
                ? "Online"
                : onlinePercent >= 75
                  ? "Sebagian Online"
                  : "Banyak Offline"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search PC, IP, User..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#2A2B30] border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-gray-200 w-64"
            />
          </div>

          <div className="flex bg-[#2A2B30] p-1 rounded-lg border border-gray-700">
            {(["all", "online", "warning", "offline"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={twMerge(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                  filter === f
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800",
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 ml-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {onlineCount} aktif
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              {warningCount} warning
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              {offlineCount} offline
            </div>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard title="Total Perangkat" value={pcs.length} />
        <SummaryCard
          title="Avg CPU Jaringan"
          value={`${avgCpu.toFixed(1)}%`}
          valueColor="text-amber-500"
        />
        <SummaryCard
          title="Total Bandwidth"
          value={`${(totalBandwidth / 1000).toFixed(1)} Gbps`}
        />
        <SummaryCard
          title="Alert Aktif"
          value={totalAlerts}
          valueColor="text-red-400"
        />
      </div>

      {/* PC Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPCs.map((pc) => (
          <PCCard
            key={pc.id}
            pc={pc}
            metrics={metrics[pc.id]}
            onClick={() => onSelectPC(pc)}
          />
        ))}
        {/* Placeholder for more devices */}
        <div className="border border-dashed border-gray-700 rounded-xl flex items-center justify-center p-6 text-gray-500 text-sm min-h-[200px]">
          +23 perangkat lainnya
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  valueColor = "text-white",
}: {
  title: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <div className="bg-[#1E1F23] border border-gray-800 rounded-xl p-4 flex flex-col justify-center">
      <div className="text-sm text-gray-400 font-medium mb-1">{title}</div>
      <div className={twMerge("text-3xl font-bold tracking-tight", valueColor)}>
        {value}
      </div>
    </div>
  );
}

const PCCard: React.FC<{
  pc: PC;
  metrics?: PCMetrics;
  onClick: () => void;
}> = ({ pc, metrics, onClick }) => {
  const isWarning = pc.status === "warning";
  const isOffline = pc.status === "offline";

  return (
    <div
      onClick={onClick}
      className={twMerge(
        "bg-[#1E1F23] rounded-xl p-5 cursor-pointer transition-all hover:bg-[#25262B] border",
        isWarning
          ? "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
          : "border-gray-800",
        isOffline ? "opacity-75" : "",
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-white">{pc.hostname}</h3>
          <div className="text-sm text-gray-400">
            {pc.ip} · {pc.user}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isWarning && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-500 rounded-full">
              Warning
            </span>
          )}
          {isOffline && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-500 rounded-full">
              Offline
            </span>
          )}
          {!isWarning && !isOffline && (
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          )}
        </div>
      </div>

      {isOffline ? (
        <div className="text-sm text-gray-400 space-y-1 mt-6">
          <p>Terakhir online: 2 jam lalu</p>
          <p>Durasi offline: 2j 14m</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <MetricBar
            label="CPU"
            value={metrics?.cpuUsage || 0}
            isWarning={(metrics?.cpuUsage || 0) > 80}
          />
          <MetricBar
            label="RAM"
            value={metrics?.ramUsage || 0}
            isWarning={(metrics?.ramUsage || 0) > 80}
          />
          <MetricBar
            label="Disk"
            value={metrics?.diskUsage || 0}
            isWarning={(metrics?.diskUsage || 0) > 90}
          />
          <MetricBar
            label="Ping"
            value={metrics?.ping || 0}
            suffix="ms"
            hideBar
          />
        </div>
      )}
    </div>
  );
};

function MetricBar({
  label,
  value,
  isWarning = false,
  suffix = "%",
  hideBar = false,
}: {
  label: string;
  value: number;
  isWarning?: boolean;
  suffix?: string;
  hideBar?: boolean;
}) {
  const colorClass = isWarning ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span
          className={twMerge(
            "font-medium",
            isWarning ? "text-amber-500" : "text-gray-200",
          )}
        >
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      {!hideBar && (
        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
          <div
            className={twMerge(
              "h-full rounded-full transition-all duration-500",
              colorClass,
            )}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
      )}
    </div>
  );
}
