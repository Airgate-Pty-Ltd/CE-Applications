# PowerShell script to drop all orphaned tables from PostgreSQL
# This will clean up the database immediately

Write-Host "🗑️  Dropping Orphaned Tables from PostgreSQL..." -ForegroundColor Yellow
Write-Host ""

node backend/src/scripts/drop-all-orphaned-tables-comprehensive.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Cleanup complete!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Cleanup failed!" -ForegroundColor Red
    exit 1
}

