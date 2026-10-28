# PowerShell script to check all standards in database

Write-Host "🔍 Checking all standards in database..." -ForegroundColor Cyan

# Load environment variables from .env if it exists
if (Test-Path ".env") {
    Write-Host "📋 Loading environment variables from .env file..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable is not set!" -ForegroundColor Red
    Write-Host "   Please set DATABASE_URL in your .env file or environment" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ DATABASE_URL is set" -ForegroundColor Green

# Run the Node.js script
Write-Host "🚀 Running check-all-standards-in-database.js..." -ForegroundColor Cyan
node backend/src/scripts/check-all-standards-in-database.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Script completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Script failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

