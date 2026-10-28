# PowerShell Script: Find PDF Files in Project
# Usage: .\find-pdf-files.ps1

Write-Host "`nSearching for PDF files in project..." -ForegroundColor Cyan
Write-Host ("=" * 60)

$foundFiles = @()

# Search in common locations
$searchPaths = @(
    "uploads",
    "uploads\documents",
    "backend\data",
    "data",
    "."
)

foreach ($searchPath in $searchPaths) {
    $fullPath = Join-Path $PSScriptRoot $searchPath
    if (Test-Path $fullPath) {
        $pdfFiles = Get-ChildItem -Path $fullPath -Filter "*.pdf" -Recurse -ErrorAction SilentlyContinue
        foreach ($file in $pdfFiles) {
            $relativePath = $file.FullName.Replace($PSScriptRoot, "").TrimStart('\')
            $foundFiles += $relativePath
            Write-Host "Found: $relativePath" -ForegroundColor Green
            Write-Host "   Size: $([math]::Round($file.Length / 1KB, 2)) KB" -ForegroundColor Gray
            Write-Host "   Modified: $($file.LastWriteTime)" -ForegroundColor Gray
        }
    }
}

if ($foundFiles.Count -eq 0) {
    Write-Host "`nNo PDF files found in common locations." -ForegroundColor Yellow
    Write-Host "`nTo extract text from a PDF, you can:" -ForegroundColor Cyan
    Write-Host "   1. Place your PDF file in the 'uploads' directory" -ForegroundColor Gray
    Write-Host "   2. Run: .\extract-text.ps1 `"uploads\your-file.pdf`"" -ForegroundColor Gray
    Write-Host "   3. Or use a full path: .\extract-text.ps1 `"C:\path\to\file.pdf`"" -ForegroundColor Gray
} else {
    Write-Host "`nTotal PDF files found: $($foundFiles.Count)" -ForegroundColor Cyan
    Write-Host "`nTo extract text from any of these files, run:" -ForegroundColor Yellow
    Write-Host "   .\extract-text.ps1 `"$($foundFiles[0])`"" -ForegroundColor Green
}

Write-Host ""

