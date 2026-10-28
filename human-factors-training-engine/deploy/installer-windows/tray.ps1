# Copyright (c) 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
# This source code is proprietary and confidential. Unauthorized copying,
# distribution, or use of this file, via any medium, is strictly prohibited
# without prior written permission from Conform-Edge Quality Consulting LLC.
# See LICENSE and NOTICE at the repository root.
#
# Standalone Packaging Directive - the system tray launcher (DECISIONS.md D-056/D-057).
# Replaces the console-window launcher: a real-machine finding showed a customer closing the
# console window kills the server with no warning. This runs the server as a hidden child
# process, exposes a tray icon with Open/View Logs/Stop, redirects all server output to a
# rotating log file, and guarantees the server cannot be orphaned if this tray process itself
# is killed (a Windows Job Object with kill-on-close semantics - the only mechanism that holds
# even under a forceful kill, not just a clean exit).
#
# Architecture: this process launches ONE child - a nested `powershell.exe -File start.ps1` -
# with its stdout/stderr fully redirected (not inherited; this process itself has no console at
# all when launched via the .vbs wrapper). start.ps1 runs the complete preflight (migration,
# JWT_SECRET, data-safety checks - see preflight.ps1) and then blocks on the real node.exe
# server process, so "the nested powershell.exe process is alive" is exactly equivalent to "the
# server is running," whether it's still in preflight or fully up. The Job Object is applied to
# that nested process and cascades to node.exe automatically (Windows Job Objects cascade to
# all descendants by default), so killing/losing the outer tray process takes the whole tree
# down with it - verified in DECISIONS.md D-057 by forcefully killing this process and
# confirming node.exe disappears too, not just assumed from the Win32 API's documented behavior.
#
# ASCII-only in every string literal, deliberately (see fetch-node-runtime.ps1's note).

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $ScriptDir "runtime\node-win-x64"
$AppDir = Join-Path $ScriptDir "app"
$DataDir = Join-Path $ScriptDir "data"
$LogsDir = Join-Path $ScriptDir "logs"
$LogFile = Join-Path $LogsDir "hfengine.log"
$LockFile = Join-Path $DataDir "run.lock"

