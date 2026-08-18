# CLAUDE.md – PalCompanion

Instructions for Claude agents working in this repo. **Swedish is for talking to Ken — that is the
only thing that defaults to it.** Everything written down has its own rule:

- **The pipeline and everything around the flow is English**, comments included: `.github/workflows/*`,
  the scripts CI runs (`scripts/changelog.mjs`, `docs-images.mjs`, `ensure-data.mjs`) and
  `packaging/build.ps1`. That covers what they *print*, too — job output, warnings and thrown
  errors are read in the Actions tab, by anyone, and half of them end up in a public annotation.
- **Code comments in the app itself are Swedish** — `src/**`, `tools/**`, `packaging/Launcher.cs`,
  `packaging/palcompanion.iss`, `globals.css`. Keep it that way.
- **Anything a user or an outsider reads is English**: README, CHANGELOG, the release text, the
  repo's own docs.

UI copy is **not hardcoded in any language**: it lives in message catalogues (see "Språk" below).
Never put a user-visible string in a component or in `src/lib`.

## What this is

A **Next.js 15 + TypeScript (strict)** web app that analyzes Ken's **Palworld** save file and acts as
a box manager / breeding planner. Its look is the **"Habitat" theme** (chosen by Ken in 2026-08,
replacing the earlier 1:1 in-game replica): rounded cards, a vertical nav rail, and the *element's
colour as the information carrier*. See "Design rules" below — and note that the game's own assets
(passive banners, work/element icons, species art) are still used verbatim.

Features by route:

- `/` **Översikt** – hero-band med "Boxens stjärna", nyckeltal, höjdpunktskort, flest per art.
- `/box` **Boxen** – vald pal i ett hero-band överst, hela boxen som habitat-brickor under
  (namn + level + IV på varje bricka). Search/filter/sort på toppen: **verktygsraden är tre
  kontroller** (fält, filter, sorteringsmeny) och ingen platta bakom – samma regel som i Rollerna.
  **Sorteringen är TVÅ nycklar med var sin riktning** (`src/lib/boxSort.ts`), inte namngivna
  förval: "stjärnor fallande, sedan level stigande" går inte att uttrycka med en global
  riktningsknapp, för den vänder båda samtidigt. Det var Kens rättning aug 2026 – *"jag ville
  kunna sortera på många stjärnor men låg level; nu kan jag välja många stjärnor eller inga,
  alltså tvärtom"* – och förvalen som fanns däremellan gjorde bara om samma fel med fler namn.
  Menyn är EGEN och inte en `<select>`: systemets dropdown ritas av operativsystemet och tog
  varken temats botten eller dess text, så raderna blev grått på grått i mörkt läge. Finns en
  `<select>` kvar någonstans måste dess `option` få botten och text uttryckligen (se
  `select option` i globals.css). Spelets **Base Info**-replika
  (LEVEL, NEXT, stjärnor, HP/hunger/SAN, Attack/Defense/Work Speed med buff-pilar, arbetsremsa,
  Paldeck, Passive Skills 2×2) finns kvar och öppnas med **Base Info**-knappen i heron – eller
  automatiskt när man klickar en bricka på smal skärm.
  **Pals som ingår i avelsplanen bär en guldkant och en bricka som säger vilket steg**
  (`planRoles` i `passivePlan.ts`, Kens förslag aug 2026). Boxen läser samma sparade val som
  planeraren (`pa-breeding`) och räknar om planen; utan sparade val markeras ingenting. Guld och
  inte elementfärgen – den är upptagen av arten och betyder något annat. Kanten ligger som
  `box-shadow` UTANFÖR ramen så den inte slåss med markeringen för vald pal, som äger
  `border-color`; bägge kan synas samtidigt. Filtret **"I planen"** finns för att de tre-fyra
  palsen annars ligger utspridda bland hundratals brickor.
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
  (used by Rollerna). Alla val **sparas** (`pa-breeding` i localStorage) så planen finns kvar
  när man varit inne på Boxen; **Rensa allt** överst nollar dem.
  **Sidan har FLIKAR – en led per flik** (Kens begäran aug 2026): en avelsled är ett projekt som
  pågår parallellt med andra, och enda alternativet var att bygga om valen för hand varje gång.
  Posten i localStorage är därför en **bok** (`BreedingBook` = leder + vilken som är framme), och
  fyra saker hänger ihop med det:
  1. **`parseBreedingPrefs` betyder fortfarande "den aktiva ledens val"**, och den platta gamla
     posten läses vidare som en bok med en led. Fem andra vyer läser samma nyckel och frågar alla
     efter *en* målbild; att låta funktionen byta betydelse hade ändrat alla fem tyst.
  2. **Bokningarna tar ALLA leder** (`planAllBookings`, läses av Rollerna och Hitta). En led man
     inte har uppe är fortfarande en led man håller på med, och matning går inte att ångra – utan
     det hade kondenseringen pekat ut bakgrundsledernas bärare precis som före `bookings.ts` fanns.
     `GoalWatch` följer också alla mål: bandet finns för att man är i spelet och inte på
     planeraren, och då vet man inte vilken flik som låg överst.
  3. **Boxens guldkant och Översiktens rad är kvar på den AKTIVA leden.** Kanten bär ett steg-
     nummer, och steg tillhör en plan – en union hade satt två olika "steg 1" på samma bricka.
  4. **Vyn håller ETT tillstånd** (`book`), inte åtta `useState`. Det är vad som gör flikbytet till
     en rad: byter man flik byter allt samtidigt, och ingen state kan bli kvar med förra ledens
     värde. Manuellt läge och ångra-raden hör till fliken man stod på och följer aldrig med över.
  **Byter man MÅL nollas de önskade passiverna** (Kens begäran aug 2026) – de valdes för den förra
  arten. Två gränser: det **första** målet nollar ingenting (passivmodalens egen ordning är syfte →
  syssla → artförslag → passiver, så en nollning där hade raderat det man just gjort), och
  nollningen **går att ångra** på raden ovanför planen. En automatisk radering man inte bett om får
  aldrig vara slutgiltig.
  **Med IV-målet "perfekt" är planen EN LED** (Kens design aug 2026, förslaget "En led" ur en
  artefakt han godkände): importstegen (`ivImport`) och etappstegen (`planPerfectLine`) ligger i
  **samma numrering 1 → N** i en enda `BreedRoute`, och vad ett steg uträttar står som **fas-chip**
  i stegets huvud (`.ph imp/iv/pv/goalph`) i stället för som egen rubrik – det är chipet som låter
  numreringen löpa genom hela planen. Importkedjorna plattas ut till en rad per artsteg (varje steg
  ÄR en parning man gör), och `fromStep`/`imported` räknas om till radnummer (`rowOf`, `importRow`) –
  annars säger ett kort "steg 2" om en rad som heter 4. `PassivePlanSection` **göms** när
  `mergedRoute` är sant (perfekt plan som är komplett): den planerar samma passiver utan IV, och två
  numreringar för samma pal var precis det som gjorde sidan rörig. Saknas en önskad passiv i arten
  (`missingPassives`) står den kvar – då gör den något leden inte kan.
  Toppen är **målbild | förväntat | verktyg** (`.bhead`, designrundan aug 2026): målbilden är
  klickbar (porträttet öppnar artväljaren, passivplatserna passivväljaren), och verktygen –
  **Implantat**, **Manuellt läge**, **Avelsbas** (`BreedSetup`, taktmätaren som översätter
  planernas äggsiffror till tid, se "Domain gotchas") – öppnas som riktiga modaler i samma
  `pamodal` som väljarna. `.bsetup` är numera alltid en modalkropp med `.bshd`-huvud; den
  CSS-lyfta details-varianten blev en hoptryckt remsa och togs bort (Kens rättning ×2).
- `/recommendations` **Rollerna** – rekommendationerna och gamla "Bäst för…" **sammanslagna**
  (Kens val ur fem designförslag aug 2026: "Rollhubbarna" + rollerna som **flikar**), och sedan
  **omdesignade till "Konsolen"** (Kens val ur fyra förslag i runda 2, samma månad: förra ytan
  underkändes som "böklig … mycket saker i luften och klutter").
  Sidan delas på **roll**: fem flikar — **01 Boxen · 02 Strid · 03 Basen · 04 Riddjur & fiske ·
  05 Spelaren** — med EN roll synlig i taget.
  **Tre fel styr varje val i ytan, och de är värda att kunna utantill innan man ändrar något
  här** – de var exakt det som gjorde förra versionen rörig:
  1. *Ingenting höll ihop innehållet* → allt bor i **moduler** (`Module`): ram, litet
     rubrikband och en **räknare** i huvudet ("19 arter · +22★" svarar på "är det mycket?" utan
     att man läser en rad i kroppen). Källor och förbehåll ligger i modulens **fot** (`foot`),
     inte i brödtexten.
  2. *Allt hade samma vikt* → rollens siffror är **mätare** överst (`RoleGauge`), modulrubrikerna
     är små. Mätaren är **alltid en riktig andel** (`fill` 0–1 + `meter`-text som säger vad
     andelen är) – en stapel utan innebörd är just den dekoration som togs bort.
     KPI-pillren i bandhuvudet är borta: samma tal stod på två ställen.
  3. *Listor i listor* → kön är en **radlista** (`CondenseRow`: löpnummer, porträtt, art,
     LED-stjärnor för hoppet, antal, vinstmätare mot taket +20 %, varningsprickar; klick fäller
     ut vem du behåller + `condenseGain` i spelets stats) och spara-listan ett **segmentband**
     (`KeepConsole`).
  **Modulerna ligger i SPALTER** (`ModCol`), inte som rader: två rader med olika höga moduler
  lämnade 250 px luft mitt på sidan. Fördela modulerna så spalterna blir ungefär lika långa;
  fullbreddsmoduler (`span={12}`) ligger som egna rader efter spalterna.
  **Plattorna bakom flikrad och nät är fortfarande borta** (Kens begäran aug 2026) — mätarraden
  och nätet har inga wrapper-ytor. Att modulerna har ramar är *samma* regel, inte ett undantag:
  de ÄR innehållsytor. Bygg inte en panel runt mätarraden.
  **Fliken väljs med URL-hashen** (`#rh-box … #rh-player`) – mätarna är vanliga ankare,
  containern lyssnar på `hashchange`, `RoleHead` bär ankarets id, bakåtknappen går till förra
  fliken, och Översiktens/Hittas gamla djuplänkar fortsätter landa rätt. Innehållet **byts**
  (villkorad rendering), inte göms – fem fullrenderade roller var det som gjorde sidan tung.
  Innehållet per flik – **allt från de två gamla sidorna finns kvar**:
  1. **Boxen** – kön (`CondenseRow`, kolumnrubriker i `.cqhead`), **Spara dessa**
     (`KeepConsole`), Mer att göra (bästa expeditionssajten + slakt), Nästan där, alla
     expeditionssajter. "Varför kondensera?" (`WhyCondense`, `reco.why.body`) ligger i köns fot
     och är **enda stället** som säger att matningen inte går att ångra; den röda varningsrutan
     togs bort på Kens begäran 2026-08, bygg inte tillbaka den.
     **Segmentbandets färg är information, inte dekoration:** den säger vilken *familj* av skäl
     gruppen hör till (`KeepFamily` – `pv` passiv / `iv` / `st` tillstånd / `rest`), tonen kommer
     ur temats tokens (`--gold`/`--blue`/`--violet`/`--muted`) och steg inom en familj skiljs på
     ljushet. Elementfärgen är reserverad för pals – ge aldrig grupperna nio egna hues, det ser
     ut som att de betyder något de inte betyder. Grupperna speglar `applyKeepRules`, och
     "artens bästa (övriga)" är numera en grupp bland de andra (det är den största).
  2. **Strid** – Gör detta (BIS-luckor per lagmedlem → avelsled med de saknade som önskade,
     själar, nästa strid → Uppdrag) + BIS-mallen; bredvid: attack-formationen,
     uppsättningskorten, rankningarna (topp 15 ägda + globala), **Hitta en pal för…**.
  3. **Basen** – Gör detta (utplaceringar via `isStored`, "behåll en i ranchen", basförsvar,
     själar) + BIS-mallen + basförsvarsmetan (`DEFENSE_META`); bredvid: basgänget,
     uppsättningskorten, **Ranchen – vem lägger vad** (`ranchGuide`; se "Domain gotchas") och
     arbetare per syssla (egna + globala) i full bredd.
  4. **Riddjur & fiske** – Gör detta (riddjurens BIS-luckor med uthållighetsplatsen, själar,
     skaffa fiskehjälpar) + BIS-mallen; bredvid: pallplatsen, uppsättningarna, fiskelistan.
  5. **Spelaren** – Gobfin×Vanguard-stacken, skaffa stödarter, `SUPPORT_META` med spelets
     partnerskill-text som motivering.
  **BIS-korten har varken egen rubrik eller egen ram** – de bor i en modul som redan heter samma
  sak (`BIS_TEMPLATES[kind].role` ÄR modulens titel), och förbehållet ligger i foten (`BisNote`).
  En ruta i en ruta med rubriken två gånger var precis det dubbelspel som skulle bort.
  Vyn är `RecoView` (state + modellen), skalet i `RoleBits` (`rh`-prefix), kondenserings- och
  spara-delarna i `RecoBits` (`rs`/`rq`/`cq`/`ks`-prefix). `/best-for` **är en redirect hit** –
  gamla länkar/bokmärken ska landa rätt; djuplänk till en flik: `#rh-box … #rh-player`.
