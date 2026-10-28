# PowerShell script to create standard_files table

Write-Host "🔧 Creating standard_files table..." -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:DATABASE_URL = $env:DATABASE_URL
$env:EDCAT_AI_DATABASE_URL = $env:EDCAT_AI_DATABASE_URL

if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL not set" -ForegroundColor Red
    exit 1
}

# Run the script
node backend/src/scripts/create-standard-files-table.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ standard_files table created successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Failed to create standard_files table!" -ForegroundColor Red
    exit 1
}

