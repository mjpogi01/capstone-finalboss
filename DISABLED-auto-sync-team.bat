@echo off
echo ========================================
echo    TEAM AUTO-SYNC SCRIPT
echo ========================================
echo.

REM Change to project directory
cd /d "C:\Users\miles\Downloads\Capstone Projects\capstone2-1"

echo [%date% %time%] Starting auto-sync...
echo.

REM Check if git repository exists
if not exist ".git" (
    echo ERROR: Not a git repository!
    echo Please run this script from your project directory.
    pause
    exit /b 1
)

REM Fetch latest changes from remote
echo [%date% %time%] Fetching latest changes from GitHub...
git fetch origin

REM Check if there are any changes to pull
git diff HEAD origin/main >nul 2>&1
if %errorlevel% equ 0 (
    echo [%date% %time%] No new changes available.
) else (
    echo [%date% %time%] New changes detected! Pulling updates...
    git pull origin main
    
    if %errorlevel% equ 0 (
        echo [%date% %time%] Successfully pulled latest changes!
        echo.
        echo ========================================
        echo    CHANGES APPLIED SUCCESSFULLY
        echo ========================================
        echo.
        echo Your local repository is now up to date.
        echo.
        
        REM Check if npm is available and install dependencies if needed
        if exist "package.json" (
            echo [%date% %time%] Checking dependencies...
            npm install --silent
            if %errorlevel% equ 0 (
                echo [%date% %time%] Dependencies updated successfully!
            )
        )
        
    ) else (
        echo [%date% %time%] ERROR: Failed to pull changes!
        echo There might be conflicts that need manual resolution.
        echo.
        echo Please check the following:
        echo 1. Make sure you have no uncommitted changes
        echo 2. Resolve any merge conflicts manually
        echo 3. Run this script again
    )
)

echo.
echo [%date% %time%] Auto-sync completed.
echo.
echo Press any key to exit...
pause >nul
