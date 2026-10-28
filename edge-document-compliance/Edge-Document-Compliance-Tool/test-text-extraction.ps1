# PowerShell Script: Extract Text from PDF and Display First 1500 Characters
# 
# Usage:
#   .\test-text-extraction.ps1 -FilePath "path\to\as9100.pdf"
#   .\test-text-extraction.ps1 "path\to\as9100.pdf"

param(
    [Parameter(Position=0)]
    [string]$FilePath
)

# Check if file path was provided
if (-not $FilePath) {
    Write-Host "Usage: .\test-text-extraction.ps1 -FilePath `"path\to\file.pdf`"" -ForegroundColor Yellow
    Write-Host "   Or: .\test-text-extraction.ps1 `"path\to\file.pdf`"" -ForegroundColor Yellow
    exit 1
}

# Check if file exists
if (-not (Test-Path $FilePath)) {
    Write-Host "Error: File not found: $FilePath" -ForegroundColor Red
    exit 1
}

Write-Host "`nExtracting text from: $FilePath" -ForegroundColor Cyan
Write-Host ("=" * 60)

# Create a temporary Node.js script to extract text
$tempScript = @"
import TextExtractor from './backend/src/services/textExtractor.js';

async function extractText() {
  try {
    const extractor = new TextExtractor();
    const text = await extractor.extractFromFile('$($FilePath.Replace('\', '/'))');
    
    console.log('SUCCESS');
    console.log('TOTAL_LENGTH:' + text.length);
    console.log('FIRST_1500:');
    console.log(text.substring(0, 1500));
    
    if (text.length > 1500) {
      console.log('REMAINING:' + (text.length - 1500));
    }
    
    // Show statistics
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    console.log('STATS_LINES:' + lines.length);
    console.log('STATS_WORDS:' + text.split(/\s+/).filter(w => w.length > 0).length);
    
    // Show first 10 non-empty lines
    console.log('FIRST_LINES:');
    lines.slice(0, 10).forEach((line, idx) => {
      const display = line.substring(0, 80) + (line.length > 80 ? '...' : '');
      console.log((idx + 1) + '. ' + display);
    });
    
  } catch (error) {
    console.error('ERROR:' + error.message);
    process.exit(1);
  }
}

extractText();
"@

# Write temp script to file
$tempScriptPath = Join-Path $env:TEMP "extract-text-$(Get-Random).js"
$tempScript | Out-File -FilePath $tempScriptPath -Encoding UTF8

try {
    # Run the Node.js script
    Write-Host "Running text extraction..." -ForegroundColor Green
    $output = node $tempScriptPath 2>&1
    
    # Parse output
    $inFirst1500 = $false
    $first1500 = ""
    $stats = @{}
    $firstLines = @()
    $inFirstLines = $false
    
    foreach ($line in $output) {
        if ($line -eq "FIRST_1500:") {
            $inFirst1500 = $true
            continue
        }
        if ($inFirst1500 -and $line -ne "REMAINING:" -and -not $line.StartsWith("STATS_") -and -not $line.StartsWith("FIRST_LINES:") -and -not $line -match "^\d+\. ") {
            $first1500 += $line + "`n"
            continue
        }
        if ($line -eq "REMAINING:") {
            $inFirst1500 = $false
            continue
        }
        if ($line -match "^STATS_(\w+):(.+)$") {
            $stats[$matches[1]] = $matches[2]
            continue
        }
        if ($line -eq "FIRST_LINES:") {
            $inFirstLines = $true
            continue
        }
        if ($inFirstLines -and $line -match "^\d+\. (.+)$") {
            $firstLines += $matches[1]
            continue
        }
        if ($line -match "^TOTAL_LENGTH:(.+)$") {
            $stats["TOTAL_LENGTH"] = $matches[1]
            continue
        }
        if ($line -match "^REMAINING:(.+)$") {
            $stats["REMAINING"] = $matches[1]
            continue
        }
    }
    
    # Display results
    Write-Host "`nSuccessfully extracted text!" -ForegroundColor Green
    Write-Host ("=" * 60)
    Write-Host "`nFirst 1500 characters:" -ForegroundColor Cyan
    Write-Host ("-" * 60)
    Write-Host $first1500
    Write-Host ("-" * 60)
    
    if ($stats.REMAINING) {
        Write-Host "`n... ($($stats.REMAINING) more characters)" -ForegroundColor Gray
    }
    
    Write-Host "`nText Statistics:" -ForegroundColor Cyan
    Write-Host "   Total characters: $($stats.TOTAL_LENGTH)"
    Write-Host "   Total lines: $($stats.STATS_LINES)"
    Write-Host "   Total words: $($stats.STATS_WORDS)"
    
    if ($firstLines.Count -gt 0) {
        Write-Host "`nFirst 10 non-empty lines:" -ForegroundColor Cyan
        for ($i = 0; $i -lt $firstLines.Count; $i++) {
            Write-Host "   $($i + 1). $($firstLines[$i])"
        }
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clean up temp file
    if (Test-Path $tempScriptPath) {
        Remove-Item $tempScriptPath -Force
    }
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan

