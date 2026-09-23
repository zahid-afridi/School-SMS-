@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SchoolSMS — Windows Build

echo.
echo  === SchoolSMS Desktop Build (Windows) ===
echo  Ships PRODUCTION builds only under app\
echo  ^(no TypeScript source tree on school PCs^)
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
echo [info] Build Node: %NODE_VER%  ^(bundle ships 20.18.1^)

echo [1/9] desktop npm install...
call npm install
if errorlevel 1 exit /b 1

echo [2/9] backend prisma generate...
call npm --prefix ..\backend run prisma:generate
if errorlevel 1 exit /b 1

echo [3/9] backend production build ^(tsc -^> dist/^)...
call npm --prefix ..\backend run build
if errorlevel 1 exit /b 1

echo [4/9] OpenWA production build...
call npm --prefix ..\OpenWA run build
if errorlevel 1 exit /b 1

echo [5/9] frontend production build ^(Next standalone^)...
set NEXT_PUBLIC_API_URL=http://127.0.0.1:5000/api
set NEXT_PUBLIC_UPLOAD_BASE_URL=http://127.0.0.1:5000
set NEXT_PUBLIC_BACKEND_PORT=5000
call npm --prefix ..\frontend run build
if errorlevel 1 exit /b 1

echo [6/9] copy splash assets...
call node .\scripts\copy-splash.mjs
if errorlevel 1 exit /b 1

echo [7/9] prepare production-only bundle ^(app\ builds, no source^)...
set SCHOOL_SMS_BUNDLE_NODE=20.18.1
call node .\scripts\prepare-bundle.mjs
if errorlevel 1 exit /b 1

echo [8/9] tauri build ^(NSIS installer^)...
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
echo.
echo  After install, school PC gets:
echo    app\backend   ^(compiled JS^)
echo    app\frontend  ^(Next standalone^)
echo    app\openwa    ^(dist only^)
echo    data\         ^(school.db — backup this^)
echo    runtime\      ^(portable Node^)
echo  No Git source tree is shipped.
echo.
dir /b "src-tauri\target\release\bundle\nsis\*.exe" 2>nul
exit /b 0
