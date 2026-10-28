# Run Vera Seed Script with Railway Database
# This script sets the database URL and runs the seed script

# Set the EDCAT AI Database URL (public connection string)
$env:EDCAT_AI_DATABASE_URL = 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway'

# Verify it's set
Write-Host "Database URL set" -ForegroundColor Green
Write-Host "Connecting to: tramway.proxy.rlwy.net:53952" -ForegroundColor Gray

# Run the seed script
Write-Host ""
Write-Host "Running seed script..." -ForegroundColor Cyan
Write-Host ""
npm run seed:personality

# Check exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Seed script completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Seed script failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}
