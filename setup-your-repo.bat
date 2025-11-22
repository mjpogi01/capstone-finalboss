@echo off
title Setup Your Own Repository
color 0B

echo ========================================
echo    SETUP YOUR OWN GITHUB REPOSITORY
echo ========================================
echo.

echo This script will help you set up your own GitHub repository
echo so your teammates won't see your pushes in their repository.
echo.

echo STEP 1: Create a new repository on GitHub
echo ----------------------------------------
echo 1. Go to https://github.com
echo 2. Click the "+" icon in the top right
echo 3. Select "New repository"
echo 4. Name it: capstone2-yourname (or any name you prefer)
echo 5. Make it Public or Private (your choice)
echo 6. DO NOT initialize with README, .gitignore, or license
echo 7. Click "Create repository"
echo.

echo STEP 2: Get your repository URL
echo ------------------------------
echo After creating the repository, GitHub will show you a URL like:
echo https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
echo.
echo Copy that URL and paste it below:
echo.

set /p REPO_URL="Enter your GitHub repository URL: "

if "%REPO_URL%"=="" (
    echo ERROR: No URL provided!
    echo Please run this script again and provide your repository URL.
    pause
    exit /b 1
)

echo.
echo STEP 3: Configure your local repository
echo ----------------------------------------
echo Changing remote origin to your repository...

git remote set-url origin %REPO_URL%

if %errorlevel% neq 0 (
    echo ERROR: Failed to change remote URL!
    echo Please check your repository URL and try again.
    pause
    exit /b 1
)

echo ✓ Remote origin updated successfully!
echo.

echo STEP 4: Push to your repository
echo ------------------------------
echo Pushing your code to your own repository...

git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    ✅ SUCCESS! REPOSITORY SETUP COMPLETE
    echo ========================================
    echo.
    echo Your code is now in your own GitHub repository!
    echo Your teammates will no longer see your pushes.
    echo.
    echo Your repository URL: %REPO_URL%
    echo.
    echo Next steps:
    echo 1. Share your repository URL with your team
    echo 2. Use the auto-sync tools to stay updated
    echo 3. Continue developing in your own repository
    echo.
) else (
    echo.
    echo ========================================
    echo    ❌ ERROR: PUSH FAILED
    echo ========================================
    echo.
    echo Possible issues:
    echo 1. Repository URL is incorrect
    echo 2. You don't have access to the repository
    echo 3. Authentication issues with GitHub
    echo.
    echo Please check your repository URL and GitHub access.
    echo.
)

echo Press any key to exit...
pause >nul
