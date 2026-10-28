# PowerShell script to push with GitHub token
# Usage: .\push-with-token.ps1

Write-Host "=== GitHub Push Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if token is provided
param(
    [string]$Token = ""
)

if ($Token -eq "") {
    Write-Host "Please provide your GitHub Personal Access Token:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://github.com/settings/tokens" -ForegroundColor White
    Write-Host "2. Click 'Generate new token (classic)'" -ForegroundColor White
    Write-Host "3. Name: EDCAT-Administrator-Push" -ForegroundColor White
    Write-Host "4. Check 'repo' scope" -ForegroundColor White
    Write-Host "5. Generate and copy the token" -ForegroundColor White
    Write-Host ""
    $Token = Read-Host "Paste your token here (will be hidden)"
}

if ($Token -eq "") {
    Write-Host "Error: Token is required" -ForegroundColor Red
    exit 1
}

# Get current remote URL
$remoteUrl = git remote get-url origin
Write-Host "Current remote: $remoteUrl" -ForegroundColor Cyan

# Extract username from remote URL or ask for it
if ($remoteUrl -match "github.com/([^/]+)/") {
    $orgOrUser = $matches[1]
    Write-Host "Detected organization/user: $orgOrUser" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Staging all changes..." -ForegroundColor Yellow
git add -A

Write-Host "Checking status..." -ForegroundColor Yellow
git status --short

Write-Host ""
$commitMsg = Read-Host "Enter commit message (or press Enter for default)"
if ($commitMsg -eq "") {
    $commitMsg = "Update: Complete Vera Deep Upgrade - Enhanced reasoning, persona, language processing, query parsing with British/Scottish influence, and OpenAI removal"
}

Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m $commitMsg

if ($LASTEXITCODE -ne 0) {
    Write-Host "No changes to commit or commit failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setting up remote URL with token..." -ForegroundColor Yellow

# Update remote URL to include token
$newUrl = $remoteUrl -replace "https://", "https://$($Token)@"
git remote set-url origin $newUrl

Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    
    # Restore remote URL to remove token (security)
    Write-Host "Cleaning up remote URL..." -ForegroundColor Yellow
    git remote set-url origin $remoteUrl
    Write-Host "✅ Done!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Push failed. Check your token and try again." -ForegroundColor Red
    Write-Host "Restoring remote URL..." -ForegroundColor Yellow
    git remote set-url origin $remoteUrl
}

