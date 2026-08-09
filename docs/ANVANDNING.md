# Så använder du PalAssistent

Den här guiden går igenom appen på djupet. Vill du bara komma igång räcker
[README:n](../README.md) – installera, klicka **Läs in från spelet**, klart.

---

## Kom igång

1. Ladda ner och kör [installationsfilen](../README.md#ladda-ner).
2. Starta **PalAssistent** från Startmenyn.
3. Klicka **Läs in från spelet** uppe till höger.

Appen letar själv upp din senaste sparfil under `%LOCALAPPDATA%\Pal\Saved\SaveGames`. Palworld får
gärna ligga kvar och köra – filen öppnas skrivskyddat och rörs aldrig.

### Om saven ligger någon annanstans

Klicka **Mapp**. Lämna fältet tomt för spelets egen mapp, eller peka ut en annan:

- **dedikerad server** – serverns `Pal\Saved\SaveGames`
- **molnsynkad mapp** – OneDrive, Dropbox, Steam Cloud-kopia
- **en kopia** du lagt undan

Både en mapp och en `Level.sav` direkt fungerar. Mappen genomsöks fyra nivåer neråt, och
citattecken från Explorers *"Kopiera som sökväg"* skalas bort automatiskt. Hittade världar listas
med tidpunkt, så du kan välja en bestämd – eller låta **senast sparade världen** följa med när du
byter värld.

### Live-läget

Kryssa i **Live** så håller appen koll på när spelet sparar och läser om boxen så fort något hänt.
Fånga en pal, alt-tabba, och den finns redan i listan.

Mellan varven kollas **bara sparfilens tidsstämpel** – ingen tolkning av 27 MB save förrän spelet
faktiskt skrivit något nytt. Du väljer 10, 30 eller 60 sekunders intervall; spelet autosparar
ungefär var 30:e.

Enstaka misslyckanden är normalt: fångar vi filen mitt i spelets skrivning säger appen att den
verkar halvskriven och tar den nästa varv. Efter fem misslyckanden i rad stänger Live av sig själv,
så en borttagen mapp inte ger försök i all evighet.

---

## Boxen

Varje bricka visar namn, level och IV. Färgen kommer från palens första element – det är
information, inte dekoration, och går igen i hela appen.

Klicka en bricka så hamnar den i hero-bandet överst. **Base Info**-knappen öppnar spelets egen vy:
level och nästa, kondenseringsstjärnor, HP/mättnad/SAN, Attack, Defense och Work Speed med
buff-pilar, arbetsremsan, Paldeck-texten och passiverna som riktiga banners.

Sök, filtrera och sortera på toppen. Sökningen matchar art, smeknamn, element och Paldeck-nummer.

### Att läsa en pal

- **IV** (Talang) är 0–100 per stat och ärvs oberoende av varandra. 100/100/100 är målet men
  ovanligt – hur du tar dig dit står under *Perfekt 100/100/100* längre ner.
- **Stjärnor** är kondensering, max fyra.
- **Passiver** visas som i spelet: tier 1–3 med gula pilar, tier 4 i turkost, World Tree i
  regnbåge och negativa i rött. Fler pilar = starkare.
- **Alfa** och **Lucky** markeras med spelets egna ikoner.

---

## Rekommendationer

### Kondensera nu

Ett åtgärdskort per art som redan har tillräckligt med dubbletter, rankat på störst vinst. Kortet
säger vad du vinner (0★ → 2★), hur många exemplar som går åt, hur många boxplatser det frigör – och
framför allt **vad exemplaret du behåller är bra för**, med spelets arbetsikoner och "bäst i boxen"
i grönt.

Det sista finns där av en anledning: det är lätt att mata bort sin bästa gruvarbetare för att den
råkade vara dubbelt.

### Nästan där

Arter som saknar några få exemplar till nästa stjärna. Bra att veta innan du släpper en pal.

### Spara dessa

Grupperat efter anledning – bästa i sin art, perfekt IV, sällsynta passiver, Lucky, alfa. Klicka
för Base Info.

---

## Avelsplaneraren

Den svåra delen, och anledningen till att appen finns.

### 1. Välj målart

Rutnätet visar alla arter; de du redan äger ligger först. Sökningen matchar namn, element och
Paldeck-nummer.

### 2. Välj vad palen ska användas till

**Strid**, **Tålig**, **Bas & arbete**, **Riddjur** eller **Fiske**. Valet ger *rekommenderade
passiver* som du kan lägga till med ett klick. Under **Bas & arbete** väljer du dessutom syssla
(Mining, Kindling, …) och får artförslag sorterade på arbetsnivå, märkta ÄGD / AVLAS ×n / FÅNGA.
Ett klick sätter arten som mål.

### 3. Välj önskade passiver

Upp till fyra. Siffran bredvid varje passiv är hur många bärare du har i boxen. Passiverna visas
som riktiga banners, grupperade World Tree → Legendariska → Vanliga → Negativa.

### Målbilden

Under väljaren visas hur palen ser ut **när planen är klar** – arten, de önskade passiverna som
banners, tomma platser upp till fyra, IV-målet och arbetsremsan. Planen under visar bara stegen;
målbilden visar resultatet.

### Passiv-planen

Först samlas passiverna ihop. Appen väljer bärare ur din box, en per önskad passiv om möjligt, och
en ordning att para dem i. För varje steg står **oddsen per ägg** – chansen att ungen ärver alla de
önskade passiverna i det steget.

> **Håll linjen ren.** Barnet ärver ur föräldrarnas *samlade* passiv-pool. Varje extra passiv en
> förälder bär konkurrerar med dem du vill ha. Med fyra önskade passiver räcker en enda
> skräp-passiv för att mångdubbla antalet ägg – därför väljs föräldrar på *renhet* först och IV
> först därefter.

Är ett par omöjligt flaggas det. Legendarier parar sig bara med sin egen art, så en kedja genom
dem finns helt enkelt inte.

### Artkedjan – varför fler steg kan vara billigare

När passiverna är samlade byter appen art fram till målet. Kedjan räknas i **förväntat antal ägg**,
inte i antal steg.

Det spelar roll. I en riktig box gav den kortaste kedjan Dogen → Renjishi tre steg, men första
steget var en partner med fyra passiver: 1,7 % per ägg, alltså ungefär **59 ägg för det enda
steget** och 82 totalt. En kedja på fyra steg med rena partners kostade **25 ägg**.

När den längre vägen ändå är mer än 20 % billigare visar appen genvägen bredvid, så du ser varför
omvägen valdes.

### Perfekt 100/100/100

Byter du IV-mål till **Perfekt** söker appen kortaste vägen till 100 i alla tre stats plus dina
önskade passiver. Det är ett sökproblem, inte ett par: varje stat ärvs oberoende, 30 % från pappan,
30 % från mamman och 40 % ett nytt slumpat värde. En stat där *båda* föräldrarna har 100 går alltså
30 % → 60 %.

Praktiskt betyder det:

- 100/100/100 × 100/100/100 ger ungefär **22 % per ägg**. Bara en maxad förälder: **2,7 %**.
- En stat som ingen förälder har kan bara komma ur 40 %-omslumpningen, ungefär **1 %**. Där varnar
  appen i stället för att låtsas ha en plan.
- En pal med fyra passiver men tre 100:or är ofta en **sämre** förälder än två rena 100-bärare.

I en riktig box är etapplanen 60–450 gånger billigare än den bästa direktparningen. Det syns inte
på ögonmått, så räkna.

Appen räknar också med att **kön kostar** (en unge är 50/50, så ett bestämt kön kostar i snitt
dubbelt) och att **syskon ur samma kull delar ägg**.

### Fritt läge

Vill du bara veta kortaste vägen från din box till en art, utan passivkrav, ger **fritt läge** den
kedjan direkt.

### Om oddsen

De är **uppskattningar**, och det står i appen. Ärvningsmodellen är den communityn testat fram
(1–4 passiver ärvs, jämnt fördelat, utan mutationer) och IV-arvet likaså. De är bra nog för det de
används till: att jämföra två planer mot varandra.

### Dina val sparas

Mål, syfte, önskade passiver och IV-mål ligger kvar när du går till Boxen och tillbaka.
**Rensa allt** överst nollar dem.

---

## Bäst för…

- **Attackteam** och **basens drömlag** ur din egen box.
- **Bästa arbetare per syssla**, både bland dina egna och globalt. Globala rader är klickbara och
  tar dig direkt till en avelsplan för arten.
- **Fiskepals** (Palworld 1.0) och **snabbaste riddjur**.

Varje förslag visar också vilka fyra passiver rollen egentligen vill ha, mot vad palen redan bär.

---

## Felsökning

**"Windows skyddade din dator" vid installationen.** Installationsfilen är inte köpsignerad – ett
certifikat kostar tusentals kronor per år. Klicka **Mer info** → **Kör ändå**.

**Hittar ingen save.** Klicka **Mapp** och peka ut mappen. Kör du dedikerad server ligger saven hos
servern, inte hos dig.

**Vissa pals saknas efter inläsning.** Arter som Palworld lagt till efter senaste utgåvan finns inte
i artlistan än; de rapporteras som överhoppade. Skapa gärna ett issue. Koder som `Hunter_Rifle` och
`Believer_CrossBow` är däremot människor, inte pals, och hoppas över med flit.

**Boxen är tom efter en uppdatering.** Det är väntat – artdata och avelstabell kan ha ändrats, så
datafilen byts ut. Klicka **Läs in från spelet**, eller låt Live göra det vid nästa autospar.

**Appen startar inte.** Stäng eventuella rester (`PalAssistent.exe` i Aktivitetshanteraren) och
försök igen. Programmet kör bara en instans åt gången; startar du det medan det redan kör öppnas
bara fönstret på nytt.

**Hur avinstallerar jag?** Inställningar → Appar → PalAssistent. Programmet ligger under
`%LOCALAPPDATA%\Programs\PalAssistent` och rör aldrig spelets filer.

---

## Vad appen sparar, och var

| Vad | Var |
| --- | --- |
| Din inlästa box | `%LOCALAPPDATA%\Programs\PalAssistent\public\data\pal-data.json` |
| Föregående version av datan | `…\PalAssistent\tools\backup\pal-data.prev.json` |
| Tema och palett | webbläsarlagring, `pa-theme` / `pa-pal` |
| Avelsplanerarens val | webbläsarlagring, `pa-breeding` |
| Var saven ligger + Live | webbläsarlagring, `pa-save` |
| Uppdateringskollen | webbläsarlagring, `pa-update` |
| Fönsterprofil och port | `%LOCALAPPDATA%\PalAssistent` |

Ingenting av det lämnar datorn. Den enda gången appen rör nätet är den dagliga kollen om det finns
en ny version.
