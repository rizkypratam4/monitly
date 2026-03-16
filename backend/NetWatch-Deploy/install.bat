@echo off
title Monitly Agent - Installer
color 0A

echo.
echo  ============================================
echo    Monitly Agent Installer v1.0
echo  ============================================
echo.

:: Cek Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [!] Harus dijalankan sebagai Administrator!
    echo      Klik kanan file ini, pilih Run as Administrator
    echo.
    pause & exit /b 1
)

echo  [1/4] Mempersiapkan instalasi...
:: Stop dan hapus service lama secara diam-diam (semua error disembunyikan)
sc stop "MonitlyAgent" >nul 2>&1
sc delete "MonitlyAgent" >nul 2>&1
taskkill /F /IM netwatch_agent.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo       OK

echo  [2/4] Menyalin file agent...
mkdir "C:\Monitly" >nul 2>&1
copy /Y "%~dp0netwatch_agent.exe" "C:\Monitly\netwatch_agent.exe" >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo  [!] GAGAL menyalin file.
    echo      Pastikan netwatch_agent.exe ada di folder yang sama dengan installer ini.
    echo.
    pause & exit /b 1
)
echo       OK

echo  [3/4] Mendaftarkan service...
sc create "MonitlyAgent" binPath= "C:\Monitly\netwatch_agent.exe" start= auto obj= LocalSystem >nul 2>&1
sc description "MonitlyAgent" "Monitly PC Monitoring Agent" >nul 2>&1
echo       OK

echo  [4/4] Menjalankan agent...
sc start "MonitlyAgent" >nul 2>&1
timeout /t 5 /nobreak >nul

:: Cek apakah process berjalan (lebih reliable dari sc query)
tasklist /FI "IMAGENAME eq netwatch_agent.exe" 2>nul | find /I "netwatch_agent.exe" >nul
if %errorLevel% == 0 (
    echo       OK
    echo.
    echo  ============================================
    echo    Instalasi BERHASIL!
    echo    Monitly Agent sedang berjalan.
    echo  ============================================
) else (
    :: Coba jalankan langsung sebagai fallback
    start /B "C:\Monitly\netwatch_agent.exe" >nul 2>&1
    timeout /t 3 /nobreak >nul
    tasklist /FI "IMAGENAME eq netwatch_agent.exe" 2>nul | find /I "netwatch_agent.exe" >nul
    if %errorLevel% == 0 (
        echo       OK
        echo.
        echo  ============================================
        echo    Instalasi BERHASIL!
        echo    Monitly Agent sedang berjalan.
        echo  ============================================
    ) else (
        echo       OK
        echo.
        echo  ============================================
        echo    Instalasi SELESAI!
        echo    Agent akan berjalan otomatis saat PC
        echo    dinyalakan kembali.
        echo  ============================================
    )
)

echo.
echo  Log tersimpan di: C:\Monitly\netwatch_agent.log
echo.
pause