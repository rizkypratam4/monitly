# 🖥️ Monitly — PC & Network Monitoring System

> Pantau seluruh komputer karyawan dan jaringan secara real-time dari satu dashboard terpusat.

![Monitly](https://img.shields.io/badge/Monitly-v1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 📋 Daftar Isi

- [Fitur](#-fitur)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Struktur Folder](#-struktur-folder)
- [Prasyarat](#-prasyarat)
- [Instalasi Backend](#-instalasi-backend)
- [Instalasi Frontend](#-instalasi-frontend)
- [Setup Agen di PC Karyawan](#-setup-agen-di-pc-karyawan)
- [Alur Aplikasi](#-alur-aplikasi)
- [API Endpoints](#-api-endpoints)
- [WebSocket Events](#-websocket-events)
- [Konfigurasi Alert](#-konfigurasi-alert)
- [Deploy ke Jaringan](#-deploy-ke-jaringan)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Fitur

### Dashboard Utama
- 📡 Tampilkan semua PC yang terhubung ke jaringan secara real-time
- 🔴🟡🟢 Status PC: Online / Warning / Offline dengan indikator visual
- 📊 Ringkasan jaringan: total perangkat, avg CPU, total bandwidth, alert aktif
- 🔍 Filter dan pencarian by nama, IP, username, atau departemen
- ⚡ Update otomatis setiap 10 detik via WebSocket

### Halaman Detail PC
- **Overview** — CPU, RAM, Disk, Jaringan dengan grafik historis
- **Jaringan** — bandwidth realtime, ping, packet loss, koneksi aktif (TCP/UDP)
- **Proses** — daftar proses aktif seperti Task Manager (top 20 by CPU)
- **Logs** — riwayat alert, login, perubahan sistem

### Alert Engine
- 🚨 Deteksi otomatis threshold CPU, RAM, Disk, Ping, Packet Loss
- Notifikasi real-time ke dashboard via WebSocket
- Riwayat alert tersimpan di database
- Auto-resolve saat metrik kembali normal

### Keamanan
- 🔐 Autentikasi JWT (JSON Web Token)
- Session management (remember me / session only)
- Role-based access (admin / viewer)

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    PC Karyawan (N unit)                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │           netwatch_agent.py / .exe               │   │
│  │  Kumpulkan: CPU, RAM, Disk, Network, Proses      │   │
│  │  Kirim via HTTP POST setiap 10 detik             │   │
│  └──────────────────────┬───────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │ POST /api/metrics
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    backend/                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Monitly Backend (Node.js)             │  │
│  │                                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │  │
│  │  │ REST API  │  │ NeDB     │  │ Alert Engine   │  │  │
│  │  │ Express   │  │ Database │  │ (setiap 30s)   │  │  │
│  │  └──────────┘  └──────────┘  └────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │         WebSocket Server (ws://)             │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │ WebSocket + REST API
                          ▼
┌─────────────────────────────────────────────────────────┐
│               frontend/ (React + Vite)                   │
│                                                          │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Login   │  │  Dashboard   │  │   Detail PC      │   │
│  │  JWT     │  │  Grid PC     │  │   4 Tab View     │   │
│  └─────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Struktur Folder

```
Monitly/
│
├── backend/                          # Backend Node.js
│   ├── agent/
│   │   ├── netwatch_agent.py         # Agen Python (diinstall di PC karyawan)
│   │   ├── install_agent.bat         # Installer Windows Service
│   │   └── build_agent.sh            # Build .py → .exe via PyInstaller
│   ├── data/                         # Database files (auto-create saat pertama run)
│   ├── NetWatch-Deploy/              # Package siap deploy ke PC karyawan
│   ├── node_modules/
│   ├── scripts/
│   │   └── test_api.js               # Test semua endpoint API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js           # NeDB setup & collections
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.js               # Login / logout / session
│   │   │   ├── metrics.js            # Terima data dari agen
│   │   │   ├── devices.js            # CRUD perangkat
│   │   │   ├── alerts.js             # Manajemen alert
│   │   │   └── logs.js               # System logs
│   │   ├── services/
│   │   │   ├── wsManager.js          # WebSocket broadcast
│   │   │   └── alertEngine.js        # Threshold checker (30s)
│   │   └── server.js                 # Entry point
│   ├── .env                          # Konfigurasi environment
│   ├── package.json
│   └── package-lock.json
│
├── frontend/                         # Frontend React + Vite
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.tsx             # Halaman login
│   │   │   ├── Dashboard.tsx         # Grid semua PC
│   │   │   ├── PCDetail.tsx          # Detail satu PC (4 tab)
│   │   │   └── MiniChart.tsx         # Komponen grafik
│   │   ├── data/
│   │   │   └── mockData.ts           # Data dummy (dev only)
│   │   ├── services/
│   │   │   ├── api.ts                # Fungsi fetch ke backend + mappers
│   │   │   └── websocket.ts          # Singleton WebSocket client
│   │   ├── types.ts                  # TypeScript interfaces
│   │   ├── App.tsx                   # Root component + auth flow
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
│
├── ARCHITECTURE.md                   # Diagram teknis sistem
├── CONTRIBUTING.md                   # Panduan kontribusi
└── README.md                         # Dokumentasi utama
```

---

## ⚙️ Prasyarat

| Software | Versi Minimum | Kegunaan |
|----------|--------------|----------|
| Node.js | v18.0.0+ | Backend server |
| npm | v8.0.0+ | Package manager backend |
| Python | v3.10+ | Agen di PC karyawan |
| pip | terbaru | Install library Python |

---

## 🚀 Instalasi Backend

### 1. Clone repository

```bash
git clone https://github.com/username/monitly.git
cd monitly/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Konfigurasi environment

Buat file `.env` di folder `backend/`:

```env
PORT=8000
JWT_SECRET=ganti_dengan_string_random_panjang_minimal_32_karakter
```

> ⚠️ **Penting:** Ganti `JWT_SECRET` dengan string acak yang kuat sebelum deploy ke production.

### 4. Jalankan server

```bash
# Development (auto-restart saat file berubah)
npm run dev

# Production
npm start
```

### 5. Verifikasi

Buka browser ke `http://localhost:8000/health`, harus muncul:

```json
{ "status": "ok", "time": "2026-03-13T..." }
```

**Default login:** `admin` / `admin123`

> ⚠️ Segera ganti password default setelah pertama login!

---

## 🎨 Instalasi Frontend

### 1. Masuk ke folder frontend

```bash
cd monitly/frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Konfigurasi URL backend

Buka file `src/services/api.ts`, sesuaikan URL:

```typescript
// Ganti dengan IP server backend Anda
export const BASE_URL = 'http://localhost:8000';

// Contoh jika backend di komputer lain di jaringan:
// export const BASE_URL = 'http://10.4.1.5:8000';
```

### 4. Jalankan frontend

```bash
npm run dev
```

Buka browser ke `http://localhost:5173`

### 5. Jalankan keduanya sekaligus

Buka **2 terminal terpisah**:

```bash
# Terminal 1 — Backend
cd monitly/backend
npm run dev

# Terminal 2 — Frontend
cd monitly/frontend
npm run dev
```

### 6. Build untuk production

```bash
cd monitly/frontend
npm run build
# Output ada di folder dist/ — siap dihosting
```

---

## 🤖 Setup Agen di PC Karyawan

Agen adalah program kecil yang berjalan diam-diam di background setiap PC karyawan. Tugasnya mengumpulkan data sistem dan mengirimnya ke server setiap 10 detik.

### Langkah 1 — Install library Python (di PC developer)

```bash
pip install psutil requests pyinstaller
```

### Langkah 2 — Edit konfigurasi agen

Buka `backend/agent/netwatch_agent.py`, ubah baris berikut:

```python
SERVER_URL = "http://10.4.1.5:8000/api/metrics"  # ← IP server Monitly
DEPARTMENT = "Finance"                             # ← Departemen PC ini
INTERVAL   = 10                                    # ← Interval kirim (detik)
```

> Setiap departemen berbeda, pastikan `DEPARTMENT` diubah sesuai PC masing-masing.

### Langkah 3 — Test langsung (tanpa build)

```bash
cd backend/agent
python netwatch_agent.py
```

Kalau berhasil muncul:
```
🚀 Monitly Agent started
   Server : http://10.4.1.5:8000/api/metrics
   Interval: 10 detik
Static info loaded: PC-FINANCE-01 | 192.168.1.12 | ahmad
```

### Langkah 4 — Build jadi .exe (untuk distribusi)

```bash
cd backend/agent
pyinstaller --onefile --noconsole --name "monitly_agent" netwatch_agent.py
# Output: dist/monitly_agent.exe
```

### Langkah 5 — Deploy ke PC karyawan

**Cara A — Manual (1–5 PC):**
1. Copy `monitly_agent.exe` dan `install_agent.bat` ke PC karyawan
2. Klik kanan `install_agent.bat` → **Run as Administrator**

**Cara B — Share folder jaringan (6–20 PC):**

Share folder `NetWatch-Deploy` di PC server, lalu dari CMD Administrator di tiap PC karyawan:

```cmd
\\10.4.1.5\NetWatch-Deploy\install_agent.bat
```

**Cara C — Remote PowerShell (20+ PC, tanpa datang ke meja):**

```powershell
$pc   = "PC-FINANCE-01"
$cred = Get-Credential

Invoke-Command -ComputerName $pc -Credential $cred -ScriptBlock {
    New-Item -ItemType Directory -Force -Path "C:\Monitly"
    Copy-Item "\\10.4.1.5\NetWatch-Deploy\monitly_agent.exe" "C:\Monitly\"
    sc.exe create "MonitlyAgent" binPath= "C:\Monitly\monitly_agent.exe" start= auto
    sc.exe start "MonitlyAgent"
}
```

### Verifikasi agen berjalan

```cmd
# Cek status
sc query MonitlyAgent
# Harus muncul: STATE: RUNNING

# Uninstall
sc stop MonitlyAgent
sc delete MonitlyAgent
```

---

## 🔄 Alur Aplikasi

### Alur Login & Session

```
Buka Browser
      │
      ▼
Cek localStorage / sessionStorage
      │
      ├── Ada token ──────────────────► Langsung ke Dashboard
      │
      └── Tidak ada token
                │
                ▼
          Halaman Login
                │
                ▼
      Input username + password
                │
                ▼
      POST /api/auth/login
                │
                ├── Gagal ───► Tampilkan error
                │
                └── Berhasil
                          │
                          ├── Remember Me ──► localStorage (8 jam)
                          └── Tanpa RM ─────► sessionStorage
                                    │
                                    ▼
                               Dashboard
```

### Alur Data Real-time

```
PC Karyawan          Backend              Dashboard
     │                   │                    │
     │─ POST /metrics ──►│                    │
     │  (tiap 10 detik)  │── Simpan DB        │
     │                   │── Cek threshold    │
     │                   │── WS Broadcast ───►│── Update kartu PC
     │                   │                    │── Update grafik
     │              (tiap 30 detik)           │
     │                   │                    │
     │                   │── Alert Engine     │
     │                   │── Device offline? ►│── Tandai offline
     │                   │── Threshold? ─────►│── Tampilkan alert
```

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/auth/login` | Login, dapat JWT token |
| `GET` | `/api/auth/me` | Info user yang login |
| `POST` | `/api/auth/logout` | Logout |

**Request:**
```json
POST /api/auth/login
{ "username": "admin", "password": "admin123" }
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "username": "admin", "role": "admin" },
  "expiresIn": "8h"
}
```

---

### Devices

| Method | Endpoint | Deskripsi | Query Params |
|--------|----------|-----------|--------------|
| `GET` | `/api/devices` | Semua device + metrik terbaru | `status`, `search`, `department` |
| `GET` | `/api/devices/summary` | Ringkasan statistik jaringan | — |
| `GET` | `/api/devices/:id` | Detail satu device | — |
| `DELETE` | `/api/devices/:id` | Hapus device | — |

---

### Metrics

| Method | Endpoint | Deskripsi | Query Params |
|--------|----------|-----------|--------------|
| `POST` | `/api/metrics` | Agen kirim data (setiap 10s) | — |
| `GET` | `/api/metrics/:id` | Historis metrik | `range=1h\|6h\|24h\|7d` |
| `GET` | `/api/metrics/:id/latest` | Metrik terbaru + proses + koneksi | — |

**Contoh POST dari agen:**
```json
{
  "hostname": "PC-FINANCE-01",
  "ip": "192.168.1.12",
  "username": "Ahmad S.",
  "department": "Finance",
  "os": "Windows 10 Pro",
  "cpu": { "percent": 61 },
  "ram": { "percent": 72, "used_gb": 11.6, "total_gb": 16 },
  "disk": { "percent": 68 },
  "network": { "download_mbps": 29, "upload_mbps": 14, "ping_ms": 8, "packet_loss": 0.2 },
  "processes": [{ "pid": 1234, "name": "chrome.exe", "cpu_percent": 25.4, "ram_mb": 1240 }],
  "connections": [{ "protocol": "TCP", "local_addr": "192.168.1.12:443", "remote_addr": "104.18.2.1:443", "status": "ESTABLISHED" }]
}
```

---

### Alerts & Logs

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/alerts` | Semua alert aktif |
| `GET` | `/api/alerts/:deviceId` | Alert per device |
| `PUT` | `/api/alerts/:id/resolve` | Resolve alert |
| `GET` | `/api/logs` | Semua log sistem |
| `GET` | `/api/logs/:deviceId` | Log per device |

---

## 🔌 WebSocket Events

Koneksi ke `ws://SERVER:8000/ws`

### Server → Dashboard

```typescript
// Update metrik real-time
{ type: "metrics_update", deviceId: "PC-IT-03", data: { cpu_percent: 89, ... } }

// Alert baru
{ type: "new_alert", deviceId: "PC-IT-03", severity: "warning", message: "CPU usage tinggi: 89%" }

// Alert selesai
{ type: "alert_resolved", alertType: "cpu", deviceId: "PC-IT-03" }

// Device offline
{ type: "device_offline", deviceId: "PC-HR-02" }
```

### Dashboard → Server

```typescript
// Subscribe update device tertentu
{ type: "subscribe", deviceId: "PC-IT-03" }
```

---

## 🚨 Konfigurasi Alert

Edit di `backend/src/services/alertEngine.js`:

```javascript
const THRESHOLDS = {
  cpu:         { warning: 75,  critical: 90  },  // persen
  ram:         { warning: 80,  critical: 92  },  // persen
  disk:        { warning: 80,  critical: 95  },  // persen
  ping:        { warning: 100, critical: 500 },  // ms
  packet_loss: { warning: 1,   critical: 5   },  // persen
  offline_ms:  60000,                             // 60 detik
};
```

---

## 🌐 Deploy ke Jaringan

### 1. Buka port firewall di server (Windows)

```cmd
netsh advfirewall firewall add rule name="Monitly Backend" dir=in action=allow protocol=TCP localport=8000
```

### 2. Update BASE_URL di frontend

```typescript
// frontend/src/services/api.ts
export const BASE_URL = 'http://10.4.1.5:8000';
```

### 3. Update SERVER_URL di agen

```python
# backend/agent/netwatch_agent.py
SERVER_URL = "http://10.4.1.5:8000/api/metrics"
```

### 4. Verifikasi dari PC lain

```bash
curl http://10.4.1.5:8000/health
# {"status":"ok"}
```

---

## 🔧 Troubleshooting

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `Cannot find module 'nedb-promises'` | Dependencies belum install | `npm install` di folder `backend/` |
| `EADDRINUSE port 8000` | Port sudah dipakai | Ganti port di `.env` atau hentikan proses lain |
| Layar merah "Gagal terhubung" | Backend tidak running | Jalankan `npm run dev` di folder `backend/` |
| PC tidak muncul di dashboard | IP server salah di agen | Cek `SERVER_URL` di `netwatch_agent.py` |
| `UnicodeEncodeError` di agen | Windows CMD tidak support emoji | Sudah difix di versi terbaru dengan `encoding='utf-8'` |
| `sc query` — STOPPED | Service tidak start otomatis | Jalankan `sc start MonitlyAgent` |

---

## 🛠️ Tech Stack

### Backend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| Node.js + Express | v18+ | REST API server |
| NeDB Promises | v6+ | Embedded database |
| ws | v8+ | WebSocket server |
| jsonwebtoken | v9+ | JWT autentikasi |
| bcryptjs | v2+ | Hash password |

### Frontend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| React + TypeScript | v19 | UI framework |
| Vite | v6 | Build tool |
| Tailwind CSS | v4 | Styling |
| Recharts | v3 | Grafik metrik |
| Lucide React | v0.5+ | Icon |

### Agent
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| Python | 3.10+ | Runtime |
| psutil | latest | Baca metrik sistem |
| requests | latest | HTTP ke backend |
| PyInstaller | latest | Build .exe |

---

## 📄 License

MIT License — bebas digunakan dan dimodifikasi.

---

*Monitly v1.0.0 — PC & Network Monitoring System*