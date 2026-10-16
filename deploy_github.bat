@echo off
setlocal enabledelayedexpansion
title Deploy VoiceStudio to GitHub Pages
echo ========================================================
echo        VoiceStudio Web - Deploy to GitHub Pages
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/4] Checking Git repository...
if not exist ".git" (
    git init
    git branch -M main
)

echo.
echo [2/4] Staging and committing files...
git add .
git commit -m "Deploy VoiceStudio Web application with Malayalam & audio download support"

echo.
echo [3/4] Checking GitHub Remote Origin...
git remote -v >nul 2>&1
if errorlevel 1 (
    echo.
    echo No GitHub remote found yet.
    echo Please create a new empty repository on https://github.com/new
    echo Then paste your repository URL below.
    echo (Example: https://github.com/YOUR_USERNAME/MyVoice.git)
    echo.
    set /p REPO_URL="Enter your GitHub Repository URL: "
    if "!REPO_URL!"=="" (
        echo [ERROR] No URL entered. Aborting push.
        goto :instructions
    )
    git remote add origin !REPO_URL!
) else (
    echo Remote 'origin' is already configured.
)

echo.
echo [4/4] Pushing code to GitHub (main branch)...
git push -u origin main
if errorlevel 1 (
    echo.
    echo [NOTE] If this is your first push with a fresh repo, verify you are logged in to Git.
    echo You can also run: git push -u origin main --force
) else (
    echo.
    echo ========================================================
    echo      SUCCESS! Files pushed to GitHub!
    echo ========================================================
)

:instructions
echo.
echo --------------------------------------------------------
echo   NEXT STEP: How to turn on GitHub Pages for your link:
echo --------------------------------------------------------
echo 1. Open your repository on GitHub in your browser.
echo 2. Click "Settings" (top menu of your repo).
echo 3. In the left sidebar, click "Pages" (under Code and automation).
echo 4. Under "Build and deployment" -> "Branch", choose "main" and "/(root)".
echo 5. Click "Save".
echo.
echo Within 1-2 minutes, GitHub will publish your live website at:
echo https://<your-username>.github.io/<your-repo-name>/
echo.
echo Share that link with your friend so they can use the app anywhere!
echo --------------------------------------------------------
echo.
pause
