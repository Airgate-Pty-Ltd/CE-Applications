# PowerShell script to run cleanup of Examples folder errors
# This removes all standards and files that were incorrectly added from Examples folder

# Set the EDCAT AI Database URL (for standards and learning data)
$env:EDCAT_AI_DATABASE_URL = 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway'

# Set the Customer Data Database URL (for standard_files table)
# Use the same URL for now - both databases might be on the same server
# If you have a separate Customer Data DB URL, replace this
$env:DATABASE_URL = $env:EDCAT_AI_DATABASE_URL

Write-Host ""
Write-Host "🧹 Running cleanup of Examples folder errors..." -ForegroundColor Cyan
Write-Host ""
Write-Host "EDCAT_AI_DATABASE_URL set" -ForegroundColor Green
Write-Host "Connecting to: tramway.proxy.rlwy.net:53952" -ForegroundColor Gray
Write-Host "DATABASE_URL set (using same connection)" -ForegroundColor Green
Write-Host ""

# Navigate to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Run the cleanup script
node backend/src/scripts/cleanup-examples-folder-errors.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Cleanup completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Cleanup failed. Check the error messages above." -ForegroundColor Red
    exit 1
}

