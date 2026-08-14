$ErrorActionPreference = 'Stop'
$productRoot = Split-Path -Parent $PSScriptRoot
$engineRoot = Join-Path $productRoot 'jyotish-engine'
$contractPath = Join-Path $productRoot 'contracts\jyotish-profile.example.json'
$statusPath = Join-Path $productRoot 'qa\JYOTISH_VALIDATION_STATUS.json'

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js is required for Jyotish personal research tests.' }

& $node.Source (Join-Path $engineRoot 'test.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Jyotish personal research engine test failed.' }

$contract = Get-Content -Raw -Encoding UTF8 -LiteralPath $contractPath | ConvertFrom-Json
$status = Get-Content -Raw -Encoding UTF8 -LiteralPath $statusPath | ConvertFrom-Json

if ($contract.storage_scope -ne 'LOCAL_ONLY' -or $contract.sync_enabled -ne $false) { throw 'Birth profile must remain local-only.' }
if (-not $contract.consent_required -or -not $contract.export_supported -or -not $contract.delete_supported) { throw 'Birth profile consent/export/delete contract incomplete.' }
if ($contract.calculation.score_effect -ne 0) { throw 'Jyotish research layer must remain score-neutral.' }
if ($contract.calculation.activation -notmatch '^BLOCKED_') { throw 'Jyotish activation must fail closed.' }
if ($status.independent_reference_charts_validated -lt $status.independent_reference_charts_required -and $status.consumer_activation -ne 'BLOCKED') { throw 'Unvalidated Jyotish engine cannot be consumer-active.' }
if ($status.operational_score_effect -ne 0) { throw 'Jyotish validation status must remain score-neutral.' }

Write-Host 'PASS: Jyotish personal research engine, privacy and fail-closed validation gates.'
