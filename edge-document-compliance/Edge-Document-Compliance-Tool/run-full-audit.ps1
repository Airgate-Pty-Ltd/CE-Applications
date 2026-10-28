# PowerShell script to run comprehensive system audit

Write-Host "`n=== COMPREHENSIVE SYSTEM AUDIT ===" -ForegroundColor Cyan
Write-Host "Testing ALL load and save points...`n" -ForegroundColor Yellow

# Load environment variables from .env if it exists
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Gray
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Verify DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Host "ERROR: DATABASE_URL not set!" -ForegroundColor Red
    exit 1
}

# Run the audit
node backend/src/scripts/comprehensive-system-audit.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nAudit completed!" -ForegroundColor Green
} else {
    Write-Host "`nAudit failed with errors!" -ForegroundColor Red
}

