# 📐 Monitly — Arsitektur & Diagram

Diagram teknis sistem Monitly. Semua diagram menggunakan Mermaid dan render otomatis di GitHub.

---

## Arsitektur Sistem

```mermaid
graph TB
    subgraph PC["🖥️ PC Karyawan (N unit)"]
        AG[monitly_agent.exe<br/>Windows Service — berjalan di background]
    end

    subgraph BACKEND["📦 backend/"]
        API[REST API<br/>Express.js :8000]
        DB[(NeDB Database<br/>backend/data/)]
        AE[Alert Engine<br/>cek tiap 30 detik]
        WS[WebSocket Server<br/>ws://]

        API --> DB
        API --> WS
        DB --> AE
        AE --> WS
    end

    subgraph FRONTEND["🌐 frontend/"]
        LOGIN[Login.tsx<br/>JWT Auth]
        DASH[Dashboard.tsx<br/>Grid semua PC]
        DETAIL[PCDetail.tsx<br/>4 Tab View]
    end

    AG -->|POST /api/metrics tiap 10 detik| API
    WS -->|real-time events| FRONTEND
    FRONTEND -->|REST API calls| API
```

---

## Alur Login & Autentikasi

```mermaid
flowchart TD
    A([Buka Browser]) --> B{Cek token di\nlocalStorage /\nsessionStorage}

    B -->|Ada token| D[Dashboard]
    B -->|Tidak ada| C[Login.tsx]

    C --> E[Input username + password]
    E --> F[POST /api/auth/login]

    F --> G{Response?}
    G -->|401 Salah password| H[Tampilkan error merah]
    H --> E
    G -->|500 Server mati| I[Tampilkan error koneksi]
    I --> E

    G -->|200 Berhasil| J{Remember Me\ndicentang?}
    J -->|Ya| K[localStorage\nbertahan 8 jam]
    J -->|Tidak| L[sessionStorage\nhilang saat browser tutup]

    K --> D
    L --> D

    D --> M{Klik Logout}
    M --> N[Hapus token]
    N --> C
```

---

## Alur Data Real-time

```mermaid
sequenceDiagram
    participant AG as 🖥️ Agen PC
    participant API as 🔧 backend/src/routes/metrics.js
    participant DB as 🗄️ backend/data/
    participant AE as 🚨 alertEngine.js
    participant WS as 📡 wsManager.js
    participant UI as 🌐 Dashboard

    loop Setiap 10 detik
        AG->>API: POST /api/metrics {cpu, ram, disk, network, processes}
        API->>DB: Simpan metrik & upsert device
        API->>WS: broadcastAll metrics_update
        WS->>UI: Event: metrics_update
        UI->>UI: Update kartu PC + grafik
    end

    loop Setiap 30 detik
        AE->>DB: Baca metrik terbaru semua device
        AE->>AE: Bandingkan dengan THRESHOLDS

        alt CPU / RAM / Disk / Ping melewati threshold
            AE->>DB: Insert alert
            AE->>WS: broadcastToDevice new_alert
            WS->>UI: Tampilkan notifikasi warning/critical
        end

        alt Device tidak kirim data > 60 detik
            AE->>DB: Update status = offline
            AE->>WS: broadcastAll device_offline
            WS->>UI: Tandai kartu PC offline
        end

        alt Metrik kembali normal
            AE->>DB: Resolve alert
            AE->>WS: broadcastToDevice alert_resolved
            WS->>UI: Hapus indikator warning
        end
    end
```

---

## Alur Detail PC

