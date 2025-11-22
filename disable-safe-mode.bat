@echo off
REM Disable Safe Mode - Re-enable push to main GitHub repository
REM Use this if you need to temporarily or permanently enable pushing

echo.
echo ========================================
echo   DISABLING REPOSITORY SAFE MODE
echo ========================================
echo.

echo WARNING: This will re-enable pushing to the remote repository!
echo.
set /p confirm="Are you sure you want to disable safe mode? (y/N): "

if /i not "%confirm%"=="y" (
    echo.
    echo Safe mode remains ENABLED. No changes made.
    echo.
    pause
    exit /b 0
)

echo.
echo Re-enabling push capability...
git config --local --unset remote.origin.pushurl
git config --local --unset branch.main.pushremote
git config --local push.default simple

echo.
echo ========================================
echo    SAFE MODE DISABLED
echo ========================================
echo.
echo Your repository can now push to origin.
echo To verify, run: git remote -v
echo.
echo To re-enable safe mode, run: setup-safe-mode.bat
echo.
pause

