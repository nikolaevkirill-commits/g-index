# Publishes the refreshed hourly Kp snapshot and shared Kp forecast rail.
# It intentionally does not run the broad daily deploy or mutate model data.
$ErrorActionPreference = 'Stop'

$WorkDir = $PSScriptRoot
$workItem = Get-Item -LiteralPath $WorkDir
if ($workItem.Target) { $WorkDir = [string]$workItem.Target }

$GitDir = Join-Path $WorkDir '..\..\..\deploy_git'
$Files = @('KP_HOURLY_ALERT_v2.json', 'future_kp.json')
$ReleaseFiles = @('KP_HOURLY_ALERT_v2.json', 'future_kp.json', 'data_manifest.json')
$LogFile = Join-Path $WorkDir 'kp_alert_deploy.log'
$Stamp = Get-Date -Format 'yyyy-MM-dd_HH:mm:ss'
$DeployLockPath = Join-Path $WorkDir 'outputs\production_git_deploy.lock'

function Write-DeployLog([string]$Message) {
    $line = "[$Stamp] $Message"
    Add-Content -LiteralPath $LogFile -Value $line
    Write-Host $line
}

function Get-StagedMd5Version([string]$RepoPath) {
    $Code = "import hashlib,subprocess,sys; data=subprocess.check_output(['git','-c','safe.directory='+sys.argv[1],'-C',sys.argv[1],'show',':'+sys.argv[2]]); print(hashlib.md5(data).hexdigest().upper()[:12])"
    if ($PyLauncher) {
        $Value = & $PyLauncher.Source -3 -B -c $Code $GitDir $RepoPath
    } elseif ($Python) {
        $Value = & $Python.Source -B -c $Code $GitDir $RepoPath
    } else {
        throw 'Python is required to calculate staged production fingerprints.'
    }
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace([string]$Value)) {
        throw "Could not calculate staged production fingerprint for $RepoPath."
    }
    return ([string]$Value).Trim()
}

function Sync-CanonicalManifest {
    $ProductionManifest = Join-Path $GitDir 'data_manifest.json'
    $CanonicalManifest = Join-Path $WorkDir 'data_manifest.json'
    [IO.File]::WriteAllBytes(
        $CanonicalManifest,
        [IO.File]::ReadAllBytes($ProductionManifest)
    )
}

foreach ($Name in $Files) {
    $Source = Join-Path $WorkDir $Name
    if (!(Test-Path -LiteralPath $Source -PathType Leaf)) { throw "Kp feed is missing: $Source" }
}
if (!(Test-Path -LiteralPath (Join-Path $GitDir '.git'))) { throw "Deploy clone is missing: $GitDir" }

$gitArgs = @(
    '-c', "safe.directory=$($GitDir)",
    '-c', 'maintenance.auto=false',
    '-c', 'gc.auto=0',
    '-C', $GitDir
)
$PyLauncher = Get-Command py -ErrorAction SilentlyContinue
$Python = Get-Command python -ErrorAction SilentlyContinue
$BundledPythonPath = 'C:\Users\Dell\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
if (-not $PyLauncher -and -not $Python -and (Test-Path -LiteralPath $BundledPythonPath -PathType Leaf)) {
    $Python = Get-Item -LiteralPath $BundledPythonPath
}
if (-not $PyLauncher -and -not $Python) { throw 'Python is required to publish Kp feeds safely.' }
$DeployLock = $null
try {
    [IO.Directory]::CreateDirectory((Split-Path -Parent $DeployLockPath)) | Out-Null
    $DeployLock = [IO.File]::Open(
        $DeployLockPath,
        [IO.FileMode]::OpenOrCreate,
        [IO.FileAccess]::ReadWrite,
        [IO.FileShare]::None
    )
} catch {
    Write-DeployLog "BUSY: another production Git publisher owns $DeployLockPath. Kp publish skipped."
    exit 75
}

