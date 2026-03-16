#!/usr/bin/env python3
# ============================================================
# NetWatch Agent v1.0
# Diinstall di setiap PC karyawan sebagai Windows Service
# Kirim metrik ke server monitoring setiap 10 detik
# ============================================================

import psutil
import requests
import socket
import time
import json
import logging
import os
import subprocess
import platform
import sys
from datetime import datetime

# ── Konfigurasi ─────────────────────────────────────────────
SERVER_URL   = "http://10.4.1.11:8000/api/metrics"  # Ganti IP server
INTERVAL     = 10       # Kirim setiap 10 detik
DEPARTMENT   = "IT"     # Ganti sesuai departemen PC ini
LOG_FILE     = "netwatch_agent.log"
RETRY_DELAY  = 5        # Delay retry jika gagal kirim (detik)

# Setup logging — fix untuk Windows Service (no console)
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(
    sys.executable if getattr(sys, 'frozen', False) else __file__
)), 'netwatch_agent.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
    ]
)

log = logging.getLogger("NetWatchAgent")

# ── Cache info statis (tidak perlu ambil setiap 10 detik) ───
_static_info = None

def get_static_info():
    global _static_info
    if _static_info:
        return _static_info

    hostname = socket.gethostname()
    try:
        ip = socket.gethostbyname(hostname)
    except:
        ip = "0.0.0.0"

    # MAC address
    mac = "00:00:00:00:00:00"
    for iface, addrs in psutil.net_if_addrs().items():
        for addr in addrs:
            if addr.family == psutil.AF_LINK:
                mac = addr.address
                break

    # Username yang login
    try:
        users = psutil.users()
        username = users[0].name if users else os.getenv("USERNAME", "unknown")
    except:
        username = os.getenv("USERNAME", "unknown")

    # Info CPU
    cpu_model = "Unknown CPU"
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["wmic", "cpu", "get", "name"],
                capture_output=True, text=True
            )
            lines = [l.strip() for l in result.stdout.splitlines() if l.strip() and l.strip() != "Name"]
            if lines:
                cpu_model = lines[0]
        else:
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if "model name" in line:
                        cpu_model = line.split(":")[1].strip()
                        break
    except:
        pass

    # OS
    os_info = f"{platform.system()} {platform.release()}"
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["wmic", "os", "get", "Caption"],
                capture_output=True, text=True
            )
            lines = [l.strip() for l in result.stdout.splitlines() if l.strip() and l.strip() != "Caption"]
            if lines:
                os_info = lines[0]
    except:
        pass

    # GPU
    gpu = "Unknown GPU"
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["wmic", "path", "win32_VideoController", "get", "name"],
                capture_output=True, text=True
            )
            lines = [l.strip() for l in result.stdout.splitlines() if l.strip() and l.strip() != "Name"]
            if lines:
                gpu = lines[0]
    except:
        pass

    ram_total = round(psutil.virtual_memory().total / 1e9, 1)

    _static_info = {
        "hostname":   hostname,
        "ip":         ip,
        "mac":        mac,
        "username":   username,
        "department": DEPARTMENT,
        "os":         os_info,
        "cpu_model":  cpu_model,
        "ram_total":  ram_total,
        "gpu":        gpu,
    }

    log.info(f"Static info loaded: {hostname} | {ip} | {username}")
    return _static_info

# ── Ambil bandwidth (butuh 2 sample dengan jeda) ─────────────
_prev_net = None
_prev_net_time = None

def get_network_stats():
    global _prev_net, _prev_net_time

    current = psutil.net_io_counters()
    current_time = time.time()

    if _prev_net is None:
        _prev_net = current
        _prev_net_time = current_time
        return {"download_mbps": 0, "upload_mbps": 0, "ping_ms": None, "packet_loss": 0}

    elapsed = current_time - _prev_net_time
    if elapsed <= 0:
        elapsed = 1

    download_mbps = ((current.bytes_recv - _prev_net.bytes_recv) * 8) / elapsed / 1e6
    upload_mbps   = ((current.bytes_sent - _prev_net.bytes_sent) * 8) / elapsed / 1e6

    _prev_net = current
    _prev_net_time = current_time

    # Ping ke gateway
    ping_ms   = None
    pkt_loss  = 0
    try:
        gateway = psutil.net_if_stats()
        if platform.system() == "Windows":
            result = subprocess.run(
                ["ping", "-n", "3", "8.8.8.8"],
                capture_output=True, text=True, timeout=10
            )
            for line in result.stdout.splitlines():
                if "Average" in line or "rata" in line.lower():
                    parts = line.split("=")
                    if parts:
                        val = parts[-1].strip().replace("ms", "").strip()
                        ping_ms = float(val)
                if "Lost" in line or "Hilang" in line:
                    parts = line.split("(")
                    if len(parts) > 1:
                        pct = parts[1].split("%")[0]
                        pkt_loss = float(pct)
        else:
            result = subprocess.run(
                ["ping", "-c", "3", "8.8.8.8"],
                capture_output=True, text=True, timeout=10
            )
            for line in result.stdout.splitlines():
                if "avg" in line:
                    avg = line.split("/")[4]
                    ping_ms = float(avg)
                if "packet loss" in line:
                    pct = line.split("%")[0].split()[-1]
                    pkt_loss = float(pct)
    except:
        pass

    return {
        "download_mbps": round(max(0, download_mbps), 2),
        "upload_mbps":   round(max(0, upload_mbps), 2),
        "ping_ms":       ping_ms,
        "packet_loss":   pkt_loss,
    }

