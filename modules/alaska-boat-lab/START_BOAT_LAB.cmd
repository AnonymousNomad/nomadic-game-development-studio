@echo off
setlocal
set "NODE=C:\NomadicLabs\runtime\node-v26.4.0-win-x64\node.exe"
if not exist "%NODE%" set "NODE=node.exe"
set "ROOT=%~dp0"
echo.
echo NOMADIC GAME DEVELOPMENT STUDIO - ALASKA OFFSHORE
echo Boat lab local address: http://127.0.0.1:4177/
echo Only this test scene will be loaded, no STILLWATER assets.
echo Close the separate Boat Lab Server window to stop the server.
echo.
start "NGDS Boat Lab Server" cmd /k ""%NODE%" "%ROOT%server.mjs""
timeout /t 2 /nobreak >nul
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
 start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://127.0.0.1:4177/"
) else (
 start "" "http://127.0.0.1:4177/"
)
endlocal
