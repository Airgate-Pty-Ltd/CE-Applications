# PowerShell script to run cleanup migration directly
# This will remove all orphaned tables immediately

Write-Host "🗑️  Running Cleanup Migration to Remove Orphaned Tables..." -ForegroundColor Yellow
Write-Host ""

node backend/src/scripts/run-cleanup-migration-now.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Cleanup complete!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Cleanup failed!" -ForegroundColor Red
    exit 1
}

