# Diagnose Vera's Conversational Setup
# This checks if all required data is in the database

# Set the EDCAT AI Database URL
$env:EDCAT_AI_DATABASE_URL = 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway'

Write-Host "Diagnosing Vera's setup..." -ForegroundColor Cyan
Write-Host ""

node backend/src/scripts/diagnose-vera.js

