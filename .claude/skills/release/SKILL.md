---
name: release
description: Släpp en ny version av PalAssistent. Sammanfattar ändringarna sedan förra utgåvan till patch notes i CHANGELOG.md, kör kvalitetsgrinden, höjer versionen och pushar taggen som bygger installern. Använd när Ken vill släppa, publicera, tagga eller "göra en ny version".
---

# Släpp en ny version

Den här skillen gör en utgåva från början till slut. Texten du skriver hamnar på tre ställen –
GitHub-utgåvans beskrivning, appens "Vad är nytt?"-ruta och `CHANGELOG.md` – så den skrivs **en
gång, för den som använder appen**.

Arbeta i den här ordningen. Hoppa inte över steg 4; workflowen bygger från taggen, och en trasig
tagg går inte att ta tillbaka snyggt.

---

## 1. Kolla förutsättningarna

```bash
git branch --show-current       # ska vara main
git status --porcelain          # ska vara tom
git remote -v                   # måste finnas
git tag --sort=-v:refname | head -3
node -p "require('./package.json').version"
```

**Arbetskopian måste vara ren.** `npm version` vägrar annars, och allt som inte är committat hamnar
inte i utgåvan – workflowen checkar ut taggen, inte din disk. Är det smutsigt: visa Ken vad som
ligger ute och fråga om det ska med i utgåvan eller lämnas kvar. Committa aldrig hans pågående
arbete utan att fråga.

Saknas `origin` går det inte att pusha. Säg till i stället för att gissa fram en URL.

---

## 2. Ta reda på vad som faktiskt ändrats

```bash
git log $(git tag --sort=-v:refname | head -1)..HEAD --oneline    # sedan förra taggen
git diff $(git tag --sort=-v:refname | head -1)..HEAD --stat
```

Finns ingen tagg än (första utgåvan) – använd hela historiken: `git log --oneline`.

Läs sedan **vad som redan står** under `## Unreleased` i `CHANGELOG.md`. Ken skriver ofta dit
löpande. Komplettera det, skriv aldrig över det, och upprepa inte något som redan står där.

Titta på den faktiska diffen för de ändringar du ska beskriva, inte bara på commit-rubrikerna.
Rubriken säger vad som gjordes i koden; noteringen ska säga vad det betyder i spelet.

---

## 3. Skriv noteringarna

Lägg dem under `## Unreleased` i `CHANGELOG.md`, nyast först.

**Skriv för någon som spelar Palworld, inte för någon som läst koden.** Det är hela skillnaden
mellan en notering som betyder något och en som är brus.

Bra:

> - **Avelsplanen räknar nu med delade kullar.** Två steg ur samma föräldrapar hämtar sina ungar
>   ur samma kull, så att samla båda kostar mindre än summan. Mot din egen box blir planerna
>   ~10 % billigare.

Dåligt:

> - Refaktorerade `clutchEggs` och la till inklusion–exklusion i `perfectPlan.ts`

Regler:

- **En rad per märkbar ändring.** Fetstilt ingress som säger vad som ändrats, sedan en mening
  eller två om vad det innebär.
- **Siffror när de finns.** "~14 % färre ägg med fyra passiver" är trovärdigt; "bättre planer"
  är det inte. Mät mot Kens egen box när det går.
- **Rättningar beskrivs ur användarens synvinkel:** vad som såg fel ut, inte vilken funktion som
  hade fel. "Kondenseringsförslaget räknade bort pals du redan matat" – inte "off-by-one i
  `condenseReach`".
- **Utelämna det rent interna.** Refaktorering, tester, CI och beroenden hör inte hemma här om
  användaren inte märker något. En utgåva utan användarsynliga ändringar ska inte släppas alls.
