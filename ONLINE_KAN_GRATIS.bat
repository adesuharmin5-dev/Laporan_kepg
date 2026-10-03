@echo off
title Online-kan Aplikasi Laporan Kepegawaian (Gratis)
color 0b

echo ========================================================
echo   ONLINE-KAN APLIKASI LAPORAN KEPEGAWAIAN (100%% GRATIS)
echo ========================================================
echo.
echo Sedang menyiapkan akses online HTTPS publik...
echo Anda akan mendapatkan URL online gratis yang bisa dibuka
echo langsung dari HP (smartphone), tablet, atau laptop lain.
echo.

:: Pastikan server lokal berjalan di background
powershell -Command "if (-not (Get-Process -Name node -ErrorAction SilentlyContinue)) { Start-Process -WindowStyle Hidden node server.js }"

timeout /t 2 /nobreak >nul

echo Menghubungkan ke tunnel internet publik...
echo.
npx localtunnel --port 3000

pause
