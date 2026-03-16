import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader, RefreshCw, Maximize2, Minimize2, Monitor } from 'lucide-react';
import { BASE_URL } from '../services/api';

interface Props {
  pc: { id: string; hostname: string; ip: string; user: string };
  onClose: () => void;
}

type Status = 'connecting' | 'connected' | 'error' | 'stopped';

export default function RemoteDesktop({ pc, onClose }: Props) {
  const [status, setStatus]     = useState<Status>('connecting');
  const [wsPort, setWsPort]     = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [vncPassword, setVncPassword] = useState('');
  const [showPassInput, setShowPassInput] = useState(false);
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const serverHost = BASE_URL
    .replace('http://', '')
    .replace('https://', '')
    .split(':')[0];

  // ── Start sesi remote ──────────────────────────────────────
  const startSession = useCallback(async () => {
    try {
      setStatus('connecting');
      setErrorMsg('');

      const res = await fetch(`${BASE_URL}/api/remote/start/${pc.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ vncPort: 5900 }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Gagal memulai sesi remote');
        setStatus('error');
        return;
      }

      setWsPort(data.wsPort);
      setStatus('connected');

    } catch (e) {
      setErrorMsg('Tidak bisa terhubung ke backend');
      setStatus('error');
    }
  }, [pc.id]);

  // ── Stop sesi remote ───────────────────────────────────────
  const stopSession = useCallback(async () => {
    try {
      await fetch(`${BASE_URL}/api/remote/stop/${pc.id}`, { method: 'POST' });
    } catch (_) {}
  }, [pc.id]);

  // Start saat komponen mount
  useEffect(() => {
    startSession();
    return () => { stopSession(); };
  }, []);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setFullscreen(!fullscreen);
  };

  // Handle close
  const handleClose = () => {
    stopSession();
    onClose();
  };

  // URL noVNC — pointer ke static files di backend/novnc/
  const novncUrl = wsPort
    ? `http://${serverHost}:${wsPort}/vnc.html?host=${serverHost}&port=${wsPort}&autoconnect=true&resize=scale&quality=6${vncPassword ? `&password=${vncPassword}` : ''}`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className="bg-[#1E1F23] border border-gray-700 rounded-xl flex flex-col overflow-hidden shadow-2xl"
        style={{ width: fullscreen ? '100vw' : '90vw', height: fullscreen ? '100vh' : '88vh' }}
      >

        {/* ── Topbar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700 bg-[#141518] shrink-0">
          <div className="flex items-center gap-3">
            {/* Status dot */}
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              status === 'connected'  ? 'bg-emerald-500 animate-pulse' :
              status === 'connecting' ? 'bg-amber-500  animate-pulse' :
              status === 'error'      ? 'bg-red-500' :
              'bg-gray-500'
            }`} />
            <Monitor className="w-4 h-4 text-gray-400" />
            <span className="text-white font-medium text-sm">{pc.hostname}</span>
            <span className="text-gray-500 text-xs hidden sm:block">{pc.ip} · {pc.user}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              status === 'connected'  ? 'bg-emerald-500/20 text-emerald-400' :
              status === 'connecting' ? 'bg-amber-500/20  text-amber-400'   :
              status === 'error'      ? 'bg-red-500/20    text-red-400'     :
              'bg-gray-700 text-gray-400'
            }`}>
              {status === 'connected'  ? 'Terhubung'    :
               status === 'connecting' ? 'Menghubungkan...' :
               status === 'error'      ? 'Error'        : 'Terputus'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {status === 'connected' && (
              <>
                <button
                  onClick={() => iframeRef.current?.contentWindow?.location.reload()}
                  title="Reload viewer"
                  className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  title="Fullscreen"
                  className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              title="Tutup"
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Content area ── */}
        <div className="flex-1 relative bg-black overflow-hidden">

          {/* Connecting */}
          {status === 'connecting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Loader className="w-10 h-10 text-blue-400 animate-spin" />
              <p className="text-gray-300 font-medium">Menghubungkan ke {pc.hostname}...</p>
              <p className="text-gray-500 text-sm">Memulai sesi remote desktop</p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-red-400 text-2xl">!</span>
              </div>
              <p className="text-white font-semibold text-lg">Gagal Terhubung</p>
              <p className="text-gray-400 text-sm text-center max-w-sm">
                {errorMsg || 'Tidak bisa terhubung ke PC karyawan'}
              </p>

              {/* Checklist kemungkinan penyebab */}
              <div className="bg-[#2A2B30] border border-gray-700 rounded-xl p-4 text-sm space-y-2 w-full max-w-sm">
                <p className="text-gray-400 font-medium mb-3">Pastikan:</p>
                <p className="text-gray-400">✓ TightVNC Server aktif di <span className="text-white font-mono">{pc.hostname}</span></p>
                <p className="text-gray-400">✓ PC karyawan menyala dan terhubung jaringan</p>
                <p className="text-gray-400">✓ websockify sudah terinstall di server</p>
                <p className="text-gray-400">✓ Port 5900 tidak diblokir firewall</p>
              </div>

              {/* Input password VNC */}
              <div className="w-full max-w-sm">
                <p className="text-gray-400 text-xs mb-2">Password VNC (jika diperlukan):</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={vncPassword}
                    onChange={(e) => setVncPassword(e.target.value)}
                    placeholder="Password TightVNC..."
                    className="flex-1 bg-[#2A2B30] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={startSession}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* noVNC iframe */}
          {status === 'connected' && novncUrl && (
            <iframe
              ref={iframeRef}
              src={novncUrl}
              className="w-full h-full border-0"
              title={`Remote — ${pc.hostname}`}
              allow="fullscreen"
            />
          )}

        </div>

        {/* ── Footer info ── */}
        {status === 'connected' && (
          <div className="px-4 py-2 border-t border-gray-800 bg-[#141518] flex items-center justify-between text-xs text-gray-500 shrink-0">
            <span>WebSocket port: {wsPort}</span>
            <span>{pc.ip}:5900 (TightVNC)</span>
            <span>Klik di dalam layar untuk mulai kontrol</span>
          </div>
        )}

      </div>
    </div>
  );
}