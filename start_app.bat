@echo off
title VoiceStudio Web Launcher
echo ========================================================
echo        VoiceStudio Web - Starting Local Server
echo ========================================================
echo.
echo Launching VoiceStudio Web...
echo Serving from: %~dp0
echo.
python "%~dp0server.py"
echo.
echo ========================================================
echo VoiceStudio Web is ready. You can close this window.
echo ========================================================
pause
