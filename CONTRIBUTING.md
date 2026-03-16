# 🤝 Contributing Guide

Terima kasih sudah tertarik berkontribusi ke Monitly!

---

## Setup Development

```bash
# 1. Fork dan clone repository
git clone https://github.com/rizkypratam4/monitly.git
cd monitly

# 2. Setup backend
cd backend
npm install
cp .env.example .env   # edit sesuai kebutuhan
npm run dev

# 3. Setup frontend (terminal baru)
cd frontend
npm install
npm run dev
```

---

## Struktur Branch

| Branch | Kegunaan |
|--------|----------|
| `main` | Production-ready, stable |
| `dev` | Development aktif |
| `feature/xxx` | Fitur baru |
| `fix/xxx` | Bug fix |

---

## Format Commit

```bash
feat: tambah notifikasi Telegram untuk alert
fix: perbaiki WebSocket reconnect saat jaringan putus
docs: update README cara instalasi agen
refactor: pisahkan alert engine ke file terpisah
chore: update dependencies
```

---

## Pull Request Checklist

- [ ] Kode sudah ditest
- [ ] Tidak ada console.log yang tertinggal
- [ ] Dokumentasi diupdate jika ada perubahan API
- [ ] Deskripsi PR jelas menjelaskan perubahan

---

# 📋 Changelog

## v1.0.0 — 2026-03-13

### Added
- Dashboard utama dengan grid semua PC + filter + search
- Halaman detail PC dengan 4 tab (Overview, Jaringan, Proses, Logs)
- Grafik historis CPU & RAM menggunakan Recharts
- Agen Python (`netwatch_agent.py`) untuk PC karyawan Windows
- Alert Engine otomatis: CPU, RAM, Disk, Ping, Packet Loss, Offline
- WebSocket real-time update setiap 10 detik
- Autentikasi JWT dengan remember me / session management
- NeDB embedded database — zero install, file-based
- Windows Service installer (`install_agent.bat`)
- PowerShell remote deploy untuk banyak PC sekaligus
- Indikator koneksi Live / Polling di pojok dashboard
- Layar error jika backend tidak bisa diakses