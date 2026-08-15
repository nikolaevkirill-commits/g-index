$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$node = (Get-Command node -ErrorAction Stop).Source
$temp = Join-Path ([IO.Path]::GetTempPath()) ('neborythm-mobile-' + [guid]::NewGuid().ToString('N') + '.json')
try {
  & $node (Join-Path $root 'product\scripts\New-MobileSnapshot.mjs') "--input=$(Join-Path $root 'product\contracts\hero-state.example.json')" "--output=$temp" '--source-role=DEMO_NOT_PRODUCTION'
  if ($LASTEXITCODE -ne 0) { throw 'Adapter execution failed.' }
  $snapshot = Get-Content -Raw -Encoding UTF8 -LiteralPath $temp | ConvertFrom-Json
  if ($snapshot.schema -ne 'neborythm_mobile_snapshot_v1' -or $snapshot.decision -ne 'CAUTION') { throw 'Adapter mapping failed.' }
  if ($snapshot.source_role -ne 'DEMO_NOT_PRODUCTION' -or $snapshot.research.tanita_score_effect -ne 0 -or $snapshot.research.v19_2_score_effect -ne 0) { throw 'Adapter provenance/research gate failed.' }
  if ($snapshot.next_change -ne '12:00') { throw 'Adapter next-change mapping failed.' }
  if ($snapshot.detail_status -ne 'UNAVAILABLE' -or @($snapshot.timeline).Count -ne 0 -or @($snapshot.sky).Count -ne 0 -or @($snapshot.context_27d).Count -ne 0) { throw 'Absent detail data did not fail closed.' }
  & $node (Join-Path $root 'product\scripts\New-MobileSnapshot.mjs') "--input=$(Join-Path $root 'product\contracts\hero-state.example.json')" "--output=$temp" '--source-role=PRODUCTION_CANONICAL' '--at=2026-08-12T10:00:00Z'
  if ($LASTEXITCODE -ne 0) { throw 'Valid production snapshot was rejected.' }
  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $node (Join-Path $root 'product\scripts\New-MobileSnapshot.mjs') "--input=$(Join-Path $root 'product\contracts\hero-state.example.json')" "--output=$temp" '--source-role=PRODUCTION_CANONICAL' '--at=2026-08-12T13:00:00Z' 2>&1 | Out-Null
  $expiredExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorPreference
  if ($expiredExitCode -eq 0) { throw 'Expired production snapshot was accepted.' }
  Write-Host 'PASS: canonical hero-state maps to a provenance-safe mobile snapshot.'
} finally {
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
}
