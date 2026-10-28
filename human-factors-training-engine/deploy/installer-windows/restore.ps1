# Copyright (c) 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
# This source code is proprietary and confidential. Unauthorized copying,
# distribution, or use of this file, via any medium, is strictly prohibited
# without prior written permission from Conform-Edge Quality Consulting LLC.
# See LICENSE and NOTICE at the repository root.
#
# Standalone Packaging Directive G4: real file-level restore, using the bundled Node runtime
# only. Reuses scripts/restore-db.js (Phase 3 WP-5.2) via the .mjs copy in tools/ - verifies
# the backup's SHA-256 against its manifest before restoring, and takes its own pre-restore
# safety copy of whatever is currently at the target path.
#
# -TargetDataDir defaults to this installer's own data/ (the disaster-recovery case: restore
# over the live install after data loss). Pass a different -TargetDataDir to restore into a
# separate, empty directory tree instead - this is the scenario a real customer faces after a
# full disk failure and a fresh machine/reinstall, and it is deliberately NOT the same as
# restoring over the top of a live directory: it proves the restored file is genuinely
# self-contained, with no hidden dependency on anything outside data/.

param(
    [Parameter(Mandatory = $true)][string]$FromManifest,
    [string]$TargetDataDir
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeExe = Join-Path $ScriptDir "runtime\node-win-x64\node.exe"
if (-not $TargetDataDir) { $TargetDataDir = Join-Path $ScriptDir "data" }
$DbPath = Join-Path $TargetDataDir "hfengine.db"

if (-not (Test-Path $NodeExe)) { throw "[restore] Bundled Node runtime not found at $NodeExe." }
New-Item -ItemType Directory -Force -Path $TargetDataDir | Out-Null

& $NodeExe (Join-Path $ScriptDir "tools\restore-db.mjs") --db $DbPath --from-manifest $FromManifest
