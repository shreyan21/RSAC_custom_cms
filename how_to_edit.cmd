@echo off
setlocal
pushd "%~dp0"
title RSAC Directus Editing Helper

if /i "%~1"=="start" goto start_all
if /i "%~1"=="admin" goto open_admin
if /i "%~1"=="chart" goto chart
if /i "%~1"=="hero" goto hero
if /i "%~1"=="validate" goto validate
if /i "%~1"=="exit" goto end

:menu
cls
echo ============================================================
echo RSAC-UP DIRECTUS EDITING HELPER
echo ============================================================
echo.
echo 1. Start website + Directus, then open both
echo 2. Open Directus admin
echo 3. Upload Downloads\org_chart.jpg as organisation chart
echo 4. Set Downloads\satellite_image.jpg as homepage hero
echo 5. Open CMS editing handbook
echo 6. Validate CMS
echo 7. Open full project guide
echo 0. Exit
echo.
set "choice="
set /p choice=Choose option: 
if not defined choice goto end

if "%choice%"=="1" goto start_all
if "%choice%"=="2" goto open_admin
if "%choice%"=="3" goto chart
if "%choice%"=="4" goto hero
if "%choice%"=="5" goto help
if "%choice%"=="6" goto validate
if "%choice%"=="7" goto guide
if "%choice%"=="0" goto end
goto menu

:start_all
start "RSAC Website and Directus" cmd /k npm run dev
echo Starting services. Wait a few seconds...
timeout /t 8 /nobreak >nul
start "" "http://localhost:8055/admin"
start "" "http://localhost:5173"
goto menu

:open_admin
start "" "http://localhost:8055/admin"
goto menu

:chart
if not exist "%USERPROFILE%\Downloads\org_chart.jpg" (
  echo.
  echo File missing: %USERPROFILE%\Downloads\org_chart.jpg
  echo Rename chart exactly to org_chart.jpg and place it in Downloads.
  pause
  goto menu
)
echo.
echo Directus must be running. Use option 1 first when needed.
call npm run cms:update-org-chart -- "%USERPROFILE%\Downloads\org_chart.jpg"
echo.
pause
goto menu

:hero
if not exist "%USERPROFILE%\Downloads\satellite_image.jpg" (
  echo.
  echo File missing: %USERPROFILE%\Downloads\satellite_image.jpg
  echo Rename image exactly to satellite_image.jpg and place it in Downloads.
  pause
  goto menu
)
echo.
echo Directus must be running. Use option 1 first when needed.
call npm run cms:update-hero-image -- "%USERPROFILE%\Downloads\satellite_image.jpg"
echo.
pause
goto menu

:help
start "" "%~dp0EDITING_GUIDE.md"
goto menu

:validate
call npm run cms:validate
echo.
pause
goto menu

:guide
start "" "%~dp0SYSTEM_AND_FLOW.md"
goto menu

:end
popd
endlocal
