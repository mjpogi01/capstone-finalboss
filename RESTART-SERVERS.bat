@echo off
title Restart Development Servers
color 0C

echo ========================================
echo   RESTARTING DEVELOPMENT SERVERS
echo ========================================
echo.

echo Step 1: Stopping all node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Step 2: Stopping any remaining CMD windows...
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq Backend Server*" >nul 2>&1
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq Frontend Server*" >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo ✓ All processes stopped
echo.
echo Step 3: Starting fresh servers...
timeout /t 2 /nobreak >nul

cd /d "%~dp0"

echo Starting Backend Server...
start "Backend Server" cmd /k "start-backend.bat"
timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "start-frontend.bat"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   SERVERS RESTARTED!
echo ========================================
echo.
echo ⏱️  Please wait 30-40 seconds for:
echo   - Backend to initialize
echo   - React to compile
echo   - Browser to open automatically
echo.
echo 🔄  Then press: Ctrl + Shift + R
echo    (Hard refresh to clear cache)
echo.
echo 🌐  URL: http://localhost:3000
echo.
echo ========================================
echo.

timeout /t 5 /nobreak >nul
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo Press any key to close this window...
pause >nul

