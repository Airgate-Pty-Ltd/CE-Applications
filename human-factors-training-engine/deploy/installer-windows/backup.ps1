# Copyright (c) 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
# This source code is proprietary and confidential. Unauthorized copying,
# distribution, or use of this file, via any medium, is strictly prohibited
# without prior written permission from Conform-Edge Quality Consulting LLC.
# See LICENSE and NOTICE at the repository root.
#
# Standalone Packaging Directive G4: real file-level backup of the packaged app's SQLite
# database, using the bundled Node runtime only (no system Node, no Docker). Reuses
# scripts/backup-db.js (Phase 3 WP-5.2) via the .mjs copy build-package.ps1 places in
# tools/ - real SHA-256 of the copy, a manifest the health screen already knows how to read.

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeExe = Join-Path $ScriptDir "runtime\node-win-x64\node.exe"
$DbPath = Join-Path $ScriptDir "data\hfengine.db"
$OutDir = Join-Path $ScriptDir "backups"

if (-not (Test-Path $NodeExe)) { throw "[backup] Bundled Node runtime not found at $NodeExe." }
if (-not (Test-Path $DbPath)) { throw "[backup] No database found at $DbPath - nothing to back up." }

& $NodeExe (Join-Path $ScriptDir "tools\backup-db.mjs") --db $DbPath --out $OutDir
