# PowerShell script to remove dead-end tables

Write-Host "🗑️  Removing Dead-End Tables..." -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env if it exists
if (Test-Path ".env") {
    Write-Host "📄 Loading environment variables from .env file..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Check for required environment variables
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable is not set!" -ForegroundColor Red
    Write-Host "   Please set DATABASE_URL in your .env file or environment." -ForegroundColor Yellow
    exit 1
}

if (-not $env:EDCAT_AI_DATABASE_URL) {
    Write-Host "⚠️  WARNING: EDCAT_AI_DATABASE_URL not set, using DATABASE_URL for both" -ForegroundColor Yellow
}

# Run the cleanup script
Write-Host "🚀 Starting dead-end table removal..." -ForegroundColor Green
Write-Host ""

node backend/src/scripts/remove-dead-end-tables.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Removal failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "✅ Dead-end table removal complete!" -ForegroundColor Green

