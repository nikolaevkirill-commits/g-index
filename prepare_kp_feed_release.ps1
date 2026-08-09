[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$FeedDir,

    [Parameter(Mandatory = $true)]
    [string]$TargetDir,

    [string]$PythonExe = ''
)

$ErrorActionPreference = 'Stop'

function Get-FileVersion([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Missing required file: $Path"
    }
    return (Get-FileHash -LiteralPath $Path -Algorithm MD5).Hash.Substring(0, 12).ToUpperInvariant()
}

$feedRoot = (Resolve-Path -LiteralPath $FeedDir).Path
$targetRoot = (Resolve-Path -LiteralPath $TargetDir).Path

if ($feedRoot -eq $targetRoot) {
    throw 'FeedDir and TargetDir must be different. Use an isolated release-staging directory.'
}

$requiredTargetFiles = @(
    'index.html',
    'data_manifest.json',
    'verify_production_release_guard.py',
    'expert_overrides_v3.json',
    'expert_calc_scores.json',
    'engine_scores.json'
)
foreach ($name in $requiredTargetFiles) {
    $path = Join-Path $targetRoot $name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "TargetDir is not a complete release tree; missing: $name"
    }
}

$feedFiles = @('future_kp.json', 'KP_HOURLY_ALERT_v2.json')
foreach ($name in $feedFiles) {
    $source = Join-Path $feedRoot $name
    $destination = Join-Path $targetRoot $name
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Feed file is missing: $source"
    }

    # Parse before copy so malformed runtime JSON never enters a release tree.
    Get-Content -LiteralPath $source -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
}

$manifestPath = Join-Path $targetRoot 'data_manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$manifest.version = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")
$manifest.future_kp = Get-FileVersion (Join-Path $targetRoot 'future_kp.json')
$manifest.kp_hourly_alert = Get-FileVersion (Join-Path $targetRoot 'KP_HOURLY_ALERT_v2.json')

$json = $manifest | ConvertTo-Json -Compress
[System.IO.File]::WriteAllText($manifestPath, $json, [System.Text.UTF8Encoding]::new($false))

$pythonArgs = @()
if ($PythonExe) {
    $pythonPath = (Resolve-Path -LiteralPath $PythonExe).Path
} else {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        $pythonPath = $python.Source
    } else {
        $python = Get-Command py -ErrorAction SilentlyContinue
        if (-not $python) {
            throw 'Python is required. Pass -PythonExe or install the Python launcher.'
        }
        $pythonPath = $python.Source
        $pythonArgs = @('-3')
    }
}

& $pythonPath @pythonArgs (Join-Path $targetRoot 'verify_production_release_guard.py')
if ($LASTEXITCODE -ne 0) {
    throw "Production release guard failed with exit code $LASTEXITCODE"
}

Write-Host 'PASS Kp feed release preparation'
Write-Host "Target: $targetRoot"
Write-Host "future_kp: $($manifest.future_kp)"
Write-Host "kp_hourly_alert: $($manifest.kp_hourly_alert)"
Write-Host 'No Git commit, push, deploy or production mutation was performed.'
