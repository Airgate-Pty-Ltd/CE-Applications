# PowerShell script to create standards table directly

Write-Host ""
Write-Host "Creating Standards Table..." -ForegroundColor Cyan
Write-Host ""

# Set the database URL
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway' }

Write-Host "DATABASE_URL: $($env:DATABASE_URL -replace ':[^:@]+@', ':****@')" -ForegroundColor Gray
Write-Host ""

node backend/src/scripts/create-standards-table-directly.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Standards table created! You can now process files." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Failed to create table" -ForegroundColor Red
}

