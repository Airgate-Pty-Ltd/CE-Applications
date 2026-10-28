# PowerShell script to verify database connections

Write-Host "🔍 Verifying Database Connections..." -ForegroundColor Cyan
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
}

# Run the verification script
node backend/src/scripts/verify-database-connections.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Verification complete!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Verification failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

