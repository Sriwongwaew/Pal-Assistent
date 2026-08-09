# CLAUDE.md – PalAssistent

Instructions for Claude agents working in this repo. **The user (Ken) communicates in Swedish
and all UI copy is Swedish — keep it that way.** Code comments are Swedish too.

## What this is

A **Next.js 15 + TypeScript (strict)** web app that analyzes Ken's **Palworld** save file and acts as
a box manager / breeding planner. Its look is the **"Habitat" theme** (chosen by Ken in 2026-08,
replacing the earlier 1:1 in-game replica): rounded cards, a vertical nav rail, and the *element's
colour as the information carrier*. See "Design rules" below — and note that the game's own assets
(passive banners, work/element icons, species art) are still used verbatim.

Features by route:

- `/` **Översikt** – hero-band med "Boxens stjärna", nyckeltal, höjdpunktskort, flest per art.
- `/box` **Boxen** – vald pal i ett hero-band överst, hela boxen som habitat-brickor under
  (namn + level + IV på varje bricka). Search/filter/sort på toppen. Spelets **Base Info**-replika
  (LEVEL, NEXT, stjärnor, HP/hunger/SAN, Attack/Defense/Work Speed med buff-pilar, arbetsremsa,
  Paldeck, Passive Skills 2×2) finns kvar och öppnas med **Base Info**-knappen i heron – eller
  automatiskt när man klickar en bricka på smal skärm.
- `/breeding` **Breeding** – target pal + **vad den ska användas till** + optional base + up to
  4 wanted passives → full plan: carriers per passive, merge order with **inheritance odds per
  egg**, then a species chain to the target. Syftet (Strid / Tålig / Bas & arbete / Riddjur /
  Fiske) väljs som brickor och ger **rekommenderade passiver** som kan appliceras med ett klick.
  Under "Bas & arbete" väljs dessutom **syssla** (Mining, Kindling, …) med spelets arbetsikoner,
  vilket ger **artförslag** – bäst arbetsnivå först, med ÄGD / AVLAS ×n / FÅNGA – och ett klick
  sätter arten som mål. Under mål-väljaren sitter **Målbild** (`GoalCard`): porträttet av arten
  med de önskade passiverna som banners och tomma platser upp till fyra, IV-målet och
  arbetsremsan. Planen under är steg och odds – den visar aldrig hur *resultatet* ser ut.
  Also direct combos, shortest-path "fritt läge" tree, `?target=<speciesIdx>` deep-links
  (used by Bäst för…). Alla val **sparas** (`pa-breeding` i localStorage) så planen finns kvar
  när man varit inne på Boxen; **Rensa allt** överst nollar dem.
- `/rekommendationer` – **Kondensera nu** överst: ett åtgärdskort per art som redan har nog med
  dubbletter, rankat på störst vinst. Kortet säger stjärnhoppet (0★ → 2★), hur många som ska matas
  och hur många boxplatser det frigör, vad exemplaret man behåller är **bra för** (spelets
  arbetsikoner, "bäst i boxen" i grönt) och vad man bör se upp med innan man matar. Under det
  **Nästan där** (kompakt rutnät: saknar N till nästa stjärna) och **Spara dessa** (grupperat efter
  anledning, som förut men i ett rutnät och klickbart för Base Info).
- `/bast-for` **Bäst för…** – attack team, base dream-team, best workers per task (own + global,
  global rows are clickable → breeding plan), fishing pals (Palworld 1.0), fastest mounts.

## Commands

```bash
npm install                            # first time (fonts are npm packages)
pip install -r tools/requirements.txt  # first time, for "Läs in från spelet"
npm run dev        # http://localhost:3000
npm run build      # must stay green – always run before delivering
npm run typecheck  # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm test           # node:test över src/lib – inga beroenden, kompilerar till tests-dist/
```

`npm test` täcker sannolikhetsmatematiken (`perfectPlan`, `inheritOdds`, `condenseReach`) med
**handräknat facit** i varje test. Kör det efter varje ändring i `src/lib` – en felräknad
sannolikhet ser precis lika trovärdig ut som en riktig, och varken bygge, typecheck eller lint
fångar den. Testerna hittade t.ex. att två pals i samma tillstånd dominerade bort varandra.

```bash
```

**Never run `npm run build` while `npm run dev` is running.** They share `.next/`, and the build
overwrites the manifests and chunks the dev server holds in memory. The running page then dies with
`__webpack_modules__[moduleId] is not a function` (or 404s on its own chunks) — nothing is actually
broken in the source. Fix: stop dev, `rm -rf .next`, start dev again. Ken usually has a dev server
up, so stop it (or build in a separate checkout) before verifying a build.

## Architecture (smart/dumb – keep this discipline)

