[CmdletBinding()]
param(
  [string]$ProjectRoot,
  [string]$Alias = 'neborythm-upload'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { Join-Path $PSScriptRoot '..\android\twa' } else { $ProjectRoot }
$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$secretDir = Join-Path $ProjectRoot '.secrets'
$keystorePath = Join-Path $secretDir 'neborythm-upload.jks'
$passwordPath = Join-Path $secretDir 'upload-password.dpapi.txt'
$unsignedAab = Join-Path $ProjectRoot 'app\build\outputs\bundle\release\app-release.aab'
$signedAab = Join-Path $ProjectRoot 'app\build\outputs\bundle\release\app-release-signed.aab'
$evidencePath = Join-Path $ProjectRoot '..\PLAY_UPLOAD_BUILD_EVIDENCE.json'
$productConfigPath = Join-Path $ProjectRoot '..\..\product.config.json'
$productConfig = Get-Content -Raw -Encoding UTF8 -LiteralPath $productConfigPath | ConvertFrom-Json

if (-not (Test-Path -LiteralPath $unsignedAab -PathType Leaf)) {
  throw "Unsigned release AAB not found: $unsignedAab"
}

New-Item -ItemType Directory -Force -Path $secretDir | Out-Null

if (-not (Test-Path -LiteralPath $keystorePath -PathType Leaf)) {
  $randomBytes = New-Object byte[] 36
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($randomBytes) } finally { $rng.Dispose() }
  $password = [Convert]::ToBase64String($randomBytes).Replace('+','A').Replace('/','B').TrimEnd('=')
  $secure = ConvertTo-SecureString $password -AsPlainText -Force
  $secure | ConvertFrom-SecureString | Set-Content -Encoding ASCII -LiteralPath $passwordPath
  & keytool -genkeypair -v -keystore $keystorePath -storepass $password -keypass $password -alias $Alias -keyalg RSA -keysize 4096 -validity 9125 -dname 'CN=NeboRhythm Upload, OU=Mobile Release, O=NeboRhythm, C=UA'
  if ($LASTEXITCODE -ne 0) { throw 'keytool failed to create upload key' }
} else {
  if (-not (Test-Path -LiteralPath $passwordPath -PathType Leaf)) { throw 'Encrypted upload-key password is missing' }
  $encryptedPassword = (Get-Content -Raw -Encoding ASCII -LiteralPath $passwordPath).Trim()
  $secure = $encryptedPassword | ConvertTo-SecureString
  $credential = New-Object System.Management.Automation.PSCredential('upload', $secure)
  $password = $credential.GetNetworkCredential().Password
}

Copy-Item -Force -LiteralPath $unsignedAab -Destination $signedAab
& jarsigner -keystore $keystorePath -storepass $password -keypass $password -sigalg SHA256withRSA -digestalg SHA-256 $signedAab $Alias
if ($LASTEXITCODE -ne 0) { throw 'jarsigner failed to sign AAB' }

$verify = & jarsigner -verify -certs $signedAab 2>&1
if ($LASTEXITCODE -ne 0 -or ($verify -join "`n") -notmatch 'jar verified') { throw "signed AAB verification failed: $verify" }

$certificate = & keytool -list -v -keystore $keystorePath -storepass $password -alias $Alias 2>&1
$shaLine = $certificate | Where-Object { $_ -match 'SHA256:\s*([0-9A-F:]{95})' } | Select-Object -First 1
if (-not $shaLine) { throw 'Could not extract upload certificate SHA-256' }
$uploadSha256 = [regex]::Match([string]$shaLine, 'SHA256:\s*([0-9A-F:]{95})').Groups[1].Value
$bundleHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $signedAab).Hash

[ordered]@{
  schema = 'neborythm_play_upload_build_evidence_v1'
  generated_at = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssK')
  application_id = 'com.neborythm.app'
  version_name = [string]$productConfig.versionName
  version_code = [int]$productConfig.versionCode
  target_sdk = 36
  signed_aab = 'product/android/twa/app/build/outputs/bundle/release/app-release-signed.aab'
  signed_aab_sha256 = $bundleHash
  upload_certificate_sha256 = $uploadSha256
  play_app_signing_sha256 = [string]$productConfig.signingSha256
  verification = 'JARSIGNER_PASS_SELF_SIGNED_UPLOAD_CERT_EXPECTED'
  secret_storage = 'LOCAL_DPAPI_ONLY_NOT_IN_GIT'
} | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath $evidencePath

[pscustomobject]@{
  status = 'SIGNED_AAB_READY'
  signed_aab = $signedAab
  signed_aab_sha256 = $bundleHash
  upload_certificate_sha256 = $uploadSha256
  evidence = (Resolve-Path $evidencePath).Path
} | ConvertTo-Json -Depth 3
