[CmdletBinding()]
param(
  [string]$ConfigPath,
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ConfigPath = if ([string]::IsNullOrWhiteSpace($ConfigPath)) { Join-Path $root 'product.config.json' } else { $ConfigPath }
$OutputDirectory = if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { Join-Path $root 'generated-identity' } else { $OutputDirectory }

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) { throw 'Missing product config.' }
$config = Get-Content -Raw -Encoding UTF8 -LiteralPath $ConfigPath | ConvertFrom-Json
if ($config.applicationId -ne 'com.neborythm.app') { throw 'Permanent applicationId mismatch.' }
if ([string]::IsNullOrWhiteSpace($config.host) -or [string]::IsNullOrWhiteSpace($config.startPath)) { throw 'Host/start path missing.' }

$template = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root 'android\twa-manifest.template.json')
$manifest = $template.Replace('{{APPLICATION_ID}}', [string]$config.applicationId).
  Replace('{{HOST}}', [string]$config.host).
  Replace('{{APP_NAME}}', [string]$config.appName).
  Replace('{{START_PATH}}', [string]$config.startPath).
  Replace('{{BASE_PATH}}', [string]$config.basePath).
  Replace('{{VERSION_NAME}}', [string]$config.versionName).
  Replace('{{VERSION_CODE}}', [string][int]$config.versionCode)
$null = $manifest | ConvertFrom-Json
if ($manifest -match '\{\{.+?\}\}') { throw 'Unresolved identity placeholder.' }

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$manifestPath = Join-Path $OutputDirectory 'twa-manifest.json'
[System.IO.File]::WriteAllText($manifestPath, $manifest, [System.Text.UTF8Encoding]::new($false))

[pscustomobject]@{
  schema = 'neborytm_twa_identity_package_v1'
  status = 'IDENTITY_READY_WAIT_SIGNING'
  application_id = $config.applicationId
  start_url = "https://$($config.host)$($config.startPath)"
  twa_manifest = $manifestPath
  signing_required_for = @('assetlinks.json','verified TWA launch','Play closed-test build')
} | ConvertTo-Json -Depth 4
