@echo off
REM ============================================================
REM install_agent.bat
REM Jalankan sebagai Administrator di PC karyawan
REM ============================================================

echo.
echo ============================================
echo   NetWatch Agent - Installer
echo ============================================
echo.

REM Cek apakah dijalankan sebagai Admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Harus dijalankan sebagai Administrator!
    echo Klik kanan file ini, pilih "Run as Administrator"
    pause
    exit /b 1
)

REM Buat folder instalasi
set INSTALL_DIR=C:\NetWatch
echo [1/5] Membuat folder %INSTALL_DIR%...
mkdir "%INSTALL_DIR%" 2>nul

REM Copy file agent
echo [2/5] Copy file agent...
copy /Y "netwatch_agent.exe" "%INSTALL_DIR%\netwatch_agent.exe"
if %errorLevel% neq 0 (
    echo [ERROR] Gagal copy file agent!
    pause
    exit /b 1
)

REM Daftarkan sebagai Windows Service
echo [3/5] Mendaftarkan Windows Service...
sc stop "NetWatchAgent" 2>nul
sc delete "NetWatchAgent" 2>nul
sc create "NetWatchAgent" ^
    binPath= "%INSTALL_DIR%\netwatch_agent.exe" ^
    DisplayName= "NetWatch Monitoring Agent" ^
    start= auto ^
    obj= LocalSystem
if %errorLevel% neq 0 (
    echo [ERROR] Gagal membuat service!
    pause
    exit /b 1
)

REM Set deskripsi service
sc description "NetWatchAgent" "NetWatch PC Monitoring Agent - Mengirim data performa ke server monitoring"

REM Start service
echo [4/5] Menjalankan service...
sc start "NetWatchAgent"
if %errorLevel% neq 0 (
    echo [WARNING] Service terdaftar tapi gagal start. Coba restart PC.
) else (
    echo [OK] Service berhasil dijalankan!
)

REM Verifikasi
echo [5/5] Verifikasi...
sc query "NetWatchAgent" | find "RUNNING"
if %errorLevel% == 0 (
    echo.
    echo ============================================
    echo   Instalasi BERHASIL!
    echo   Agent sedang berjalan di background
    echo ============================================
) else (
    echo.
    echo [WARNING] Service mungkin perlu restart PC untuk aktif
)

echo.
pause