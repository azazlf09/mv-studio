@echo off
setlocal
title MV Production Studio - Dev Mode

cd /d "%~dp0"
if errorlevel 1 (
    echo [X] Failed to cd to script dir
    pause
    exit /b 1
)

echo.
echo  ============================================
echo    MV Production Studio - Starting...
echo  ============================================
echo.
echo  Working dir: %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [X] node.exe not found in PATH
    echo     Install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo [X] npm not found in PATH
    pause
    exit /b 1
)

echo [i] node version:
call node --version
echo [i] npm version:
call npm --version
echo.

set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

if not exist "node_modules" (
    echo [!] node_modules missing, installing deps...
    call npm install
    if errorlevel 1 (
        echo.
        echo [X] npm install failed
        pause
        exit /b 1
    )
)

echo [OK] Launching Electron dev mode...
echo [i] Close this window to stop the app
echo.

call npm run dev

echo.
echo ============================================
echo   App exited (code: %errorlevel%)
echo ============================================
pause
endlocal