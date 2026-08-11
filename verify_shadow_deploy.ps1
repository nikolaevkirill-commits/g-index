$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$required = @(
    "meeus_core_v1.js",
    "panchanga_shadow_feed_v1.json",
    "SELECTIVE_POLICY_STRONG_RAW_v2.json",
    "STRONG_RAW_PROSPECTIVE_STATUS_v1.json",
    "AUTO_FORECAST_FEED_v1.json",
    "AUTO_PROSPECTIVE_STATUS_v1.json",
    "BGS_SPACE_WEATHER_v1.json",
    "SPACE_WEATHER_CONTEXT_v1.json",
    "KP_HOURLY_ALERT_v2.json",
    "AIA_VERNADSKY_DAILY_v1.json",
    "AIA_VERNADSKY_SHADOW_AUDIT_v1.json",
    "INDEX_INTEGRITY_AUDIT_v1.json",
    "auto_shadow_pipeline.py",
    "manifest.json",
    "icon192.png",
    "icon512.png",
    "data_manifest.json",
    "sync_shadow_assets.ps1",
    "outputs\update_strong_raw_prospective.py"
)
foreach ($f in $required) {
    if (-not (Test-Path -LiteralPath $f)) { throw "MISSING: $f" }
}

$jsonFiles = @(
    "panchanga_shadow_feed_v1.json",
    "SELECTIVE_POLICY_STRONG_RAW_v2.json",
    "STRONG_RAW_PROSPECTIVE_STATUS_v1.json",
    "AUTO_FORECAST_FEED_v1.json",
    "AUTO_PROSPECTIVE_STATUS_v1.json",
    "BGS_SPACE_WEATHER_v1.json",
    "SPACE_WEATHER_CONTEXT_v1.json",
    "KP_HOURLY_ALERT_v2.json",
    "AIA_VERNADSKY_DAILY_v1.json",
    "AIA_VERNADSKY_SHADOW_AUDIT_v1.json",
    "INDEX_INTEGRITY_AUDIT_v1.json",
    "data_manifest.json"
)
foreach ($f in $jsonFiles) {
    $null = Get-Content -Raw -LiteralPath $f | ConvertFrom-Json
    Write-Host "JSON OK: $f"
}

$indexAudit = Get-Content -Raw -LiteralPath "INDEX_INTEGRITY_AUDIT_v1.json" | ConvertFrom-Json
if ($indexAudit.status -ne "PASS") { throw "Index integrity audit must PASS" }
$aiaAudit = Get-Content -Raw -LiteralPath "AIA_VERNADSKY_SHADOW_AUDIT_v1.json" | ConvertFrom-Json
if ($aiaAudit.incremental_gate.score_effect -ne 0) { throw "AIA shadow must have score_effect=0" }
if ($aiaAudit.incremental_gate.production_allowed -ne $false) { throw "AIA shadow must not be production" }
$pwaManifest = Get-Content -Raw -LiteralPath "manifest.json" | ConvertFrom-Json
if ($pwaManifest.display -ne "standalone") { throw "PWA manifest must use standalone display" }
if (@($pwaManifest.icons).Count -lt 2) { throw "PWA manifest icon declarations are incomplete" }
Add-Type -AssemblyName System.Drawing
foreach ($icon in @(@("icon192.png", 192), @("icon512.png", 512))) {
    $image = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot $icon[0]))
    try {
        if ($image.Width -ne $icon[1] -or $image.Height -ne $icon[1]) {
            throw "Invalid PWA icon dimensions: $($icon[0]) is $($image.Width)x$($image.Height)"
        }
    } finally {
        $image.Dispose()
    }
    Write-Host "PWA ICON OK: $($icon[0])"
}

$manifest = Get-Content -Raw -LiteralPath "data_manifest.json" | ConvertFrom-Json
$overrideHash = (Get-FileHash -Algorithm MD5 -LiteralPath "expert_overrides_v3.json").Hash.Substring(0, 12)
if ($manifest.expert_overrides -ne $overrideHash) {
    throw "data_manifest expert_overrides hash does not match expert_overrides_v3.json"
}

$policy = Get-Content -Raw -LiteralPath "SELECTIVE_POLICY_STRONG_RAW_v2.json" | ConvertFrom-Json
if ($policy.condition -ne "abs(expert_raw_sum) >= 3") { throw "Policy threshold changed unexpectedly" }
if ($policy.score_effect -ne 0) { throw "Shadow policy must not alter score" }

$feed = Get-Content -Raw -LiteralPath "panchanga_shadow_feed_v1.json" | ConvertFrom-Json
$badScore = @($feed.days.PSObject.Properties.Value | Where-Object { $_.canonical_score_effect -ne 0 })
if ($badScore.Count -gt 0) { throw "Shadow feed contains non-zero score effect" }

