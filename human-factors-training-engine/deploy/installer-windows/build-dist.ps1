# Copyright (c) 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
# This source code is proprietary and confidential. Unauthorized copying,
# distribution, or use of this file, via any medium, is strictly prohibited
# without prior written permission from Conform-Edge Quality Consulting LLC.
# See LICENSE and NOTICE at the repository root.
#
# Standalone Packaging Directive - produces the actual customer-facing distributable zip at a
# durable, findable path (deploy/dist/), separate from this directory (the build workshop).
#
# Found live, post-G5 (DECISIONS.md D-054): G5 verified the install experience by building a
# zip in a scratch temp directory that no longer exists after the session ended - the owner
# went looking for a real deliverable under deploy/ and found only the workshop (this
# directory: build-package.ps1, fetch-node-runtime.ps1, and a live/stale data/ all mixed in
# with the app), tried running Start HF Engine.bat FROM THE WORKSHOP directly, and got a stale
# pre-cookie-fix bundle against old test data. This script exists so that never happens again:
# it produces one real, versioned artifact a customer would actually receive, containing
# nothing a customer shouldn't see.
#
# Run from the repo root: `npm run build` first, then this directory's `build-package.ps1`
# (to refresh app/), then this script.
#
# ASCII-only in every string literal, deliberately (see fetch-node-runtime.ps1's note).

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$DistDir = Join-Path $RepoRoot "deploy\dist"

if (-not (Test-Path (Join-Path $ScriptDir "app\server.js"))) {
    throw "[build-dist] $ScriptDir\app\server.js not found - run build-package.ps1 first."
}
if (-not (Test-Path (Join-Path $ScriptDir "runtime\node-win-x64\node.exe"))) {
    throw "[build-dist] Bundled Node runtime not found - run fetch-node-runtime.ps1 first."
}

$packageJson = Get-Content (Join-Path $RepoRoot "package.json") | ConvertFrom-Json
$version = $packageJson.version
$distName = "HF-Engine-Standalone-Windows-v$version"

$StagingDir = Join-Path $env:TEMP "hf-engine-dist-staging"
if (Test-Path $StagingDir) { Remove-Item -Recurse -Force $StagingDir }
$StagingRoot = Join-Path $StagingDir "HF-Engine"
New-Item -ItemType Directory -Force -Path $StagingRoot | Out-Null

Write-Host "[build-dist] Staging customer-facing files only (no builder tools, no data)..."
# Explicitly an allow-list, not a copy-then-exclude - so a future new file in this directory
# (e.g. a new builder tool) does not silently leak into the customer artifact by default.
# "Start HF Engine.bat" is deliberately NOT in this list (D-057) - replaced by
# "Start HF Engine.vbs" (launches tray.ps1 with zero console window, not even a brief flash;
# a .bat always flashes one on double-click even if it immediately hands off to something else).
Copy-Item -Path (Join-Path $ScriptDir "runtime") -Destination (Join-Path $StagingRoot "runtime") -Recurse -Force
Copy-Item -Path (Join-Path $ScriptDir "app") -Destination (Join-Path $StagingRoot "app") -Recurse -Force
Copy-Item -Path (Join-Path $ScriptDir "tools") -Destination (Join-Path $StagingRoot "tools") -Recurse -Force
foreach ($file in @("start.ps1", "preflight.ps1", "tray.ps1", "backup.ps1", "restore.ps1", "db-check.mjs", "Start HF Engine.vbs", "Backup Database.bat")) {
    Copy-Item -Path (Join-Path $ScriptDir $file) -Destination (Join-Path $StagingRoot $file) -Force
}

# Never ship a database file or any prior run's generated secret - a customer's install must
# start genuinely fresh. build-package.ps1 already excludes prisma/dev.db from app/, and this
# staging step never copies data/ or backups/ in the first place (not in the allow-list above),
# but double-check nothing slipped in via app/ itself.
Get-ChildItem -Path (Join-Path $StagingRoot "app") -Recurse -Filter "*.db" -ErrorAction SilentlyContinue |
    Remove-Item -Force

$DistZipPath = Join-Path $DistDir "$distName.zip"
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
if (Test-Path $DistZipPath) { Remove-Item -Force $DistZipPath }
Compress-Archive -Path $StagingRoot -DestinationPath $DistZipPath -Force

Remove-Item -Recurse -Force $StagingDir

Write-Host "[build-dist] Distributable written: $DistZipPath"
Get-Item $DistZipPath | Select-Object FullName, @{N='SizeMB';E={[math]::Round($_.Length / 1MB, 1)}}
