@echo off
setlocal
pushd "%~dp0"
title RSAC-UP Custom CMS Helper

:menu
cls
echo ============================================================
echo RSAC-UP CUSTOM CMS HELPER
echo ============================================================
echo 1. Start website, CMS portal, and API
echo 2. Open CMS portal
echo 3. Open website
echo 4. Validate database content
echo 5. Run bilingual edit smoke test
echo 6. Open editor guide
echo 0. Exit
echo.
set /p choice=Choose option: 
if "%choice%"=="1" goto start_all
if "%choice%"=="2" start "" "http://localhost:5174/" & goto menu
if "%choice%"=="3" start "" "http://localhost:5173/" & goto menu
if "%choice%"=="4" call npm.cmd run cms:validate & pause & goto menu
if "%choice%"=="5" call npm.cmd run cms:smoke & pause & goto menu
if "%choice%"=="6" start "" "%~dp0CMS_USER_GUIDE.md" & goto menu
if "%choice%"=="0" goto end
goto menu

:start_all
start "RSAC Custom Stack" cmd /k npm.cmd run dev:all
timeout /t 5 /nobreak >nul
start "" "http://localhost:5174/"
start "" "http://localhost:5173/"
goto menu

:end
popd
endlocal
