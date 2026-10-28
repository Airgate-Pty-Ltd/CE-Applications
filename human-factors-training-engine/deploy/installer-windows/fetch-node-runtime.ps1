# Copyright (c) 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
# This source code is proprietary and confidential. Unauthorized copying,
# distribution, or use of this file, via any medium, is strictly prohibited
# without prior written permission from Conform-Edge Quality Consulting LLC.
# See LICENSE and NOTICE at the repository root.
#
# Standalone Packaging Directive, G2: downloads and verifies the portable Node.js runtime
# that gets embedded in the installer, so the target machine needs no pre-installed Node.
# Pinned to a specific version plus published SHA-256 for reproducibility - never fetches
# "latest". Re-run this any time runtime/ is missing or you want to bump the pinned version
# (update $NodeVersion and $ExpectedSha256 together, from the SHASUMS256.txt for that release
# at https://nodejs.org/dist/<version>/SHASUMS256.txt).
#
# This is a BUILD-TIME step (assembling the installer), not something the shipped product
# does - the packaged app makes no outbound network calls at runtime (see
# docs/03-architecture/DEPENDENCY-FOOTPRINT.md).
#
# ASCII-only in every string literal, deliberately - a Unicode em-dash inside a
# double-quoted string in a sibling script (start.ps1) mis-decoded under this build
# machine's default console encoding and threw a parse error. See DECISIONS.md.

$ErrorActionPreference = "Stop"

$NodeVersion = "v20.20.2"
$ExpectedSha256 = "dc3700fdd57a63eedb8fd7e3c7baaa32e6a740a1b904167ff4204bc68ed8bf77"
$ArchiveName = "node-$NodeVersion-win-x64.zip"
$Url = "https://nodejs.org/dist/$NodeVersion/$ArchiveName"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $ScriptDir "runtime"
$TargetDir = Join-Path $RuntimeDir "node-win-x64"
$TempZip = Join-Path $env:TEMP $ArchiveName

if (Test-Path (Join-Path $TargetDir "node.exe")) {
    $existingVersion = & (Join-Path $TargetDir "node.exe") --version
    if ($existingVersion.Trim() -eq $NodeVersion) {
        Write-Host "[fetch-node-runtime] $NodeVersion already present at $TargetDir - nothing to do."
        exit 0
    }
    Write-Host "[fetch-node-runtime] Found $existingVersion, replacing with pinned $NodeVersion."
    Remove-Item -Recurse -Force $TargetDir
}

Write-Host "[fetch-node-runtime] Downloading $Url ..."
Invoke-WebRequest -Uri $Url -OutFile $TempZip

Write-Host "[fetch-node-runtime] Verifying SHA-256 ..."
$actualSha256 = (Get-FileHash -Path $TempZip -Algorithm SHA256).Hash.ToLower()
if ($actualSha256 -ne $ExpectedSha256) {
    Remove-Item -Force $TempZip
    throw "[fetch-node-runtime] SHA-256 MISMATCH: expected $ExpectedSha256, got $actualSha256. Refusing to use this download."
}
Write-Host "[fetch-node-runtime] Checksum verified: $actualSha256"

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
$ExtractTemp = Join-Path $env:TEMP "node-extract-$NodeVersion"
if (Test-Path $ExtractTemp) { Remove-Item -Recurse -Force $ExtractTemp }
Expand-Archive -Path $TempZip -DestinationPath $ExtractTemp -Force

Move-Item -Path (Join-Path $ExtractTemp "node-$NodeVersion-win-x64") -Destination $TargetDir
Remove-Item -Recurse -Force $ExtractTemp
Remove-Item -Force $TempZip

Write-Host "[fetch-node-runtime] Portable Node $NodeVersion ready at $TargetDir"
& (Join-Path $TargetDir "node.exe") --version
