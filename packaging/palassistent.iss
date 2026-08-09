; Installer för PalAssistent. Byggs av packaging\build.ps1 via ISCC.
;
; Två val som styr allt annat:
;
; 1. Installationen är PER ANVÄNDARE, i {localappdata}\Programs. Programmet
;    skriver sin inlästa box till public\data\pal-data.json inne i sin egen
;    mapp, och i C:\Program Files är den mappen skrivskyddad – varje "Läs in
;    från spelet" skulle antingen dö eller hamna i Windows UAC-virtualisering,
;    där filen ser ut att skrivas men läses tillbaka från en skuggkopia.
;    Per användare betyder dessutom ingen UAC-prompt alls vid installation.
;
; 2. pal-data.json skrivs ÖVER vid uppgradering. Filen innehåller både boxen och
;    den statiska halvan (arter, avelstabell, passiver) – sparade vi den gamla
;    för att rädda boxen skulle en ny version aldrig få nya arter. Boxen kostar
;    ett klick att läsa in igen, och med Live-läget kommer den tillbaka av sig
;    själv vid nästa autospar.

#define AppName "PalAssistent"
; Versionen kommer från package.json via build.ps1 (/DAppVersion=...). Reservet
; nedan gäller bara om någon kör ISCC för hand – två ställen att uppdatera vid
; varje utgåva är ett för mycket.
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#define AppPublisher "Ken"
#define AppExe "PalAssistent.exe"

[Setup]
; AppId får ALDRIG ändras mellan versioner – det är den Windows känner igen
; programmet på vid uppgradering och avinstallation.
AppId={{8F3C2A61-5D74-4E0B-9C2F-7A1B6E9D4C83}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={localappdata}\Programs\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
DisableDirPage=auto
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\dist
; Filnamnet är MEDVETET utan versionsnummer. GitHubs "latest"-länk pekar ut en
; fil per namn, så https://github.com/<repo>/releases/latest/download/PalAssistent-Setup.exe
; slutar fungera i samma stund som namnet börjar variera. Versionen syns i
; installerarens egenskaper och i Program och funktioner.
OutputBaseFilename={#AppName}-Setup
SetupIconFile=app.ico
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
WizardStyle=modern
Compression=lzma2/max
SolidCompression=yes
; Programmet håller sina egna filer öppna medan det kör (node.exe). Utan det här
; får användaren en obegriplig "filen används"-krasch mitt i uppgraderingen.
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "sv"; MessagesFile: "compiler:Languages\Swedish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "build\payload\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "README.txt"; DestDir: "{app}"; Flags: ignoreversion isreadme

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\Avinstallera {#AppName}"; Filename: "{uninstallexe}"
Name: "{userdesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "Starta {#AppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Portfilen och webbläsarprofilen ligger hos användaren, inte i programmappen,
; och städas därför inte bort av sig själva.
Type: filesandordirs; Name: "{localappdata}\{#AppName}"
