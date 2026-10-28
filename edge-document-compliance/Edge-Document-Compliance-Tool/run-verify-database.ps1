# PowerShell script to verify database connection and data

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verify Database Connection & Data" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env if it exists
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Gray
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
                $value = $matches[1]
            }
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL environment variable is not set!" -ForegroundColor Red
    Write-Host "Please set it in your .env file or as an environment variable." -ForegroundColor Yellow
    exit 1
}

Write-Host "Running verification script..." -ForegroundColor Cyan
Write-Host ""

node backend/src/scripts/verify-database-connection-and-data.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Verification failed!" -ForegroundColor Red
    exit 1
}

