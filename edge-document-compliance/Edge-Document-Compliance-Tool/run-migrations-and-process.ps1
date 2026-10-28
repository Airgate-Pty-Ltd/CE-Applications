# PowerShell script to run migrations first, then process requirements folder
# This ensures the database tables exist before processing files

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EDCAT Database Setup & Processing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set the database URLs
# Replace with your actual Railway database URLs
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway' }
$env:EDCAT_AI_DATABASE_URL = if ($env:EDCAT_AI_DATABASE_URL) { $env:EDCAT_AI_DATABASE_URL } else { $env:DATABASE_URL }

Write-Host "Step 1: Running Database Migrations..." -ForegroundColor Yellow
Write-Host "  DATABASE_URL: $($env:DATABASE_URL -replace ':[^:@]+@', ':****@')" -ForegroundColor Gray
Write-Host ""

# Run migrations using the existing script
Write-Host "Running migrations..." -ForegroundColor Cyan
node backend/src/scripts/run-migrations.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Migrations failed!" -ForegroundColor Red
    Write-Host "Please check your DATABASE_URL and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Migrations completed successfully!" -ForegroundColor Green
Write-Host ""

# Wait a moment for database to be ready
Start-Sleep -Seconds 2

Write-Host "Step 2: Processing Requirements Folder..." -ForegroundColor Yellow
Write-Host ""

# Run the process script
Write-Host "Processing files from backend/EDCAT AIP/Requirements/..." -ForegroundColor Cyan
Write-Host ""
node backend/src/scripts/process-requirements-folder.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ All processing completed successfully!" -ForegroundColor Green
    Write-Host "Your standards should now be visible in the compliance library." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Processing failed with exit code $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
}

