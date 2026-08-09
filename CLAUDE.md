# CLAUDE.md – PalAssistent

Instructions for Claude agents working in this repo. **The user (Ken) communicates in Swedish,
and code comments are Swedish — keep it that way.** UI copy, on the other hand, is **no longer
hardcoded in any language**: it lives in message catalogues (see "Språk" below). Never put a
user-visible string in a component or in `src/lib`.

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
  **Varje art i planeraren bär sina element och sitt Paldeck-nummer** — `SpeciesMini` (alla
  plansteg, kombos, artkedjan, fritt läge), art-rutnätet, artförslagen, målbilden, **bärarkorten**
  (`PalIdent`) och **genvägarna** (`Shortcuts`). Lägger du till en ny plats där en art nämns ska
  den ha det också: stegen nämner arter man inte äger, och nästa steg är att slå upp dem
  i spelets Paldeck. Art-sökningen matchar därför också element ("fire") och nummer ("134").
  Se `Species.deck` under "Domain gotchas" innan du visar numret någon ny plats.
  Also direct combos, shortest-path "fritt läge" tree, `?target=<speciesIdx>` deep-links
  (used by Bäst för…). Alla val **sparas** (`pa-breeding` i localStorage) så planen finns kvar
  när man varit inne på Boxen; **Rensa allt** överst nollar dem.
  Överst sitter **Avelsbas** (`BreedSetup`), hopfälld: uppställningen som gör äggen snabbare
  – Braloha i basen, Philanthropist på föräldrarna, Broncherry i partyt – mätt mot din egen
  box (utplacerad? kondenserad? hur många bärare?). Den är därför också det som översätter
  planernas äggsiffror till tid. Se "Domain gotchas".
- `/recommendations` – en **arbetsordning**, läst uppifrån och ner (formen valdes ur fem
  förslag 2026-08; korten i rutnät var det som gjorde sidan bökig). Ordningen är innehåll,
  inte layout:
  1. **Spara dessa** – vad du *inte* ska mata, grupperat efter anledning (grupperna speglar
     `applyKeepRules`), hopfällt och tätare än vanliga `dgroup`. Står före kön med flit.
  2. **Kondensera** – en rad per art: stjärnhopp, antal att mata, platser du får tillbaka och
     varningsprickar. Utfälld visar raden vem du behåller (passiver, **bra för**) och vad
     stjärnorna är värda i HP/attack/försvar (`condenseGain`).
  3. **Nästan där** – arter som saknar några dubbletter till nästa stjärna, plus en hopfälld
     lista med långt kvar/maxade.
  Den röda varningsrutan överst (`RecoWarning`, "Kondensering går inte att ångra" + ansvars-
  friskrivningen) **togs bort på Kens begäran 2026-08** – bygg inte tillbaka den. Att det matade
  försvinner för alltid står kvar i "Varför kondensera?" (`WhyCondense`, `reco.why.body`), som
  är det enda stället sidan säger det nu.
  Vyn är `RecoView` (state + modellen) och delarna ligger i `RecoBits` (`rs`/`rq`-prefixade
  klasser).
- `/best-for` **Bäst för…** – attack team, base dream-team, best workers per task (own + global,
  global rows are clickable → breeding plan), **Ranchen – vem lägger vad** (`ranchGuide`,
  grupperad på varan; se "Domain gotchas"), fishing pals (Palworld 1.0), fastest mounts.
  Basgänget visar också **var exemplaret står** (`p.c`): laget väljer artens bästa individ, och
  den ligger oftast kvar i boxen fast en sämre redan är utplacerad.

## Commands

```bash
npm install                            # first time (fonts are npm packages)
pip install -r tools/requirements.txt  # first time, for "Läs in från spelet"
npm run dev        # http://localhost:3000
npm run build      # must stay green – always run before delivering
npm run typecheck  # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm test           # node:test över src/lib – inga beroenden, kompilerar till tests-dist/
npm run passive-text  # täckningskoll: har varje passiv i datasetet en svensk beskrivning?
npm run docs-images   # finns varje bild dokumentationen pekar på? (CI kör den först)
npm run docs-shots    # tar om README:s sex skärmdumpar (kräver en server, se nedan)
```

`npm test` täcker sannolikhetsmatematiken (`perfectPlan`, `inheritOdds`, `condenseReach`) med
**handräknat facit** i varje test. Kör det efter varje ändring i `src/lib` – en felräknad
sannolikhet ser precis lika trovärdig ut som en riktig, och varken bygge, typecheck eller lint
fångar den. Testerna hittade t.ex. att två pals i samma tillstånd dominerade bort varandra.

**Skärmdumparna i `docs/img/` är README:s enda innehåll utöver texten**, och filnamnen är
engelska som dokumentationen (`overview`, `box`, `recommendations`, `best-for`, `breeding`,
`overview-light`). Ändras en vy synbart ska bilden bytas ut i samma veva — README är för de
flesta hela projektet. `npm run docs-images` fångar en referens som pekar på en fil som inte
finns (det var så en omdöpning till engelska tog död på fem av sex bilder utan att någon
märkte det), men den kan inte se om en bild är *gammal*. Att *märka* det är fortfarande ett
mänskligt jobb — men att göra något åt det är ett kommando: `npm run docs-shots`
(`scripts/docs-shots.mjs`) tar om alla sex mot en körande server och styr maskinens egen Edge
över CDP, utan att projektet får ett beroende på en nedladdad webbläsare.

