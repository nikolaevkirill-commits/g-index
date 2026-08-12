$ErrorActionPreference = 'Stop'
$productRoot = Split-Path -Parent $PSScriptRoot
$contractRoot = Join-Path $productRoot 'contracts'
$failures = [System.Collections.Generic.List[string]]::new()

function Load-Json([string]$Name) {
  $path = Join-Path $contractRoot $Name
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    $failures.Add("missing contract: $Name")
    return $null
  }
  try { return Get-Content -Raw -Encoding UTF8 -LiteralPath $path | ConvertFrom-Json }
  catch { $failures.Add("invalid JSON contract: $Name"); return $null }
}

$hero = Load-Json 'hero-state.example.json'
if ($hero) {
  if (@('ACT','CAUTION','HOLD','UNKNOWN') -notcontains $hero.decision) { $failures.Add('invalid hero decision') }
  if (@('OBSERVED','FORECAST','REFERENCE','CALENDAR','RESEARCH') -notcontains $hero.data_state) { $failures.Add('invalid hero data_state') }
  if (@('LIVE','DELAYED','LAST_GOOD','STALE') -notcontains $hero.freshness) { $failures.Add('invalid hero freshness') }
  if ($hero.research.tanita_score_effect -ne 0 -or $hero.research.v19_2_score_effect -ne 0) { $failures.Add('research score effect must remain zero') }
  if ([string]::IsNullOrWhiteSpace($hero.source_id) -or [string]::IsNullOrWhiteSpace($hero.observed_at)) { $failures.Add('hero provenance incomplete') }
  if ($hero.freshness -ne 'LIVE' -and $hero.decision -eq 'ACT') { $failures.Add('non-live data cannot produce ACT in example contract') }
}

$event = Load-Json 'sky-event.example.json'
if ($event) {
  if ($event.score_effect -ne 0) { $failures.Add('new sky events must default to score_effect 0') }
  if ($event.layer -ne 'ASTRONOMY') { $failures.Add('physical sky event must use ASTRONOMY layer') }
  if ($event.event_type -eq 'PLANET_GROUPING' -and @($event.bodies).Count -lt 2) { $failures.Add('planet grouping requires named bodies') }
  foreach ($field in @('timezone','visibility','visibility_rule','ephemeris_source','calculated_at')) {
    if ([string]::IsNullOrWhiteSpace([string]$event.$field)) { $failures.Add("sky event missing $field") }
  }
}

$alerts = Load-Json 'alert-preferences.example.json'
if ($alerts) {
  foreach ($rule in @($alerts.rules)) {
    if ($rule.lead_minutes -lt 0) { $failures.Add('alert lead_minutes cannot be negative') }
    if (@($rule.source_scope).Count -eq 0) { $failures.Add('alert source_scope cannot be empty') }
    if (-not $rule.observed -and -not $rule.forecast) { $failures.Add('alert must select observed or forecast') }
  }
}

$vectors = Load-Json 'timezone-test-vectors.json'
if ($vectors) {
  if ($vectors.timezone -ne 'Europe/Kyiv') { $failures.Add('canonical timezone must be Europe/Kyiv') }
  if (@($vectors.vectors).Count -lt 5) { $failures.Add('timezone regression set is incomplete') }
  foreach ($vector in @($vectors.vectors)) {
    try { [void][DateTimeOffset]::Parse($vector.utc) } catch { $failures.Add("invalid UTC vector: $($vector.utc)") }
    if ($vector.expected_local -notmatch '^2026-\d{2}-\d{2} \d{2}:\d{2}$') { $failures.Add("invalid local vector: $($vector.expected_local)") }
  }

  $pythonCandidates = @(@(
    (Get-Command python -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    'C:\Users\Dell\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -Unique)
  if (-not $pythonCandidates) {
    $failures.Add('Python runtime required for real timezone conversion test')
  } else {
    $timezoneTest = Join-Path $PSScriptRoot 'test_timezone_vectors.py'
    $timezoneResult = & ($pythonCandidates[0]) $timezoneTest (Join-Path $contractRoot 'timezone-test-vectors.json') 2>&1
    if ($LASTEXITCODE -ne 0) { $failures.Add("timezone conversion failed: $timezoneResult") }
  }
}

if ($failures.Count) {
  $failures | ForEach-Object { Write-Error $_ }
  exit 1
}
Write-Host 'PASS: product contracts preserve provenance, score neutrality, alerts and timezone gates.'
