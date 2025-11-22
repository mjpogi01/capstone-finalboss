# Yohanns Capstone - Auto Sync Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    YOHANNS CAPSTONE - AUTO SYNC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check current status
Write-Host "[1/5] Checking current status..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "Local changes detected:" -ForegroundColor Green
    Write-Host $status -ForegroundColor White
} else {
    Write-Host "No local changes detected" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/5] Stashing local changes..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git stash push -m "Auto-sync: Local changes $timestamp"

Write-Host ""
Write-Host "[3/5] Fetching team changes..." -ForegroundColor Yellow
git fetch origin

Write-Host ""
Write-Host "[4/5] Checking for new commits..." -ForegroundColor Yellow
$commits = git log --oneline HEAD..origin/main
if ($commits) {
    Write-Host "New team changes found:" -ForegroundColor Green
    Write-Host $commits -ForegroundColor White
} else {
    Write-Host "No new team changes" -ForegroundColor Green
}

Write-Host ""
Write-Host "[5/5] Pulling latest changes..." -ForegroundColor Yellow
git pull origin main

Write-Host ""
Write-Host "Restoring local changes..." -ForegroundColor Yellow
git stash pop

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    SYNC COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your local changes have been preserved" -ForegroundColor Green
Write-Host "and team changes have been merged." -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
