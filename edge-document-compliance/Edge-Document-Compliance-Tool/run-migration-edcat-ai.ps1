# Run EDCAT AI Migration with Public Database URL
# This creates the missing blueprint tables

# Set the EDCAT AI Database URL (public connection string)
$env:EDCAT_AI_DATABASE_URL = 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway'

Write-Host "Running EDCAT AI migration..." -ForegroundColor Cyan
Write-Host "This will create ai_standard, ai_clause_blueprint, and ai_crosswalk_blueprint tables" -ForegroundColor Gray
Write-Host ""

# Run the migration script
node backend/src/scripts/run-migrations.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "You can now run the seed script to load blueprints." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

