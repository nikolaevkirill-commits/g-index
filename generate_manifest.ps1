# generate_manifest.ps1 — G-Index fp252: генерує data_manifest.json
# Викликати з daily_chain (ПІСЛЯ update_kp, ПЕРЕД git_deploy) — щоб manifest
# відображав фінальний стан файлів, який реально піде в деплой.
#
# Версія кожного відстежуваного файлу = MD5(вмісту), не ручний лейбл — тому
# manifest змінюється сам, щойно міняється вміст файлу, без дисципліни
# "не забути бампнути версію".

Set-Location $PSScriptRoot

function Get-FileVersion($path) {
    if (-not (Test-Path $path)) { return "missing" }
    try {
        $hash = Get-FileHash -Path $path -Algorithm MD5
        return $hash.Hash.Substring(0, 12)  # перші 12 символів достатньо як версія
    } catch {
        return "error"
    }
}

$manifest = [ordered]@{
    # Суфікс Z означає UTC, тому локальний київський час спочатку переводимо в UTC.
    version           = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    expert_overrides  = Get-FileVersion "expert_overrides_v3.json"
    expert_calc       = Get-FileVersion "expert_calc_scores.json"
    expert_registry   = Get-FileVersion "EXPERT_DECISION_REGISTRY_v1.json"
    future_kp         = Get-FileVersion "future_kp.json"
    future_calendar_advisory = Get-FileVersion "FUTURE_CALENDAR_ADVISORY_v1.json"
    engine_scores     = Get-FileVersion "engine_scores.json"  # fp249: лише моніторинг freeze-цілісності — дашборд НЕ перезавантажує цей файл автоматично (V3 freeze), але попереджає в консолі, якщо hash раптом зміниться
    meeus_core        = Get-FileVersion "meeus_core_v1.js"
    panchanga_shadow  = Get-FileVersion "panchanga_shadow_feed_v1.json"
    muhurta_context_shadow = Get-FileVersion "MUHURTA_CONTEXT_SHADOW_v1.json"
    lunar_month_context_shadow = Get-FileVersion "LUNAR_MONTH_CONTEXT_SHADOW_v1.json"
    confidence_policy = Get-FileVersion "SELECTIVE_POLICY_STRONG_RAW_v2.json"
    selective_ensemble = Get-FileVersion "SELECTIVE_ENSEMBLE_POLICY_v1.json"
    residual_router = Get-FileVersion "RESIDUAL_ROUTER_POLICY_v1.json"
    prospective_state = Get-FileVersion "STRONG_RAW_PROSPECTIVE_STATUS_v1.json"
    auto_forecast      = Get-FileVersion "AUTO_FORECAST_FEED_v1.json"
    auto_prospective   = Get-FileVersion "AUTO_PROSPECTIVE_STATUS_v1.json"
    model_quality      = Get-FileVersion "MODEL_QUALITY_AUDIT_v1.json"
    decision_consistency = Get-FileVersion "DECISION_CONSISTENCY_AUDIT_v1.json"
    outcome_ledger     = Get-FileVersion "OUTCOME_LEDGER_STATUS_v1.json"
    real_outcome_ledger = Get-FileVersion "REAL_OUTCOME_LEDGER_v1.jsonl"
    retrospective_coverage = Get-FileVersion "outputs/data_control/RETROSPECTIVE_COVERAGE_LEDGER_v1.json"
    unified_scorecard = Get-FileVersion "outputs/data_control/UNIFIED_SCORECARD_v1.json"
    target_semantics_audit = Get-FileVersion "TARGET_SEMANTICS_AUDIT_v2.json"
    panchanga_reference_audit = Get-FileVersion "PANCHANGA_REFERENCE_AUDIT_v1.json"
    outcome_intake_queue = Get-FileVersion "outputs/data_control/OUTCOME_INTAKE_QUEUE_v1.csv"
    outcome_objective_context = Get-FileVersion "outputs/data_control/OUTCOME_OBJECTIVE_CONTEXT_v1.json"
    outcome_objective_context_status = Get-FileVersion "outputs/data_control/OUTCOME_OBJECTIVE_CONTEXT_STATUS_v1.json"
    # Production guard and GitHub Pages consume the root release form.
    # Hashing the internal outputs/data_control copy caused deterministic CI drift.
    outcome_intake_form = Get-FileVersion "OUTCOME_INTAKE_FORM_v1.html"
    outcome_intake_form_status = Get-FileVersion "outputs/data_control/OUTCOME_INTAKE_FORM_STATUS_v1.json"
    outcome_intake_validation = Get-FileVersion "outputs/data_control/OUTCOME_INTAKE_VALIDATION_v1.json"
    outcome_intake_import = Get-FileVersion "outputs/data_control/OUTCOME_INTAKE_IMPORT_STATUS_v1.json"
    tanita_real_outcome_pairs = Get-FileVersion "outputs/data_control/TANITA_REAL_OUTCOME_PAIRS_v1.jsonl"
    tanita_real_outcome_pair_status = Get-FileVersion "outputs/data_control/TANITA_REAL_OUTCOME_PAIR_STATUS_v1.json"
    shadow_promotion_gate = Get-FileVersion "SHADOW_MODEL_PROMOTION_STATUS_v1.json"
    system_health       = Get-FileVersion "SYSTEM_HEALTH_STATUS_v1.json"
    research_harness    = Get-FileVersion "RESEARCH_HARNESS_AUDIT_v1.json"
    revision_benchmark  = Get-FileVersion "REVISION_AWARE_BENCHMARK_v1.json"
    bgs_space_weather  = Get-FileVersion "BGS_SPACE_WEATHER_v1.json"
    space_weather_ctx  = Get-FileVersion "SPACE_WEATHER_CONTEXT_v1.json"
    kp_hourly_alert    = Get-FileVersion "KP_HOURLY_ALERT_v2.json"
    source_routing_audit = Get-FileVersion "SOURCE_ROUTING_AUDIT_v1.json"
    silso_refresh_status = Get-FileVersion "SILSO_REFRESH_STATUS_v1.json"
    aia_vernadsky_refresh_status = Get-FileVersion "AIA_VERNADSKY_REFRESH_STATUS_v1.json"
    aia_vernadsky_daily = Get-FileVersion "AIA_VERNADSKY_DAILY_v1.json"
    aia_vernadsky_audit = Get-FileVersion "AIA_VERNADSKY_SHADOW_AUDIT_v1.json"
    index_integrity_audit = Get-FileVersion "INDEX_INTEGRITY_AUDIT_v1.json"
    index_logic_audit_v2 = Get-FileVersion "INDEX_LOGIC_AUDIT_v2.json"
    nonlinear_interaction_audit = Get-FileVersion "NONLINEAR_INTERACTION_AUDIT_v1.json"
    tanita_review_priority = Get-FileVersion "TANITA_REVIEW_PRIORITY_STATUS_v1.json"
    tanita_p0_review = Get-FileVersion "TANITA_P0_REVIEW_STATUS_v1.json"
    tanita_p0_import = Get-FileVersion "TANITA_P0_REVIEW_IMPORT_STATUS_v1.json"
    tanita_p1_import = Get-FileVersion "TANITA_P1_REVIEW_IMPORT_STATUS_v1.json"
    tanita_p2_import = Get-FileVersion "TANITA_P2_REVIEW_IMPORT_STATUS_v1.json"
    tanita_p3_import = Get-FileVersion "TANITA_P3_REVIEW_IMPORT_STATUS_v1.json"
    tanita_manual_holdout = Get-FileVersion "TANITA_MANUAL_HOLDOUT_STATUS_v1.json"
    tanita_balanced_review_queue = Get-FileVersion "TANITA_BALANCED_REVIEW_QUEUE_v1.json"
    tanita_balanced_review_gallery = Get-FileVersion "outputs/data_control/phase2/TANITA_BALANCED_REVIEW_GALLERY_STATUS_v1.json"
    tanita_balanced_review_import = Get-FileVersion "outputs/data_control/phase2/TANITA_BALANCED_REVIEW_IMPORT_STATUS_v1.json"
    tanita_promotion_gate = Get-FileVersion "TANITA_2Y_PROMOTION_GATE_v1.json"
    tanita_prospective_preregistration = Get-FileVersion "outputs/data_control/phase2/TANITA_PROSPECTIVE_PREREGISTRATION_v1.json"
    excel_formula_integrity = Get-FileVersion "EXCEL_FORMULA_INTEGRITY_STATUS_v1.json"
    sn_penalty_audit = Get-FileVersion "outputs/data_control/phase2/SN_PENALTY_ABLATION_v1.json"
}

$json = $manifest | ConvertTo-Json -Compress
Set-Content -Path "data_manifest.json" -Value $json -Encoding UTF8

$timestamp = Get-Date -Format "yyyy-MM-dd_HH:mm:ss"
Add-Content -Path "tracker.log" -Value "[$timestamp] generate_manifest.ps1: OK -> $json"

Write-Host "data_manifest.json updated:"
Write-Host $json
