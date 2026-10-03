@echo off
title HR Executive Report Generator & Period Manager
echo ========================================================
echo Membuka Aplikasi Laporan Kepegawaian Eksekutif...
echo ========================================================
cd /d "%~dp0"
start "" http://localhost:3000
node server.js
pause
