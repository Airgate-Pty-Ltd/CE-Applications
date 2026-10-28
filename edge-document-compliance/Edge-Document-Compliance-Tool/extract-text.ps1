# Simple PowerShell Script: Extract Text from PDF
# Usage: .\extract-text.ps1 "path\to\file.pdf"
#        .\extract-text.ps1 "uploads\as9100.pdf"

param(
    [Parameter(Mandatory=$false)]
    [string]$FilePath
)

# If no file path provided, show usage
if (-not $FilePath) {
    Write-Host "Usage: .\extract-text.ps1 `"path\to\file.pdf`"" -ForegroundColor Yellow
    Write-Host "   Or: .\extract-text.ps1 `"uploads\filename.pdf`"" -ForegroundColor Yellow
    Write-Host ""
    
    # Check if uploads directory exists and show available files
    $uploadsPath = Join-Path $PSScriptRoot "uploads"
    if (Test-Path $uploadsPath) {
        Write-Host "Available files in 'uploads' directory:" -ForegroundColor Cyan
        $pdfFiles = Get-ChildItem -Path $uploadsPath -Filter "*.pdf" -ErrorAction SilentlyContinue
        if ($pdfFiles) {
            foreach ($file in $pdfFiles) {
                Write-Host "   - uploads\$($file.Name)" -ForegroundColor Gray
            }
        } else {
            Write-Host "   (No PDF files found)" -ForegroundColor Gray
        }
    }
    exit 1
}

# Resolve relative paths
if (-not [System.IO.Path]::IsPathRooted($FilePath)) {
    $FilePath = Join-Path $PSScriptRoot $FilePath
}

# Check if file exists
if (-not (Test-Path $FilePath)) {
    Write-Host "Error: File not found: $FilePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tip: Use a relative path from the project root, e.g.:" -ForegroundColor Yellow
    Write-Host "   .\extract-text.ps1 `"uploads\your-file.pdf`"" -ForegroundColor Gray
    exit 1
}

Write-Host "`nExtracting text from: $FilePath" -ForegroundColor Cyan
Write-Host ("=" * 60)

# Use the Node.js test script
$scriptPath = Join-Path $PSScriptRoot "backend\src\scripts\test-text-extraction.js"

if (-not (Test-Path $scriptPath)) {
    Write-Host "Error: Test script not found at: $scriptPath" -ForegroundColor Red
    exit 1
}

# Run the Node.js script with the file path
node $scriptPath $FilePath

