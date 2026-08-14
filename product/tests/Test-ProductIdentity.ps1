$ErrorActionPreference = 'Stop'
$productRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$config = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $productRoot 'product.config.json') | ConvertFrom-Json
$contract = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $productRoot 'contracts\product-identity.json') | ConvertFrom-Json
$release = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $productRoot 'PRODUCT_RELEASE_MANIFEST.json') | ConvertFrom-Json
$generated = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $productRoot 'generated-identity\twa-manifest.json') | ConvertFrom-Json

$expected = 'com.neborythm.app'
foreach ($value in @($config.applicationId,$contract.application_id,$release.application_id,$generated.packageId)) {
  if ($value -ne $expected) { throw "Product identity mismatch: $value" }
}
if ($contract.application_id_status -ne 'PERMANENT_APPROVED' -or $release.application_id_status -ne 'PERMANENT_APPROVED') { throw 'Permanent applicationId approval status missing.' }
if ($generated.host -ne $config.host -or $generated.startUrl -ne $config.startPath) { throw 'Generated TWA identity differs from config.' }
if ($config.startPath -ne '/g-index/?channel=play' -or $contract.start_path -ne $config.startPath) { throw 'Play channel must start from the canonical live dashboard.' }
foreach ($value in @($config.startPath,$contract.start_path,$generated.startUrl,$generated.webManifestUrl)) {
  if ([string]$value -match '(?i)product/app|localhost|127\.0\.0\.1|fixture|demo') { throw "Play identity points to a prototype or local source: $value" }
}
if ($generated.webManifestUrl -ne 'https://nikolaevkirill-commits.github.io/g-index/manifest.json') { throw 'TWA manifest URL is not the canonical production manifest.' }
$playGate = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $productRoot 'play-market\PLAY_CONSOLE_GATE_STATUS.json') | ConvertFrom-Json
if ($config.signingSha256 -notmatch '^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$') { throw 'Play signing fingerprint is missing or invalid.' }
if ($config.signingSha256 -ne $playGate.play_app_signing_sha256) { throw 'Product config does not match the Play Console signing fingerprint evidence.' }
if ($generated.enableNotifications -ne $false -or $config.playBillingReady -ne $false) { throw 'Notifications or billing were enabled before reviewed release.' }

Write-Host 'PASS: permanent Android identity and Play signing fingerprint are consistent.'