Sex saker om dumparna som är valda, inte råkade så:

1. **Alltid mot ett produktionsbygge**, aldrig `next dev` — dev-servern ritar sin egen
   utvecklarknapp i hörnet. Kör `npm run build` + `npm run start -- -p 3100`. Håller en
   dev-server `.next` (Ken har ofta en uppe) gäller varningen nedan: bygg då i stället med
   `PA_PACKAGE=1 npx next build`, kopiera `static` + `public` in i
   `.next-package/standalone/` och kör `node server.js` därifrån.
2. **Tom Edge-profil, alltså inget språkval.** Språket ligger i en cookie och faller annars
   tillbaka på `DEFAULT_LOCALE` = engelska. Bilderna visar därför det en ny användare får:
   engelskt skal, svenska vyer. När katalogerna täcker vyerna ska de tas om.
3. **Färgläget sätts som `prefers-color-scheme`**, inte via `pa-theme` — då står tema-väljaren
   kvar på "Auto" i bilden, som för den som aldrig valt.
4. **Väntan är på innehåll, inte på en klocka.** Datan hämtas klientsidan, så `load` säger
   ingenting: varje dump har en text den ska hitta, och väntar dessutom in typsnitt och
   avkodade bilder. En `sleep` ger antingen halvritade porträtt eller onödig väntan.
5. **Avelsplanen är README:s exempel** (Anubis med Legend, Ferocious, Swift, Musclehead) och
   art-/passiv-id slås upp i datan, aldrig som index i URL:en — index flyttar sig när den
   statiska halvan regenereras, och en plan för fel art ser inte trasig ut, bara fel.
