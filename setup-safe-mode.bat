@echo off
REM Setup Safe Mode - Disable auto-push to main GitHub repository
REM This script configures your local repository to prevent accidental pushes

echo.
echo ========================================
echo    SETTING UP REPOSITORY SAFE MODE
echo ========================================
echo.

echo Configuring Git to disable push...
git remote set-url --push origin no_push
git config --local branch.main.pushRemote no_push
git config --local push.default nothing

echo.
echo ========================================
echo    SAFE MODE ENABLED SUCCESSFULLY!
echo ========================================
echo.
echo Your repository is now in safe mode:
echo   - Pushes to origin are DISABLED
echo   - You can still pull/fetch updates
echo   - Commits work normally (local only)
echo.
echo To verify, run: git remote -v
echo.
echo For more information, see SAFE_MODE_README.md
echo.
pause

