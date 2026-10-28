# PowerShell script to trigger Requirements folder processing via API

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Trigger Requirements Processing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the Railway URL from environment or use default
$apiUrl = if ($env:RAILWAY_URL) { $env:RAILWAY_URL } else { "https://edcat-administrator-production.up.railway.app" }

Write-Host "Calling API endpoint: $apiUrl/api/admin/process-requirements" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$apiUrl/api/admin/process-requirements" -Method POST -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 3)
    Write-Host ""
    Write-Host "Processing is running in the background. Check Railway logs for progress." -ForegroundColor Gray
} catch {
    Write-Host "❌ Error calling API:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
    exit 1
}

