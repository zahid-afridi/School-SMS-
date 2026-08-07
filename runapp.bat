@echo off
setlocal
cd /d "%~dp0"
title School SmS Desktop

echo.
echo  Starting School SmS Desktop...
echo  (First launch may take a minute while services boot)
echo.

node "desktop\scripts\run-desktop.mjs" %*
set EXITCODE=%ERRORLEVEL%

echo.
if %EXITCODE% NEQ 0 (
  echo  Desktop failed with code %EXITCODE%.
  pause
)
exit /b %EXITCODE%
