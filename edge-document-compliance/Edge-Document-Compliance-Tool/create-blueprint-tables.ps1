# Create Blueprint Tables Directly
# This bypasses migration file parsing and creates tables directly

# Set the EDCAT AI Database URL (public connection string)
$env:EDCAT_AI_DATABASE_URL = 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway'

Write-Host "Creating blueprint tables directly..." -ForegroundColor Cyan
Write-Host "This will create:" -ForegroundColor Gray
Write-Host "  - ai_standard" -ForegroundColor Gray
Write-Host "  - ai_clause_blueprint" -ForegroundColor Gray
Write-Host "  - ai_crosswalk_blueprint" -ForegroundColor Gray
Write-Host ""

# Run the direct table creation script
node backend/src/scripts/create-blueprint-tables.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Tables created successfully!" -ForegroundColor Green
    Write-Host "You can now run the seed script to load blueprints." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Table creation failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

