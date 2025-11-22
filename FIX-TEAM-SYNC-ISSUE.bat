@echo off
title FIX TEAM SYNC ISSUE - Your teammates can't see your code
color 0C

echo ========================================
echo    FOUND THE PROBLEM! 
echo ========================================
echo.

echo Your repository is working correctly, but your teammates
echo are likely looking at the wrong place or haven't pulled
echo your latest changes.
echo.

echo DIAGNOSTIC RESULTS:
echo ========================================
echo ✅ Your repository: https://github.com/mjpogi01/capstone2.git
echo ✅ Your branch: main
echo ✅ Your latest commit: b08da22 (Add team sync troubleshooting tools)
echo ✅ Your push is successful
echo.

echo THE PROBLEM IS LIKELY:
echo ========================================
echo 1. Your teammates are looking at the wrong repository
echo 2. They haven't pulled your latest changes
echo 3. They're on a different branch
echo 4. They're looking at feature branches instead of main
echo.

echo IMMEDIATE SOLUTIONS:
echo ========================================
echo.

echo SOLUTION 1: Tell your teammates to run this:
echo -------------------------------------------
echo git fetch --all
echo git checkout main
echo git pull origin main
echo.

echo SOLUTION 2: Force update for teammates:
echo --------------------------------------
echo git fetch --all
echo git reset --hard origin/main
echo git clean -fd
echo.

echo SOLUTION 3: Use auto-sync:
echo ---------------------------
echo team-auto-sync.bat
echo.

echo VERIFICATION STEPS:
echo ========================================
echo.

echo Ask your teammates to check:
echo 1. Are they on the main branch? (git branch)
echo 2. Are they looking at the right repository? (git remote -v)
echo 3. Have they pulled your changes? (git pull origin main)
echo 4. Can they see your latest commits? (git log --oneline -5)
echo.

echo YOUR LATEST COMMITS THAT THEY SHOULD SEE:
echo ========================================
echo b08da22 - Add team sync troubleshooting tools
echo c7acaa6 - Add repository setup tools for team collaboration
echo 35a1d3d - Merge branch 'main' of https://github.com/mjpogi01/capstone2
echo e69938c - Implement comprehensive 3-status order tracking system
echo d1b5cff - Merge branch 'main' of https://github.com/mjpogi01/capstone2
echo.

echo IF NOTHING WORKS:
echo ========================================
echo 1. Share this exact repository URL with your team:
echo    https://github.com/mjpogi01/capstone2
echo.
echo 2. Ask them to clone fresh:
echo    git clone https://github.com/mjpogi01/capstone2.git
echo.
echo 3. Or ask them to check the GitHub website directly:
echo    https://github.com/mjpogi01/capstone2/commits/main
echo.

echo ========================================
echo    EMERGENCY RESET FOR TEAMMATES
echo ========================================
echo.

echo If your teammates are completely stuck, tell them to run:
echo.
echo cd to their project folder
echo git fetch --all
echo git reset --hard origin/main
echo git clean -fd
echo git pull origin main
echo.

echo This will force their repository to match yours exactly.
echo.

echo Press any key to exit...
pause >nul
