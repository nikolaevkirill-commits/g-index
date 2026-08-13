$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$node = (Get-Command node -ErrorAction Stop).Source
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("jyotish-snapshot-{0}.json" -f [guid]::NewGuid())
$calendarTemp = Join-Path ([System.IO.Path]::GetTempPath()) ("jyotish-calendar-{0}.json" -f [guid]::NewGuid())
try {
  & $node (Join-Path $root 'product\scripts\New-JyotishSnapshot.mjs') "--input=$(Join-Path $root 'panchanga_shadow_feed_v1.json')" "--output=$temp" '--date=2026-08-12'
  if ($LASTEXITCODE -ne 0) { throw 'Jyotish snapshot generator failed.' }
  $snapshot = Get-Content -Raw -Encoding UTF8 -LiteralPath $temp | ConvertFrom-Json
  if ($snapshot.schema -ne 'neborythm_jyotish_snapshot_v1' -or $snapshot.source_role -ne 'TRADITIONAL_SHADOW') { throw 'Jyotish provenance contract failed.' }
  if ($snapshot.score_effect -ne 0 -or $snapshot.research.canonical_score_effect -ne 0 -or $snapshot.research.panchanga_second_vote -ne $false) { throw 'Jyotish score-neutral contract failed.' }
  foreach ($name in @('tithi','nakshatra','yoga','karana')) { if (@($snapshot.components.$name.segments).Count -lt 1) { throw "Missing $name segments." } }
  if (-not $snapshot.unavailable.local_windows -or -not $snapshot.unavailable.personal_chart) { throw 'Unavailable calculations are not fail-closed.' }
  & $node (Join-Path $root 'product\scripts\New-JyotishCalendar.mjs') "--input=$(Join-Path $root 'panchanga_shadow_feed_v1.json')" "--output=$calendarTemp"
  if ($LASTEXITCODE -ne 0) { throw 'Jyotish calendar generator failed.' }
  $calendar = Get-Content -Raw -Encoding UTF8 -LiteralPath $calendarTemp | ConvertFrom-Json
  if ($calendar.schema -ne 'neborythm_jyotish_calendar_v1' -or $calendar.score_effect -ne 0 -or @($calendar.dates.psobject.Properties).Count -lt 150) { throw 'Jyotish calendar coverage/neutrality failed.' }
  $fixturePath = Join-Path $root 'product\app\jyotish-snapshot.json'
  $fixture = Get-Content -Raw -Encoding UTF8 -LiteralPath $fixturePath | ConvertFrom-Json
  if ($fixture.schema -ne 'neborythm_jyotish_snapshot_v1' -or $fixture.source_role -ne 'TRADITIONAL_SHADOW' -or $fixture.score_effect -ne 0) { throw 'Published Jyotish fixture provenance/neutrality failed.' }
  $fixtureDay = $calendar.dates.PSObject.Properties[[string]$fixture.date].Value
  if (-not $fixtureDay) { throw "Published Jyotish fixture date $($fixture.date) is outside the canonical calendar." }
  foreach ($name in @('tithi','nakshatra','yoga','karana')) {
    $fixtureSegments = @($fixture.components.PSObject.Properties[$name].Value.segments)
    $calendarSegments = @($fixtureDay.components.PSObject.Properties[$name].Value)
    if ($fixtureSegments.Count -ne $calendarSegments.Count) { throw "Published Jyotish fixture diverges from canonical $name segment count." }
    for ($i = 0; $i -lt $fixtureSegments.Count; $i++) {
      foreach ($field in @('value','start_utc','end_utc')) {
        $fixtureValue = $fixtureSegments[$i].PSObject.Properties[$field].Value
        $calendarValue = $calendarSegments[$i].PSObject.Properties[$field].Value
        if ([string]$fixtureValue -cne [string]$calendarValue) { throw "Published Jyotish fixture diverges from canonical $name segment $i field $field." }
      }
    }
  }
  $coverageDates = @($calendar.dates.psobject.Properties.Name | Sort-Object)
  if ($coverageDates[0] -gt '2026-08-13' -or $coverageDates[-1] -lt '2026-08-13') { throw 'Canonical Jyotish calendar does not cover the release audit date.' }
  Write-Host 'PASS: canonical Panchanga snapshot, provenance, score neutrality and fail-closed fields.'
} finally { Remove-Item -LiteralPath $temp,$calendarTemp -Force -ErrorAction SilentlyContinue }
