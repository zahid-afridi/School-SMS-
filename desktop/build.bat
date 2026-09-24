@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SchoolSMS — Windows Build

echo.
echo  === SchoolSMS Desktop Build (Windows / Electron) ===
echo  Ships PRODUCTION builds only under app\
echo  ^(no TypeScript source tree on school PCs^)
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] node not found. Install Node.js 22 LTS
  exit /b 1
)

for /f "tokens=1 delims=v" %%V in ('node -v') do set "NODE_VER=%%V"
echo [info] Build Node: %NODE_VER%  ^(bundle ships 22.19.0 — use Node 22.19+ for OpenWA^)

echo [1/8] desktop npm install...
call npm install
if errorlevel 1 exit /b 1

echo [2/8] backend prisma generate...
call npm --prefix ..\backend run prisma:generate
if errorlevel 1 exit /b 1

echo [3/8] backend production build ^(tsc -^> dist/^)...
call npm --prefix ..\backend run build
if errorlevel 1 exit /b 1

echo [4/8] OpenWA production build...
call npm --prefix ..\OpenWA run build
if errorlevel 1 exit /b 1

echo [5/8] frontend production build ^(Next standalone^)...
set NEXT_PUBLIC_API_URL=http://127.0.0.1:5000/api
set NEXT_PUBLIC_UPLOAD_BASE_URL=http://127.0.0.1:5000
set NEXT_PUBLIC_BACKEND_PORT=5000
call npm --prefix ..\frontend run build
if errorlevel 1 exit /b 1

echo [6/8] verify splash assets...
call node .\scripts\copy-splash.mjs
if errorlevel 1 exit /b 1

echo [7/8] prepare production-only bundle ^(app\ builds, no source^)...
set SCHOOL_SMS_BUNDLE_NODE=22.19.0
call node .\scripts\prepare-bundle.mjs
if errorlevel 1 exit /b 1

echo [8/8] electron-builder ^(NSIS installer^)...
call npm run build
if errorlevel 1 (
  echo.
  echo  Build failed. See errors above.
  exit /b 1
)

echo.
echo  === Build complete ===
echo  Installer:
echo    release\
echo.
echo  After install, school PC gets:
echo    app\backend   ^(compiled JS^)
echo    app\frontend  ^(Next standalone^)
echo    app\openwa    ^(dist only^)
echo    data\         ^(school.db — backup this^)
echo    runtime\      ^(portable Node^)
echo  No Git source tree is shipped.
echo.
dir /b "release\*.exe" 2>nul
exit /b 0
