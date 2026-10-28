# Auto-commit and push script for Windows
# Usage: .\scripts\auto-commit.ps1 "Your commit message"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

Write-Host "📝 Staging all changes..." -ForegroundColor Cyan
git add .

Write-Host "💾 Committing changes..." -ForegroundColor Cyan
git commit -m $Message

# The post-commit hook will automatically push
Write-Host "✅ Changes committed and pushed to GitHub!" -ForegroundColor Green
Write-Host "🚂 Railway will automatically deploy from GitHub..." -ForegroundColor Yellow

