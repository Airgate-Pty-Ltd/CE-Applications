# PowerShell script to pull Vera's learning standards into parsing tool
# Sets EDCAT_AI_DATABASE_URL and runs the pull script

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Pulling Vera's Learning Standards into Parsing Tool" -ForegroundColor Cyan
Write-Host ""
Write-Host ("=" * 60)

# Check if EDCAT_AI_DATABASE_URL is set
if (-not $env:EDCAT_AI_DATABASE_URL) {
    Write-Host ""
    Write-Host "ERROR: EDCAT_AI_DATABASE_URL not set!" -ForegroundColor Red
    Write-Host "   Please set it first:" -ForegroundColor Yellow
    Write-Host '   $env:EDCAT_AI_DATABASE_URL = "postgresql://user:pass@host:port/database"' -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Or set it in your .env file" -ForegroundColor Yellow
    exit 1
}

Write-Host "EDCAT_AI_DATABASE_URL is set" -ForegroundColor Green
Write-Host "   Running pull script..." -ForegroundColor Gray
Write-Host ""

# Run the npm script
npm run vera:pull-standards

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Successfully pulled Vera's learning standards!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Script failed. Check the error messages above." -ForegroundColor Red
    exit $LASTEXITCODE
}

