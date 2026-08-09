/* The English catalogue is the SOURCE OF TRUTH.

   Every other language is typed as `Partial<Messages>` against this file, so
   adding a key here immediately tells you which catalogues are missing it —
   and a key that no longer exists here fails to compile everywhere else
   instead of lingering as dead translation.

   Keys are flat and dotted, grouped by the screen they belong to. Flat beats
   nested for two reasons: the fallback lookup is a single map read, and the
   coverage script can diff two key sets without walking a tree.

   Placeholders are `{name}`. A count-dependent message gets `.one`/`.other`
   siblings and is read with `t.plural`.

   Game nouns are deliberately NOT in here. Species names, passive names, work
   types and elements come from the dataset, which ships the game's own English
   strings — translating "Anubis" or "Legend" ourselves would put a name in the
   interface that the player cannot find in the game. */

export const en = {
  // ── App shell ─────────────────────────────────────────────────────────────
  "meta.title": "PalAssistent",
  "meta.description":
    "Palworld assistant built from Level.sav — box, breeding planner and recommendations",

  "nav.aria": "Main navigation",
  "nav.overview": "Overview",
  "nav.box": "Box",
  "nav.breeding": "Breeding",
  "nav.recommendations": "Recommendations",
  "nav.bestFor": "Best for…",
  "nav.player": "Player",
  "nav.noSave": "No save loaded",
  "nav.donate": "♥ Support the project",

  "header.world": "{name}'s world",
  "header.pals.one": "{n} pal",
  "header.pals.other": "{n} pals",
  "header.species.one": "{n} species",
  "header.species.other": "{n} species",

  // ── Theme and language controls ───────────────────────────────────────────
  "theme.aria": "Colour mode",
  "theme.light": "Light",
  "theme.auto": "Auto",
  "theme.dark": "Dark",
  "palette.aria": "Palette",
  "palette.named": "Palette: {name}",
  "palette.basalt": "Basalt",
  "palette.nightwood": "Nightwood",
  "palette.deepwater": "Deepwater",
  "language.aria": "Language",
  "language.named": "Language: {name}",

  // ── Footer legend ─────────────────────────────────────────────────────────
  "footer.source":
    "Data read from Level.sav · breeding per Palworld 1.0 · inheritance odds are estimates (the game's two-roll model; the weights are community-tested).",
  "footer.hover": "Passives are shown as in the game — {action} to see what it does:",
  "footer.hoverAction": "hover a banner",
  "footer.tier13": "Tier 1–3 (more arrows = higher)",
  "footer.tier4": "Legendary — animated (Legend, Lucky…)",
  "footer.tier5": "World Tree/rainbow tier",
  "footer.tierNeg": "Negative (Clumsy, Slacker…)",

  // ── Credits, licence and supporters ───────────────────────────────────────
  // The source link is how AGPL §13 is met in practice: anyone running a
  // modified copy as a service has to be able to reach the source from the UI.
  "credits.source": "Source code",
  "credits.thanks": "Thank you",
  "credits.support": "♥ Support on Ko-fi",
  "credits.supportHint": "Monthly support puts your name here — ask first, always.",

  // ── Shared pal vocabulary ─────────────────────────────────────────────────
  // Base Info is a 1:1 replica of the game's own panel, so its labels (LEVEL,
  // NEXT, SAN, Attack, Current Task…) stay in the game's English along with
  // species, passive, element and work names. Everything PalAssistent says in
  // its own voice is a key.
  "pal.lv": "Lv {n}",
  "pal.deck": "No.{n}",
  "pal.deckTitle": "Paldeck No.{n}",
  "pal.alpha": "Alpha",
  "pal.lucky": "Lucky",
  "pal.keep": "KEEP",
  "pal.condense": "CONDENSE",
  "pal.score": "Score",
  "pal.work": "Work suitability",
  "pal.noWork": "No work",
  "pal.workLv": "{name} Lv {n}",
  "pal.talent": "Talent (IV)",
  "pal.passives": "Passive skills",
  "pal.noPassives": "No passives",
  "pal.baseInfo": "Base Info",
  "pal.close": "Close",
  "pal.cellTitle": "{name} · Lv {lv} · IV {iv}",
  "pal.bestIv": "best IV {iv}",
  "pal.noKeepFlag": "No keep reason",

  // ── Passive hover card ────────────────────────────────────────────────────
  "ptip.noEffect": "The dataset describes no effect for this passive.",
  "ptip.carriers.one": "{n} in the box carries it",
  "ptip.carriers.other": "{n} in the box carry it",
  "ptip.noCarriers": "Nobody in the box carries it",
  // Owning one is read from the save and is exact; the module list is the
  // wiki's and provably incomplete, so it is phrased as "exists as", never as
  // a no. See implants.ts.
  "ptip.implants.one": " · you have {n} implant for it",
  "ptip.implants.other": " · you have {n} implants for it",
  "ptip.module": " · exists as an implant module",
  "ptip.equipment": " · sits on equipment, cannot be inherited",
  "ptip.derived": " · derived from the scoring data",

  // ── Overview ──────────────────────────────────────────────────────────────
  "overview.welcome.title": "Welcome to PalAssistent",
  "overview.welcome.sub": "The box is empty — the save has not been read yet.",
  "overview.welcome.read":
    "Click {action} at the top right. Your latest save is then looked up under {path} and the box fills with your own pals.",
  "overview.welcome.folder":
    "If the save lives somewhere else — a dedicated server, a cloud folder or a copy — point out the folder under {folder}. That is also where {live} lives, which keeps the box up to date by itself while you play.",
  "overview.welcome.readonly":
    "The save is always opened read-only, so Palworld can keep running.",

  "overview.star": "Star of the box",
  "overview.tile.total": "Pals in total",
  "overview.tile.species.one": "{n} species",
  "overview.tile.species.other": "{n} species",
  "overview.tile.keep": "Keep",
  "overview.tile.keepSub": "{n} can be condensed",
  "overview.tile.perfect": "Perfect IV",
  "overview.tile.rainbow": "Rainbow passive",
  "overview.tile.rainbowSub": "{n} pals with a gold passive",

  "overview.highlights.title": "Highlights in the box",
  "overview.highlights.sub":
    "Your most notable pals right now — the whole box is under the Box tab.",
  "overview.hl.score": "👑 Highest score",
  "overview.hl.attacker": "⚔️ Best attacker",
  "overview.hl.perfect": "💯 Perfect IV",
  "overview.hl.lucky": "✨ Best Lucky",
  "overview.hl.gold": "🏅 Most gold passives",
  "overview.hl.level": "📈 Highest level",
  "overview.hl.condensed": "⭐ Most condensed",
  "overview.hl.tough": "🛡️ Toughest",

  "overview.top.title": "Most specimens per species",
  "overview.top.sub": "Good condensing fuel — see the Recommendations tab.",

  // ── Box ───────────────────────────────────────────────────────────────────
  "box.search": "Search pal, nickname or passive…",
  "box.filter.all": "All",
  "box.filter.keep": "Keep",
  "box.filter.condense": "Condense",
  "box.filter.rainbow": "Rainbow",
  "box.filter.gold": "Gold passive",
  "box.filter.perfect": "Perfect IV",
  "box.filter.alpha": "Alpha/Lucky",
  "box.sort.score": "Sort: Score",
  "box.sort.iv": "Sort: IV",
  "box.sort.combat": "Sort: Combat power",
  "box.sort.level": "Sort: Level",
  "box.sort.species": "Sort: Species",
  "box.hits.one": "{n} hit",
  "box.hits.other": "{n} hits",
  "box.noMatch": "No pals match the filter.",
  "box.more": "Show more ({n} left)",

  // ── Passive tiers ─────────────────────────────────────────────────────────
  "tier.worldTree": "World Tree",
  "tier.legendary": "Legendary",
  "tier.numbered": "Tier {n}",
  "tier.negative": "Negative",
  "tier.unknown": "Unknown tier",

  // ── Why a pal is kept (scoring.ts) ────────────────────────────────────────
  "keep.rainbow": "Rainbow passive",
  "keep.gold": "{n} gold passives",
  "keep.goldIv": "Gold passive + high IV",
  "keep.synergy": "{n} passives for {purpose}",
  "keep.perfectIv": "Perfect IV 100/100/100",
  "keep.highIv": "High IV (average ≥90)",
  "keep.lucky": "Lucky ✨",
  "keep.condensed": "Condensed {n}★",
  "keep.bestOfSpecies": "Best of its species",
  "keep.inParty": "In the party",
  "keep.cleanCarrier": "Clean carrier of {names}",
  "keep.soleCarrier": "Only carrier of {name}",

  // ── Purposes (purpose.ts) ─────────────────────────────────────────────────
  "purpose.attack": "Combat",
  "purpose.attack.hint": "Bosses and raids — attack and element damage",
  "purpose.tank": "Tanky",
  "purpose.tank.hint": "Survives a long time — HP and defence",
  "purpose.work": "Base & work",
  "purpose.work.hint": "Works fast at the base — pick a task for species suggestions",
  "purpose.mount": "Mount",
  "purpose.mount.hint": "Gets you around fast — movement speed",
  "purpose.fishing": "Fishing",
  "purpose.fishing.hint": "Bigger catches (Palworld 1.0)",

  // ── Effects the dataset does not model (UNMODELLED in purpose.ts) ─────────
  "fx.stamina75": "Stamina +75 % (mounts only)",
  "fx.stamina50": "Stamina +50 % (mounts only)",
  "fx.stamina25": "Stamina +25 % (mounts only)",
  "fx.swim50": "Swim speed +50 %",
  "fx.swim40": "Swim speed +40 %",
  "fx.swim30": "Swim speed +30 %",
  "fx.jump2": "+2 jumps while riding",
  "fx.jump1": "+1 jump while riding",
  "fx.san20": "SAN drops 20 % slower — longer shifts",
  "fx.san15": "SAN drops 15 % slower",
  "fx.hunger20": "Hunger drops 20 % slower",
  "fx.hunger15": "Hunger drops 15 % slower",
  "fx.cooldown30": "Skill cooldown −30 %",
  "fx.cooldown15": "Skill cooldown −15 %",
  "fx.biggerCatch": "Bigger catch when fishing",
  "fx.workRank": "Raises the work rank one step",

  // ── Purpose picker ────────────────────────────────────────────────────────
  "purpose.taskAria": "Task",
  "purpose.cantWork":
    "{name} cannot do {work} at all (work level 0). The passive suggestions below only raise work speed — they do nothing for a species that lacks the task. Pick a species from the list instead.",
  "purpose.bestSpecies": "Best species for {work}",
  "purpose.bestSpeciesWhy":
    "Sorted by work level first — one level higher always beats a cheaper route. Click to set the species as the target.",
  "purpose.recommendedFor": "Recommended for {what}",
  "purpose.alreadyChosen": "Already chosen",
  "purpose.useThese": "Use these {n}",
  "purpose.elementNote":
    "Tailored to the element of {name} — boosts for the wrong element drop out.",
  "purpose.noCarriers":
    "Nobody in the box carries a passive that suits this purpose. Catch or breed a carrier first — the plan can only pass on what already exists.",
  "purpose.better": "Even better, but missing from the box",
  "purpose.inBox": "{n} in the box",
  "purpose.reachOwned": "OWNED",
  "purpose.reachCatch": "CATCH",
  "purpose.reachBreed": "BREED ×{n}",

  // ── "Good for…" (palUses in condense.ts) ──────────────────────────────────
  // `use.raw` passes a game noun (a work type) through untranslated, so every
  // label can be one type — a Msg — instead of "sometimes a key, sometimes text".
  "use.raw": "{text}",
  "use.combat": "Combat #{n}",
  "use.mount": "Mount #{n}",
  "use.fishing": "Fishing helper",
  "use.none": "Pure breeding pal",
  "use.best": "best in the box",
  "use.only": "only one in the box",
  "use.ranchCaveat":
    "The ranch gives the species' own product — the level only sets the pace, not what comes out.",

  // ── Recommendations ───────────────────────────────────────────────────────
  "reco.keep.title": "Keep these",
  "reco.keep.sub":
    "{n} pals the rules hold back from condensing, grouped by reason — a pal only appears in its first group. Expand and click a pal for Base Info. Recognise one from the queue below: find it here first.",
  "reco.keep.restTitle": "Best of its species (other)",
  "reco.keep.restWhy": "No distinguishing trait, but the best specimen of its species",

  "reco.group.rainbow": "Rainbow passive",
  "reco.group.rainbowWhy": "Tier 5 — can only be inherited, never rolled",
  "reco.group.perfectIv": "Perfect IV",
  "reco.group.perfectIvWhy": "100/100/100 — the starting point of every breeding line",
  "reco.group.gold": "Several gold passives",
  "reco.group.goldWhy": "Two or more legendary passives that are useful on the species",
  "reco.group.synergy": "Complete set",
  "reco.group.synergyWhy": "Three or more passives pulling the same way — a line to breed on",
  "reco.group.carrier": "Clean carrier",
  "reco.group.carrierWhy":
    "A top passive that is useful on the species, with no junk around it — every extra passive dilutes the inheritance pool",
  "reco.group.sole": "Only carrier",
  "reco.group.soleWhy":
    "The passive does not suit the species, but no other kept pal carries it — and passives can only be inherited",
  "reco.group.goldIv": "Gold passive + high IV",
  "reco.group.goldIvWhy": "One legendary passive that suits the species, and an IV sum of 240 or more",
  "reco.group.highIv": "High IV",
  "reco.group.highIvWhy": "Average 90 or more — good parents even without passives",
  "reco.group.lucky": "Lucky",
  "reco.group.luckyWhy": "Cannot be bred",
  "reco.group.condensed": "Already condensed",
  "reco.group.condensedWhy": "The stars are fed pals you will not get back",
  "reco.group.party": "In your party",
  "reco.group.partyWhy": "Comes along with you",

  "reco.band.todo": "To do now",
  "reco.band.value":
    "{species} species · feed {feed} pals · +{stars}★ · {slots} slots back",
  "reco.band.dupes": "{dupes} duplicates out of {total} pals in the box",

  "reco.queue.title": "Condense",
  "reco.queue.sub": "One step per row, biggest gain first. Click a row for the details.",
  "reco.queue.why": "Why condense — and what it costs",
  "reco.queue.nothing":
    "Nothing to condense right now — no species has enough duplicates for another star.",
  "reco.queue.showFirst": "Show only the first {n}",
  "reco.queue.showAll": "Show all {n} species",
  "reco.queue.count": "{n} pcs",

  "reco.head.species": "Species",
  "reco.head.becomes": "Becomes",
  "reco.head.feed": "Feed",
  "reco.head.slots": "Slots",
  "reco.head.watch": "Watch out",

  "reco.row.youKeep": "You keep",
  "reco.row.itGives": "It gives",
  "reco.row.baseInfo": "Show Base Info",
  "reco.row.keeperBaseInfo": "Show Base Info for the specimen you keep",
  "reco.row.fact": "+{pct} % to HP, attack and defence · {slots} slots freed",
  "reco.row.leftover": " · {n} duplicates left over",
  "reco.row.nextStar": "Then towards {n}★",
  "reco.row.misfit": "Does not suit the species: {names}",
  "reco.row.misfitWhy":
    "The passives do nothing for what the species is actually used for — but they still sit in the inheritance pool and lower the odds",

  "reco.wait.title": "Almost there",
  "reco.wait.sub":
    "A few more pals and it works. Duplicates will do — it is the count that matters, not the quality.",
  "reco.wait.none": "No species is close to its next star.",
  "reco.wait.needs": "needs {n} → {star}★",
  "reco.wait.already": "already {n}★",
  "reco.wait.has": "Has {have} of {need}",
  "reco.wait.rowTitle": "{name}: has {have} duplicates of {need} — click for Base Info",
  "reco.wait.farTitle": "Far off or already maxed",
  "reco.wait.farCount": "({n} species)",
  "reco.wait.farWhy": "The duplicates do not reach the next star — they just take up space",

  "reco.why.what": "What condensing does:",
  "reco.why.body":
    "you feed duplicates into {one} specimen in the Pal Essence Condenser. What you feed disappears from the box forever — its passives and IVs can only be inherited, never recovered. What you keep gains one star per completed level and becomes permanently stronger: {gain}. Passives and IVs on the one you keep do {not} change — condensing makes a good pal stronger, never a mediocre pal good.",
  "reco.why.one": "one",
  "reco.why.not": "not",
  "reco.why.gain": "≈ +5 % HP, attack and defence per star",
  "reco.why.work": " In addition, work suitability rises:",
  "reco.why.workBody":
    "every rank lifts {one} of the pal's existing tasks one step, and full rank lifts them all. That is the road from level 8 to the game's cap of 10 — together with the Applied Technique books (+1 permanent, one per task) and work auras.",
  "reco.why.cost": "Cost per star: {ladder} — cumulative, not a total.",
  "reco.why.preOne": "NOTE: those figures are pre-1.0.",
  "reco.why.preOneBody":
    "Palworld 1.0 lowered full condensing to 48 pals in total, but the split per star has not been published. Your Condenser shows the exact figure for the next rank — say the word and this page gets corrected.",

  "condense.noteGold":
    "{n} carry a gold or rainbow passive — passives can only be inherited, never rolled.",
  "condense.noteIv":
    "{n} have a 100 in one stat — building blocks in a 100/100/100 line, not just fodder.",
  "condense.noteBetter":
    "The best IV in the species is {best}, not {keeper} — condense on the one you intend to use.",
  "condense.noteLast":
    "The last specimen will be left alone — the species then cannot be bred with itself.",

  // ── Best for… ─────────────────────────────────────────────────────────────
  "best.own.owned": "OWNED",
  "best.own.catch": "CATCH",
  "best.own.mustCatch": "MUST BE CAUGHT",
  "best.own.breedShort": "BREED ×{n}",
  "best.own.breed.one": "CAN BE BRED · {n} pairing",
  "best.own.breed.other": "CAN BE BRED · {n} pairings",
  "best.planTitle": "Click for a breeding plan",
  "best.lookLike": "This is how they should look",

  "best.attack.title": "Attack team (boss/raid)",
  "best.attack.sub":
    "Top 5 from your box by combat power (species scaling × ATK IV × attack passives), with element spread.",
  "best.attack.loadoutSub":
    "Four passives per pal, tailored to the species' element. A filled banner = it already has it. Click for a breeding plan that fills the gaps.",
  "best.attack.why": "{element} · power {n}",
  "best.attack.label": "Combat · power {n}",
  "best.attack.top15": "Top 15 attackers you own",
  "best.attack.allElements": "(all elements)",
  "best.attack.row": "Power {power} · ATK IV {iv} · Lv {lv}",
  "best.attack.global": "Best attackers in the game — including ones you do not own",
  "best.attack.clickHint": "(click for a breeding plan)",
  "best.attack.scaling": "ATK scaling {n}",
  "best.attack.stats": "{atk} ATK · {hp} HP",
  "best.attack.ultimate":
    "Want to build the ultimate attacker? Click a pal above and pick passives such as {passives}.",
  "best.attack.ultimateList": "Legend + Musclehead + Vanguard + an element boost",

  "best.crew.title": "Base dream team",
  "best.crew.sub":
    "The smallest crew from your box that covers every work type at the highest levels (🌙 = works at night too).",
  "best.crew.loadoutSub":
    "Work speed is all that counts at the base — except for Farming, where Farmhand and Ranch Master raise the work rank itself.",
  "best.crew.label": "{work} level {n}",
  "best.crew.inBox": "in the box — place it out",
  "best.crew.own": "Best workers per task — from your box",
  "best.crew.global": "Best workers in the game — including ones you do not own",

  "best.ranch.title": "The ranch — who lays what",
  "best.ranch.sub":
    "The ranch is the only task where {species}: every species lays its own product, and the Farming level only says how fast it arrives. Look for the product you need — not for the highest number.",
  "best.ranch.subEmph": "the species decides the value",
  "best.ranch.place": "Put it in the ranch — click for a breeding plan",
  "best.ranch.levelTitle": "Farming level = the pace, not the product",
  "best.ranch.unknown": "Product unknown for {n} species",
  "best.ranch.unknownBody":
    " — our table is hand-curated and the game's data contains no ranch product to read: {names}. Tell us what they lay and the list grows; until then we would rather not guess.",

  "fish.gloopie": "The catch meter drains 12–35 % slower",
  "fish.whalaska": "Higher starting point + extra progress on overlap",
  "fish.whalaskaIgnis": "A stronger Whalaska + rideable on water",
  "fish.solmora": "Easier to fish up pals with high talent (IV)",
  "fish.solmoraLux": "A stronger Solmora + an electric water mount",
  "fish.jelliette": "Items from fishing +55–95 %",
  "fish.jellroy": "Items from salvaging +55–95 %",

  "best.fishing.title": "🎣 Fishing helpers",
  "best.fishing.sub": "Pals with partner skills that improve fishing (Palworld 1.0).",

  "best.mount.title": "🐎 Fastest mounts",
  "best.mount.sub": "Sprint speed × Swift/Runner passives, best specimen per species.",
  "best.mount.loadoutSub": "Movement passives — the only ones that actually affect sprint speed.",
  "best.mount.why": "sprint {n}",
  "best.mount.label": "Mount · sprint {n}",

  // ── Loadout card ──────────────────────────────────────────────────────────
  "loadout.has": "has it",
  "loadout.missing": "missing",
  "loadout.carriers.one": "{n} carrier in the box",
  "loadout.carriers.other": "{n} carriers in the box",
  "loadout.noCarrier": "nobody in the box carries it",
  "loadout.perfect": "Has the whole set.",
  "loadout.noneForRole": "No suggestions for this role",
  "loadout.overSubscribed":
    "All {n} are worth a slot, but the game only gives four — pick which one to skip yourself.",
  "loadout.alsoCarries": "Also carries",
  "loadout.alsoCarriesTail": " — good for the role, but does not fit among four.",
  "loadout.junk": "Useless in this role:",
  "loadout.junkTail":
    " — lands in the inheritance pool and lowers the odds when you breed on it.",
  "loadout.planMissing.one": "Plan breeding for the missing one",
  "loadout.planMissing.other": "Plan breeding for the {n} missing",

  // ── Shortcuts ("catch this instead") ──────────────────────────────────────
  "shortcut.title": "Shortcut",
  "shortcut.catchMale": "Catch a male {name} with no passives",
  "shortcut.catchFemale": "Catch a female {name} with no passives",
  "shortcut.catchAny": "Catch a {name} with no passives",
  "shortcut.common": "Common species — found in the wild.",
  "shortcut.rare": "Rare, but the gain is worth the hunt.",
  "shortcut.required": "required",
  "shortcut.saves": "−{n} eggs",
  "shortcut.foot":
    "A wild pal with no passives keeps the inheritance pool small. Catching one takes minutes — hatching past the difference takes considerably longer.",
  "shortcut.shorterPath":
    "There is a route of {steps} steps instead of {now}, but your {name} drags junk passives along. A clean one makes the short route cheapest.",
  "shortcut.onlyMales": "The pair cannot breed — you only have males of the species.",
  "shortcut.onlyFemales": "The pair cannot breed — you only have females of the species.",
  "shortcut.junkPartner":
    "Your {name} carries {n} passives you do not want — they land in the pool every time.",

  // ── Breeding: the planner's own prose ─────────────────────────────────────
  "breed.savedHint": "Your choices are saved — you can visit the Box and come back without losing the plan.",
  "breed.clearAll": "Clear all",
  "breed.pickWantedFirst": "Pick the wanted passives above — those are what the pair has to reach.",
  "breed.targetTitle": "Target pal",
  "breed.targetSub": "Which species do you want to end up with? Species you already own come first.",
  "breed.baseFrom": "Base to start from:",
  "breed.freeMode": "free mode",
  "breed.freeModeCap": "Free mode",
  "breed.baseHint":
    "Pick a species you own if the chain should start there. In free mode the app looks for the shortest route from the whole box.",
  "breed.ivGoalLabel": "IV goal:",
  "breed.ivFastHint":
    "Picks the parents with the best IV average among the ones you own — a good result right away.",
  "breed.ivPerfectHint":
    "Picks parents by their weakest stat, so all three can reach 100. Expect more hatching.",
  "breed.passivesFirst":
    " Passives always come first: the cleanest possible parent wins over IV.",
  "breed.goalTitle": "Goal picture",
  "breed.goalSub":
    "This is what the pal looks like when the plan is done — the species you picked with exactly these passives.",
  "breed.wantedTitle": "Wanted passives",
  "breed.wantedSub":
    "Pick what the pal is for and the app suggests passives — or click them out yourself. The number is how many carriers are in the box.",
  "breed.remove": "Remove",
  "breed.noneChosen": "None chosen — e.g. Legend, Musclehead, Swift",
  "breed.emptyState":
    "Pick a target pal and/or wanted passives above. Example: target {target} + passives {passives} → a complete plan with odds per step.",

  "exact.least": "at least",
  "exact.exact": "exactly",
  "exact.lead": "The odds above are the chance that the child gets {least} the wanted passives.",
  "exact.noRoom":
    "With four wanted there is no free slot left, so {exact} is the same thing as {least} — get four right and no junk can come along.",
  "exact.tradeoff":
    "If you want {exact} those and nothing more, the last step is {odds} ({eggs}), because the game rolls in at least one extra passive in {pct} % of all eggs — regardless of how clean the pool is. It cannot be bred away, only hatched past.",

  // ── Manual pair result ────────────────────────────────────────────────────
  "manres.noChild": "Those two cannot breed.",
  "manres.noChildBody":
    "{a} × {b} has no child in the breeding table — legendaries only breed with their own species.",
  "manres.bothMale": "Both are male.",
  "manres.bothFemale": "Both are female.",
  "manres.sameGenderBody":
    "Swap one of them, or set the gender to {unknown} if you are going to get the specimen anyway.",
  "manres.missing": "The pair cannot give all the wanted ones.",
  "manres.neitherCarries": "neither of them carries:",
  "manres.inherit": "inherited",
  "manres.missingBody":
    "Passives can only be {inherit} — the child can never get one that no parent has. The game can roll one in, but it is drawn from the whole passive table, so that is luck and not a plan. Add a parent that carries them, or implant them afterwards.",
  "manres.eggsWord": "eggs",
  "manres.gives": "gives a pal with all {n} wanted for {eggs}",
  "manres.pool": "The inheritance pool is {n} passives",
  "manres.poolJunk": " — of which {n} are junk, and that is what costs",
  "manres.direct":
    "Directly in one step would be {pct} per egg = ≈{eggs} eggs, so going in stages is cheaper here: one clean child at a time shrinks the pool before the last step.",
  "manres.oneStep": "A single step is enough — the pool is too small for a detour to pay off.",
  "manres.stepHint": "Pool {pool} · ≈{eggs} eggs",
  "manres.stepGender": " · +≈{n} for the right gender",
  "manres.cleanWord": "clean",
  "manres.stepClean": "a {clean} child is required, otherwise the next pool grows",
  "manres.stepLast": "last step, junk may come along",
  "manres.fromPair": "from the pair, the child should carry:",
  "manres.fromSteps": "from step {a} + {b}:",

  // ── Implant advice box ────────────────────────────────────────────────────
  "imp.use": "Use the implants",
  "imp.useBody.one": " — do not count it in the inheritance pool",
  "imp.useBody.other": " — do not count them in the inheritance pool",
  "imp.useCount": ", the plan breeds {n} of {total}",
  "imp.notPerfect": "The egg does not have to be perfect",
  "imp.youHaveFor.one": " — you have an implant for one of them",
  "imp.youHaveFor.other": " — you have implants for {n} of them",
  "imp.inStash": "in your stash:",
  "imp.moduleNotOwned": "exists as a module, but you do not own it:",
  "imp.moduleExists": "exists as an implant module:",
  "imp.mustBreed": "has to be bred:",
  "imp.caseMissing": "Missing {name}?",
  "imp.doneAnyway": "done anyway",
  "imp.finished": "finished",
  "imp.caseMissingBody":
    "The child is {ok}, not a failure — implant it on the {finished} pal, so the passive never lands in the inheritance pool and you do not have to breed more.",
  "imp.caseJunk": "Got a junk passive instead?",
  "imp.caseJunkBody":
    "Replace it — the table overwrites a slot you choose, and {pct} of all eggs get a random passive anyway, so the slot is usually already taken by something you do not want.",
  "imp.casePartial": "Only got some of them?",
  "imp.casePartialKeep": "Keep the child, do not feed it",
  "imp.casePartialBody": " — it is a finished base you top up at the table whenever you like.",
  "imp.counted": "Counted:",
  "imp.countedOn": "the plan breeds",
  "imp.countedOff": "with the checkbox on the plan would breed",
  "imp.countedBody":
    "{left} of {total} wanted, and the last step goes {from} → {to} per egg = {saving}.",
  "imp.fewerEggs": "~{factor} fewer eggs",
  "imp.alsoModules.one": "Get the module as well:",
  "imp.alsoModules.other": "Get the modules as well:",
  "imp.possible": "possible",
  "imp.fine":
    "The table requires technology level 38 and every operation costs gold, so this box answers whether it is {possible} — not whether the gold is worth it.",

  // ── IV plan ───────────────────────────────────────────────────────────────
  "iv.junk": "+{n} junk",
  "iv.ownNone":
    "You own no {name} yet, so there is nothing to breed with. Follow the species path below first — and already there, aim for parents with high IVs, because the child inherits their stats.",
  "iv.sub":
    "Every stat is inherited separately: 30 % from the father, 30 % from the mother, 40 % completely rerolled. That is why the 100s can be gathered together — the figures are estimates.",
  "iv.oneGender":
    "You only have one gender of {name}. Get another of the opposite gender — without ♂+♀ the species cannot be bred on.",
  "iv.best": "best: {name} {g} · IV {iv}",
  "iv.mustReroll": "has to be rerolled (≈1 % per egg)",
  "iv.gapLead":
    "None of your {name} has 100 in {stats}. That stat can only come from the 40 % reroll — about one egg in a hundred — which is what makes the plan below expensive.",
  "iv.and": "and",
  "iv.donorLead":
    "Shortcut: breed in a 100 from outside. These species carry it {and} breed back to {name}, so the line keeps its species:",
  "iv.andWanted": " and all the wanted passives",
  "iv.noMoreBreeding": "No more breeding needed.",
  "iv.noneCarries": "None of your {name} carries",
  "iv.mustImport":
    "It has to be brought in from another species first — see the passive plan below. The plan here only counts what can actually be inherited within the species.",
  "iv.shortestPath": "Shortest path · {n} steps",
  "iv.pathHint":
    "Every step pairs two individuals and you keep the child that got everything in the box. The order is computed: merging two clean carriers first and weaving the passives in late is nearly always cheaper than starting from a pal that already has a lot — every extra passive a parent carries lands in the inheritance pool.",
  "iv.keepChild": "Keep the child with {state}. Odds:",
  "iv.ofWhichGender": "Of which ~{n} eggs to hit the right gender.",
  "iv.sharedClutch":
    "Same parent pair as step {steps} — one clutch gives both children, so the cost is shared.",
  "iv.totalOver": "in total over {n} steps",
  "iv.directOneStep": "Directly in one step",
  "iv.bestPairNow": "the best pair you can put together right now",
  "iv.stagewise": "to go in stages",
  "iv.footGender": "Gender counts",
  "iv.footClutch": "the same clutch",
  "iv.foot":
    "Estimates. {gender}: a child from an earlier step that must have a specific gender costs twice as much on average, because gender is random. Steps that share a parent pair also take their children from {clutch} and are therefore counted only once.",
  "iv.noPath": "No path was found within the species. That is nearly always because you only own one",
  "iv.separateEmph": "separately",
  "iv.separate":
    "IVs and passives are rolled {apart} — a child with the right passives can have terrible IVs and vice versa. The plan above takes both into account at once and puts the passives in the step where they cost the least, instead of always taking them first.",

  // ── Passive plan ──────────────────────────────────────────────────────────
  "pp.title": "Passive plan",
  "pp.sub":
    "How you gather the passives before (or while) you change species. Odds = the chance that the child inherits all the wanted ones in that step — extra passives can come along, see the note under the plan.",
  "pp.givesAll": "Gives all {n} wanted",
  "pp.givesSome": "Gives {n} of {total} wanted",
  "pp.savesSteps": "Saves {n} carrier steps.",
  "pp.unmarkedJunk": "The unmarked ones come along into the inheritance pool and lower the odds.",
  "pp.alternatives": "Alternatives in the box:",
  "pp.nobodyHasIt":
    "Nobody in the box has this — cannot be planned (only a random mutation at hatching).",
  "pp.keepClean": "Keep the line clean.",
  "pp.combined": "combined",
  "pp.only": "only",
  "pp.keepCleanBody":
    "The child inherits from the parents' {combined} passive pool, so every extra passive a parent carries competes with the ones you want. If you want a pal with {only} {n} passives, always pick a parent that carries as few others as possible — preferably one that only has the wanted one.",
  "pp.threePlus":
    "With {n} wanted, a single junk passive is enough to multiply the number of eggs, so a “worse” pal without junk nearly always beats a strong one with extra passives.",
  "pp.noneInBox": "None of the wanted passives are in the box yet.",
  "pp.allOnOne": "All chosen passives are already on {pal} — go straight to the species phase below.",
  "pp.phase1": "Phase 1 · Gather the passives ({n} carriers)",
  "pp.pairwise": "Pair them two by two.",
  "pp.twoWord": "two",
  "pp.pairwiseBody":
    "The last step costs the same however you get there — the pool is your {n} wanted either way. The difference is the road there: building a parent with three passives first (~3 eggs) is more expensive than building {two} parents with two passives each (~2 eggs apiece). That is why the plan merges the carriers pairwise and meets in the middle.",
  "pp.orderWhole": "The order is chosen on the whole plan, not on phase 1.",
  "pp.theTarget": "the target",
  "pp.detourA": "~{cheap} eggs here instead of",
  "pp.detourAEnd": "further from {target}.",
  "pp.detourB":
    "The carriers can be merged in several ways that cost the same here, but they land in different species — this one ends up closest to {target}.",
  "pp.detourSaves": "The route below saves {eggs} in total, because the species chain afterwards is shorter.",
  "pp.bothMale": "Both are male — the pair cannot breed. Get one of the opposite gender, or use another carrier.",
  "pp.bothFemale": "Both are female — the pair cannot breed. Get one of the opposite gender, or use another carrier.",
  "pp.hatchUntil": "Hatch until you get a child with exactly this — preferably without junk.",
  "pp.needsGender": "The child also needs a specific gender here, which costs ~{n} extra eggs on average.",
  "pp.stepGoal": "Goal in the step: a child with",
  "pp.carrierInStep": "Carrier in the step",
  "pp.carrier": "CARRIER",
  "pp.impossiblePair":
    "breed {name} with its own species and use the offspring, or pick another carrier of the passive.",
  "pp.noChain":
    "Found no chain from {from} to {to} with your owned pals as partners — try free mode below.",
  "pp.longerOnPurpose": "A longer route on purpose.",
  "pp.longerBody":
    "There is a chain of only {short} steps, but it goes via a partner that drags junk passives along and costs {shortEggs}. The route below takes {long} steps and {longEggs} — one more step with clean partners is nearly always cheaper than a short one with a dirty partner.",
  "pp.partnerSameGender":
    "The partner has the same gender as the line — the pair cannot breed. Switch to",
  "pp.childKeeps": "The child should keep",
  "pp.total": "Total: ~{n} eggs",
  "pp.totalExpected": "expected for the whole plan,",
  "pp.totalTip":
    "Tip: keep junk passives out of the line — every extra passive in the pool lowers the odds.",

  // ── Species path ──────────────────────────────────────────────────────────
  "sp.title": "Species path to {name}",
  "sp.alreadyOwn": "You already own {name} — best specimen:",
  "sp.directCombos": "{n} direct combos with pals you own",
  "sp.showingEight": " — showing the 8 best",
  "sp.parents": "Parents:",
  "sp.partner": "Partner:",
  "sp.genderRandom": "(the child's gender is random — hatch until you get the opposite gender to the partner)",
  "sp.baseIsTarget": "The base is already the target.",
  "sp.noChainIn10": "No chain found within 10 steps — try free mode.",
  "sp.shortestFree": "Shortest path (free mode)",
  "sp.unreachable":
    "{name} cannot be reached by breeding from your box — some pals (legendaries and others) can only be obtained from two of the same species. Catch one first.",
  "sp.ownedNoBreeding": "Already owned — no breeding needed for the species itself.",

  // ── Breeding: shared units and warnings ───────────────────────────────────
  // ── Time and IV wording shared by the planner ─────────────────────────────
  "time.seconds": "{n} s",
  "time.minutes": "{n} min",
  "time.minutesSeconds": "{m} min {s} s",
  "time.hours": "{n} h",
  "time.days": "{n} d",
  "time.daysHours": "{d} d {h} h",
  "iv.noHundreds": "no 100s",
  "iv.impossible": "in practice impossible",

  "eggs.approx": "~{n} eggs",
  "pair.needBothGenders": "no ♂+♀ — breed or catch one more of the species",
  "breed.perEgg": "{odds} / egg",
  "breed.yourLine": "YOUR LINE",
  "breed.stepN": "STEP {n}",
  "breed.ivFast": "Fast optimal",
  "breed.ivPerfect": "Perfect 100/100/100",

  // ── Pickers ───────────────────────────────────────────────────────────────
  "ui.show": "Show",
  "ui.hide": "Hide",
  "picker.onlyMine": "Only mine",
  "picker.showAll": "Show all",
  "picker.groupWorldTree": "World Tree",
  "picker.groupLegendary": "Legendary",
  "picker.groupCommon": "Common",
  "picker.groupNegative": "Negative",
  "picker.searchSpecies": "Search species, element or No.…",
  "picker.youOwn": "You own the species",
  "picker.noSpecies": "No species matches the search.",
  "picker.searchPassive": "Search passive…",
  "picker.showAllTitle": "Also include passives nobody in the box carries",
  "picker.chosenOf": "{n}/{max} chosen · {total} to pick from",
  "picker.noPassive": "No passive matches the search.",
  "picker.noCarrierMatch":
    "No carrier in the box matches — turn on “Show all” to see the rest.",
  "picker.implantsFor": "You have {n} implants for {name}",

  // ── Which specimen is it (PalIdent) ───────────────────────────────────────
  "ident.container": "{name} · slot {slot}",
  "ident.palbox": "Palbox · box {box}, row {row} square {col}",
  "ident.slotTitle": "Computed from the slot in the save file (30 pals per box)",
  "ident.wanted": "one of the ones you want",

  // ── Goal card ─────────────────────────────────────────────────────────────
  "goal.pickSpecies": "Pick the species you are aiming for in the grid above — the picture fills in here.",
  "goal.done": "Done — {pal} already meets the goal.",
  "goal.ownNone": "You own none yet. The species path further down shows how to get one.",
  "goal.owned": "{n} in the box · {rest}",
  "goal.noneComplete": "none of them has all the wanted passives yet",
  "goal.pickPassives": "pick the passives on the right",
  "goal.noSpecies": "No species chosen",
  "goal.passives": "Passive skills · goal",
  "goal.emptySlot": "empty slot",
  "goal.ivGoal": "Talent · IV goal",
  "goal.ivFastHint": " — the best IV average among your parents, no hunting for 100s.",

  // ── Breeding setup (the rate panel) ───────────────────────────────────────
  "setup.title": "Breeding setup",
  "setup.perEgg": "≈{time} per egg",
  "setup.todo": "{n} left",
  "setup.full": "full setup",
  "setup.ownedN": "OWNED ×{n}",
  "setup.moveTo": "move {where}",
  "setup.planSpecies": "Plan {name}",
  "setup.atBase": "At the base",
  "setup.atBaseTag": "AT THE BASE",
  "setup.inParty": "In the party",
  "setup.inPartyTag": "IN THE PARTY",
  "setup.capFree": "without touching the odds",
  "setup.cap":
    "The ceiling {free} is {rate} = ≈{time} per egg: a 4★ Braloha at the base and Grintale in the party. Philanthropist on both parents takes it to {capRate} (≈{capTime}) but sits in the inheritance pool — see the bottom.",
  "setup.bralohaNone": "Gives {now} straight away, {max} at 4★.",
  "setup.bralohaReach":
    "Now {now} — your {dupes} duplicates are enough for {star} and {then}.",
  "setup.bralohaNow": "Gives {now}",
  "setup.bralohaAtFour": " · {max} at 4★.",
  "setup.hatching": "hatching",
  "setup.dynamoff":
    "Shortens the {hatch} in the incubator, not the farm's timer — which is why it sits outside the rate above. {now} straight away, {max} at 4★. Most useful together with Grintale: more eggs are only more eggs if the incubators keep up.",
  "setup.ownRoll": "passive roll of its own",
  "setup.grintale":
    "Every egg you pick up has a {chance} chance of giving an extra one, so {more} from the same pair. The extra egg is a {roll}, so it counts fully in the plan's figures. Flat — no star scaling — and does not stack with more Grintale.",
  "setup.alphaEgg": "alpha egg",
  "setup.broncherryAqua": "Chance that an egg you pick up becomes an {alpha}: {now} → {max} at 4★.",
  "setup.broncherry":
    "Same thing, weaker: {now} → {max} at 4★. Neither stacks with itself.",
  "setup.moreEggs": "{factor} more eggs",
  "setup.fasterRate": "{factor} faster",
  "setup.passivesGroup": "Passives on the two you pair — buys rate with odds",
  "setup.theTwo": "the two you put in the breeding farm",
  "setup.pool": "inheritance pool",
  "setup.costSomething": "cost something",
  "setup.passivesLead":
    "The two here sit on {two}, that is, the parents in the plan's steps — not on Braloha or anyone in the party. And since everything a parent carries lands in the {pool}, they are the only ones in this panel that {cost}.",
  "setup.yourOne": "your only wanted passive",
  "setup.yourMany": "your {n} wanted passives",
  "setup.poolNone":
    "You have no wanted passives, so nothing of it gets in the way: net {net}. If you are only chasing {iv} it is free — IVs are inherited independently of passives.",
  "setup.poolTrade":
    "The last step goes {clean} → {dirty} per egg, that is {eggs}, against {speed} rate.",
  "setup.poolNotWorth": "Not worth it with {yours}.",
  "setup.poolNotWorthBody":
    "It sits on the two you pair, that is, in the inheritance pool, and there it is junk.",
  "setup.threeOrFewer": "three wanted or fewer",
  "setup.poolNotWorthTail":
    "Net {net} — leave it alone. It pays off at {three}, and is free in a pure IV hunt.",
  "setup.poolWorth": "Worth it with {yours}:",
  "setup.poolWorthNet": "net {net}.",
  "setup.four": "four",
  "setup.poolWorthTail": "At {four} wanted it turns into a loss — the pool gets too crowded.",
  "setup.carriersAnyway": "You have {n} carriers in the box if you want to anyway.",
  "setup.noCarrier": "No carrier in the box — it has to be caught or bred first.",
  "setup.nightShift": "night shift",
  "setup.nocturnalCost": "costs the same pool slot as Philanthropist",
  "setup.nocturnal":
    "The pair does not pause when night falls. The effect is uptime, not rate, so it is not in the figure above — but it is real, and biggest if you sleep when the game does. It {cost} and therefore shares its arithmetic: worth it when you aim for few passives, not when you aim for four.",
  "setup.carriers": "You have {n} carriers.",
  "setup.noEffectTitle": "Does not affect breeding time:",
  "setup.parents": "the parents",
  "setup.noEffectBody":
    "Artisan, Work Slave, Serious and Lucky, Statue of Power, food buffs — and condensing {parents}. They speed up crafting and gathering. The only condensing that makes a difference is Braloha's own.",

  // ── Implant stash ─────────────────────────────────────────────────────────
  "implant.title": "Implants",
  "implant.subtitle": "inserted into a finished pal — costs no eggs",
  "implant.inStash": "in the stash",
  "implant.empty": "empty",
  "implant.picked": "chosen",
  "implant.noneBody":
    "You have no implants right now. They are inserted with the Pal Surgery Table (technology level 38) and put a passive on a finished pal — that is, after breeding, so it never lands in the inheritance pool and costs not a single egg. Find one for a passive you are chasing and you do not have to breed it.",
  "implant.rowsBody":
    "Every row is a passive you can insert yourself on a finished pal, or use to replace a junk passive the child happened to get. Click to add it to the wanted ones — the plan then recomputes and skips breeding it.",

  // ── Manual mode ───────────────────────────────────────────────────────────
  "manual.title": "Manual mode",
  "manual.subtitle": "point out the pair yourself — what do those two cost?",
  "manual.pairChosen": "pair chosen",
  "manual.pickTwo": "pick two",
  "manual.intro":
    "Here {you} choose the parents, instead of the plan looking for carriers in the box. Take two from the box, or build a parent by hand — species plus the passives you intend it to have — to see what a pal you {plan} to get would be worth.",
  "manual.introYou": "you",
  "manual.introPlan": "plan",
  "manual.parent": "Parent {n}",
  "manual.parentFromBox": "Parent {n} · from the box",
  "manual.fromBox": "from the box",
  "manual.clear": "Clear",
  "manual.change": "Change",
  "manual.pick": "Pick",
  "manual.noPassives": "No passives — the child can then only inherit the other one's.",
  "manual.noneChosen": "None chosen. Take one from the box or build one by hand.",
  "manual.searchBox": "Search species or nickname…",
  "manual.passiveCount": "{n} passives",
  "manual.noPal": "No pal matches the search.",
  "manual.orBuild": "…or build by hand",
  "manual.gender": "Gender:",
  "manual.male": "♂ male",
  "manual.female": "♀ female",
  "manual.unknownGender": "don't know",
  "manual.carriedPassives": "Passives it carries",

  // ── Alternative route ─────────────────────────────────────────────────────
  "alt.label": "You could also do it this way",
  "alt.saves": "~{n} eggs faster",
  "alt.versus": "{eggs} eggs against the plan's {plan}",
  "alt.why":
    "You now have two {name} that together carry exactly the wanted passives. Pair them with each other and all {n} gather on one {name} straight away",
  "alt.whyClean": " — and since neither drags anything else along, the child cannot get junk.",
  "alt.whyJunk": " — but {names} come along into the inheritance pool.",
  "alt.whyChain": " From there it is {n} steps to {target}.",
  "alt.whyTarget": " {name} is already the target species.",
  "alt.assembly": "ASSEMBLY",
  "alt.withAll": "{name} with all {n}",
  "alt.cleanPool": "clean pool",
  "alt.poolFromPartner": "+{n} in the pool from the partner",
  "alt.foot":
    "Estimates, same model as the plan above — comparable with each other, but not exact, and as there the odds are “at least the wanted ones”. Want to follow this route instead: change nothing in the pickers, it starts from pals you already own.",

  // ── Save panel (labels the Overview welcome box points at) ────────────────
  "save.read": "Read from the game",
  "save.folder": "Folder",
  "save.live": "Live",
  "save.reading": "Reading the save…",
  "save.liveDot": "Live: re-reads when the game has saved",
  "save.failed": "Could not read the save: {message}",
  "save.liveOff": "Live switched off after {n} failed attempts: {message}",
  "save.noFolder": "The folder {root} does not exist.",
  "save.result":
    "Read {total} pals from {player}'s world · {added} new · {removed} gone · saved {exported}",
  "save.skipped": " · {n} entries skipped (not pals)",

  "save.noneToWatch": "Found no Level.sav to watch.",
  "update.lostContact": "Lost contact with the server during the update.",
  "save.whereTitle": "Where is the save?",
  "save.noneFound": "Found no Level.sav in that folder.",
  "save.day": "day {n}",
  "save.account": "account {id}",
  "save.players": "{n} players",
  "save.savedAt": "saved {time}",
  "save.watching": "Watching {path}",
  "save.locating": "Locating the save…",
  "save.folderHint":
    "Leave empty for the game's own folder. Otherwise point out the folder — a dedicated server, a cloud folder or a copy. Both a folder and a Level.sav work.",
  "save.searching": "Searching…",
  "save.search": "Search",
  "save.latestWorld": "Latest saved world",
  "save.latestWorldHint": "Follows along automatically if you switch world",
  "save.found":
    "Found {n} worlds. {latest} switches to whichever was saved last — if someone else plays on this computer, their box is read instead. Pick a world from the list to lock the choice.",
  "save.multiPlayer":
    "The selected world has {n} players. The app reads {one} of them — the one whose player file comes first — so their Palbox becomes \"Palbox\" and everyone else's boxes end up under \"Base/other\". Choosing a player is not possible yet.",
  "save.multiPlayerOne": "one",
  "save.liveHint": " — re-reads by itself when the game has saved",

  // ── Server-side messages (API routes) ─────────────────────────────────────
  // These land straight in the UI — SaveImport draws body.error in its warning
  // box — so the routes read the same language cookie the layout does.
  "api.noPath": "No path given.",
  "api.notLevelSav": "The path has to point at a Level.sav.",
  "api.notAFile": "The path is not a file.",
  "api.noSaveAt": "Found no save at {path}:",
  "api.badPathField": "The 'path' field has to be a path to a Level.sav.",
  "api.badRootField": "The 'root' field has to be a path to a folder.",
  "api.scanFailed": "Could not search for saves.",
  "api.readFailed": "Could not read the save file.",
  "api.noMatchingPals": "The save was read but contained no pals matching the species list.",
  "api.packagedOnly":
    "Updating only works in the installed app, not when it runs from source.",
  "api.alreadyLatest": "You are already running the latest version.",
  "api.noInstaller": "The release has no installer file.",
  "api.noChecksums": "The release has no checksums — not updating without them.",
  "api.badDownloadHost": "The download points outside the project's releases. Aborting.",
  "api.noSumLine": "{sums} has no line for {asset}. Aborting.",
  "api.badChecksum": "The checksum does not match the release. The file was discarded.",
  "api.updateReady": "The update is downloaded and verified. The app restarts.",
  "api.badJson": "Invalid JSON in the request.",
  "api.noSavInFolder": "Found no Level.sav in {folder}.",
  "api.noSavInDefault": "Found no Level.sav under %LOCALAPPDATA%\\Pal\\Saved\\SaveGames.",
  "api.saveNotInFolder": "The chosen save file is not in {folder}.",
  "api.saveNotInDefault": "The chosen save file is not in the game's save folder.",
  "api.writeFailed": "Could not write pal-data.json:",
  "api.readFileFailed": "Could not read {file}:",
  "api.loadingBox": "Loading the box…",
  "api.dataFailed": "Could not read the pal data: {error}",
  "api.noRelease": "Updates are not switched on in this build.",
  "api.githubUnreachable": "Could not reach GitHub. Are you online?",
  "api.noReleases": "Found no releases to update to.",
  "api.githubRateLimit": "GitHub asked us to wait a little. Try again in a while.",
  "api.releaseNoVersion": "The release on GitHub has no version number.",
  "api.noPython":
    "No Python found. Install Python 3 and run: pip install palworld-save-tools",

  // ── Update banner ─────────────────────────────────────────────────────────
  "update.installing": "Updating to {version}.",
  "update.installingBody": " The app closes and reopens by itself.",
  "update.available": "Version {version} is available.",
  "update.availableBody": " You are running {current}",
  "update.size": " · {size} to download",
  "update.later": "Later",
  "update.hide": "Hide",
  "update.whatsNew": "What's new?",
  "update.downloading": "Downloading…",
  "update.update": "Update",
  "update.release": "The whole release on GitHub",
  // The button in the footer: a check you asked for yourself. Note that
  // "could not ask" is its own answer — saying "you are up to date" when
  // GitHub never replied would be a promise made out of nothing.
  // Kept short: these render in the nav rail, which is a narrow column.
  "update.check": "Check for updates",
  "update.checking": "Checking…",
  "update.upToDate": "Latest version ({version})",
  "update.foundNewer": "Version {version} is available",
  "update.checkFailed": "Could not reach GitHub",
} as const;

export type Messages = typeof en;
export type MessageKey = keyof Messages;

/* What every other language is typed as. `Partial<Messages>` would demand the
   English *literal* — "Boxen" is not assignable to "Box" — because `as const`
   is what gives us the key union in the first place. So the keys come from
   English and the values are plain strings: an unknown key still fails to
   compile, a missing one still falls back. */
export type Catalogue = Partial<Record<MessageKey, string>>;
