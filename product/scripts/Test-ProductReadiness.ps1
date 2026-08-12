[CmdletBinding()]
param(
  [string]$ConfigPath,
  [string]$DashboardRoot
)

$ErrorActionPreference = 'Stop'
$ConfigPath = if ([string]::IsNullOrWhiteSpace($ConfigPath)) { Join-Path $PSScriptRoot '..\product.config.json' } else { $ConfigPath }
$DashboardRoot = if ([string]::IsNullOrWhiteSpace($DashboardRoot)) { (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path } else { (Resolve-Path $DashboardRoot).Path }
$productRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$failures = [System.Collections.Generic.List[string]]::new()
$waits = [System.Collections.Generic.List[string]]::new()
$passes = [System.Collections.Generic.List[string]]::new()

function Require-File([string]$RelativePath) {
  $full = Join-Path $DashboardRoot $RelativePath
  if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { $failures.Add("missing dashboard file: $RelativePath") }
}

@('index.html','manifest.json','sw.js','icon192.png','icon512.png','TANITA_2Y_PROMOTION_GATE_v1.json','privacy.html','terms.html','account-deletion.html') | ForEach-Object { Require-File $_ }

$indexRaw = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $DashboardRoot 'index.html')
$manifestRaw = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $DashboardRoot 'manifest.json')
$swRaw = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $DashboardRoot 'sw.js')
try { $webManifest = $manifestRaw | ConvertFrom-Json } catch { $failures.Add("invalid web manifest JSON: $($_.Exception.Message)"); $webManifest = $null }
if ($webManifest) {
  if ($webManifest.start_url -ne '/g-index/' -or $webManifest.scope -ne '/g-index/') { $failures.Add('web manifest start_url/scope mismatch') }
  foreach ($shortcut in @($webManifest.shortcuts)) {
    $target = [string]$shortcut.url
    if ($target -match '^/g-index/([^#?]+\.html)') {
      $localTarget = Join-Path $DashboardRoot $Matches[1]
      if (-not (Test-Path -LiteralPath $localTarget -PathType Leaf)) { $failures.Add("broken web manifest shortcut: $target") }
    }
  }
  if ($indexRaw -notmatch [regex]::Escape($webManifest.version)) { $failures.Add('web manifest version is not synchronized with dashboard title') }
  else { $passes.Add('web manifest version matches dashboard') }
}
if ($swRaw -notmatch "CACHE_VERSION = 'fp\d+-v\d+'") { $failures.Add('service worker cache version missing') }
else { $passes.Add('service worker cache version present') }
if ($indexRaw -notmatch 'GINDEX_PLAY_CHANNEL' -or $indexRaw -notmatch 'channel.*play' -or $indexRaw -notmatch 'play-channel #paywallOverlay') { $failures.Add('Play companion channel does not fail closed on web purchases') }
else { $passes.Add('Play companion disables web purchases') }
if ($indexRaw -match 'href="backtest\.html"') { $failures.Add('dashboard contains broken backtest.html link') }
else { $passes.Add('dashboard backtest links resolve internally') }