- `src/lib/` – **pure logic, no React**. `types.ts` (all data types), `constants.ts`
  (tier weights, element/work metadata, icon filename maps), `scoring.ts` (pal scoring,
  keep rules, `displayStats` = in-game stat formulas), `breeding.ts` (pair table lookup,
  `solveFree` shortest-path over all species, `solveChain` base→target BFS,
  `solveChainCheapest` samma kedja men billigast i **ägg** (se "Domain gotchas"),
  `inheritOdds` passive inheritance probability), `passivePlan.ts` (carrier set cover +
  merge ordering; flags impossible pairs), `best.ts` (team pickers, global rankings),
  `perfectPlan.ts` (`planPerfectLine` — söker **kortaste vägen** till 100/100/100 + önskade
  passiver; se "Domain gotchas"), `findIvDonors` (arter som bär en saknad 100:a och parar
  tillbaka till samma art),
  `purpose.ts` (syften + `recommendPassives` — poängsätter passiver ur `PassiveDef.fx`
  i stället för en handskriven lista, så nya passiver i datasetet kommer med automatiskt;
  `purposeScore` är den delade poängsättningen och `passiveSynergy` hittar färdiga
  uppsättningar åt spara-reglerna; äger också `isEquipmentOnly`, som `PassivePicker` importerar),
  `condense.ts` (`planCondense` — verdict per art: `now`/`soon`/`hold`/`max`, plus `palUses`
  och `buildUseIndex` som svarar på "vad är den här palen bra för?"; se "Domain gotchas"),
  `breedingPrefs.ts` (`parseBreedingPrefs`/`serializeBreedingPrefs` — planerarens val som
  överlever sidbyten; se "Domain gotchas"), `savePrefs.ts` (var saven ligger + live-läget,
  samma valideringsdisciplin). `loadout.ts` (`idealLoadout` — rollens fyra
  passiver mot vad palen redan bär, används av Bäst för…).
- `src/context/PalDataContext.tsx` – smart provider: fetches `/data/pal-data.json`, memoizes all
  derived data (scored pals, bestOf per species, freeSolve). `SelectedPalContext` + `PalDetailHost`
  drive the detail modal.
