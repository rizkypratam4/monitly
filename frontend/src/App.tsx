// src/App.tsx — dengan Login + Session Management
import { useState, useEffect, useCallback, useRef } from 'react';
import type { PC, PCMetrics, Alert, Log, Process } from './types';
import Dashboard from './components/Dashboard';
import PCDetail from './components/PCDetail';
import Login from './components/Login';
import wsClient from './services/websocket';
import {
  fetchDevices, fetchSummary, fetchDeviceDetail,
  fetchMetricsHistory, fetchLogs,
  mapDeviceToPC, mapMetric, mapMetricRaw,
  mapAlert, mapLog, mapProcess,
} from './services/api';

interface AuthUser { username: string; role: string; }

interface DetailState {
  processes: Process[];
  connections: any[];
  alerts: Alert[];
  logs: Log[];
  loading: boolean;
}

function getStoredSession(): { token: string; user: AuthUser } | null {
  try {
    const token   = localStorage.getItem('netwatch_token')   || sessionStorage.getItem('netwatch_token');
    const userStr = localStorage.getItem('netwatch_user')    || sessionStorage.getItem('netwatch_user');
    if (token && userStr) return { token, user: JSON.parse(userStr) };
  } catch (_) {}
  return null;
}

export default function App() {
  const [token, setToken]           = useState<string | null>(null);
  const [user, setUser]             = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [pcs, setPcs]               = useState<PC[]>([]);
  const [metrics, setMetrics]       = useState<Record<string, PCMetrics>>({});
  const [history, setHistory]       = useState<Record<string, PCMetrics[]>>({});
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [selectedPC, setSelectedPC] = useState<PC | null>(null);
  const [detail, setDetail]         = useState<DetailState>({ processes: [], connections: [], alerts: [], logs: [], loading: false });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cek session saat pertama load
  useEffect(() => {
    const session = getStoredSession();
    if (session) { setToken(session.token); setUser(session.user); }
    setAuthChecked(true);
  }, []);

  const handleLogin = useCallback((newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
  }, []);

  const handleLogout = useCallback(() => {
    ['netwatch_token', 'netwatch_user'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    setToken(null); setUser(null); setSelectedPC(null);
    setPcs([]); setMetrics({});
    wsClient.disconnect();
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const [devicesRes, summaryRes] = await Promise.all([fetchDevices(), fetchSummary()]);
      const newPcs = devicesRes.devices.map(mapDeviceToPC);
      const newMetrics: Record<string, PCMetrics> = {};
      devicesRes.devices.forEach(d => { newMetrics[d.hostname] = mapMetric(d); });
      setPcs(newPcs); setMetrics(newMetrics);
      setTotalAlerts(summaryRes.activeAlerts); setError(null);
      setHistory(prev => {
        const next = { ...prev };
        newPcs.forEach(pc => { if (!next[pc.id]) next[pc.id] = []; });
        return next;
      });
    } catch (e) {
      setError('Tidak bisa terhubung ke backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (pc: PC) => {
    setDetail(prev => ({ ...prev, loading: true }));
    try {
      const [detailRes, histRes, logsRes] = await Promise.all([
        fetchDeviceDetail(pc.id),
        fetchMetricsHistory(pc.id, '1h'),
        fetchLogs({ deviceId: pc.id, limit: 50 }),
      ]);
      setHistory(prev => ({ ...prev, [pc.id]: histRes.metrics.map(m => mapMetricRaw(m, pc.id)) }));
      setDetail({ processes: detailRes.processes.map(mapProcess), connections: detailRes.connections, alerts: detailRes.alerts.map(mapAlert), logs: logsRes.logs.map(mapLog), loading: false });
      if (detailRes.latestMetric) setMetrics(prev => ({ ...prev, [pc.id]: mapMetricRaw(detailRes.latestMetric, pc.id) }));
    } catch (e) {
      setDetail(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const handleSelectPC = useCallback((pc: PC) => {
    setSelectedPC(pc); loadDetail(pc); wsClient.subscribeDevice(pc.id);
  }, [loadDetail]);

  // WebSocket
  useEffect(() => {
    if (!token) return;
    wsClient.connect();
    const unsub = wsClient.on((event) => {
      if (event.type === 'metrics_update') {
        const { deviceId, data } = event;
        const m: PCMetrics = { pcId: deviceId, cpuUsage: data.cpu_percent || 0, ramUsage: data.ram_percent || 0, diskUsage: data.disk_percent || 0, diskRead: 0, diskWrite: 0, ping: data.ping_ms || 0, bandwidthDown: data.net_download || 0, bandwidthUp: data.net_upload || 0, packetLoss: data.packet_loss || 0, timestamp: data.last_seen || Date.now() };
        setMetrics(prev => ({ ...prev, [deviceId]: m }));
        setHistory(prev => ({ ...prev, [deviceId]: [...(prev[deviceId] || []).slice(-59), m] }));
        setPcs(prev => {
          const exists = prev.find(p => p.id === deviceId);
          if (exists) return prev.map(p => p.id === deviceId ? { ...p, status: data.status || p.status } : p);
          return [...prev, { id: deviceId, hostname: data.hostname || deviceId, ip: data.ip || '', mac: '', user: data.username || '', department: data.department || '', status: 'online', os: data.os || '', cpuModel: '', ramTotal: 0, gpuModel: '', antivirus: 'Updated', uptime: 0 }];
        });
      }
      if (event.type === 'new_alert') {
        setTotalAlerts(prev => prev + 1);
        setPcs(prev => prev.map(p => p.id === event.deviceId ? { ...p, status: event.severity === 'critical' ? 'warning' : p.status } : p));
      }
      if (event.type === 'alert_resolved') setTotalAlerts(prev => Math.max(0, prev - 1));
      if (event.type === 'device_offline') setPcs(prev => prev.map(p => p.id === event.deviceId ? { ...p, status: 'offline', lastOnline: Date.now() } : p));
    });
    return () => { unsub(); };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadDashboard();
    pollRef.current = setInterval(() => { if (!wsClient.isConnected) loadDashboard(); }, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [token, loadDashboard]);

  // Belum cek session
  if (!authChecked) return (
    <div className="min-h-screen bg-[#141518] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Belum login
  if (!token) return <Login onLogin={handleLogin} />;

  // Loading
  if (loading) return (
    <div className="min-h-screen bg-[#141518] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Memuat data jaringan...</p>
      </div>
    </div>
  );

  // Error
  if (error && pcs.length === 0) return (
    <div className="min-h-screen bg-[#141518] flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400 text-xl">!</div>
        <h2 className="text-white font-semibold">Gagal terhubung ke backend</h2>
        <p className="text-gray-400 text-sm">{error}</p>
        <button onClick={() => { setLoading(true); loadDashboard(); }} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Coba Lagi</button>
        <button onClick={handleLogout} className="block mx-auto text-gray-500 text-sm hover:text-gray-300">Logout</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#141518] font-sans selection:bg-blue-500/30">
      {/* Topbar logout */}
      <div className="fixed top-3 right-4 z-50 flex items-center gap-3">
        <span className="text-xs text-gray-500 hidden sm:block">{user?.username} · {user?.role}</span>
        <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 transition-colors border border-gray-700 hover:border-red-500/50 rounded-lg px-3 py-1.5">Logout</button>
      </div>

      {/* WS indicator */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#1E1F23] border border-gray-700 rounded-full px-3 py-1.5 text-xs text-gray-400">
        <div className={`w-2 h-2 rounded-full ${wsClient.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        {wsClient.isConnected ? 'Live' : 'Polling'}
      </div>

      {selectedPC ? (
        <PCDetail pc={selectedPC} metrics={metrics[selectedPC.id]} history={history[selectedPC.id] || []} alerts={detail.alerts} logs={detail.logs} processes={detail.processes} onBack={() => setSelectedPC(null)} />
      ) : (
        <Dashboard pcs={pcs} metrics={metrics} onSelectPC={handleSelectPC} totalAlerts={totalAlerts} />
      )}
    </div>
  );
}