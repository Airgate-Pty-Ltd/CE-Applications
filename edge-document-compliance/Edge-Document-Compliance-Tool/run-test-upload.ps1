# PowerShell script to test upload flow

Write-Host "`n🧪 Testing Upload Flow...`n" -ForegroundColor Cyan

if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL not set!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment variables configured`n" -ForegroundColor Green

node backend/src/scripts/test-upload-flow.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Test completed!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Test failed" -ForegroundColor Red
    exit $LASTEXITCODE
}

