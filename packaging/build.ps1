# Bygger hela installationspaketet: npm run package kör den här.
#
# Resultatet är dist\PalAssistent-<version>-Setup.exe – en installer som inte
# kräver att mottagaren har vare sig Node, Python eller något annat. Allt som
# behövs ligger i paketet:
#
#   PalAssistent.exe   launchern (packaging\Launcher.cs, kompilerad med csc)
#   server.js + .next-package\   Next i standalone-läge
#   node\node.exe      din egen Node, MIT-licensierad och fri att skicka med
#   tools\palsave\     save-läsaren som exe, med libooz.dll inbakad
#   public\            ikoner och pal-data.json (tömd på din box)
#
# Stegen går att hoppa över var för sig när man itererar, t.ex.
#   powershell -File packaging\build.ps1 -SkipNextBuild -SkipPalsave

param(
    [switch]$SkipNextBuild,
    [switch]$SkipPalsave,
    [switch]$SkipInstaller
)

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
# Versionen har EN källa: package.json. Installern får den via /DAppVersion och
# appen via next.config.ts, så en utgåva aldrig kan säga två olika saker.
$version = (Get-Content (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).version
$build = Join-Path $PSScriptRoot 'build'
$payload = Join-Path $build 'payload'
$pyDist = Join-Path $build 'dist\palsave'
$nextDir = Join-Path $repo '.next-package'
$distDir = Join-Path $repo 'dist'

function Step($text) { Write-Host "==> $text" -ForegroundColor Cyan }

# --- 1. Next i standalone-läge ----------------------------------------------
# PA_PACKAGE styr både output-läget och distDir (se next.config.ts). Egen distDir
# betyder att en dev-server som kör kan fortsätta köra – bygget rör aldrig .next.

if (-not $SkipNextBuild) {
    Step 'Bygger Next (standalone, .next-package)'
    Push-Location $repo
    try {
        $env:PA_PACKAGE = '1'
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build misslyckades ($LASTEXITCODE)" }
    }
    finally {
        Remove-Item Env:\PA_PACKAGE -ErrorAction SilentlyContinue
        Pop-Location
    }
}
if (-not (Test-Path (Join-Path $nextDir 'standalone\server.js'))) {
    throw "Hittar inte standalone-bygget. Kör utan -SkipNextBuild."
}

# --- 2. save-läsaren som exe -------------------------------------------------
# --collect-all behövs: palworld_save_tools laddar sina rawdata-avkodare dynamiskt
# och statisk analys hittar dem inte. libooz.dll läggs in som binär och hamnar i
# _internal, där palsave.py letar via sys._MEIPASS.

if (-not $SkipPalsave) {
    Step 'Bygger palsave.exe (PyInstaller)'
    python -m PyInstaller --onedir --noconfirm --clean --console `
        --name palsave `
        --collect-all palworld_save_tools `
        --add-binary "$(Join-Path $repo 'tools\libooz.dll');." `
        --distpath (Join-Path $build 'dist') `
        --workpath (Join-Path $build 'work') `
        --specpath $build `
        (Join-Path $repo 'tools\palsave.py')
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller misslyckades ($LASTEXITCODE)" }
}
if (-not (Test-Path (Join-Path $pyDist 'palsave.exe'))) {
    throw "Hittar inte palsave.exe. Kör utan -SkipPalsave."
}

# --- 3. ikonen ---------------------------------------------------------------

Step 'Ritar ikonen'
& (Join-Path $PSScriptRoot 'make-icon.ps1') | Out-Null

# --- 4. sätt ihop nyttolasten ------------------------------------------------

Step 'Sätter ihop nyttolasten'
if (Test-Path $payload) { Remove-Item $payload -Recurse -Force }
New-Item -ItemType Directory -Path $payload -Force | Out-Null

# Standalone-trädet är basen: server.js, package.json och de node_modules som
# filspårningen faktiskt kom fram till.
Copy-Item (Join-Path $nextDir 'standalone\*') $payload -Recurse -Force

# Next kopierar INTE static till standalone – det står i deras dokumentation och
# är lätt att missa, för servern startar ändå och sidan blir bara ostylad.
$staticSrc = Join-Path $nextDir 'static'
$staticDst = Join-Path $payload '.next-package\static'
New-Item -ItemType Directory -Path $staticDst -Force | Out-Null
Copy-Item "$staticSrc\*" $staticDst -Recurse -Force

# public/ likaså: bara data\ följde med av sig själv, inte de 56 spelikonerna.
Copy-Item (Join-Path $repo 'public') $payload -Recurse -Force

# tools\ som filspårningen tog med innehåller palsave.py utan libooz.dll (värdelös
# utan Python) och hela tools\backup – alltså din förra box, 2 MB som absolut inte
# ska skickas till någon annan. Bort med alltihop, in med exe-versionen.
$toolsDst = Join-Path $payload 'tools'
if (Test-Path $toolsDst) { Remove-Item $toolsDst -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $toolsDst 'palsave') -Force | Out-Null
Copy-Item "$pyDist\*" (Join-Path $toolsDst 'palsave') -Recurse -Force

# Node självt. MIT-licens, fritt att distribuera; licenstexten följer med.
Step 'Kopierar node.exe'
$nodeExe = (Get-Command node -ErrorAction Stop).Source
New-Item -ItemType Directory -Path (Join-Path $payload 'node') -Force | Out-Null
Copy-Item $nodeExe (Join-Path $payload 'node\node.exe') -Force
$nodeLicense = Join-Path (Split-Path -Parent $nodeExe) 'LICENSE'
if (Test-Path $nodeLicense) {
    Copy-Item $nodeLicense (Join-Path $payload 'node\LICENSE') -Force
}

# --- 5. tomma boxen ----------------------------------------------------------
# Bundlen innehåller din egen box. Den statiska halvan (arter, avelstabell,
# passiver, ikoner) ska följa med, men pals/player/exported nollas – annars
# öppnar mottagaren programmet och ser dina pals.

Step 'Tömmer boxen ur pal-data.json'
$dataFile = Join-Path $payload 'public\data\pal-data.json'
$blankScript = @'
const fs = require("fs");
// argv[0] är node, argv[1] är den här filen – första riktiga argumentet är [2].
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, "utf8"));
data.pals = [];
data.player = "";
data.exported = "";
fs.writeFileSync(file, JSON.stringify(data));
console.log("    arter kvar: " + data.species.length + ", pals: " + data.pals.length);
'@
$blankFile = Join-Path $build 'blank-data.js'
# Set-Content -Encoding utf8 lägger på en BOM i Windows PowerShell 5.1. Node
# klarar det, men skriv rent ändå – filen är inte till för att bråka om.
[System.IO.File]::WriteAllText($blankFile, $blankScript, (New-Object System.Text.UTF8Encoding($false)))
node $blankFile $dataFile
if ($LASTEXITCODE -ne 0) { throw "Kunde inte tömma pal-data.json" }

# --- 6. launchern ------------------------------------------------------------
# csc.exe ingår i .NET Framework 4 och finns därmed på varje Windows – ingen
# verktygskedja att installera. winexe = inget konsolfönster bakom appen.

Step 'Kompilerar launchern'
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { throw "Hittar inte csc.exe ($csc)" }
& $csc /nologo /target:winexe /platform:anycpu /optimize+ `
    /out:"$(Join-Path $payload 'PalAssistent.exe')" `
    /win32icon:"$(Join-Path $PSScriptRoot 'app.ico')" `
    /r:System.dll /r:System.Windows.Forms.dll `
    "$(Join-Path $PSScriptRoot 'Launcher.cs')"
if ($LASTEXITCODE -ne 0) { throw "csc misslyckades ($LASTEXITCODE)" }

$size = (Get-ChildItem $payload -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Host ("    nyttolast: {0:N0} MB" -f [math]::Round($size / 1MB, 0)) -ForegroundColor DarkGray

# --- 7. installern -----------------------------------------------------------

if (-not $SkipInstaller) {
    # Per-användare-installationen först: `winget install JRSoftware.InnoSetup`
    # utan förhöjda rättigheter hamnar under LOCALAPPDATA, inte i Program Files.
    $iscc = @(
        "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $iscc) {
        Write-Host ''
        Write-Host 'Inno Setup saknas - nyttolasten ar klar men ingen installer byggdes.' -ForegroundColor Yellow
        Write-Host 'Installera fran https://jrsoftware.org/isdl.php och kor om.' -ForegroundColor Yellow
        Write-Host "Nyttolast: $payload" -ForegroundColor Yellow
        return
    }

    Step "Bygger installern (version $version)"
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
    & $iscc /Qp "/DAppVersion=$version" (Join-Path $PSScriptRoot 'palassistent.iss')
    if ($LASTEXITCODE -ne 0) { throw "ISCC misslyckades ($LASTEXITCODE)" }

    # Kontrollsummorna som uppdateringsfunktionen verifierar mot innan den kör
    # något. Formatet är sha256sum:s, alltså "<hash>  <filnamn>".
    Step 'Räknar kontrollsummor'
    $setup = Join-Path $distDir 'PalAssistent-Setup.exe'
    $hash = (Get-FileHash $setup -Algorithm SHA256).Hash.ToLower()
    $sums = Join-Path $distDir 'SHA256SUMS.txt'
    [System.IO.File]::WriteAllText($sums, "$hash  PalAssistent-Setup.exe`n",
        (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "    $hash" -ForegroundColor DarkGray

    Write-Host ("KLART: {0} ({1:N0} MB, version {2})" -f `
        $setup, [math]::Round((Get-Item $setup).Length / 1MB, 0), $version) -ForegroundColor Green
}
