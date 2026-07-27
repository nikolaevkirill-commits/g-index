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
    future_kp         = Get-FileVersion "future_kp.json"
    engine_scores     = Get-FileVersion "engine_scores.json"  # fp249: лише моніторинг freeze-цілісності — дашборд НЕ перезавантажує цей файл автоматично (V3 freeze), але попереджає в консолі, якщо hash раптом зміниться
    meeus_core        = Get-FileVersion "meeus_core_v1.js"
    panchanga_shadow  = Get-FileVersion "panchanga_shadow_feed_v1.json"
    confidence_policy = Get-FileVersion "SELECTIVE_POLICY_STRONG_RAW_v2.json"
    prospective_state = Get-FileVersion "STRONG_RAW_PROSPECTIVE_STATUS_v1.json"
    auto_forecast      = Get-FileVersion "AUTO_FORECAST_FEED_v1.json"
    auto_prospective   = Get-FileVersion "AUTO_PROSPECTIVE_STATUS_v1.json"
    bgs_space_weather  = Get-FileVersion "BGS_SPACE_WEATHER_v1.json"
    space_weather_ctx  = Get-FileVersion "SPACE_WEATHER_CONTEXT_v1.json"
    kp_hourly_alert    = Get-FileVersion "KP_HOURLY_ALERT_v2.json"
    aia_vernadsky_daily = Get-FileVersion "AIA_VERNADSKY_DAILY_v1.json"
    aia_vernadsky_audit = Get-FileVersion "AIA_VERNADSKY_SHADOW_AUDIT_v1.json"
    index_integrity_audit = Get-FileVersion "INDEX_INTEGRITY_AUDIT_v1.json"
}

$json = $manifest | ConvertTo-Json -Compress
Set-Content -Path "data_manifest.json" -Value $json -Encoding UTF8

$timestamp = Get-Date -Format "yyyy-MM-dd_HH:mm:ss"
Add-Content -Path "tracker.log" -Value "[$timestamp] generate_manifest.ps1: OK -> $json"

Write-Host "data_manifest.json updated:"
Write-Host $json
