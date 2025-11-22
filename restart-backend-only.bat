@echo off
title Restart Backend Server Only
color 0A

echo ========================================
echo   RESTARTING BACKEND SERVER
echo ========================================
echo.

echo Step 1: Stopping backend server...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Backend Server*" >nul 2>&1
timeout /t 2 /nobreak >nul

echo Step 2: Finding and stopping backend processes...
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST ^| findstr /i "PID"') do (
    echo Checking process %%i...
)
taskkill /F /FI "WINDOWTITLE eq Backend Server*" >nul 2>&1

echo.
echo Step 3: Starting backend server...
timeout /t 2 /nobreak >nul

cd /d "%~dp0"

echo Starting Backend Server...
start "Backend Server" cmd /k "start-backend.bat"

echo.
echo ========================================
echo   BACKEND SERVER RESTARTED!
echo ========================================
echo.
echo ⏱️  Please wait 10-15 seconds for:
echo   - Backend to initialize
echo   - Routes to load
echo.
echo 🌐  Backend URL: http://localhost:4000
echo.
echo ========================================
echo.
echo Press any key to close this window...
pause >nul