- **Håll dig till 2–8 rader.** Är det fler har du förmodligen tagit med sådant som inte märks.
- **Engelska.** Noteringarna är det som möter *användaren* – i utgåvan på GitHub, i appens
  "Vad är nytt?"-ruta och i `CHANGELOG.md` – och allt en användare eller utomstående läser är
  engelskt (se CLAUDE.md, samma regel som README och release-texten). Svenskan i det här projektet
  är till för att prata med Ken och för kommentarer i `src/**`, inte för det som publiceras.
  Här stod tidigare "svenska", vilket motsade både CLAUDE.md och filens eget innehåll.
- Gruppera under en `### Rubrik` bara om raderna är många och faller i tydliga högar. Rubriker
  visas i appen som fetstilta rader.

När du är klar: **visa Ken hela avsnittet och vänta på hans ja** innan du går vidare. Det är hans
text som möter användarna.

---

## 4. Kvalitetsgrinden

Allt måste vara grönt innan taggen sätts. Workflowen kör typecheck och tester och stannar annars –
men då har taggen redan gått iväg.

```bash
npm run typecheck
npm test
```

Bygget behöver också gå:

```bash
$env:PA_PACKAGE = '1'; npm run build
```

**Använd `PA_PACKAGE=1`.** Då skriver bygget till `.next-package/` i stället för `.next/`, och en
dev-server som Ken har igång överlever. Ett vanligt `npm run build` medan `npm run dev` kör dödar
hans sida med `__webpack_modules__[moduleId] is not a function`.

Går något sönder: rapportera felet och **stanna**. Fixa inte kod som ser ut som pågående arbete –
fråga Ken först.

---

## 5. Höj versionen

Välj steg efter vad som faktiskt ändrats:

| Steg | När |
| --- | --- |
| `patch` | rättningar och små justeringar |
| `minor` | ny funktion eller märkbart ändrat beteende – det vanliga här |
| `major` | något som fanns försvinner eller fungerar på ett oförenligt sätt |

```bash
npm version minor
```

Det här händer automatiskt:

1. `preversion` kontrollerar att `## Unreleased` inte är tom och **avbryter annars** – före
   höjningen, så inget nummer tappas.
2. `version` döper om `Unreleased` till `## <version> – <datum>` och lägger filen i commiten.
3. npm committar och taggar `v<version>`.

Visa sedan exakt vad utgåvan kommer säga:

```bash
node scripts/changelog.mjs notes v<version>
```

---

## 6. Pusha – fråga först

Pushen är det som publicerar utgåvan för alla. **Fråga Ken uttryckligen innan**, även om han bett
om en release: det är sista tillfället att ändra texten.

```bash
git push --follow-tags
```

Workflowen `.github/workflows/release.yml` tar över: bygger på en Windows-runner, kör typecheck och
tester, paketerar installern, kontrollerar att nyttolasten inte bär någons box, och publicerar
`PalAssistent-Setup.exe` + `SHA256SUMS.txt` med CHANGELOG-avsnittet som beskrivning. Tar 5–8
minuter.

---

## 7. Följ upp

```bash
gh run watch          # om gh finns
gh release view v<version>
```

Kontrollera till slut att nedladdningslänken lever – det är den Ken sprider:

```
https://github.com/<owner>/<repo>/releases/latest/download/PalAssistent-Setup.exe
```

---

## Fällor

- **Uppdateringsnotisen i appen kommer från utgåvans text.** Skriver du något luddigt är det det
  varje användare möter i sitt fönster.
- **`PA_REPO` bakas in av workflowen, inte av lokala bygden.** En installer du byggt själv har
  uppdateringar avstängda – det är med flit, men betyder att den inte går att testa uppdatering
  med. Testa mot en riktig utgåva.
- **Existerande installationer uppdaterar sig från nästa utgåva.** Den som installerar 2.1.0 får
  notisen först när 2.2.0 finns.
- **`docs/img/*.png` visar Kens riktiga box.** Har gränssnittet ändrats märkbart, fråga om
  skärmbilderna i README ska tas om.
- **Ändra aldrig `AppId` i `packaging/palassistent.iss`.** Det är den Windows känner igen
  programmet på vid uppgradering; byts den får användarna två installationer.
