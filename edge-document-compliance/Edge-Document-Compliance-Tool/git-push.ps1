# Git Push Script with Clear Output
# This script pushes to GitHub and writes results to a file for verification

param(
    [string]$Message = "Auto-commit and push"
)

$ErrorActionPreference = "Continue"
$outputFile = "git-push-result.txt"

# Clear previous result
"" | Out-File $outputFile -Encoding utf8

function Write-Result {
    param([string]$line)
    $line | Out-File $outputFile -Append -Encoding utf8
    Write-Host $line
}

Write-Result "=== Git Push Script Started ==="
Write-Result "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Step 1: Check git status
Write-Result "`n--- Step 1: Checking status ---"
$status = git status --porcelain 2>&1 | Out-String
Write-Result "Status: $status"

# Step 2: Add all changes
Write-Result "`n--- Step 2: Staging changes ---"
git add -A 2>&1 | Out-String | Out-File $outputFile -Append -Encoding utf8
if ($LASTEXITCODE -eq 0) {
    Write-Result "✓ Files staged successfully"
} else {
    Write-Result "✗ Failed to stage files (exit code: $LASTEXITCODE)"
}

# Step 3: Commit if there are changes
Write-Result "`n--- Step 3: Committing changes ---"
$changes = git diff --cached --name-only
if ($changes) {
    git commit -m $Message 2>&1 | Out-String | Out-File $outputFile -Append -Encoding utf8
    if ($LASTEXITCODE -eq 0) {
        Write-Result "✓ Commit successful"
        $commitHash = git rev-parse HEAD
        Write-Result "Commit hash: $commitHash"
    } else {
        Write-Result "✗ Commit failed (exit code: $LASTEXITCODE)"
        Write-Result "RESULT: FAILED"
        exit $LASTEXITCODE
    }
} else {
    Write-Result "No changes to commit"
}

# Step 4: Ensure remote is configured
Write-Result "`n--- Step 4: Checking remote configuration ---"
$remoteUrl = git config --get remote.origin.url
Write-Result "Remote URL: $remoteUrl"

# Step 5: Push to GitHub
Write-Result "`n--- Step 5: Pushing to GitHub ---"
$pushOutput = git push origin main 2>&1 | Out-String
$pushOutput | Out-File $outputFile -Append -Encoding utf8
Write-Result "Push output:"
Write-Result $pushOutput

if ($LASTEXITCODE -eq 0) {
    Write-Result "`n✓✓✓ PUSH SUCCESSFUL ✓✓✓"
    Write-Result "RESULT: SUCCESS"
    
    # Verify by checking remote
    git fetch origin main 2>&1 | Out-Null
    $localHash = git rev-parse HEAD
    $remoteHash = git rev-parse origin/main 2>&1
    Write-Result "Local hash:  $localHash"
    Write-Result "Remote hash: $remoteHash"
    
    if ($localHash -eq $remoteHash) {
        Write-Result "✓ Verification: Local and remote are in sync"
    } else {
        Write-Result "⚠ Verification: Hashes differ (may need time to propagate)"
    }
} else {
    Write-Result "`n✗✗✗ PUSH FAILED ✗✗✗"
    Write-Result "Exit code: $LASTEXITCODE"
    Write-Result "RESULT: FAILED"
    exit $LASTEXITCODE
}

Write-Result "`n=== Script Complete ==="

