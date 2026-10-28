# PowerShell script to analyze and fix standards data

Write-Host ""
Write-Host "Analyzing Standards Data..." -ForegroundColor Cyan
Write-Host ""

# Set the database URL
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway' }

Write-Host "DATABASE_URL: $($env:DATABASE_URL -replace ':[^:@]+@', ':****@')" -ForegroundColor Gray
Write-Host ""

node backend/src/scripts/fix-standards-data.js