```mermaid
flowchart TD
    A[Klik kartu PC di Dashboard] --> B[setSelectedPC]

    B --> C[Fetch 3 endpoint paralel]

    C --> D[GET /api/devices/:id]
    C --> E[GET /api/metrics/:id?range=1h]
    C --> F[GET /api/logs/:id]

    D --> G[Info device + alert aktif]
    E --> H[Historis untuk grafik Recharts]
    F --> I[50 log terbaru]

    G & H & I --> J[Render PCDetail.tsx]
    J --> K[Subscribe WebSocket device ini]

    J --> L{Pilih Tab}
    L -->|Overview| M[Metrik + Grafik\nInfo Sistem + Alert]
    L -->|Jaringan| N[Bandwidth + Ping\nKoneksi TCP/UDP]
    L -->|Proses| O[Top 20 proses\nby CPU usage]
    L -->|Logs| P[Riwayat event\n+ Export]
```

---

## Database Collections (NeDB)

```mermaid
erDiagram
    DEVICES {
        string hostname PK
        string ip
        string mac
        string username
        string department
        string os
        string cpu_model
        number ram_total
        string gpu
        string status
        number last_seen
    }

    METRICS {
        string _id PK
        string device_id FK
        number cpu_percent
        number ram_percent
        number disk_percent
        number net_download
        number net_upload
        number ping_ms
        number packet_loss
        number timestamp
    }

    PROCESSES {
        string _id PK
        string device_id FK
        number pid
        string name
        string username
        number cpu_percent
        number ram_mb
        number timestamp
    }

    ALERTS {
        string _id PK
        string device_id FK
        string type
        string severity
        string message
        number value
        number threshold
        boolean resolved
        number created_at
    }

    LOGS {
        string _id PK
        string device_id FK
        string level
        string category
        string message
        number timestamp
    }

    CONNECTIONS {
        string _id PK
        string device_id FK
        string protocol
        string local_addr
        string remote_addr
        string status
        number timestamp
    }

    USERS {
        string _id PK
        string username
        string password
        string role
        number created_at
    }

    DEVICES ||--o{ METRICS : "punya"
    DEVICES ||--o{ PROCESSES : "punya"
    DEVICES ||--o{ CONNECTIONS : "punya"
    DEVICES ||--o{ ALERTS : "punya"
    DEVICES ||--o{ LOGS : "punya"
```

---

## Komponen Frontend

```mermaid
graph TD
    APP[App.tsx\nAuth + State Management]

    APP -->|belum login| LOGIN[Login.tsx]
    APP -->|login, dashboard| DASH[Dashboard.tsx]
    APP -->|login, pilih PC| DETAIL[PCDetail.tsx]

    DETAIL --> T1[Tab Overview\nMetricCard + MiniChart.tsx]
    DETAIL --> T2[Tab Jaringan\nStats + Connections]
    DETAIL --> T3[Tab Proses\nProcess table]
    DETAIL --> T4[Tab Logs\nLog list + Export]

    subgraph SERVICES[frontend/src/services/]
        API[api.ts\nfetch wrapper + type mappers]
        WSC[websocket.ts\nsingleton WS client]
    end

    APP --> API
    APP --> WSC
```

---

## Flow Deploy Agen

```mermaid
flowchart TD
    A([Developer]) --> B[Edit SERVER_URL\ndi netwatch_agent.py]
    B --> C[pyinstaller --onefile --noconsole\nmonitly_agent.py]
    C --> D[dist/monitly_agent.exe]

    D --> E{Berapa PC?}

    E -->|1-5 PC| F[Copy manual\ninstall_agent.bat\nRun as Administrator]

    E -->|6-20 PC| G[Taruh di NetWatch-Deploy/\nShare folder jaringan]
    G --> H[CMD Admin di tiap PC:\n\\\\server\\NetWatch-Deploy\\install_agent.bat]

    E -->|20+ PC| I[PowerShell Remoting\nInvoke-Command]
    I --> J[Deploy otomatis\ntanpa datang ke meja]

    F & H & J --> K[sc create MonitlyAgent\nstart= auto]
    K --> L[Service aktif\nsaat PC dinyalakan]
    L --> M[PC muncul di Monitly\ndalam 10-15 detik]
```