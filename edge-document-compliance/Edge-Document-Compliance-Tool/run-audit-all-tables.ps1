# PowerShell script to run comprehensive table audit

Write-Host "🔍 Running Comprehensive Table Audit..." -ForegroundColor Cyan
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

# Run the audit script
Write-Host "🚀 Starting audit..." -ForegroundColor Green
Write-Host ""

node backend/src/scripts/audit-all-tables.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Audit failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "✅ Audit complete! Check TABLE_AUDIT_REPORT.json for detailed results." -ForegroundColor Green

