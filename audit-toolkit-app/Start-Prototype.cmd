@echo off
rem Starts a local web server for the Audit Toolkit prototype and opens it in your default browser.
rem Close this window to stop the server. (The single-file build prototype\dist\audit-toolkit-prototype.html can also be opened directly.)
cd /d "%~dp0"
start "" "http://127.0.0.1:8765/prototype/toolkit.html"
python -m http.server 8765 --bind 127.0.0.1
