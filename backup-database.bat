@echo off
echo ========================================
echo   Supabase Database Backup
echo ========================================
echo.

cd /d "%~dp0"

if not exist "server\scripts\backup-database.js" (
    echo Error: backup-database.js not found!
    pause
    exit /b 1
)

echo Starting backup...
echo.

node server\scripts\backup-database.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Backup completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   Backup failed! Check errors above.
    echo ========================================
)

echo.
pause



