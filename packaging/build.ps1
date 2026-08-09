# Builds the complete installation package: npm run package runs this.
#
# The result is dist\PalAssistent-<version>-Setup.exe - an installer that does not
# require the recipient to have Node, Python or anything else. Everything needed
# is in the package:
#
#   PalAssistent.exe   the launcher (packaging\Launcher.cs, compiled with csc)
#   server.js + .next-package\   Next in standalone mode
#   node\node.exe      your own Node, MIT licensed and free to ship
#   tools\palsave\     the save reader as an exe, with libooz.dll baked in
#   public\            icons and pal-data.json (emptied of your box)
#
# The steps can be skipped one by one while iterating, e.g.
#   powershell -File packaging\build.ps1 -SkipNextBuild -SkipPalsave

param(
    [switch]$SkipNextBuild,
    [switch]$SkipPalsave,
    [switch]$SkipInstaller
)

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
# The version has ONE source: package.json. The installer gets it via
# /DAppVersion and the app via next.config.ts, so a release can never say two
# different things.
$version = (Get-Content (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).version
$build = Join-Path $PSScriptRoot 'build'
$payload = Join-Path $build 'payload'
$pyDist = Join-Path $build 'dist\palsave'
$nextDir = Join-Path $repo '.next-package'
$distDir = Join-Path $repo 'dist'

function Step($text) { Write-Host "==> $text" -ForegroundColor Cyan }

# --- 1. Next in standalone mode ----------------------------------------------
# PA_PACKAGE controls both the output mode and distDir (see next.config.ts). A
# separate distDir means a running dev server can keep running - the build never
# touches .next.

if (-not $SkipNextBuild) {
    Step 'Building Next (standalone, .next-package)'
    Push-Location $repo
    try {
        $env:PA_PACKAGE = '1'
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed ($LASTEXITCODE)" }
    }
    finally {
        Remove-Item Env:\PA_PACKAGE -ErrorAction SilentlyContinue
        Pop-Location
    }
}
if (-not (Test-Path (Join-Path $nextDir 'standalone\server.js'))) {
    throw "Cannot find the standalone build. Run without -SkipNextBuild."
}

# --- 2. the save reader as an exe --------------------------------------------
# --collect-all is needed: palworld_save_tools loads its rawdata decoders
# dynamically and static analysis does not find them. libooz.dll goes in as a
# binary and ends up in _internal, where palsave.py looks for it via sys._MEIPASS.

if (-not $SkipPalsave) {
    Step 'Building palsave.exe (PyInstaller)'
    python -m PyInstaller --onedir --noconfirm --clean --console `
        --name palsave `
        --collect-all palworld_save_tools `
        --add-binary "$(Join-Path $repo 'tools\libooz.dll');." `
        --distpath (Join-Path $build 'dist') `
        --workpath (Join-Path $build 'work') `
        --specpath $build `
        (Join-Path $repo 'tools\palsave.py')
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed ($LASTEXITCODE)" }
}
if (-not (Test-Path (Join-Path $pyDist 'palsave.exe'))) {
    throw "Cannot find palsave.exe. Run without -SkipPalsave."
}

# --- 3. the icon -------------------------------------------------------------

Step 'Drawing the icon'
& (Join-Path $PSScriptRoot 'make-icon.ps1') | Out-Null

# --- 4. assemble the payload -------------------------------------------------

Step 'Assembling the payload'
if (Test-Path $payload) { Remove-Item $payload -Recurse -Force }
New-Item -ItemType Directory -Path $payload -Force | Out-Null

# The standalone tree is the base: server.js, package.json and the node_modules
# the file tracing actually arrived at.
Copy-Item (Join-Path $nextDir 'standalone\*') $payload -Recurse -Force

# Next does NOT copy static into standalone - it says so in their documentation
# and it is easy to miss, because the server starts anyway and the page merely
# comes out unstyled.
$staticSrc = Join-Path $nextDir 'static'
$staticDst = Join-Path $payload '.next-package\static'
New-Item -ItemType Directory -Path $staticDst -Force | Out-Null
Copy-Item "$staticSrc\*" $staticDst -Recurse -Force

# public/ likewise: only data\ came along by itself, not the 56 game icons.
Copy-Item (Join-Path $repo 'public') $payload -Recurse -Force

# The tools\ the file tracing picked up holds palsave.py without libooz.dll
# (useless without Python) and the whole of tools\backup - that is, your previous
# box, 2 MB that must absolutely not be sent to anyone else. Out with all of it,
# in with the exe version.
$toolsDst = Join-Path $payload 'tools'
if (Test-Path $toolsDst) { Remove-Item $toolsDst -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $toolsDst 'palsave') -Force | Out-Null
Copy-Item "$pyDist\*" (Join-Path $toolsDst 'palsave') -Recurse -Force

# Node itself. MIT licensed, free to distribute; the licence text comes along.
Step 'Copying node.exe'
$nodeExe = (Get-Command node -ErrorAction Stop).Source
New-Item -ItemType Directory -Path (Join-Path $payload 'node') -Force | Out-Null
Copy-Item $nodeExe (Join-Path $payload 'node\node.exe') -Force
$nodeLicense = Join-Path (Split-Path -Parent $nodeExe) 'LICENSE'
if (Test-Path $nodeLicense) {
    Copy-Item $nodeLicense (Join-Path $payload 'node\LICENSE') -Force
}

# --- 5. the empty box --------------------------------------------------------
# The bundle contains your own box. The static half (species, breeding table,
# passives, icons) is meant to ship, but pals/player/exported/implants are
# blanked - otherwise the recipient opens the program and sees your pals.
#
# implants are read from the save's item containers and are therefore yours too:
# if a new field is added to AppData that comes FROM THE SAVE, blank it here in
# the same breath.

Step 'Emptying the box from pal-data.json'
$dataFile = Join-Path $payload 'public\data\pal-data.json'
$blankScript = @'
const fs = require("fs");
// argv[0] is node, argv[1] is this file - the first real argument is [2].
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, "utf8"));
data.pals = [];
data.player = "";
data.exported = "";
// An empty object, not delete: {} means "read, you own none" and is true in a
// fresh installation. `undefined` would have meant "do not know" and made the
// app keep quiet about implants until the first import.
data.implants = {};
fs.writeFileSync(file, JSON.stringify(data));
console.log("    species left: " + data.species.length + ", pals: " + data.pals.length
  + ", implants: " + Object.keys(data.implants).length);
'@
$blankFile = Join-Path $build 'blank-data.js'
# Set-Content -Encoding utf8 adds a BOM in Windows PowerShell 5.1. Node copes
# with it, but write it clean anyway - the file is not there to argue about.
[System.IO.File]::WriteAllText($blankFile, $blankScript, (New-Object System.Text.UTF8Encoding($false)))
node $blankFile $dataFile
if ($LASTEXITCODE -ne 0) { throw "Could not empty pal-data.json" }

# --- 6. the launcher ---------------------------------------------------------
# csc.exe ships with .NET Framework 4 and is therefore on every Windows - no
# toolchain to install. winexe = no console window behind the app.

Step 'Compiling the launcher'
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { throw "Cannot find csc.exe ($csc)" }
& $csc /nologo /target:winexe /platform:anycpu /optimize+ `
    /out:"$(Join-Path $payload 'PalAssistent.exe')" `
    /win32icon:"$(Join-Path $PSScriptRoot 'app.ico')" `
    /r:System.dll /r:System.Windows.Forms.dll `
    "$(Join-Path $PSScriptRoot 'Launcher.cs')"
if ($LASTEXITCODE -ne 0) { throw "csc failed ($LASTEXITCODE)" }

$size = (Get-ChildItem $payload -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Host ("    payload: {0:N0} MB" -f [math]::Round($size / 1MB, 0)) -ForegroundColor DarkGray

# --- 7. the installer --------------------------------------------------------

if (-not $SkipInstaller) {
    # The per-user installation first: `winget install JRSoftware.InnoSetup`
    # without elevated rights lands under LOCALAPPDATA, not in Program Files.
    $iscc = @(
        "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $iscc) {
        Write-Host ''
        Write-Host 'Inno Setup is missing - the payload is ready but no installer was built.' -ForegroundColor Yellow
        Write-Host 'Install it from https://jrsoftware.org/isdl.php and run again.' -ForegroundColor Yellow
        Write-Host "Payload: $payload" -ForegroundColor Yellow
        return
    }

    Step "Building the installer (version $version)"
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
    & $iscc /Qp "/DAppVersion=$version" (Join-Path $PSScriptRoot 'palassistent.iss')
    if ($LASTEXITCODE -ne 0) { throw "ISCC failed ($LASTEXITCODE)" }

    # The checksums the update feature verifies against before it runs anything.
    # The format is sha256sum's, that is "<hash>  <filename>".
    #
    # .NET directly instead of Get-FileHash, and that is not a matter of style.
    # Measured on GitHub's runner: `npm run package` starts this script in
    # Windows PowerShell 5.1 from a step running in PowerShell 7, and then 5.1
    # answers "Get-FileHash is not recognized" - even though the rest of the
    # script, including ConvertFrom-Json and Copy-Item, works. Something in the
    # inherited environment (PSModulePath points at 7's modules) means cmdlets
    # that have to be loaded on call are not found. The build therefore went all
    # the way through and died on the very last line, while the same script has
    # always worked locally.
    #
    # The conclusion is not "avoid Get-FileHash" but **do not rely on module
    # loading in this script**: it always runs as a child process of someone
    # else's shell. The .NET call exists in every PowerShell that can start it.
    Step 'Computing checksums'
    $setup = Join-Path $distDir 'PalAssistent-Setup.exe'
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead($setup)
    try { $hash = ([BitConverter]::ToString($sha.ComputeHash($stream)) -replace '-', '').ToLower() }
    finally { $stream.Dispose(); $sha.Dispose() }
    $sums = Join-Path $distDir 'SHA256SUMS.txt'
    [System.IO.File]::WriteAllText($sums, "$hash  PalAssistent-Setup.exe`n",
        (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "    $hash" -ForegroundColor DarkGray

    Write-Host ("DONE: {0} ({1:N0} MB, version {2})" -f `
        $setup, [math]::Round((Get-Item $setup).Length / 1MB, 0), $version) -ForegroundColor Green
}
