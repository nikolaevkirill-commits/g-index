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
    'C:\Users\Dell\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe',
    (Get-Command python -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue)
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -Unique)
  if (-not $pythonCandidates) {
    $failures.Add('Python runtime required for real timezone conversion test')
  } else {
    $timezoneTest = Join-Path $PSScriptRoot 'test_timezone_vectors.py'
    $timezoneResult = & ($pythonCandidates[0]) $timezoneTest (Join-Path $contractRoot 'timezone-test-vectors.json') 2>&1
    if ($LASTEXITCODE -ne 0) { $failures.Add("timezone conversion failed: $timezoneResult") }
  }
}

$history = Load-Json 'forecast-history.example.json'
if ($history) {
  foreach ($record in @($history.records)) {
    foreach ($field in @('issued_at','valid_for','decision','source_id','source_state','model_version','content_hash')) {
      if ([string]::IsNullOrWhiteSpace([string]$record.$field)) { $failures.Add("forecast history missing $field") }
    }
  }
}

$calendar = Load-Json 'calendar-export.example.json'
if ($calendar) {
  if ($calendar.disclaimer -notmatch '(?i)not a guaranteed') { $failures.Add('calendar export limitation missing') }
  if ([string]::IsNullOrWhiteSpace($calendar.source_id) -or [string]::IsNullOrWhiteSpace($calendar.data_state)) { $failures.Add('calendar export provenance incomplete') }
}

$widget = Load-Json 'widget-state.example.json'
if ($widget) {
  foreach ($field in @('decision','freshness','age_minutes','source_id','updated_at')) {
    if ($null -eq $widget.$field -or [string]::IsNullOrWhiteSpace([string]$widget.$field)) { $failures.Add("widget state missing $field") }
  }
  if ($widget.deep_link -notmatch 'channel=play') { $failures.Add('widget must deep-link into fail-closed Play channel') }
}

$activity = Load-Json 'saved-activity.example.json'
if ($activity) {
  if ($activity.score_effect -ne 0) { $failures.Add('saved activity must not alter score') }
  foreach ($field in @('activity_id','label_key','planning_mode','source_snapshot_id','disclaimer')) {
    if ([string]::IsNullOrWhiteSpace([string]$activity.$field)) { $failures.Add("saved activity missing $field") }
  }
}

$checkin = Load-Json 'outcome-checkin.example.json'
if ($checkin) {
  if ($checkin.score_effect -ne 0 -or $checkin.model_training_allowed) { $failures.Add('consumer check-in must remain score-neutral and training-off by default') }
  if ($checkin.consent -ne 'LOCAL_ONLY') { $failures.Add('example check-in must default to LOCAL_ONLY') }
}

$explanation = Load-Json 'explanation-card.example.json'
if ($explanation) {
  if ([string]::IsNullOrWhiteSpace($explanation.level_1) -or @($explanation.level_2).Count -eq 0) { $failures.Add('explanation disclosure ladder incomplete') }
  if ($explanation.research.tanita_score_effect -ne 0 -or $explanation.research.v19_2_score_effect -ne 0) { $failures.Add('explanation cannot promote research signals') }
}

$activityWindow = Load-Json 'activity-window.example.json'
if ($activityWindow) {
  if ($activityWindow.score_effect -ne 0) { $failures.Add('activity window must not alter score') }
  if (@($activityWindow.windows).Count -eq 0) { $failures.Add('activity window example requires at least one window') }
  foreach ($window in @($activityWindow.windows)) {
    if (@('ACT','CAUTION','HOLD','UNKNOWN') -notcontains $window.decision) { $failures.Add('activity window has invalid decision') }
    if (@('LIVE','DELAYED','LAST_GOOD','STALE') -notcontains $window.freshness) { $failures.Add('activity window has invalid freshness') }
  }
}

$journalSummary = Load-Json 'journal-summary.example.json'
if ($journalSummary) {
  if ($journalSummary.score_effect -ne 0 -or $journalSummary.model_training_allowed) { $failures.Add('journal summary must remain score-neutral and training-off') }
  if ($journalSummary.sample_size -lt 10 -and $journalSummary.display_mode -ne 'INSUFFICIENT_SAMPLE') { $failures.Add('small journal sample cannot claim a personal pattern') }
}

$identity = Load-Json 'product-identity.json'
if ($identity) {
  if ($identity.application_id -ne 'com.neborythm.app') { $failures.Add('permanent applicationId changed') }
  if ($identity.application_id_status -ne 'PERMANENT_APPROVED') { $failures.Add('applicationId is not approved') }
  if ($identity.host -ne 'nikolaevkirill-commits.github.io' -or $identity.start_path -ne '/g-index/?channel=play') { $failures.Add('product identity origin mismatch') }
}

if ($failures.Count) {
  $failures | ForEach-Object { Write-Error $_ }
  exit 1
}
Write-Host 'PASS: product contracts preserve provenance, score neutrality, alerts and timezone gates.'
