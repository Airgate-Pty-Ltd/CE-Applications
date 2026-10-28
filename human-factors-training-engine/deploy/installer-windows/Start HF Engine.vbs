' Copyright (c) 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
' See LICENSE and NOTICE at the repository root.
'
' Double-click entry point, INSTALL-GUIDE.md Step 2. Replaces the old "Start HF Engine.bat"
' (DECISIONS.md D-056/D-057): a .bat file always flashes a console window when double-clicked,
' even if it immediately launches something else - Windows' default double-click handler for
' .vbs files is wscript.exe, which is a GUI-subsystem host with no console window at all, so
' there is no flash, not even a brief one. This file's only job is to launch tray.ps1 hidden.
Set objShell = CreateObject("WScript.Shell")
Set objFso = CreateObject("Scripting.FileSystemObject")
scriptDir = objFso.GetParentFolderName(WScript.ScriptFullName)
objShell.CurrentDirectory = scriptDir
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptDir & "\tray.ps1"""
objShell.Run command, 0, False
