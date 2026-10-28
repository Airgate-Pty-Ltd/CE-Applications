# PowerShell script to run comprehensive connection diagnosis

Write-Host ""
Write-Host "Running Comprehensive Connection Diagnosis..." -ForegroundColor Cyan
Write-Host ""

# Set environment variables from .env if it exists
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "Loaded environment variables from .env file" -ForegroundColor Green
} else {
    Write-Host "Warning: .env file not found, using system environment variables" -ForegroundColor Yellow
}

if (-not $env:DATABASE_URL) {
    Write-Host ""
    Write-Host "ERROR: DATABASE_URL not set!" -ForegroundColor Red
    Write-Host "Please set DATABASE_URL in .env file or as environment variable" -ForegroundColor Yellow
    exit 1
}

Write-Host "Environment variables configured" -ForegroundColor Green
Write-Host ""

node backend/src/scripts/diagnose-complete-connection.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Diagnosis completed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Diagnosis failed" -ForegroundColor Red
    exit $LASTEXITCODE
}
