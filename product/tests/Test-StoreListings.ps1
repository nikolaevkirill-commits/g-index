$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$listings = @(
    @{ Locale = 'uk'; Path = Join-Path $root 'play-market\STORE_LISTING_UK.md' },
    @{ Locale = 'en'; Path = Join-Path $root 'play-market\STORE_LISTING_EN.md' },
    @{ Locale = 'es'; Path = Join-Path $root 'play-market\STORE_LISTING_ES.md' }
)

$forbiddenAsciiClaims = @(
    'guaranteed accuracy', 'guaranteed outcome', 'best time to act',
    'precision garantizada', 'resultado garantizado', 'mejor momento para actuar'
)

$failures = [System.Collections.Generic.List[string]]::new()
foreach ($listing in $listings) {
    if (-not (Test-Path -LiteralPath $listing.Path)) {
        $failures.Add("Missing listing: $($listing.Path)")
        continue
    }

    $text = Get-Content -LiteralPath $listing.Path -Raw -Encoding utf8
    $sections = [regex]::Matches($text, '(?ms)^## .+?\r?\n\s*(.+?)\r?\n')
    if ($sections.Count -lt 2) {
        $failures.Add("$($listing.Locale): listing sections are incomplete")
    } else {
        $shortDescription = $sections[1].Groups[1].Value.Trim()
        if ($shortDescription.Length -gt 80) {
            $failures.Add("$($listing.Locale): short description exceeds 80 characters")
        }
    }

    foreach ($claim in $forbiddenAsciiClaims) {
        if ($text.IndexOf($claim, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            $failures.Add("$($listing.Locale): prohibited claim '$claim'")
        }
    }

    if ($text -notmatch '(?i)(guarantee|garantiza)' -and $listing.Locale -ne 'uk') {
        $failures.Add("$($listing.Locale): limitation statement missing")
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "PASS: $($listings.Count) localized store listings satisfy length and claim rules."
