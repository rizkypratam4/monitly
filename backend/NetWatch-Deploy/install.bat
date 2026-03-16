@echo off
echo ============================================
echo   NetWatch Agent - Auto Installer
echo ============================================

:: Cek admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Harus dijalankan sebagai Administrator!
    pause & exit /b 1
)

:: Install
mkdir "C:\NetWatch" 2>nul
copy /Y "netwatch_agent.exe" "C:\NetWatch\netwatch_agent.exe"

:: Daftar sebagai Windows Service
sc stop "NetWatchAgent" 2>nul
sc delete "NetWatchAgent" 2>nul
sc create "NetWatchAgent" binPath= "C:\NetWatch\netwatch_agent.exe" start= auto
sc description "NetWatchAgent" "NetWatch PC Monitoring Agent"
sc start "NetWatchAgent"

echo.
echo Instalasi selesai! Agent berjalan di background.
pause
```

---

## Step 3 — Cara Deploy ke PC Karyawan

### Cara A — Manual (1–5 PC)
1. Kopi folder `NetWatch-Deploy` ke PC karyawan via flashdisk atau share folder
2. Di PC karyawan, klik kanan `install.bat` → **Run as Administrator**
3. Selesai — agen langsung jalan

### Cara B — Share Folder Jaringan (6–20 PC)
Di komputer server, share folder `NetWatch-Deploy`:
```
Klik kanan folder → Properties → Sharing → Share → Everyone → Read