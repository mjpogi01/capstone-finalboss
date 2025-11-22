@echo off
title Yohanns Capstone - Startup
color 0E

echo ================================================
echo       YOHANNS SPORTSWEAR ECOMMERCE
echo       Starting Application Servers
echo ================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Backend Server...
start "Backend Server" cmd /k "start-backend.bat"
timeout /t 2 /nobreak >nul

echo [2/3] Starting Frontend Server...
start "Frontend Server" cmd /k "start-frontend.bat"
timeout /t 2 /nobreak >nul

echo [3/3] Waiting for servers to initialize...
timeout /t 10 /nobreak >nul

echo.
echo ================================================
echo   SERVERS STARTING!
echo ================================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:4000
echo.
echo   Check the server windows for status
echo   Browser will open automatically
echo ================================================
echo.

REM Open the application in browser
start http://localhost:3000

echo.
echo Press any key to close this window...
pause >nul

