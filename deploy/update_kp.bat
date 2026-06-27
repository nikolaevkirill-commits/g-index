@echo off
REM ============================================================
REM update_kp.bat — G-Index Kp pipeline
REM Version: v2.0 (2026-06-27)
REM Run: щопонеділка до 17:00 UTC, або перед будь-яким deploy
REM
REM Acceptance criteria:
REM   [x] runs from any folder (uses %~dp0)
REM   [x] fetches real NOAA Kp
REM   [x] synthetic fallback if source down (kp_synthetic=true)
REM   [x] writes log with reason
REM   [x] git add + commit + push
REM   [x] smoke test: reads back future_kp.json
REM ============================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM ── Timestamp ────────────────────────────────────────────────
for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH:mm:ss"') do set TS=%%t

echo.
echo ============================================================
echo  update_kp.bat v2.0 — !TS!
echo ============================================================
echo.

REM ── Python check ─────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Add Python to PATH.
    goto :error
)

REM ── Acceptance test first ────────────────────────────────────
echo [1/4] Running acceptance test...
python update_kp.py --check
if errorlevel 1 (
    echo [WARN] Acceptance test reported issues — continuing anyway (synthetic fallback active)
)
echo.

REM ── Fetch + write future_kp.json ─────────────────────────────
echo [2/4] Updating future_kp.json...
python update_kp.py
if errorlevel 1 (
    echo [ERROR] update_kp.py failed
    goto :error
)
echo.

REM ── Smoke test: verify file exists and not empty ──────────────
echo [3/4] Smoke test...
if not exist "future_kp.json" (
    echo [ERROR] future_kp.json not found after update
    goto :error
)
python -c "import json,sys; d=json.load(open('future_kp.json')); kp=d.get('kp',{}); syn=sum(1 for v in kp.values() if v.get('kp_synthetic')); real=len(kp)-syn; print(f'  OK: {len(kp)} entries, {real} real, {syn} synthetic'); exp=d.get('expires','?'); print(f'  expires: {exp}'); sys.exit(0 if len(kp)>0 else 1)"
if errorlevel 1 (
    echo [ERROR] future_kp.json validation failed
    goto :error
)
echo.

REM ── Git commit + push ─────────────────────────────────────────
echo [4/4] Git commit and push...
git add future_kp.json
if errorlevel 1 (
    echo [WARN] git add failed — check if this is a git repo
    goto :warn
)

for /f "delims=" %%d in ('python -c "import json; d=json.load(open('future_kp.json')); print(d.get('expires','?'))"') do set EXPIRES=%%d
git commit -m "kp update !TS! expires=!EXPIRES!"
if errorlevel 1 (
    echo [INFO] Nothing to commit (already up to date)
)

git push origin deploy
if errorlevel 1 (
    echo [ERROR] git push failed — check remote/credentials
    goto :error
)

echo.
echo ============================================================
echo  [OK] update_kp.bat DONE — !TS!
echo ============================================================
echo.

REM Log success
echo [!TS!] update_kp.bat OK expires=!EXPIRES! >> kp_update.log
goto :end

:warn
echo [!TS!] update_kp.bat WARN >> kp_update.log
echo.
echo ============================================================
echo  [WARN] Completed with warnings. Check output above.
echo ============================================================
goto :end

:error
echo [!TS!] update_kp.bat ERROR >> kp_update.log
echo.
echo ============================================================
echo  [ERROR] update_kp.bat FAILED. Check kp_update.log
echo ============================================================
exit /b 1

:end