$storeAssetAudit = Join-Path $productRoot 'store-assets\verify_store_assets.py'
if (-not (Test-Path -LiteralPath $storeAssetAudit -PathType Leaf)) {
  $failures.Add('missing store asset verifier')
} else {
  $pythonCandidates = @(@(
    (Get-Command python -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    'C:\Users\Dell\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -Unique)
  if (-not $pythonCandidates) {
    $waits.Add('Python runtime for store asset provenance audit')
  } else {
    $assetResult = & ($pythonCandidates[0]) $storeAssetAudit 2>&1
    if ($LASTEXITCODE -ne 0) { $failures.Add("store asset audit failed: $assetResult") }
    else { $passes.Add('store assets pass dimensions, metadata and SHA-256 audit') }
  }
}

foreach ($rel in @(
  'PRODUCT_SPEC_UK.md',
  'MVP_INFORMATION_ARCHITECTURE_UK.md',
  'BRAND_SYSTEM_NEBORYTM_UK.md',
  'FACTOR_EXPLAINER_UK.md',
  'IP_AND_ANTI_COPY_PLAN_UK.md',
  'TANITA_INTEGRATION_UK.md',
  'android\twa-manifest.template.json',
  'android\assetlinks.template.json',
  'play-market\STORE_LISTING_UK.md',
  'play-market\DATA_SAFETY_UK.md',
  'play-market\PRIVACY_POLICY_UK.md',
  'play-market\ACCOUNT_DELETION_UK.md',
  'play-market\RELEASE_CHECKLIST_UK.md',
  'store-assets\STORE_ASSET_PROVENANCE_v1.json',
  'store-assets\final\neborytm-feature-graphic-1024x500-v1.png',
  'store-assets\final\neborytm-icon-512-v1.png'
)) {
  if (-not (Test-Path -LiteralPath (Join-Path $productRoot $rel) -PathType Leaf)) { $failures.Add("missing product file: $rel") }
}

foreach ($testRel in @('tests\Test-StoreListings.ps1','tests\Test-ProductContracts.ps1')) {
  $testPath = Join-Path $productRoot $testRel
  if (-not (Test-Path -LiteralPath $testPath -PathType Leaf)) {
    $failures.Add("missing product test: $testRel")
    continue
  }
  $testResult = & powershell -NoProfile -ExecutionPolicy Bypass -File $testPath 2>&1
  if ($LASTEXITCODE -ne 0) { $failures.Add("product test failed: $testRel :: $testResult") }
  else { $passes.Add("product test passed: $testRel") }
}

$releaseManifestPath = Join-Path $productRoot 'PRODUCT_RELEASE_MANIFEST.json'
try { $releaseManifest = Get-Content -Raw -Encoding UTF8 -LiteralPath $releaseManifestPath | ConvertFrom-Json }
catch { $failures.Add("invalid product release manifest: $($_.Exception.Message)"); $releaseManifest = $null }
if ($releaseManifest) {
  if ([string]::IsNullOrWhiteSpace([string]$releaseManifest.product)) { $failures.Add('product brand is empty') }
  elseif (([string]$releaseManifest.product).Length -le 30) { $passes.Add('store title is within 30 characters') }
  else { $failures.Add('store title exceeds 30 characters') }
  if ($releaseManifest.technical_engine_name -ne 'G-Index') { $failures.Add('technical engine identity changed unexpectedly') }
  if ($releaseManifest.forecast_contract.tanita_score_effect -ne 0 -or $releaseManifest.forecast_contract.v19_2_score_effect -ne 0) {
    $failures.Add('research candidates are not score-neutral')
  } else { $passes.Add('Tanita and v19.2 remain score-neutral') }
}

if (Test-Path -LiteralPath $ConfigPath -PathType Leaf) {
  try { $config = Get-Content -Raw -Encoding UTF8 -LiteralPath $ConfigPath | ConvertFrom-Json }
  catch { $failures.Add("invalid product config JSON: $($_.Exception.Message)"); $config = $null }
  if ($config) {
    if ([string]::IsNullOrWhiteSpace($config.applicationId) -or $config.applicationId -match 'REPLACE_') { $waits.Add('permanent applicationId') }
    elseif ($config.applicationId -notmatch '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$') { $failures.Add('applicationId format is invalid') }
    if ([string]::IsNullOrWhiteSpace($config.signingSha256) -or $config.signingSha256 -match 'REPLACE_') { $waits.Add('Play signing SHA-256') }
    elseif ($config.signingSha256 -notmatch '^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$') { $failures.Add('signingSha256 must be a colon-separated SHA-256 fingerprint') }
    if ([string]::IsNullOrWhiteSpace($config.supportEmail) -or $config.supportEmail -match 'REPLACE_') { $waits.Add('verified support email') }
    if ([string]::IsNullOrWhiteSpace($config.accountDeletionUrl) -or $config.accountDeletionUrl -match 'REPLACE_') { $waits.Add('public account deletion URL') }
    if ([string]::IsNullOrWhiteSpace($config.startPath) -or $config.startPath -ne '/g-index/?channel=play') { $failures.Add('TWA startPath must use the fail-closed Play companion channel') }
    if ($config.playBillingReady -eq $true) { $waits.Add('Play Billing implementation requires a separate reviewed release') }
  }
} else {
  $waits.Add('product.config.json copied from product.config.example.json')
}

$tanitaPath = Join-Path $DashboardRoot 'TANITA_2Y_PROMOTION_GATE_v1.json'
if (Test-Path -LiteralPath $tanitaPath) {
  try {
    $gate = Get-Content -Raw -Encoding UTF8 -LiteralPath $tanitaPath | ConvertFrom-Json
    if ($gate.score_effect -ne 0 -or $gate.production_change -ne $false) { $failures.Add('Tanita gate is not score-neutral') }
  } catch { $failures.Add("invalid Tanita gate: $($_.Exception.Message)") }
}

$status = if ($failures.Count) { 'FAIL' } elseif ($waits.Count) { 'WAIT' } else { 'READY_FOR_TWA_BUILD' }
[pscustomobject]@{
  schema = 'gindex_product_readiness_v1'
  status = $status
  hard_failures = @($failures)
  external_or_identity_gates = @($waits)
  local_checks_passed = @($passes)
  dashboard_root = $DashboardRoot
  product_root = $productRoot
} | ConvertTo-Json -Depth 5

if ($failures.Count) { exit 1 }
exit 0
