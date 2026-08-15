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
$twaTemplateRaw = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $productRoot 'android\twa-manifest.template.json')
try { $webManifest = $manifestRaw | ConvertFrom-Json } catch { $failures.Add("invalid web manifest JSON: $($_.Exception.Message)"); $webManifest = $null }
if ($webManifest) {
  if ($webManifest.start_url -ne '/g-index/' -or $webManifest.scope -ne '/g-index/') { $failures.Add('web manifest start_url/scope mismatch') }
  if ($webManifest.name -ne 'NeboRhythm: Cosmic Timing' -or $webManifest.short_name -ne 'NeboRhythm') { $failures.Add('web manifest product brand mismatch') }
  else { $passes.Add('web manifest uses NeboRhythm product brand') }
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
if ($swRaw -match "showNotification\(payload\.title \|\| 'G-Index'" -or $swRaw -match "actions:\s*\[\{[^\r\n]+G-Index") { $failures.Add('push notification surface uses obsolete G-Index product brand') }
else { $passes.Add('push notification surface uses NeboRhythm product brand') }
if ($indexRaw -notmatch 'GINDEX_PLAY_CHANNEL' -or $indexRaw -notmatch 'channel.*play' -or $indexRaw -notmatch 'play-channel #paywallOverlay') { $failures.Add('Play companion channel does not fail closed on web purchases') }
else { $passes.Add('Play companion disables web purchases') }
if ($indexRaw -match 'href="backtest\.html"') { $failures.Add('dashboard contains broken backtest.html link') }
else { $passes.Add('dashboard backtest links resolve internally') }
if ($twaTemplateRaw -notmatch '"enableNotifications"\s*:\s*false') { $failures.Add('TWA notifications enabled before reviewed push release') }
else { $passes.Add('TWA notifications fail closed') }

$twaProjectRoot = Join-Path $productRoot 'android\twa'
foreach ($twaRel in @('twa-manifest.json','settings.gradle','build.gradle','gradlew.bat','app\build.gradle','app\src\main\AndroidManifest.xml')) {
  if (-not (Test-Path -LiteralPath (Join-Path $twaProjectRoot $twaRel) -PathType Leaf)) {
    $failures.Add("missing generated TWA project file: $twaRel")
  }
}
$releaseAab = Join-Path $twaProjectRoot 'app\build\outputs\bundle\release\app-release.aab'
$signedReleaseAab = Join-Path $twaProjectRoot 'app\build\outputs\bundle\release\app-release-signed.aab'
$playUploadEvidence = Join-Path $productRoot 'android\PLAY_UPLOAD_BUILD_EVIDENCE.json'
if (Test-Path -LiteralPath $releaseAab -PathType Leaf) {
  $aabHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $releaseAab).Hash
  $passes.Add("unsigned release AAB builds successfully (SHA-256 $aabHash)")
} else {
  $waits.Add('release AAB build')
}
if ((Test-Path -LiteralPath $signedReleaseAab -PathType Leaf) -and (Test-Path -LiteralPath $playUploadEvidence -PathType Leaf)) {
  try { $uploadEvidence = Get-Content -Raw -Encoding UTF8 -LiteralPath $playUploadEvidence | ConvertFrom-Json }
  catch { $failures.Add("invalid Play upload evidence: $($_.Exception.Message)"); $uploadEvidence = $null }
  if ($uploadEvidence) {
    $actualSignedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $signedReleaseAab).Hash
    if ($actualSignedHash -ne $uploadEvidence.signed_aab_sha256) { $failures.Add('signed AAB hash does not match Play upload evidence') }
    elseif ($uploadEvidence.play_console_acceptance -ne 'ACCEPTED_INTERNAL_TRACK_2026-08-14') { $waits.Add("Play Console acceptance of signed candidate versionCode $($uploadEvidence.version_code)") }
    else { $passes.Add("signed AAB accepted by Play internal track (SHA-256 $actualSignedHash)") }
  }
} else {
  $waits.Add('signed Play upload AAB')
}

