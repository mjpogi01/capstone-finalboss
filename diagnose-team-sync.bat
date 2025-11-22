@echo off
title Team Sync Diagnostic Tool
color 0B

echo ========================================
echo    TEAM SYNC DIAGNOSTIC TOOL
echo ========================================
echo.

echo This tool will help diagnose why your teammates
echo can't see your updated code.
echo.

echo CHECKING YOUR REPOSITORY SETUP...
echo ========================================

echo.
echo 1. Checking current repository...
git remote -v
echo.

echo 2. Checking current branch...
git branch
echo.

echo 3. Checking latest commits...
git log --oneline -3
echo.

echo 4. Checking repository status...
git status
echo.

echo 5. Checking if you're up to date with remote...
git fetch origin
git status
echo.

echo ========================================
echo    DIAGNOSTIC RESULTS
echo ========================================
echo.

REM Check if repository is correct
git remote get-url origin | findstr "mjpogi01/capstone2" >nul
if %errorlevel% equ 0 (
    echo ✅ Repository URL is correct: mjpogi01/capstone2
) else (
    echo ❌ Repository URL issue detected!
    echo    Current URL: 
    git remote get-url origin
    echo    Expected: https://github.com/mjpogi01/capstone2.git
)

echo.

REM Check if on main branch
git branch --show-current | findstr "main" >nul
if %errorlevel% equ 0 (
    echo ✅ You are on the main branch
) else (
    echo ❌ You are not on the main branch!
    echo    Current branch: 
    git branch --show-current
    echo    You should be on 'main'
)

echo.

REM Check if up to date
git status | findstr "up to date" >nul
if %errorlevel% equ 0 (
    echo ✅ Your local repository is up to date with remote
) else (
    echo ⚠️  Your local repository may not be up to date
    echo    Run: git pull origin main
)

echo.

echo ========================================
echo    RECOMMENDATIONS FOR YOUR TEAMMATES
echo ========================================
echo.

echo Your teammates should run these commands:
echo.
echo 1. Check their repository:
echo    git remote -v
echo    (Should show: https://github.com/mjpogi01/capstone2.git)
echo.
echo 2. Pull your latest changes:
echo    git pull origin main
echo.
echo 3. Or use auto-sync:
echo    team-auto-sync.bat
echo.
echo 4. Verify they got your updates:
echo    git log --oneline -5
echo.

echo ========================================
echo    QUICK FIX COMMANDS
echo ========================================
echo.

echo If your teammates still can't see your code:
echo.
echo 1. Force push your changes:
echo    git push origin main --force
echo.
echo 2. Ask teammates to force pull:
echo    git fetch --all
echo    git reset --hard origin/main
echo.

echo ========================================
echo    NEXT STEPS
echo ========================================
echo.

echo 1. Share this diagnostic output with your team
echo 2. Ask teammates to run the same diagnostic
echo 3. Compare results to identify the issue
echo 4. Use the troubleshooting guide if needed
echo.

echo Press any key to exit...
pause >nul