try {
    $CurrentBranch = (& git @gitArgs branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $CurrentBranch -ne 'deploy') {
        throw "Deploy clone must be on branch deploy; current branch is '$CurrentBranch'."
    }
    $PreExistingChanges = @(& git @gitArgs status --porcelain --untracked-files=no)
    if ($LASTEXITCODE -ne 0 -or $PreExistingChanges.Count -ne 0) {
        throw 'Deploy clone has pre-existing tracked changes. No Kp release attempted.'
    }

    & git @gitArgs pull --ff-only origin deploy
    if ($LASTEXITCODE -ne 0) { throw 'Refusing to publish Kp release: git pull --ff-only failed.' }
    $LocalHead = (& git @gitArgs rev-parse HEAD).Trim()
    $RemoteDeploy = (& git @gitArgs rev-parse origin/deploy).Trim()
    if ($LASTEXITCODE -ne 0 -or $LocalHead -ne $RemoteDeploy) {
        throw 'Local deploy HEAD does not exactly match origin/deploy after pull.'
    }

    $FuturePath = Join-Path $WorkDir 'future_kp.json'
    try {
        $Future = Get-Content -LiteralPath $FuturePath -Raw -Encoding UTF8 | ConvertFrom-Json
        $Generated = [datetime]::Parse($Future.generated).ToUniversalTime()
        if ((([datetime]::UtcNow - $Generated).TotalHours) -gt 7) {
            throw "future_kp.json is older than 7 hours ($Generated)"
        }
        Get-Content -LiteralPath (Join-Path $WorkDir 'KP_HOURLY_ALERT_v2.json') -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
    } catch {
        throw "Refusing to publish invalid or stale Kp feed: $($_.Exception.Message)"
    }

    $Backups = @{}
    foreach ($Name in $ReleaseFiles) {
        $Target = Join-Path $GitDir $Name
        if (!(Test-Path -LiteralPath $Target -PathType Leaf)) { throw "Production release file is missing: $Target" }
        $Backups[$Name] = [IO.File]::ReadAllBytes($Target)
    }

    $Changed = @()
    $CommitCreated = $false
    try {
        foreach ($Name in $Files) {
            $Source = Join-Path $WorkDir $Name
            $Target = Join-Path $GitDir $Name
            $sourceHash = (Get-FileHash -LiteralPath $Source -Algorithm SHA256).Hash
            $targetHash = (Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash
            if ($sourceHash -ne $targetHash) {
                Copy-Item -LiteralPath $Source -Destination $Target -Force
                $Changed += $Name
            }
        }

        # Stage feed payloads before hashing so fingerprints match the exact
        # LF/CRLF-normalized bytes that GitHub Pages and CI will receive.
        & git @gitArgs add -- $Files
        if ($LASTEXITCODE -ne 0) { throw 'Could not stage hourly Kp feed payloads.' }

        $ManifestPath = Join-Path $GitDir 'data_manifest.json'
        $Manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $ExpectedFuture = Get-StagedMd5Version 'future_kp.json'
        $ExpectedHourly = Get-StagedMd5Version 'KP_HOURLY_ALERT_v2.json'
        if ($Manifest.future_kp -ne $ExpectedFuture -or $Manifest.kp_hourly_alert -ne $ExpectedHourly) {
            $Manifest.version = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK')
            $Manifest.future_kp = $ExpectedFuture
            $Manifest.kp_hourly_alert = $ExpectedHourly
            $ManifestJson = $Manifest | ConvertTo-Json -Compress
            $ManifestTemp = "$ManifestPath.tmp"
            [IO.File]::WriteAllText($ManifestTemp, $ManifestJson, [Text.UTF8Encoding]::new($false))
            Move-Item -LiteralPath $ManifestTemp -Destination $ManifestPath -Force
            $Changed += 'data_manifest.json'
        }

        $Changed = @($Changed | Select-Object -Unique)
        if ($Changed.Count -eq 0) {
            Write-DeployLog 'No Kp feed or manifest changes to publish.'
            exit 0
        }

        & git @gitArgs add -- data_manifest.json
        if ($LASTEXITCODE -ne 0) { throw 'Could not stage hourly Kp manifest.' }

        $GuardScript = Join-Path $GitDir 'verify_production_release_guard.py'
        if (!(Test-Path -LiteralPath $GuardScript)) { throw "Production release guard is missing: $GuardScript" }
        if ($PyLauncher) {
            & $PyLauncher.Source -3 -B $GuardScript
        } elseif ($Python) {
            & $Python.Source -B $GuardScript
        } else {
            throw 'Python is required to run the production release guard.'
        }
        if ($LASTEXITCODE -ne 0) { throw 'Production release guard failed. No hourly Kp commit or push was attempted.' }

        & git @gitArgs diff --cached --quiet
        if ($LASTEXITCODE -eq 0) {
            Sync-CanonicalManifest
            Write-DeployLog 'No staged hourly Kp release after checksum comparison.'
            exit 0
        }

        & git @gitArgs commit -m "hourly Kp feeds $Stamp"
        if ($LASTEXITCODE -ne 0) { throw 'Could not commit hourly Kp release.' }
        $CommitCreated = $true
        & git @gitArgs push origin HEAD:deploy
        if ($LASTEXITCODE -ne 0) { throw 'Hourly Kp commit created locally, but push failed.' }

        Sync-CanonicalManifest

        Write-DeployLog "Published Kp release: $($Changed -join ', ')."
    } catch {
        if (-not $CommitCreated) {
            foreach ($Name in $ReleaseFiles) {
                [IO.File]::WriteAllBytes((Join-Path $GitDir $Name), $Backups[$Name])
            }
            & git @gitArgs restore --staged -- $ReleaseFiles 2>$null
        }
        throw
    }
} finally {
    if ($DeployLock) {
        $DeployLock.Dispose()
    }
}
