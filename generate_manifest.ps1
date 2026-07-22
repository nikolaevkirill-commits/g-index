# generate_manifest.ps1 — G-Index fp246: генерує data_manifest.json
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
    version           = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    expert_overrides  = Get-FileVersion "expert_overrides_v3.json"
    expert_calc       = Get-FileVersion "expert_calc_scores.json"
    future_kp         = Get-FileVersion "future_kp.json"
    engine_scores     = Get-FileVersion "engine_scores.json"  # fp249: лише моніторинг freeze-цілісності — дашборд НЕ перезавантажує цей файл автоматично (V3 freeze), але попереджає в консолі, якщо hash раптом зміниться
}

$json = $manifest | ConvertTo-Json -Compress
Set-Content -Path "data_manifest.json" -Value $json -Encoding UTF8

$timestamp = Get-Date -Format "yyyy-MM-dd_HH:mm:ss"
Add-Content -Path "tracker.log" -Value "[$timestamp] generate_manifest.ps1: OK -> $json"

Write-Host "data_manifest.json updated:"
Write-Host $json
