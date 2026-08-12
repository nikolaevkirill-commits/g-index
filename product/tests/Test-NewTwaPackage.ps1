[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$productRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$testRoot = Join-Path $PSScriptRoot '.tmp-twa-test'
$generator = Join-Path $productRoot 'scripts\New-TwaPackage.ps1'

if (-not $testRoot.StartsWith($PSScriptRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Unsafe test output path.'
}
if (Test-Path -LiteralPath $testRoot) {
  Remove-Item -LiteralPath $testRoot -Recurse -Force
}

try {
  New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
  $configPath = Join-Path $testRoot 'product.config.test.json'
  $outputPath = Join-Path $testRoot 'generated'
  $fingerprint = (0..31 | ForEach-Object { $_.ToString('X2') }) -join ':'
  $config = [ordered]@{
    schema = 'gindex_product_config_v1'
    applicationId = 'com.example.gindex.test'
    host = 'example.test'
    startUrl = '/g-index/'
    signingSha256 = $fingerprint
    supportEmail = 'test@example.test'
    accountDeletionUrl = 'https://example.test/g-index/account-deletion.html'
    playBillingReady = $false
  }
  [System.IO.File]::WriteAllText($configPath, ($config | ConvertTo-Json -Depth 4), [System.Text.UTF8Encoding]::new($false))

  $resultJson = & $generator -ConfigPath $configPath -OutputDirectory $outputPath
  $result = $resultJson | ConvertFrom-Json
  if ($result.status -ne 'GENERATED') { throw 'Generator did not report GENERATED.' }

  $twaPath = Join-Path $outputPath 'twa-manifest.json'
  $assetPath = Join-Path $outputPath 'assetlinks.json'
  $twaRaw = Get-Content -Raw -Encoding UTF8 -LiteralPath $twaPath
  $assetRaw = Get-Content -Raw -Encoding UTF8 -LiteralPath $assetPath
  $null = $twaRaw | ConvertFrom-Json
  $asset = $assetRaw | ConvertFrom-Json
  if ($twaRaw -match '\{\{.+?\}\}' -or $assetRaw -match '\{\{.+?\}\}') { throw 'Generated files still contain template placeholders.' }
  if ($asset[0].target.package_name -ne $config.applicationId) { throw 'assetlinks package_name does not match applicationId.' }
  if ($asset[0].target.sha256_cert_fingerprints[0] -ne $fingerprint) { throw 'assetlinks signing fingerprint does not match config.' }

  [pscustomobject]@{
    schema = 'gindex_twa_generator_test_v1'
    status = 'PASS'
    assertions = 6
    test_application_id = $config.applicationId
    warning = 'TEST DATA ONLY - DO NOT PUBLISH'
  } | ConvertTo-Json -Depth 3
} finally {
  if (Test-Path -LiteralPath $testRoot) {
    Remove-Item -LiteralPath $testRoot -Recurse -Force
  }
}
