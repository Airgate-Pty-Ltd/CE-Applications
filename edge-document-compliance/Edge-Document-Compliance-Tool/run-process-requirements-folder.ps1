# PowerShell script to process Requirements folder and load files into database

Write-Host "📁 Processing Requirements Folder..." -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:DATABASE_URL = $env:DATABASE_URL
$env:EDCAT_AI_DATABASE_URL = $env:EDCAT_AI_DATABASE_URL

if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL not set" -ForegroundColor Red
    exit 1
}

if (-not $env:EDCAT_AI_DATABASE_URL) {
    Write-Host "❌ ERROR: EDCAT_AI_DATABASE_URL not set" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Scanning Requirements folder..." -ForegroundColor Yellow
Write-Host "   Standards: backend/EDCAT AIP/Requirements/Standards/" -ForegroundColor Gray
Write-Host "   Regulatory: backend/EDCAT AIP/Requirements/Regulatory/" -ForegroundColor Gray
Write-Host "   Customer: backend/EDCAT AIP/Requirements/Customer/" -ForegroundColor Gray
Write-Host ""

# Run the script
node backend/src/scripts/process-requirements-folder.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Requirements folder processed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Files should now be:" -ForegroundColor Cyan
    Write-Host "   - Registered in standard_files table (Customer Data DB)" -ForegroundColor Gray
    Write-Host "   - Linked to standards in standards table (EDCAT AI DB)" -ForegroundColor Gray
    Write-Host "   - Available for parsing in the Requirements Library" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Failed to process Requirements folder!" -ForegroundColor Red
    exit 1
}

