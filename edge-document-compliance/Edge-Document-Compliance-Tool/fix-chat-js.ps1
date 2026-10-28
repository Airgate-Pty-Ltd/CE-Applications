# PowerShell script to commit and push chat.js fix
# Run this from PowerShell: .\fix-chat-js.ps1

Write-Host "=== Fixing chat.js Duplicate Declaration ===" -ForegroundColor Green

# Change to project directory
Set-Location "C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator"

# Check if file exists
if (-not (Test-Path "backend/src/routes/chat.js")) {
    Write-Host "ERROR: chat.js not found!" -ForegroundColor Red
    exit 1
}

# Verify the fix is in place
$content = Get-Content "backend/src/routes/chat.js" -Raw
if ($content -match "const conversationalEngine = getVeraConversationalEngine\(\);") {
    $matches = [regex]::Matches($content, "const conversationalEngine = getVeraConversationalEngine\(\);")
    if ($matches.Count -gt 1) {
        Write-Host "ERROR: Still has duplicate declarations!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ File verified - only one declaration found" -ForegroundColor Green

# Stage the file
Write-Host "Staging file..." -ForegroundColor Yellow
git add backend/src/routes/chat.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: git add failed!" -ForegroundColor Red
    exit 1
}

# Commit
Write-Host "Committing..." -ForegroundColor Yellow
git commit -m "Fix: Remove duplicate conversationalEngine declaration in chat.js"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: git commit failed!" -ForegroundColor Red
    exit 1
}

# Push
Write-Host "Pushing to origin/main..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: git push failed!" -ForegroundColor Red
    exit 1
}

Write-Host "=== SUCCESS! Fix has been pushed ===" -ForegroundColor Green

