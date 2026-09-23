@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SchoolSMS — Windows Build

echo.
echo  === SchoolSMS Desktop Build (Windows) ===
echo  Output: self-contained NSIS installer
echo  Target PC needs: Windows 10+ (Node is bundled)
echo.

REM Load MSVC linker (required for Rust/Tauri on Windows)
set "VSDEV=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"
if not exist "%VSDEV%" (
  set "VSDEV=C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat"
)
if not exist "%VSDEV%" (
  set "VSDEV=C:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\Tools\VsDevCmd.bat"
)
if not exist "%VSDEV%" (
  echo [ERROR] VS Build Tools / Visual Studio 2022 not found.
  echo Install "Desktop development with C++", then retry.
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
  echo [ERROR] node not found. Install Node.js 20 LTS
  exit /b 1
)

for /f "tokens=1 delims=v" %%V in ('node -v') do set "NODE_VER=%%V"
echo [info] Build Node: %NODE_VER%  ^(bundle ships 20.18.1 — use Node 20 for native modules^)

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

echo [6/8] prepare self-contained bundle ^(portable Node + app, no .env^)...
set SCHOOL_SMS_BUNDLE_NODE=20.18.1
call node .\scripts\prepare-bundle.mjs
if errorlevel 1 exit /b 1

echo [7/8] tauri build ^(NSIS installer^)...
set STATIC_VCRUNTIME=true
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
echo  After install on school PC:
echo    1. Run SchoolSMS
echo    2. First launch unpacks runtime + app next to the .exe
echo    3. Local services start on :5000 / :3000
echo    4. Backup = copy the whole SchoolSMS folder ^(see BACKUP.txt^)
echo.
dir /b "src-tauri\target\release\bundle\nsis\*.exe" 2>nul
exit /b 0
