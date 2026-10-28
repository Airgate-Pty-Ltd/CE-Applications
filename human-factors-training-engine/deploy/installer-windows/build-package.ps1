# Copyright (c) 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
# This source code is proprietary and confidential. Unauthorized copying,
# distribution, or use of this file, via any medium, is strictly prohibited
# without prior written permission from Conform-Edge Quality Consulting LLC.
# See LICENSE and NOTICE at the repository root.
#
# Standalone Packaging Directive, G2: assembles deploy/installer-windows/app/ from the
# repo's own `npm run build` output - the Next.js standalone server, its static assets,
# and the Prisma CLI plus schema/migrations (needed for first-run migrate, G3; Next's own
# dependency tracer does not include the Prisma CLI since the app code never imports it -
# the same reason deploy/docker-optional/Dockerfile copies it explicitly).
#
# Run from the repo root: `npm run build` first, then this script.
# Does NOT copy any database file - app/prisma/ ships schema + migrations only; the
# customer's actual data file is created on first run under a separate data directory
# (see start.ps1), never bundled into the installer.
#
# ASCII-only in every string literal, deliberately (see fetch-node-runtime.ps1's note).

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$AppDir = Join-Path $ScriptDir "app"
$StandaloneDir = Join-Path $RepoRoot ".next\standalone"

if (-not (Test-Path (Join-Path $StandaloneDir "server.js"))) {
    throw "[build-package] $StandaloneDir\server.js not found - run 'npm run build' at the repo root first."
}

if (Test-Path $AppDir) { Remove-Item -Recurse -Force $AppDir }
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null

Write-Host "[build-package] Copying standalone server..."
Copy-Item -Path (Join-Path $StandaloneDir "*") -Destination $AppDir -Recurse -Force
# Never ship a database file inside the installer package - it belongs to the customer.
Remove-Item -Force (Join-Path $AppDir "prisma\dev.db") -ErrorAction SilentlyContinue

Write-Host "[build-package] Copying static assets..."
New-Item -ItemType Directory -Force -Path (Join-Path $AppDir ".next\static") | Out-Null
Copy-Item -Path (Join-Path $RepoRoot ".next\static\*") -Destination (Join-Path $AppDir ".next\static") -Recurse -Force

Write-Host "[build-package] Copying Prisma CLI (for first-run migrate) and schema/migrations..."
New-Item -ItemType Directory -Force -Path (Join-Path $AppDir "node_modules\.bin") | Out-Null
Copy-Item -Path (Join-Path $RepoRoot "node_modules\prisma") -Destination (Join-Path $AppDir "node_modules\prisma") -Recurse -Force
Copy-Item -Path (Join-Path $RepoRoot "node_modules\.bin\prisma*") -Destination (Join-Path $AppDir "node_modules\.bin") -Force
Copy-Item -Path (Join-Path $RepoRoot "prisma\schema.prisma") -Destination (Join-Path $AppDir "prisma\schema.prisma") -Force
Copy-Item -Path (Join-Path $RepoRoot "prisma\migrations") -Destination (Join-Path $AppDir "prisma\migrations") -Recurse -Force
Copy-Item -Path (Join-Path $RepoRoot "prisma\manual-sql") -Destination (Join-Path $AppDir "prisma\manual-sql") -Recurse -Force

# The prisma CLI package's own transitive dependencies. Next's dependency tracer already
# copies @prisma/client (the app imports it directly) but has no reason to know the CLI -
# which the app never imports - needs these too. Real gap found in G4 testing (DECISIONS.md
# D-05x): running app/ from INSIDE this repo checkout masked the gap completely, because
# Node's require() resolution walks up through every ancestor node_modules and silently found
# these in the repo root's own node_modules/@prisma/ - the exact thing a real standalone
# install, with no repo tree above it, does not have. Only caught by testing app/ copied
# somewhere with no repo above it at all.
Write-Host "[build-package] Copying Prisma CLI's own transitive @prisma/* dependencies..."
New-Item -ItemType Directory -Force -Path (Join-Path $AppDir "node_modules\@prisma") | Out-Null
foreach ($pkg in @('engines', 'debug', 'engines-version', 'fetch-engine', 'get-platform')) {
    $src = Join-Path $RepoRoot "node_modules\@prisma\$pkg"
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $AppDir "node_modules\@prisma\$pkg") -Recurse -Force
    }
}

Write-Host "[build-package] Copying db-check.mjs (G4 preflight integrity check)..."
Copy-Item -Path (Join-Path $ScriptDir "db-check.mjs") -Destination (Join-Path $AppDir "db-check.mjs") -Force

# .mjs, not .js: these run standalone via the bundled node.exe from deploy/installer-windows/
# with no package.json nearby to declare "type":"module" the way the repo root's does -
# .mjs forces ESM regardless, matching the import syntax these scripts already use unchanged.
Write-Host "[build-package] Copying backup/restore scripts (Phase 3 WP-5.2, G4)..."
New-Item -ItemType Directory -Force -Path (Join-Path $ScriptDir "tools") | Out-Null
Copy-Item -Path (Join-Path $RepoRoot "scripts\backup-db.js") -Destination (Join-Path $ScriptDir "tools\backup-db.mjs") -Force
Copy-Item -Path (Join-Path $RepoRoot "scripts\restore-db.js") -Destination (Join-Path $ScriptDir "tools\restore-db.mjs") -Force
(Get-Content (Join-Path $ScriptDir "tools\restore-db.mjs")) -replace "from './backup-db.js'", "from './backup-db.mjs'" | Set-Content (Join-Path $ScriptDir "tools\restore-db.mjs")

Write-Host "[build-package] app/ assembled at $AppDir"
