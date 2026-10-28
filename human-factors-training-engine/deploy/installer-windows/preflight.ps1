# Copyright (c) 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
# This source code is proprietary and confidential. Unauthorized copying,
# distribution, or use of this file, via any medium, is strictly prohibited
# without prior written permission from Conform-Edge Quality Consulting LLC.
# See LICENSE and NOTICE at the repository root.
#
# Dot-sourceable: defines Invoke-Preflight, the environment setup + first-run/data-safety logic
# shared by start.ps1 (console mode) and tray.ps1 (system tray launcher, DECISIONS.md D-057).
# Extracted out of start.ps1 so there is exactly one copy of this logic instead of two that
# could drift - the G4 data-safety design (D-052) and the JWT_SECRET persistence (D-053) apply
# identically regardless of which launcher is used.
#
# FATAL conditions throw (a real .NET exception with a plain-text Message), rather than calling
# exit directly - start.ps1 catches and prints+exits with a red console message exactly as
# before; tray.ps1 catches and shows a message box, since a FATAL preflight error with no
# console visible would otherwise vanish with no visible symptom at all.
#
# ASCII-only in every string literal, deliberately (see fetch-node-runtime.ps1's note).

function Invoke-Preflight {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptDir,
        [scriptblock]$LogAction = { param($msg) Write-Host $msg }
    )

    $NodeExe = Join-Path $ScriptDir "runtime\node-win-x64\node.exe"
    $AppDir = Join-Path $ScriptDir "app"
    $DataDir = Join-Path $ScriptDir "data"
    $DbPath = Join-Path $DataDir "hfengine.db"
    $MarkerPath = Join-Path $DataDir ".initialized"
    $IngestDir = Join-Path $DataDir "incoming"

    if (-not (Test-Path $NodeExe)) {
        throw "Bundled Node runtime not found at $NodeExe - run fetch-node-runtime.ps1 first."
    }
    if (-not (Test-Path (Join-Path $AppDir "server.js"))) {
        throw "Packaged app not found at $AppDir\server.js - run build-package.ps1 first."
    }

    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
    New-Item -ItemType Directory -Force -Path $IngestDir | Out-Null

    # Absolute file: URL, forward slashes, per D-049 - required, not stylistic.
    $DbUrlPath = $DbPath -replace '\\', '/'
    $env:DATABASE_URL = "file:$DbUrlPath"
    $env:NODE_ENV = "production"
    $env:DEPLOYMENT_EDITION = "onprem"
    $env:DATABASE_MODE = "sqlite"
    $env:AI_PROVIDER_MODE = "none"
    $env:AUTH_MODE = "local"

    # D-056: suppress the Prisma CLI's update-check banner using Prisma's own supported
    # mechanism, not text-filtering console output. Confirmed by reading the exact installed
    # prisma package's own source (node_modules/prisma/build/index.js), not assumed:
    #   - CHECKPOINT_DISABLE short-circuits Prisma's checkpoint-client BEFORE it makes any
    #     outbound network request at all ("if(process.env.CHECKPOINT_DISABLE)return ...,0").
    #     This is the real, complete fix - it also closes a separate finding: the update-check
    #     is an actual outbound network call during every migration, which would otherwise run
    #     regardless of whether its resulting message is later hidden, undermining this
    #     product's own "no outbound network calls" claim (DEPENDENCY-FOOTPRINT.md).
    #   - PRISMA_HIDE_UPDATE_MESSAGE additionally gates the on-screen message as a second,
    #     independent check, in case some other code path in a future Prisma version bypasses
    #     the first.
    $env:CHECKPOINT_DISABLE = "1"
    $env:PRISMA_HIDE_UPDATE_MESSAGE = "1"

    if (-not $env:PORT) { $env:PORT = "3210" }
    if (-not $env:HOSTNAME) { $env:HOSTNAME = "127.0.0.1" }
    if (-not $env:NEXTAUTH_URL) { $env:NEXTAUTH_URL = "http://$($env:HOSTNAME):$($env:PORT)" }

    $JwtSecretPath = Join-Path $DataDir "jwt-secret.txt"
    if (-not $env:JWT_SECRET) {
        if (Test-Path $JwtSecretPath) {
            $env:JWT_SECRET = (Get-Content $JwtSecretPath -Raw).Trim()
        } else {
            & $LogAction "No JWT_SECRET found - generating one and saving it to $JwtSecretPath ..."
            $generatedSecret = (& $NodeExe -e "console.log(require('crypto').randomBytes(32).toString('hex'))").Trim()
            Set-Content -Path $JwtSecretPath -Value $generatedSecret -NoNewline
            $env:JWT_SECRET = $generatedSecret
            & $LogAction "Saved. Keep $JwtSecretPath private - anyone with it can forge a login session."
        }
    }
    # Opaque database-backed sessions use SESSION_SECRET. Reuse the installation's existing
    # persisted secret when upgrading so current deployments need no manual secret migration.
    if (-not $env:SESSION_SECRET) { $env:SESSION_SECRET = $env:JWT_SECRET }
    if (-not $env:SESSION_TTL_SECONDS) { $env:SESSION_TTL_SECONDS = "43200" }
    $env:TRUST_PROXY_HEADERS = "false"
    if ($env:HF_INGEST_ROOT -and -not $env:HF_INGEST_ORGANIZATION_ID) {
        throw "HF_INGEST_ORGANIZATION_ID is required when HF_INGEST_ROOT is enabled. Use the real organization ID shown in HF Engine administration."
    }
    if (-not $env:HF_INGEST_ROOT -and $env:HF_INGEST_ORGANIZATION_ID) {
        $env:HF_INGEST_ROOT = $IngestDir
    }
    if (-not $env:HF_AV_SCANNER) { $env:HF_AV_SCANNER = "windows-defender" }

    $dbExists = Test-Path $DbPath
    $markerExists = Test-Path $MarkerPath

    if (-not $dbExists -and $markerExists) {
        throw "FATAL: database file is missing, but this installation was previously initialized (marker found at $MarkerPath). Expected database at: $DbPath. Refusing to silently create a new empty database - that would discard your real data without warning. Restore from backup (restore.ps1), or delete $MarkerPath yourself first if you genuinely want to discard this installation's data and start over."
    }

    if ($dbExists) {
        & $LogAction "Existing database found at $DbPath - checking integrity before starting..."
        Push-Location $AppDir
        $checkOutput = $null
        $checkErrorFile = Join-Path $env:TEMP "hf-engine-db-check-error.txt"
        $checkExitCode = 0
        # See start.ps1's original comment (still accurate here): PowerShell 7 treats ANY
        # stderr output from a native command as a terminating error under
        # $ErrorActionPreference = "Stop", regardless of redirection target - Continue locally
        # for this one call.
        $previousEap = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $checkOutput = & $NodeExe "db-check.mjs" $DbPath 2>$checkErrorFile
            $checkExitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $previousEap
            Pop-Location
        }

        if ($checkExitCode -ne 0) {
            $checkErrorDetail = if (Test-Path $checkErrorFile) { (Get-Content $checkErrorFile -Raw) } else { "(no detail captured)" }
            Remove-Item -Force $checkErrorFile -ErrorAction SilentlyContinue
            throw "FATAL: the database file at $DbPath could not be opened/read. Details: $checkErrorDetail. This looks like a corrupted file, not a fresh install. Restore from backup (restore.ps1) instead of deleting it."
        }

        $checkResult = $checkOutput | ConvertFrom-Json
        if ($markerExists -and ($checkResult.tableCount -eq 0 -or -not $checkResult.hasUserTable)) {
            throw "FATAL: the database file at $DbPath opens, but contains no real application tables (tableCount=$($checkResult.tableCount)), while this installation's marker says it was previously initialized with real data. This looks like data loss (a truncated or replaced file), not a fresh install. Restore from backup (restore.ps1) instead."
        }

        if (-not $markerExists) {
            # A healthy, real database with no marker: either an upgrade from a pre-G4 install,
            # or a .db file restored on its own (restore.ps1 deliberately does not also restore
            # the marker - a readable database with real tables is sufficient evidence on its own).
            Set-Content -Path $MarkerPath -Value (Get-Date -Format "o")
        }

        & $LogAction "Integrity check passed (tables=$($checkResult.tableCount)) - skipping migration."
    } else {
        # Invoke the Prisma CLI's real JS entry point directly (node_modules\prisma\build\index.js),
        # not the node_modules\.bin\prisma shim - that shim is a POSIX shell script on this npm
        # install (for Git-Bash/Cygwin compatibility), and running it through node.exe as if it
        # were JS fails with a syntax error.
        $PrismaCli = Join-Path $AppDir "node_modules\prisma\build\index.js"
        & $LogAction "First run detected - no database at $DbPath. Creating and migrating..."
        Push-Location $AppDir
        try {
            & $NodeExe $PrismaCli migrate deploy --schema prisma\schema.prisma
            if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy failed (exit $LASTEXITCODE)." }
            & $NodeExe $PrismaCli db execute --file prisma\manual-sql\frozen_manifest_trigger.sql --schema prisma\schema.prisma
            & $NodeExe $PrismaCli db execute --file prisma\manual-sql\frozen_manifest_trigger_v2_widen_superseded.sql --schema prisma\schema.prisma
            & $LogAction "Database created and migrated at $DbPath"
        } finally {
            Pop-Location
        }
        Set-Content -Path $MarkerPath -Value (Get-Date -Format "o")
    }

    return [PSCustomObject]@{
        NodeExe = $NodeExe
        AppDir  = $AppDir
        DataDir = $DataDir
        DbPath  = $DbPath
        IngestDir = $IngestDir
    }
}
