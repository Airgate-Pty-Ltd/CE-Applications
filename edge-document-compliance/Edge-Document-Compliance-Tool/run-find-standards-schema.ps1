# PowerShell script to find standards table schema

Write-Host ""
Write-Host "Finding Standards Table Schema..." -ForegroundColor Cyan
Write-Host ""

# Set the database URL
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway' }

Write-Host "DATABASE_URL: $($env:DATABASE_URL -replace ':[^:@]+@', ':****@')" -ForegroundColor Gray
Write-Host ""

node backend/src/scripts/find-standards-table-schema.js

