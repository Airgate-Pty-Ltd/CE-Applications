# PowerShell script to run cleanup-standards-without-files.js
# Removes standards that don't have actual files uploaded

Write-Host "🧹 Running cleanup script to remove standards without files..." -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:EDCAT_AI_DATABASE_URL = "postgresql://postgres:$(Get-Content .env | Select-String 'EDCAT_AI_DATABASE_URL' | ForEach-Object { ($_ -split '=')[1] })"
$env:DATABASE_URL = "postgresql://postgres:$(Get-Content .env | Select-String 'DATABASE_URL' | ForEach-Object { ($_ -split '=')[1] })"

# If .env file doesn't exist or variables aren't set, try to get from environment
if (-not $env:EDCAT_AI_DATABASE_URL -or $env:EDCAT_AI_DATABASE_URL -eq "") {
    Write-Host "⚠️  EDCAT_AI_DATABASE_URL not found in .env, using environment variable" -ForegroundColor Yellow
}

if (-not $env:DATABASE_URL -or $env:DATABASE_URL -eq "") {
    Write-Host "⚠️  DATABASE_URL not found in .env, using environment variable" -ForegroundColor Yellow
}

# Run the cleanup script
node backend/src/scripts/cleanup-standards-without-files.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Cleanup completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Cleanup failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

