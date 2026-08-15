[CmdletBinding()]
param(
  [string]$OutputRoot,
  [int]$LaunchWaitSeconds = 7,
  [switch]$AllowNonPlayInstall
)

$ErrorActionPreference = 'Stop'
$packageName = 'com.neborythm.app'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$OutputRoot = if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  Join-Path $projectRoot ('product\store-assets\screenshots\physical\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
} else { $OutputRoot }

function Find-Adb {
  $candidates = @(
    (Get-Command adb -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'),
    (Join-Path $env:USERPROFILE '.bubblewrap\android_sdk\platform-tools\adb.exe')
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -Unique
  if (-not $candidates) { throw 'ADB not found. Install Android platform-tools first.' }
  return $candidates[0]
}

function Invoke-Adb([string[]]$Arguments, [switch]$AllowFailure) {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $result = & $script:adb @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if (-not $AllowFailure -and $exitCode -ne 0) { throw "adb $($Arguments -join ' ') failed: $result" }
  return @($result)
}

function Get-UiNodes {
  $remote = '/data/local/tmp/neborythm-window.xml'
  $local = Join-Path $OutputRoot '_window.xml'
  Invoke-Adb @('shell','uiautomator','dump',$remote) | Out-Null
  Invoke-Adb @('pull',$remote,$local) | Out-Null
  [xml]$xml = Get-Content -Raw -Encoding UTF8 -LiteralPath $local
  return @($xml.SelectNodes('//node'))
}

function Tap-Accessible([string]$Label) {
  for ($attempt=0; $attempt -lt 4; $attempt++) {
    $node = Get-UiNodes | Where-Object {
      $_.text -eq $Label -or $_.'content-desc' -eq $Label
    } | Select-Object -First 1
    if ($node -and $node.bounds -match '^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$') {
      $x = [int](([int]$Matches[1] + [int]$Matches[3]) / 2)
      $y = [int](([int]$Matches[2] + [int]$Matches[4]) / 2)
      Invoke-Adb @('shell','input','tap',[string]$x,[string]$y) | Out-Null
      Start-Sleep -Seconds 2
      return
    }
    Start-Sleep -Seconds 1
  }
  $navFractions = @{ 'Зараз'=0.125; 'Джйотіш'=0.375; 'Прогноз'=0.625; 'Профіль'=0.875 }
  if ($navFractions.ContainsKey($Label)) {
    $sizeLine = ((Invoke-Adb @('shell','wm','size')) -join ' ')
    if ($sizeLine -match '(\d+)x(\d+)') {
      $x = [int]([double]$Matches[1] * [double]$navFractions[$Label])
      $y = [int]([double]$Matches[2] * 0.88)
      Invoke-Adb @('shell','input','tap',[string]$x,[string]$y) | Out-Null
      Start-Sleep -Seconds 3
      return
    }
  }
  throw "Accessible control not found and no coordinate fallback exists: $Label"
}

function Scroll-ToTop {
  for ($attempt=0; $attempt -lt 8; $attempt++) {
    Invoke-Adb @('shell','input','swipe','500','550','500','1800','180') | Out-Null
  }
  Start-Sleep -Seconds 2
}

function Capture-Screen([string]$FileName) {
  $remote = '/data/local/tmp/' + $FileName
  $local = Join-Path $OutputRoot $FileName
  Invoke-Adb @('shell','screencap','-p',$remote) | Out-Null
  Invoke-Adb @('pull',$remote,$local) | Out-Null
  if (-not (Test-Path -LiteralPath $local -PathType Leaf) -or (Get-Item -LiteralPath $local).Length -lt 10000) {
    throw "Screenshot is missing or unexpectedly small: $local"
  }
  return $local
}

function Scroll-ToText([string]$Pattern) {
  if ($Pattern -eq '27-денне порівняння сигналів') {
    for ($attempt=0; $attempt -lt 8; $attempt++) {
      Invoke-Adb @('shell','input','swipe','500','1750','500','500','350') | Out-Null
      Start-Sleep -Milliseconds 350
    }
    return
  }
  for ($attempt=0; $attempt -lt 10; $attempt++) {
    $node = Get-UiNodes | Where-Object { ([string]$_.text) -match $Pattern } | Select-Object -First 1
    if ($node) { return }
    Invoke-Adb @('shell','input','swipe','500','1500','500','500','450') | Out-Null
    Start-Sleep -Seconds 1
  }
  throw "Visible text not reached after scrolling: $Pattern"
}

$adb = Find-Adb
$deviceLines = @(Invoke-Adb @('devices','-l') | Where-Object { $_ -match '^\S+\s+device(?:\s|$)' })
if ($deviceLines.Count -ne 1) { throw "Exactly one authorized Android device is required; found $($deviceLines.Count)." }
$serial = (($deviceLines[0] -split '\s+')[0]).Trim()

$installed = (Invoke-Adb @('shell','pm','path','--user','0',$packageName) -AllowFailure) -join "`n"
if ($installed -notmatch '^package:') { throw "$packageName is not installed on the connected device." }
$installerLine = ((Invoke-Adb @('shell','cmd','package','list','packages','--user','0','-i',$packageName) -AllowFailure) -join ' ').Trim()
if (-not $AllowNonPlayInstall -and $installerLine -notmatch 'installer=com\.android\.vending') {
  throw "The installed app is not evidenced as a Google Play install: $installerLine"
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$model = ((Invoke-Adb @('shell','getprop','ro.product.manufacturer')) -join '').Trim() + ' ' + ((Invoke-Adb @('shell','getprop','ro.product.model')) -join '').Trim()
$android = ((Invoke-Adb @('shell','getprop','ro.build.version.release')) -join '').Trim()
$sdk = ((Invoke-Adb @('shell','getprop','ro.build.version.sdk')) -join '').Trim()
$wmSize = ((Invoke-Adb @('shell','wm','size')) -join ' ').Trim()
$density = ((Invoke-Adb @('shell','wm','density')) -join ' ').Trim()
$packageDump = (Invoke-Adb @('shell','dumpsys','package',$packageName)) -join "`n"
$versionName = if ($packageDump -match 'versionName=([^\s]+)') { $Matches[1] } else { 'UNKNOWN' }
$versionCode = if ($packageDump -match 'versionCode=(\d+)') { [int]$Matches[1] } else { $null }
if ($versionCode -lt 3) { throw "Installed Play build is stale: versionCode=$versionCode; versionCode 3 or newer is required." }

Invoke-Adb @('shell','input','keyevent','KEYCODE_WAKEUP') -AllowFailure | Out-Null
Invoke-Adb @('shell','wm','dismiss-keyguard') -AllowFailure | Out-Null
Invoke-Adb @('shell','cmd','statusbar','collapse') -AllowFailure | Out-Null
Start-Sleep -Seconds 1
Invoke-Adb @('shell','am','force-stop',$packageName) | Out-Null
Invoke-Adb @('shell','monkey','-p',$packageName,'-c','android.intent.category.LAUNCHER','1') | Out-Null
Start-Sleep -Seconds $LaunchWaitSeconds
Tap-Accessible 'Зараз'
Scroll-ToTop

$screenshots = [System.Collections.Generic.List[object]]::new()
$screenshots.Add([pscustomobject]@{ stage='today'; path=(Capture-Screen '01-today-physical.png') })
Tap-Accessible 'Джйотіш'
$screenshots.Add([pscustomobject]@{ stage='jyotish'; path=(Capture-Screen '02-jyotish-physical.png') })
Tap-Accessible 'Прогноз'
$screenshots.Add([pscustomobject]@{ stage='three_day'; path=(Capture-Screen '03-three-day-physical.png') })
Scroll-ToText '27-денне порівняння сигналів'
$screenshots.Add([pscustomobject]@{ stage='twenty_seven_day'; path=(Capture-Screen '04-27-day-physical.png') })
Tap-Accessible 'Профіль'
$screenshots.Add([pscustomobject]@{ stage='profile'; path=(Capture-Screen '05-profile-physical.png') })

$evidence = [ordered]@{
  schema = 'neborythm_android_physical_qa_capture_v1'
  captured_at = (Get-Date).ToString('o')
  status = if ($AllowNonPlayInstall) { 'CAPTURED_NON_PLAY_PENDING_VISUAL_REVIEW' } else { 'CAPTURED_PENDING_VISUAL_REVIEW' }
  package_name = $packageName
  installer = $installerLine
  version_name = $versionName
  version_code = $versionCode
  device = [ordered]@{ serial='REDACTED'; model=$model.Trim(); android=$android; sdk=$sdk; size=$wmSize; density=$density }
  screenshots = @($screenshots | ForEach-Object { [ordered]@{ stage=$_.stage; path=(Resolve-Path $_.path).Path; sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $_.path).Hash } })
  review_required = @('play_installed_build','standalone_no_browser_chrome','no_clipping','correct_live_data','truthful_color_semantics','no_private_notifications_or_identifiers')
}
$evidencePath = Join-Path $OutputRoot 'ANDROID_PHYSICAL_QA_CAPTURE.json'
$evidence | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -LiteralPath $evidencePath
Remove-Item -LiteralPath (Join-Path $OutputRoot '_window.xml') -Force -ErrorAction SilentlyContinue
$evidence | ConvertTo-Json -Depth 8