- `/quests` **Uppdrag** – din resa ur saven, i Kens kombination ur designrundan aug 2026
  (**Fältkartans helhet + Instrumentbrädans moduler**): **karthjälten** (världskartan med
  guldstämplade torn på `mapPct`-positioner – Världsträdet är en egen spelkarta och får ALDRIG
  en gissad prick HÄR; sedan aug 2026 har det en egen karta under `/map`, med sina fyra bossar
  på riktiga koordinater) + **resan som faser** (Tornen → Panthalus → Världsträdet → Hard mode →
  Raiderna → Paldecken; nästa fas upplyst, klick rullar till sin del), **Nästa steg** =
  `nextFight` + SEDAN-raden (OBS: Panthalus står FÖRE Världsträdet i `QUEST_BOSSES` – fångsten
  öppnar trädet, stabil sort på nivå avgör; testat), **kampanjen som kvitton** (porträtt + Lv +
  ✓×N ur `towerClears["<flagga>_Normal"]` – avklarat är intjänad mark, aldrig en hopfälld
  grupp), **hard mode som belöningskort** (riktiga item-ikoner via `schematicIconSlug`),
  **raiderna som äggtavla** (porträtt + savens kvitton; "ägg saknas" när decken saknar arten –
  detaljer + motlag fälls ut per kort), **Kvar i världen**-mätare med belöningskrok
  (`relicHeld` = "N oanvända — offra vid en Statue of Power", alfabossar = 5 Ancient
  Tech-poäng styck) och → kartan-länkar. Paldecken bor i resan (spelarnas slutmål, upp från
  källaren), questloggen ligger sist som kompakt remsa. Bossdatan är handkurerad
  (`QUEST_BOSSES` i `quests.ts`) – se "Domain gotchas" om tornflaggorna.
- `/map` **Kartan** – spelets RIKTIGA kartor, **två stycken**: Palpagosöarna
  (`public/img/worldmap.webp`) och **Världsträdet** (`public/img/worldtree.webp`), båda 8192²
  och Palworld 1.0, med datamine-positioner ur `src/lib/data/worldmap.json` (genereras av
  `tools/build-worldmap.mjs`, källor + transform dokumenterade där och i `src/lib/worldmap.ts`).
  **Världsträdet kom in aug 2026 och är en EGEN karta, inte ett lager** – se "Domain gotchas".
  Pan/zoom imperativt (ref + transform, markörer motskalas med `--iz`), lagerchips med savens
  hittat-räknare, "bara det jag inte hittat". Effigies/snabbresor prickas av på instans-GUID,
  alfabossar på spawner-id, torn på flaggnamn; läger/dungeons har ingen per-instans-flagga i
  saven och visar bara räknare – pricka aldrig av dem på gissning.
  Tre lager kom in aug 2026 för att Hittas schematics-källor skulle landa någonstans:
  **oljeriggarnas kistor** (47, 3 speldygns nedkylning), **skattkarteplatserna** (42, rariteten
  sitter på kartan man hittar och inte på hålet) och **namngivna regioner** (79 ur paldb:s
  `regionData` – spelets egna namn, med nivåspannet delat ut ur namnet till `lo`/`hi`).
  **Lägren har inget namn i källan.** `item` är markörens interna id ("Grass2", "DLC3") och
  `RewardName` regionens token ("Snow1"); fraktionen ("Hunter", "Ninja") kommer ur
  spawner-klassen. Prickarna visar därför **fraktionen**, och regionstoken är en nyckel som
  aldrig ritas – den finns för att `schemWhere` ska kunna slå upp "Snow enemy camp".
  `Snow1` ↔ `REGION_Frost_*` är INTE en säker koppling, så regionnamnet till ett läger hämtas
  geometriskt (närmaste namngivna region inom 200 enheter) och betyder "området lägret ligger i".