def get_processes():
    procs = []
    try:
        for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_info', 'status']):
            try:
                info = proc.info
                procs.append({
                    "pid":         info['pid'],
                    "name":        info['name'],
                    "username":    info.get('username', 'SYSTEM'),
                    "cpu_percent": round(info.get('cpu_percent') or 0, 1),
                    "ram_mb":      round((info['memory_info'].rss if info['memory_info'] else 0) / 1e6, 1),
                    "status":      info.get('status', 'unknown'),
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        # Sort by CPU usage
        procs.sort(key=lambda x: x['cpu_percent'], reverse=True)
    except:
        pass
    return procs[:20]

def get_connections():
    conns = []
    try:
        for conn in psutil.net_connections(kind='inet'):
            try:
                local  = f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else ""
                remote = f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else ""
                conns.append({
                    "protocol":   "TCP" if conn.type == socket.SOCK_STREAM else "UDP",
                    "local_addr":  local,
                    "remote_addr": remote,
                    "status":      conn.status or "NONE",
                })
            except:
                pass
    except:
        pass
    return conns[:30]

# ── Kumpulkan semua metrik ───────────────────────────────────
def collect_metrics():
    static = get_static_info()
    vm     = psutil.virtual_memory()
    disk   = psutil.disk_usage('C:\\' if platform.system() == 'Windows' else '/')

    try:
        disk_io  = psutil.disk_io_counters()
        read_mbps  = round(disk_io.read_bytes  / 1e6, 2) if disk_io else 0
        write_mbps = round(disk_io.write_bytes / 1e6, 2) if disk_io else 0
    except:
        read_mbps = write_mbps = 0

    network   = get_network_stats()
    processes = get_processes()
    connections = get_connections()

    return {
        **static,
        "cpu": {
            "percent": round(psutil.cpu_percent(interval=1), 1),
            "count":   psutil.cpu_count(),
        },
        "ram": {
            "percent": round(vm.percent, 1),
            "used_gb": round(vm.used / 1e9, 1),
            "total_gb": round(vm.total / 1e9, 1),
        },
        "disk": {
            "percent":    round(disk.percent, 1),
            "used_gb":    round(disk.used / 1e9, 1),
            "total_gb":   round(disk.total / 1e9, 1),
            "read_mbps":  read_mbps,
            "write_mbps": write_mbps,
        },
        "network": network,
        "processes": processes,
        "connections": connections,
        "timestamp": int(time.time()),
    }

# ── Kirim ke server ──────────────────────────────────────────
def send_metrics(data):
    try:
        response = requests.post(
            SERVER_URL,
            json=data,
            timeout=8,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            log.debug(f"✅ Data terkirim: CPU {data['cpu']['percent']}% RAM {data['ram']['percent']}%")
            return True
        else:
            log.warning(f"Server response {response.status_code}: {response.text[:100]}")
            return False
    except requests.exceptions.ConnectionError:
        log.error(f"❌ Tidak bisa terhubung ke server: {SERVER_URL}")
        return False
    except requests.exceptions.Timeout:
        log.error("❌ Timeout saat kirim data")
        return False
    except Exception as e:
        log.error(f"❌ Error: {e}")
        return False

# ── Main loop ────────────────────────────────────────────────
def main():
    log.info("=" * 50)
    log.info("🚀 NetWatch Agent started")
    log.info(f"   Server : {SERVER_URL}")
    log.info(f"   Interval: {INTERVAL} detik")
    log.info("=" * 50)

    # Inisialisasi info statis
    get_static_info()

    # Warm up network counter
    psutil.net_io_counters()
    time.sleep(1)

    consecutive_failures = 0

    while True:
        try:
            metrics = collect_metrics()
            success = send_metrics(metrics)

            if success:
                consecutive_failures = 0
            else:
                consecutive_failures += 1
                if consecutive_failures >= 5:
                    log.warning(f"⚠️  {consecutive_failures}x gagal kirim berturut-turut")

        except Exception as e:
            log.error(f"Unexpected error: {e}")

        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()