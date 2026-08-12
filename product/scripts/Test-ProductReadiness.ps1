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

function Require-File([string]$RelativePath) {
  $full = Join-Path $DashboardRoot $RelativePath
  if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { $failures.Add("missing dashboard file: $RelativePath") }
}

@('index.html','manifest.json','sw.js','icon192.png','icon512.png','TANITA_2Y_PROMOTION_GATE_v1.json','privacy.html','terms.html','account-deletion.html') | ForEach-Object { Require-File $_ }

foreach ($rel in @(
  'PRODUCT_SPEC_UK.md',
  'TANITA_INTEGRATION_UK.md',
  'android\twa-manifest.template.json',
  'android\assetlinks.template.json',
  'play-market\STORE_LISTING_UK.md',
  'play-market\DATA_SAFETY_UK.md',
  'play-market\PRIVACY_POLICY_UK.md',
  'play-market\ACCOUNT_DELETION_UK.md',
  'play-market\RELEASE_CHECKLIST_UK.md'
)) {
  if (-not (Test-Path -LiteralPath (Join-Path $productRoot $rel) -PathType Leaf)) { $failures.Add("missing product file: $rel") }
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
    if ($config.playBillingReady -ne $true) { $waits.Add('Play Billing decision/integration for digital Plus/Pro') }
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
  dashboard_root = $DashboardRoot
  product_root = $productRoot
} | ConvertTo-Json -Depth 5

if ($failures.Count) { exit 1 }
exit 0