- `/find` **Hitta** – universalsök över allt appen vet. Tio kategorier i **fast ordning** med
  träffräknare som chips under sökfältet (Kens rättning aug 2026: sidan kändes slumpmässig):
  **avelskombo · arter · varor · passiver · partnerskills · schematics · platser ·
  expeditioner · raider · fiske**. Tomt fält = katalogläge; arterna kräver en fråga (de är
  trehundra). Vyn är `FindView`, de nya heron i `src/components/ui/FindBits.tsx`, uppslagen i
  `src/lib/findIndex.ts`.
  **Auditen aug 2026** (Kens fråga "vad har vi missat, inte bara ranch?") byggde ut sidan, och
  fem av besluten är värda att kunna innan man ändrar här:
  1. **Varan är EN kategori, inte fem.** `itemIndex` slår ihop pal-drops, ranchen, malmnoderna,
     expeditionerna, handlarpriserna och raidbytet till **ett svar per vara**. Ranchvarorna var
     tidigare en egen kategori, så "Wool" gav två chips med olika räknare – samma "listor i
     listor" som Rollerna underkändes för. Bygg inte tillbaka en källa till en egen kategori.
  2. **Räknarna räknar det som FINNS.** Förr skars träffarna till 12 *innan* `counts` räknades,
     så chipet sa "12" när åttio matchade ("Schematic 4" ljög rakt ut). `hits` bär hela mängden,
     chipet visar den, och `limit` + "visa fler (N kvar)" styr bara vad som **ritas**. ↑/↓ går
     genom alla träffar och fäller upp nästa sida av sig själv.
  3. **Partnerskills är sökbara** (`skillIndex`, 298 arter) och står i artheron. Texten fanns i
     repot och bara Rollerna läste den – "vad gör den här palen?" hade inget svar på Hitta.
  4. **Kartan går att fråga** (`placeIndex`): snabbresor, dungeons med nivå, läger, malmnoder,
     fruktträd. Grupperas på (typ, namn), aldrig per prick – 83 malmnoder är samma svar 83
     gånger. Två bortfall REDOVISAS i gränssnittet (`placeGaps`): 33 dungeon-markörer saknar
     namn i källan, och alla läger är en grupp eftersom källans namn är interna id:n
     ("Grass2", "DLC3") – en intern kod är inget platsnamn. Ett tyst bortfall ser ut som full
     täckning, och då tror man att sökningen är trasig.
  5. **Ingen kategori får vara en återvändsgränd — och element blev ingen kategori alls.**
     Elementheron var först en typtabell med en länk till en generisk sida ("när man väljer
     elements gör det ingenting", Kens rättning aug 2026) och byggdes då om till att svara på vad
     man äger och vad man tar mot. Den domen kom ändå tillbaka: **"det känns inte som vi får value
     av detta"** (Ken, aug 2026), och kategorin är borttagen. Skälet är katalogläget, inte heron —
     nio brickor som säger Fire/Water/Grass är en meny över något man kan utantill efter en vecka,
     medan varje annan kategori bär ett tal per rad. Elementen är fortfarande **sökbara** (art-
     sökningen matchar både datasetets `Leaf/Earth` och spelets `Grass/Ground`), och styrka/svaghet
     plus bästa egna motpal står i **artens** hero, där frågan faktiskt ställs. Bygg den inte
     tillbaka. Det som försvann med den och inte finns någon annanstans: antal ägda per element och
     expeditionernas elementkrav mot boxens lediga (`squad.byElement`) — hör de hemma någonstans är
     det expeditionsheron, inte en egen kategori.
     Ankarlänkar till Rollerna går på **`#rh-fight`**, inte `#rh-combat`: fliken heter
     `fight` i koden och `combat` i gränssnittet, och en okänd hash faller TYST tillbaka på första
     fliken. `tests/deepLinks.test.ts` håller varje länkad hash mot `TAB_BY_HASH`.
  6. **Kombokategorin finns bara när frågan ÄR ett par** ("Anubis x Lamball" → `parseCombo`).
     Ett chip som alltid står där med noll träffar är klutter. Den står FÖRST i ordningen: har
     frågan tolkats som ett par är paret svaret.
  Artheron bär numera också Paldeck-texten, artens egna siffror (scalings, sprint, mat/mage,
  könsfördelning, nattaktiv – allt låg i bundlen och ritades ingenstans) och **föräldraparen**
  ("vilka blir Anubis?", ägda par först). Passivsöket matchar **beskrivningen** och inte bara
  namnet, så "attack" och "stamina" ger träffar. Expeditionsheron säger om sajten är upplåst ur
  saven och om boxens ≈FP räcker; raidheron visar savens nedlägg.
  **Schematics-källorna är platser, inte prosa** (Kens rättning aug 2026: "Snow enemy camp
  och inget mer … inte så användarvänligt"). Varje rad som går att peka ut bär en handkurerad
  `spot` (`SchemSpot` i `findData.ts`) som `schemWhere` löser mot kartdatat → **region med
  spelets eget namn och nivåspann, koordinater, karta-länk och en "så farmar du den"-rad per
  sort**. "Snow enemy camp" blev tre koordinater i Astral Mountains Lv 35–50. Tre regler:
  `spot` skrivs **explicit** och läses aldrig ur `source`-texten (en regex som glider pekar ut
  fel plats, och en fel koordinat är värre än ingen); källor som inte går att peka ut (arenan,
  handlarna, "coastal bases") får INGEN `spot` och får i stället `find.how.chest`, som säger att
  källan är ett område att sopa av; och karta-länken visas bara när det finns något att titta på
  där, annars är den en återvändsgränd. `tests/schemWhere.test.ts` håller kopplingen token →
  område mot paldb:s egna regionnamn – att snölägren ligger i snön är det enda i kedjan som är
  ett mänskligt val.
  **Ruinerna är den starkaste schematic-källan, och raderna HÄRLEDS** (Kens fynd aug 2026: "vi
  saknar massor med schematics för t.ex. katis ringen"). Det var sant: 71 legendariska tillbehör
  – ringarna, talismanerna, batongerna, visselpiporna, pendangerna – fanns inte i tabellen, och de
  var osynliga för granskningen av ett trivialt skäl: deras blueprint heter `Katress Ring Schematic`
  **utan sifferändelse**, och granskningen sökte på "Schematic 4". Sök aldrig bara på den formen.
  Varje `Ancient Ruin`-markör i paldb-lasten bär i sitt `comment`-fält NAMNET på den schematic den
  ger, med koordinat och 100 % byte. Därför genereras raderna av `ruinSchematics()` i stället för
  att hundra rader skrivs för hand: en patch som flyttar en ruin flyttar raden med, och ingen källa
  gissas. Stickprovet som gjorde metoden trovärdig: Katress Ring hamnar på (−1729,9, −989,7),
  exakt den koordinat paldb:s egen sida för schematicen anger. `LEGENDARY_SCHEMATICS` är alltså
  **inte** hela sanningen längre – den kurerade tabellen är boss-/torn-/kist-källorna, och Find
  slår ihop den med de härledda (`allSchem`). Böckerna ruinerna ger (Applied Technique) filtreras
  bort: de är inte ritningar. `tests/ruinSchematics.test.ts` håller ihop kedjan.
  **Hovra en vara eller en schematic → vad itemet faktiskt gör** (Kens fråga aug 2026).
  Spelets egen beskrivning plus siffrorna, ur `itemInfo.ts`; rutan är SAMMA värd som
  passivrutan (`PassiveTip`, attributet är `data-item`) — se "Design rules" 3. Två förbehåll
  som inte får tas bort: siffrorna är **basvariantens** (varje vapen har en rad i källan medan
  Schematic 4 bygger `_Default5`, och de högre nivåerna finns inte dataminade någonstans), och
  Flamethrower har bara **ritningens** text eftersom dess vapenrad inte finns i källan.
  **Artheron bär också kondenseringsrådet för arten** (`SpeciesCondense`, Kens önskan aug 2026:
  "välj en pal-art så kan vi rekommendera vilken i den arten som är bra att kondensera"). Rollernas
  kö rankar arter mot varandra och visar bara toppen – den kan inte svara på "jag har tolv Lamball,
  vilken behåller jag?". Samma modell (`planCondense`) svarar på båda, så sidorna kan aldrig säga
  emot varandra; Hitta hämtar dessutom bokningarna ur planerarens sparade val precis som RecoView,
  annars kan den föreslå att man matar bort en pal avelsplanen väntar på. Tre saker att inte ändra
  tillbaka: keeperen är **hoverbar** (`data-pal`) eftersom "behåll den här" är oanvändbart om man
  inte kan se vilken av tolv identiska det är; domen står som chip där bara `now` får accentfärgen
  (`hold` och `max` är svar, inte uppmaningar); och **utan plan står SKÄLET** – `planCondense`
  hoppar över en art vars alla exemplar är sparade eller bokade, och en tom ruta hade sett ut som
  att appen inte vet. Fällan att inte bygga tillbaka: `reco.row.leftover` börjar med " · " för att
  hänga på vinstraden, och vid 4★ finns ingen "nästa stjärna" – hopklistrat blev det
  "· 3 duplicates left overNothing to feed yet — 0 more for 5★", ett steg spelet inte har.
  Kvar som luckor, med flit: handlarnas sortiment utöver IV-frukternas belagda priser, och
  fiskarter/fiskeplatser (ingen data alls).

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

**`overrides` i package.json är inte skräp som blivit kvar.** `next` låser `postcss` till exakt
8.4.31 och `sharp` till `^0.34.3`, och båda har kända sårbarheter som Next själv bara åtgärdar
genom att gå till 16 — alltså en brytande uppgradering för en app som står på 15.5.23, senaste
15.x. De två raderna tvingar upp dem inom samma major (8.5.x, 0.35.x) och `npm audit` går från tre
höga till noll. Exponeringen var i praktiken låg — appen använder inte `next/image`, så `sharp`
anropas aldrig, och `postcss` ser bara vår egen handskrivna `globals.css` — men en tyst
`audit`-utskrift är hela poängen: nästa riktiga varning ska synas, inte drunkna. Tas raderna bort
kommer de tre tillbaka. Kolla om de kan tas bort igen när projektet går till Next 16.

`npm test` täcker sannolikhetsmatematiken (`perfectPlan`, `inheritOdds`, `condenseReach`) med
**handräknat facit** i varje test. Kör det efter varje ändring i `src/lib` – en felräknad
sannolikhet ser precis lika trovärdig ut som en riktig, och varken bygge, typecheck eller lint
fångar den. Testerna hittade t.ex. att två pals i samma tillstånd dominerade bort varandra.

**Skärmdumparna i `docs/img/` är README:s enda innehåll utöver texten**, och filnamnen är
engelska som dokumentationen (`overview`, `box`, `recommendations`, `breeding`,
`overview-light` — `best-for.png` försvann när sidan gick upp i Rollerna aug 2026). Ändras en
vy synbart ska bilden bytas ut i samma veva — README är för de flesta hela projektet.
`npm run docs-images` fångar en referens som pekar på en fil som inte
finns (det var så en omdöpning till engelska tog död på fem av sex bilder utan att någon
märkte det), men den kan inte se om en bild är *gammal*. Att *märka* det är fortfarande ett
mänskligt jobb — men att göra något åt det är ett kommando: `npm run docs-shots`
(`scripts/docs-shots.mjs`) tar om alla fem mot en körande server och styr maskinens egen Edge
över CDP, utan att projektet får ett beroende på en nedladdad webbläsare.

Sju saker om dumparna som är valda, inte råkade så:

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
6. **Två bilder är högre än en skärm med flit.** Avelsplanen behöver hela planen, och Rollerna
   ska visa både mätarraden och Boxen-flikens första modulrad: med en skärm blev bilden mest
   rubriker och inget av det README:s text lovar. Därför öppnas första köraden
   (`open: "details.cqrow"`) så stjärnhoppet, "bra för" och vad stjärnorna är värda syns.
7. **`ready` får aldrig vara en modulrubrik.** `innerText` återger CSS:ens `text-transform`, så
   "Condense queue" kommer tillbaka som VERSALER och väntan löper ut på en text som *finns*.
   Rollernas rad är därför mätarens etikett (`species ready`) — gemener, och kräver ändå att
   datan är inläst, alltså precis det villkoret vi vill vänta på.

**Never run `npm run build` while a server is holding `.next/` — `npm run start` counts, not just
`npm run dev`.** They share the directory, and the build overwrites the manifests and chunks the
running server holds in memory. The page then dies with `__webpack_modules__[moduleId] is not a
function`, 404s on its own chunks, or — the nastiest form — renders an **empty body**, because the
client bundle failed to load and there is no error boundary to show for it. Nothing is broken in
the source. Fix: stop the server, `rm -rf .next`, start it again. Ken usually has a dev server up,
so stop it (or build with `PA_PACKAGE=1`, which writes to `.next-package/`) before verifying a
build.

**The empty-body form is worth recognising, because it lies convincingly.** A verification script
that reads the page will report that everything it looked for is missing — every palette without
tokens, every category without hits — and that reads as a broken feature, not a broken server. It
cost three separate debugging detours in one day (aug 2026). The tell is that *everything* fails at
once, including things you did not touch; a real regression is narrower. Kill the server before you
build, always, and if a whole page reports empty, suspect the server before the code.

## Architecture (smart/dumb – keep this discipline)

- `src/lib/` – **pure logic, no React**. `types.ts` (all data types), `constants.ts`
  (tier weights, element/work metadata, icon filename maps), `scoring.ts` (pal scoring,
  keep rules, `displayStats` = in-game stat formulas), `breeding.ts` (pair table lookup,
  `solveFree` shortest-path over all species, `solveChain` base→target BFS,
  `solveChainCheapest` samma kedja men billigast i **ägg** (se "Domain gotchas"),
  `inheritOdds` passive inheritance probability), `passivePlan.ts` (kandidatuppsättningar av
  bärare + billigaste **merge-trädet** över dem, se "Domain gotchas"; flags impossible pairs),
  `directPair.ts` (`findDirectPairs` — par ur boxen vars unge ÄR målarten, alltså fas 1 och fas 2
  i EN parning; delas av planen och `altRoutes.ts`, se "Domain gotchas"),
  `best.ts` (team pickers, global rankings),
  `perfectPlan.ts` (`planPerfectLine` — söker **kortaste vägen** till 100/100/100 + önskade
  passiver; se "Domain gotchas"), `findIvDonors` (arter som bär en saknad 100:a och parar
  tillbaka till samma art),
  `ivImport.ts` (`planIvImports` — **bär in** en 100:a arten saknar genom artkedjan i stället för
  att slumpa fram den; se "Domain gotchas"),
  `ivFruits.ts` (`fruitsFor`/`fruitTotal` — Life/Power/Stout Fruit ger +10 IV var, tak 100; se
  "Domain gotchas"), `goalWatch.ts` (`watchGoal` + `SeenState` — "du har fått den"-bandet som
  live-läget gör meningsfullt; bara NYA instans-GUID:n annonseras och första körningen seedas tyst),
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
  överlever sidbyten, plus `parseBreedingBook` och flikoperationerna; se "Domain gotchas"),
  `bookings.ts` (`planBookings` per led, `planAllBookings` över alla flikar), `savePrefs.ts` (var saven ligger + live-läget,
  samma valideringsdisciplin). `loadout.ts` (`idealLoadout` — rollens fyra
  passiver mot vad palen redan bär, används av Rollerna),
  `boxSort.ts` (boxens jämförare; de sammansatta sorteringarna och regeln för
  riktningsknappen – se filens huvud),
  `breedRate.ts` (`planBreedSetup`/`eggSpeed` — avelstakten och vad boxen har av den;
  se "Domain gotchas"),
  `cake.ts` (`planCake` — vad planens ägg kostar i TÅRTA, och vem i boxen som lägger
  ingredienserna; receptet är genererad data, se "Domain gotchas"),
  `itemInfo.ts` (vad en vara ÄR — spelets beskrivning + attack/försvar/magasin/hållbarhet/vikt.
  GENERERAD av `tools/build-item-info.mjs`; `base`/`blueprint` är förbehåll gränssnittet MÅSTE
  visa, se filens huvud),
  `findIndex.ts` (Hittas uppslagslager, aug 2026: `itemIndex` = alla kända källor per vara
  slagna ihop till EN post, `placeIndex`/`placeGaps` = kartans lager som sökbara grupper med
  redovisat bortfall, `skillIndex` = partnerskills, `parseCombo`/`parentPairsOf` = avelskombon
  åt båda hållen. Rena uppslag utan text: spelets ord passerar rakt igenom, allt som ska
  formuleras returneras som en `kind`-diskriminant — se "/find" ovan).
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
  `PalIdent` (bärarkortet + `palLocation` — VAR palen står: låda, rad och ruta. Varje ställe som
  pekar ut en individ ska använda den, aldrig `pal.c`: behållarnamnet ensamt är "en av åttahundra"
  (Kens fynd aug 2026 – planerarens bärarkort saknade platsen helt och partnerkorten sa bara
  "Palbox"). Undantaget är Base Info-repliken, som visar spelets egen Current Task-rad.),
  `PassiveTip` (`PassiveTipHost` — hover-rutan för passiver, varor, **arter och individer**,
  monterad **en gång** i layouten; `data-passive` / `data-item` / `data-species` (artens KOD) /
  `data-pal` (instans-id). Artrutan sätts av `SpeciesIcon` själv, så varje porträtt i appen har
  den – `tip={false}` stänger av den där en individ är svaret i stället, som på boxens brickor),
  `BreedSetup` (avelsbasen — hopfälld uppställning + takt-mätare),
  `SaveFolder` (panelen bakom "Mapp" — mapp, hittade världar, live-läget),
  `FindBits` (Hittas heron för vara/plats/partnerskill/expedition/raid/kombo, plus `Fact` som
  alla heron delar; `wide`/`stack` på en fakta är layout-krav, inte kosmetik — se filens huvud).
  Only their search box/filter chip keep local state; the selection itself always lives in the
  container.
- **Skalet** (client components): `Rail` — toppraden som **"Kapseln"** (Kens val ur fem
  navbar-förslag aug 2026): raden ligger PÅ sidan i stället för att vara dess kant. Tre saker
  hänger ihop och får inte plockas isär var för sig:
  1. **`.rail` är luftspalten, `.cap` är ytan.** `.rail` måste vara sticky i full bredd medan
     kapseln är den smalare ytan inuti — en sticky yta med marginal hade lämnat en genomskinlig
     remsa där innehållet rullar förbi i full skärpa.
  2. **`.rail` bär en slöja + blur i stället för en botten.** Bottenfärgen blandas ned med
     `color-mix` eftersom `--bg` är ogenomskinlig och annars dödar canvas-strukturen i toppbandet.
  3. **Kapselns form överlever en fyrkantig palett.** 999px brett, 26/22px när zonerna radbryts —
     aldrig `var(--r4)`, som är 0 i `press` och gjorde kapseln till en låda tvärs över skärmen.
  Inuti: **tre zoner** — märket | flikarna
  **centrerade** med spelets egna ikoner (sfär/ägg/rank-pil/torn/kompass; vita glyfer tonas med
  currentColor via `MaskIcon`) | spelarrutan + kugghjulet — Kens rättning aug 2026: den
  vänsterklumpade prickraden var "väldigt tråkig" på bred skärm. Aktiv flik är en **fylld**
  accentplatta med `color: var(--bg)`: den tonade syntes knappt mot kapselns ljusare yta, och
  bottentokenen är det enda som håller kontrasten mot accenten i BÅDA lägena.
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
- `src/middleware.ts` + `src/lib/localOrigin.ts` – **ursprungskontrollen, och den är en
  säkerhetsgräns, inte en formalitet.** Att servern binder `127.0.0.1` stoppar nätverket, inte
  webbläsaren: varje sida användaren har öppen kan skicka förfrågningar till loopback. Två
  angrepp följde av det, och båda är verifierade som stoppade. **CSRF:** `POST
  /api/update/install` tar varken body eller egna huvuden och är alltså en "simple request" utan
  preflight — en godtycklig sida kunde be appen ladda ner installern och döda sig själv. Samma
  lucka i `/api/save/import`, vars body läses med `request.text()` och JSON-tolkas efteråt, så
  `text/plain` slipper preflighten. **DNS-rebinding:** en domän som byter till 127.0.0.1 räknas
  som samma ursprung, och då går svaren att läsa — `scan?root=C:\` är en filbläddrare och
  `/data/pal-data.json` är hela boxen plus spelarnamnet. Kontrollen är därför `Host` = loopback
  (stoppar rebinding, för webbläsaren skickar fortfarande angriparens domännamn) och `Origin` =
  vårt eget när det finns (stoppar CSRF). Båda huvudena sätts av webbläsaren och går inte att
  förfalska från JS — det är hela skälet att det är just de två. Tre saker att inte ändra
  tillbaka: den sitter som **middleware** och inte per rutt, eftersom `/data/pal-data.json` är en
  statisk fil som ingen rutt äger; beslutet ligger i `src/lib` för att kunna testas
  (`tests/localOrigin.test.ts` är de två angreppen skrivna som förfrågningar); och `dev`/`start`
  i package.json har `-H 127.0.0.1`, för `next dev` binder annars 0.0.0.0 och gör `scan` till en
  filbläddrare för hela kaféets wifi.

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
   **Sju paletter finns** (Kens urval ur tretton, aug 2026), och en palett är exakt två saker:
   tokensen i `globals.css` och en canvas-gren i `BgTexture`. Inget lager, ingen komponent och
   ingen layout hör till en palett.
   **Men tokens är mer än färg**, och det är hela lärdomen ur urvalsrunda 2 (Kens dom om de fem
   första: *"känns lite för lika nuvarande"*): de bytte bara nyans, och det man SER är strukturen.
   Fyra spakar utöver kulören sitter också i tokens och får appen att kännas som en annan app —
   `--panel`s **alfa** (ogenomskinligt kort ↔ genomskinlig yta där bakgrunden syns),
   `--r1..--r4` (fyrkantigt ↔ mjukt runt; de får överskrivas per palett, attributselektorn vinner
   över `:root` oavsett ordning i filen), `--line`/`--line2`s **tyngd** (hårfin antydan ↔ ritad
   ram) och `--bg`s **ljushet** (nästan vitt ↔ mellanton där panelerna lyfter). Dra i dem innan du
   hittar på en nionde grön nyans.
   Ordningen i `PALS` är standarden först och sedan mjukast yta → hårdast, och den är information:
   `press` (**standard sedan aug 2026**, Kens val — se nedan; `dusk` hade platsen före den och
   `basalt` före dess), `dusk` (gryning
   → violett natt med guld, horisontband + stjärnfält), `basalt` (neutral sten så elementet blir
   skärmens enda färg, stenkorn), `nightwood` (grönt + höjdkurvor), `graphite` (helt omättade ytor,
   bärnstensaccent, penseldrag), `glacier` (högt tonläge, **enda paletten vars mörka läge är stål
   och inte natt**, frostkristaller), `press` (trycksak — `--r` = 0 rakt igenom, ogenomskinligt
   papper, linjer som syns; halvtonsraster) och `instrument` (tunga ramar `.30`/`.26` mot vanliga
   `.12`, nästan skarpa hörn; mätarsvep).
   **Sex paletter togs bort i samma runda** och ska inte byggas tillbaka utan att Ken ber om det:
   `deepwater` (fanns sedan tidigare), `fieldbook`, `ember`, `sakura` (låg för nära dagens look)
   samt `glass` och `chalk` (avsteg han inte valde). En **borttagen palett i localStorage faller
   tyst tillbaka på standarden** via valideringen i `layout.tsx` — det är hela skälet att listan står
   där, och det som gör en rensning ofarlig för den som redan valt.
   **Standardpaletten står på BARA `:root`** (och i de två mörka blocken utan `[data-pal]`), så en
   sida som laddas innan inline-skriptet hunnit köra får rätt palett. Två fällor i just det:
   - De semantiska färgerna (`--green`, `--gold`, `--blue` …) bor i samma block men hör till alla
     paletter — byter standarden palett ska de FÖLJA MED, annars tappar de sex andra sina
     statusfärger.
   - Det som ändrar STRUKTUREN får däremot inte följa med dit. `press` sätter `--r1..--r4` till 0,
     och står de på bara `:root` ärver varje palett utan egna radier nollan — hela appen blir
     fyrkantig för alla. De ligger därför kvar på `:root[data-pal="press"]`, som vinner ändå
     oavsett ordning i filen. Samma sak gäller `instrument`s radier om den någon gång blir standard.
   Ljust och mörkt läge är likvärdiga — designa alltid båda.
   **De 54 hårdkodade `999px` överlever en fyrkantig palett** (chips, flikar, knappar är piller
   oavsett `--r`). Det är avsiktligt i `press`/`instrument` — trycksak med taggar — men räkna inte
   med att `--r: 0` gör hela gränssnittet skarpt.
   Fem ställen känner palettlistan, och en ny palett som glöms på något av dem faller tyst tillbaka
   på standarden: tokensen (tre block – ljust, systemmörkt, uttryckligt mörkt), grenen i `BgTexture`,
   `Pal`-unionen + `PALS` i `ThemeControls`, valideringen i `layout.tsx`:s inline-skript och
   `palette.<id>` i **båda** språkkatalogerna.
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
   **Legendbannern har en glans som vandrar** (`pshine` i globals.css, aug 2026): en smal,
   lutande ljusstrimma var 5,5:e sekund, och kantremsan pulsar med (`pstripe`). **Bara tier 4** —
   guld, grått och negativa **står stilla**, för det gör de i spelet (Kens rättning: första
   försöket lyste guld också). Rör sig allt betyder rörelsen ingenting, och guld är den
   vanligaste bannern i boxen. Tre saker till att inte ändra tillbaka: slingan är mest **paus**;
   banners är **fasförskjutna** per plats i rutnätet (flera som glimmar i takt ser ut som ett
   fel); och **boxens brickor är undantagna** — legend är inte sällsynt i en riktig box (166 av
   Kens 233 brickbanners), och med dem igång gick bildrutan från 5,6 till 15,5 ms, mätt.
   Strimman har **het kärna och halo**, och styrkan är mätt fram: en jämn slöja i samma alfa
   lyfter bannerns medelljus +8,9 mot halons +27,8 — kontrasten mot bannerns egen botten är hela
   frågan, så pröva mot den riktiga bannern, inte mot en tanke om den. Detaljerna om varför
   sveparen ligger i bannerns egen bakgrund och varför `background-position` går från 66 % till
   0 % står i CSS:en.
   Habitat rundar bara hörnen (9 px) — banners är **oförändrade i övrigt och byter inte färg med
   temat**, de ser likadana ut i ljust och mörkt läge precis som i spelet.
   **Hover-rutan (`.ptip`) är däremot gränssnitt, inte spel, och följer temat.** Därför får den
   aldrig låna bannerns färger: `passiveVisual(5).color` är vit och tier 1 nästan vit, och på
   rutans ljusa `--panel` blev "WORLD TREE" osynligt. Nivåetiketten går via `tierToken` i
   `PassiveTip.tsx` — lila/teal/guld/rött ur temats egna tokens, som finns i båda lägena.
   **Samma värd bär varurutan** (`.ptip.itip`, `data-item`, aug 2026). Att det är EN host och
   inte två är ett krav, inte en förenkling: två dokumentlyssnare kan visa två rutor samtidigt,
   och positioneringen — portal till body, tvåstegsmätning, touch-undantaget, scroll i
   capture-läge — är för subtil att ha i två exemplar. Varan har ingen tier, så kategorin tonas
   som en dämpad etikett och lånar aldrig bannerns färgskala.
   **Samma värd bär numera fyra sorter** (aug 2026): passiven, varan, **arten** (`data-species`,
   uppslag på KOD – index flyttar sig när den statiska halvan regenereras) och **individen**
   (`data-pal`). Individen vinner över sin art när båda attributen finns på samma element: bär
   brickan en pal är frågan "vilken av mina är det här?", inte "vad är en Anubis?". Ett element som
   får hover-rutan ska aldrig också ha en `title` – webbläsarens egen ruta lägger sig ovanpå, och
   det var därför `pal.cellTitle` togs bort när boxens brickor fick sin.
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
   **Samma sak händer när ETT element bär flera layoutklasser.** Boxens aktiva filter ligger i
   `class="prows chosen pvactive"`: `.pvactive` sätter flex, men `.prows` – passivbannrarnas
   tvåspaltsrutnät – står LÄNGRE NED i filen med samma specificitet och vann. Varje aktivt filter
   blev därmed en accentfärgad platta över halva sidan i stället för ett chip (aug 2026). Regeln
   är att den som ska vinna skriver ut båda klasserna (`.prows.pvactive`), aldrig att lita på
   ordningen i filen.
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
2. **We read the keys we want and nothing else — early stop is only half of it.**
   `Level.sav` is ~27 MB of whole-world data; we want three keys out of it.
   `properties_until_end` is patched to do two things, and both are load-bearing:
   - **Unwanted top-level keys are stepped over unread** (`_skip_property`). Stopping early
     only ever protected us from keys *after* the last one we want — `InLockerCharacterInstanceIDArray`,
     a Palworld 1.0 `SetProperty` the library cannot parse at all. It gave nothing against a
     key that lands *before* them, and aug 2026 an update did exactly that:
     `LevelObjectRecoverPartySaveData` came in as key **five**, ahead of `ItemContainerSaveData`
     and `CharacterContainerSaveData` (which it pushed from 8 and 10 to **9 and 11** — key
     positions are worth writing in a comment, never in the logic), carrying a map whose
     values are `Int64Property`
     — a type `FArchiveReader.prop_value` doesn't handle. The whole import died with
     "Unknown property value type" over a field we have no use for. Stepping over them is also
     what makes the read fast: `MapObjectSaveData` (12 MB) and `MapObjectSpawnerInStageSaveData`
     (8.6 MB) used to be parsed in full and thrown away. Measured on Ken's save: **1.63 s → 0.45 s**,
     byte-identical output on a pre-update backup the old path could still read.
   - **It still raises once all three are in**, so nothing past the last wanted key is touched.
   `_skip_property` is shared with the `_dps.sav` skimmer and **throws on a type it doesn't know**
   rather than guessing a header length — a miscounted byte here doesn't raise, it yields pals
   with invented numbers. Adding the missing type to the library's `prop_value` would have fixed
   the symptom only; the next unknown type in a field we never asked for would break the import
   again.
3. **Two of the library's rawdata decoders reject 1.0 saves** ("EOF not reached"): `character`
   and `character_container`. We use a tolerant inline replacement for pal RawData and simply
   don't decode container slots (`SlotNum` is a normal property).
4. **Species codes need case-insensitive matching.** The save writes `LazyCatFish` where the
   metadata says `LazyCatfish`, and alphas are `Boss_<species>` (lowercase 's'), not `BOSS_`.
   Unmatched codes are skipped and reported — that is how humans (`Hunter_Rifle`,
   `Believer_CrossBow`, which sit in the same table as pals) get filtered out.
5. Containers are named from the player's `.sav`: `PalStorageContainerId` → Palbox,
   `OtomoCharacterContainerId` → Party, the rest → `Bas/övrigt N` sorted by GUID for stability.
   **Den globala palboxen är inte en av dem** – se punkt 9.
6. **Implantaten i förrådet läses ur `ItemContainerSaveData`, och det är gratis.** Nyckeln ligger
   som **nummer 9**, alltså före `CharacterContainerSaveData` (11) som ändå avslutar inläsningen —
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
8. **Progressionen läses ur spelarens .sav** (`_player_save_data` + `_progress`), som parsas
   HELT med bibliotekets vanliga läsare – den är ~50 kB och har inga trasiga rawdata-typer,
   till skillnad från Level.sav (verifierat mot en riktig 1.0-save 2026-08-11). Nyckelformaten:
   tornflaggor är läsbara namn (`BOSS_BATTLE_NAME_…`), effigies/snabbresor är instans-GUID:n
   som matchar uppströms `relics.json`/`fast_travel_points.json` exakt, fältbossar är
   spawner-id:n som matchar `bosses.json`. 1.0 delade relikerna i typer: den platta flaggkartan
   speglar BARA CapturePower (Lifmunk), resten ligger i `RelicObtainForInstanceFlagByType` –
   unionen är det som exporteras. `RelicPossessNum` är OFÖRBRUKADE, inte hittade – blanda
   aldrig ihop dem. Questarrayerna heter `…_FullRelease` i 1.0 och nakna i äldre saves; ingen
   save bär båda. Varje RecordData-fält är valfritt (färsk spelare = inget alls) och
   `Hidden_*`-quests är spelets triggrar, inte logg. `AppData.progress` följer implantat-
   disciplinen: `undefined` = "vet inte" (utelämnas ur JSON), och fältet **nollas i
   paketeringen** – där är rätt blankning `delete`, inte `{}`, så en färsk installation visar
   "läs in"-hinten i stället för ett tomt påstående.
9. **Den globala palboxen ligger i en egen fil och läses med en egen skimmer** (`_read_dps`).
   Dimensional Pal Storage är världsöverskridande och bor i spelarens `<guid>_dps.sav`, inte i
   Level.sav och inte i någon av världens containrar – verifierat: **noll överlapp i
   instans-GUID** mot Level.sav, så pals därifrån läggs till rakt av utan dedup. Filen hittas
   via spelarfilen vi ändå läste (`_player_save_data` returnerar därför sökvägen), så vi läser
   *den spelarens* lager och inte "första bästa".
   Fyra saker som är valda, inte råkade så:
   - **Den skimmas, och det är en förutsättning.** Lagret är 9 600 slottar som alla ligger
     fullt utskrivna i filen även när de är tomma (`CharacterID` = "None"; 33 använda i Kens
     save) = 73 MB uppackad GVAS. Bibliotekets vanliga läsare klarar filen men bygger ett
     objektträd för allihop: uppmätt **5,7 s och 554 MB mot 1,7 s och 147 MB**. Det här är ett
     paketerat program andra kör.
   - **`_skip_property` måste vara exakt, och kastar hellre än gissar.** `size` täcker bara
     värdet – varje typ har en egen header före det. En okänd typ ger ett fel, för en felräknad
     byte här ger inte ett undantag utan en pal med påhittade siffror. De fält vi *vill* ha
     läses med bibliotekets egen `property()`, så skiptabellen aldrig kan glida isär från hur
     värdena tolkas. Skimningen är verifierad fält för fält mot bibliotekets läsare på en
     riktig save: samma 33 pals, samma värden, samma GUID:n.
   - **Sloten är postens plats i arrayen, inte `SlotId.SlotIndex`.** Det fältet följer med
     palen från där den låg förut och är inte unikt här (två par delade index i Kens save).
   - **Behållaren heter `Global palbox`** och lagret är **förvaring, inte en bas**. Det är
     inte kosmetik: `inBase` i `breedRate.ts` var `c !== "Palbox" && c !== "Party"` och hade
     räknat en Braloha i det globala lagret som utplacerad – alltså lovat en avelstakt boxen
     inte har. Använd `PALBOX`/`PARTY`/`GLOBAL_BOX` och `isStored`/`atBase` i `constants.ts`,
     aldrig strängjämförelser. Expeditionerna är med flit kvar på `=== PALBOX`: manskapet
     hämtas ur världens egen Palbox, och pals i det globala lagret kan inte åka.
   Går filen inte att läsa **fälls inte inläsningen** – världens box är huvudsaken – men det
   rapporteras (`globalBox.error` → `save.globalBoxFailed`). En global box som tyst blev tom
   ser precis ut som en tom, och skillnaden är avelsstammen man lagt undan.

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

**Fyra generatorer i `tools/` skriver filer i `src/lib/data/`, och ingen av dem ligger i bundlen.**
De hämtar allt direkt från GitHub och cachar ingenting i repot:

```bash
node tools/build-drops.mjs       # drops.json   – vem släpper vad (pyPalworldAPI + palworld-kb)
node tools/build-item-icons.mjs  # itemIcons.json + public/icons/items/ (palworld-save-pal)
node tools/build-item-info.mjs   # itemInfo.json – vad varan ÄR: speltext + siffror (pyPalworldAPI)
node tools/build-worldmap.mjs    # worldmap.json + partnerSkills.json + missions.json (paldb m.fl.)
node tools/build-map-image.mjs tree   # public/img/worldtree.webp – syr ihop paldb:s kakel
```

`build-item-info.mjs` skriver **två** filer: `itemInfo.json` och `recipes.json` (tårtorna + det de
kräver, ur `crafting`-tabellen i samma dump). `build-item-icons.mjs` läser `recipes.json` för att
ikonerna till ingredienserna ska följa med – Flour och Wheat fanns i ingen annan namnlista.

`build-map-image.mjs` är den enda som skriver en BILD och den enda som inte behöver köras om
rutinmässigt: kartrenderingen ändras bara när spelet bygger om världen. `main` finns som argument
för det fallet.

**En femte generator står utanför den listan för att den skriver i BUNDLEN, inte i `src/lib/data/`:**

```bash
node tools/build-pair-table.mjs [--dry]   # data/pal-data.base.json → hela `pair`-tabellen
```

Den lagar hålet den statiska halvan ärver uppströms: legendarer som föräldrar (se "Domain gotchas").
**Kör om den varje gång den statiska halvan regenereras** — annars kommer de 12 326 tomma paren
tillbaka utan att något ser trasigt ut. Den fyller bara tomma rutor, kontrollerar sin egen formel
mot källans 33 853 par innan den skriver, och uppdaterar `public/data/pal-data.json`s `pair` också
så en redan inläst box slipper läsas om.

De tre första läser **namnlistorna ur källfilerna med regex** (`RANCH_DROPS`, `ORE_ITEM`,
`FRUIT_NAMES`, `LEGENDARY_SCHEMATICS`). Byter en tabell form matchar regexen ingenting, och det
gav en gång **tyst** noll ranchikoner — bygget gick igenom, bilderna bara saknades. Därför kastar
de nu i stället, och `build-item-info.mjs` har dessutom en **kolumnkontroll** mot ett känt värde
(Assault Rifle = 320 attack, magasin 20): glider kolumnordningen i dumpen får man annars
påhittade siffror, vilket är värre än inga. Kör om `build-item-info.mjs` och
`build-item-icons.mjs` i samma veva som `build-drops.mjs`, och läs deras rapporter — de listar
varje namn som inte fick en rad.

## Paketering – installern för andra datorer

`npm run package` (→ `packaging/build.ps1`) bygger `dist\PalCompanion-Setup.exe`.
Mottagaren kör installationsfilen och startar programmet från Startmenyn: eget fönster utan
adressrad, egen ikon, ingen terminal. **Inget behöver finnas installerat** – Node, save-läsaren
och allt annat ligger i paketet (~184 MB nyttolast, ~70 MB installer).

Delarna: `packaging/Launcher.cs` → `PalCompanion.exe` (kompileras med `csc.exe` ur .NET
Framework, som finns på varje Windows – därför ingen verktygskedja att installera),
Next i `output: "standalone"`, `palsave.exe` (PyInstaller `--onedir`), maskinens egen
`node.exe` (MIT, fri att distribuera) och `packaging/palcompanion.iss` (Inno Setup).
Byggberoenden på **din** maskin: `pip install pyinstaller` + `winget install JRSoftware.InnoSetup`.

Femton saker som är inlärda med möda – ändra inte tillbaka:

1. **`PA_PACKAGE=1` ger både standalone och egen `distDir`.** Paketbygget skriver till
   `.next-package/`, aldrig `.next/`. Det är därför du kan paketera medan dev-servern kör –
   utan det gäller varningen under "Commands" i skarpt läge.
2. **`--user-data-dir` på Edge är obligatorisk, inte kosmetik.** Utan egen profil lämnar
   `msedge.exe` över till den Edge användaren redan har öppen och avslutar direkt. Launchern
   tolkar det som "fönstret stängdes" och dödar servern i samma sekund som den startat.
3. **Job Object med `KILL_ON_JOB_CLOSE`** är enda garantin att `node.exe` följer med i graven
   när launchern dödas i Aktivitetshanteraren. Annars ligger en osynlig server kvar till omstart.
   Priset är att **allt servern startar också ligger i jobbet** och dör med det — det var därför
   den första självuppdateringen aldrig fungerade. Se punkt 5 under "Utgåvor och
   självuppdatering" innan du låter en rutt starta något som ska överleva appen.
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
8. **Boxen töms** ur `pal-data.json` (`pals`/`player`/`exported`/`implants`/`progress`), den
   statiska halvan följer med. `implants` kommer ur savens item-behållare och `progress` ur
   spelarens .sav – lika personligt som boxen — **allt nytt fält i `AppData` som kommer ur
   saven ska nollas här i samma andetag**, och `package.yml` har en spärr som vägrar publicera
   en nyttolast som bär det. Blankningen är olika med flit: `implants = {}` ("du äger inga" är
   sant i en färsk installation) men `delete progress` (`undefined` = "inget inläst" → kart-
   och uppdragssidorna visar sin "läs in"-hint i stället för ett tomt påstående).
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
    ser launchern inget PalCompanion-fönster alls, `WaitForShutdown` tolkar det som att
    användaren stängt programmet och dödar servern 1,2 s senare. Symptomet är en app som
    stänger sig själv strax efter start, utan felmeddelande, "ibland". `AppWindowExists` går
    därför igenom **alla** synliga toppnivåfönster och kräver att fönstret tillhör en
    msedge-process (annars håller Utforskarens "PalCompanion"-fönster servern vid liv).
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
15. **Installationsmappen OCH Startmenygruppen är låsta** (`UsePreviousAppDir=no` +
    `UsePreviousGroup=no` + `DisableDirPage=yes`), och det är namnbytets skuld.
    **Båda `UsePrevious*` måste stängas av, inte bara den ena** – de läser samma registerpost, och
    3.0.0 släpptes med bara mappen avstängd. Följden gick inte att gissa: `[InstallDelete]` tog
    mycket riktigt bort den gamla gruppen, men `{group}` löstes fortfarande till `PalAssistent`, så
    `[Icons]` skapade mappen igen och la `PalCompanion.lnk` i den. Städning kan aldrig hinna före
    ikonerna – den ligger före dem i körordningen. Loggen (`/LOG=` i uppdateringsskriptet) sa det
    rakt ut, och den är enda stället det syns: på disken ser det bara ut som att städningen
    misslyckades.
    Mappen är därmed låst till `{localappdata}\Programs\PalCompanion`, och det är inte kosmetik:
    programmet hette **PalAssistent** till och med 2.6.0, och 2.6.0:s uppdateringsskript – som redan ligger ute hos
    alla som ska hämta 3.0.0 – startar om programmet på **exakt den sökvägen** när den det kom
    ifrån är borta. Ärvde Inno den gamla mappen skulle 3.0.0 landa som `PalCompanion.exe` i en mapp
    som heter `PalAssistent`, och reserven pekade på ingenting: *uppdateringen lyckas och
    ingenting startar igen*. `AppId` är oförändrat (punkt 9 i utgåvedelen), så Windows uppgraderar
    i stället för att lägga en andra installation vid sidan om, och `[InstallDelete]` städar bort
    den gamla mappen, Startmenygruppen och skrivbordsgenvägen. Ta inte bort de raderna förrän
    Den gamla **statmappen** (`%LOCALAPPDATA%\PalAssistent`, ~1 GB Edge-profil) städas däremot av
    **launchern** vid start (`DropOldState`) och inte av installern: när 2.6.0 uppdaterar sig kör
    både installern och uppdateringsskriptet *ur* den mappen, och Inno läser sin nyttolast ur
    originalfilen hela installationen igenom. En `[InstallDelete]` där river undan mattan för sig
    själv. Ta inte bort de raderna förrän
    ingen kör 2.x längre – och skriv aldrig in en absolut sökväg någon annanstans i kedjan; att
    just den här finns i ett redan utgivet skript är hela problemet.

Installern är **osignerad**, så SmartScreen säger "Windows skyddade din dator" första gången.
Det står i `packaging/README.txt`; ett certifikat kostar tusenlappar per år och en hårdvarutoken.

## Utgåvor och självuppdatering

Projektet är publikt på GitHub och installern distribueras som en **utgåva**. En ny version:

```bash
npm version minor        # enda stället versionen står
git push --follow-tags   # .github/workflows/release.yml tar över
```

Workflowen bygger på `windows-latest`, kör typecheck + test, bygger paketet och publicerar
`PalCompanion-Setup.exe` + `SHA256SUMS.txt`. **Båda filnamnen är stabila med flit** – hela
poängen är att `…/releases/latest/download/PalCompanion-Setup.exe` alltid ska peka på den
senaste. Versionen syns i installerarens egenskaper, inte i filnamnet.

**Värdena bakas in vid bygget** via `env` i `next.config.ts` och finns därmed som vanliga
strängar i den byggda appen: `PA_VERSION` (ur package.json) och `PA_REPO` (sätts av workflowen
till `github.repository`). `PA_REPO` är strömbrytaren
för hela uppdateringsfunktionen – ett bygge från källkoden har den tom och erbjuder därför aldrig
en uppdatering. Det är avsiktligt: ingen ska få en ruta som vill installera över sin arbetskopia.

**Repot bytte namn med 3.0.0** (`Pal-Assistent` → `PalCompanion`), och att den övergången
fungerade hänger på tre saker som redan låg i 2.6.0 – kolla dem innan du någonsin byter namn på
repot igen: `PA_REPO` är inbakad i varje utgivet bygge, så en 2.6.0-app frågar fortfarande efter
**det gamla sökvägsnamnet** och räddas bara av att GitHub svarar 301 på det omdöpta repot (bevara
därför alltid omdirigeringen – skapa inte ett nytt tomt repo på det gamla namnet); 2.6.0:s
`INSTALLER_ASSET_NAMES` innehöll `PalCompanion-Setup.exe` **först**, så den känner igen tillgången;
och dess `trustedRepos` godtog efterföljaren under **samma ägare**. Alla tre är
övergångsstöttor för de byggen som redan är ute — 3.0.0 självt litar bara på sitt eget `PA_REPO`
och sitt eget tillgångsnamn, och det är rätt läge att stå i. Byts namnet igen är det den **då**
utgivna versionen som måste förberedas, en utgåva i förväg.

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
   URL-kontrollen (`isTrustedAssetUrl` i `src/lib/update.ts`) jämför den **tolkade** adressen och
   inte strängen, och det är inte pedanteri: en `startsWith` på prefixet släpper igenom
   `.../releases/download/../../nagon-annan`, eftersom `fetch` normaliserar bort `..` medan
   strängjämförelsen inte gör det — och `https://github.com@ond.se/...` har värden `ond.se`.
   Rutten sitter dessutom bakom ursprungskontrollen (se `src/middleware.ts` under Architecture);
   utan den kunde vilken webbsida som helst utlösa en installation med en tom POST.
5. **Bytet görs av ett skript, och skriptet startas av launchern — aldrig av servern.** Installern
   måste stänga appen för att skriva över dess filer, och en process kan inte vänta in sin egen
   död, så ett litet `.cmd` gör jobbet. Men *vem* som startar det är hela skillnaden mellan en
   uppdatering som fungerar och en som inte gör det: `node.exe` ligger i job-objektet (punkt 3
   under Paketering), **allt node startar ärver medlemskapet** — `detached` hjälper inte, ett
   jobb följer med barnen — och när launchern släpper handtaget dödar `KILL_ON_JOB_CLOSE` hela
   släktet, inklusive en installer mitt i installationen. Symptomet är precis det man inte gissar
   på: *appen stängs, ingenting installeras, och nästa start är samma version.* Så här hänger det
   ihop nu, och ingen del av kedjan är valfri:
   - Rutten laddar ner, kontrollsummerar och lägger installern + `uppdatera.cmd` i mappen
     **launchern pekat ut** med `PA_UPDATE_DIR` (`%LOCALAPPDATA%\PalCompanion\update\`).
     **Skriptet skrivs sist** — det är dess existens launchern går på. Sedan svarar den och
     avslutar sig efter 1,5 s. Den startar ingenting.
     Rutten räknar med flit *inte* ut sökvägen själv, och det är inte bara för att slippa två
     ställen som kan glida isär: `next build` spårar filer statiskt inför standalone-bygget, och
     en sökväg som går att räkna ut vid byggtid försöker den **läsa in på byggmaskinen**. En
     `process.env.LOCALAPPDATA ?? homedir()` i rutten fällde hela paketbygget på CI med
     `EPERM ... scandir 'C:\Users\runneradmin\AppData\Local\Application Data'` — grönt lokalt,
     rött bara i utgåvan, och felet såg ut att handla om Next. Bygg inte sökvägar ur miljön i
     kod som Next spårar.
   - Launchern kör `RunPendingUpdate` allra sist, när servern är död, fönstret stängt och
     job-handtaget släppt. Launchern är själv inte medlem i jobbet, så det den startar går fritt.
     Den kör bara ett skript som är **nyare än launcherns egen starttid**; ett äldre är en rest
     från en avbruten uppdatering och raderas i stället för att köras vid nästa vanliga avslut.
   - Skriptet (`updateScript` i `src/lib/update.ts`, testat) väntar tills `PalCompanion.exe`
     verkligen är borta, kör installern tyst, startar programmet igen och raderar sin egen mapp.
     Två fällor i den texten, båda tysta: **`timeout` går inte att använda** — den kräver en
     konsol och avslutar direkt med "Input redirection is not supported" när stdin är
     omdirigerad, vilket den alltid är här, så väntan blev noll sekunder. Och **ingen sökväg får
     stå i skriptet**: en `.cmd` läses i datorns OEM-teckentabell, så ett användarnamn med å, ä
     eller ö hade gett en annan sökväg. Allt kommer från `%~dp0` och `%PA_APP_EXE%`, som
     launchern sätter som miljövariabel — Unicode hela vägen. Att skriptet därmed är identiskt
     för alla är också det som gör det testbart.
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
i `NOTICE` tillsammans med attributionen för palworld-save-tools, palworld-save-pal,
PalworldSaveTools, pyPalworldAPI, palworld-kb, paldb.cc, zao/ooz, Node och typsnitten. **Lägg
till nya beroenden där** – och i README:s tabell, som är samma lista för den som läser på GitHub.

Tre saker om licensfilerna som är valda, inte råkade så:

1. **`LICENSE` är AGPL-texten och ingenting annat.** Attributionen låg först där, men GitHub
   känner igen licensen genom att jämföra hela filen — ett tillägg på ett par tusen tecken gör
   att repot slutar visa "AGPL-3.0" och blir "Other". Därför en egen `NOTICE`.
2. **Båda följer med i installern** (`build.ps1` → `LICENSE.txt` + `NOTICE.txt` i programmappen).
   AGPL § 4 säger att licenstexten ska följa med programmet, och installern är den enda form de
   flesta mottagare någonsin ser — repot de aldrig besöker kan inte göra det jobbet. Bygget
   **kastar** om någon av filerna saknas; ett tyst bortfall här märks först när någon frågar.
3. **`packaging/README.txt` pekar ut dem** och säger vilken licens programmet har. Den låg
   tidigare bara på vad som ingick, inte på vilka villkor som gällde.

## Domain gotchas

- **En legendar kan paras med VAD SOM HELST — man kan bara inte FÅ en legendar ur ägget** om inte
  båda föräldrarna är den arten. Här stod den omvända regeln ("legendaries only breed with their own
  species") ända till aug 2026, och den var inte bara fel i texten: `pair`-tabellen saknade **12 326
  par**, alltså varje parning med en legendar som förälder, och gränssnittet förklarade tomrummet med
  en regel som inte finns. Kens fråga var "det här är väl fel?" och svaret var ja.
  Felet kom uppströms. `pal_info.ignore_combi` i palworld-save-pals `breeding.json` betyder **"kan
  inte bli resultatet av en parning"** — den säger ingenting om att vara förälder — men deras
  `child_to_parents_formula` räknar aldrig upp en sådan art som förälder, och vår tabell ärvde
  hålet. `tools/build-pair-table.mjs` fyller igen det med spelets egen rangformel; läs filhuvudet
  innan du rör den, och `tests/pairTable.test.ts` håller båda riktningarna (legendaren har 299
  partners, och ingen legendar kommer ur ett par som inte är två av dess egen art).
  Fyra saker att inte ändra tillbaka:
  1. **Tie-breaken är uppmätt, inte gissad.** Vid lika avstånd till målrangen vinner den HÖGRE
     rangen — det är den enda varianten som reproducerar källans egna 33 853 formelpar utan ett
     enda fel. Skriptet kör om den kontrollen vid varje bygge och stannar hellre än skriver.
  2. **Formel-poolen är 183 arter, och elementvarianterna hör inte dit.** Rayhound Cryst, Elphidran
     Aqua och de andra går bara att få ur unika kombos. De ligger tätt packade kring rang 1570–1650
     mitt i spannet, så hade de hört till poolen skulle de ha vunnit hundratals av källans rader.
     De vinner noll — det är beviset, inte en åsikt.
  3. **Fem arter har `combi_rank: 9999`**, vilket är ett saknat värde och inte en rang: Dragostrophe,
     Boltmane och de tre `Unidentified Pal`. De lämnas utan barn (1 505 par). Med det talet blir
     målrangen ~5 000, alltså alltid poolens högsta art — ett räknefel förklätt till ett svar.
     Att 304 − 5 = 299 är exakt antalet arter palbreeder.com:s egen 1.0-kalkylator räknar med är
     kvittot på att gränsen ligger rätt.
  4. **Unika kombos vinner över formeln.** Frostallion + Helzephyr ger Frostallion Noct, inte
     Wumpo Botan. Skriptet fyller bara tomma rutor och rör aldrig en befintlig rad.
  `passivePlan` flaggar fortfarande omöjliga steg, men "omöjlig" betyder numera bara de fem utan
  rang — inte en legendar. Texterna som påstod det gamla (`pp.cantBreedLead`, `pp.impossiblePair`,
  `manres.noChildBody`, `find.combo.note`) är omskrivna; skriv inte tillbaka dem.
- **Savens tornflaggor är döpta efter PALEN, inte tornen** (`QUEST_BOSSES.flag` i `quests.ts`,
  verifierat mot en riktig save + spelets GYM-l10n): `GrassBoss` = Zoe & Grizzbolt (gräs-
  markerna), `ForestBoss` = Lily & Lyleen, `ElectricBoss` = Axel & Orserk (Orserk är elektrisk),
  `SorajimaBoss` = Auri & Shaolong (jap. "sorajima" = himmelö). "Rätta" aldrig mappningen till
  den logiska – då bockas fel torn av. 1.0 har 13 flaggor: åtta torn + tre
  `WorldTreeMiddleBoss` + `WorldTreeBoss` + `KingWhaleBoss` (Panthalus).
- **Världsträdet är en EGEN spelkarta, inte ett lager på huvudkartan** (aug 2026). Kartorna delar
  koordinatsystem – samma UE-transform, samma siffror i spelets koordinatfält – men har varsin
  bildram, så en trädpunkt på huvudkartans bild hamnar utanför bilden och inte "lite fel". Det var
  därför generatorn förut filtrerade bort dem, och därmed fanns trädet inte i appen alls.
  Fem saker att inte ändra tillbaka:
  1. **Ramarna HÄRLEDS** ur respektive paldb-lasts `config.landScapeRealPosition` (`frameOf` i
     generatorn), inte ur avlästa siffror. `assertFrame` håller huvudkartans ram mot de
     dokumenterade talen, så en flyttad ram stannar bygget i stället för att tyst slänga markörer.
  2. **Uppströmskällorna är världsomspännande** – `relics.json`, `fast_travel_points.json` och
     `bosses.json` bär BÅDA kartornas punkter, nycklade på instans-GUID. De delas med `splitByMap`,
     som **kastar** på en punkt som hamnar i två ramar eller ingen. Att varenda punkt landar i
     exakt en ram är det som gör delningen trovärdig; ett filter hade bara tigit ihjäl resten.
  3. **Räknarna räknar VÄRLDEN.** `progressSummary` summerar båda kartorna (effigies 155, snabbresor
     174, alfabossar 90) medan kartsidan delar upp dem. Räknades bara huvudkartan blev savens egna
     fynd i trädet osynliga – på Kens save fyra snabbresor och en alfaboss som var klara och stod
     som oklara.
  4. **Bara trädets SLUTBOSS går att pricka av.** `WorldTreeBoss` = Zenara & Astralym står i klartext
     i markören, men mellanbossarnas flaggor (`WorldTreeMiddleBoss1..3`) går inte att para ihop med
     rätt boss ur någon källa – de bär `flag: null` och lagret har ingen räknare alls. "0/4" hade
     påstått att alla fyra följs. Antalet klarade står på Uppdrag, ur saven.
  5b. **`worldmap.json` bytte FORM till `{ main, tree }`, och två generatorer läser den.**
     `build-item-info.mjs` och `build-item-icons.mjs` hämtar ruinernas schematics-namn därifrån och
     såg en tom lista efter omläggningen – bygget stannade på deras egen spärr, vilket är precis
     vad spärren finns för. Båda läser numera `worldmap.main?.ruins ?? worldmap.ruins`. Ändrar du
     formen igen: sök upp läsarna först, och lita på att en tyst tom lista annars hade gett noll
     ikoner utan att något såg fel ut.
  5. **Bilden är kaklad från paldb** med `tools/build-map-image.mjs` (z4 = 16×16 × 512 px = 8192²,
     referer krävs annars 403). Den hämtas EN gång och checkas in; appen laddar aldrig något från
     paldb vid körning, och trädets bild hämtas först när kartan valts.
  Fiskeplatserna är trädets (77 st) – huvudkartans 379 + 90 finns i samma källa men är **inte**
  byggda ännu, och `find.gaps` säger fortfarande att fiskeplatser saknas. Det är nästa steg, inte
  ett bortfall någon får glömma.
- **Kartans värld är 1.0:s, och bara 1.0:s.** 1.0 byggde om världen: FPA-tornet flyttade, ett
  åttonde torn tillkom, effigies omfördelades (140 Lifmunk på huvudkartan – talet är
  korsvaliderat mellan paldb och relics.json) och predator-spawns togs bort (bygg aldrig det
  lagret). Datera varje ny kartkälla; allt före ~mitten av 2026 är delvis fel. Positionerna är
  UE-cm i källorna och räknas om med `x = (UE_Y − 158000)/459` (delaren är exakt 459) – bild-
  projektionens konstanter i `worldmap.ts` är HÄRLEDDA ur paldb:s bildram, inte kalibrerade på
  ögonmått, och `tests/worldmap.test.ts` håller dem mot tornens kända koordinater.
- **Zenara & Astralym och Moon Lord är ELEMENTLÖSA** (`typeless` i `quests.ts`/`questsData.ts`):
  det finns ingen svaghet att räkna motlag på, och domen blir aldrig REDO – "nivå & utrustning
  avgör" är svaret. Astralym är dessutom **oskaffbar** (slutboss, `UNOBTAINABLE_CODES` i
  `partnerSkills.ts`) och får aldrig rekommenderas i rankningar – den toppade attacklistan med
  ett omöjligt FÅNGA. Samma ärlighet i FÅNGA-taggarna: `catchInfo` (worldmap.ts) säger ALFABOSS
  Lv X eller RAID-ÄGG när det är sanningen.
- **Partnerskills finns nu i appen** (`src/lib/partnerSkills.ts` ← `data/partnerSkills.json`,
  genereras av tools/build-worldmap.mjs ur paldb-skrapet; 298 arter, luckor: Dragostrophe,
  Boltmane, Astralym). Texten är Pocketpairs engelska speltext – översätts aldrig, precis som
  passivnamn. Rankningarna använder den som MOTIVERING (chip/beskrivning), aldrig som poäng:
  effekterna är villkorade prosa, och att vika in dem i en siffra vore att gissa.
  `partnerMeta.ts` bär de kurerade urvalen (stöd/försvar), `questsData.ts` raider + hard-torn,
  `expedition.ts` sajterna + ≈FP-formeln (communityuppmätt, märks ≈), `recoData.ts` slaktraderna,
  `souls.ts` själsschemat (wiki-verifierat: rank 1–10 = 10 S + 6 M + 6 L per stat, 11–20 = 30 G).
- **Rekommendationerna delar EN bild av vad en pal är till** (`bookings.ts`, helhetsutredningen aug
  2026). Appen hade två halvor som inte visste om varandra: planeraren pekade ut individer man ska
  använda och Rollerna listade samma individer som mat. Mätt mot Kens box låg **sex av elva** pals
  planen behövde i matlistorna, en av dem under domen "nu", och en av dem (`Skutlass 31/100/11`) stod
  som **steg 1 i planen på skärmen**. `planBookings` bygger om samma planer gränssnittet visar och
  svarar vilka pal-id de rör, med rollen (`carrier`/`donor`/`parent`/`partner`). Fyra saker att inte
  ändra tillbaka:
  1. **Bokningen sparas aldrig till disk.** Den räknas om ur boxen varje gång – planen ändras när
     saven ändras, och en sparad lista blir fel i tysthet.
  2. **Rollen följer med, inte bara id:t.** En spärr utan skäl misstänker man; "planen använder den
     som IV-donator i steg 1" accepterar man. `condense.noteBooked` säger antalet på raden.
  3. **Bokning är inte `keep`.** `p.keep` är boxens tillstånd och överlever sidbyten; en bokning
     gäller den målbild som är satt just nu. Därför filtreras `fodder` på bokningen i `planCondense`
     i stället för att mutera `keep` – annars ändras spara-listan när man byter mål.
  4. **En bokning får sänka domen.** Räcker dubbletterna inte längre när en är bokad ska kön säga
     "snart", inte föreslå matning ändå.
- **En 100:a i en stat är en byggsten, inte ett halvt misslyckande** (`pickIvCarriers` i
  `scoring.ts`). Reglerna mätte snittet (`ivSum ≥ 240/270`) eller alla tre på 100, så
  `Warsect 15/100/100` – den 2-i-1-donator `planIvImports` själv rekommenderar – räknades som mat.
  IV ärvs **per stat och oberoende**, så en enda 100:a är precis det planeraren bär in. Taket är
  `IV_CARRIER_CAP` (2 per art och stat, renast först och helst ett av varje kön), samma disciplin som
  passivbärarna: utan tak växer "spara" tills boxen aldrig krymper.
- **Kön rankar VÄRDE inom domen, inte stjärnvinst** (`valueOf` i `condense.ts`). Prioriteten är
  vad arten används till (`palUses` – som fanns men bara ritades) × vad stjärnorna ger i riktiga
  stats (`displayStats` före/efter) ÷ vad det kostar i pals. Noll = ingen roll i boxen, och det står
  i klartext på raden (`condense.whyNoRole`). Domen (`now`/`soon`/`hold`/`max`) sorteras fortfarande
  först: det man kan göra i dag ska ligga överst.
- **Artens bästa väljs på passform, inte på `score`** (`bestOfSpecies` i `scoring.ts`). `score`
  belönar höga tiers även när passiven är skräp, så för Kens Digtoise valde den 79/74/21 med fyra
  passiver framför 86/44/83 med två – och keeperen är den pal man matar 48 andra in i. Ordningen är
  `fittingGold` → IV → renhet → redan bankade stjärnor → `score` → id (stabilt mellan inläsningar).
  `PalDataContext` använder den, så `keep.bestOfSpecies`, Boxens "bästa exemplar" och
  kondenseringens keeper är samma pal.
- **Kondenseringens fed-star-kredit** (`fodderValue` i scoring.ts): en stjärnad dubblett räknas
  som 1 + sin kumulativa kostnad (1★ = 5 offer) – 1.0-regeln enligt wikin. planCondense räknar i
  VÄRDE men redovisar antal PALS, och matar högst värde först.
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
     IV-möda måste göras med exemplar av arten man faktiskt vill ha. Undantagen är
     `findIvDonors`, som föreslår donatorer vars art parar *tillbaka* till målarten, och
     **importerade löv** (nedan).
- **IV-målet har TRE lägen, och tröskeln är en parameter – inte tre kodvägar** (`ivTargetOf` i
  `ivPlan.ts`, aug 2026). `fast` (bästa snittet, jagar inga tröskelvärden), `near` (**90+**, alltså
  inom en frukt) och `perfect` (100/100/100). Tredje läget finns för att `perfect` ska få fortsätta
  betyda perfekt: *"så att vi håller läget perfekt faktiskt på riktigt"* (Kens ord). Tre saker att
  hålla reda på:
  1. **Tröskeln byter bara vad som räknas som uppnått och omslumpningens lott** – `(101 − t)/101`.
     100 träffas i 1 fall av 101 (0,40 %), 90 i 11 (4,36 %): elva gånger så ofta, och det är hela
     skillnaden i pris. Samma sökning, samma modell, en parameter.
  2. **Den ska tråcklas hela vägen ned**: `statOdds`/`statOddsFromHas`, `planPerfectIv`,
     `planPerfectLine`, `planIvImports` och `findIvDonors` tar alla emot den. En hårdkodad 100:a
     kvar någonstans ger en plan som säger 90+ men räknar på 100 – det hände i donatorfiltret och
     fångades av testet "importen använder samma tröskel som planen".
  3. **Gränssnittet får inte ljuga om nivån**: stegen skriver "HP + Attack 90+", korten "25 med
     90+", målbilden 90+ per stat, och summeringen har en **fruktsvans** ("sedan 3 frukter, högst en
     per stat") – annars ser nära-läget billigare ut än det är.
- **En 100:a KÖPS, den avlas inte fram** (`ivFruits.ts`, utredningen aug 2026). Palworld 1.0 har
  tre frukter som permanent höjer en pals IV: **Life** (HP), **Power** (Attack) och **Stout**
  (Defense), **+10 var med tak 100**. Kens Lux ♀ 100/25/66 bär redan alla fyra önskade passiver och
  är **12 frukter** från målbilden – planeraren räknade 239 ägg för samma resultat. Avel är för det
  frukterna inte kan ge: passiver och art. Fyra saker att inte ändra tillbaka:
  1. **Antal frukter, aldrig "gratis".** De kostar endgame-material (Power Lotus (L) ur raider och
     Cherry Blossom-dungeons) eller valuta hos tre handlare (200 Dog Coins / 100 Battle Tickets /
     25 Successful Bounty Tokens per frukt). Appen säger siffran och låter spelaren värdera den.
  2. **Fruktade IV ärvs som vanligt** (30/30/40), så frukter *ersätter* inte `perfectPlan` – de
     skaffar dess byggstenar. Två uppmatade föräldrar ger ≈21,6 % perfekt unge, samma tal modellen
     redan räknar.
  3. **Namnen är spelets och står på engelska**, som artnamn och passivnamn.
  4. Källorna är community-dokumenterade (wikin + game8 + 1.0-guider), inte datamined – märk
     siffrorna som uppskattningar, precis som oddsen.
  Det som fortfarande INTE är gjort: planeraren väljer individ på ägg, inte på ägg **plus** frukter,
  och IV-panelen visar inte frukträkningen. Utredningen (aug 2026) föreslår båda.
- **En saknad 100:a BÄRS IN, den slumpas inte fram** (`ivImport.ts`, aug 2026). Punkt 1 ovan är
  sann men var i praktiken hela kostnaden: `statOddsFromHas(false, false)` = 0,4/101 ≈ 0,4 % per
  ägg, alltså **≈253 ägg** för en enda stat. Kens fall: ingen av hans 61 Helzephyr Lux hade 100 i
  Attack, och planen blev 7 steg och ~524 ägg — *"rörig och lång samt dåligt optimerad"*, och han
  hade rätt. Elva andra pals i boxen HADE 100 i Attack, flera två artsteg bort med **noll
  passiver**. Genom artkedjan ärvs 100:an med `statOddsFromHas(true, false)` ≈ 30,4 %, alltså 3,29
  ägg per steg: 2 × 3,29 = 6,6 ägg mot 253, **38× billigare**, och planen gick till 4 steg och ~239
  ägg. `planIvImports` räknar fram vägarna, `planPerfectLine` tar emot dem som extra **löv** — en
  individ av målarten med EN 100:a som kostade några ägg att skaffa — och sökningen väljer själv om
  de är värda det. Fem saker att inte ändra tillbaka:
  1. **Importen är en riktig artkedja**, inte en genväg: föräldrarnas art avgör ungens art, så
     kedjan går hela vägen fram till målarten (`solveChain`, ägda partnerarter).
  2. **Priset räknas per steg, med partnerns 100:or inräknade.** Bär partnern man parar med också
     statens 100 blir oddsen 60,4 % i stället för 30,4 % – hälften så många ägg för steget. Det var
     Kens fråga *"varför tar vi inte inräkningen av dom 100/100/100 på andra pals som vi har?"*:
     100:orna hos pals man parar MED räknades inte, och priset var "steg × 3,29". Rankningen går
     därför på **ägg**, inte antal steg (tre billiga steg kan slå två dyra), och `bestPartner`
     väljer den individ som bär flest av statarna före den renaste. Kedjan *söks* fortfarande på
     färst steg – att göra sökningen partnermedveten vore hundratals Dijkstra i en memo som körs
     vid varje passivbyte, och bärande partners är sällsynta. Donatorer söks i **hela** boxen,
     globala palboxen inkluderad (där ligger Kens fem bästa IV-pals), och behållaren står på
     kortet: annars vet man inte var man hämtar palen. Donatorns skräp hamnar i första stegets
     pool, och en ren donator är hela poängen – ett förslag per art och stat-uppsättning, och taket
     räknas per sort så att en 2-i-1 inte trängs ut av billigare enstats-vägar.
  2b. **Alla tre statarna erbjuds, inte bara luckorna** (Kens rättning ×2: *"ganska säker på att jag
     har perfekt defense pals i basen men den kommer inte upp"*). Hans enda Lux med 100 i Defense
     bär tre skräp-passiver, alltså en dyr förälder – en ren importerad kan vara billigare fast
     arten "har" staten. En import kostar ägg och en ägd pal är gratis, så sökningen tar den bara
     när den lönar sig: att erbjuda den kan inte göra planen sämre, att inte erbjuda den var fel.
  2c. **En donator kan bära flera 100:or** (`stats` är en lista). `Warsect ♂ 15/100/100` ger Attack
     och Defense i EN import, men varje steg måste behålla båda – priset är `odds^antal` per ägg,
     alltså 21,6 ägg i stället för 6,6. Dyrare per import, men sparar en hel merge längre fram, så
     både 2-i-1 och en per stat läggs fram och sökningen väljer.
  3. **Kostnaden är IV:ns, inte passivernas.** Mellanungar antas rena, samma antagande som resten
     av planeraren. Det gör importen något optimistisk om partnerarterna är smutsiga, och därför
     står donatorns skräp i `donorJunk` och gränssnittet säger "välj rena partners".
  4. **Importen räknas EN gång per individ i totalen** (`plan.imports`), för föräldrar förbrukas
     inte – men sökningen betalar per användning. Den överskattar alltså hellre än att välja en
     plan som ser billig ut bara för att den återanvänder importen.
  5. **`ivImport` importerar `statOddsFromHas` ur `perfectPlan`, och `perfectPlan` bara TYPEN ur
     `ivImport`.** En typimport försvinner vid kompilering, så cirkeln finns aldrig i körningen.
     Gör man den till en värdeimport får man en cykel som bryter i bundlern, inte i tsc.
  Rutan för en lucka får inte längre säga "måste slumpas fram" när en import finns – det var 253
  ägg mot 6,6, alltså inte en nyansskillnad.
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
  Med flikarna gäller samma disciplin **per led**: varje flik valideras för sig, och djuplänken
  landar i den flik som ligger framme – den är en fråga man ställer nu, inte en ny post i ett
  register, och en flik per besök från Rollerna hade blivit något man får städa. Boken tolkas
  aldrig rekursivt: en handredigerad led som själv innehåller `tabs` blir tomma val
  (`parseFlatPrefs` är det som körs per led, inte den yttre `parseBreedingPrefs`).
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
  Sökningen väljer inte om vilka bärare som ska användas — men **bärarvalet ovanför prövas numera
  i ägg** (se nedan). Uppsättningar som varken är greedy-minimala eller landar rakt på målet är
  fortfarande vad `altRoutes.ts` letar efter, som ett tillägg under planen.
- **Ett par vars unge ÄR målarten slår ihop fas 1 och fas 2** (`directPair.ts`, aug 2026). Set
  covern minimerar **antal bärare** och körs före både merge-trädet och artkedjan, så en ensam
  bärare av allt slog alltid två bärare — även när de två gjorde hela jobbet i en parning. Kens
  fall: mål Helzephyr Lux, en Digtoise bar alla fyra själv och låg två artsteg bort (20 ägg), medan
  Helzephyr ♀ + Beakon ♂ bar samma fyra och ger Helzephyr Lux direkt (10 ägg, ett steg). Nu byggs
  flera **kandidatuppsättningar** — den greedy-minimala plus de par `findDirectPairs` hittar — och
  var och en prövas mot HELA planens äggkostnad, samma princip som `ROOT_CANDIDATES`. Mätt mot Kens
  box (60 planer): billigare i 4 fall, aldrig dyrare, och ett fall som förut var en återvändsgränd
  (omöjlig parning + olösbar artkedja) fick en riktig väg. Tiden är oförändrad (~40 ms i snitt) —
  ett par som landar på målet behöver ingen Dijkstra alls. Fyra saker att inte ändra tillbaka:
  1. **Uppräkningen kräver att BÅDA föräldrarna bidrar med något den andra saknar.** Täcker den
     ena redan allt är paret bara "ensam bärare + partner av en art som ger målet", och det är
     precis vad fas 2:s första steg redan är.
  2. **Könsstyrda kombos kontrolleras mot individernas kön**, inte mot artparet. `childrenOf`
     svarar på vad *arterna* kan ge; att påstå att en parning ger målarten när spelets könsregel
     säger annat är värre än att missa ett förslag, så `givesTarget` svarar nej i stället.
  3. **Manuellt läge vinner.** En kandidatuppsättning måste innehålla den utpekade palen, annars
     svarar planen på en annan fråga än den som ställdes. Paret finns kvar under planen.
  4. **Ordningen i `covers` är tiebreak, och den greedy-minimala står först** — lika många ägg med
     färre bärare är färre pals att hålla reda på. En uppsättning vars artkedja inte gick att lösa
     rankas sist: en billig plan som inte når målet är ingen plan.
  Två saker till som hänger på samma uppräkning, båda ur Kens rättningar:
  - **"Avla en till" är ett eget läge** (`opts.breedAnother` i `buildPassivePlan`). Bär en pal
    redan alla önskade passiver OCH är målarten kostar planen noll ägg — rätt svar på frågan som
    ställs, men då finns ingen led att titta på, och vägen dit är ofta det man kom för. I läget
    räknas den palen som **förälder** i stället för som svar: uppsättningar utan en enda parning
    läggs undan, och `allowSubset` släpper kravet att båda föräldrarna bidrar med något den andra
    saknar. Första försöket lämnade i stället ut de färdiga palsen ur boxen, och då föreslog
    planen en omväg via två andra arter fast paret stod i lådan — *"då borde parenten vara parents
    med dom passiva"*. Flaggan får aldrig göra planen tom: finns ingen parning står den gratis
    uppsättningen kvar.
  - **Lika många ägg bryts på MÅLARTEN.** Både `findDirectPairs` och vinnarvalet i
    `buildPassivePlan` föredrar föräldrar som redan är målarten. Det är ingen oddsvinst utan en
    praktisk — paret är linjen man bygger, ungen kan paras direkt med båda föräldrarna, och nästa
    försök kräver inte att två andra arter står kvar i boxen. Utan regeln avgjorde
    uppsättningsordningen (greedy först), och en omväg via två andra arter kunde slå de två av
    målarten man redan hade. Regeln gäller bara vid **exakt lika** totalkostnad, så den kan aldrig
    göra en plan dyrare.
  Samma uppräkning täpper till hålet i `altRoutes`: den grupperade boxen på art och parade bara
  ihop pals ur **samma** artlista, så korsartade par kunde aldrig hittas — det var inte ett filter
  som sållade bort dem, utan en uppräkning som aldrig såg dem. Därför tar `AltRouteBlock` numera
  varje förälders **egen** art i porträttet.
- **Planen börjar där du STÅR, inte där set-covern råkar peka** (`COVER_LIMIT` i `passivePlan.ts`,
  aug 2026). Set-covern väljer bärare på täckning, renhet och IV – aldrig på hur långt bäraren har
  kvar till målarten. Bär flera arter alla önskade passiver blev startarten därför densamma varje
  gång, och en led man redan börjat gå såg oförändrad ut: kläcker man steg 1:s unge, som per
  definition bär allt, stod planen kvar och sa åt en att avla fram den igen. Det var Kens
  iakttagelse ("min breeding plan uppdateras inte") och den var mätbar mot hans box – kedjan
  Helzephyr Lux → Sootseer → Helzephyr → Frostallion Noct (3 steg, ~30 ägg) var i själva verket
  Azurobe → Helzephyr → Frostallion Noct (2 steg, ~20 ägg), för Azurobe bar också alla fyra och
  stod närmare. Varje art med en pal som bär ALLA önskade blir därför en egen kandidatuppsättning,
  och den vanliga prissättningen mot hela planen avgör. **Välj inte här**: en art närmare målet kan
  ändå vara dyrare om dess partners är smutsiga, och det vet bara äggräkningen. Taket finns för att
  varje kandidat kostar en Dijkstra. `tests/planStart.test.ts` har facit, inklusive att en närmare
  art INTE väljs när den saknar passiverna och att könsregeln fortfarande gäller.
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
- **`STAR_COST` är 4/8/12/24 och det är Palworld 1.0.** Här stod 4+16+32+64 = 116 långt efter att
  det slutat gälla: 1.0 sänkte full kondensering till **48 pals totalt**, så sidan krävde mer än
  dubbelt så många dubbletter som spelet. Följden var värre än ett fel tal — "Nästan där" räknade
  bort arter som redan var framme, och rekommendationerna sköt upp kondenseringar man kunde gjort
  direkt. Fördelningen per stjärna är fortfarande inte publicerad av Pocketpair; 4/8/12/24 kommer
  från [wikin](https://palworld.wiki.gg/wiki/Pal_Essence_Condenser) och summerar till exakt de 48
  som är den kända totalen — det är därför den duger, inte för att en sida säger det. Facit står
  ändå i spelets Condenser-ruta. Allt på `/recommendations` räknas ur den enda arrayen i
  `constants.ts`, så det är en rad att ändra — men handfacit finns i **tre** filer
  (`tests/condense.test.ts`, `tests/perfectPlan.test.ts` för `condenseReach` och
  `tests/breedRate.test.ts` för Braloha), och de faller alla när talen ändras. Det är meningen:
  ett kumulativt tal som ändras tyst gör varje tröskel på sidan fel utan att något ser trasigt ut.
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
  Samma regel styr Basen-fliken på `/recommendations`: ranchen är **inte** en av sysslorna
  basgänget ska täcka
  (`BASE_WORK_TYPES`), annars tog den med högst Farming-siffra en lagplats. I stället finns
  `ranchGuide`, som grupperar arterna på **varan** — och varorna står i `RANCH_DROPS`
  (`constants.ts`). **Gissa aldrig dit en vara.** En art utan rad visas som "vara okänd", vilket
  är ärligt; en påhittad vara ser precis lika trovärdig ut som en riktig och skickar någon till
  ranchen med fel pal — det märks först timmar senare.
  **Källan är spelets egen partnerskill-text, inte en guide** (auditen aug 2026, Kens fynd att
  ranchen saknade "massor"): varje ranch-art har en skill vars beskrivning namnger varan
  ordagrant ("Sometimes drops Ice Organ when assigned to Ranch"), och den texten ligger redan i
  repot (`src/lib/data/partnerSkills.json`). Tabellen gick från 12 till 31 rader den vägen, och
  metoden är validerad baklänges — de tolv gamla raderna stämmer alla med sin skill-text.
  `tests/ranchDrops.test.ts` håller båda riktningarna: ingen rad utan belägg i texten, och ingen
  art med ranch-text utan rad. Fyra saker att inte ändra tillbaka:
  1. **Driv ALDRIG ranchlistan på `ws.MonsterFarm`.** Lamball producerar Wool enligt sin egen
     skill men har `ws: {}` i datasetet — ett rent `MonsterFarm > 0` utelämnade No.001, allas
     första ranchpal. `ranchGuide` tar unionen av tabellen och arbetsnivån.
  2. **En art kan lägga flera varor**, så tabellen är rader och inte en karta: Shroomer ger
     Mushroom *eller* Cavern Mushroom, Dumud Gild har Gold Coin som bivara (`side`).
     `new Map(RANCH_DROPS)` tappade den ena tyst — använd `ranchItemsOf`.
  3. **`group: true` betyder att varan är VÅRT samlingsord**, inte ett item-id: Vaelets text
     säger "various seeds" och Vixys "items from the ground" utan att räkna upp dem. Gränssnittet
     märker dem, och Vixy stod tidigare som "Pal Sphere" — mer precision än källan bär.
  4. **`tools/build-item-icons.mjs` läser tabellen med regex.** När formen ändrades gav den TYST
     noll ranchnamn och alltså noll ikoner för de nya varorna; skriptet kastar nu i stället.
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
- **Tårtan är avelns andra kostnad, och receptet är DATA** (`cake.ts`, aug 2026). Planeraren har
  alltid räknat ägg och `breedRate.ts` översatt dem till tid; att varje ägg också kostar en tårta i
  avelsfarmen fanns ingenstans. Fem saker att inte ändra tillbaka:
  1. **Receptet skrivs inte för hand.** Det ligger i `crafting`-tabellen i pyPalworldAPI-dumpen som
     `build-item-info.mjs` redan hämtar, och genereras till `data/recipes.json`. Standardtårtan är
     `{ Egg 8, Milk 7, Flour 5, Honey 2, Red Berries 8 }`, och kontrollen mot det talet står i
     generatorn – en handskriven lista ser precis lika trovärdig ut som en riktig.
  2. **Hela tabellen måste läsas.** `crafting` ligger i TRE INSERT-satser (mysqldump delar på
     storlek), och att klippa vid första `;` tog bort allt från rad ~330 och uppåt – däribland
     **Flour**, alltså halva tårtans kostnad, utan att något såg trasigt ut: tårtreceptet fanns,
     dess underrecept saknades bara. Därför är Flour = 3 Wheat en egen receptkontroll.
  3. **Underreceptet vecklas ut EN nivå och redovisas separat** ("70 Flour = 210 Wheat"). Slås
     Wheat ihop med resten försvinner att man behöver en kvarn och inte en till åker.
  4. **`out` respekteras.** Ett recept ger inte alltid 1; räknas ingredienser utan att dela med
     utbytet blir allt fel den dagen spelet ger flera.
  5. **En tårta per ägg är COMMUNITYNS siffra.** Spelets egen text säger bara att tårta krävs.
     Talet märks ≈, precis som avelsoddsen och expeditionernas FP-formel. Spelet har fem tårtor;
     appen räknar på den vanliga och säger att de andra finns.
  Producenterna kommer ur `RANCH_DROPS` (redan belagd mot partnerskill-texten): tre av fem
  ingredienser läggs av en ranch-pal, och raden visar både vad du äger och hur många som står i en
  BAS – tre Mozzarina i Palboxen producerar ingenting.
- **VILKEN tårta är ett råd ur spelets egen text, aldrig ur en gissad procent** (`CAKE_EFFECTS`,
  `cakeAdvice`). Fyra av de fem tårtorna gör något utöver ägget, och det står ordagrant i
  `items`-tabellen: Special Cake *"More likely inherit multiple passive skills from their
  parents"*, Vegetable Cake *"Lay eggs twice at once"*, Extravagant Vegetable Cake *"Mutations are
  more likely … talents will grow more easily"*, Mushroom Cake samma sak fast *"slightly"*. Rådet
  följer planens eget mål – önskade passiver > IV-tröskel > ren volym – eftersom passiver är det
  enda man inte kan skaffa på annat sätt (IV går att köpa med frukt, arten går att avla fram).
  Tre regler:
  1. **Klassningen är en LÄSNING av meningen, inte en teori.** Varje rad bär `proof` (orden
     påståendet vilar på) och `tests/cake.test.ts` håller dem mot `itemInfo.json`. Skriver
     Pocketpair om en beskrivning faller testet i stället för att rådet tyst pekar fel – samma
     disciplin som `tests/ranchDrops.test.ts` har mot partnerskill-texten.
  2. **Ingen procent hittas på.** Spelet säger "more likely" och aldrig hur mycket. Enda talet är
     Vegetable Cakes "twice at once", och även det är ≈: vi vet inte om farmen drar en tårta per
     läggning eller per ägg, bara att äggen kommer två åt gången.
     **Letat, och det finns inte** (aug 2026, Kens fråga "finns det ingen statistik?"): pyPalworldAPI:s
     `items`, `foodeffect`, `crafting` och `breeding` bär ingen avelsparameter, och paldb:s egen
     itemsida för Special Cake listar även `SneakAttackRate`, `SortId` och `Corruption` utan att
     nämna någon. Effekten ligger alltså i en tabell ingen av källorna exponerar. I stället visas
     **utgångsläget** – planens egen `exactOdds` per ägg – med tårtan som ett lyft ovanpå ett tal
     man kan se. Skriv aldrig in en procent här förrän en uppmätt källa finns att peka på.
  3. **Rådet är ett råd.** Alla fem går att välja och räkningen följer med; den rekommenderade
     behåller sin markering även när man tittar på en annan, annars vet man inte längre vilken
     appen föreslog.
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
  `C:\Repository\PalCompanion` (extract with `tar --strip-components=1 --overwrite`; the device
  mount cannot delete files — old archives are parked in `_to_delete/`).
- `_to_delete/` is junk the user empties himself; never rely on its contents.
- **Ken arbetar i samma träd samtidigt som du. Kör aldrig `git add -A` på en granskning som är
  någon minut gammal.** Det hände aug 2026: en `git add -A` för en helt annan ändring svepte med
  281 rader pågående palettarbete – ny CSS, ny canvas-gren, nya katalognycklar – och pushade det.
  Arbetet visade sig vara komplett, men det var inte mitt att skicka, och han fick veta det efteråt
  i stället för innan. Titta på `git status` **precis** före `add`, och committa bara det du kan
  redogöra för. Är något du inte känner igen med: fråga, eller lägg till per fil.
  Samma sak gäller åt andra hållet — dyker det upp ändringar mitt i ett arbete är det inte en
  konflikt att lösa på egen hand, utan ett besked om att han håller på med något.