6. **Två bilder är högre än en skärm med flit.** Avelsplanen behöver hela planen, och
   rekommendationerna är en arbetsordning: med en skärm blev bilden nio hopfällda rubriker och
   inget av det README:s text lovar. Därför öppnas första kondenseringsraden (`open` på dess
   `<details>`) så stjärnhoppet och "bra för" syns.

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
  billigaste **merge-trädet** över bärarna, se "Domain gotchas"; flags impossible pairs),
  `best.ts` (team pickers, global rankings),
  `perfectPlan.ts` (`planPerfectLine` — söker **kortaste vägen** till 100/100/100 + önskade
  passiver; se "Domain gotchas"), `findIvDonors` (arter som bär en saknad 100:a och parar
  tillbaka till samma art),
  `purpose.ts` (syften + `recommendPassives` — poängsätter passiver ur `PassiveDef.fx`
  i stället för en handskriven lista, så nya passiver i datasetet kommer med automatiskt;
  `purposeScore` är den delade poängsättningen och `passiveSynergy` hittar färdiga
  uppsättningar åt spara-reglerna; äger också `isEquipmentOnly`, som `PassivePicker` importerar),
  `passiveText.ts` (`PASSIVE_TEXT` — vad varje passiv **gör**, på svenska, plus `passiveText`
  och `tierLabel`; `describeEffects` är fx-raden som `recommendPassives` visar som motivering.
  Se "Domain gotchas"),
  `implants.ts` (Pal Surgery Table — `ownedImplants`/`ownsImplant` ur saven, `KNOWN_MODULES` ur
  wikin, `implantAdvice` som räknar vad det sparar. **Appen får säga att du äger ett implantat och
  antyda att ett finns — men aldrig påstå att en passiv inte går att operera in.** Se "Domain
  gotchas"),
  `condense.ts` (`planCondense` — verdict per art: `now`/`soon`/`hold`/`max`, plus `palUses`
  och `buildUseIndex` som svarar på "vad är den här palen bra för?", och `condenseGain` som
  svarar på "vad är stjärnorna värda?" i spelets egna stats; se "Domain gotchas"),
  `breedingPrefs.ts` (`parseBreedingPrefs`/`serializeBreedingPrefs` — planerarens val som
  överlever sidbyten; se "Domain gotchas"), `savePrefs.ts` (var saven ligger + live-läget,
  samma valideringsdisciplin). `loadout.ts` (`idealLoadout` — rollens fyra
  passiver mot vad palen redan bär, används av Bäst för…),
  `breedRate.ts` (`planBreedSetup`/`eggSpeed` — avelstakten och vad boxen har av den;
  se "Domain gotchas").
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
  `PassiveTip` (`PassiveTipHost` — hover-rutan för passiver, monterad **en gång** i layouten),
  `BreedSetup` (avelsbasen — hopfälld uppställning + takt-mätare),
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

## Språk (i18n)

Gränssnittet talar åtta språk. **Engelska är både standard och reserv**
(`DEFAULT_LOCALE` i `src/i18n/config.ts`); svenskan är komplett för hand. De sex övriga
(zh-Hans, ja, de, fr, es, pt-BR) är tomma kataloger och faller därför tillbaka på engelska
— det är avsiktligt, inte en lucka: en halvöversatt katalog blandar två språk på samma
skärm, en tom gör det aldrig.

- `src/i18n/messages/en.ts` är **sanningen**. Nycklarna är platta och punktade, och varje
  annan katalog är typad mot den — en nyckel som inte finns i engelskan kompilerar inte,
  och en som tas bort där faller ut överallt i stället för att ligga kvar som död text.
- `useT()` i komponenter, `t.plural` för antal, `useRichT()` när meningen har **fetstil i
  mitten**. Dela aldrig upp en mening i före/fet/efter — ordföljden är olika i olika språk.
  Katalogen håller hela meningen med en namngiven platshållare, komponenten säger vad
  platshållaren ritas som.
- **`src/lib` har ingen översättare** och ska inte ha någon. Logiken väljer *vad* som ska
  sägas och returnerar `Msg` (nyckel + variabler); komponenten avgör språket. En variabel
  får själv vara en `Msg`, så "3 passiver för Bas & arbete" är två nycklar och inte en
  hopklistrad sträng. Där en rad byggs ihop av flera delar (`describeEffects`,
  `recommendPassives`, `spanText`) tar funktionen emot `locale` i stället.
- **API-rutterna översätter också.** Deras fel ritas rakt i gränssnittet, så de läser samma
  språk-cookie som `layout.tsx` via `serverT()` i `src/i18n/server.ts`.
- **Spelets egna ord står kvar på engelska**: artnamn, passivnamn, element, arbetstyper,
  ranch-varor och Base Info-panelens etiketter (LEVEL, NEXT, Attack, Current Task). De ska
  gå att matcha mot spelets menyer utan att översättas tillbaka.
- **Passivtexterna är per språk** (`passiveText.ts` = handöversatt svenska,
  `passiveTextEn.ts` = **genererad** ur uppströms-l10n). Skriv aldrig i den engelska filen
  för hand — den görs om ur källan när den statiska halvan förnyas.
- Två ord ritas av CSS (`VISA`/`DÖLJ` på hopfällbara paneler) och kan därför inte nå
  katalogen. `LocaleProvider` skriver dem som `--ui-show`/`--ui-hide` på `<html>`; nya
  pseudo-element med text ska göra likadant.
- `scripts/docs-shots.mjs` väntar på **engelsk** text för att veta när en vy är färdigritad
  — bilderna tas utan språk-cookie, alltså på standardspråket. Byter en vy formulering ska
  `ready` i skriptet med.

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
   **Hover-rutan (`.ptip`) är däremot gränssnitt, inte spel, och följer temat.** Därför får den
   aldrig låna bannerns färger: `passiveVisual(5).color` är vit och tier 1 nästan vit, och på
   rutans ljusa `--panel` blev "WORLD TREE" osynligt. Nivåetiketten går via `tierToken` i
   `PassiveTip.tsx` — lila/teal/guld/rött ur temats egna tokens, som finns i båda lägena.
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
6. **Implantaten i förrådet läses ur `ItemContainerSaveData`, och det är gratis.** Nyckeln ligger
   som **nummer 8**, alltså före `CharacterContainerSaveData` (10) som ändå avslutar inläsningen —
   och före `InLockerCharacterInstanceIDArray`, som biblioteket inte kan tolka alls. Den ordningen
   är inte en detalj: hade den legat efter hade fältet kostat både tid och risk.
   Slotarna går **inte** att läsa med bibliotekets avkodare — `paltypes` markerar själv
   `ItemContainerSaveData.Value.Slots.Slots.RawData` som trasig sedan v0.3.7 ("UObject fields
   encoded into raw data"). `_slot_item` är därför en tolerant egen läsare, precis som för pals:
   `int32 slotIndex, int32 stackCount, int32 längd, char[] id`, och den läser **aldrig till EOF** —
   svansen är UUID:n. Uppmätt: `00000000 d4020000 06000000 "Money\0"` = slot 0, 724 guld.
   Bara implantat plockas ut, inte hela inventariet: resten används inte av någonting, och 526
   item-id:n ur någons värld hör inte i en bundle som skickas vidare.
7. Pal fields come from the gvas character container (IVs = `Talent_HP/Shot/Defense`,
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

Fjorton saker som är inlärda med möda – ändra inte tillbaka:

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
8. **Boxen töms** ur `pal-data.json` (`pals`/`player`/`exported`/`implants`), den statiska halvan
   följer med. `implants` kommer ur savens item-behållare och är alltså lika personligt som boxen —
   **allt nytt fält i `AppData` som kommer ur saven ska nollas här i samma andetag**, och
   `package.yml` har en spärr som vägrar publicera en nyttolast som bär det.
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
12. **`Process.MainWindowTitle` ger fönstret som ligger ÖVERST, inte appens fönster.** Hela
    Edge-profilen är *en* process med flera fönster, och .NET väljer det första `EnumWindows`
    hittar – alltså det översta i z-ordningen. Lägger sig ett annat Edge-fönster ovanpå appen
    ser launchern inget PalAssistent-fönster alls, `WaitForShutdown` tolkar det som att
    användaren stängt programmet och dödar servern 1,2 s senare. Symptomet är en app som
    stänger sig själv strax efter start, utan felmeddelande, "ibland". `AppWindowExists` går
    därför igenom **alla** synliga toppnivåfönster och kräver att fönstret tillhör en
    msedge-process (annars håller Utforskarens "PalAssistent"-fönster servern vid liv).
13. **Egen profil är inte tom profil.** `--user-data-dir` isolerar inte från användarens
    tillägg som man kunde tro: på en dator med jobbkonto loggar Edge in sig själv i den nya
    profilen och **synkar ner alla tillägg** – Kens app-profil hade 20 stycken, däribland
    Adblock Plus, som öppnar sitt "tack för att du använder …" i ett eget fönster och utlöser
    punkt 12. Därför `--disable-extensions` (+ `--disable-sync`). Ett tillägg har ingenting
    att göra på en lokal sida ändå; det kan lika gärna blockera appens egna resurser.
14. **`build.ps1` får inte lita på modulladdning.** `npm run package` startar det i Windows
    PowerShell 5.1, och på CI är anroparen PowerShell 7 – då svarar 5.1 att `Get-FileHash`
    inte finns, fast `ConvertFrom-Json` och `Copy-Item` i samma skript fungerar. Bygget gick
    igenom Next, PyInstaller, launchern och Inno Setup och dog på **sista raden**,
    kontrollsummorna. Det såg ut som ett paketeringsfel men var ett miljöfel, och eftersom det
    aldrig hände lokalt låg det kvar: `v2.1.0` blev en tagg utan utgåva, och repot hade noll
    utgåvor tills det hittades. SHA-256 räknas därför med .NET. Behöver du något ur en modul
    här: anropa .NET i stället, eller kontrollera att det finns innan du använder det.

    Att felet gick att **hitta** är en egen läxa: byggloggen kräver inloggning, så ett fallet
    paketbygge är bara "Process completed with exit code 1" för den som felsöker utifrån.
    Paketsteget skriver därför sitt fel som en `::error::`-annotering, och **annoteringar går
    att läsa utan konto**. Ta inte bort det – det var det som gav svaret på första försöket
    efter tre blinda körningar.

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
3. **Knappen i skenan** (`UpdateCheck`, `?manual=1`) är samma koll men på begäran, och skiljer sig
   på fyra punkter som alla följer av att någon *frågat*: dygnsspärren hoppas över, ett tidigare
   "senare" nollas (annars vore knappen tyst för just den som tryckt bort versionen den skulle
   hitta), sextimmarscachen byts mot `MANUAL_CACHE_MS` (60 s – knappen ska kännas levande men
   inte bli en gratis linje till GitHub), och **misslyckandet syns**. `checkOutcome` håller
   `failed` skilt från `latest` med flit: "du kör den senaste" är ett löfte, och det får inte
   ges när vi inte kunde fråga. Kollen bor därför i `UpdateProvider` och inte i bandet — knappen
   sitter i skenan och bandet högst upp, och de får aldrig säga olika saker om samma version.
   Bandet rullar fram sig när en manuell koll hittat något (`revealed`); utan det ser en lyckad
   sökning ut som att ingenting hände, eftersom bandet kan ligga utanför bild.
   Svaret står under knappen, inte bredvid: skenan är smal, och skenan syns alltid medan bandet
   bara finns när det faktiskt kommit en uppdatering.
4. **Installationen** (`/api/update/install`) laddar ner och **kör** en binär, och har därför
   fyra spärrar som ingen av dem är valfri: `PA_PACKAGED` (sätts av launchern, så källkodsbygget
   inte kan installera över sig självt), utgåvan hämtas om på servern (klienten skickar aldrig en
   URL), URL:en måste ligga under `https://github.com/<PA_REPO>/releases/download/`, och SHA-256
   jämförs mot `SHA256SUMS.txt` i samma utgåva innan något startas. Tas någon av dem bort är det
   en fjärrkörningsbugg, inte en uppdateringsfunktion.
5. **Bytet görs av ett skript i temp**, inte av oss: installern måste stänga appen för att skriva
   över dess filer, och en process kan inte vänta in sin egen död. Rutten svarar, avslutar sig
   själv efter 1,5 s, och skriptet kör installern tyst och startar programmet igen.
6. **Launchern vaktar därför servern också**, inte bara fönstret (`WaitForShutdown`). Utan det
   blir Edge-fönstret kvar och visar en död sida mitt under uppdateringen, och mutexen släpps
   aldrig så den nya versionen bara öppnar ett fönster mot en gammal port.

**Utgåvans text kommer ur `CHANGELOG.md`, aldrig ur commit-rubrikerna.** Skriv under
`## Unreleased` medan du jobbar; `npm version` kör `scripts/changelog.mjs stamp` som döper om
avsnittet till versionen och dagens datum och lägger det i samma commit som versionshöjningen.
Workflowen hämtar sedan avsnittet med `changelog.mjs notes <tagg>` och gör det till utgåvans
text — som i sin tur är det appen visar under "Vad är nytt?". Samma text tre gånger, skriven
en gång, riktad till den som *använder* appen.

Båda kommandona **avbryter** hellre än att släppa igenom en tom utgåva: `stamp` vägrar när
"Unreleased" är tom, `notes` vägrar när taggen saknar avsnitt. Det är avsiktligt — det enda som
säkert får någon att skriva noteringar är att bygget stannar annars. `notesToBlocks`
(`src/lib/update.ts`, testad) skalar bort markdown-markörerna innan texten visas i appen; en
`**fet**` mitt i en mening ser trasig ut, inte betonad.

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
- **Passivarv är två tärningsslag, inte ett** (`inheritOdds`/`exactOdds` i `breeding.ts`,
  källa [Palworld-wikin](https://palworld.wiki.gg/wiki/Breeding)): slå X ∈ 1..4 med vikterna
  40/30/20/10 → ungen ärver X slumpvis valda ur föräldrarnas gemensamma pool, **eller hela
  poolen om X ≥ poolens storlek**. Slå sedan Y med samma vikter; är Y > X får ungen Y−X
  **helt slumpade** passiver som ingen förälder bär.
  Två fällor som redan kostat en gång var:
  1. **Normalisera inte bort X > pool.** Den gamla modellen gjorde det och underskattade
     därför precis de rena steg planeraren siktar mot — 3 önskade ur en ren pool är 30 %,
     inte 22 %, och 2 önskade är 60 %, inte 43 %. Från pool 4 och uppåt är modellerna
     identiska, så felet syntes bara i de *bästa* stegen. Kuriosa som visar att siffrorna
     hänger ihop: en skräp-passiv hos partnern kostar exakt lika mycket som ett extra rent
     artsteg (6,667 ägg mot 2 × 3,333).
  2. **`inheritOdds` är "minst de önskade", inte "exakt".** Y-slaget ger minst en slumpad
     passiv i **35 % av alla ägg** oberoende av poolen — det går inte att avla bort. Planen
     räknar på "minst" (rätt, för mellansteg spelar skräp ingen roll), men vid kläckaren är
     det "exakt" man vill veta. `exactOdds` svarar på det och `ExactNote` visar det under
     planen. Med fyra önskade sammanfaller de: då finns ingen ledig plats.
  Vikterna är community-testade, inte datamined — märk siffrorna som uppskattningar i UI.
  Guiderna är inte eniga (game8 beskriver en helt annan modell), men wikins tvåslagsmodell
  är den enda som förklarar slumppassiverna mekaniskt.
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
  2. Passiver slumpas **inte** fram i planeringen — saknas en i arten är den ett förkrav för
     passivplanen, inte ett skäl att sakna IV-plan. Spelet *kan* visserligen lägga till en
     slumpad passiv (Y-slaget ovan), men att planera på den vore att planera på tur: den
     dras ur hela passivtabellen, inte ur den man råkar sakna. Antagandet är alltså medvetet
     konservativt, inte en beskrivning av spelet.
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
- **Fas 1 är ett TRÄD, inte en kedja** (`passivePlan.ts`). Planen lade tidigare på en passiv i
  taget på en och samma linje. Att i stället para ihop bärarna **två och två** och slå ihop
  mellanresultaten är billigare, och skälet är att kostnaden är konvex i poolens storlek:
  `inheritOdds(2,2)` = 60 % → 1,7 ägg, men `inheritOdds(3,3)` = 30 % → 3,3 ägg. Sista steget
  kostar 10 ägg (pool 4) hur man än kommer dit, så det enda som skiljer vägarna är vad man
  bygger på vägen: en trea (1,7 + 3,3 = 5) eller en andra tvåa (1,7 + 1,7 = 3,3). `mergeTree`
  söker därför igenom alla ihopslagningar — med högst fyra önskade finns högst fyra bärare,
  alltså 2⁴ delmängder, och sökningen kostar ingenting. Mätt mot Kens box: oförändrat vid två
  bärare, ~5 % billigare vid tre, ~14 % vid fyra, aldrig dyrare (310 fall).
  Fyra saker som hänger ihop med det:
  1. **Kön kostar ägg, och det är där det mesta av vinsten sitter.** En unge ur ett tidigare
     steg är 50/50, så måste den ha ett bestämt kön kostar den i snitt en kull till
     (`genderEggs`). Den linjära ordningen betalar det i vartenda steg efter det första, den
     parvisa bara i det sista. Är båda föräldrarna mellansteg räcker det att jaga kön på den
     *billigare*; är den ena en ägd bärare som finns i **båda** könen i boxen är det gratis.
  2. **Flera steg parar nu två kända individer**, inte bara det första — det är hela poängen
     med att mötas på mitten. Varje sådant steg måste vara ♂+♀. `resolvePair` byter därför
     **individ, inte plan**: `altOfGender` letar en pal som bär samma önskade passiver men har
     rätt kön (renast vinner). Går det inte flaggas steget med `genderOk: false` i stället för
     att tigas ihjäl. `maxJunk`-argumentet skiljer två frågor åt: för att paret ska kunna avla
     duger vilken ersättare som helst, men för att räkna könet som *gratis* måste bytet vara
     likvärdigt — annars smyger sig skräp in i poolen utan att synas i oddsen.
  3. **Roten väljs på HELA planen, inte på fas 1.** Olika ihopslagningar landar i olika arter,
     och fas 2 kostar väldigt olika mycket därifrån. I Kens box: den parvisa vägen kostar 15
     ägg i fas 1 men landar i Smokie (50 ägg till Anubis) = 65, medan en dyrare ordning kostar
     16,7 men landar i Prunelia = 56,7 totalt. Sökningen sparar därför den billigaste noden
     **per landningsart** i stället för att slå ihop dem, och provar de `ROOT_CANDIDATES`
     billigaste mot artkedjan. När den vinnande ordningen inte är billigast i fas 1 sätts
     `mergeDetour` så gränssnittet kan förklara omvägen — annars ser den ut som ett misstag.
  4. **`carrierInfo.chosen` sätts om efter att trädet valts.** Set-covern väljer bärare enbart
     på passiver, så `resolvePair` kan ha bytt ut en individ — och då pekade bärarkorten på en
     pal planen aldrig rör. `plan.carriersUsed` är facit.
  Vad sökningen med flit **inte** gör: den väljer inte om vilka bärare som ska användas. Det
  gör set-covern ovanför, som minimerar antal bärare. Två andra pals som tillsammans bär precis
  de önskade kan ändå vara billigare — det är vad `altRoutes.ts` letar efter.
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
- **`PassiveDef.fx` beskriver bara sex effekter – resten står som noll** (`UNMODELLED` i
  `purpose.ts`). Attack, arbete, rörelse, HP, element och försvar finns; **uthållighet, simfart,
  hopp i sadeln, SAN-dropp, hungerdropp och nedkylning gör det inte**. Eftersom
  `recommendPassives` poängsätter ur `fx` fick alla de passiverna noll och föll ur varje
  rekommendation: Eternal Engine (+75 % uthållighet) fanns inte bland riddjursförslagen alls.
  `UNMODELLED` lägger på dem med spelets procent och en egen vikt. Tre saker som medvetet står
  utanför tabellen — lägg inte till dem:
  - **Tempest Fury** ger 0 % i nuvarande version och går inte att få tag på. Tom `fx` är rätt.
  - **Healing Coach, Wellness Watcher, Reload Master, Noble** buffar spelaren, inte palen –
    samma familj som `Trainer*` (se `PLAYER_BUFF_PREFIX`).
  - **Vampiric, Heavily Armored, Babysitter** har verkliga effekter men ingen siffra som gick
    att belägga. Hellre utanför än gissad.
- **Sex elementboostar följer inte `ElementBoost_<Element>_<n>_PAL`** (`NAMED_BOOSTS` i
  `purpose.ts`): `EternalFlame` (eld + el), `Invader` (mörker + drake), `Salvation` (neutral),
  `Witch` (mörker), `Nushi`/`MiniNushi` = Lunker/Whopper (vatten + is). De föll utanför mönstret
  och räknades därför som element-**neutrala** — Necromus (Dark) fick Eternal Flame i tre av
  fyra platser i sin attackuppsättning. Flera boostar **två** element, så matchningen är en
  mängd, inte ett värde. Och elementfaktorn gäller **bara `fx.ele`**, inte hela passiven:
  Lunker ger +20 % försvar som inte är elementbundet, och nollar man allt försvinner den delen.
- **`idealLoadout` ska visa rollens bästa, inte bara det du äger.** Den läste `picks` ur
  `recommendPassives`, som filtrerar bort allt utan bärare i boxen – följden var att Dimensional
  Leap aldrig kunde föreslås. Använd `all`. Att passiven saknas syns på `carriers: 0` i kortet,
  som redan renderar det. Riddjur får dessutom en **reserverad uthållighetsplats** på samma sätt
  som anfallare får en elementplats (`isStamina`): de fyra bästa på ren fart är Dimensional Leap,
  Swift, Runner och Legend, men en mount utan uthållighet går ner i gånghastighet när mätaren tar
  slut. `Stamina_Up_1` är Infinite Stamina (+50 %) och `Stamina_Up_3` är Eternal Engine (+75 %) —
  **suffixet säger inget om styrkan**, sortera aldrig på id:t.
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
- **`Species.deck` är Paldeck-numret – men inte utan hål** (`DeckNo` i `PalBits`). Tre saker
  som gör att det aldrig får skrivas ut rakt av:
  1. **Varianter delar basartens nummer.** Wumpo och Wumpo Botan är båda `134`, Jormuntide och
     Jormuntide Ignis båda `121`. Spelet skiljer dem åt med en bokstav ("134B") men suffixet
     finns inte i datasetet. Basnumret leder till rätt uppslag ändå — varianten står bredvid.
  2. **0 och −1 betyder "inget index"**, inte "nummer noll". Fyra arter har det: de tre
     `Unidentified Pal`-platshållarna och **Lamball**, som i spelet är No.001. `DeckNo`
     returnerar `null` för `deck <= 0` — annars ser en dataset-lucka ut som ett riktigt nummer.
  3. **Numreringen är den nuvarande, inte lanseringens.** Nya arter ligger inskjutna bland de
     låga numren (Celaray 7, Croajiro 9, Herbil 10), så Foxparks har `29` och inte `5`.
     Jämför aldrig mot en lanseringslista när du felsöker — regenerera hellre den statiska
     halvan ur `palworld-save-pal`.
- **⚠️ `STAR_COST` är PRE-1.0 och behöver rättas.** 4+16+32+64 = 116 var kostnaden före
  Palworld 1.0. **1.0 sänkte full kondensering till 48 pals totalt**, men Pocketpair har inte
  publicerat fördelningen per stjärna, och uppdateringen gjorde om arbetslämpligheten i grunden
  i stället för att skala ner den gamla kurvan — att halvera de gamla talen vore en gissning.
  Rätt siffror står i spelets Condenser-ruta. Allt på `/recommendations` räknas ur den enda
  arrayen i `constants.ts`, så det är en rad att ändra plus facit i `tests/condense.test.ts`.
  Sidan säger tills vidare uttryckligen att siffrorna är pre-1.0.
- **Kondensering höjer arbetslämpligheten, inte bara stats.** Varje rang lyfter *en* av palens
  befintliga sysslor ett steg, och full rang lyfter alla. **Taket i 1.0 är nivå 10**, medan den
  naturliga rostern toppar på 8 — resten kommer från kondensering, Applied Technique-böcker
  (+1 permanent per syssla, säljs av Medal Merchant) och **arbetsauror** (en bärare ger +1 i en
  syssla till alla *andra* pals i basen; bäraren själv får inget och dubbletter stackar inte).
  Inget av det finns i datasetet, så `Species.ws` är artens *grundnivå* — inte vad en
  investerad pal faktiskt presterar. Skriv aldrig "bäst på X" som om grundnivån vore slutgiltig.
- **Partner-skills avgör ofta vem som är bäst, och de finns inte i datan.** Anubis + Sekhmet slår
  arter med högre grundnivå i Handiwork tack vare sina partner-skills. Rankningarna i
  `best.ts`/`condense.ts` går enbart på `ws` och är därför en grov approximation.
- **Stjärnkostnaderna är kumulativa, inte en total** (`condense.ts`). 4 → 1★, sedan 16 **till**
  för 2★, 32 för 3★, 64 för 4★. "20 dubbletter" betyder därför två stjärnor från noll men
  ingenting alls från 2★, där nästa steg ensamt kostar 32 — och det gick inte att se på den
  gamla sidan, som visade samma mätare för båda. `planCondense` delar upp arterna i
  `now`/`soon`/`hold`/`max` och sorterar på stjärnvinst före frigjorda platser.
  Spara-reglerna släpper dessutom igenom exemplar man ändå inte vill mata: en ensam guldpassiv
  utan hög IV, och en enda 100:a i en stat — den senare är byggsten i `planPerfectLine`, inte
  mat. Därför `notes` på varje plan; ta inte bort dem för att korten ser renare ut utan.
  **Och stjärnan är inte svaret på "varför?"** — `condenseGain` kör `displayStats` på samma pal
  före och efter, så vinsten står i HP/attack/försvar. "+2★" kräver att läsaren själv räknar om
  5 % per stjärna, och då syns aldrig att hoppet ibland är för litet för de tjugo exemplar man
  matar bort.
- **Ranchen är den enda sysslan där nivån inte avgör värdet** (`palUses` i `condense.ts`,
  `BASE_WORK_TYPES` och `ranchGuide` i `best.ts`). Varje
  art lägger sin **egen** vara i ranchen — ull, ägg, honung, tyg — och `MonsterFarm`-nivån styr
  bara takten. "Bäst i boxen på Farming" krönte därför den med högst siffra (Dumud Gild 4) som
  om den vore oumbärlig, fast frågan är om man vill ha just den varan. Ranchen visas alltid för
  en art som har den (att behålla *ett* exemplar är hela poängen med en ranchpal) men får aldrig
  `best`, och `caveat` bär förklaringen. Samma sorts lögn i liten skala fanns i vanliga sysslor:
  boxens "bästa" gruvarbetare kan vara en Cattiva på nivå 1. Det är `only` — **enda i boxen** —
  och inte samma sak som bäst. Förbehållet renderas som egen rad under brickorna, inte inuti
  dem: `.couse` bryter inte rad och en hel mening därinne spränger kortet i sidled.
  Samma regel styr `/best-for`: ranchen är **inte** en av sysslorna basgänget ska täcka
  (`BASE_WORK_TYPES`), annars tog den med högst Farming-siffra en lagplats. I stället finns
  `ranchGuide`, som grupperar arterna på **varan** — och varorna står i `RANCH_DROPS`
  (`constants.ts`), handkurerad precis som `FISHING_PALS` eftersom datasetet inte har någon
  ranch-vara alls. **Gissa aldrig dit en vara.** En art utan rad visas som "vara okänd", vilket
  är ärligt; en påhittad vara ser precis lika trovärdig ut som en riktig och skickar någon till
  ranchen med fel pal — det märks först timmar senare. 16 av arterna saknar rad i skrivande
  stund (2026-08).
- **Greedy-lag måste städas efteråt** (`pruneRedundant` i `best.ts`). `pickBaseCrew` väljer den
  som ger mest just nu och tittar aldrig tillbaka: Whalaska (Watering 5 + Cool 6) var rätt val
  när laget var tomt, men efter Neptilius (Watering 7) och Frostallion (Cool 7) toppade den
  ingenting — och satt kvar och såg ut som ett råd. Efter greedyn tas därför alla bort som inte
  är bäst på minst en syssla. Städningen går **bakifrån och räknar mot den kvarvarande listan**:
  tar man beslutet för alla samtidigt kan två pals med *samma* toppnivå båda se sig som
  ersättliga, och då tappar laget täckningen helt.
- **Avelstakten är additiv och uppmätt, inte gissad** (`breedRate.ts`). Ett ägg tar 300 s i
  grunduppställning. `takt = 1 + 1 per förälder med Philanthropist + Bralohas bonus`
  (20/26/32/38/50 % per stjärna, stackar inte med fler Braloha), och `tid = 300 / takt`.
  Modellen faller ut ur communityns mätvärden: 201 s med 4★ Braloha, 150 s med en
  Philanthropist, 100 s med båda, 85 s med båda + 4★ (300/1,5 / 300/2 / 300/3 / 300/3,5).
  Taket är alltså **3,5×** — mer än de flesta omvägar planeraren räknar fram, vilket är
  varför äggsiffrorna också visas som tid. Tre saker modellen med flit **inte** gör:
  1. **Insomnia räknas inte in i takten.** Att paret inte pausar på natten är upptid, inte
     hastighet, och vi har ingen mätning. Raden finns, siffran gör inte det — en påhittad
     procent hade sett precis lika trovärdig ut som de fyra riktiga.
  2. **Philanthropist räknas aldrig som "har".** Passiven måste sitta på just de två pals man
     parar; 23 bärare i boxen är råmaterial. Annars lovar appen en takt användaren inte har.
  3. **Arbetshastighet gör ingenting** — Artisan, Work Slave, Serious, Lucky, Statue of Power
     och kondensering av *föräldrarna* snabbar upp hantverk, aldrig avelstimern. Enda
     kondenseringen som räknas är Bralohas egen, för dess partnerskill. Det står i klartext i
     gränssnittet eftersom allt i listan ser ut som att det borde hjälpa.
  Arterna slås upp på `code` (`Plesiosaur`, `SakuraSaurus`, `SakuraSaurus_Water`), aldrig på
  index eller namn — samma fälla som `breedingPrefs.ts` är byggd runt. Partnerskills finns
  inte i datasetet, så procenten är handkurerade som `FISHING_PALS`; ändras de i spelet är det
  tabellen högst upp i filen som ska uppdateras, inget annat.
- **En passiv du opererar in kostar noll ägg — och wikins lista över vad som går är fel**
  (`implants.ts`). Pal Surgery Table sätter in en passiv på en **färdig** pal, alltså efter
  avlingen, så den hamnar aldrig i arvspoolen. Eftersom `inheritOdds` är konvex i poolens storlek
  är det den billigaste optimeringen i hela planeraren: 4 önskade är 10 % per ägg, 3 är 30 %, så
  **ett** implantat gör sista steget 3× billigare och två gör det 6×.
  Två källor, och bara en är sanning:
  1. **Saven vet.** Implantaten ligger som items med id
     `PalPassiveSkillChange_Consumable_<passiv-id>` — suffixet *är* passivens id, så inget uppslag
     behövs. Läses av `palsave.py` till `AppData.implants`.
  2. **Wikin gissar.** [Implant](https://palworld.wiki.gg/wiki/Implant) listar 26 moduler, alla på
     rank ≤ 3, och guiderna drar slutsatsen att "rainbow-nivån är utesluten". **Slutsatsen är
     motbevisad** av Kens egen save, som innehåller implantat för Swift och Mastery of Fasting —
     båda rank 4. Wikins lista är *en* familj av items, inte hela mängden.
  Därför: `ownsImplant` är ett påstående appen får göra, `isKnownModule` är ett "finns som" den får
  antyda, och **"kan inte opereras in" får den aldrig säga**. Det var första försöket här, och det
  hade sagt "Swift måste avlas" till någon med implantatet i förrådet. Ett negativt påstående om en
  ofullständig lista är alltid fel.
  `undefined` i `AppData.implants` betyder "läsaren kan inte fältet", `{}` betyder "du äger inga" —
  slå aldrig ihop dem, och ärv aldrig förrådet från den förra bundlen (då blir det monotont växande
  och rådet fel utan att något ser trasigt ut).
- **Passiv-banners renderas som `<span>`, inte `<div>`** (`PassiveRow.tsx`). CSS ger dem
  `display: flex/grid` ändå, och rader som ska gå att klicka på är `<button>` — en `<div>` inuti
  en knapp är ogiltig HTML. Byt inte tillbaka.
- **`fx` är poängunderlag, inte en beskrivning** (`passiveText.ts`). Hover-rutan över en banner
  visar spelets egen text, översatt för hand, och det är med flit: **två tredjedelar av
  passiverna har inga fx alls** (Lightfooted, Philanthropist, Insomnia, Heart of the Immovable
  King …), och för flera som har det är fx *ofullständig* — Serenity sänker laddningstiden 30 %
  men bär bara `atk: 10`, Lunker är `ele: 40` där spelet säger 20 % vatten + 20 % is, och Lucky
  saknar sitt försvar. Att generera rutan ur fx hade alltså mest upprepat bannerns namn. Tre
  saker som hör ihop med det:
  1. **Tabellen ligger i `src/lib`, inte i `pal-data.json`.** Den statiska halvan genereras
     utanför repot, så allt man lägger i bundlen försvinner nästa gång den regenereras.
  2. **`npm run passive-text` är täckningskollen** — hämtar uppströms-l10n:en, listar id:n utan
     svensk text (med den engelska originaltexten färdig att klistra in) och texter vars passiv
     försvunnit. Samma koll finns som test, utan nät. Kör den när den statiska halvan förnyas:
     annars märks en ny passiv först när någon hovrar och får "ingen beskrivning".
  3. **Hitta inte på procent.** Där spelets text saknar en siffra (Tempest Fury anger 0 %) står
     ingen. Rutan är det enda stället användaren får veta vad passiven gör, och en påhittad
     siffra ser precis lika trovärdig ut som en riktig.
- **En banner som ska gå att hovra får `data-passive={id}`, inget mer** (`PassiveTip.tsx`).
  Värden ligger i layouten och lyssnar på hela dokumentet; nya ställen behöver bara attributet.
  Två fällor:
  1. **Avstängda alternativ är `aria-disabled`, inte `disabled`.** En `disabled` knapp får inga
     pekarhändelser alls i Chrome/Edge, och då går den inte att hovra — precis när man vill veta
     vad passiven gör (fyran är full, eller ingen i boxen bär den). Klickhanteraren måste därför
     själv strunta i klicket, och CSS matchar `[aria-disabled="true"]`.
  2. **Ta bort `title` på samma element.** Webbläsarens egen ruta dyker upp ovanpå och krockar;
     det som stod där ska antingen in i beskrivningen eller bli ett `aria-label`.
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
