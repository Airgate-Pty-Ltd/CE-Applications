# PowerShell script to check if standards table exists

Write-Host ""
Write-Host "Checking Standards Table in PostgreSQL..." -ForegroundColor Cyan
Write-Host ""

# Set the database URL
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway' }

Write-Host "DATABASE_URL: $($env:DATABASE_URL -replace ':[^:@]+@', ':****@')" -ForegroundColor Gray
Write-Host ""

node backend/src/scripts/check-standards-table-exists.js

