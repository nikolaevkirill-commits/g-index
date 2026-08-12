$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$app = Join-Path $root 'app'
$html = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $app 'index.html')
$css = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $app 'styles.css')
$js = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $app 'app.js')
foreach ($route in @('today','timeline','sky','jyotish','you')) { if ($html -notmatch "data-route=`"$route`"") { throw "Missing mobile route: $route" } }
if ($html -notmatch '<nav class="bottom-nav"' -or $html -notmatch 'aria-current="page"') { throw 'Mobile navigation accessibility semantics missing.' }
if ($css -notmatch 'min-height:48px' -or $css -notmatch 'prefers-reduced-motion' -or $css -notmatch 'max-width:380px') { throw 'Mobile accessibility CSS incomplete.' }
if ($js -notmatch "tanitaScoreEffect:0" -or $js -notmatch "v19_2ScoreEffect:0") { throw 'Research neutrality not visible in fixture.' }
if ($js -notmatch "score effect 0" -or $js -notmatch "'TRADITIONAL'") { throw 'Sky/Jyotish role labels missing.' }
foreach ($language in @('uk','en','es')) {
  if ($js -notmatch "(?m)^\s{2}${language}:\{") { throw "Missing complete locale bundle: $language" }
}
foreach ($marker in @('Proceed carefully','Avanza con cuidado','A green source-availability state','fuente')) {
  if ($js -notmatch [regex]::Escape($marker)) { throw "Missing localized safety copy: $marker" }
}
if ($js -notmatch 'document\.documentElement\.lang=locale\.value') { throw 'Document language is not synchronized with locale.' }
if ($js -notmatch "setAttribute\('aria-current','page'\)" -or $js -notmatch "removeAttribute\('aria-current'\)") { throw 'Active navigation semantics are not updated correctly.' }
foreach ($marker in @('neborythm.local.v1','localStorage.setItem','localStorage.removeItem','neborythm-local-data.json','data-outcome','Birth data is not collected')) {
  if ($js -notmatch [regex]::Escape($marker)) { throw "Missing local-data safety behavior: $marker" }
}
$node = (Get-Command node -ErrorAction Stop).Source
& $node --check (Join-Path $app 'app.js')
if ($LASTEXITCODE -ne 0) { throw 'Mobile shell JavaScript syntax failed.' }
Write-Host 'PASS: mobile shell routes, 3 locale bundles, semantics, research neutrality and JavaScript syntax.'
