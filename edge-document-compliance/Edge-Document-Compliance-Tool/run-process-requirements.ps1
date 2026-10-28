# PowerShell script to run process-requirements-folder.js
# Sets required environment variables and runs the script

# Set the EDCAT AI Database URL (for standards and learning data)
$env:EDCAT_AI_DATABASE_URL = 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway'

# Set the Customer Data Database URL (for standard_files table)
# Use the same URL for now - both databases might be on the same server
# If you have a separate Customer Data DB URL, replace this
$env:DATABASE_URL = $env:EDCAT_AI_DATABASE_URL

Write-Host ""
Write-Host "Processing Requirements Folder..." -ForegroundColor Cyan
Write-Host ""
Write-Host "EDCAT_AI_DATABASE_URL set" -ForegroundColor Green
Write-Host "Connecting to: tramway.proxy.rlwy.net:53952" -ForegroundColor Gray
Write-Host "DATABASE_URL set (using same connection)" -ForegroundColor Green
Write-Host ""

# Run the script
Write-Host "Running process-requirements-folder.js..." -ForegroundColor Cyan
Write-Host ""
node backend/src/scripts/process-requirements-folder.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Script completed successfully!" -ForegroundColor Green
    Write-Host "All files should now be visible in the compliance library" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Script failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
