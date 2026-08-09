/* Swedish — the language the app was written in, kept complete by hand.

   Typed as Catalogue: a key that does not exist in en.ts is a compile error,
   and a key that is missing here falls back to English at runtime. */

import type { Catalogue } from "./en";

export const sv: Catalogue = {
  // ── App shell ─────────────────────────────────────────────────────────────
  "meta.description":
    "Palworld-assistent byggd från Level.sav – box, breeding-planerare och rekommendationer",

  "nav.aria": "Huvudnavigation",
  "nav.overview": "Översikt",
  "nav.box": "Boxen",
  "nav.breeding": "Breeding",
  "nav.recommendations": "Rekommendationer",
  "nav.bestFor": "Bäst för…",
  "nav.player": "Spelare",
  "nav.noSave": "Ingen save inläst",
  "nav.donate": "♥ Stöd projektet",

  "header.world": "{name}s värld",
  "header.pals.one": "{n} pal",
  "header.pals.other": "{n} pals",
  "header.species.one": "{n} art",
  "header.species.other": "{n} arter",

  // ── Tema- och språkval ────────────────────────────────────────────────────
  "theme.aria": "Färgläge",
  "theme.light": "Ljust",
  "theme.auto": "Auto",
  "theme.dark": "Mörkt",
  "palette.aria": "Palett",
  "palette.named": "Palett: {name}",
  "palette.basalt": "Basalt",
  "palette.nightwood": "Nattskog",
  "palette.deepwater": "Djupvatten",
  "language.aria": "Språk",
  "language.named": "Språk: {name}",

  // ── Sidfotens teckenförklaring ────────────────────────────────────────────
  "footer.source":
    "Data läst ur Level.sav · breeding enligt Palworld 1.0 · ärvnings-odds är uppskattningar (spelets tvåslagsmodell; vikterna är community-testade).",
  "footer.hover": "Passiver visas som i spelet – {action} för att se vad den gör:",
  "footer.hoverAction": "håll muspekaren över en banner",
  "footer.tier13": "Tier 1–3 (fler pilar = högre)",
  "footer.tier4": "Legendarisk – animerad (Legend, Lucky…)",
  "footer.tier5": "World Tree/rainbow-tier",
  "footer.tierNeg": "Negativ (Clumsy, Slacker…)",

  // ── Credits, licens och de som stöttar ────────────────────────────────────
  "credits.source": "Källkod",
  "credits.thanks": "Tack till",
  "credits.support": "♥ Stöd på Ko-fi",
  "credits.supportHint": "Månadsstöd ger dig en plats här – men alltid först efter att jag frågat.",

  // ── Gemensamt pal-ordförråd ───────────────────────────────────────────────
  "pal.lv": "Lv {n}",
  "pal.deck": "No.{n}",
  "pal.deckTitle": "Paldeck No.{n}",
  "pal.alpha": "Alfa",
  "pal.lucky": "Lucky",
  "pal.keep": "SPARA",
  "pal.condense": "KONDENSERA",
  "pal.score": "Poäng",
  "pal.work": "Arbetslämplighet",
  "pal.noWork": "Inget arbete",
  "pal.workLv": "{name} Lv {n}",
  "pal.talent": "Talang (IV)",
  "pal.passives": "Passiva färdigheter",
  "pal.noPassives": "Inga passiver",
  "pal.baseInfo": "Base Info",
  "pal.close": "Stäng",
  "pal.cellTitle": "{name} · Lv {lv} · IV {iv}",
  "pal.bestIv": "bästa IV {iv}",
  "pal.noKeepFlag": "Ingen sparaflagga",

  // ── Hover-rutan för passiver ──────────────────────────────────────────────
  "ptip.noEffect": "Datasetet beskriver ingen effekt för den här passiven.",
  "ptip.carriers.one": "{n} i boxen bär den",
  "ptip.carriers.other": "{n} i boxen bär den",
  "ptip.noCarriers": "Ingen i boxen bär den",
  "ptip.implants.one": " · du har ett implantat för den",
  "ptip.implants.other": " · du har {n} implantat för den",
  "ptip.module": " · finns som implantatmodul",
  "ptip.equipment": " · sitter på utrustning, kan inte ärvas",
  "ptip.derived": " · härlett ur poängdatan",

  // ── Översikt ──────────────────────────────────────────────────────────────
  "overview.welcome.title": "Välkommen till PalAssistent",
  "overview.welcome.sub": "Boxen är tom – sparfilen är inte inläst än.",
  "overview.welcome.read":
    "Klicka {action} uppe till höger. Då letas din senaste sparfil upp under {path} och boxen fylls med dina egna pals.",
  "overview.welcome.folder":
    "Ligger saven någon annanstans – en dedikerad server, en molnmapp eller en kopia – pekar du ut mappen under {folder}. Där finns också {live}, som håller boxen uppdaterad av sig själv medan du spelar.",
  "overview.welcome.readonly":
    "Sparfilen öppnas alltid skrivskyddat, så Palworld kan ligga kvar och köra.",

  "overview.star": "Boxens stjärna",
  "overview.tile.total": "Pals totalt",
  "overview.tile.species.one": "{n} art",
  "overview.tile.species.other": "{n} arter",
  "overview.tile.keep": "Spara",
  "overview.tile.keepSub": "{n} kan kondenseras",
  "overview.tile.perfect": "Perfekt IV",
  "overview.tile.rainbow": "Rainbow-passiv",
  "overview.tile.rainbowSub": "{n} pals med guldpassiv",

  "overview.highlights.title": "Höjdpunkter i boxen",
  "overview.highlights.sub":
    "Dina mest anmärkningsvärda pals just nu – hela boxen finns under fliken Boxen.",
  "overview.hl.score": "👑 Högst poäng",
  "overview.hl.attacker": "⚔️ Bästa attacker",
  "overview.hl.perfect": "💯 Perfekt IV",
  "overview.hl.lucky": "✨ Bästa Lucky",
  "overview.hl.gold": "🏅 Flest guldpassiver",
  "overview.hl.level": "📈 Högst level",
  "overview.hl.condensed": "⭐ Mest kondenserad",
  "overview.hl.tough": "🛡️ Tåligast",

  "overview.top.title": "Flest exemplar per art",
  "overview.top.sub": "Bra kondenserings-bränsle – se fliken Rekommendationer.",

  // ── Boxen ─────────────────────────────────────────────────────────────────
  "box.search": "Sök pal, smeknamn eller passiv…",
  "box.filter.all": "Alla",
  "box.filter.keep": "Spara",
  "box.filter.condense": "Kondensera",
  "box.filter.rainbow": "Rainbow",
  "box.filter.gold": "Guldpassiv",
  "box.filter.perfect": "Perfekt IV",
  "box.filter.alpha": "Alpha/Lucky",
  "box.sort.score": "Sortera: Poäng",
  "box.sort.iv": "Sortera: IV",
  "box.sort.combat": "Sortera: Stridsstyrka",
  "box.sort.level": "Sortera: Level",
  "box.sort.species": "Sortera: Art",
  "box.hits.one": "{n} träff",
  "box.hits.other": "{n} träffar",
  "box.noMatch": "Inga pals matchar filtret.",
  "box.more": "Visa fler ({n} kvar)",

  // ── Passivnivåer ──────────────────────────────────────────────────────────
  "tier.worldTree": "World Tree",
  "tier.legendary": "Legendarisk",
  "tier.numbered": "Tier {n}",
  "tier.negative": "Negativ",
  "tier.unknown": "Okänd nivå",

  // ── Varför en pal sparas (scoring.ts) ─────────────────────────────────────
  "keep.rainbow": "Rainbow-passiv",
  "keep.gold": "{n} guldpassiver",
  "keep.goldIv": "Guldpassiv + hög IV",
  "keep.synergy": "{n} passiver för {purpose}",
  "keep.perfectIv": "Perfekt IV 100/100/100",
  "keep.highIv": "Hög IV (snitt ≥90)",
  "keep.lucky": "Lucky ✨",
  "keep.condensed": "Kondenserad {n}★",
  "keep.bestOfSpecies": "Bäst i sin art",
  "keep.inParty": "I party",
  "keep.cleanCarrier": "Ren bärare av {names}",
  "keep.soleCarrier": "Enda bäraren av {name}",

  // ── Syften (purpose.ts) ───────────────────────────────────────────────────
  "purpose.attack": "Strid",
  "purpose.attack.hint": "Bossar och raider – attack och elementskada",
  "purpose.tank": "Tålig",
  "purpose.tank.hint": "Överlever länge – HP och försvar",
  "purpose.work": "Bas & arbete",
  "purpose.work.hint": "Jobbar snabbt i basen – välj syssla för artförslag",
  "purpose.mount": "Riddjur",
  "purpose.mount.hint": "Tar dig fram fort – rörelsehastighet",

  // ── Effekter datasetet inte modellerar (UNMODELLED i purpose.ts) ──────────
  "fx.stamina75": "Uthållighet +75 % (bara ridbara)",
  "fx.stamina50": "Uthållighet +50 % (bara ridbara)",
  "fx.stamina25": "Uthållighet +25 % (bara ridbara)",
  "fx.swim50": "Simfart +50 %",
  "fx.swim40": "Simfart +40 %",
  "fx.swim30": "Simfart +30 %",
  "fx.jump2": "+2 hopp när du rider",
  "fx.jump1": "+1 hopp när du rider",
  "fx.san20": "SAN sjunker 20 % långsammare – längre pass",
  "fx.san15": "SAN sjunker 15 % långsammare",
  "fx.hunger20": "Hunger sjunker 20 % långsammare",
  "fx.hunger15": "Hunger sjunker 15 % långsammare",
  "fx.cooldown30": "Nedkylning −30 % på färdigheter",
  "fx.cooldown15": "Nedkylning −15 % på färdigheter",
  "fx.workRank": "Höjer arbetsrangen ett steg",

  // ── Syftesväljaren ────────────────────────────────────────────────────────
  "purpose.taskAria": "Syssla",
  "purpose.cantWork":
    "{name} kan inte {work} alls (arbetsnivå 0). Passivförslagen nedan höjer bara arbetshastigheten – de gör ingen nytta på en art som saknar sysslan. Välj en art ur listan i stället.",
  "purpose.bestSpecies": "Bäst art för {work}",
  "purpose.bestSpeciesWhy":
    "Sorterat på arbetsnivå först – en nivå högre slår alltid en billigare väg. Klicka för att sätta arten som mål.",
  "purpose.recommendedFor": "Rekommenderat för {what}",
  "purpose.alreadyChosen": "Redan valda",
  "purpose.useThese": "Använd dessa {n}",
  "purpose.elementNote":
    "Anpassat efter elementet hos {name} – boostar för fel element faller bort.",
  "purpose.noCarriers":
    "Ingen i boxen bär en passiv som passar det här syftet. Fånga eller avla fram en bärare först – planen kan bara ärva vidare det som redan finns.",
  "purpose.better": "Ännu bättre, men saknas i boxen",
  "purpose.inBox": "{n} i boxen",
  "purpose.reachOwned": "ÄGD",
  "purpose.reachCatch": "FÅNGA",
  "purpose.reachBreed": "AVLAS ×{n}",

  // ── "Bra för…" (palUses i condense.ts) ────────────────────────────────────
  "use.raw": "{text}",
  "use.combat": "Strid #{n}",
  "use.mount": "Riddjur #{n}",
  "use.fishing": "Fiskehjälpare",
  "use.none": "Ren avelspal",
  "use.best": "bäst i boxen",
  "use.only": "enda i boxen",
  "use.ranchCaveat":
    "Ranchen ger artens egen vara – nivån styr bara takten, inte vad som kommer ut.",

  // ── Rekommendationer ──────────────────────────────────────────────────────
  "reco.keep.title": "Spara dessa",
  "reco.keep.sub":
    "{n} pals som reglerna håller utanför kondenseringen, grupperat efter anledning – en pal visas bara i sin första grupp. Fäll ut och klicka en pal för Base Info. Känner du igen någon i kön nedan: leta rätt på den här först.",
  "reco.keep.restTitle": "Bäst i sin art (övriga)",
  "reco.keep.restWhy": "Ingen utmärkande egenskap, men artens bästa exemplar",

  "reco.group.rainbow": "Rainbow-passiv",
  "reco.group.rainbowWhy": "Tier 5 – går bara att ärva, aldrig slumpa fram",
  "reco.group.perfectIv": "Perfekt IV",
  "reco.group.perfectIvWhy": "100/100/100 – utgångspunkten för varje avelslinje",
  "reco.group.gold": "Flera guldpassiver",
  "reco.group.goldWhy": "Två eller fler legendariska passiver som gör nytta på arten",
  "reco.group.synergy": "Färdig uppsättning",
  "reco.group.synergyWhy": "Tre eller fler passiver som drar åt samma håll – en stam att avla vidare på",
  "reco.group.carrier": "Ren bärare",
  "reco.group.carrierWhy":
    "Toppassiv som gör nytta på arten, utan skräp runt sig – varje extra passiv späder ut arvspoolen",
  "reco.group.sole": "Enda bäraren",
  "reco.group.soleWhy":
    "Passiven passar inte arten, men ingen annan sparad pal bär den – och passiver går bara att ärva",
  "reco.group.goldIv": "Guldpassiv + hög IV",
  "reco.group.goldIvWhy": "En legendarisk passiv som passar arten, och IV-summa 240 eller mer",
  "reco.group.highIv": "Hög IV",
  "reco.group.highIvWhy": "Snitt 90 eller mer – bra föräldrar även utan passiver",
  "reco.group.lucky": "Lucky",
  "reco.group.luckyWhy": "Går inte att avla fram",
  "reco.group.condensed": "Redan kondenserad",
  "reco.group.condensedWhy": "Stjärnorna är matade pals du inte får tillbaka",
  "reco.group.party": "I ditt party",
  "reco.group.partyWhy": "Följer med dig ut",

  "reco.band.todo": "Att göra nu",
  "reco.band.value":
    "{species} arter · mata {feed} pals · +{stars}★ · {slots} platser tillbaka",
  "reco.band.dupes": "{dupes} dubbletter av {total} pals i boxen",

  "reco.queue.title": "Kondensera",
  "reco.queue.sub": "Ett steg per rad, störst vinst först. Klicka på raden för detaljerna.",
  "reco.queue.why": "Varför kondensera – och vad det kostar",
  "reco.queue.nothing":
    "Inget att kondensera just nu – ingen art har nog med dubbletter för en stjärna till.",
  "reco.queue.showFirst": "Visa bara de {n} första",
  "reco.queue.showAll": "Visa alla {n} arter",
  "reco.queue.count": "{n} st",

  "reco.head.species": "Art",
  "reco.head.becomes": "Blir",
  "reco.head.feed": "Mata",
  "reco.head.slots": "Platser",
  "reco.head.watch": "Se upp",

  "reco.row.youKeep": "Du behåller",
  "reco.row.itGives": "Det ger",
  "reco.row.baseInfo": "Visa Base Info",
  "reco.row.keeperBaseInfo": "Visa Base Info för exemplaret du behåller",
  "reco.row.fact": "+{pct} % på HP, attack och försvar · {slots} platser fria",
  "reco.row.leftover": " · {n} dubbletter blir över",
  "reco.row.nextStar": "Sedan mot {n}★",
  "reco.row.misfit": "Passar inte arten: {names}",
  "reco.row.misfitWhy":
    "Passiverna gör ingen nytta för det arten faktiskt används till – men de ligger ändå i arvspoolen och sänker oddsen",

  "reco.wait.title": "Nästan där",
  "reco.wait.sub":
    "Några pals till så går det. Dubbletter duger – det är antalet som räknas, inte kvaliteten.",
  "reco.wait.none": "Ingen art ligger nära nästa stjärna.",
  "reco.wait.needs": "saknar {n} → {star}★",
  "reco.wait.already": "redan {n}★",
  "reco.wait.has": "Har {have} av {need}",
  "reco.wait.rowTitle": "{name}: har {have} dubbletter av {need} – klicka för Base Info",
  "reco.wait.farTitle": "Långt kvar eller redan maxade",
  "reco.wait.farCount": "({n} arter)",
  "reco.wait.farWhy": "Dubbletterna räcker inte till nästa stjärna – de tar bara plats",

  "reco.why.what": "Vad kondensering gör:",
  "reco.why.body":
    "du matar dubbletter till {one} exemplar i Pal Essence Condenser. Det du matar försvinner ur boxen för alltid – dess passiver och IV går bara att ärva, aldrig få tillbaka. Det du behåller får en stjärna per fullbordad nivå och blir permanent starkare: {gain}. Passiver och IV på den du behåller ändras {not} – kondensering gör en bra pal starkare, aldrig en medelmåttig pal bra.",
  "reco.why.one": "ett",
  "reco.why.not": "inte",
  "reco.why.gain": "≈ +5 % HP, attack och försvar per stjärna",
  "reco.why.work": " Dessutom höjs arbetslämpligheten:",
  "reco.why.workBody":
    "varje rang lyfter {one} av palens befintliga sysslor ett steg, och full rang lyfter alla. Det är vägen från nivå 8 till spelets tak på 10 – tillsammans med Applied Technique-böckerna (+1 permanent, en per syssla) och arbetsauror.",
  "reco.why.cost": "Kostnad per stjärna: {ladder} – kumulativt, inte en total.",
  "reco.why.costSource":
    "48 pals för full kondensering, enligt Palworld 1.0. Pocketpair har inte publicerat fördelningen per stjärna, så visar din Condenser något annat är det spelet som gäller – skriv en issue.",

  "condense.noteGold":
    "{n} bär en guld- eller rainbow-passiv – passiver går bara att ärva, aldrig slumpa fram.",
  "condense.noteIv":
    "{n} har en 100:a i en stat – byggstenar i en 100/100/100-linje, inte bara mat.",
  "condense.noteBetter":
    "Bästa IV i arten är {best}, inte {keeper} – kondensera på den du tänker använda.",
  "condense.noteLast":
    "Sista exemplaret blir ensamt kvar – arten går då inte att para med sig själv.",

  // ── Bäst för… ─────────────────────────────────────────────────────────────
  "best.own.owned": "ÄGD",
  "best.own.catch": "FÅNGA",
  "best.own.mustCatch": "MÅSTE FÅNGAS",
  "best.own.breedShort": "AVLAS ×{n}",
  "best.own.breed.one": "KAN AVLAS · {n} parning",
  "best.own.breed.other": "KAN AVLAS · {n} parningar",
  "best.planTitle": "Klicka för breeding-plan",
  "best.lookLike": "Så här ska de se ut",

  "best.attack.title": "Attack-team (boss/raid)",
  "best.attack.sub":
    "Topp 5 ur din box efter stridsstyrka (art-scaling × ATK-IV × attack-passiver), med elementspridning.",
  "best.attack.loadoutSub":
    "Fyra passiver per pal, anpassade efter artens element. Ifylld banner = den har den redan. Klicka för en avelsplan som fyller luckorna.",
  "best.attack.why": "{element} · styrka {n}",
  "best.attack.label": "Strid · styrka {n}",
  "best.attack.top15": "Topp 15 attackers du äger",
  "best.attack.allElements": "(alla element)",
  "best.attack.row": "Styrka {power} · ATK-IV {iv} · Lv {lv}",
  "best.attack.global": "Bästa attackers i spelet – även de du inte äger",
  "best.attack.clickHint": "(klicka för breeding-plan)",
  "best.attack.scaling": "ATK-scaling {n}",
  "best.attack.stats": "{atk} ATK · {hp} HP",
  "best.attack.ultimate":
    "Vill du bygga den ultimata attackern? Klicka på en pal ovan och välj passiver som {passives}.",
  "best.attack.ultimateList": "Legend + Musclehead + Vanguard + elementboost",

  "best.crew.title": "Bas-dreamteam",
  "best.crew.sub":
    "Minsta gäng ur din box som täcker alla arbetstyper med högsta nivåer (🌙 = jobbar även natt).",
  "best.crew.loadoutSub":
    "Arbetshastighet är allt som räknas i basen – utom på Farming, där Farmhand och Ranch Master höjer själva arbetsrangen.",
  "best.crew.label": "{work} nivå {n}",
  "best.crew.inBox": "i boxen – placera ut",
  "best.crew.own": "Bästa arbetare per syssla – ur din box",
  "best.crew.global": "Bästa arbetare i spelet – även de du inte äger",

  "best.ranch.title": "Ranchen – vem lägger vad",
  "best.ranch.sub":
    "Ranchen är den enda sysslan där {species}: varje art lägger sin egen vara, och Farming-nivån säger bara hur snabbt den kommer. Leta efter varan du behöver – inte efter högsta siffran.",
  "best.ranch.subEmph": "arten avgör värdet",
  "best.ranch.place": "Ställ den i ranchen – klicka för avelsplan",
  "best.ranch.levelTitle": "Farming-nivå = takten, inte varan",
  "best.ranch.unknown": "Vara okänd för {n} arter",
  "best.ranch.unknownBody":
    " – vår tabell är handkurerad och spelets data innehåller ingen ranch-vara att läsa av: {names}. Säg vad de lägger så fylls listan på; tills dess gissar vi hellre inte.",

  "fish.gloopie": "Fångst-mätaren töms 12–35 % långsammare",
  "fish.whalaska": "Högre startläge + extra progress vid överlapp",
  "fish.whalaskaIgnis": "Starkare Whalaska + ridbar på vatten",
  "fish.solmora": "Lättare att fiska upp pals med hög talang (IV)",
  "fish.solmoraLux": "Starkare Solmora + el-vattenmount",
  "fish.jelliette": "Föremål från fiske +55–95 %",
  "fish.jellroy": "Föremål från bärgning +55–95 %",

  "best.fishing.title": "🎣 Fiske-hjälpar",
  "best.fishing.sub": "Pals med partner-skills som förbättrar fisket (Palworld 1.0).",

  "best.mount.title": "🐎 Snabbaste riddjuren",
  "best.mount.sub": "Sprint-fart × Swift/Runner-passiver, bästa exemplar per art.",
  "best.mount.loadoutSub": "Rörelsepassiver – de enda som faktiskt påverkar sprintfarten.",
  "best.mount.why": "sprint {n}",
  "best.mount.label": "Riddjur · sprint {n}",

  // ── Uppsättningskortet ────────────────────────────────────────────────────
  "loadout.has": "har den",
  "loadout.missing": "saknas",
  "loadout.carriers.one": "{n} bärare i boxen",
  "loadout.carriers.other": "{n} bärare i boxen",
  "loadout.noCarrier": "ingen i boxen bär den",
  "loadout.perfect": "Har hela uppsättningen.",
  "loadout.noneForRole": "Inga förslag för rollen",
  "loadout.overSubscribed":
    "Alla {n} är värda en plats, men spelet ger bara fyra – välj själv vilken du hoppar över.",
  "loadout.alsoCarries": "Bär också",
  "loadout.alsoCarriesTail": " – bra för rollen, men får inte plats bland fyra.",
  "loadout.junk": "Onödigt i rollen:",
  "loadout.junkTail":
    " – hamnar i arvspoolen och sänker oddsen när du avlar vidare på den.",
  "loadout.planMissing.one": "Planera avel för den som saknas",
  "loadout.planMissing.other": "Planera avel för de {n} som saknas",

  // ── Genvägar ("fånga det här i stället") ──────────────────────────────────
  "shortcut.title": "Genväg",
  "shortcut.catchMale": "Fånga en hane {name} utan passiver",
  "shortcut.catchFemale": "Fånga en hona {name} utan passiver",
  "shortcut.catchAny": "Fånga en {name} utan passiver",
  "shortcut.common": "Vanlig art – finns i vilt tillstånd.",
  "shortcut.rare": "Sällsynt, men vinsten är värd jakten.",
  "shortcut.required": "krävs",
  "shortcut.saves": "−{n} ägg",
  "shortcut.foot":
    "En vild pal utan passiver håller arvspoolen liten. Det tar minuter att fånga – att kläcka bort skillnaden tar betydligt längre.",
  "shortcut.shorterPath":
    "Det finns en väg på {steps} steg i stället för {now}, men din {name} släpar med skräp-passiver. En ren gör den korta vägen billigast.",
  "shortcut.onlyMales": "Paret kan inte avla – du har bara hanar av arten.",
  "shortcut.onlyFemales": "Paret kan inte avla – du har bara honor av arten.",
  "shortcut.junkPartner":
    "Din {name} bär {n} passiver du inte vill ha – de hamnar i poolen varje gång.",

  // ── Breeding: planerarens egen prosa ──────────────────────────────────────
  "breed.savedHint": "Valen sparas – du kan gå till Boxen och tillbaka utan att tappa planen.",
  "breed.clearAll": "Rensa allt",
  "breed.pickWantedFirst": "Välj önskade passiver ovan – det är dem paret ska nå.",
  "breed.targetTitle": "Mål-pal",
  "breed.targetSub": "Vilken art vill du få fram? Arter du redan äger ligger först.",
  "breed.baseFrom": "Bas att utgå från:",
  "breed.freeMode": "fritt läge",
  "breed.freeModeCap": "Fritt läge",
  "breed.baseHint":
    "Välj en art du äger om kedjan ska starta där. I fritt läge letar appen den kortaste vägen från hela boxen.",
  "breed.ivGoalLabel": "IV-mål:",
  "breed.ivFastHint":
    "Väljer föräldrarna med bäst IV-snitt bland dem du äger – bra resultat direkt.",
  "breed.ivPerfectHint":
    "Väljer föräldrar efter sin svagaste stat, så alla tre kan nå 100. Räkna med fler kläckningar.",
  "breed.passivesFirst":
    " Passiverna går alltid först: renast möjliga förälder vinner före IV.",
  "breed.goalTitle": "Målbild",
  "breed.goalSub":
    "Så ser palen ut när planen är klar – arten du valt med precis de här passiverna.",
  "breed.wantedTitle": "Önskade passiver",
  "breed.wantedSub":
    "Välj vad palen ska användas till så föreslår appen passiver – eller klicka fram dem själv. Siffran är antal bärare i boxen.",
  "breed.remove": "Ta bort",
  "breed.noneChosen": "Inga valda – t.ex. Legend, Musclehead, Swift",
  "breed.emptyState":
    "Välj en mål-pal och/eller önskade passiver ovan. Exempel: mål {target} + passiver {passives} → komplett plan med odds per steg.",

  "exact.least": "minst",
  "exact.exact": "exakt",
  "exact.lead": "Oddsen ovan är chansen att ungen får {least} de önskade passiverna.",
  "exact.noRoom":
    "Med fyra önskade finns ingen ledig plats kvar, så där är {exact} samma sak som {least} – blir det fyra rätt kan inget skräp följa med.",
  "exact.tradeoff":
    "Vill du ha {exact} dem och inget mer är sista steget {odds} ({eggs}), eftersom spelet slumpar in minst en extra passiv i {pct} % av alla ägg – oberoende av hur ren poolen är. Det går alltså inte att avla bort, bara att kläcka förbi.",

  // ── Manuellt par: resultatet ──────────────────────────────────────────────
  "manres.noChild": "De två kan inte para sig.",
  "manres.noChildBody":
    "{a} × {b} har inget barn i avelstabellen – legendarer parar sig bara med sin egen art.",
  "manres.bothMale": "Båda är hanar.",
  "manres.bothFemale": "Båda är honor.",
  "manres.sameGenderBody":
    "Byt ut den ena, eller sätt könet till {unknown} om du ändå ska skaffa exemplaret.",
  "manres.missing": "Paret kan inte ge alla önskade.",
  "manres.neitherCarries": "ingen av dem bär:",
  "manres.inherit": "ärva",
  "manres.missingBody":
    "Passiver går bara att {inherit} – ungen kan aldrig få en som ingen förälder har. Spelet kan slumpa fram en, men den dras ur hela passivtabellen, så det är tur och inte en plan. Lägg till en förälder som bär dem, eller operera in dem efteråt.",
  "manres.eggsWord": "ägg",
  "manres.gives": "ger en pal med alla {n} önskade på {eggs}",
  "manres.pool": "Arvspoolen är {n} passiver",
  "manres.poolJunk": " – varav {n} skräp, och det är det som kostar",
  "manres.direct":
    "Direkt i ett steg vore {pct} per ägg = ≈{eggs} ägg, så etappvis är billigare här: en ren unge åt gången krymper poolen inför sista steget.",
  "manres.oneStep": "Ett enda steg räcker – poolen är för liten för att en omväg ska löna sig.",
  "manres.stepHint": "Pool {pool} · ≈{eggs} ägg",
  "manres.stepGender": " · +≈{n} för rätt kön",
  "manres.cleanWord": "ren",
  "manres.stepClean": "{clean} unge krävs, annars växer nästa pool",
  "manres.stepLast": "sista steget, skräp får följa med",
  "manres.fromPair": "ur paret, ungen ska bära:",
  "manres.fromSteps": "ur steg {a} + {b}:",

  // ── Implantatrutan ────────────────────────────────────────────────────────
  "imp.use": "Använd implantaten",
  "imp.useBody.one": " – räkna inte med den i arvspoolen",
  "imp.useBody.other": " – räkna inte med dem i arvspoolen",
  "imp.useCount": ", planen avlar {n} av {total}",
  "imp.notPerfect": "Ägget behöver inte bli perfekt",
  "imp.youHaveFor.one": " – du har implantat för en av dem",
  "imp.youHaveFor.other": " – du har implantat för {n} av dem",
  "imp.inStash": "i ditt förråd:",
  "imp.moduleNotOwned": "finns som modul, men du äger den inte:",
  "imp.moduleExists": "finns som implantatmodul:",
  "imp.mustBreed": "måste avlas:",
  "imp.caseMissing": "Saknas {name}?",
  "imp.doneAnyway": "klar ändå",
  "imp.finished": "färdiga",
  "imp.caseMissingBody":
    "Ungen är {ok}, inte misslyckad – operera in den på den {finished} palen, så hamnar passiven aldrig i arvspoolen och du behöver inte avla mer.",
  "imp.caseJunk": "Fick den en skräp-passiv i stället?",
  "imp.caseJunkBody":
    "Ersätt den – bordet skriver över en plats du väljer, och {pct} av alla ägg får ändå en slumpad passiv, så platsen är oftast redan upptagen av något du inte vill ha.",
  "imp.casePartial": "Fick du bara en del av dem?",
  "imp.casePartialKeep": "Spara ungen, mata den inte",
  "imp.casePartialBody": " – den är en färdig grund du fyller ut vid bordet när du vill.",
  "imp.counted": "Räknat:",
  "imp.countedOn": "planen avlar",
  "imp.countedOff": "med kryssrutan på skulle planen avla",
  "imp.countedBody":
    "{left} av {total} önskade, och sista steget går {from} → {to} per ägg = {saving}.",
  "imp.fewerEggs": "~{factor} färre ägg",
  "imp.alsoModules.one": "Skaffar du modulen också:",
  "imp.alsoModules.other": "Skaffar du modulerna också:",
  "imp.possible": "går",
  "imp.fine":
    "Bordet kräver teknologinivå 38 och varje ingrepp kostar guld, så rutan svarar på om det {possible} – inte på om guldet är värt det.",

  // ── IV-planen ─────────────────────────────────────────────────────────────
  "iv.junk": "+{n} skräp",
  "iv.ownNone":
    "Du äger ingen {name} än, så det finns inget att avla med. Följ art-vägen nedan först – sikta redan där på föräldrar med höga IV, för barnet ärver deras statar.",
  "iv.sub":
    "Varje stat ärvs för sig: 30 % från pappan, 30 % från mamman, 40 % helt omslumpat. Därför går 100:orna att samla ihop – siffrorna är uppskattningar.",
  "iv.oneGender":
    "Du har bara ett kön av {name}. Skaffa en till av motsatt kön – utan ♂+♀ går det inte att avla vidare på arten.",
  "iv.best": "bäst: {name} {g} · IV {iv}",
  "iv.mustReroll": "måste slumpas fram (≈1 % per ägg)",
  "iv.gapLead":
    "Ingen av dina {name} har 100 i {stats}. Den staten kan bara komma ur 40 %-omslumpningen – ungefär ett ägg på hundra – vilket är det som gör planen nedan dyr.",
  "iv.and": "och",
  "iv.donorLead":
    "Genväg: para in en 100:a utifrån. De här arterna bär den {and} parar tillbaka till {name}, så linjen behåller sin art:",
  "iv.andWanted": " och alla önskade passiver",
  "iv.noMoreBreeding": "Inget mer avlande behövs.",
  "iv.noneCarries": "Ingen av dina {name} bär",
  "iv.mustImport":
    "Den måste hämtas in från en annan art först – se passiv-planen nedan. Planen här räknar bara på det som faktiskt går att ärva inom arten.",
  "iv.shortestPath": "Kortaste vägen · {n} steg",
  "iv.pathHint":
    "Varje steg parar ihop två individer och du behåller ungen som fick allt i rutan. Ordningen är uträknad: att slå ihop två rena bärare först och väva in passiverna sent är nästan alltid billigare än att utgå från en pal som redan har mycket – varje extra passiv en förälder bär hamnar i arvspoolen.",
  "iv.keepChild": "Behåll ungen med {state}. Odds:",
  "iv.ofWhichGender": "Varav ~{n} ägg för att träffa rätt kön.",
  "iv.sharedClutch":
    "Samma föräldrapar som steg {steps} – en kull ger båda ungarna, så kostnaden är delad.",
  "iv.totalOver": "totalt över {n} steg",
  "iv.directOneStep": "Direkt i ett steg",
  "iv.bestPairNow": "bästa paret du kan sätta ihop just nu",
  "iv.stagewise": "att gå etappvis",
  "iv.footGender": "Kön räknas in",
  "iv.footClutch": "samma kull",
  "iv.foot":
    "Uppskattningar. {gender}: en unge ur ett tidigare steg som måste ha ett bestämt kön kostar i snitt dubbelt, eftersom könet är slumpat. Steg som delar föräldrapar hämtar dessutom sina ungar ur {clutch} och räknas därför bara en gång.",
  "iv.noPath": "Ingen väg hittades inom arten. Det beror nästan alltid på att du bara äger en",
  "iv.separateEmph": "var för sig",
  "iv.separate":
    "IV och passiver rullas {apart} – en unge med rätt passiver kan ha uselt IV och tvärtom. Planen ovan tar hänsyn till båda samtidigt och lägger in passiverna i det steg där de kostar minst, i stället för att alltid ta dem först.",

  // ── Passiv-planen ─────────────────────────────────────────────────────────
  "pp.title": "Passiv-plan",
  "pp.sub":
    "Så samlar du ihop passiverna innan (eller medan) du byter art. Odds = chansen att barnet ärver alla önskade i steget – extra passiver kan följa med, se noten under planen.",
  "pp.givesAll": "Ger alla {n} önskade",
  "pp.givesSome": "Ger {n} av {total} önskade",
  "pp.savesSteps": "Sparar {n} bärarsteg.",
  "pp.unmarkedJunk": "Det omarkerade följer med in i arvspoolen och sänker oddsen.",
  "pp.alternatives": "Alternativ i boxen:",
  "pp.nobodyHasIt":
    "Ingen i boxen har denna – kan inte planeras (endast slumpmutation vid kläckning).",
  "pp.keepClean": "Håll linjen ren.",
  "pp.combined": "samlade",
  "pp.only": "enbart",
  "pp.keepCleanBody":
    "Barnet ärver ur föräldrarnas {combined} passiv-pool, så varje extra passiv en förälder bär konkurrerar med dem du vill ha. Vill du ha en pal med {only} {n} passiver, välj alltid en förälder som bär så få andra som möjligt – helst en som bara har den önskade.",
  "pp.threePlus":
    "Med {n} önskade räcker en enda skräp-passiv för att mångdubbla antalet ägg, så en ”sämre” pal utan skräp slår nästan alltid en stark med extra passiver.",
  "pp.noneInBox": "Ingen av de önskade passiverna finns i boxen ännu.",
  "pp.allOnOne": "Alla valda passiver finns redan på {pal} – gå direkt till art-fasen nedan.",
  "pp.phase1": "Fas 1 · Samla passiverna ({n} bärare)",
  "pp.pairwise": "Para ihop två och två.",
  "pp.twoWord": "två",
  "pp.pairwiseBody":
    "Sista steget kostar lika mycket hur du än kommer dit – poolen är ändå dina {n} önskade. Skillnaden ligger i vägen fram: bygger du en förälder med tre passiver först (~3 ägg) blir det dyrare än att bygga {two} föräldrar med två passiver var (~2 ägg styck). Därför slår planen ihop bärarna parvis och möts på mitten.",
  "pp.orderWhole": "Ordningen är vald på hela planen, inte på fas 1.",
  "pp.theTarget": "målet",
  "pp.detourA": "~{cheap} ägg här i stället för",
  "pp.detourAEnd": "längre från {target}.",
  "pp.detourB":
    "Bärarna går att para ihop på flera sätt som kostar lika mycket här, men de landar i olika arter – den här hamnar närmast {target}.",
  "pp.detourSaves": "Vägen nedan sparar {eggs} totalt, eftersom artkedjan efteråt blir kortare.",
  "pp.bothMale": "Båda är hanar – paret kan inte avla. Skaffa en av motsatt kön, eller använd en annan bärare.",
  "pp.bothFemale": "Båda är honor – paret kan inte avla. Skaffa en av motsatt kön, eller använd en annan bärare.",
  "pp.hatchUntil": "Kläck tills du får en unge med precis det här – helst utan skräp.",
  "pp.needsGender": "Ungen behöver dessutom ett bestämt kön här, vilket i snitt kostar ~{n} ägg extra.",
  "pp.stepGoal": "Mål i steget: barn med",
  "pp.carrierInStep": "Bärare i steget",
  "pp.carrier": "BÄRARE",
  "pp.impossiblePair":
    "para {name} med sin egen art och använd avkomman, eller välj en annan bärare av passiven.",
  "pp.noChain":
    "Hittade ingen kedja från {from} till {to} med dina ägda pals som partners – prova fritt läge nedan.",
  "pp.longerOnPurpose": "Längre väg med flit.",
  "pp.longerBody":
    "Det finns en kedja på bara {short} steg, men den går via en partner som släpar med skräp-passiver och kostar {shortEggs}. Vägen nedan tar {long} steg och {longEggs} – ett steg till med rena partners är nästan alltid billigare än ett kort med en smutsig.",
  "pp.partnerSameGender":
    "Partnern har samma kön som linjen – paret kan inte avla. Byt till",
  "pp.childKeeps": "Barnet ska behålla",
  "pp.total": "Totalt: ~{n} ägg",
  "pp.totalExpected": "förväntat för hela planen,",
  "pp.totalTip":
    "Tips: håll skräp-passiver borta ur linjen – varje extra passiv i poolen sänker oddsen.",

  // ── Art-vägen ─────────────────────────────────────────────────────────────
  "sp.title": "Art-väg till {name}",
  "sp.alreadyOwn": "Du äger redan {name} – bästa exemplar:",
  "sp.directCombos": "{n} direkta kombos med pals du äger",
  "sp.showingEight": " – visar 8 bästa",
  "sp.parents": "Föräldrar:",
  "sp.partner": "Partner:",
  "sp.genderRandom": "(barnets kön är slumpat – kläck tills du får motsatt kön mot partnern)",
  "sp.baseIsTarget": "Basen är redan målet.",
  "sp.noChainIn10": "Ingen kedja hittad inom 10 steg – prova fritt läge.",
  "sp.shortestFree": "Kortaste väg (fritt läge)",
  "sp.unreachable":
    "{name} kan inte nås via breeding från din box – vissa pals (legendarer m.fl.) kan bara fås av två av samma art. Fånga en först.",
  "sp.ownedNoBreeding": "Ägs redan – ingen breeding behövs för själva arten.",

  // ── Breeding: delade enheter och varningar ────────────────────────────────
  // ── Tid och IV-ord som planeraren delar ───────────────────────────────────
  "time.seconds": "{n} s",
  "time.minutes": "{n} min",
  "time.minutesSeconds": "{m} min {s} s",
  "time.hours": "{n} h",
  "time.days": "{n} d",
  "time.daysHours": "{d} d {h} h",
  "iv.noHundreds": "inga 100:or",
  "iv.impossible": "i praktiken omöjligt",

  "eggs.approx": "~{n} ägg",
  "pair.needBothGenders": "saknar ♂+♀ – avla/fånga en till av arten",
  "breed.perEgg": "{odds} / ägg",
  "breed.yourLine": "DIN LINJE",
  "breed.stepN": "STEG {n}",
  "breed.ivFast": "Snabb optimal",
  "breed.ivPerfect": "Perfekt 100/100/100",

  // ── Väljarna ──────────────────────────────────────────────────────────────
  "ui.show": "Visa",
  "ui.hide": "Dölj",
  "picker.onlyMine": "Bara mina",
  "picker.showAll": "Visa alla",
  "picker.groupWorldTree": "World Tree",
  "picker.groupLegendary": "Legendariska",
  "picker.groupCommon": "Vanliga",
  "picker.groupNegative": "Negativa",
  "picker.searchSpecies": "Sök art, element eller No.…",
  "picker.youOwn": "Du äger arten",
  "picker.noSpecies": "Ingen art matchar sökningen.",
  "picker.searchPassive": "Sök passiv…",
  "picker.showAllTitle": "Ta även med passiver som ingen i boxen bär",
  "picker.chosenOf": "{n}/{max} valda · {total} att välja på",
  "picker.noPassive": "Ingen passiv matchar sökningen.",
  "picker.noCarrierMatch":
    "Ingen bärare i boxen matchar – slå på ”Visa alla” för att se resten.",
  "picker.implantsFor": "Du har {n} implantat för {name}",

  // ── Vilket exemplar är det (PalIdent) ─────────────────────────────────────
  "ident.container": "{name} · plats {slot}",
  "ident.palbox": "Palbox · låda {box}, rad {row} ruta {col}",
  "ident.slotTitle": "Räknat ur platsen i sparfilen (30 pals per låda)",
  "ident.wanted": "en av dem du vill ha",

  // ── Målbilden ─────────────────────────────────────────────────────────────
  "goal.pickSpecies": "Välj arten du siktar på i rutnätet ovan – bilden fylls i här.",
  "goal.done": "Klart – {pal} uppfyller redan målet.",
  "goal.ownNone": "Du äger ingen än. Art-vägen längre ner visar hur du får fram den.",
  "goal.owned": "{n} i boxen · {rest}",
  "goal.noneComplete": "ingen av dem har alla önskade passiver än",
  "goal.pickPassives": "välj passiverna till höger",
  "goal.noSpecies": "Ingen art vald",
  "goal.passives": "Passiva färdigheter · mål",
  "goal.emptySlot": "tom plats",
  "goal.ivGoal": "Talang · IV-mål",
  "goal.ivFastHint": " – bästa IV-snitt bland dina föräldrar, ingen jakt på 100:or.",

  // ── Avelsbasen (takt-panelen) ─────────────────────────────────────────────
  "setup.title": "Avelsbas",
  "setup.perEgg": "≈{time} per ägg",
  "setup.todo": "{n} kvar",
  "setup.full": "full uppställning",
  "setup.ownedN": "ÄGD ×{n}",
  "setup.moveTo": "flytta {where}",
  "setup.planSpecies": "Planera {name}",
  "setup.atBase": "I basen",
  "setup.atBaseTag": "I BASEN",
  "setup.inParty": "I partyt",
  "setup.inPartyTag": "I PARTYT",
  "setup.capFree": "utan att röra oddsen",
  "setup.cap":
    "Taket {free} är {rate} = ≈{time} per ägg: en 4★ Braloha i basen och Grintale i partyt. Philanthropist på båda föräldrarna tar det till {capRate} (≈{capTime}) men lägger sig i arvspoolen – se längst ner.",
  "setup.bralohaNone": "Ger {now} direkt, {max} vid 4★.",
  "setup.bralohaReach":
    "Nu {now} – dina {dupes} dubbletter räcker till {star} och {then}.",
  "setup.bralohaNow": "Ger {now}",
  "setup.bralohaAtFour": " · {max} vid 4★.",
  "setup.hatching": "kläckningen",
  "setup.dynamoff":
    "Kortar {hatch} i inkubatorn, inte farmens timer – därför ligger den utanför takten ovan. {now} direkt, {max} vid 4★. Störst nytta ihop med Grintale: fler ägg är bara fler ägg om kläckarna hinner med.",
  "setup.ownRoll": "egen passivdragning",
  "setup.grintale":
    "Varje upplockat ägg har {chance} chans att ge ett extra, alltså {more} ur samma par. Det extra ägget är en {roll}, så det räknas fullt ut i planens siffror. Platt – ingen stjärnskalning – och stackar inte med fler Grintale.",
  "setup.alphaEgg": "alpha-ägg",
  "setup.broncherryAqua": "Chans att ett upplockat ägg blir {alpha}: {now} → {max} vid 4★.",
  "setup.broncherry":
    "Samma sak, svagare: {now} → {max} vid 4★. Ingendera stackar med sig själv.",
  "setup.moreEggs": "{factor} fler ägg",
  "setup.fasterRate": "{factor} snabbare",
  "setup.passivesGroup": "Passiver på de två du parar – köper takt med odds",
  "setup.theTwo": "de två du lägger i avelsboxen",
  "setup.pool": "arvspoolen",
  "setup.costSomething": "kostar något",
  "setup.passivesLead":
    "De två här sitter på {two}, alltså föräldrarna i planens steg – inte på Braloha eller någon i partyt. Och eftersom allt en förälder bär hamnar i {pool}, är de de enda i panelen som {cost}.",
  "setup.yourOne": "din enda önskade passiv",
  "setup.yourMany": "dina {n} önskade passiver",
  "setup.poolNone":
    "Du har inga önskade passiver, så ingenting av den hamnar i vägen: netto {net}. Jagar du bara {iv} är den alltså gratis – IV ärvs oberoende av passiver.",
  "setup.poolTrade":
    "Sista steget går {clean} → {dirty} per ägg, alltså {eggs}, mot {speed} takt.",
  "setup.poolNotWorth": "Lönar sig inte med {yours}.",
  "setup.poolNotWorthBody":
    "Den sitter på de två du parar, alltså i arvspoolen, och där är den skräp.",
  "setup.threeOrFewer": "tre önskade eller färre",
  "setup.poolNotWorthTail":
    "Netto {net} – låt den vara. Den lönar sig vid {three}, och är gratis i ren IV-jakt.",
  "setup.poolWorth": "Lönar sig med {yours}:",
  "setup.poolWorthNet": "netto {net}.",
  "setup.four": "fyra",
  "setup.poolWorthTail": "Vid {four} önskade vänder det till en förlust – poolen blir för trång.",
  "setup.carriersAnyway": "Du har {n} bärare i boxen om du ändå vill.",
  "setup.noCarrier": "Ingen bärare i boxen – den måste fångas eller avlas fram först.",
  "setup.nightShift": "nattpass",
  "setup.nocturnalCost": "kostar samma pool-plats som Philanthropist",
  "setup.nocturnal":
    "Paret pausar inte när det blir natt. Effekten är upptid, inte takt, så den ligger inte i siffran ovan – men den är verklig, och störst om du sover när spelet gör det. Den {cost} och delar därför dess räkning: värd det när du siktar på få passiver, inte när du siktar på fyra.",
  "setup.carriers": "Du har {n} bärare.",
  "setup.noEffectTitle": "Påverkar inte avelstiden:",
  "setup.parents": "föräldrarna",
  "setup.noEffectBody":
    "Artisan, Work Slave, Serious och Lucky, Statue of Power, matbuffar – och att kondensera {parents}. De snabbar upp hantverk och insamling. Enda kondenseringen som gör skillnad är Bralohas egen.",

  // ── Implantatförrådet ─────────────────────────────────────────────────────
  "implant.title": "Implantat",
  "implant.subtitle": "sätts in på en färdig pal – kostar inga ägg",
  "implant.inStash": "i förrådet",
  "implant.empty": "tomt",
  "implant.picked": "vald",
  "implant.noneBody":
    "Du har inga implantat just nu. De sätts in med Pal Surgery Table (teknologinivå 38) och lägger en passiv på en färdig pal – alltså efter avlingen, så den hamnar aldrig i arvspoolen och kostar inte ett enda ägg. Hittar du ett för en passiv du jagar behöver du inte avla fram den.",
  "implant.rowsBody":
    "Varje rad är en passiv du kan sätta in själv på en färdig pal, eller använda för att ersätta en skräp-passiv ungen råkade få. Klicka för att lägga den bland de önskade – då räknar planen om sig och hoppar över att avla den.",

  // ── Manuellt läge ─────────────────────────────────────────────────────────
  "manual.title": "Manuellt läge",
  "manual.subtitle": "peka ut paret själv – vad kostar just de två?",
  "manual.pairChosen": "par valt",
  "manual.pickTwo": "välj två",
  "manual.intro":
    "Här väljer {you} föräldrarna, i stället för att planen letar bärare i boxen. Ta två ur boxen, eller bygg en förälder för hand – art plus de passiver du tänker att den ska ha – för att se vad en pal du {plan} att skaffa skulle vara värd.",
  "manual.introYou": "du",
  "manual.introPlan": "planerar",
  "manual.parent": "Förälder {n}",
  "manual.parentFromBox": "Förälder {n} · ur boxen",
  "manual.fromBox": "ur boxen",
  "manual.clear": "Rensa",
  "manual.change": "Ändra",
  "manual.pick": "Välj",
  "manual.noPassives": "Inga passiver – ungen kan då bara ärva den andres.",
  "manual.noneChosen": "Ingen vald. Ta en ur boxen eller bygg en för hand.",
  "manual.searchBox": "Sök art eller smeknamn…",
  "manual.passiveCount": "{n} passiver",
  "manual.noPal": "Ingen pal matchar sökningen.",
  "manual.orBuild": "…eller bygg för hand",
  "manual.gender": "Kön:",
  "manual.male": "♂ hane",
  "manual.female": "♀ hona",
  "manual.unknownGender": "vet inte",
  "manual.carriedPassives": "Passiver den bär",

  // ── Alternativ väg ────────────────────────────────────────────────────────
  "alt.label": "Du kan också göra såhär",
  "alt.saves": "~{n} ägg snabbare",
  "alt.versus": "{eggs} ägg mot planens {plan}",
  "alt.why":
    "Du har nu två {name} som tillsammans bär precis de önskade passiverna. Parar du dem med varandra samlas alla {n} på en {name} direkt",
  "alt.whyClean": " – och eftersom ingen av dem släpar med något annat kan ungen inte få skräp.",
  "alt.whyJunk": " – men {names} följer med in i arvspoolen.",
  "alt.whyChain": " Därifrån är det {n} steg till {target}.",
  "alt.whyTarget": " {name} är redan målarten.",
  "alt.assembly": "HOPSAMLING",
  "alt.withAll": "{name} med alla {n}",
  "alt.cleanPool": "ren pool",
  "alt.poolFromPartner": "+{n} i poolen från partnern",
  "alt.foot":
    "Uppskattningar, samma modell som planen ovan – jämförbara med varandra, men inte exakta, och som där är oddsen ”minst de önskade”. Vill du följa den här vägen i stället: byt inget i väljarna, den utgår från pals du redan äger.",

  // ── Save-panelen (etiketterna välkomstrutan pekar på) ─────────────────────
  "save.read": "Läs in från spelet",
  "save.folder": "Mapp",
  "save.live": "Live",
  "save.reading": "Läser saven…",
  "save.liveDot": "Live: läser om när spelet sparat",
  "save.failed": "Kunde inte läsa saven: {message}",
  "save.liveOff": "Live avstängt efter {n} misslyckade försök: {message}",
  "save.noFolder": "Mappen {root} finns inte.",
  "save.result":
    "Läste {total} pals ur {player}s värld · {added} nya · {removed} borta · sparad {exported}",
  "save.skipped": " · {n} poster hoppades över (ej pals)",

  "save.noneToWatch": "Hittade ingen Level.sav att bevaka.",
  "update.lostContact": "Tappade kontakten med servern under uppdateringen.",
  "save.whereTitle": "Var ligger saven?",
  "save.noneFound": "Hittade ingen Level.sav i den mappen.",
  "save.day": "dag {n}",
  "save.account": "konto {id}",
  "save.players": "{n} spelare",
  "save.savedAt": "sparad {time}",
  "save.watching": "Bevakar {path}",
  "save.locating": "Letar upp saven…",
  "save.folderHint":
    "Lämna tomt för spelets egen mapp. Peka annars ut mappen – en dedikerad server, en molnmapp eller en kopia. Både mappen och en Level.sav funkar.",
  "save.searching": "Söker…",
  "save.search": "Sök",
  "save.latestWorld": "Senast sparade världen",
  "save.latestWorldHint": "Följer med automatiskt om du byter värld",
  "save.found":
    "Hittade {n} världar. {latest} byter till den som sparats sist – spelar någon annan på datorn läses deras box in i stället. Välj en värld i listan så ligger valet fast.",
  "save.multiPlayer":
    "Den valda världen har {n} spelare. Appen läser {one} av dem – den vars spelarfil ligger först – så dennes Palbox blir ”Palbox” och övrigas boxar hamnar under ”Bas/övrigt”. Att välja spelare går inte än.",
  "save.multiPlayerOne": "en",
  "save.liveHint": " – läs om av sig själv när spelet sparat",

  // ── Meddelanden från servern (API-rutterna) ───────────────────────────────
  "api.noPath": "Ingen sökväg angiven.",
  "api.notLevelSav": "Sökvägen måste peka på en Level.sav.",
  "api.notAFile": "Sökvägen är inte en fil.",
  "api.noSaveAt": "Hittar ingen save på {path}:",
  "api.badPathField": "Fältet 'path' måste vara en sökväg till en Level.sav.",
  "api.badRootField": "Fältet 'root' måste vara en sökväg till en mapp.",
  "api.scanFailed": "Kunde inte söka efter saves.",
  "api.readFailed": "Kunde inte läsa save-filen.",
  "api.noMatchingPals": "Saven lästes men innehöll inga pals som matchar artlistan.",
  "api.packagedOnly":
    "Uppdatering går bara i den installerade appen, inte när den körs från källkoden.",
  "api.alreadyLatest": "Du kör redan den senaste versionen.",
  "api.noInstaller": "Utgåvan saknar installationsfil.",
  "api.noChecksums": "Utgåvan saknar kontrollsummor – uppdaterar inte utan dem.",
  "api.badDownloadHost": "Nedladdningen pekar utanför projektets utgåvor. Avbryter.",
  "api.noSumLine": "{sums} saknar rad för {asset}. Avbryter.",
  "api.badChecksum": "Kontrollsumman stämmer inte med utgåvan. Filen kastades.",
  "api.updateReady": "Uppdateringen är hämtad och kontrollerad. Appen startar om.",
  "api.badJson": "Ogiltig JSON i anropet.",
  "api.noSavInFolder": "Hittade ingen Level.sav i {folder}.",
  "api.noSavInDefault": "Hittade ingen Level.sav under %LOCALAPPDATA%\\Pal\\Saved\\SaveGames.",
  "api.saveNotInFolder": "Den valda save-filen ligger inte i {folder}.",
  "api.saveNotInDefault": "Den valda save-filen ligger inte i spelets save-mapp.",
  "api.writeFailed": "Kunde inte skriva pal-data.json:",
  "api.readFileFailed": "Kunde inte läsa {file}:",
  "api.loadingBox": "Laddar boxen…",
  "api.dataFailed": "Kunde inte läsa pal-datan: {error}",
  "api.noRelease": "Uppdateringar är inte påslagna i det här bygget.",
  "api.githubUnreachable": "Kunde inte nå GitHub. Är du uppkopplad?",
  "api.noReleases": "Hittade inga utgåvor att uppdatera till.",
  "api.githubRateLimit": "GitHub bad oss vänta lite. Försök igen om en stund.",
  "api.releaseNoVersion": "Utgåvan på GitHub saknar versionsnummer.",
  "api.noPython":
    "Hittar ingen Python. Installera Python 3 och kör: pip install palworld-save-tools",

  // ── Uppdateringsbandet ────────────────────────────────────────────────────
  "update.installing": "Uppdaterar till {version}.",
  "update.installingBody": " Appen stängs och öppnas igen av sig själv.",
  "update.available": "Version {version} finns.",
  "update.availableBody": " Du kör {current}",
  "update.size": " · {size} att hämta",
  "update.later": "Senare",
  "update.hide": "Dölj",
  "update.whatsNew": "Vad är nytt?",
  "update.downloading": "Hämtar…",
  "update.update": "Uppdatera",
  "update.release": "Hela utgåvan på GitHub",
  "update.check": "Sök efter uppdatering",
  "update.checking": "Söker…",
  "update.upToDate": "Senaste versionen ({version})",
  "update.foundNewer": "Version {version} finns",
  "update.checkFailed": "Kunde inte nå GitHub",
};
