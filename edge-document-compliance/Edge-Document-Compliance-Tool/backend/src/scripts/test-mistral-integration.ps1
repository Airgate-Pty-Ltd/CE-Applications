# Comprehensive Mistral Integration Test Suite
# Run this script after starting the backend server
# Usage: .\backend\src\scripts\test-mistral-integration.ps1

$baseUrl = "http://localhost:3000"
$testResults = @()

Write-Host "`n🧪 VERA + Mistral Integration Test Suite" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/mistral/health" -Method GET -ErrorAction Stop
    $health = $response.Content | ConvertFrom-Json
    Write-Host "  Status: $($health.status)" -ForegroundColor Green
    Write-Host "  Endpoint: $($health.endpoint)"
    Write-Host "  Model: $($health.model)"
    
    if ($health.status -eq "ok") {
        $testResults += @{ Test = "Health Check"; Result = "PASS"; Details = "Mistral is online" }
        Write-Host "  ✓ PASS" -ForegroundColor Green
    } else {
        $testResults += @{ Test = "Health Check"; Result = "FAIL"; Details = "Status: $($health.status)" }
        Write-Host "  ✗ FAIL" -ForegroundColor Red
    }
} catch {
    $testResults += @{ Test = "Health Check"; Result = "FAIL"; Details = $_.Exception.Message }
    Write-Host "  ✗ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Basic Chat
Write-Host "Test 2: Basic Chat" -ForegroundColor Yellow
try {
    $body = @{
        message = "What is ISO 9001?";
        userId = "test-002";
        conversationId = "test-conv-002"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/api/vera/chat" -Method POST `
        -ContentType "application/json" -Body $body -ErrorAction Stop
    
    $chat = $response.Content | ConvertFrom-Json
    Write-Host "  Success: $($chat.metadata.success)" -ForegroundColor Green
    Write-Host "  Message length: $($chat.answer.Length) chars"
    Write-Host "  Tokens used: $($chat.metadata.tokensUsed)"
    
    if ($chat.answer -and $chat.answer.Length -gt 0) {
        $testResults += @{ Test = "Basic Chat"; Result = "PASS"; Details = "Response generated" }
        Write-Host "  ✓ PASS" -ForegroundColor Green
    } else {
        $testResults += @{ Test = "Basic Chat"; Result = "FAIL"; Details = "Empty response" }
        Write-Host "  ✗ FAIL" -ForegroundColor Red
    }
} catch {
    $testResults += @{ Test = "Basic Chat"; Result = "FAIL"; Details = $_.Exception.Message }
    Write-Host "  ✗ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Clarification Question
Write-Host "Test 3: Clarification Question" -ForegroundColor Yellow
try {
    $body = @{
        requirement = "The organization shall establish and maintain documented information of the extent and nature of risks and opportunities";
        procedure = "Risk register is updated quarterly with identified risks and mitigation plans"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/api/mistral/clarification" -Method POST `
        -ContentType "application/json" -Body $body -ErrorAction Stop
    
    $clarif = $response.Content | ConvertFrom-Json
    Write-Host "  Question: $($clarif.question)" -ForegroundColor Green
    Write-Host "  Tokens: $($clarif.tokensUsed)"
    
    if ($clarif.success -and $clarif.question -and $clarif.question.Length -lt 200) {
        $testResults += @{ Test = "Clarification"; Result = "PASS"; Details = "Question generated" }
        Write-Host "  ✓ PASS" -ForegroundColor Green
    } else {
        $testResults += @{ Test = "Clarification"; Result = "FAIL"; Details = "Invalid response" }
        Write-Host "  ✗ FAIL" -ForegroundColor Red
    }
} catch {
    $testResults += @{ Test = "Clarification"; Result = "FAIL"; Details = $_.Exception.Message }
    Write-Host "  ✗ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Requirement Explanation
Write-Host "Test 4: Requirement Explanation" -ForegroundColor Yellow
try {
    $body = @{
        requirement = "The organization shall determine the external and internal issues relevant to its purpose";
        context = "ISO 9001:2015 Section 4.1"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/api/mistral/explain" -Method POST `
        -ContentType "application/json" -Body $body -ErrorAction Stop
    
    $explain = $response.Content | ConvertFrom-Json
    $preview = if ($explain.explanation.Length -gt 100) { $explain.explanation.Substring(0, 100) + "..." } else { $explain.explanation }
    Write-Host "  Explanation: $preview" -ForegroundColor Green
    
    if ($explain.success -and $explain.explanation -and $explain.explanation.Length -gt 50) {
        $testResults += @{ Test = "Explain"; Result = "PASS"; Details = "Explanation generated" }
        Write-Host "  ✓ PASS" -ForegroundColor Green
    } else {
        $testResults += @{ Test = "Explain"; Result = "FAIL"; Details = "Invalid response" }
        Write-Host "  ✗ FAIL" -ForegroundColor Red
    }
} catch {
    $testResults += @{ Test = "Explain"; Result = "FAIL"; Details = $_.Exception.Message }
    Write-Host "  ✗ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Gap Analysis
Write-Host "Test 5: Gap Analysis" -ForegroundColor Yellow
try {
    $body = @{
        requirement = "The organization shall establish, implement, maintain and continually improve a quality management system";
        procedure = "QMS policies are established and communicated to all departments via the Quality Manual";
        industry = "aerospace"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/api/mistral/gap-analysis" -Method POST `
        -ContentType "application/json" -Body $body -ErrorAction Stop
    
    $gap = $response.Content | ConvertFrom-Json
    Write-Host "  Covers: $($gap.analysis.covers)" -ForegroundColor Green
    Write-Host "  Confidence: $($gap.analysis.confidence)"
    $preview = if ($gap.analysis.reasoning.Length -gt 100) { $gap.analysis.reasoning.Substring(0, 100) + "..." } else { $gap.analysis.reasoning }
    Write-Host "  Reasoning: $preview"
    
    if ($gap.success -and $gap.analysis -and $null -ne $gap.analysis.covers) {
        $testResults += @{ Test = "Gap Analysis"; Result = "PASS"; Details = "Analysis generated" }
        Write-Host "  ✓ PASS" -ForegroundColor Green
    } else {
        $testResults += @{ Test = "Gap Analysis"; Result = "FAIL"; Details = "Invalid response" }
        Write-Host "  ✗ FAIL" -ForegroundColor Red
    }
} catch {
    $testResults += @{ Test = "Gap Analysis"; Result = "FAIL"; Details = $_.Exception.Message }
    Write-Host "  ✗ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 6: Generate Procedure Language
Write-Host "Test 6: Generate Procedure Language" -ForegroundColor Yellow
try {
    $body = @{
        requirement = "Management shall review the quality management system at planned intervals to ensure its continued suitability";
        context = "Quarterly reviews are required"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/api/mistral/generate-procedure" -Method POST `
        -ContentType "application/json" -Body $body -ErrorAction Stop
    
    $genproc = $response.Content | ConvertFrom-Json
    $preview = if ($genproc.suggestedLanguage.Length -gt 150) { $genproc.suggestedLanguage.Substring(0, 150) + "..." } else { $genproc.suggestedLanguage }
    Write-Host "  Suggested Language: $preview" -ForegroundColor Green
    
    if ($genproc.success -and $genproc.suggestedLanguage -and $genproc.suggestedLanguage.Length -gt 50) {
        $testResults += @{ Test = "Generate Procedure"; Result = "PASS"; Details = "Language generated" }
        Write-Host "  ✓ PASS" -ForegroundColor Green
    } else {
        $testResults += @{ Test = "Generate Procedure"; Result = "FAIL"; Details = "Invalid response" }
        Write-Host "  ✗ FAIL" -ForegroundColor Red
    }
} catch {
    $testResults += @{ Test = "Generate Procedure"; Result = "FAIL"; Details = $_.Exception.Message }
    Write-Host "  ✗ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "📊 Test Results Summary" -ForegroundColor Cyan
Write-Host ""

$passCount = ($testResults | Where-Object { $_.Result -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Result -eq "FAIL" }).Count
$totalTests = $testResults.Count

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($passCount -eq $totalTests) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Review the output above." -ForegroundColor Yellow
}

Write-Host ""
