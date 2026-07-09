@echo off
chcp 65001 >nul
setlocal
set BASE=D:\ПРОГНОЗ\прогноз по ексель\deploy\13

:menu
cls
echo ============================================
echo   G-INDEX / PROGNOZ — панель керування
echo ============================================
echo.
echo  1. Відкрити папку деплою + GitHub upload
echo  2. Запустити update_kp зараз (вручну)
echo  3. Запустити git_deploy зараз (вручну)
echo  4. Запустити backup зараз (вручну)
echo  5. Перевірити статус автозадач (Task Scheduler)
echo  6. Показати останні рядки логів
echo  0. Вихід
echo.
set /p choice="Вибір: "

if "%choice%"=="1" (
    start "" explorer "%BASE%"
    start "" "https://github.com/nikolaevkirill-commits/g-index/upload/deploy"
    goto menu
)
if "%choice%"=="2" (
    call "%BASE%\update_kp.bat"
    pause
    goto menu
)
if "%choice%"=="3" (
    call "%BASE%\git_deploy.bat"
    pause
    goto menu
)
if "%choice%"=="4" (
    call "%BASE%\backup_daily.bat"
    pause
    goto menu
)
if "%choice%"=="5" (
    echo.
    schtasks /query /tn "PROGNOZ_update_kp" /fo LIST | findstr /i "TaskName Status Next"
    echo.
    schtasks /query /tn "PROGNOZ_git_deploy" /fo LIST | findstr /i "TaskName Status Next"
    echo.
    schtasks /query /tn "PROGNOZ_backup" /fo LIST | findstr /i "TaskName Status Next"
    echo.
    pause
    goto menu
)
if "%choice%"=="6" (
    echo.
    echo --- kp_update.log (останні 10) ---
    powershell -NoProfile -Command "Get-Content '%BASE%\kp_update.log' -Tail 10"
    echo.
    echo --- git_deploy.log (останні 10) ---
    powershell -NoProfile -Command "Get-Content 'D:\ПРОГНОЗ\deploy_git\..\deploy_git\git_deploy.log' -Tail 10" 2>nul
    echo.
    pause
    goto menu
)
if "%choice%"=="0" exit /b 0

goto menu
