$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$config=Get-Content -Raw -Encoding UTF8 (Join-Path $root 'product\product.config.json')|ConvertFrom-Json
$links=Get-Content -Raw -Encoding UTF8 (Join-Path $root '.well-known\assetlinks.json')|ConvertFrom-Json
if(@($links).Count -ne 1){throw 'Expected exactly one Digital Asset Link.'}
$target=@($links)[0].target
if($target.namespace -ne 'android_app'){throw 'Digital Asset Link namespace mismatch.'}
if($target.package_name -ne $config.applicationId){throw 'Digital Asset Link package mismatch.'}
if(@($target.sha256_cert_fingerprints) -notcontains $config.signingSha256){throw 'Play App Signing SHA-256 mismatch.'}
if(@($links)[0].relation -notcontains 'delegate_permission/common.handle_all_urls'){throw 'TWA relation missing.'}
$aab=Join-Path $root 'product\android\twa\app\build\outputs\bundle\release\app-release-signed.aab'
$evidence=Get-Content -Raw -Encoding UTF8 (Join-Path $root 'product\android\PLAY_UPLOAD_BUILD_EVIDENCE.json')|ConvertFrom-Json
if(!(Test-Path $aab)){throw 'Signed AAB missing.'}
if((Get-FileHash -Algorithm SHA256 $aab).Hash -ne $evidence.signed_aab_sha256){throw 'Signed AAB hash differs from evidence.'}
if($evidence.play_app_signing_sha256 -ne $config.signingSha256){throw 'Build evidence signing SHA differs from config.'}
Write-Host 'PASS: signed AAB, Play signing fingerprint and Digital Asset Links are consistent.'
