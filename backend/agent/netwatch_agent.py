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
        return {"download_mbps": 0, "upload_mbps": 0, "ping_ms": None, "packet_loss": 0, "gateway": "N/A"}

    elapsed = current_time - _prev_net_time
    if elapsed <= 0:
        elapsed = 1

    download_mbps = ((current.bytes_recv - _prev_net.bytes_recv) * 8) / elapsed / 1e6
    upload_mbps   = ((current.bytes_sent - _prev_net.bytes_sent) * 8) / elapsed / 1e6

    _prev_net = current
    _prev_net_time = current_time

    # Ping ke 8.8.8.8
    ping_ms  = None
    pkt_loss = 0
    try:
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
                        try:
                            ping_ms = float(val)
                        except:
                            pass
                if "Lost" in line or "Hilang" in line:
                    parts = line.split("(")
                    if len(parts) > 1:
                        try:
                            pct = parts[1].split("%")[0]
                            pkt_loss = float(pct)
                        except:
                            pass
        else:
            result = subprocess.run(
                ["ping", "-c", "3", "8.8.8.8"],
                capture_output=True, text=True, timeout=10
            )
            for line in result.stdout.splitlines():
                if "avg" in line:
                    try:
                        avg = line.split("/")[4]
                        ping_ms = float(avg)
                    except:
                        pass
                if "packet loss" in line:
                    try:
                        pct = line.split("%")[0].split()[-1]
                        pkt_loss = float(pct)
                    except:
                        pass
    except:
        pass

    # Gateway
    gateway = "N/A"
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["ipconfig"], capture_output=True, text=True, timeout=5
            )
            for line in result.stdout.splitlines():
                if "Default Gateway" in line or "Gateway Bawaan" in line:
                    parts = line.split(":")
                    if len(parts) > 1 and parts[1].strip() and parts[1].strip() != "":
                        gw = parts[1].strip()
                        if gw and gw != "":
                            gateway = gw
                            break
        else:
            result = subprocess.run(
                ["ip", "route"], capture_output=True, text=True, timeout=5
            )
            for line in result.stdout.splitlines():
                if line.startswith("default"):
                    parts = line.split()
                    if len(parts) >= 3:
                        gateway = parts[2]
                        break
    except:
        pass

    return {
        "download_mbps": round(max(0, download_mbps), 2),
        "upload_mbps":   round(max(0, upload_mbps), 2),
        "ping_ms":       ping_ms,
        "packet_loss":   pkt_loss,
        "gateway":       gateway,
    }

def get_disk_partitions():
    partitions = []
    try:
        for part in psutil.disk_partitions(all=False):
            # Skip yang bukan physical drive
            if not part.mountpoint:
                continue
            if platform.system() == "Windows":
                # Skip drive CD/DVD
                if part.fstype == "" or part.fstype == "UDF":
                    continue
            try:
                usage = psutil.disk_usage(part.mountpoint)
                # Deteksi SSD/HDD di Windows
                drive_type = "HDD"
                try:
                    if platform.system() == "Windows":
                        drive_letter = part.device.replace("\\", "").replace(":", "")
                        result = subprocess.run(
                            ["powershell", "-Command",
                             f"Get-PhysicalDisk | Where-Object {{$_.DeviceID -eq (Get-Partition -DriveLetter {drive_letter} -ErrorAction SilentlyContinue | Get-Disk -ErrorAction SilentlyContinue).Number}} | Select-Object -ExpandProperty MediaType"],
                            capture_output=True, text=True, timeout=5
                        )
                        media_type = result.stdout.strip()
                        if "SSD" in media_type:
                            drive_type = "SSD"
                        elif "NVMe" in media_type:
                            drive_type = "NVMe"
                except:
                    pass

                partitions.append({
                    "name":     part.device.replace("\\", "").rstrip(":") + ":",
                    "type":     drive_type,
                    "used_gb":  round(usage.used  / 1e9, 1),
                    "total_gb": round(usage.total / 1e9, 1),
                    "percent":  round(usage.percent, 1),
                })
            except (PermissionError, OSError):
                pass
    except:
        pass
    return partitions

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


def get_active_activity():
    activity = []
    try:
        # Ambil koneksi dengan info proses
        for conn in psutil.net_connections(kind='inet'):
            if conn.status != 'ESTABLISHED':
                continue
            if not conn.raddr:
                continue

            # Cari nama proses dari PID
            proc_name = "Unknown"
            try:
                if conn.pid:
                    proc = psutil.Process(conn.pid)
                    proc_name = proc.name()
            except:
                pass

            # Skip koneksi lokal
            remote_ip = conn.raddr.ip
            if remote_ip.startswith('127.') or remote_ip.startswith('::1'):
                continue

            activity.append({
                "process":     proc_name,
                "remote_ip":   remote_ip,
                "remote_port": conn.raddr.port,
                "protocol":    "HTTPS" if conn.raddr.port == 443
                               else "HTTP" if conn.raddr.port == 80
                               else "RDP"  if conn.raddr.port == 3389
                               else "DNS"  if conn.raddr.port == 53
                               else str(conn.raddr.port),
                "local_port":  conn.laddr.port if conn.laddr else 0,
            })
    except:
        pass
    return activity

# ── Kumpulkan semua metrik ───────────────────────────────────
def collect_metrics():
    static  = get_static_info()
    vm      = psutil.virtual_memory()
    network = get_network_stats()
    partitions = get_disk_partitions()

    try:
        main_disk = psutil.disk_usage('C:\\' if platform.system() == 'Windows' else '/')
        disk_percent = round(main_disk.percent, 1)
        disk_used    = round(main_disk.used  / 1e9, 1)
        disk_total   = round(main_disk.total / 1e9, 1)
    except:
        disk_percent = 0
        disk_used    = 0
        disk_total   = 0

    # Disk I/O
    try:
        disk_io    = psutil.disk_io_counters()
        read_mbps  = round(disk_io.read_bytes  / 1e6, 2) if disk_io else 0
        write_mbps = round(disk_io.write_bytes / 1e6, 2) if disk_io else 0
    except:
        read_mbps = write_mbps = 0

    processes   = get_processes()
    connections = get_connections()

    return {
        **static,
        "cpu": {
            "percent": round(psutil.cpu_percent(interval=1), 1),
            "count":   psutil.cpu_count(),
        },
        "ram": {
            "percent":  round(vm.percent, 1),
            "used_gb":  round(vm.used  / 1e9, 1),
            "total_gb": round(vm.total / 1e9, 1),
        },
        "disk": {
            "percent":    disk_percent,
            "used_gb":    disk_used,
            "total_gb":   disk_total,
            "read_mbps":  read_mbps,
            "write_mbps": write_mbps,
            "partitions": partitions,
        },
        "network": {
            "download_mbps": network["download_mbps"],
            "upload_mbps":   network["upload_mbps"],
            "ping_ms":       network["ping_ms"],
            "packet_loss":   network["packet_loss"],
            "gateway":       network["gateway"],
        },
        "processes":   processes,
        "connections": connections,
        "timestamp":   int(time.time()),
        "activity": get_active_activity(),
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