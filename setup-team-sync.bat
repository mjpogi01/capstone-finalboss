@echo off
title Setup Team Auto-Sync
color 0B

echo ========================================
echo    SETUP TEAM AUTO-SYNC
echo    Capstone Project
echo ========================================
echo.

echo This script will help you set up auto-sync for your team.
echo.

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH!
    echo Please install Git from https://git-scm.com/
    echo.
    pause
    exit /b 1
)

echo ✓ Git is installed and available.
echo.

REM Check if we're in a git repository
if not exist ".git" (
    echo ERROR: Not in a git repository!
    echo Please run this script from your project directory.
    echo.
    pause
    exit /b 1
)

echo ✓ Git repository detected.
echo.

REM Check if we have a remote origin
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: No remote origin configured!
    echo Please add your GitHub repository as origin:
    echo git remote add origin https://github.com/yourusername/yourrepo.git
    echo.
    pause
    exit /b 1
)

echo ✓ Remote origin configured.
echo.

REM Create desktop shortcuts
echo Creating desktop shortcuts for easy access...
echo.

REM Create batch file shortcut
echo [InternetShortcut] > "%USERPROFILE%\Desktop\Team Auto-Sync.url"
echo URL=file:///C:/Users/miles/Downloads/Capstone Projects/capstone2-1/team-auto-sync.bat >> "%USERPROFILE%\Desktop\Team Auto-Sync.url"
echo IconFile=C:\Windows\System32\shell32.dll >> "%USERPROFILE%\Desktop\Team Auto-Sync.url"
echo IconIndex=1 >> "%USERPROFILE%\Desktop\Team Auto-Sync.url"

echo ✓ Desktop shortcut created: "Team Auto-Sync"
echo.

REM Create a simple README for the team
echo Creating team documentation...
echo.

(
echo # Team Auto-Sync Setup
echo.
echo ## Quick Start
echo.
echo ### Option 1: Batch Script (Recommended)
echo 1. Double-click `team-auto-sync.bat`
echo 2. Follow the prompts
echo 3. Your repository will be automatically updated
echo.
echo ### Option 2: PowerShell Script (Advanced)
echo 1. Right-click `team-auto-sync.ps1`
echo 2. Select "Run with PowerShell"
echo 3. Or run: `powershell -ExecutionPolicy Bypass -File team-auto-sync.ps1`
echo.
echo ## Features
echo - ✅ Automatic conflict detection
echo - ✅ Safe stashing of local changes
echo - ✅ Dependency updates
echo - ✅ Detailed progress reporting
echo - ✅ Error handling and recovery
echo.
echo ## Manual Commands
echo If you prefer manual control:
echo ```bash
echo git fetch origin main
echo git pull origin main
echo npm install
echo ```
echo.
echo ## Troubleshooting
echo.
echo ### Common Issues:
echo 1. **Merge Conflicts**: The script will detect and help resolve conflicts
echo 2. **Authentication**: Make sure you're logged into GitHub
echo 3. **Network Issues**: Check your internet connection
echo.
echo ### Getting Help:
echo - Check the console output for detailed error messages
echo - Ensure you're on the main branch
echo - Make sure you have the latest changes committed or stashed
echo.
echo ---
echo Generated on: %date% %time%
) > "TEAM-SYNC-README.md"

echo ✓ Team documentation created: "TEAM-SYNC-README.md"
echo.

echo ========================================
echo    SETUP COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Your team auto-sync is now ready!
echo.
echo Available tools:
echo - team-auto-sync.bat (Simple batch script)
echo - team-auto-sync.ps1 (PowerShell script with advanced features)
echo - TEAM-SYNC-README.md (Documentation for your team)
echo.
echo To use auto-sync:
echo 1. Double-click "Team Auto-Sync" on your desktop
echo 2. Or run team-auto-sync.bat from this directory
echo.
echo Press any key to exit...
pause >nul
