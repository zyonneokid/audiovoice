@echo off
title VoiceStudio Web Launcher
echo ========================================================
echo        VoiceStudio Web - Starting Local Server
echo ========================================================
echo.
echo Launching at: http://localhost:3000
echo Serving from: %~dp0
echo.
python "%~dp0server.py"
if errorlevel 1 (
    echo.
    echo Python server encountered an error. Opening index.html directly...
    start "" "%~dp0index.html"
)
pause