$storeAssetAudit = Join-Path $productRoot 'store-assets\verify_store_assets.py'
if (-not (Test-Path -LiteralPath $storeAssetAudit -PathType Leaf)) {
  $failures.Add('missing store asset verifier')
} else {
  $pythonCandidates = @(@(
    'C:\Users\Dell\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe',
    (Get-Command python -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue)
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
  'LOCAL_AND_EXTERNAL_GATE_CLOSURE_2026-08-12_UK.md',
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
  'play-market\PLAY_CONSOLE_SUBMISSION_DRAFT_UK.md',
  'play-market\TRADEMARK_AND_NAME_CLEARANCE_CHECKLIST_UK.md',
  'play-market\COST_AND_LAUNCH_SEQUENCE_2026-08-12_UK.md',
  'qa\BROWSER_RESPONSIVE_QA_2026-08-12.json',
  'qa\LOCAL_CLOSURE_STATUS_2026-08-14.json',
  'store-assets\STORE_ASSET_PROVENANCE_v1.json',
  'store-assets\final\neborytm-feature-graphic-1024x500-v1.png',
  'store-assets\final\neborytm-icon-512-v1.png'
)) {
  if (-not (Test-Path -LiteralPath (Join-Path $productRoot $rel) -PathType Leaf)) { $failures.Add("missing product file: $rel") }
}

$storeAssetFinal = Join-Path $productRoot 'store-assets\final'
$phoneScreenshots = @(
  Get-ChildItem -LiteralPath $storeAssetFinal -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -eq '.png' -and $_.Name -match '(?i)(phone|screenshot)' }
)
if ($phoneScreenshots.Count -lt 5) {
  $waits.Add("physical Android Google Play screenshots: $($phoneScreenshots.Count)/5 minimum prepared")
} else {
  $passes.Add("physical Android Google Play screenshots prepared: $($phoneScreenshots.Count)")
}
$browserScreenshotRoot = Join-Path $productRoot 'store-assets\screenshots'
$browserScreenshotCandidates = @(
  Get-ChildItem -LiteralPath $browserScreenshotRoot -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -match '^\.(png|jpe?g)$' }
)
if ($browserScreenshotCandidates.Count) {
  $passes.Add("browser screenshot candidates prepared (not physical-device QA): $($browserScreenshotCandidates.Count)")
}

foreach ($testRel in @('tests\Test-StoreListings.ps1','tests\Test-ProductContracts.ps1','tests\Test-ProductIdentity.ps1','tests\Test-MobileShell.ps1','tests\Test-MobileSnapshotAdapter.ps1','tests\Test-JyotishSnapshot.ps1','tests\Test-JyotishPersonalResearch.ps1')) {
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

$browserQaPath = Join-Path $productRoot 'qa\BROWSER_RESPONSIVE_QA_2026-08-12.json'
if (Test-Path -LiteralPath $browserQaPath -PathType Leaf) {
  try { $browserQa = Get-Content -Raw -Encoding UTF8 -LiteralPath $browserQaPath | ConvertFrom-Json }
  catch { $failures.Add("invalid browser QA JSON: $($_.Exception.Message)"); $browserQa = $null }
  if ($browserQa) {
    if ($browserQa.status -ne 'PASS_BROWSER_EMULATION') { $failures.Add('browser responsive QA did not pass') }
    if (-not $browserQa.play_channel.auth_hidden -or -not $browserQa.play_channel.paywall_hidden) { $failures.Add('browser QA found exposed Play account/paywall UI') }
    if (@($browserQa.viewports | Where-Object { $_.document_overflow }).Count) { $failures.Add('browser QA found document overflow') }
    else { $passes.Add('browser emulation passes Play visibility and responsive viewports') }
  }
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

# User-owned Play Console gates are recorded without storing private identity,
# address, phone or payment details in the repository.
$playGatePath = Join-Path $productRoot 'play-market\PLAY_CONSOLE_GATE_STATUS.json'
if (-not (Test-Path -LiteralPath $playGatePath -PathType Leaf)) {
  $waits.Add('Play Console account verification status')
} else {
  try { $playGate = Get-Content -Raw -Encoding UTF8 -LiteralPath $playGatePath | ConvertFrom-Json }
  catch { $failures.Add("invalid Play Console gate status: $($_.Exception.Message)"); $playGate = $null }
  if ($playGate) {
    if ($playGate.developer_registration -ne 'PAID') { $waits.Add('one-time USD 25 Play developer registration') } else { $passes.Add('Play developer registration recorded as paid') }
    if ($playGate.android_device_verification -ne 'VERIFIED') { $waits.Add('physical Android device verification') } else { $passes.Add('physical Android device verification recorded') }
    if ($playGate.identity_verification -ne 'VERIFIED') { $waits.Add("identity verification: $($playGate.identity_verification)") }
    if ($playGate.payment_profile_address -ne 'VERIFIED') { $waits.Add("payment profile address: $($playGate.payment_profile_address)") }
    if ($playGate.contact_phone_verification -ne 'VERIFIED') { $waits.Add("contact phone verification: $($playGate.contact_phone_verification)") }
    if ($playGate.app_creation -ne 'CREATED') { $waits.Add("Play app creation: $($playGate.app_creation)") } else { $passes.Add('Play app creation recorded as complete') }
    if ($playGate.digital_asset_links -ne 'VERIFIED_HTTP_200') { $waits.Add('Digital Asset Links publication and verification') } else { $passes.Add('Digital Asset Links publication recorded as HTTP 200') }
    if ($playGate.internal_release -eq 'PUBLISHED_NO_TESTERS') { $waits.Add('select internal testers') }
    elseif ($playGate.internal_release -notmatch '^PUBLISHED') { $waits.Add("Play internal release: $($playGate.internal_release)") }
    if ($playGate.support_email_verification -ne 'VERIFIED') { $waits.Add('verify support email delivery and public contact') }
    foreach ($declaration in @('data_safety','content_rating','target_audience','ads_declaration','app_access')) {
      if ($playGate.$declaration -ne 'SUBMITTED') { $waits.Add("Play Console declaration pending: $declaration") }
    }
  }
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
