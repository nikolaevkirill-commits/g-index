$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$app = Join-Path $root 'app'
$html = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $app 'index.html')
$css = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $app 'styles.css')
$js = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $app 'app.js')
$manifestRaw = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $app 'manifest.webmanifest')
$sw = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $app 'sw.js')
$snapshotRaw = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $app 'mobile-snapshot.json')
$jyotishSnapshotRaw = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $app 'jyotish-snapshot.json')
foreach ($route in @('today','timeline','sky','jyotish','you')) { if ($html -notmatch "data-route=`"$route`"") { throw "Missing mobile route: $route" } }
if ($html -notmatch '<nav class="bottom-nav"' -or $html -notmatch 'aria-current="page"') { throw 'Mobile navigation accessibility semantics missing.' }
if ($html -notmatch 'rel="manifest"' -or $html -notmatch 'serviceWorker\.register') { throw 'Installable PWA wiring missing.' }
if ($css -notmatch 'min-height:48px' -or $css -notmatch 'prefers-reduced-motion' -or $css -notmatch 'max-width:380px') { throw 'Mobile accessibility CSS incomplete.' }
if ($js -notmatch "tanitaScoreEffect:0" -or $js -notmatch "v19_2ScoreEffect:0") { throw 'Research neutrality not visible in fixture.' }
if ($js -notmatch "score effect 0" -or $js -notmatch "'TRADITIONAL'") { throw 'Sky/Jyotish role labels missing.' }
foreach ($marker in @('jyotishCopy','data-jyotish-tab','role="tablist"','Chandra Rashi','Nakshatra Pada','Rahu Kalam','Yamagandam','Gulika Kalam','astronomical sunrise','Europe/Kyiv','DST','100-chart cross-check','Swiss Ephemeris')) {
  if ($js -notmatch [regex]::Escape($marker)) { throw "Missing Jyotish Lite contract: $marker" }
}
foreach ($marker in @('Included once already','Ya incluido una sola vez','score effect 0')) {
  if ($js -notmatch [regex]::Escape($marker)) { throw "Missing localized Jyotish role: $marker" }
}
if ($js -match '(?i)jyotish[^\r\n]{0,80}(is the final verdict|guarantees|overrides the main)') { throw 'Jyotish can masquerade as an overriding verdict.' }
if ($js -notmatch 'does not create a second verdict' -or $js -notmatch 'No crea un segundo veredicto') { throw 'Second-verdict prohibition is incomplete.' }
if ($css -notmatch 'jyotish-tabs' -or $css -notmatch 'min-height:48px' -or $css -notmatch 'factor-detail') { throw 'Jyotish accessibility styles incomplete.' }
foreach ($language in @('uk','en','es')) {
  if ($js -notmatch "(?m)^\s{2}${language}:\{") { throw "Missing complete locale bundle: $language" }
}
foreach ($marker in @('Proceed carefully','Avanza con cuidado','A green source-availability state','fuente')) {
  if ($js -notmatch [regex]::Escape($marker)) { throw "Missing localized safety copy: $marker" }
}
if ($js -notmatch 'document\.documentElement\.lang=locale\.value') { throw 'Document language is not synchronized with locale.' }
if ($js -notmatch "setAttribute\('aria-current','page'\)" -or $js -notmatch "removeAttribute\('aria-current'\)") { throw 'Active navigation semantics are not updated correctly.' }
if ($js -notmatch 'URLSearchParams\(window\.location\.search\)' -or $js -notmatch "allowedRoutes\.has\(requestedRoute\)\?requestedRoute:'today'") { throw 'Manifest shortcut cannot deep-link into a safe mobile route.' }
foreach ($marker in @('neborythm.local.v1','localStorage.setItem','localStorage.removeItem','neborythm-local-data.json','data-outcome','Birth data is not collected')) {
  if ($js -notmatch [regex]::Escape($marker)) { throw "Missing local-data safety behavior: $marker" }
}
foreach ($marker in @('LAST_GOOD','not live','data-alert','data-threshold','data-quiet','Push permission is not requested')) {
  if ($js -notmatch [regex]::Escape($marker)) { throw "Missing offline/notification safety behavior: $marker" }
}
foreach ($marker in @('data-range','day-strip','timelineMeta','Contexto bruto','labels:{low','aria-label=')) {
  if ($js -notmatch [regex]::Escape($marker) -and $css -notmatch [regex]::Escape($marker)) { throw "Missing accessible 27-day context behavior: $marker" }
}
foreach ($marker in @('sourceRole','DEMO DATA','not a live forecast','demo-notice')) {
  if ($js -notmatch [regex]::Escape($marker) -and $css -notmatch [regex]::Escape($marker)) { throw "Missing visible demo-data disclosure: $marker" }
}
$manifest = $manifestRaw | ConvertFrom-Json
if ($manifest.name -ne 'NeboRhythm' -or $manifest.display -ne 'standalone' -or $manifest.start_url -notmatch 'channel=play') { throw 'Mobile PWA manifest identity mismatch.' }
if (@($manifest.icons).Count -lt 2 -or @($manifest.shortcuts).Count -lt 3) { throw 'Mobile PWA manifest assets/shortcuts incomplete.' }
foreach ($asset in @("'./index.html'","'./styles.css'","'./app.js'","'./manifest.webmanifest'")) { if ($sw -notmatch [regex]::Escape($asset)) { throw "Service worker app shell missing: $asset" } }
if ($sw -notmatch [regex]::Escape("'./mobile-snapshot.json'")) { throw 'Service worker snapshot fallback missing.' }
if ($sw -notmatch [regex]::Escape("'./jyotish-snapshot.json'")) { throw 'Service worker Jyotish fallback missing.' }
if ($sw -notmatch [regex]::Escape("'./jyotish-calendar.json'")) { throw 'Service worker Jyotish calendar fallback missing.' }
if ($sw -notmatch "CACHE_NAME='neborythm-mobile-v6'" -or $sw -notmatch "event.request.mode==='navigate'" -or $sw -notmatch "fetch\(event.request\)" -or $sw -notmatch "catch\(\(\)=>caches.match\(event.request\)\)") { throw 'Network-first/offline-fallback service-worker policy incomplete.' }
$mobileSnapshot = $snapshotRaw | ConvertFrom-Json
if ($mobileSnapshot.schema -ne 'neborythm_mobile_snapshot_v1' -or $mobileSnapshot.source_role -ne 'DEMO_NOT_PRODUCTION') { throw 'Mobile snapshot provenance/role incomplete.' }
if (@('ACT','CAUTION','HOLD','UNKNOWN') -notcontains $mobileSnapshot.decision -or @('LIVE','DELAYED','LAST_GOOD','STALE') -notcontains $mobileSnapshot.freshness) { throw 'Mobile snapshot state invalid.' }
if ($mobileSnapshot.research.tanita_score_effect -ne 0 -or $mobileSnapshot.research.v19_2_score_effect -ne 0) { throw 'Mobile snapshot promotes research candidates.' }
if ($js -notmatch "decision:'UNKNOWN',freshness:'STALE'" -or $js -notmatch 'invalid mobile snapshot') { throw 'Mobile shell does not fail closed on invalid snapshot.' }
$jyotishSnapshot = $jyotishSnapshotRaw | ConvertFrom-Json
if ($jyotishSnapshot.schema -ne 'neborythm_jyotish_snapshot_v1' -or $jyotishSnapshot.source_role -ne 'TRADITIONAL_SHADOW' -or $jyotishSnapshot.score_effect -ne 0) { throw 'Jyotish snapshot provenance/neutrality invalid.' }
if ($js -notmatch 'acceptJyotishSnapshot' -or $js -notmatch 'Awaiting verified adapter' -or $js -notmatch 'panchanga_second_vote') { throw 'Jyotish runtime does not fail closed.' }
$node = (Get-Command node -ErrorAction Stop).Source
& $node --check (Join-Path $app 'app.js')
if ($LASTEXITCODE -ne 0) { throw 'Mobile shell JavaScript syntax failed.' }
& $node --check (Join-Path $app 'sw.js')
if ($LASTEXITCODE -ne 0) { throw 'Mobile service worker JavaScript syntax failed.' }
Write-Host 'PASS: mobile shell routes, locales, offline PWA, semantics, neutrality and JavaScript syntax.'
