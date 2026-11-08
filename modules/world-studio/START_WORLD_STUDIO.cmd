@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 20 or newer is required on PATH.
  echo Nothing has been installed or downloaded.
  pause
  exit /b 2
)
node.exe server.mjs
set "rc=%errorlevel%"
if not "%rc%"=="0" echo World Studio exited with code %rc%.
pause
exit /b %rc%
