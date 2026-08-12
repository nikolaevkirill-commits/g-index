[CmdletBinding()]
param(
  [string]$ConfigPath,
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ConfigPath = if ([string]::IsNullOrWhiteSpace($ConfigPath)) { Join-Path $root 'product.config.json' } else { $ConfigPath }
$OutputDirectory = if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { Join-Path $root 'generated' } else { $OutputDirectory }

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
  throw 'Missing product.config.json. Copy product.config.example.json, then set permanent applicationId and Play signing SHA-256.'
}
$config = Get-Content -Raw -Encoding UTF8 -LiteralPath $ConfigPath | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($config.applicationId) -or $config.applicationId -match 'REPLACE_' -or $config.applicationId -notmatch '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$') {
  throw 'Unsafe or invalid applicationId.'
}
if ([string]::IsNullOrWhiteSpace($config.signingSha256) -or $config.signingSha256 -match 'REPLACE_' -or $config.signingSha256 -notmatch '^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$') {
  throw 'Unsafe or invalid Play signing SHA-256 fingerprint.'
}
if ([string]::IsNullOrWhiteSpace($config.host) -or $config.host -notmatch '^[a-z0-9.-]+$') { throw 'Invalid host.' }
if ([string]::IsNullOrWhiteSpace($config.startPath) -or -not ([string]$config.startPath).StartsWith('/')) { throw 'startPath must be origin-relative.' }
if ([string]::IsNullOrWhiteSpace($config.basePath) -or -not ([string]$config.basePath).StartsWith('/') -or -not ([string]$config.basePath).EndsWith('/')) { throw 'basePath must start and end with /.' }
if ([string]::IsNullOrWhiteSpace($config.appName)) { throw 'Missing appName.' }
if ([string]::IsNullOrWhiteSpace($config.versionName) -or $config.versionName -notmatch '^\d+\.\d+\.\d+$') { throw 'versionName must use x.y.z.' }
if ([int]$config.versionCode -lt 1) { throw 'versionCode must be a positive integer.' }

$twaTemplate = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root 'android\twa-manifest.template.json')
$assetTemplate = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root 'android\assetlinks.template.json')
$twa = $twaTemplate.Replace('{{APPLICATION_ID}}', [string]$config.applicationId).
  Replace('{{HOST}}', [string]$config.host).
  Replace('{{APP_NAME}}', [string]$config.appName).
  Replace('{{START_PATH}}', [string]$config.startPath).
  Replace('{{BASE_PATH}}', [string]$config.basePath).
  Replace('{{VERSION_NAME}}', [string]$config.versionName).
  Replace('{{VERSION_CODE}}', [string][int]$config.versionCode)
$asset = $assetTemplate.Replace('{{APPLICATION_ID}}', [string]$config.applicationId).Replace('{{SIGNING_SHA256}}', ([string]$config.signingSha256).ToUpperInvariant())

$null = $twa | ConvertFrom-Json
$null = $asset | ConvertFrom-Json
if ($twa -match '\{\{.+?\}\}' -or $asset -match '\{\{.+?\}\}') { throw 'Unresolved template placeholder.' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$twaPath = Join-Path $OutputDirectory 'twa-manifest.json'
$assetPath = Join-Path $OutputDirectory 'assetlinks.json'
[System.IO.File]::WriteAllText($twaPath, $twa, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($assetPath, $asset, [System.Text.UTF8Encoding]::new($false))

[pscustomobject]@{
  schema = 'gindex_twa_package_v1'
  status = 'GENERATED'
  application_id = $config.applicationId
  start_url = "https://$($config.host)$($config.startPath)"
  version_name = $config.versionName
  version_code = [int]$config.versionCode
  twa_manifest = $twaPath
  assetlinks = $assetPath
  publish_assetlinks_to = "https://$($config.host)/.well-known/assetlinks.json"
} | ConvertTo-Json -Depth 4
