@echo off
cd /d "%~dp0"
title Backend Server - Port 4000
color 0A

echo ========================================
echo   YOHANNS BACKEND SERVER
echo   Starting on http://localhost:4000
echo ========================================
echo.

REM Set Supabase environment variables
set SUPABASE_URL=https://xnuzdzjfqhbpcnsetjif.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhudXpkempmcWhicGNuc2V0amlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTUwMTE3MywiZXhwIjoyMDc1MDc3MTczfQ.uoLRclXrq6d83GbLqur4Who41AOwjt62nCyuibk1TpE
set PORT=4000

REM Fix SSL certificate issue for Supabase connections (development only)
set NODE_TLS_REJECT_UNAUTHORIZED=0

echo Current directory: %CD%
echo.
echo Starting server with nodemon...
echo.

call npm run server:dev

echo.
echo ========================================
echo   SERVER STOPPED
echo ========================================
echo.
pause

