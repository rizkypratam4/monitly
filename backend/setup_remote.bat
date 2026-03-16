@echo off
REM ============================================================
REM setup_remote.bat
REM Jalankan SEKALI di PC server untuk setup fitur remote
REM ============================================================

echo.
echo ============================================
echo   Monitly Remote Desktop - Server Setup
echo ============================================
echo.

cd /d "%~dp0\.."

echo [1/3] Install websockify...
pip install websockify
if %errorLevel% neq 0 (
    echo GAGAL install websockify!
    echo Pastikan Python sudah terinstall: python --version
    pause & exit /b 1
)
echo       OK

echo [2/3] Download noVNC...
if not exist "novnc" (
    :: Download noVNC via git
    git clone https://github.com/novnc/noVNC.git novnc 2>nul
    if %errorLevel% neq 0 (
        :: Fallback: download zip
        echo Git tidak tersedia, coba download manual...
        echo Download noVNC dari: https://github.com/novnc/noVNC/archive/refs/heads/master.zip
        echo Extract dan rename folder jadi "novnc" di folder backend
        echo.
        pause
    ) else (
        echo       OK
    )
) else (
    echo       noVNC sudah ada, skip.
)

echo [3/3] Buka port firewall untuk websockify (6100-7000)...
netsh advfirewall firewall add rule name="Monitly Remote" dir=in action=allow protocol=TCP localport=6100-7000 >nul 2>&1
echo       OK

echo.
echo ============================================
echo   Setup selesai!
echo   Restart backend: npm run dev
echo ============================================
echo.
pause