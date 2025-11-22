# Team Auto-Sync PowerShell Script
# Capstone Project - Auto Git Pull

param(
    [string]$ProjectPath = "C:\Users\miles\Downloads\Capstone Projects\capstone2-1",
    [switch]$Force,
    [switch]$Quiet
)

# Set console colors
$Host.UI.RawUI.BackgroundColor = "Black"
$Host.UI.RawUI.ForegroundColor = "Green"
Clear-Host

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Show-Header {
    Write-ColorOutput Cyan "========================================"
    Write-ColorOutput Cyan "    TEAM AUTO-SYNC SCRIPT v2.0"
    Write-ColorOutput Cyan "    Capstone Project - Auto Git Pull"
    Write-ColorOutput Cyan "========================================"
    Write-Output ""
}

function Test-GitRepository {
    if (-not (Test-Path ".git")) {
        Write-ColorOutput Red "ERROR: Not a git repository!"
        Write-ColorOutput Red "Please ensure you're in the correct project directory."
        return $false
    }
    return $true
}

function Get-GitStatus {
    $status = git status --porcelain
    return $status
}

function Sync-Repository {
    Write-ColorOutput Yellow "[$(Get-Date)] Starting auto-sync process..."
    Write-Output ""
    
    # Change to project directory
    Set-Location $ProjectPath
    
    # Check if it's a git repository
    if (-not (Test-GitRepository)) {
        return $false
    }
    
    Write-ColorOutput Yellow "[$(Get-Date)] Project Directory: $ProjectPath"
    Write-Output ""
    
    # Check current branch
    $currentBranch = git branch --show-current
    if ($currentBranch -ne "main") {
        Write-ColorOutput Yellow "WARNING: Not on main branch. Current branch: $currentBranch"
        if (-not $Force) {
            $choice = Read-Host "Do you want to switch to main branch? (y/n)"
            if ($choice -eq "y" -or $choice -eq "Y") {
                git checkout main
                if ($LASTEXITCODE -ne 0) {
                    Write-ColorOutput Red "ERROR: Failed to switch to main branch!"
                    return $false
                }
            }
        }
    }
    
    # Check for local changes
    $localChanges = Get-GitStatus
    if ($localChanges) {
        Write-ColorOutput Yellow "WARNING: You have uncommitted changes!"
        Write-Output ""
        Write-ColorOutput Yellow "Your local changes:"
        $localChanges | ForEach-Object { Write-Output "  $_" }
        Write-Output ""
        
        if (-not $Force) {
            Write-ColorOutput Cyan "Options:"
            Write-ColorOutput Cyan "1. Stash changes and pull updates"
            Write-ColorOutput Cyan "2. Commit changes first"
            Write-ColorOutput Cyan "3. Cancel auto-sync"
            Write-Output ""
            $choice = Read-Host "Enter your choice (1/2/3)"
            
            switch ($choice) {
                "1" {
                    Write-ColorOutput Yellow "[$(Get-Date)] Stashing local changes..."
                    git stash push -m "Auto-stash before sync - $(Get-Date)"
                    if ($LASTEXITCODE -ne 0) {
                        Write-ColorOutput Red "ERROR: Failed to stash changes!"
                        return $false
                    }
                    Write-ColorOutput Green "Local changes stashed successfully."
                }
                "2" {
                    Write-ColorOutput Yellow "Please commit your changes first:"
                    Write-ColorOutput Cyan "git add ."
                    Write-ColorOutput Cyan "git commit -m 'Your commit message'"
                    Write-Output ""
                    Write-ColorOutput Yellow "Then run this script again."
                    return $false
                }
                default {
                    Write-ColorOutput Yellow "Auto-sync cancelled."
                    return $false
                }
            }
        }
    }
    
    # Fetch latest changes
    Write-ColorOutput Yellow "[$(Get-Date)] Fetching latest changes from GitHub..."
    git fetch origin main
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput Red "ERROR: Failed to fetch from remote repository!"
        Write-ColorOutput Red "Please check your internet connection and GitHub access."
        return $false
    }
    
    # Check if there are remote changes
    $remoteChanges = git diff HEAD origin/main --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "[$(Get-Date)] ✓ Your repository is already up to date!"
        Write-ColorOutput Green "No new changes available from GitHub."
    } else {
        Write-ColorOutput Yellow "[$(Get-Date)] 🔄 New changes detected! Pulling updates..."
        Write-Output ""
        
        # Pull the latest changes
        git pull origin main
        if ($LASTEXITCODE -eq 0) {
            Write-Output ""
            Write-ColorOutput Green "========================================"
            Write-ColorOutput Green "    ✅ SUCCESS! CHANGES APPLIED"
            Write-ColorOutput Green "========================================"
            Write-Output ""
            Write-ColorOutput Green "[$(Get-Date)] Repository updated successfully!"
            Write-Output ""
            
            # Show recent changes
            Write-ColorOutput Cyan "Recent changes:"
            git log --oneline -5 | ForEach-Object { Write-Output "  $_" }
            Write-Output ""
            
            # Update dependencies if package.json exists
            if (Test-Path "package.json") {
                Write-ColorOutput Yellow "[$(Get-Date)] Checking dependencies..."
                npm install --silent
                if ($LASTEXITCODE -eq 0) {
                    Write-ColorOutput Green "[$(Get-Date)] ✓ Dependencies updated successfully!"
                } else {
                    Write-ColorOutput Yellow "[$(Get-Date)] ⚠ Warning: Some dependencies may need manual attention."
                }
            }
            
            Write-Output ""
            Write-ColorOutput Green "========================================"
            Write-ColorOutput Green "    🎉 AUTO-SYNC COMPLETED SUCCESSFULLY"
            Write-ColorOutput Green "========================================"
            Write-Output ""
            Write-ColorOutput Green "Your local repository is now synchronized with the team!"
            Write-Output ""
        } else {
            Write-Output ""
            Write-ColorOutput Red "========================================"
            Write-ColorOutput Red "    ❌ ERROR: SYNC FAILED"
            Write-ColorOutput Red "========================================"
            Write-Output ""
            Write-ColorOutput Red "[$(Get-Date)] Failed to pull changes!"
            Write-Output ""
            Write-ColorOutput Yellow "Possible issues:"
            Write-ColorOutput Yellow "1. Merge conflicts need manual resolution"
            Write-ColorOutput Yellow "2. Network connectivity issues"
            Write-ColorOutput Yellow "3. Authentication problems with GitHub"
            Write-Output ""
            Write-ColorOutput Yellow "Please check the error messages above and resolve manually."
            Write-Output ""
            return $false
        }
    }
    
    Write-Output ""
    Write-ColorOutput Green "[$(Get-Date)] Auto-sync process completed."
    return $true
}

# Main execution
Show-Header
$result = Sync-Repository

if (-not $Quiet) {
    Write-Output ""
    Write-ColorOutput Cyan "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
