@echo off
cd /d "%~dp0"
title Frontend Server - Port 3000
color 0B

echo ========================================
echo   YOHANNS REACT FRONTEND
echo   Starting on http://localhost:3000
echo ========================================
echo.

echo Current directory: %CD%
echo.
echo Starting React development server...
echo.

call npm start

echo.
echo ========================================
echo   SERVER STOPPED
echo ========================================
echo.
pause

