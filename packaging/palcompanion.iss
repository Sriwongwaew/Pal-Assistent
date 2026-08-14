; Installer för PalCompanion. Byggs av packaging\build.ps1 via ISCC.
;
; Tre val som styr allt annat:
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
;
; 3. Mappen är LÅST till {localappdata}\Programs\PalCompanion (UsePreviousAppDir
;    =no), och det är inte kosmetik. Programmet hette PalAssistent till och med
;    2.6.0, och 2.6.0:s uppdateringsskript – som redan ligger ute hos alla som
;    ska hämta 3.0.0 – startar om programmet på exakt den sökvägen när den det
;    kom ifrån är borta. Låter vi Inno återanvända den gamla mappen installeras
;    3.0.0 som PalCompanion.exe i en mapp som heter PalAssistent, och skriptets
;    reserv pekar då på ingenting: uppdateringen lyckas och ingenting startar,
;    vilket är den enda felformen som ser ut som ett trasigt bygge.
;    AppId är oförändrat, så Windows känner igen programmet och uppgraderar i
;    stället för att lägga en andra installation vid sidan om – men mappen,
;    genvägarna och exe:n byter namn, och det gamla städas av [InstallDelete].

#define AppName "PalCompanion"
; Det gamla namnet, som bara finns kvar för att kunna städas bort. Se punkt 3.
#define OldName "PalAssistent"
; Versionen kommer från package.json via build.ps1 (/DAppVersion=...). Reservet
; nedan gäller bara om någon kör ISCC för hand – två ställen att uppdatera vid
; varje utgåva är ett för mycket.
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#define AppPublisher "Ken"
#define AppExe "PalCompanion.exe"

[Setup]
; AppId får ALDRIG ändras mellan versioner – det är den Windows känner igen
; programmet på vid uppgradering och avinstallation.
AppId={{8F3C2A61-5D74-4E0B-9C2F-7A1B6E9D4C83}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={localappdata}\Programs\{#AppName}
; Se punkt 3 i huvudet: mappen får inte ärvas från installationen som hette
; PalAssistent. Sidan för att välja mapp döljs helt i stället för "auto", som
; annars börjar visa sig igen just för dem som uppgraderar.
UsePreviousAppDir=no
DefaultGroupName={#AppName}
; Och Startmenygruppen ärvs på EXAKT samma sätt, ur samma registerpost. Att bara
; stänga av mappen räckte därför inte: [InstallDelete] tog den gamla gruppen,
; och sedan skapade [Icons] den igen eftersom {group} fortfarande löstes till
; "PalAssistent" – de nya genvägarna landade i en mapp med det gamla namnet.
; Loggen från 3.0.0 säger det rakt ut: "Dest filename: …\PalAssistent\
; PalCompanion.lnk" följt av "Creating directory: …\PalAssistent". Städningen
; ligger före ikonerna i körordningen och kan alltså aldrig hinna före dem.
UsePreviousGroup=no
DisableProgramGroupPage=yes
DisableDirPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\dist
; Filnamnet är MEDVETET utan versionsnummer. GitHubs "latest"-länk pekar ut en
; fil per namn, så https://github.com/<repo>/releases/latest/download/PalCompanion-Setup.exe
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

[InstallDelete]
; Resterna av PalAssistent. Uppgraderingen lägger programmet i en ny mapp med
; nya genvägar, så utan det här står det gamla namnet kvar i Startmenyn och på
; skrivbordet – och den gamla mappen ligger kvar med en hel Node-server i.
; Ordningen spelar ingen roll; Inno kör hela sektionen innan filerna packas upp,
; och CloseApplications ovan har redan stängt en app som råkade köra.
Type: filesandordirs; Name: "{localappdata}\Programs\{#OldName}"
Type: filesandordirs; Name: "{userprograms}\{#OldName}"
Type: files; Name: "{userdesktop}\{#OldName}.lnk"

[UninstallDelete]
; Portfilen och webbläsarprofilen ligger hos användaren, inte i programmappen,
; och städas därför inte bort av sig själva.
Type: filesandordirs; Name: "{localappdata}\{#AppName}"
; Och den mapp de hade före namnbytet. En avinstallation ska inte lämna kvar en
; webbläsarprofil på ett par hundra megabyte under ett namn som inte finns.
Type: filesandordirs; Name: "{localappdata}\{#OldName}"
