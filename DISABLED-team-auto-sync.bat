@echo off
title Team Auto-Sync - Capstone Project
color 0A

echo ========================================
echo    TEAM AUTO-SYNC SCRIPT v2.0
echo    Capstone Project - Auto Git Pull
echo ========================================
echo.

REM Set project directory
set PROJECT_DIR="C:\Users\miles\Downloads\Capstone Projects\capstone2-1"
cd /d %PROJECT_DIR%

echo [%date% %time%] Project Directory: %PROJECT_DIR%
echo.

REM Check if git repository exists
if not exist ".git" (
    echo ERROR: Not a git repository!
    echo Please ensure you're in the correct project directory.
    echo.
    pause
    exit /b 1
)

REM Check if we're on the main branch
git branch --show-current | findstr "main" >nul
if %errorlevel% neq 0 (
    echo WARNING: Not on main branch. Current branch: 
    git branch --show-current
    echo.
    echo Do you want to switch to main branch? (y/n)
    set /p choice=
    if /i "%choice%"=="y" (
        git checkout main
        if %errorlevel% neq 0 (
            echo ERROR: Failed to switch to main branch!
            pause
            exit /b 1
        )
    ) else (
        echo Continuing with current branch...
    )
)

echo [%date% %time%] Checking for updates from GitHub...
echo.

REM Fetch latest changes
git fetch origin main
if %errorlevel% neq 0 (
    echo ERROR: Failed to fetch from remote repository!
    echo Please check your internet connection and GitHub access.
    pause
    exit /b 1
)

REM Check if there are local changes
git diff --quiet
if %errorlevel% neq 0 (
    echo WARNING: You have uncommitted changes!
    echo.
    echo Your local changes:
    git status --porcelain
    echo.
    echo Options:
    echo 1. Stash changes and pull updates
    echo 2. Commit changes first
    echo 3. Cancel auto-sync
    echo.
    set /p choice="Enter your choice (1/2/3): "
    
    if "%choice%"=="1" (
        echo [%date% %time%] Stashing local changes...
        git stash push -m "Auto-stash before sync - %date% %time%"
        if %errorlevel% neq 0 (
            echo ERROR: Failed to stash changes!
            pause
            exit /b 1
        )
        echo Local changes stashed successfully.
    ) else if "%choice%"=="2" (
        echo [%date% %time%] Please commit your changes first:
        echo git add .
        echo git commit -m "Your commit message"
        echo.
        echo Then run this script again.
        pause
        exit /b 0
    ) else (
        echo Auto-sync cancelled.
        pause
        exit /b 0
    )
)

REM Check if there are remote changes
git diff HEAD origin/main --quiet
if %errorlevel% equ 0 (
    echo [%date% %time%] ✓ Your repository is already up to date!
    echo No new changes available from GitHub.
) else (
    echo [%date% %time%] 🔄 New changes detected! Pulling updates...
    echo.
    
    REM Pull the latest changes
    git pull origin main
    if %errorlevel% equ 0 (
        echo.
        echo ========================================
        echo    ✅ SUCCESS! CHANGES APPLIED
        echo ========================================
        echo.
        echo [%date% %time%] Repository updated successfully!
        echo.
        
        REM Show what was updated
        echo Recent changes:
        git log --oneline -5
        echo.
        
        REM Check if npm dependencies need updating
        if exist "package.json" (
            echo [%date% %time%] Checking dependencies...
            npm install --silent
            if %errorlevel% equ 0 (
                echo [%date% %time%] ✓ Dependencies updated successfully!
            ) else (
                echo [%date% %time%] ⚠ Warning: Some dependencies may need manual attention.
            )
        )
        
        echo.
        echo ========================================
        echo    🎉 AUTO-SYNC COMPLETED SUCCESSFULLY
        echo ========================================
        echo.
        echo Your local repository is now synchronized with the team!
        echo.
        
    ) else (
        echo.
        echo ========================================
        echo    ❌ ERROR: SYNC FAILED
        echo ========================================
        echo.
        echo [%date% %time%] Failed to pull changes!
        echo.
        echo Possible issues:
        echo 1. Merge conflicts need manual resolution
        echo 2. Network connectivity issues
        echo 3. Authentication problems with GitHub
        echo.
        echo Please check the error messages above and resolve manually.
        echo.
    )
)

echo.
echo [%date% %time%] Auto-sync process completed.
echo.
echo Press any key to exit...
pause >nul
