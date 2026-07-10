@echo off
setlocal
pushd "%~dp0"
title RSAC Drupal Editing Helper

if /i "%~1"=="start" goto start_all
if /i "%~1"=="admin" goto open_admin
if /i "%~1"=="website" goto open_website
if /i "%~1"=="validate" goto validate
if /i "%~1"=="install" goto install_admin
if /i "%~1"=="guide" goto guide

:menu
cls
echo ============================================================
echo RSAC-UP DRUPAL EDITING HELPER
echo ============================================================
echo.
echo 1. Start Drupal and website, then open both
echo 2. Open Drupal RSAC Collections
echo 3. Open website
echo 4. Validate Drupal connection
echo 5. Refresh Drupal editing dashboard
echo 6. Open editor guide
echo 0. Exit
echo.
set "choice="
set /p choice=Choose option: 
if "%choice%"=="1" goto start_all
if "%choice%"=="2" goto open_admin
if "%choice%"=="3" goto open_website
if "%choice%"=="4" goto validate
if "%choice%"=="5" goto install_admin
if "%choice%"=="6" goto guide
if "%choice%"=="0" goto end
goto menu

:start_all
start "RSAC Drupal" cmd /k npm.cmd run cms:start
start "RSAC Website" cmd /k npm.cmd run dev
echo Starting Drupal and website. Wait a few seconds...
timeout /t 8 /nobreak >nul
start "" "http://localhost:8080/admin/content/rsac"
start "" "http://localhost:5173/"
goto menu

:open_admin
start "" "http://localhost:8080/admin/content/rsac"
goto menu

:open_website
start "" "http://localhost:5173/"
goto menu

:validate
call npm.cmd run cms:validate
echo.
pause
goto menu

:install_admin
call npm.cmd run cms:admin:install
echo.
pause
goto menu

:guide
start "" "%~dp0DRUPAL_EDITOR_USER_GUIDE.md"
goto menu

:end
popd
endlocal
