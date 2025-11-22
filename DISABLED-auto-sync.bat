@echo off
echo ========================================
echo    YOHANNS CAPSTONE - AUTO SYNC
echo ========================================
echo.

echo [1/4] Checking current status...
git status --porcelain

echo.
echo [2/4] Stashing local changes...
git stash push -m "Auto-sync: Local changes $(Get-Date)"

echo.
echo [3/4] Fetching team changes...
git fetch origin

echo.
echo [4/4] Pulling latest changes...
git pull origin main

echo.
echo [5/5] Restoring local changes...
git stash pop

echo.
echo ========================================
echo    SYNC COMPLETE!
echo ========================================
echo.
echo Your local changes have been preserved
echo and team changes have been merged.
echo.
pause
