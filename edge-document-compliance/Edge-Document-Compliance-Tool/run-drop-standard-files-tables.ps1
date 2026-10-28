# PowerShell script to drop standard_files and standard_files_content tables

Write-Host "Dropping standard_files and standard_files_content tables..." -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env if it exists
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env file..." -ForegroundColor Yellow
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
    Write-Host "ERROR: DATABASE_URL environment variable is not set!" -ForegroundColor Red
    Write-Host "   Please set DATABASE_URL in your .env file or environment" -ForegroundColor Yellow
    exit 1
}

Write-Host "DATABASE_URL is set" -ForegroundColor Green
Write-Host ""

# Run the Node.js script
Write-Host "Running drop-standard-files-tables.js..." -ForegroundColor Cyan
node backend/src/scripts/drop-standard-files-tables.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Tables dropped successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Script failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
