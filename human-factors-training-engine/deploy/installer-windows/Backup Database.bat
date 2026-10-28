@echo off
rem Copyright (c) 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
rem See LICENSE and NOTICE at the repository root.
rem
rem Double-click launcher, INSTALL-GUIDE.md's backup procedure. See "Start HF Engine.bat" for
rem why a .bat wrapper exists at all instead of running the .ps1 file directly.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "backup.ps1"
echo.
echo Backup complete. Press any key to close this window.
pause >nul
