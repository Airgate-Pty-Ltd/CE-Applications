# PowerShell script to run schema fix

$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { 
    Write-Host "⚠️  DATABASE_URL not set. Please set it before running."
    exit 1
}

$env:EDCAT_AI_DATABASE_URL = if ($env:EDCAT_AI_DATABASE_URL) { $env:EDCAT_AI_DATABASE_URL } else { 
    Write-Host "⚠️  EDCAT_AI_DATABASE_URL not set. Will skip EDCAT AI fixes."
}

Write-Host "🔧 Running comprehensive schema fix..."
Write-Host ""

node backend/src/scripts/fix-all-schema-errors.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Schema fix completed successfully!"
} else {
    Write-Host ""
    Write-Host "❌ Schema fix failed with exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
}

