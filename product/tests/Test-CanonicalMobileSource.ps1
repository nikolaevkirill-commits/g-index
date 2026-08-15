$ErrorActionPreference='Stop'
$root=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$node=(Get-Command node -ErrorAction Stop).Source
$temp=Join-Path ([IO.Path]::GetTempPath()) ('canonical-mobile-'+[guid]::NewGuid().ToString('N')+'.json')
try {
  & $node (Join-Path $root 'product\scripts\New-CanonicalMobileSource.mjs') "--root=$root" "--output=$temp" '--at=2026-08-14T17:10:00Z'
  if($LASTEXITCODE -ne 0){throw 'Producer failed.'}
  $data=Get-Content -Raw -Encoding UTF8 $temp|ConvertFrom-Json
  if($data.decision -ne 'UNKNOWN' -or $data.reason_code -ne 'OPERATIONAL_EXPORT_UNAVAILABLE'){throw 'Producer invented current operation.'}
  if(@($data.timeline).Count -lt 3 -or @($data.sky).Count -lt 3){throw 'Canonical detail mapping incomplete.'}
  if(@($data.sky|Where-Object {$_.score_effect -ne 0}).Count){throw 'Sky data changed score.'}
  & $node (Join-Path $root 'product\scripts\New-CanonicalMobileSource.mjs') "--root=$root" "--output=$temp" '--at=2026-08-14T17:10:00Z' '--operational-state=HOLD'
  if($LASTEXITCODE -ne 0){throw 'Operational export failed.'}
  $data=Get-Content -Raw -Encoding UTF8 $temp|ConvertFrom-Json
  if($data.decision -ne 'HOLD' -or $data.reason_code -ne 'CANONICAL_OPERATIONAL_EXPORT'){throw 'Canonical operation not preserved.'}
  Write-Host 'PASS: canonical product producer separates operational state, daily references and observed Sky data.'
} finally {Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue}
