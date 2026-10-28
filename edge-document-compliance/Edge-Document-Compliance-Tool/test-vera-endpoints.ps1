# Vera Endpoint Testing Script
# Usage: .\test-vera-endpoints.ps1 [baseUrl]

param(
    [string]$BaseUrl = "http://localhost:8080"
)

Write-Host "`n[TEST] Testing Vera Endpoints`n"
Write-Host "Base URL: $BaseUrl`n"
Write-Host ("=" * 60)

# Test 1: Validation
Write-Host "`n[1] Testing GET /api/vera/validate...`n"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/vera/validate" -Method GET -ErrorAction Stop
    Write-Host "[OK] Validation endpoint working!"
    Write-Host "   Success: $($response.success)"
    Write-Host "   Tests Passed: $($response.validation.summary.passed)/$($response.validation.summary.total)"
} catch {
    Write-Host "[FAIL] Validation endpoint failed: $($_.Exception.Message)"
}

# Test 2: Diagnostics
Write-Host "`n[2] Testing GET /api/vera/diagnostics...`n"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/vera/diagnostics" -Method GET -ErrorAction Stop
    Write-Host "[OK] Diagnostics endpoint working!"
    Write-Host "   Total Tables: $($response.diagnostics.summary.totalTables)"
    Write-Host "   Existing: $($response.diagnostics.summary.existingTables)"
    Write-Host "   Missing: $($response.diagnostics.summary.missingTables)"
} catch {
    Write-Host "[FAIL] Diagnostics endpoint failed: $($_.Exception.Message)"
}

# Test 3: Standards
Write-Host "`n[3] Testing GET /api/vera/standards...`n"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/vera/standards" -Method GET -ErrorAction Stop
    Write-Host "[OK] Standards endpoint working!"
    Write-Host "   Standards Found: $($response.standards.Count)"
} catch {
    Write-Host "[FAIL] Standards endpoint failed: $($_.Exception.Message)"
}

# Test 4: Chat (if standards exist)
Write-Host "`n[4] Testing POST /api/chat...`n"
try {
    $body = @{
        message = "Hello Vera, what are your capabilities?"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/api/chat" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "[OK] Chat endpoint working!"
    Write-Host "   Response length: $($response.response.Length) characters"
} catch {
    Write-Host "[FAIL] Chat endpoint failed: $($_.Exception.Message)"
}

Write-Host ""
Write-Host ("=" * 60)
Write-Host ""
Write-Host "[OK] Testing complete!" -ForegroundColor Green
Write-Host ""

