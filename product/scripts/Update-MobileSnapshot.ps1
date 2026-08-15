param(
  [ValidateSet('ACT','CAUTION','HOLD','UNKNOWN')][string]$OperationalState,
  [datetime]$At=(Get-Date).ToUniversalTime()
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$node=(Get-Command node -ErrorAction Stop).Source
$source=Join-Path ([IO.Path]::GetTempPath()) ('neborythm-source-'+[guid]::NewGuid().ToString('N')+'.json')
$snapshot=Join-Path ([IO.Path]::GetTempPath()) ('neborythm-snapshot-'+[guid]::NewGuid().ToString('N')+'.json')
$target=Join-Path $root 'product\app\mobile-snapshot.json'
try {
  $producer=@("--root=$root","--output=$source","--at=$($At.ToUniversalTime().ToString('o'))")
  if($OperationalState){$producer+="--operational-state=$OperationalState"}
  & $node (Join-Path $root 'product\scripts\New-CanonicalMobileSource.mjs') @producer
  if($LASTEXITCODE -ne 0){throw 'Canonical producer failed; previous snapshot preserved.'}
  & $node (Join-Path $root 'product\scripts\New-MobileSnapshot.mjs') "--input=$source" "--output=$snapshot" '--source-role=PRODUCTION_CANONICAL' "--at=$($At.ToUniversalTime().ToString('o'))"
  if($LASTEXITCODE -ne 0){throw 'Snapshot adapter rejected data; previous snapshot preserved.'}
  Move-Item -LiteralPath $snapshot -Destination $target -Force
  Write-Host "PASS: atomically updated $target"
} finally {
  Remove-Item -LiteralPath $source -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $snapshot -Force -ErrorAction SilentlyContinue
}
