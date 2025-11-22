# Setup Your Own GitHub Repository
# This script helps you set up your own repository so teammates don't see your pushes

param(
    [string]$RepositoryUrl = ""
)

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
    Write-ColorOutput Cyan "    SETUP YOUR OWN GITHUB REPOSITORY"
    Write-ColorOutput Cyan "========================================"
    Write-Output ""
}

function Test-GitRepository {
    if (-not (Test-Path ".git")) {
        Write-ColorOutput Red "ERROR: Not a git repository!"
        Write-ColorOutput Red "Please run this script from your project directory."
        return $false
    }
    return $true
}

function Get-RepositoryUrl {
    if ($RepositoryUrl) {
        return $RepositoryUrl
    }
    
    Write-ColorOutput Yellow "STEP 1: Create a new repository on GitHub"
    Write-ColorOutput Yellow "----------------------------------------"
    Write-Output "1. Go to https://github.com"
    Write-Output "2. Click the '+' icon in the top right"
    Write-Output "3. Select 'New repository'"
    Write-Output "4. Name it: capstone2-yourname (or any name you prefer)"
    Write-Output "5. Make it Public or Private (your choice)"
    Write-Output "6. DO NOT initialize with README, .gitignore, or license"
    Write-Output "7. Click 'Create repository'"
    Write-Output ""
    
    Write-ColorOutput Yellow "STEP 2: Get your repository URL"
    Write-ColorOutput Yellow "------------------------------"
    Write-Output "After creating the repository, GitHub will show you a URL like:"
    Write-ColorOutput Cyan "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
    Write-Output ""
    Write-Output "Copy that URL and paste it below:"
    Write-Output ""
    
    do {
        $url = Read-Host "Enter your GitHub repository URL"
        if ($url -match "^https://github\.com/[^/]+/[^/]+\.git$") {
            return $url
        } else {
            Write-ColorOutput Red "Invalid URL format. Please enter a valid GitHub repository URL."
        }
    } while ($true)
}

function Setup-Repository {
    param([string]$RepoUrl)
    
    Write-ColorOutput Yellow "STEP 3: Configure your local repository"
    Write-ColorOutput Yellow "--------------------------------------"
    Write-Output "Changing remote origin to your repository..."
    
    try {
        git remote set-url origin $RepoUrl
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to change remote URL"
        }
        
        Write-ColorOutput Green "✓ Remote origin updated successfully!"
        Write-Output ""
        
        Write-ColorOutput Yellow "STEP 4: Push to your repository"
        Write-ColorOutput Yellow "------------------------------"
        Write-Output "Pushing your code to your own repository..."
        
        git push -u origin main
        if ($LASTEXITCODE -eq 0) {
            Write-Output ""
            Write-ColorOutput Green "========================================"
            Write-ColorOutput Green "    ✅ SUCCESS! REPOSITORY SETUP COMPLETE"
            Write-ColorOutput Green "========================================"
            Write-Output ""
            Write-ColorOutput Green "Your code is now in your own GitHub repository!"
            Write-ColorOutput Green "Your teammates will no longer see your pushes."
            Write-Output ""
            Write-ColorOutput Cyan "Your repository URL: $RepoUrl"
            Write-Output ""
            Write-ColorOutput Yellow "Next steps:"
            Write-Output "1. Share your repository URL with your team"
            Write-Output "2. Use the auto-sync tools to stay updated"
            Write-Output "3. Continue developing in your own repository"
            Write-Output ""
            return $true
        } else {
            throw "Failed to push to repository"
        }
    } catch {
        Write-Output ""
        Write-ColorOutput Red "========================================"
        Write-ColorOutput Red "    ❌ ERROR: SETUP FAILED"
        Write-ColorOutput Red "========================================"
        Write-Output ""
        Write-ColorOutput Red "Possible issues:"
        Write-Output "1. Repository URL is incorrect"
        Write-Output "2. You don't have access to the repository"
        Write-Output "3. Authentication issues with GitHub"
        Write-Output ""
        Write-ColorOutput Yellow "Please check your repository URL and GitHub access."
        Write-Output ""
        return $false
    }
}

# Main execution
Show-Header

# Check if we're in a git repository
if (-not (Test-GitRepository)) {
    exit 1
}

# Get repository URL
$repoUrl = Get-RepositoryUrl

# Setup repository
$success = Setup-Repository -RepoUrl $repoUrl

if (-not $success) {
    exit 1
}

Write-Output ""
Write-ColorOutput Cyan "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
