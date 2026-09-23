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

echo [1/8] desktop npm install...
call npm install
if errorlevel 1 exit /b 1

echo [2/8] backend prisma generate...
call npm --prefix ..\backend run prisma:generate
if errorlevel 1 exit /b 1

echo [3/8] OpenWA production build...
call npm --prefix ..\OpenWA run build
if errorlevel 1 exit /b 1

echo [4/8] frontend production build...
set NEXT_PUBLIC_API_URL=http://127.0.0.1:5000/api
set NEXT_PUBLIC_UPLOAD_BASE_URL=http://127.0.0.1:5000
set NEXT_PUBLIC_BACKEND_PORT=5000
call npm --prefix ..\frontend run build
if errorlevel 1 exit /b 1

echo [5/8] copy splash assets...
call node .\scripts\copy-splash.mjs
if errorlevel 1 exit /b 1

echo [6/8] prepare self-contained bundle (portable Node + app payload)...
call node .\scripts\prepare-bundle.mjs
if errorlevel 1 exit /b 1

echo [7/8] tauri build (NSIS installer)...
set STATIC_VCRUNTIME=true
call npm run build
if errorlevel 1 (
  echo.
  echo  Build failed. See errors above.
  exit /b 1
)

echo.
echo  === Build complete ===
echo  Installer (no Node required on target PC):
echo    src-tauri\target\release\bundle\nsis\
echo  Or exe:
echo    src-tauri\target\release\school-sms-desktop.exe
echo.
echo  First launch unpacks bundled Node + app next to the .exe automatically.
echo.
dir /b "src-tauri\target\release\bundle\nsis\*.exe" 2>nul
exit /b 0
