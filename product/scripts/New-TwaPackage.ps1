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

$twaTemplate = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root 'android\twa-manifest.template.json')
$assetTemplate = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root 'android\assetlinks.template.json')
$twa = $twaTemplate.Replace('{{APPLICATION_ID}}', [string]$config.applicationId)
$asset = $assetTemplate.Replace('{{APPLICATION_ID}}', [string]$config.applicationId).Replace('{{SIGNING_SHA256}}', ([string]$config.signingSha256).ToUpperInvariant())

$null = $twa | ConvertFrom-Json
$null = $asset | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$twaPath = Join-Path $OutputDirectory 'twa-manifest.json'
$assetPath = Join-Path $OutputDirectory 'assetlinks.json'
[System.IO.File]::WriteAllText($twaPath, $twa, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($assetPath, $asset, [System.Text.UTF8Encoding]::new($false))

[pscustomobject]@{
  schema = 'gindex_twa_package_v1'
  status = 'GENERATED'
  application_id = $config.applicationId
  twa_manifest = $twaPath
  assetlinks = $assetPath
  publish_assetlinks_to = "https://$($config.host)/.well-known/assetlinks.json"
} | ConvertTo-Json -Depth 4
