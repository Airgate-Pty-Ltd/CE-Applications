# PowerShell script to test all database connections

Write-Host "🔍 Testing All Database Connections..." -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:DATABASE_URL = $env:DATABASE_URL
$env:EDCAT_AI_DATABASE_URL = $env:EDCAT_AI_DATABASE_URL

if (-not $env:DATABASE_URL) {
    Write-Host "⚠️  WARNING: DATABASE_URL not set" -ForegroundColor Yellow
}

if (-not $env:EDCAT_AI_DATABASE_URL) {
    Write-Host "⚠️  WARNING: EDCAT_AI_DATABASE_URL not set" -ForegroundColor Yellow
}

# Run the test script
node backend/src/scripts/test-all-database-connections.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ All database connection tests passed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Some database connection tests failed!" -ForegroundColor Red
    exit 1
}

