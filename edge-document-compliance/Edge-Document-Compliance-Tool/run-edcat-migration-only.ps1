# Run ONLY EDCAT AI Migration to create blueprint tables
# This creates ai_standard, ai_clause_blueprint, and ai_crosswalk_blueprint

# Set the EDCAT AI Database URL (public connection string)
$env:EDCAT_AI_DATABASE_URL = 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway'

# Set a dummy DATABASE_URL (script requires it, but we won't use it)
$env:DATABASE_URL = $env:EDCAT_AI_DATABASE_URL

Write-Host "Running EDCAT AI migration only..." -ForegroundColor Cyan
Write-Host "This will create blueprint tables:" -ForegroundColor Gray
Write-Host "  - ai_standard" -ForegroundColor Gray
Write-Host "  - ai_clause_blueprint" -ForegroundColor Gray
Write-Host "  - ai_crosswalk_blueprint" -ForegroundColor Gray
Write-Host ""

# Run the direct blueprint table creation script
Write-Host "Using direct table creation (bypasses migration parsing issues)..." -ForegroundColor Yellow
node backend/src/scripts/create-blueprint-tables.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "You can now run the seed script to load blueprints." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

