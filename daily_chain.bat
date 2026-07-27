@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

set LOG=daily_chain.log
set OVERALL_OK=1

echo ================================================ >> "%LOG%"
echo %date% %time% START daily_chain >> "%LOG%"

REM STEP 1: DISCOVER NEW EXPERT PDF FILES (REVIEW QUEUE ONLY)
echo %date% %time% [STEP 1/12] expert PDF intake >> "%LOG%"
python "auto_pdf_intake.py" >> "%LOG%" 2>&1
if errorlevel 1 (
    echo %date% %time% [FAIL] expert PDF intake exit code !errorlevel! >> "%LOG%"
    set OVERALL_OK=0
) else (
    echo %date% %time% [OK] expert PDF intake >> "%LOG%"
)

REM STEP 2: BACKUP
echo %date% %time% [STEP 2/12] backup_daily.bat >> "%LOG%"
call backup_daily.bat >> "%LOG%" 2>&1
if errorlevel 1 (
    echo %date% %time% [FAIL] backup_daily.bat exit code !errorlevel! >> "%LOG%"
    set OVERALL_OK=0
) else (
    echo %date% %time% [OK] backup_daily.bat >> "%LOG%"
)

REM STEP 3: UPDATE KP
echo %date% %time% [STEP 3/12] update_kp.bat >> "%LOG%"
call update_kp.bat >> "%LOG%" 2>&1
if errorlevel 1 (
    echo %date% %time% [FAIL] update_kp.bat exit code !errorlevel! >> "%LOG%"
    set OVERALL_OK=0
) else (
    echo %date% %time% [OK] update_kp.bat >> "%LOG%"
)

REM STEP 4: REFRESH REVISION-AWARE PDF GROUND TRUTH
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 4/12] refresh PDF ground truth v3 >> "%LOG%"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0refresh_pdf_ground_truth.ps1" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] refresh PDF ground truth v3 exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] refresh PDF ground truth v3 >> "%LOG%"
    )
)

REM STEP 4A: CROSS-MONTH TAANITA CALIBRATION (SHADOW ONLY)
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 4A/12] cross-month Taanita calibration >> "%LOG%"
    python "calibrate_tanita_crossmonth_v04.py" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] cross-month Taanita calibration exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] cross-month Taanita calibration >> "%LOG%"
    )
)

REM STEP 4A2: REFIT TAANITA SHADOW MODEL FROM CROSS-MONTH ICONS
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 4A2/12] Taanita shadow model refresh >> "%LOG%"
    python "tanita_algorithm_fp276.py" --root "%~dp0" --out "%~dp0outputs" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] Taanita shadow model refresh exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] Taanita shadow model refresh >> "%LOG%"
    )
)

REM STEP 4B: REFRESH LINEAGE, TWO-YEAR CALENDAR, TAANITA AND INTERACTION AUDIT
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 4B/12] phase2 lineage/calendar/Taanita package >> "%LOG%"
    python "build_phase2_data_package.py" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] phase2 data package exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] phase2 data package >> "%LOG%"
    )
)

REM STEP 4C: AIA/VERNADSKY GEOMAGNETIC SHADOW (NO SCORE EFFECT)
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 4C/12] AIA Vernadsky shadow refresh >> "%LOG%"
    python "aia_vernadsky_shadow.py" --root "%~dp0" --out "%~dp0outputs\data_control\aia" --start "2025-01-01" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] AIA Vernadsky shadow exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] AIA Vernadsky shadow >> "%LOG%"
    )
)

REM STEP 4D: VERIFY INDEX FORMULA AND LINEAGE INTEGRITY
if exist "%~dp0verify_index_integrity.py" (
    echo %date% %time% [STEP 4D/12] index formula and lineage integrity >> "%LOG%"
    python "%~dp0verify_index_integrity.py" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] index integrity audit exit code !errorlevel! >> "%LOG%"
        set "CHAIN_FAILED=1"
    ) else (
        echo %date% %time% [OK] index integrity audit >> "%LOG%"
    )
)
REM STEP 5: BUILD DATA REGISTRY AND VERIFY SOURCE STRUCTURE
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 5/12] canonical data registry >> "%LOG%"
    python "build_data_registry.py" --root "%~dp0" --out "outputs\data_registry" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] canonical data registry exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] canonical data registry >> "%LOG%"
    )
)

REM STEP 6: ENSURE EVERY VALIDATED PDF IS PRESENT IN EXPERT OVERRIDES
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 6/12] validated PDF coverage audit >> "%LOG%"
    python "audit_validated_pdf_coverage.py" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] validated PDF coverage audit exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] validated PDF coverage audit >> "%LOG%"
    )
)

REM STEP 7: AUTOMATIC SHADOW FORECAST - FREEZE BEFORE OUTCOME IMPORT
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 7/12] auto shadow pipeline >> "%LOG%"
    python "auto_shadow_pipeline.py" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] auto shadow pipeline exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] auto shadow pipeline >> "%LOG%"
    )
)

REM STEP 8: LEGACY STRONG-RAW TRACKER (KEPT FOR HISTORICAL CONTINUITY)
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 8/12] strong-raw prospective updater >> "%LOG%"
    python "outputs\update_strong_raw_prospective.py" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] prospective updater exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] prospective updater >> "%LOG%"
    )
)

REM STEP 9: SYNC SHADOW ASSETS INTO DEPLOY ROOT
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 9/12] sync_shadow_assets.ps1 >> "%LOG%"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync_shadow_assets.ps1" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] sync_shadow_assets.ps1 exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] sync_shadow_assets.ps1 >> "%LOG%"
    )
)

REM STEP 10: GENERATE MANIFEST FROM FINAL FILE STATE
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 10/12] generate_manifest.ps1 >> "%LOG%"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0generate_manifest.ps1" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] generate_manifest.ps1 exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] generate_manifest.ps1 >> "%LOG%"
    )
)

REM STEP 11: VERIFY THE EXACT PACKAGE THAT WILL BE DEPLOYED
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 11/12] verify_shadow_deploy.ps1 >> "%LOG%"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify_shadow_deploy.ps1" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] verify_shadow_deploy.ps1 exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] verify_shadow_deploy.ps1 >> "%LOG%"
    )
)

REM STEP 12: GIT DEPLOY - only if all prior steps passed
if !OVERALL_OK! EQU 1 (
    echo %date% %time% [STEP 12/12] git_deploy.bat >> "%LOG%"
    call git_deploy.bat >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo %date% %time% [FAIL] git_deploy.bat exit code !errorlevel! >> "%LOG%"
        set OVERALL_OK=0
    ) else (
        echo %date% %time% [OK] git_deploy.bat >> "%LOG%"
    )
) else (
    echo %date% %time% [SKIP] git_deploy.bat - previous step failed, not pushing broken data >> "%LOG%"
)

echo %date% %time% END daily_chain OVERALL_OK=%OVERALL_OK% >> "%LOG%"
echo ================================================ >> "%LOG%"

if !OVERALL_OK! EQU 0 exit /b 1
exit /b 0
