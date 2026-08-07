@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title School SmS — Tauri Build

echo.
echo  === School SmS Desktop Build ===
echo.

REM Load MSVC linker (required for Rust/Tauri on Windows)
set "VSDEV=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"
if not exist "%VSDEV%" (
  echo [ERROR] VS Build Tools not found:
  echo   %VSDEV%
  echo Install "Visual Studio Build Tools 2022" with C++ workload, then retry.
  exit /b 1
)

call "%VSDEV%" -arch=amd64 -host_arch=amd64
if errorlevel 1 (
  echo [ERROR] Failed to load VsDevCmd
  exit /b 1
)

where rustc >nul 2>&1
if errorlevel 1 (
  echo [ERROR] rustc not found. Install Rust from https://rustup.rs
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] node not found. Install Node.js 20+
  exit /b 1
)

echo [1/5] desktop npm install...
call npm install
if errorlevel 1 exit /b 1

echo [2/5] backend prisma generate...
call npm --prefix ..\backend run prisma:generate
if errorlevel 1 exit /b 1

echo [3/5] frontend production build...
set NEXT_PUBLIC_API_URL=http://127.0.0.1:5000/api
set NEXT_PUBLIC_UPLOAD_BASE_URL=http://127.0.0.1:5000
set NEXT_PUBLIC_BACKEND_PORT=5000
call npm --prefix ..\frontend run build
if errorlevel 1 exit /b 1

echo [4/5] copy splash assets...
call node .\scripts\copy-splash.mjs
if errorlevel 1 exit /b 1

echo [5/5] tauri build (NSIS installer)...
call npm run build
if errorlevel 1 (
  echo.
  echo  Build failed. See errors above.
  exit /b 1
)

echo.
echo  === Build complete ===
echo  Installer:
echo    src-tauri\target\release\bundle\nsis\
echo  Or exe:
echo    src-tauri\target\release\school-sms-desktop.exe
echo.
dir /b "src-tauri\target\release\bundle\nsis\*.exe" 2>nul
exit /b 0
