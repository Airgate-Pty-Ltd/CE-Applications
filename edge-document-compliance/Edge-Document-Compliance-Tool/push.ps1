# Simple push script with file output
$resultFile = Join-Path $PWD "push-result.txt"
"=== PUSH STARTED $(Get-Date) ===" | Out-File $resultFile

try {
    "Staging..." | Out-File $resultFile -Append
    git add -A 2>&1 | Out-File $resultFile -Append
    
    "Committing..." | Out-File $resultFile -Append
    git commit -m "Fix: Health check server startup for Railway" 2>&1 | Out-File $resultFile -Append
    
    "Pushing..." | Out-File $resultFile -Append
    git push origin main 2>&1 | Out-File $resultFile -Append
    
    if ($LASTEXITCODE -eq 0) {
        "RESULT: SUCCESS" | Out-File $resultFile -Append
        "Exit code: 0" | Out-File $resultFile -Append
    } else {
        "RESULT: FAILED" | Out-File $resultFile -Append
        "Exit code: $LASTEXITCODE" | Out-File $resultFile -Append
    }
} catch {
    "RESULT: ERROR - $($_.Exception.Message)" | Out-File $resultFile -Append
}

"=== PUSH COMPLETE ===" | Out-File $resultFile -Append

