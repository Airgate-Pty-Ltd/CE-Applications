# PowerShell script to run diagnose-standards-not-loading.js

Write-Host "🔍 Running standards diagnosis script..." -ForegroundColor Cyan

# Check if .env file exists and load environment variables
if (Test-Path ".env") {
    Write-Host "📄 Loading environment variables from .env file..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)\s*=\s*(.+)\s*$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
                    Write-Host "   Loaded: $name" -ForegroundColor Gray
        }
    }
}

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable is not set!" -ForegroundColor Red
    Write-Host "💡 Please set DATABASE_URL in your .env file or environment" -ForegroundColor Yellow
    exit 1
}

# Run the Node.js script
Write-Host ""
node backend/src/scripts/comprehensive-system-audit.js
