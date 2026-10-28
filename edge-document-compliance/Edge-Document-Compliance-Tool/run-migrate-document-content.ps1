# PowerShell script to run document content migration
# Migrates document_content_for_learning from EDCAT AI DB to PostgreSQL

Write-Host "`n📦 Starting Document Content Migration...`n" -ForegroundColor Cyan

# Check for required environment variables
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL not set!" -ForegroundColor Red
    Write-Host "   Please set DATABASE_URL in your environment or .env file" -ForegroundColor Yellow
    exit 1
}

if (-not $env:EDCAT_AI_DATABASE_URL) {
    Write-Host "❌ EDCAT_AI_DATABASE_URL not set!" -ForegroundColor Red
    Write-Host "   Please set EDCAT_AI_DATABASE_URL in your environment or .env file" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Environment variables configured" -ForegroundColor Green
Write-Host "   DATABASE_URL: $($env:DATABASE_URL.Substring(0, [Math]::Min(50, $env:DATABASE_URL.Length)))..." -ForegroundColor Gray
Write-Host "   EDCAT_AI_DATABASE_URL: $($env:EDCAT_AI_DATABASE_URL.Substring(0, [Math]::Min(50, $env:EDCAT_AI_DATABASE_URL.Length)))...`n" -ForegroundColor Gray

# Run the migration script
Write-Host "🚀 Running migration script...`n" -ForegroundColor Cyan

node backend/src/scripts/migrate-document-content-to-postgres.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Migration failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

