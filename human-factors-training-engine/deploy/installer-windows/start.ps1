# Copyright (c) 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
# This source code is proprietary and confidential. Unauthorized copying,
# distribution, or use of this file, via any medium, is strictly prohibited
# without prior written permission from Conform-Edge Quality Consulting LLC.
# See LICENSE and NOTICE at the repository root.
#
# Standalone Packaging Directive - console-mode launcher. Runs entirely from the BUNDLED Node
# runtime (runtime/node-win-x64/node.exe) - never relies on a system-installed Node, npm, or
# Docker.
#
# This is now a thin wrapper (D-057): the actual environment/first-run/data-safety logic lives
# in preflight.ps1 (dot-sourced below), shared with tray.ps1 (the system tray launcher most
# customers actually use - see INSTALL-GUIDE.md). This script remains for manual/troubleshooting
# use exactly as documented (e.g. setting $env:PORT before running this directly) - console
# output behavior is unchanged from before this refactor.
#
# NOTE (packaging finding, logged in DECISIONS.md D-050): ASCII-only in every string literal,
# deliberately - a Unicode em-dash inside a double-quoted string mis-decoded under this build
# machine's default console encoding and threw a parse error.

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDir "preflight.ps1")

try {
    $ctx = Invoke-Preflight -ScriptDir $ScriptDir
} catch {
    Write-Host ""
    Write-Host "[start] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

$bundledVersion = & $ctx.NodeExe --version
Write-Host "[start] Starting HF Engine on http://$($env:HOSTNAME):$($env:PORT) (bundled Node $bundledVersion)..."

# Start-Process -PassThru (rather than the simpler "& $NodeExe server.js") so the real node.exe
# PID is known and can be written to a lock file - used by tray.ps1 and any other tooling that
# needs to know whether a server is already running against this install, and on which port.
# -NoNewWindow keeps console-mode behavior identical to before this refactor (node.exe's output
# shares this script's own console window, same as a direct "& $NodeExe server.js" call would).
Push-Location $ctx.AppDir
try {
    $serverProcess = Start-Process -FilePath $ctx.NodeExe -ArgumentList "server.js" -WorkingDirectory $ctx.AppDir -NoNewWindow -PassThru
    $lockFile = Join-Path $ctx.DataDir "run.lock"
    @{ pid = $serverProcess.Id; port = $env:PORT; startedAt = (Get-Date -Format "o"); mode = "console" } |
        ConvertTo-Json | Set-Content -Path $lockFile
    try {
        $serverProcess.WaitForExit()
    } finally {
        Remove-Item -Force $lockFile -ErrorAction SilentlyContinue
    }
} finally {
    Pop-Location
}
