# PalAssistent

En box- och avelsplanerare för **Palworld** som läser din egen sparfil. Den visar hela boxen,
säger vilka pals du bör behålla och vilka som kan kondenseras, och räknar ut hur du faktiskt
avlar fram den pal du vill ha – med rätt passiver och 100/100/100 i IV.

Allt körs lokalt på din dator. Sparfilen öppnas skrivskyddat och ingenting skickas någonstans.

## Ladda ner

**[Hämta senaste versionen](../../releases/latest/download/PalAssistent-Setup.exe)** · Windows 10/11

Kör installationsfilen, starta PalAssistent från Startmenyn och klicka **Läs in från spelet**.
Du behöver inte installera något annat – Node, sparfilsläsaren och allt övrigt ligger i paketet.

Första gången kan Windows visa *"Windows skyddade din dator"*. Det beror på att installationsfilen
inte är köpsignerad, inte på att något är fel: klicka **Mer info** → **Kör ändå**.

## Vad den gör

- **Översikt** – boxens stjärna, nyckeltal och höjdpunkter.
- **Boxen** – alla pals som brickor med IV och passiver, sök/filtrera/sortera, plus spelets
  egen Base Info-vy för den valda.
- **Breeding** – välj målart, vad den ska användas till och upp till fyra önskade passiver.
  Du får bärare per passiv, ihopslagningsordning med **ärvningsodds per ägg**, och en artkedja
  fram till målet. Planen räknas i *förväntat antal ägg*, inte i antal steg – ett extra steg med
  rena föräldrar är nästan alltid billigare än en genväg med en skräpig partner.
- **Rekommendationer** – vad du bör kondensera nu, vad som är nästan framme, och vad du ska spara.
- **Bäst för…** – attackteam, basteam, bästa arbetare per syssla, fiskepals och snabbaste riddjur.

### Live-läget

Kryssa i **Live** under **Mapp** så håller programmet koll på när spelet sparar och uppdaterar
boxen av sig själv. Fånga en pal, alt-tabba, och den finns redan i listan. Mellan varven kollas
bara sparfilens tidsstämpel, så det kostar i princip ingenting förrän något faktiskt hänt.

Ligger saven någon annanstans än i spelets egen mapp – en dedikerad server, en molnsynkad mapp
eller en kopia – pekar du ut mappen under **Mapp**.

## Uppdateringar

Programmet kollar en gång per dygn om det finns en nyare version och säger till i en rad överst.
Ett klick hämtar och installerar den; kontrollsumman verifieras mot utgåvan innan något körs.
Vill du hellre sköta det själv går det bra att bara ladda ner installationsfilen igen.

Din inlästa box nollställs vid en uppdatering, eftersom artdata och avelstabell kan ha ändrats.
Ett klick på **Läs in från spelet** hämtar tillbaka den – eller så gör Live det åt dig.

## Stöd projektet

PalAssistent är gratis och kommer förbli det. Har det sparat dig några timmar framför avelsburen
får du gärna bjuda på en kaffe – länken finns längst ner i vänsterspalten i appen och på den här
sidan.

## Utveckling

```bash
npm install
npm run dev        # http://localhost:3000
```

Övriga kommandon:

```bash
npm run build      # produktionsbygge
npm run typecheck  # tsc --noEmit, strict
npm test           # node:test över src/lib – sannolikhetsmatematiken med handräknat facit
npm run lint
```

Kör `npm test` efter varje ändring i `src/lib`. En felräknad sannolikhet ser precis lika trovärdig
ut som en riktig, och varken bygget, typecheck eller lint fångar den.

För **Läs in från spelet** i utvecklingsläge behövs Python:

```bash
pip install -r tools/requirements.txt
```

I den installerade appen behövs det inte – där är läsaren en medföljande `palsave.exe`.

### Din egen box hamnar inte i git

`public/data/pal-data.json` är gitignorerad och skapas ur `data/pal-data.base.json` (grunddatan:
arter, avelstabell, passiver, ikoner – men tom box). Du kan importera hur mycket du vill utan att
`git status` reagerar.

### Bygga installern

```bash
npm run package    # -> dist/PalAssistent-Setup.exe
```

Kräver `pip install pyinstaller` och [Inno Setup](https://jrsoftware.org/isdl.php)
(`winget install JRSoftware.InnoSetup`). Delstegen går att hoppa över när man itererar:

```bash
powershell -File packaging/build.ps1 -SkipNextBuild -SkipPalsave
```

Utgåvor byggs annars automatiskt av `.github/workflows/release.yml` när en tagg pushas:

```bash
npm version minor
git push --follow-tags
```

Arkitektur och alla inlärda fallgropar finns i [CLAUDE.md](CLAUDE.md).

## Licens och innehåll

Källkoden är [MIT](LICENSE). Paketet innehåller dessutom ikoner, artbilder och namn ur Palworld,
som tillhör **Pocketpair, Inc.** – de följer med för att verktyget ska kunna visa spelets egna
symboler för din egen sparfil. Projektet är inte knutet till eller godkänt av Pocketpair.

Sparfilstolkningen bygger på [palworld-save-tools](https://github.com/palworld-save-tools) och
[zao/ooz](https://github.com/zao/ooz); art- och avelsdata härrör från
[palworld-save-pal](https://github.com/oMaN-Rod/palworld-save-pal). Se [LICENSE](LICENSE) för hela
listan.