# --- Win32 Job Object P/Invoke (kill-on-close: if THIS process dies for any reason, including
# a forceful kill, Windows terminates every process assigned to the job too - the only
# guarantee strong enough for requirement #2 ("if the tray app is killed, the server must not
# be orphaned"). A FormClosing/try-finally handler alone only covers a clean exit, not a kill.
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class HfEngineJobObject {
    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
        public Int64 PerProcessUserTimeLimit;
        public Int64 PerJobUserTimeLimit;
        public UInt32 LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public UInt32 ActiveProcessLimit;
        public UIntPtr Affinity;
        public UInt32 PriorityClass;
        public UInt32 SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct IO_COUNTERS {
        public UInt64 ReadOperationCount;
        public UInt64 WriteOperationCount;
        public UInt64 OtherOperationCount;
        public UInt64 ReadTransferCount;
        public UInt64 WriteTransferCount;
        public UInt64 OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    public const int JobObjectExtendedLimitInformation = 9;
    public const UInt32 JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetInformationJobObject(IntPtr hJob, int JobObjectInfoClass, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    public static IntPtr CreateKillOnCloseJob() {
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr infoPtr = Marshal.AllocHGlobal(length);
        Marshal.StructureToPtr(info, infoPtr, false);
        SetInformationJobObject(job, JobObjectExtendedLimitInformation, infoPtr, (uint)length);
        Marshal.FreeHGlobal(infoPtr);
        return job;
    }
}
"@

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

# --- Single-instance guard, scoped to this install's own path (a second, separate install
# elsewhere on the same machine is legitimately independent - see DECISIONS.md D-057). This
# MUST happen before the log file is ever opened for writing: a StreamWriter's simple
# constructor opens the file without FileShare.Write, so a second instance racing to open the
# SAME log file the first instance already holds throws and crashes before it even reaches this
# check - found live running this build's own second-launch test (DECISIONS.md D-057). Only the
# instance that actually wins the mutex may touch the log file at all.
$installHash = [System.BitConverter]::ToString(
    [System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($ScriptDir.ToLower()))
).Replace("-", "")
$mutexName = "Global\HFEngineTray-$installHash"
$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, $mutexName, [ref]$createdNew)

if (-not $createdNew) {
    $existingPort = "3210"
    if (Test-Path $LockFile) {
        try {
            $lockData = Get-Content $LockFile -Raw | ConvertFrom-Json
            if ($lockData.port) { $existingPort = $lockData.port }
        } catch { }
    }
    Start-Process "http://127.0.0.1:$existingPort"
    exit 0
}

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

# --- Log rotation: rotate at session start, not mid-write, keeping this simple and predictable.
if ((Test-Path $LogFile) -and ((Get-Item $LogFile).Length -gt 5MB)) {
    $rotated = Join-Path $LogsDir "hfengine.log.old"
    Remove-Item -Force $rotated -ErrorAction SilentlyContinue
    Move-Item -Force $LogFile $rotated
}
if (-not (Test-Path $LogFile)) { New-Item -ItemType File -Path $LogFile | Out-Null }

$script:logWriter = New-Object System.IO.StreamWriter($LogFile, $true, [System.Text.Encoding]::UTF8)
$script:logWriter.AutoFlush = $true
$script:logLock = New-Object System.Object

function Write-TrayLog {
    param([string]$Message)
    [System.Threading.Monitor]::Enter($script:logLock)
    try {
        $script:logWriter.WriteLine("[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message")
    } finally {
        [System.Threading.Monitor]::Exit($script:logLock)
    }
}

Write-TrayLog "=== HF Engine tray launcher starting (PID $PID) ==="

# --- Launch the nested console-mode launcher with fully redirected I/O (this process itself
# has no console to inherit when launched hidden via the .vbs wrapper - explicit redirection,
# not inheritance, is what correctly carries console-app output, including from further
# grandchild processes like the Prisma CLI and the real node.exe server, through to the pipes
# below regardless of whether this outer process has a console at all).
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = Join-Path ([System.Environment]::GetFolderPath("System")) "WindowsPowerShell\v1.0\powershell.exe"
$psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptDir\start.ps1`""
$psi.WorkingDirectory = $ScriptDir
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
# Without this, Node's UTF-8 console output (Next.js's own startup banner uses box-drawing and
# checkmark characters) gets misdecoded through .NET's redirected-stream default (console
# codepage, not UTF-8), turning into mojibake in the log file - found running this build's own
# first test. Cosmetic, not functional, but real log quality matters for troubleshooting.
$psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
$psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8

$serverProcess = New-Object System.Diagnostics.Process
$serverProcess.StartInfo = $psi
$serverProcess.EnableRaisingEvents = $true

$outputHandler = {
    if ($EventArgs.Data) { Write-TrayLog $EventArgs.Data }
}
Register-ObjectEvent -InputObject $serverProcess -EventName OutputDataReceived -Action $outputHandler | Out-Null
Register-ObjectEvent -InputObject $serverProcess -EventName ErrorDataReceived -Action $outputHandler | Out-Null

$serverProcess.Start() | Out-Null
$serverProcess.BeginOutputReadLine()
$serverProcess.BeginErrorReadLine()

Write-TrayLog "Launched nested start.ps1 (PID $($serverProcess.Id))."

# Assign to the kill-on-close Job Object immediately - the process must not be able to outlive
# this tray process under ANY circumstance, including this script crashing before reaching the
# message loop below.
$job = [HfEngineJobObject]::CreateKillOnCloseJob()
[HfEngineJobObject]::AssignProcessToJobObject($job, $serverProcess.Handle) | Out-Null
Write-TrayLog "Assigned server process tree to kill-on-close job object."

$port = if ($env:PORT) { $env:PORT } else { "3210" }
@{ pid = $serverProcess.Id; port = $port; startedAt = (Get-Date -Format "o"); mode = "tray" } |
    ConvertTo-Json | Set-Content -Path $LockFile

# --- Tray icon + menu setup
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Text = "HF Engine - Starting..."
$notifyIcon.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$openItem = $menu.Items.Add("Open HF Engine")
$logsItem = $menu.Items.Add("View Logs")
$menu.Items.Add("-") | Out-Null
$stopItem = $menu.Items.Add("Stop HF Engine")
$notifyIcon.ContextMenuStrip = $menu

$script:userInitiatedStop = $false

function Stop-HfEngine {
    param([switch]$Silent)
    if ($script:userInitiatedStop) { return }
    $script:userInitiatedStop = $true
    if ($deathCheckTimer) { $deathCheckTimer.Stop() }
    Write-TrayLog "Stop requested - terminating server process tree (PID $($serverProcess.Id))."
    # taskkill /T kills the whole process tree - Stop-Process alone only kills the one PID it's
    # given, not children, and the nested powershell.exe -> node.exe relationship needs a real
    # tree-kill for a clean, immediate stop (the Job Object is the orphan-safety-net for an
    # unexpected tray death, not the primary mechanism for a deliberate Stop click).
    & taskkill.exe /PID $serverProcess.Id /T /F 2>&1 | Out-Null
    Remove-Item -Force $LockFile -ErrorAction SilentlyContinue
    Write-TrayLog "=== HF Engine stopped by user request ==="
    $notifyIcon.Visible = $false
    $mutex.ReleaseMutex()
    $script:logWriter.Dispose()
    [System.Windows.Forms.Application]::Exit()
}

$openItem.Add_Click({ Start-Process "http://127.0.0.1:$port" })
$logsItem.Add_Click({ Invoke-Item $LogFile })
$stopItem.Add_Click({ Stop-HfEngine })
$notifyIcon.Add_DoubleClick({ Start-Process "http://127.0.0.1:$port" })

# --- Unexpected-death detection (requirement #2): fires whether the server exits because of a
# preflight FATAL error, a crash, or being killed by something other than our own Stop-HfEngine.
# Deliberately a WinForms Timer polling HasExited, NOT Register-ObjectEvent on the .NET Exited
# event: found live (DECISIONS.md D-057) that Register-ObjectEvent's action never fired once
# [System.Windows.Forms.Application]::Run() took over the thread - PowerShell's own eventing
# subsystem depends on the engine's cooperative event pump, which Application.Run()'s native
# message loop does not drive. A System.Windows.Forms.Timer's Tick event, by contrast, IS
# dispatched by that same WinForms message loop, so it is guaranteed to fire.
$deathCheckTimer = New-Object System.Windows.Forms.Timer
$deathCheckTimer.Interval = 2000
$deathCheckTimer.Add_Tick({
    if ($serverProcess.HasExited -and -not $script:userInitiatedStop) {
        $deathCheckTimer.Stop()
        Write-TrayLog "=== HF Engine stopped UNEXPECTEDLY (exit code $($serverProcess.ExitCode)) ==="
        $notifyIcon.Text = "HF Engine - STOPPED (unexpected)"
        $notifyIcon.ShowBalloonTip(10000, "HF Engine stopped unexpectedly", "The server process ended on its own. Check logs\hfengine.log for details.", [System.Windows.Forms.ToolTipIcon]::Error)
        Remove-Item -Force $LockFile -ErrorAction SilentlyContinue
    }
})
$deathCheckTimer.Start()

# --- Wait for the server to actually answer before opening the browser or declaring "Running" -
# more robust than a fixed sleep (first-run migration can take longer than a quick restart).
$notifyIcon.Text = "HF Engine - Starting..."
$ready = $false
$deadline = (Get-Date).AddSeconds(45)
while ((Get-Date) -lt $deadline) {
    if ($serverProcess.HasExited) { break }
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health/status" -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Milliseconds 500
}

if ($ready) {
    $notifyIcon.Text = "HF Engine - Running on port $port"
    Write-TrayLog "Server is ready on port $port - opening browser."
    Start-Process "http://127.0.0.1:$port"
} elseif ($serverProcess.HasExited) {
    $notifyIcon.Text = "HF Engine - FAILED to start"
    $notifyIcon.ShowBalloonTip(10000, "HF Engine failed to start", "Check logs\hfengine.log for details.", [System.Windows.Forms.ToolTipIcon]::Error)
    Write-TrayLog "Server process exited before becoming ready - not opening browser."
} else {
    $notifyIcon.Text = "HF Engine - Starting (taking longer than expected)"
    Write-TrayLog "Server did not answer within 45s - leaving it running, not opening browser automatically. Use 'Open HF Engine' once it's ready."
}

[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::Run()