- `src/components/containers/` – smart views (state, filtering, hooks) one per route.
- `src/components/ui/` – dumb, props-only components: `PalCard`, `PalHero` (Habitats hero-band,
  used by both Översikt and Boxen; exports `elementColor`), `PassiveRow`, `PalDetail`
  (`PalDetailBody` is reused by the modal), `GameIcon`/`MaskIcon`, `WorkIcon`/`StatIcon`,
  `PalBits` (Tag, IvRow, SpeciesIcon, ElementIcons, GenderSymbol, Section),
  `PalPicker`/`PassivePicker`/`PurposePicker` (breeding's selectors — se "Design rules" 6),
  `GoalCard` (breedingens målbild — art + önskade passiver som banners),
  `SaveFolder` (panelen bakom "Mapp" — mapp, hittade världar, live-läget).
  Only their search box/filter chip keep local state; the selection itself always lives in the
  container.
- **Skalet** (client components): `Rail` (vertical nav, replaced the old `Nav` pill strip),
  `ThemeControls` (ljust/auto/mörkt + de tre paletterna, sparas i `localStorage` under
  `pa-theme`/`pa-pal`), `BgTexture` (canvas-bakgrunden), `PageTitle` (h1 ur pathname).
- `src/app/` – App Router; pages are thin wrappers around containers. `globals.css` holds the
  whole theme (single file, heavily commented in Swedish). `layout.tsx` has an **inline script
  in `<head>`** that sets `data-theme`/`data-pal` on `<html>` before first paint — utan den
  blinkar sidan i fel tema. Den gamla in-game-repliken ligger kvar i `tools/backup/`
  (`globals.ingame.css`, `*.tsx.bak` — backup-filerna har `.bak` så `tsc` inte plockar upp dem).
- `src/server/palsave.ts` – server-only: spawns `tools/palsave.py` and parses its JSON.
  Used by `/api/save/scan` (valfri `?root=`) and `/api/save/import` (`{ root?, path? }`).
  `/api/save/status?path=` är live-lägets billiga koll och gör bara en `fs.stat` – ingen Python.
  Alla tre är `force-dynamic`.

## Design rules (non-negotiable)

1. **Habitat: elementets färg är information, inte dekoration.** Varje kort, bricka och porträtt
   tonas av palens första element via `--elc` (sätts i React från `elementColor(sp)` /
   `ELEMENT_META`, aldrig hårdkodat i CSS). Ytorna är rundade (`--r1..--r4`), navigationen är
   vertikal, och bakgrunden är en canvas-struktur per palett — **inte** en gradient.
   Tre paletter finns: `basalt` (standard, neutral sten så elementet blir skärmens enda färg),
   `nattskog` (grönt + höjdkurvor) och `djupvatten` (blått + vattenstrata). Ljust och mörkt läge
   är likvärdiga — designa alltid båda.
   Past rejects: aurora backgrounds, glow effects, collector-card frames, display fonts.
   Tema-tokens sätts i tre steg i `globals.css` (`:root` = ljust → `@media (prefers-color-scheme:
   dark)` med `:not([data-theme="light"])` → `:root[data-theme="dark"]`). **Sätt aldrig en färg
   direkt i en media-fråga**, bara tokens, annars får ena temat den andras text på sin botten.
2. **Real game assets.** `public/icons/*.webp` are extracted game icons (work suitability +
   gray `no_*` inactive variants, elements, `male/female`, `alpha`, `lucky`,
   `attack/defense/work_speed`, `heart`, `food`, `rank_1..5`/`rank_0`/`rank_-1..-3` =
   the passive arrow icons, and `bg_gold/teal/red/white/purple.webp` = the game's banner facet
   texture pre-tinted with the game's own colors `#fcdf19`/`#68ffd8`/red).
   White glyphs are tinted at runtime via `MaskIcon` (CSS mask + background-color).
3. **Passive banners** (`.prow` in globals.css): dark base `#0e1013`, tier-colored border,
   bright left stripe, game texture overlay at ~0.28 opacity, game rank icon right, fixed height,
   **2 per row** (`.prows` is a 2-col grid). **Tier 1 är grå** (`.prow.t1`, `bg_white`-texturen) —
   guld gäller bara tier 2–3, precis som i spelet. Låt dem inte flyta ihop igen: en gul
   +10 %-passiv ser ut som en +20 % och får palen att se bättre ut än den är.
   Tier 4 (Legend/Lucky…) teal, tier 5 rainbow-animated,
   negatives near-black with red. Max **4** condense stars everywhere.
   Habitat rundar bara hörnen (9 px) — banners är **oförändrade i övrigt och byter inte färg med
   temat**, de ser likadana ut i ljust och mörkt läge precis som i spelet.
4. **Typsnitt:** "M PLUS Rounded 1c" (400/500/800) för gränssnittet — rundat, samma familjekänsla
   som spelets logotyp — och "Zen Kaku Gothic New" (500/700/900) för **alla siffror**, annars blir
   data gullig. Båda via @fontsource. Byt inte utan visuell jämförelse sida vid sida.
5. Ytor använder `--panel`/`--panel2` och radierna `--r1..--r4`. Hörnmarkeringarna
   (`.gpanel::after`, `.panel::before`) är avstängda i Habitat men klasserna finns kvar så
   containers slipper ändras.
   **Watch for class-name collisions in the single global stylesheet.** `<Tag kind="cond">`
   renders `class="tag cond"`, and a later `.cond { display: grid; minmax(320px,1fr) }` (the
   condense grid, now `.condgrid`) silently blew every such badge up to 338 px. `.tag` now
   pins `display: inline-block; flex: none`, but new layout classes still need names that no
   `kind`/variant string can match.
   **Samma fälla med bilder:** en descendant-selektor som `.part img { width: 100px }` träffar
   också alfa-/lucky-/könsikonerna som ligger i samma behållare och blåser upp dem till 100 px.
   Använd `>` för porträttet (`.part > img`, `.pcell .circ > img`) när ikoner delar förälder.
6. **Rank things visibly.** Top-lists carry a `.rank` pill (gold/silver/bronze for 1–3) and
   comparable numbers get a `.statbar` meter rather than bare digits — the user called the
   plain text rows "tråkig och basic". Avatars use `.ava` with `elementBg()` behind them.
   Keep the pal's name readable: badges shrink (`ownStatus(s, true)` → "FÅNGA", "AVLAS ×1")
   before the name is allowed to ellipsis away.
7. **Verifiera i båda temana och i minst två paletter** innan leverans — en färg som bara testats
   i mörkt läge har ofta för låg kontrast i ljust. Kör `npm run build`, starta `npm run start`
   och ta skärmdumpar av alla fem sidorna. Se även varningen om att aldrig bygga medan en
   dev-/start-server håller `.next` (under "Commands").
7. **Pick things visually, never from a dropdown.** The user rejected the old breeding form
   (text input + `<select>` + grey chips) as "bara text". Species are picked from the circular
   icon grid (`.pcell`, same cells as Boxen, selection = the game's white corner brackets);
   passives are picked by clicking the real `.prow` banners, grouped World Tree → Legendariska →
   Vanliga → Negativa so the whole colour range (incl. the animated rainbow) is visible at once.
   Chosen passives render as banners too, not as plain chips. Grids keep a `min-height` so the
   page doesn't jump while filtering.
   **Ett sparat val måste också synas.** Art-rutnätet visar 320 px av ~300 arter och står alltid
   på scrollTop 0 när vyn monteras om, så ett återläst mål ligger typiskt 5 000 px ner: planeraren
   *såg* ut att glömma mål-palen medan passiverna (som ritas som banners ovanför sin väljare)
   låg kvar. `PalPicker` rullar därför fram den valda cellen vid montering – bara rutnätets egen
   `scrollTop`, aldrig sidans – och visar arten som en bricka (`.selchip`) i sökraden, som även
   går att klicka för att hitta tillbaka till cellen. Halvsynliga celler räknas som synliga, annars
   hoppar listan när man klickar i underkanten.

## Data pipeline (public/data/pal-data.json, ~2 MB)

The **pals half** of the bundle is now read in-app; the **static half** still comes from outside.

### Reading the save (in-repo, `tools/palsave.py`)

"Läs in från spelet" finds Ken's newest `Level.sav` under
`%LOCALAPPDATA%\Pal\Saved\SaveGames\<account>\<world>\`, reads it **read-only** (never writes
into the game's folder — the game may keep running), and rewrites `pals` / `player` / `exported`
in `public/data/pal-data.json`. Everything else in the bundle is copied through untouched.
The previous bundle is kept at `tools/backup/pal-data.prev.json`.

**Mapp + live** (`SaveImport` → `SaveFolder`, `src/lib/savePrefs.ts`, `pa-save` i localStorage):
knappen **Mapp** öppnar en panel där man pekar ut var saven ligger — tomt fält = spelets egen
mapp, annars dedikerad server / molnmapp / kopia. `palsave.py scan [mapp]` letar därför upp till
`_SCAN_DEPTH` (4) nivåer neråt och tar både en mapp och en `Level.sav` direkt; sökvägen
`expandvars`:as och citattecken från "Kopiera som sökväg" skalas bort *innan* den når disken.
Kryssrutan **Live** pollar savens tidsstämpel var 10/30/60:e sekund och läser bara om när den
ändrats. Fyra saker som gör live billigt och tyst:

1. **Pollningen är en `stat` i Node** (`/api/save/status`), aldrig Python: 27 MB packas bara upp
   när tidsstämpeln faktiskt rört sig. Rutten kräver att filnamnet är `Level.sav`, annars vore
   den en gratis "finns den här filen?"-tjänst för hela disken.
2. **Importen validerar mot samma scan** som gränssnittet listade: en `path` som inte hittas i
   den utpekade mappen avvisas. Det är hela skyddet nu när mappen får väljas fritt — ta inte bort
   det och läs aldrig en sökväg rakt från bodyn.
3. **Live stänger av sig själv efter fem missar i rad** (`LIVE_MAX_FAILS`). Enstaka fel är
   normala — fångar vi saven mitt i spelets skrivning ger `decompress_sav` "verkar halvskriven"
   och nästa varv tar den. En borttagen mapp ska däremot inte betyda ett Python-anrop var tionde
   sekund i all evighet.
4. **`tick` ligger i en ref**, inte i `setInterval`-effektens beroenden. Annars byggs timern om
   varje gång `watching`/`prefs` ändras och kollen skjuts upp i all oändlighet.

Att välja "senast sparade världen" är ett *rörligt* mål: uppslaget görs om var 60:e sekund
(`RESOLVE_TTL_MS`) så live följer med när man byter värld, men inte oftare än så — varje uppslag
är trots allt en process. Importen får alltid den fil vi *tittade* på, inte "den senaste" en gång
till, annars kan uppslaget hinna flytta sig mellan koll och inläsning.

Hard-won details — don't undo these:

1. **Magic byte 8–10 picks the codec: `PlM` = Oodle, `PlZ` = zlib.** Ken's saves are `PlM`.
   Oodle is decoded through `tools/libooz.dll` (prebuilt from [`zao/ooz`](https://github.com/zao/ooz),
   sole export `Ooz_Decompress`) via ctypes. UE5 links Oodle statically, so there is no
   `oo2core_*.dll` in the game folder to borrow. Byte 11 = save type; `0x32` means double-packed.
2. **Parsing stops early, on purpose.** `Level.sav` is ~27 MB of whole-world data, but
   `CharacterSaveParameterMap` is the *first* key and `CharacterContainerSaveData` the tenth.
   We patch `properties_until_end` to raise once both are read (~1.5 s). This also dodges
   `InLockerCharacterInstanceIDArray` — a Palworld 1.0 `SetProperty` that palworld-save-tools
   0.24 cannot parse at all.
3. **Two of the library's rawdata decoders reject 1.0 saves** ("EOF not reached"): `character`
   and `character_container`. We use a tolerant inline replacement for pal RawData and simply
   don't decode container slots (`SlotNum` is a normal property).
4. **Species codes need case-insensitive matching.** The save writes `LazyCatFish` where the
   metadata says `LazyCatfish`, and alphas are `Boss_<species>` (lowercase 's'), not `BOSS_`.
   Unmatched codes are skipped and reported — that is how humans (`Hunter_Rifle`,
   `Believer_CrossBow`, which sit in the same table as pals) get filtered out.
5. Containers are named from the player's `.sav`: `PalStorageContainerId` → Palbox,
   `OtomoCharacterContainerId` → Party, the rest → `Bas/övrigt N` sorted by GUID for stability.
6. Pal fields come from the gvas character container (IVs = `Talent_HP/Shot/Defense`,
   passives = `PassiveSkillList`, souls = `Rank_HP/Attack/Defence/CraftSpeed`, `Rank` = condense,
   `Level`, `Exp`, `FullStomach`, `SanityValue`, gender, `IsRarePal` = lucky, `Boss_` = alpha).
   Absent fields mean default (no `Rank` → 1, no `SanityValue` → 100).

### Static metadata (still generated outside this repo)

Species/breeding/passive metadata + all icons come from
   [`oMaN-Rod/palworld-save-pal`](https://github.com/oMaN-Rod/palworld-save-pal) (`data/json/*`,
   `ui/src/lib/assets/img/*`): `breeding.json` (child_to_parents_formula + unique/gendered
   combos), `pals.json` (scaling, work_suitability, rarity, food, stomach…), `passive_skills.json`
   (rank + effects), `exp.json` (PalTotalEXP table), l10n names/descriptions.
Bundle shape = `AppData` in `src/lib/types.ts`. Species icons are embedded base64 webp (128 px);
the `pair` array is a flattened upper-triangular parent→child table (see `pairIndex`).

**When Palworld adds new species,** the import reports them as skipped — the static half has to be
regenerated from `palworld-save-pal` to pick them up. Keep `AppData` backwards-compatible or
update `types.ts` + consumers together. Replacing `public/data/pal-data.json` by hand still works.

## Paketering – installern för andra datorer

`npm run package` (→ `packaging/build.ps1`) bygger `dist\PalAssistent-<version>-Setup.exe`.
Mottagaren kör installationsfilen och startar programmet från Startmenyn: eget fönster utan
adressrad, egen ikon, ingen terminal. **Inget behöver finnas installerat** – Node, save-läsaren
och allt annat ligger i paketet (~184 MB nyttolast, ~70 MB installer).

Delarna: `packaging/Launcher.cs` → `PalAssistent.exe` (kompileras med `csc.exe` ur .NET
Framework, som finns på varje Windows – därför ingen verktygskedja att installera),
Next i `output: "standalone"`, `palsave.exe` (PyInstaller `--onedir`), maskinens egen
`node.exe` (MIT, fri att distribuera) och `packaging/palassistent.iss` (Inno Setup).
Byggberoenden på **din** maskin: `pip install pyinstaller` + `winget install JRSoftware.InnoSetup`.

Elva saker som är inlärda med möda – ändra inte tillbaka:

1. **`PA_PACKAGE=1` ger både standalone och egen `distDir`.** Paketbygget skriver till
   `.next-package/`, aldrig `.next/`. Det är därför du kan paketera medan dev-servern kör –
   utan det gäller varningen under "Commands" i skarpt läge.
2. **`--user-data-dir` på Edge är obligatorisk, inte kosmetik.** Utan egen profil lämnar
   `msedge.exe` över till den Edge användaren redan har öppen och avslutar direkt. Launchern
   tolkar det som "fönstret stängdes" och dödar servern i samma sekund som den startat.
3. **Job Object med `KILL_ON_JOB_CLOSE`** är enda garantin att `node.exe` följer med i graven
   när launchern dödas i Aktivitetshanteraren. Annars ligger en osynlig server kvar till omstart.
4. **Servern binder `127.0.0.1`.** `/api/save/scan` tar en godtycklig mapp och listar filer fyra
   nivåer ner – på `0.0.0.0` vore det en filbläddrare för hela nätverket.
5. **BOM krävs på `.ps1`, `.cs` och `.iss`.** Windows PowerShell 5.1 och `csc.exe` läser filer
   utan BOM som ANSI, och då blir svenskan mojibake i både utskrifter och dialogrutor
   ("Tömmer" → "TÃ¶mmer"). Node bryr sig inte, så felet syns bara utanför Node.
6. **Next kopierar varken `static` eller hela `public` till standalone.** Servern startar ändå,
   sidan blir bara ostylad och ikonlös – `build.ps1` kopierar båda.
7. **Filspårningen drar in `tools/backup/`** – alltså din förra box, 2 MB. `build.ps1` slänger
   hela `tools/` ur nyttolasten och lägger dit `tools/palsave/` i stället. Ta inte bort det:
   det är skillnaden mellan att dela ett program och att dela sin egen save.
8. **Boxen töms** ur `pal-data.json` (`pals`/`player`/`exported`), den statiska halvan följer med.
   `player` måste nollas explicit – `mergeIntoAppData` faller tillbaka på `base.player` när
   savens namn är tomt, så annars läcker ditt namn in i mottagarens första inläsning.
9. **Installationen är per användare** (`{localappdata}\Programs`, `PrivilegesRequired=lowest`).
   Programmet skriver `pal-data.json` inne i sin egen mapp; i `Program Files` vore den mappen
   skrivskyddad, eller ännu värre UAC-virtualiserad så filen *ser* ut att skrivas.
10. **Tom box är ett riktigt tillstånd**, inte ett felläge – det är förstaintrycket i en färsk
    installation. Översikt kraschade på `pals[0]!` ("Cannot read properties of undefined") och
    har nu en välkomstruta; `HeaderMeta` och `Rail` bygger sina rader av de fält som finns.
    Testa alltid mot en tom box efter ändringar i containers – serverns 200-svar bevisar
    ingenting, datan hämtas klientsidan.
11. **`palsave.py` hittar `libooz.dll` via `sys._MEIPASS`** när den är fryst, och PyInstaller
    behöver `--collect-all palworld_save_tools` (rawdata-avkodarna laddas dynamiskt och statisk
    analys missar dem).

Installern är **osignerad**, så SmartScreen säger "Windows skyddade din dator" första gången.
Det står i `packaging/LÄS-MIG.txt`; ett certifikat kostar tusenlappar per år och en hårdvarutoken.

## Utgåvor och självuppdatering

Projektet är publikt på GitHub och installern distribueras som en **utgåva**. En ny version:

```bash
npm version minor        # enda stället versionen står
git push --follow-tags   # .github/workflows/release.yml tar över
```

Workflowen bygger på `windows-latest`, kör typecheck + test, bygger paketet och publicerar
`PalAssistent-Setup.exe` + `SHA256SUMS.txt`. **Båda filnamnen är stabila med flit** – hela
poängen är att `…/releases/latest/download/PalAssistent-Setup.exe` alltid ska peka på den
senaste. Versionen syns i installerarens egenskaper, inte i filnamnet.

**Tre värden bakas in vid bygget** via `env` i `next.config.ts` och finns därmed som vanliga
strängar i den byggda appen: `PA_VERSION` (ur package.json), `PA_REPO` (sätts av workflowen till
`github.repository`) och `PA_DONATE` (repo-variabeln med samma namn). `PA_REPO` är strömbrytaren
för hela uppdateringsfunktionen – ett bygge från källkoden har den tom och erbjuder därför aldrig
en uppdatering. Det är avsiktligt: ingen ska få en ruta som vill installera över sin arbetskopia.

Uppdateringsflödet, och varför varje del ser ut som den gör:

1. **Kollen** (`/api/update/check`) svarar alltid 200 med ett läge, aldrig ett fel – appen
   fungerar helt utan nät och ska inte visa rött för att GitHub inte svarade. Klienten frågar
   högst **en gång per dygn** (`src/lib/update.ts`, `pa-update` i localStorage) och servern
   cachar svaret i sex timmar: GitHubs API tål 60 anrop/timme per IP och appen startas om varje
   gång någon vill titta på boxen.
2. **"Senare" gäller den versionen**, inte för alltid. En notis som aldrig kommer tillbaka
   missas; en som kommer vid varje start lär man sig klicka bort.
3. **Installationen** (`/api/update/install`) laddar ner och **kör** en binär, och har därför
   fyra spärrar som ingen av dem är valfri: `PA_PACKAGED` (sätts av launchern, så källkodsbygget
   inte kan installera över sig självt), utgåvan hämtas om på servern (klienten skickar aldrig en
   URL), URL:en måste ligga under `https://github.com/<PA_REPO>/releases/download/`, och SHA-256
   jämförs mot `SHA256SUMS.txt` i samma utgåva innan något startas. Tas någon av dem bort är det
   en fjärrkörningsbugg, inte en uppdateringsfunktion.
4. **Bytet görs av ett skript i temp**, inte av oss: installern måste stänga appen för att skriva
   över dess filer, och en process kan inte vänta in sin egen död. Rutten svarar, avslutar sig
   själv efter 1,5 s, och skriptet kör installern tyst och startar programmet igen.
5. **Launchern vaktar därför servern också**, inte bara fönstret (`WaitForShutdown`). Utan det
   blir Edge-fönstret kvar och visar en död sida mitt under uppdateringen, och mutexen släpps
   aldrig så den nya versionen bara öppnar ett fönster mot en gammal port.

`compareVersions` ligger i `src/lib/version.ts` med test. Strängjämförelse säger att "2.10.0" är
mindre än "2.9.0" – felet syns först vid den elfte utgåvan, långt efter att man slutat tänka på
det, och yttrar sig som att ingen får uppdateringen.

**Din egen box får aldrig committas.** `public/data/pal-data.json` är gitignorerad och skapas ur
`data/pal-data.base.json` av `scripts/ensure-data.mjs` (kopplat till `predev`/`prebuild`).
Grunddatan är den statiska halvan med tom box. Workflowen har dessutom ett sista steg som vägrar
publicera en utgåva vars nyttolast innehåller pals eller ett spelarnamn — filen är 1,7 MB JSON och
ett misstag där syns inte i en diff.

**Paketet innehåller Pocketpairs material** (ikoner, artbilder, namn) och `libooz.dll`. Det står
i `LICENSE` under "NOTE ON BUNDLED CONTENT" tillsammans med attributionen för
palworld-save-tools, zao/ooz, Node och typsnitten. Lägg till nya beroenden där.

## Domain gotchas

- **Legendaries only breed with their own species** — pairs like Frostallion × Lamball have no
  child in the pair table. `passivePlan` picks a valid merge order and flags impossible steps;
  don't "fix" this by assuming any pair can breed.
- Inheritance odds (`inheritOdds`) use the community model (1–4 slots at 40/30/20/10 %,
  uniform subset), **without mutations** — they are estimates; label them as such in UI.
- **IV inheritance is per-stat and independent** (`ivPlan.ts`): each of HP/Attack/Defense rolls
  30 % from the father, 30 % from the mother, 40 % a fresh random value
  ([Palworld wiki](https://palworld.wiki.gg/wiki/Breeding); community-tested, not datamined —
  label as "≈"). The wiki lists no 1.0 change to this. That independence is what makes
  `planPerfectIv` possible: 100s can be gathered from different parents across generations.
  A stat where **both** parents have 100 goes 30 % → 60 %, so 100/100/100 × 100/100/100 is
  ≈22 % per egg while one maxed parent is ≈2,7 %. With no 100-carrier at all a stat can only
  come from the 40 % reroll (≈1 %), which is why `gaps` gets a loud warning instead of a plan.
  Compare pair odds with an **epsilon** — 60·30·60 and 60·60·30 are the same probability but
  differ in the last float bit, and an exact `===` silently loses the IV tie-break.
- **Vägen till 100/100/100 är ett sökproblem, inte ett par** (`perfectPlan.ts`). Tillståndet är
  `(vilka IV som är 100, vilka önskade passiver som finns)` — 8 × 16 = 128 lägen — och varje
  parning slår ihop två tillstånd till unionen. Kostnaden är förväntat antal ägg, så en
  Pareto-front per tillstånd (billigast **och** renast) plus några relaxeringsrundor hittar
  billigaste vägen på ett par millisekunder. Varför det är värt besväret: en pal med fyra
  passiver men tre 100:or är ofta en **sämre** förälder än två rena 100-bärare, eftersom varje
  extra passiv hamnar i arvspoolen. I Kens box är etapplanen 60–450× billigare än den bästa
  direktparningen — det går inte att se på ögonmått, så räkna.
  Tre saker som modellen medvetet gör:
  1. En stat som **ingen** förälder har kan ändå komma ur 40 %-omslumpningen (≈1 %), så alla
     delmängder av luckorna provas ovanpå unionen. Utan det saknar en art med lucka plan helt.
  2. Passiver kan **inte** slumpas fram — saknas en i arten är den ett förkrav för passivplanen,
     inte ett skäl att sakna IV-plan.
  3. Sökningen håller sig **inom målarten**: att para två arter byter art på ungen, så all
     IV-möda måste göras med exemplar av arten man faktiskt vill ha. Enda undantaget är
     `findIvDonors`, som bara föreslår donatorer vars art parar *tillbaka* till målarten.
  **Fällan i Pareto-fronten:** två olika ägda pals i samma tillstånd är två *individer*, och
  den ena får aldrig dominera bort den andra. Gjorde den det försvann partnern, och fallet
  "båda har HP+ATK, DEF måste slumpas" såg ut att sakna lösning i stället för att bara vara
  dyrt (~693 ägg). Dominansregeln gäller därför bara härledda noder; löven sparas var för sig,
  renast först och med båda könen representerade. Att laga det gjorde dessutom planerna
  bättre – Verdash gick från ~1 680 till ~545 ägg, eftersom sökningen fick fler byggstenar.
  Tre korrigeringar som gör totalen ärlig – två drog åt olika håll innan:
  - **Kön** räknas in. En unge ur ett mellansteg är 50/50, så måste den ha ett bestämt kön
    kostar den i snitt dubbelt. Är båda föräldrarna mellansteg räcker det att jaga kön på den
    billigare (`genderExtra`). `ivPlan` flaggar fortfarande om ett kön saknas helt i arten.
  - **Delad kull.** Två steg med samma föräldrapar hämtar sina ungar ur samma kull. Att samla
    båda kostar `1/p1 + 1/p2 − 1/(p1+p2)`, inte summan – inklusion–exklusion, generaliserad
    till n utfall i `clutchEggs`.
  - **Delade mellansteg.** Sökningen summerar kostnaden som ett *träd*, men planen är en DAG:
    föräldrar förbrukas inte, så ett mellansteg som används två gånger föds fram en gång.
    Totalen räknas därför om över de unika stegen efter att planen vikts ut, inte ur `goal.eggs`.
- **Sparade val är alltid gamla** (`breedingPrefs.ts`). Det som ligger i localStorage skrevs mot
  en annan `pal-data.json` än den som just laddats: art-index pekar rakt in i `data.species` och
  en ny patch flyttar dem. Ett index som inte längre finns når fram till `data.species[target]!`
  = undefined och kraschar hela sidan – det är därför allt valideras mot den *aktuella* datan vid
  inläsning och blir tomt i stället för fel. Samma sak gäller passiv-id:n. Djuplänken
  (`?target=`/`?wanted=`) vinner alltid över det sparade, och **Rensa allt** måste därför också
  rensa query-strängen, annars sätter djuplänken tillbaka målet vid nästa montering.
- **Kön måste in i FÖRSTA parningen, men bara där** (`passivePlan.ts`). Startpalen är en riktig
  individ ur boxen, så steg ett parar två *kända* pals och de måste vara ♂+♀ — annars blir det
  ingen parning alls. Set-covern väljer bärare enbart på passiver och rekommenderade därför glatt
  två honor. Efter första kläckningen är linjen en unge med slumpat kön, och då räcker det att
  kläcka tills rätt kön dyker upp — då ska inget könskrav ställas, annars stryks fullt giltiga
  partners bort. Fixen byter **individ, inte plan**: `sameCoverAlt` letar en pal som bär samma
  önskade passiver men har rätt kön (renast vinner), först bland bärarna och sedan bland
  startpalarna. Går ingetdera flaggas steget med `genderOk: false` i stället för att tigas ihjäl.
  `bestParentPair` gjorde redan rätt — felet satt bara i passiv-planens egen partnervalslogik.
- **Parent selection is purity-first, then IV** (`ParentPrefs`/`compareParents` in `breeding.ts`).
  Once passives are picked, every *other* passive a parent carries lands in the inheritance pool
  and tanks the odds — with 4 wanted passives, a single junk one drops 10 % → 2 % (~10 → ~50 eggs).
  So candidates sort by junk-passive count first, and only ties fall through to IV. Never rank
  parents by `score` here: it rewards high tiers and therefore picks the *dirtiest* pals.
  `ivGoal` breaks those ties — `"fast"` maximises the IV average, `"perfect"` maximises the
  *weakest* stat (80/80/80 beats 100/100/40 when you're chasing 100/100/100).
  `solveFree`/`solveChain` remain species-only: they minimise pairings, not passive loss.
- **Passiv-planens artkedja (fas 2) räknas i ägg, inte i steg** (`solveChainCheapest`).
  `solveChain` är en BFS och tar färst steg utan att bry sig om *vem* man parar med — men
  partnern är en ägd pal, och varje skräp-passiv den bär hamnar i arvspoolen. I Kens box gav
  BFS:en Dogen → Renjishi på 3 steg där första steget var en Aegidron med fyra passiver:
  1,7 % per ägg, **~59 ägg för det enda steget**, ~82 totalt. Dijkstra över samma graf med
  kostnaden *förväntat antal ägg* hittar 4 steg med rena partners för ~25 ägg. Ett steg till
  är alltså nästan alltid billigare än ett kort med en smutsig partner — så lägg aldrig
  tillbaka en ren stegräkning här. Lika kostnad bryts på färst steg, med **epsilon**
  (samma odds i annan ordning skiljer i sista float-biten). När genvägen är >20 % dyrare
  läggs den i `speciesPhaseShortcut` så gränssnittet kan motivera omvägen — annars ser det
  extra steget ut som ett fel.
- **Linjens egen pal bär sitt skräp.** Startpalen i passiv-planen är en riktig pal ur boxen,
  så dess skräp-passiver ska räknas in i första stegets pool (`linePv`). Efter ett steg är
  linjen en unge man kläcker tills den har de önskade, och antas då ren — samma antagande som
  resten av planen vilar på. Poolen är alltid **unionen av mängder**, aldrig summan av antal:
  bär både linjen och partnern samma skräp-passiv ligger den bara en gång i poolen.
- **Tier ensamt räcker inte för att avgöra vad som ska sparas** (`scoring.ts` + `purpose.ts`).
  Två spara-regler finns för att skydda pals man använder som **avelsstam**, och båda missades
  av de rena tier-reglerna:
  1. **Färdig uppsättning** (`passiveSynergy`): tre eller fler passiver som drar åt samma håll
     för samma syfte. Artisan är tier **3** och Work Slave tier **1**, så en komplett
     arbetsuppsättning (Remarkable Craftsmanship + Work Slave + Artisan) har bara EN guldpassiv
     och föreslogs som matarpal. Bidraget måste nå `MIN_FIT` (10 ≈ +10 % på syftets huvudstat)
     — utan tröskeln räknas Burly Body (+20 % försvar, vikt 0,15 i Strid) som en attackpassiv
     och nästan varje pal får en "uppsättning".
  2. **Ren bärare** (`cleanCarrier`): en toppassiv (tier ≥ 4) med högst `MAX_EXTRA` (1) annan
     passiv och inga negativa. Poängen är arvspoolen — en pal som bär Legend *ensam* är en
     bättre förälder än en som bär Legend plus tre andra, precis som `compareParents` säger.
     Taket `CARRIER_CAP` (2 per art och passiv, helst ♂ + ♀) finns för att "spara" annars
     växer tills boxen aldrig krymper: sex identiska rena Warsect är fem för många.
  `scorePal` räknar fram fakta (`misfit`, `synergy`, `cleanCarrier`), `applyKeepRules` tillämpar
  taket och **tömmer `cleanCarrier`** på de exemplar som inte fick plats — efter båda stegen
  betyder icke-tom alltså "sparas som ren bärare", och gränssnittet grupperar på det.
  Tier 5 (World Tree/rainbow) sparas alltid, oavsett vad som sitter runt den.
- **En passiv måste göra nytta på just den arten** (`speciesRoles`/`passiveFitsSpecies` i
  `purpose.ts`). En Lunker (elementskada + försvar) på en Gildra är ingen anledning att spara
  palen: Gildra ligger under 90:e percentilen i attack (120), HP+försvar (210) och sprint (720)
  men har Handiwork 5 — alltså **bara arbetare**. `ROLE_FLOOR` är de percentilerna, och de
  skiljer "kan slåss om den måste" från "är en stridspal". Testet gäller allt som räknar
  guldpassiver (`fittingGold`), rena bärare och synergier.
  **Regeln säger nej bara när mismatchen går att visa**, och det är avsiktligt:
  - En passiv utan `fx` (Heart of the Immovable King, Lightfooted, `WorkSuitabilityAddRank_*`)
    har effekter datasetet inte beskriver. Att kalla dem värdelösa vore att slänga toppassiver.
  - En art utan tydlig roll (Lamball: ingen arbetslämplighet, låga scalings) går inte att
    jämföra mot — då duger vilken passiv som helst.
  Skyddsnätet `rescueSoleCarriers` sparar den renaste bäraren av en toppassiv som **ingen**
  sparad pal bär, även när passiven inte passar arten (`soleCarrier`, eget skäl och egen grupp
  i gränssnittet). Utan det föreslog sidan att mata bort boxens enda Demon God, och passiver
  går bara att ärva. Ta inte bort det när du pillar på passform-reglerna.
- **Stjärnkostnaderna är kumulativa, inte en total** (`condense.ts`). 4 → 1★, sedan 16 **till**
  för 2★, 32 för 3★, 64 för 4★. "20 dubbletter" betyder därför två stjärnor från noll men
  ingenting alls från 2★, där nästa steg ensamt kostar 32 — och det gick inte att se på den
  gamla sidan, som visade samma mätare för båda. `planCondense` delar upp arterna i
  `now`/`soon`/`hold`/`max` och sorterar på stjärnvinst före frigjorda platser.
  Spara-reglerna släpper dessutom igenom exemplar man ändå inte vill mata: en ensam guldpassiv
  utan hög IV, och en enda 100:a i en stat — den senare är byggsten i `planPerfectLine`, inte
  mat. Därför `notes` på varje plan; ta inte bort dem för att korten ser renare ut utan.
- **Passiv-banners renderas som `<span>`, inte `<div>`** (`PassiveRow.tsx`). CSS ger dem
  `display: flex/grid` ändå, och rader som ska gå att klicka på är `<button>` — en `<div>` inuti
  en knapp är ogiltig HTML. Byt inte tillbaka.
- `displayStats` approximates in-game stats (HP/Atk/Def formulas + passives + souls·3 % +
  stars·5 %); Work Speed base is 70. Values land within a few % of the game — good enough,
  also labeled "≈".
- The condense bar in Base Info shows stars (the game shows pals fed — not stored in the save).
- Partner skills are **not** in any dataset — that's why the detail panel shows the Paldeck
  description in the Partner Skill-style frame instead.
- **`Trainer*`-passiverna buffar spelaren, inte palen.** Mine Foreman (`TrainerMining_up1`),
  Logging Foreman och Motivational Leader höjer *din egen* takt när palen är i partyt — de gör
  ingenting för en arbetare i basen. De har all-nolla `fx` och faller därför bort av sig själva i
  `recommendPassives`; lägg inte till dem manuellt bland arbetsförslagen.
  Passiver som faktiskt höjer arbetsrangen heter `WorkSuitabilityAddRank_<WorkType>_<n>` och finns
  **bara för MonsterFarm** (Farmhand, Ranch Master). De har också tom `fx`, så `purpose.ts` ger dem
  poäng via id-mönstret i stället — nya sådana i datasetet kommer med automatiskt.
- Oil Extraction exists in data but is hidden from work UI (matches the user's game).
- Fishing pals list (`FISHING_PALS`) is hardcoded from Palworld 1.0 guides.

## Workflow with the user

- Ken iterates visually: expect screenshots/video clips of the game with "make it look like this".
  Verify every UI change with a headless screenshot (Playwright + `/opt/pw-browsers/chromium` in
  the cloud sandbox) **before** delivering, and compare against his reference.
- Delivery loop used so far: build green → tar (exclude `node_modules`, `.next`) → write to
  `C:\Repository\palassistent` (extract with `tar --strip-components=1 --overwrite`; the device
  mount cannot delete files — old archives are parked in `_to_delete/`).
- `_to_delete/` is junk the user empties himself; never rely on its contents.