$autoFeed = Get-Content -Raw -LiteralPath "AUTO_FORECAST_FEED_v1.json" | ConvertFrom-Json
if ($autoFeed.score_effect -ne 0) { throw "Automatic shadow feed must not alter production score" }
$autoStatus = Get-Content -Raw -LiteralPath "AUTO_PROSPECTIVE_STATUS_v1.json" | ConvertFrom-Json
if ($autoStatus.promotion_gate.required_selected_outcomes -lt 100) { throw "Automatic promotion gate was weakened" }
if ($autoStatus.promotion_gate.passed -and $autoStatus.selected_high_scored -lt 100) { throw "Invalid automatic promotion state" }
$bgs = Get-Content -Raw -LiteralPath "BGS_SPACE_WEATHER_v1.json" | ConvertFrom-Json
if ($bgs.score_effect -ne 0) { throw "BGS advisory must not alter production score" }
$physics = Get-Content -Raw -LiteralPath "SPACE_WEATHER_CONTEXT_v1.json" | ConvertFrom-Json
if ($physics.score_effect -ne 0) { throw "Accumulated space-weather context must not alter production score" }
foreach ($source in @("mag", "wind", "protons", "alerts", "enlil", "probabilities")) {
    if (-not $physics.sources.$source.ok) { throw "Required NOAA physics source failed: $source" }
}
$kpHourly = Get-Content -Raw -LiteralPath "KP_HOURLY_ALERT_v2.json" | ConvertFrom-Json
if ($kpHourly.schema -ne "kp_hourly_alert_v2") { throw "Unexpected hourly Kp schema" }
if ($kpHourly.thresholds.warning -ne 4 -or $kpHourly.thresholds.storm -ne 5) {
    throw "Hourly Kp alert thresholds changed unexpectedly"
}

$daily = Get-Content -Raw -LiteralPath "daily_chain.bat"
foreach ($needle in @("auto_pdf_intake.py", "audit_validated_pdf_coverage.py", "auto_shadow_pipeline.py", "update_strong_raw_prospective.py", "sync_shadow_assets.ps1", "generate_manifest.ps1", "verify_shadow_deploy.ps1", "git_deploy.bat")) {
    if (-not $daily.Contains($needle)) { throw "daily_chain missing step: $needle" }
}

$deploy = Get-Content -Raw -LiteralPath "deploy.ps1"
if ($deploy.Contains("git add -A")) { throw "Unsafe deploy staging detected: git add -A" }
if (-not $deploy.Contains('git add -- $filesToCopy')) { throw "Explicit deploy allowlist staging is missing" }
foreach ($needle in @("expert_overrides_v3.json", "manifest.json", "icon192.png", "icon512.png", "data_manifest.json", "meeus_core_v1.js", "panchanga_shadow_feed_v1.json", "SELECTIVE_POLICY_STRONG_RAW_v2.json", "STRONG_RAW_PROSPECTIVE_STATUS_v1.json", "AUTO_FORECAST_FEED_v1.json", "AUTO_PROSPECTIVE_STATUS_v1.json", "BGS_SPACE_WEATHER_v1.json", "SPACE_WEATHER_CONTEXT_v1.json", "KP_HOURLY_ALERT_v2.json")) {
    if (-not $deploy.Contains($needle)) { throw "deploy.ps1 missing asset: $needle" }
}

$indexHtml = Get-Content -Raw -LiteralPath "index.html"
foreach ($needle in @("gindex_kp_hourly_snapshot_v1", "МАЙБУТНІЙ ПІК · ПРОГНОЗ", "ДОБОВИЙ АГРЕГАТ")) {
    if (-not $indexHtml.Contains($needle)) { throw "Kp signal-separation regression: $needle" }
}
if (-not $indexHtml.Contains("let snap = null;")) {
    throw "fp288 hero snapshot scope guard is missing"
}
if ($indexHtml.Contains("const snap = (typeof getEngineScore==='function') ? getEngineScore(new Date(todayKyivStr()+'T12:00:00Z'))")) {
    throw "heroWhyText regression: snapshot is block-scoped again"
}
if (-not $indexHtml.Contains("let kp = (window.__uiState && isFinite(window.__uiState.kpNow))")) {
    throw "fp289 heroWhyText Kp scope guard is missing"
}
if (-not $indexHtml.Contains("базове пояснення вже встановлено")) {
    throw "fp289 heroWhyText fallback guard is missing"
}
if (-not $indexHtml.Contains('id="btnInstallApp"') -or -not $indexHtml.Contains("function pwaInstallOrHelp()")) {
    throw "fp291 permanent install-app UX is missing"
}

Write-Host "VERIFY OK: shadow deploy package is internally consistent."
Write-Host "This verifier does NOT run network update, git commit, or git push."
