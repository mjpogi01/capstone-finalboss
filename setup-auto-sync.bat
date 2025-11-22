@echo off
echo ========================================
echo    SETTING UP AUTO-SYNC SCHEDULE
echo ========================================
echo.

echo This will create a scheduled task that runs every 30 minutes
echo to automatically sync with your team's changes.
echo.

set /p confirm="Do you want to set up auto-sync? (y/n): "
if /i "%confirm%" neq "y" goto :end

echo.
echo Creating scheduled task...

schtasks /create /tn "Yohanns Capstone Auto-Sync" /tr "powershell.exe -ExecutionPolicy Bypass -File \"%~dp0auto-sync.ps1\"" /sc minute /mo 30 /f

echo.
echo ========================================
echo    AUTO-SYNC SCHEDULE CREATED!
echo ========================================
echo.
echo The auto-sync will run every 30 minutes.
echo.
echo To view the task: Task Scheduler
echo To remove the task: schtasks /delete /tn "Yohanns Capstone Auto-Sync"
echo.

:end
pause
