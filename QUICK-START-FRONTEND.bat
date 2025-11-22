@echo off
cd /d "%~dp0"
title Frontend Server - Port 3000
color 0B

echo ========================================
echo   STARTING FRONTEND SERVER
echo   http://localhost:3000
echo ========================================
echo.
echo Please wait 30-60 seconds for React to compile...
echo.

call npm start

