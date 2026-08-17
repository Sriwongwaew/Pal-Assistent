# Changelog

Every noticeable change, newest first.

Write new lines under **Unreleased** as you work. `npm version` moves them to the new version
automatically, the GitHub release gets exactly that text — and so does the app when it tells you an
update is available. So write for the person *using* the app, not for the person who wrote the
code: "the breeding plan now accounts for shared clutches" says something, "refactored clutchEggs"
does not.

Add `<!-- bump: minor -->` under **Unreleased** to release as a minor version instead of a patch.
Comments are stripped before the text is published.

## Unreleased

## 3.3.1 – 2026-08-17

- **The breeding plan says where each pal is standing.** The carrier cards named the pal, its
  Paldeck number, its IVs and its passives — everything except which of your boxes it is in. The
  partner cards said "Palbox", which narrows it down to eight hundred. Every card in the planner
  now gives the box, row and square, the same way the Box has since 3.2.1: the carriers, the
  partners, the IV donors, the parents in each step, and the "you already own one" line.

- **Sorting the Box now takes two keys, each with its own direction.** The version before this one offered
  ready-made combinations, and that missed the point: "many stars but a low level" cannot be
  expressed by a switch that flips everything at once — you got that order or its mirror, never
  the half you wanted. Pick the key and the direction, then a second key and its direction, and
  the button spells the whole thing out: "Condense stars ↓ · Level ↑".

- **The sort menu was unreadable.** It was the operating system's own dropdown, which does not
  take the app's background or its text, so in dark mode the options were grey on grey. It is the
  app's own menu now. Any dropdown left elsewhere got its colours pinned too.

## 3.3.0 – 2026-08-17

- **Four new ways to sort the Box, including two keys at once.** "Stars ↓, level ↑" puts the
  condensed pals you have not levelled yet at the top — the two keys point in opposite directions,
  which the old single-direction sorting could not express. There is also "Weakest IV stat", which
  ranks by the stat holding a pal back rather than by the average, so 90/90/90 comes before
  100/100/40 when you are hunting a perfect one; "Most passives"; and "Where it stands", which
  lists them in the order they actually sit in your boxes.

- **The Box search, filter and sort look like controls now.** The search field has its magnifier
  and a button to empty it, the filter carries a funnel and a count, and sorting is one control
  where the direction shares a frame with the list instead of floating beside it as a lone arrow.
  The IV thresholds lost the operating system's dropdown arrows and match the rest.

- **An active filter used to stretch into a bar across the page.** It was rendered inside the
  grid meant for passive banners, so each chip was blown up to half a row. They are chips again.

- **The planner now says which cake to bake.** Four of the game's five cakes do something beyond
  the egg, and the plan already knows what you are after: chasing passives points at Special Cake,
  which the game says makes pals "more likely inherit multiple passive skills from their parents";
  a pure IV hunt points at Extravagant Vegetable Cake for the mutations and easier talents; and
  when you just need eggs — duplicates to condense, say — Vegetable Cake "lays eggs twice at once",
  which is half the cakes for the same plan. Pick any of the five and the shopping list follows.
  The app never invents a percentage: the game says "more likely" without a number, and no
  datamined source has the parameter either. What it does tell you is where you stand without it —
  "as it stands your hatcher is 28 % per egg" — so the cake is a lift on a number you can see.

- **The breeding plan now tells you what the eggs cost in cake.** A plan is a number of eggs, and
  every egg is one cake in the breeding farm — so a 14-egg plan is 14 cakes, which is 112 Eggs, 98
  Milk, 70 Flour (that is 210 Wheat), 28 Honey and 112 Red Berries. The bill sits at the bottom of
  Breeding setup, next to the rate it belongs to, and each ingredient says who lays it and whether
  you have one standing at a base: three Mozzarina in the Palbox produce nothing. The recipe is
  read from the game's own crafting data, not typed in by hand, so the five cakes and their
  ingredients stay right when the game changes them.

- **Hover any pal and the app tells you what it is.** Over a species — a step in a breeding plan,
  a tile in the picker, a row in the roles — you get its work levels, its scalings, its partner
  skill in the game's own words, and whether you own one or how to get one. That last part matters
  in the planner, where every step names a species you may never have seen. Over one of your own
  pals in the Box you get the other answer instead: IVs, all four passives as the game draws them,
  stars, which box, row and square it is standing in, and why the app is keeping it.

- **Find now tells you which of your Lamballs to keep.** Pick any species you own and the answer
  is right there in its card: the specimen to keep and where it stands, how many to feed, what the
  stars are worth in real HP, attack and defence, and what you would regret — the ones carrying a
  gold passive, the ones holding a 100 the breeding planner needs. It is the same model the
  condense queue in Roles runs on, so the two can never disagree; the queue ranks species against
  each other, this answers a question about one.

## 3.2.1 – 2026-08-16

- **The Box now tells you where the pal is standing.** It said "Palbox" and left you to find the
  one you meant among eight hundred; it now says which box, row and square, the same way the
  breeding plan has always pointed out a carrier. Pals outside the Palbox — the party, a base,
  the global storage — give the container and the slot number.

## 3.2.0 – 2026-08-16


- **Legendary pals could not be used as breeding parents, and the app said that was the rule.**
  It is not. A legendary breeds with anything — what you cannot do is get a legendary out of the
  egg unless both parents are that species. The breeding table was missing 12 326 pairs, every one
  of them a pairing with a legendary as a parent, and the planner explained the empty rows with a
  rule the game does not have. Frostallion now has a child with 299 species instead of two, and
  breeding plans that used to dead-end on "this pair cannot breed" have a route. Unique combos
  still win, so Frostallion + Helzephyr is Frostallion Noct as before.

- **The World Tree has a map.** It is its own map in the game, with its own rendering, so it could
  never be a layer on the islands — and until now it simply was not in the app. Map now has two
  maps to pick between, and the World Tree comes with everything the islands have: its four bosses,
  17 fast travel points, 47 effigies, seven alpha pals found nowhere else, the 30 World Tree eggs,
  38 chests, the Paloxite, the fruit trees, and all 77 fishing spots. Found status is ticked off
  from your save there exactly as it is on the islands.

- **Effigies, fast travel and alpha pals were counted against the islands alone.** The save counts
  the whole world, so anything you had already found in the World Tree matched nothing and
  vanished. On a real save that was four fast travel points and an alpha boss that were done and
  showing as not done: the totals now read 155 effigies, 174 fast travel points and 90 alphas.

- **Map markers can be clicked.** They never could — pressing one did nothing at all, because the
  map grabbed the pointer for panning the instant you pressed, and the click went to the map
  instead of the marker. The map now takes the pointer only once you actually start dragging, so a
  click opens the marker and a drag pans. Dragging no longer picks the image up under the cursor
  or paints a text selection across the map either, and the grabbing hand lets go when you do.

- **Clicking a tile in Find looked like it did nothing.** The answer is drawn above the search
  box, so picking a tile once you had scrolled down changed a panel that
  was off the top of the screen. The answer now comes to you: the page scrolls just far enough to
  show it, and only when it is not already visible.

- **Find no longer has an Elements category.** Nine tiles reading Fire, Water, Grass told you
  nothing you did not already know, and they sat between you and the categories that do answer
  something. Elements are still searchable — type "fire" and you get the species — and what a
  species is strong and weak against, plus your own best counter to it, is on the species itself.

## 3.1.0 – 2026-08-15


- **The top bar is a capsule now.** It floats above the page with its own frame and shadow
  instead of being the edge of the window, and the page you are on is a filled tab rather than a
  faint tint — you can tell where you are from the corner of your eye. Nothing moved: the same
  seven tabs in the same order, the same gear.

- **"Read from the game" works again after the latest Palworld update.** The game added a new
  field to the world save, and reading it stopped with *Unknown property value type: Int64Property*
  before your box was ever loaded. The reader now walks past everything it does not need instead
  of decoding it — which also makes reading a save roughly three times faster, and means the next
  field the game adds cannot break the import the same way.

- **A new installation opens in the Press sheet palette.** Squared surfaces, lines you can
  actually see and a red accent — the palette this app is designed in day to day. Nothing changes
  if you have already picked one: your choice is remembered, and all seven are still behind the
  gear.

## 3.0.1 – 2026-08-14

- **The Start menu said PalAssistent after updating to 3.0.0.** The shortcuts inside it were
  named correctly, but Windows remembers the old folder from the previous installation and the
  update put the new shortcuts straight back into it. The folder is now created under the new
  name, and the old one is removed. If you already updated, this fixes it on the way past — no
  need to do anything.

- **The old installation left almost a gigabyte behind.** A browser profile under the previous
  name that nothing reads any more. It is deleted the first time this version starts.

## 3.0.0 – 2026-08-14


- **The app is called PalCompanion now.** Same program, same box, same plans — a new name, and it
  is gone from every corner of the old one: the window, the Start menu, the desktop shortcut, the
  installer and the folder it installs into. Updating from 2.6.0 replaces the old installation
  rather than sitting beside it, and the leftovers under the old name are removed for you. Nothing
  you have to do, and nothing to read in again.

## 2.6.0 – 2026-08-14


- **The breeding plan now starts where you actually are.** It used to pick the pal that carried the
  most wanted passives and breed from there, without ever asking how far that species had left to
  go — so if two of your pals carried all four wanted passives you always got the same route, and
  hatching the offspring from step 1 changed nothing. Your Frostallion Noct plan was a three-step
  chain from Helzephyr Lux at ~30 eggs; it is a two-step chain from Azurobe at ~20, because Azurobe
  carried the same four and stood a step closer the whole time. Hatch the intermediate and the plan
  drops that step instead of telling you to breed it again.

- **Pals that are part of your plan are marked in the Box.** A gold border and a badge saying which
  step it is — the line's starting pal, or the partner for step 1, step 2 and so on. There is an
  "In the plan" filter too, since the three or four that matter are otherwise scattered among
  hundreds of tiles.

## 2.5.0 – 2026-08-14


- **Every legendary accessory was missing — the rings, talismans, batons, whistles and pendants.**
  Katress Ring, Anubis's Talisman, the Emperor's Batons, the nine Rings of Resistance, the support
  whistles, the Air Walkers, Phantom Ring: 71 schematics with no entry at all. Each one turns out
  to have a fixed Ancient Ruin that always holds it, so Find now gives the coordinate and says the
  drop is guaranteed rather than a chance — Katress Ring sits at (−1730, −990). Hovering any of them
  shows what the accessory actually does for the pal fighting beside you. The ruins are a new map
  layer too, 106 of them, each labelled with the schematic it holds.

### Four new looks in the gear menu, and one dropped

- **Press sheet** — a printed sheet: not a rounded corner left anywhere, white paper on a grey
  ground, rules you can actually see, one vermilion accent. Halftone screen behind it. Dark mode is
  the same thing as a negative.
- **Instrument** — every surface is framed rather than hinted at, corners nearly square, and the
  darkest dark mode of the lot with signal cyan in the frames. A gauge sweep behind it.
- **Graphite** — completely desaturated surfaces with a single amber signal colour, so the only
  colour on screen is the pal's own element. Brushed metal behind it.
- **Glacier** — a high-key palette with hairline borders, and the only one whose dark mode is steel
  rather than night. Frost crystals.

**Deepwater is gone.** If you had it selected the app now opens in Dusk instead. Dusk, Basalt and
Nightwood are unchanged, and Dusk is still the default — nothing moves until you pick something.

Passive banners, work icons and species art look the same in every palette: they are the game's own
assets.

## 2.4.0 – 2026-08-13


### Find — one search box over everything the app knows

- **The ranch list was missing more than half the pals — it is complete now.** Find and the ranch
  guide knew 12 producers; the game has 29. Ice Organ from Mau Cryst and Foxcicle, Bone from
  Sootseer and Cawgnito, Venom Gland from Caprity Noct and Depresso, Electric Organ from Sparkit,
  Flame Organ from Rooby and Kelpsea Ignis, Aquatic Pal Fluids from Kelpsea, Leather from Surfent,
  Mushroom from Shroomer, Caramel Cotton Candy from Woolipop Terra, seeds from Vaelet — and Wool
  from Lamball, which was missing for a second reason: the species data gives it no Farming level
  at all, so anything driven by that number could never find it. None of this is guesswork: every
  ranch pal's own partner skill names its product outright, and that text was already in the app.
  Two rows got more honest along the way — Shroomer drops Mushroom *or* Cavern Mushroom, and Vixy
  digs up buried items rather than the Pal Spheres we used to claim.

- **Find answers "where do I get this?" once, not six times.** Pal drops, the ranch, mining nodes,
  expeditions, raids and merchant prices are now one answer per item. Ask for Flame Organ and you
  get the 38 species that drop it *and* the three that lay it in the ranch. Sulfur, Ore, Coal and
  Pure Quartz finally have an answer at all — no pal drops them, so the page used to have nothing
  to say. Life, Power and Stout Fruit show their prices and what they do to a pal's IVs, and the
  pal souls explain what the Statue of Power charges per rank.

- **Four new things to search: partner skills, places, expeditions and raids.** Partner skills
  cover 298 species and are searchable by what they do, so "night vision" finds Cawgnito; every
  species page now shows its skill too. Places make the map answerable — fast travel points,
  dungeons with their level, camps, mining nodes and skill fruit trees, with the game's own
  coordinates and, where your save can tell, what you have already found. Expeditions can be
  searched by their rewards, which is the only way to find Kinship Peach or Sol Sphere, and they
  say whether the site is unlocked and whether your idle box is strong enough. Raids show the slab
  that summons them, what they drop, and how many times you have cleared them.

- **A schematic now tells you where to go, not just a source name.** "Snow enemy camp" was the
  whole answer for the Advanced Fishing Rod, which is not much to go on. Every source we can pin
  down now shows the region in the game's own words with its level range, the actual coordinates,
  a link to the map, and a line on how that kind of source is farmed — so the fishing rod becomes
  three camps in the Astral Mountains (Lv 35–50) at (−194, 255), (−299, 459) and (−394, 446),
  with a note that the camp and its chest come back after a while. The oil rig schematics point at
  the right rig and its 22 golden chests, treasure-map schematics at all 42 dig spots, the hard
  mode towers at the tower itself, and the arena rewards at the arena. That is 82 of the 89 rows.
  The seven that are left have no fixed place to give: the Moon Lord raid is summoned at an altar
  you build yourself, the Medal Merchant wanders, and one alpha has no spawn in the map data at
  all — each says which of those it is rather than leaving you guessing. Where a source lists
  several ways in, the coordinates are labelled as one of them, not as the whole answer.

- **Picking an element now does something.** It used to show the type chart — which you know by
  heart after a week — and link to a generic page. It now answers the two questions you actually
  have: what you own of that element (the count, your strongest four, and a jump to every species
  of it) and what to bring *against* it, which is your best pal of the element that beats it. It
  also lists the expeditions that count pals of that element against how many you have idle, since
  that is the one place in the game where the number matters: 43 idle Dragon pals against the 20
  Sunreach Isle asks for.

- **Hover an item or a schematic to see what the thing actually does.** The game's own description
  plus its numbers — attack and magazine size for a weapon, defense and HP for armor, durability,
  weight and gold value for both. It works on the schematic tiles, on every item in Find and on the
  drops and ranch products listed on a species. Two things the box tells you straight out rather
  than glossing over: the numbers are the **base version**, because a Schematic 4 builds a stronger
  one and the higher tiers are in no datamined source, and the Flamethrower only has its
  schematic's text since the weapon itself is missing from the item data.

- **Type two species with an x between them** — "Anubis x Lamball" — and Find tells you what the
  pair produces.

- **Species pages say a lot more.** The Paldeck description, the species' own stat scaling, sprint
  speed, food and stomach size, the male/female split, whether it works at night, and every parent
  pair that produces it with the ones you own listed first.

- **Passives match their description, not just their name.** Searching "attack", "work speed" or
  "stamina" now finds the passives that do those things. If you own the surgery implant for a
  passive, Find says what that saves you.

- **The hit counters told the truth about how many hits there were.** They counted what fitted on
  screen, so searching "Schematic 4" reported 12 when 85 matched. Now the count is the real number
  and a "show more" button says how many are left.

- **Find is redesigned around a hero band.** The selected hit sits in a big band at the top —
  tinted by its element, like the Box — and updates as you browse: ↑/↓ steps through the hits,
  Tab switches category, Enter opens the primary action. Category chips under the search box
  carry hit counts in a fixed order, and the hits themselves are tiles with real portraits
  (passives stay as their in-game banners). A species answers everything at once: how to get it
  (your box, breeding steps, or the alpha boss with a ✓ from your save), what it drops, its
  ranch product, top work suitabilities, its legendary schematic and what it is weak to — with
  your best counter pal from the box. Hits wrap into rows instead of scrolling sideways, and
  materials, ranch goods and schematics show the game's real item icons — the schematic rows
  carry the weapon they unlock.

- **Elements are now searchable.** Type "fire" (or browse with an empty search) and the element
  card answers what it is strong against, what beats it, and which pal in your box is your best
  of that element. Species search also matches the game's element names — "grass" and "ground"
  now work, not just the dataset's internal names.

- **Find answers "who drops X" and "where does this schematic come from" — for everything.**
  Datamined 1.0 drop tables now cover all 98 materials pals drop (quantities and drop chances
  per species, ✓ on species you already own), and the legendary schematic table grew from 32 to
  77 substantiated rows: alpha bosses (≈3 % per kill), hard-mode towers (≈10 %), treasure maps
  and chests, the oil rigs' gold chests, the Moon Lord raid and the Arena/merchant stock. 1.0
  shuffled the boss drops and old guides still disagree; rows where the 1.0 sources conflict or
  stand alone are flagged instead of presented as fact. Species search also matches work
  suitability now — type "mining" and the best miners come out sorted by level.

### The map and your journey

- **The Map is now the real Palworld map.** The game's own 1.0 world render with datamined
  positions for towers, fast travel statues, Lifmunk Effigies (all 140 on the main map), other
  effigy types, alpha bosses, enemy camps, dungeons, skill-fruit trees and ore clusters. Scroll to
  zoom, drag to pan, click a marker for details. Layers toggle on chips that also show your tally,
  and "Only what I have not found" hides everything you already picked up. The World Tree is its
  own in-game map and is not covered yet.

- **The map is sharp at every zoom level.** It used to rasterise at screen size and stretch —
  blurry exactly when you leaned in. It now renders from the full 8192-pixel source at all times.

- **The map gained oil rig chests, treasure map spots and named regions** as three new layers, and
  enemy camps now show which Syndicate faction runs them.

- **Quests is your journey over the world.** The page opens with the real world map, gold-stamped
  where your save has beaten a tower, and the journey as phases next to it — the towers,
  Panthalus, the World Tree, hard mode, the raids and the Paldeck — with the next phase lit up.
  "Next fight" leads with the boss's own portrait in its element's colours, so you see who you
  are up against before you read a word of it.
  The campaign shows every fight as a receipt (portrait, level, ✓ ×N from the save's own
  counters), hard mode shows its legendary schematics as real item icons instead of text, and
  the raid board shows each boss with an "egg missing" mark when your deck lacks the species
  only that raid can hatch — click one for the summon item, the phases and your counter squad.
  "Left in the world" turns the tallies into reasons: unused effigies to offer at a Statue of
  Power, alpha bosses worth 5 Ancient Technology points each — every meter opens the map.

- **The journey now goes through Panthalus.** The page used to point at Zenara & Astralym next,
  but the World Tree opens by *catching* Panthalus — the level sort happened to flip the real
  order. Fixed, and the raw quest log moved to the bottom as a compact strip.

- **Quests starts with what is actually next for you.** Your real quest log straight from the
  save (main quests first, the game's own names), and "Next fight" is the lowest boss your save
  has not beaten — including the World Tree bosses and Panthalus, which are new on the page.
  If your save was read before this existed, the page tells you to read it again instead of
  guessing.

- **Quests covers the actual endgame.** Hard-mode towers (Lv 72–80, with their legendary
  schematics, clears read from the save once you beat one), the full raid board — all six bosses
  with summon items, phase mechanics (Blazamut Ryu swaps element at 10 % HP; Moon Lord is
  typeless and gated on pressure points) and your clear receipts — plus a Paldeck meter with a
  path to every missing species. Panthalus's card now warns it must be CAPTURED, heat/cold armor
  gates are shown, and Zenara & Astralym honestly says "no elemental weakness" instead of a
  guessed counter-squad.

### The five roles

- **Recommendations and "Best for…" are now one page: the five roles.** Five tabs — The box,
  Combat, The base, Mounts & fishing, The player — each pairing the tasks computed from your own
  box with the best-of and reference lists for the same role. The condense queue, keep list,
  expeditions, souls advisor and butcher guide sit next to the attack team, best workers, ranch
  guide, mounts, fishing helpers and support pals they justify. The five cards at the top are the
  tabs: each carries its role's game icon and key numbers, one role shows at a time, and the back
  button returns to the previous tab. Old *Best for…* links and bookmarks redirect to the new page.

- **The five roles are now instruments instead of a wall of chips.** Every list on the page sits
  in its own framed module with a title and a count, so you can tell where one thing ends and the
  next begins — and each role's headline number sits in a gauge at the top with a meter behind it.
  Two things changed shape completely:

  The **condense queue** is one row per species. The star jump is four lamps (filled = stars it
  already has, lit = stars this feeding gives), and the gain is a meter measured against the
  +20 % a fourth star is worth, so a 1★ row can no longer look as strong as a 3★ one. Click a row
  for what you keep and what the stars are worth in HP, attack and defence.

  **Keep these** is a single bar split by reason instead of nine collapsed headings: how big
  *clean carrier* is next to *already condensed* is now something you see rather than count.
  Click a reason to see the pals in it. The colours group the reasons by kind — gold when the
  passive is the reason, blue for IVs, violet for the pal's own state.

- **Recommendations puts your box to work.** Three new tools for an endgame box:
  **Expeditions** — your idle pals' total ≈Firepower against every 1.0 site's requirement and
  element headcount (a 4★ is worth 25× a 0★, which is what condensing spares are for);
  **Pal Souls** — your soul wallet from the save plus which keepers still miss the cheap ranks
  (1–10 cost small/medium/large for +30 %; 11–20 cost 30 Giants for the same again);
  **Worth butchering** — the third channel besides feeding, with the ≈100 %-Giant-soul trio
  called out. Condensing also now credits already-starred duplicates at their full fed value
  (a 1★ spare counts as 5 sacrifices, as in the game) — "almost there" was too pessimistic.

- **Combat and mount tasks are actionable.** The page now tells you which best-in-slot passives
  your attack team and fastest mounts are still missing — one click opens a breeding plan with
  them pre-filled, and if you own a Surgery Table module for one it says "can be implanted"
  instead of sending you breeding for nothing.

### Breeding

- **The plan now spots the pair that does the whole job in one go.** When two pals in your box
  together carry all the wanted passives *and* their child happens to be the target species, that
  single pairing replaces both halves of the plan — the gathering and the species route. The
  planner used to pick whichever pal carried the most wanted passives on its own and then breed
  its way across to the target, because it counted carriers rather than eggs: for Helzephyr Lux
  that meant a Digtoise with all four and two species steps, 20 eggs, where your Helzephyr ♀ and
  Beakon ♂ get there in one, 10 eggs. Carrier sets are now priced over the whole plan, so the pair
  wins when it is cheaper and the lone carrier stays when it is not. Two pals of *different*
  species were never even considered as a pair before — they are now, both in the plan and in
  "You could also do it this way" below it, which is where they show up when manual mode has
  locked the plan to a particular pal.

- **A third IV goal: near perfect.** "Perfect" now means what it says — 100/100/100 bred the whole
  way — and next to it sits **Near perfect 90+**, which breeds each stat to within *one IV fruit* of
  perfect and lets a fruit finish the job. That is not a softer attitude, it is a different lottery:
  a rerolled stat lands on 90-or-better eleven times as often as on exactly 100 (4.4 % against
  0.4 %). For a Helzephyr Lux with no passives in play that is **36 eggs instead of 60**, and the
  plan then says what remains: *"then 3 fruits, at most one per stat"*. The whole panel follows the
  goal — the coverage cards count pals at 90+, each step says "HP + Attack 90+", and the goal card
  shows 90+ per stat instead of 100.

- **One route, steps 1 → N.** Chasing a perfect pal used to mean reading three plans for the same
  animal: "Do this first" for bringing a 100 in, "Shortest path" for gathering the 100s, and a
  separate "Passive plan" underneath — three headings, three numberings. They are one route now.
  Every step is a real pairing you go and do, numbered straight through, and what a step is *for*
  is a colour-coded chip in its header instead of a heading of its own: **bring in a 100** (violet),
  **gather 100s** (blue), **gather passives** (gold), **goal** (green). The species steps that carry
  an imported 100 are rows in the same route, so "result from step 2" always points at a step you
  can see. The separate passive plan is only shown when it does something the route cannot — when
  the IV goal is "fast", or when a wanted passive has to be fetched from another species.

- **The breeding plan and the condense queue stopped contradicting each other.** The planner would
  point at a pal as step 1 of your route while the queue listed the same pal as fodder — measured
  against your box, **six of the eleven** pals the active plan needed were in the feed lists, one of
  them under "do this now". The queue now knows what the plan has booked: those pals are left out of
  the feed, and the row says how many and why. It is the one mistake in the app that cannot be
  undone, so it is the one that had to go first.

- **A single 100 is a building block, not a failed roll.** The keep rules measured the IV *average*
  (240/270) or all three stats at 100, so a Warsect at 15/100/100 — the exact two-in-one donor the
  planner recommends — counted as fodder. Now a pal that carries a 100 in any stat is kept as an
  **IV building block**, up to two per species and stat, cleanest first and preferably one of each
  gender. In your box that went from **11 unprotected pals to none**, and they have their own group
  in the keep band.

- **IV fruits are counted, not just mentioned.** Life, Power and Stout Fruit give +10 IV each up to
  100, so what a pal needs is a number: `ceil((100 − IV) / 10)` per stat. The app says the number
  rather than "feed it fruit" — and never calls them free, because the fruits cost endgame material
  or merchant currency.

- **A missing 100 is now bred in from another species instead of rerolled.** When none of your pals
  of the target species has 100 in a stat, that stat could only come from the game's 40 % reroll —
  about one egg in a hundred, ≈253 eggs for that stat alone, and in practice the whole cost of a
  perfect plan. But a 100 can be *carried in* through the species chain: each step the child
  inherits it with ≈30 % odds, so a couple of steps cost a handful of eggs. For Helzephyr Lux with
  no Attack 100 in the box, the plan went from **7 steps and ~524 eggs to 4 steps and ~239** — the
  100 comes from a clean Skutlass two steps away. The route to fetch it stands first in the plan
  under "Do this first", with the donor, the species steps and what it costs, and the IV card for
  that stat now says "can be bred in" instead of "has to be rerolled". Donors are ranked by fewest
  steps and then by fewest passives, because whatever the donor carries lands in the passive pool.
  It looks for donors across your **whole** box, the global Dimensional Pal Storage included — that
  is where the best IVs usually sit — and the card says which container to fetch it from. Donors
  that carry two 100s at once (a Warsect at 15/100/100) are offered both as one import that brings
  both and as one per stat, and the plan takes whichever works out cheaper. It is offered for a stat
  you already have a 100 in, too: if your only carrier of it drags four passives along, a clean one
  bred in can still be the cheaper parent. And the price counts the 100s on the pals you pair *with*:
  when the partner in a step also has 100 in the stat being carried, the odds go from ≈30 % to ≈60 %
  — half the eggs for that step — so the route is priced step by step, with each step's odds shown,
  and the partner picked for its 100 rather than only for being clean.

- **Passives show as banners in the perfect-IV plan too.** Each step used to name them in running
  text ("Demon God + Musclehead + Legend") in the middle of the IV line. They are banners now, on
  their own row per step, the same as everywhere else in the app — the tier colour is the
  information, so the same passive should look the same wherever it appears.

- **The perfect-IV plan is drawn as a route, not a numbered list.** Same connector lines as the
  passive plan: the pals that start the line stand at the top, every later step shows its parents
  where the step is, and the last node carries the goal ring. The list of seven near-identical
  boxes was hard to read your way through — which was the point of the route view in the first
  place. The panel's remaining Swedish labels ("Etappvis", "Vinst", "× billigare") are translated
  now too.

- **Already bred it? You still get to see the route.** When a pal in your box already carries all
  the wanted passives and is the target species, the plan costs nothing — and the whole route used
  to vanish, with "Expected · whole route" falling back to "Pick a target and passives" as if the
  planner had lost your plan. Now it says the goal is met, prices what another one would cost, and
  shows that route below — built from the pals you have, with the finished one as a *parent* rather
  than as the answer. So if you own two Helzephyr Lux that together carry everything, the plan
  pairs those two, instead of sending you through two other species for the same number of eggs.
  And when there genuinely is no route from the pals you own, or nobody in the box carries the
  wanted passives, the card says that instead of showing a blank.

- **Ties now go to parents of the target species.** When two routes cost the same number of eggs,
  the planner picks the pair that is already the species you are breeding: the offspring can be
  paired straight back with either parent, and you do not need to keep two other species around
  for the next attempt. Nothing gets more expensive from this — it only decides equals.

- **You can pick which breeding route to take.** When several species chains reach your target in
  the same number of steps, they are all listed above the plan — each as its route of portraits
  with the eggs it costs, cheapest marked. Click one to use it and the whole plan rebuilds around
  it; the choice is remembered with the rest of your breeding setup. Useful when the cheapest
  route goes through a species you cannot get hold of, or when you happen to own five of the
  partner another route needs. If your box changes so much that the route you picked is no longer
  one of the options, the plan quietly goes back to recommending the cheapest.

- **Pick one pal and the whole plan is built around it.** Choosing a single parent in manual mode
  no longer just prices a pair — it locks the passive plan to that pal. The planner keeps choosing
  the other carriers, the merge order, the partners and the species route as usual, but yours is
  in there, and the plan says at the top that it is locked and why. Useful when you want a
  specific individual used, not merely a good one. Pick a pal that carries none of the wanted
  passives and it says so plainly, because that plan will be dearer than the one it would have
  chosen. Filling both slots still answers the old question: what do exactly these two cost?

- **The recommended breeding chain stops changing on its own.** When two routes to the target
  cost exactly the same, the planner used to pick whichever it happened to try first — and that
  depended on the order your pals came out of the save. Reading the save again, a new base camp
  or a new container was enough to make the plan suggest a different chain, with nothing that
  actually mattered having changed. Ties are now settled the same way every time, so the same box
  gives the same plan. The cheapest route still wins; only genuinely equal ones are affected. The
  same fix applies to which individual pal a step points at when two of them are equally good.

- **The breeding tools open as proper dialogs.** Implants, manual mode and the breeding setup
  used to expand awkwardly in place (and briefly as a squeezed top strip); they are now real
  centered dialogs with a close button, Escape and click-outside — same as the species and
  passive pickers.

### Your box and your save

- **The box can be sorted by condense stars.** The stars were on every tile but there was no way
  to bring them together — so "what have I already condensed?" meant scrolling past two hundred
  pals. Pick *Sort: Condense stars*; equal stars keep their usual order by score.

- **The condense queue ranks by what the stars are worth, not just by whether they are reachable.**
  It used to sort on star gain and freed slots, which is why a Souffline with no role in your box
  outranked species you actually deploy. Priority now weighs what the species is used for — best in
  the box, a real role, or nothing — against what the stars give in real stats and what they cost in
  pals, and the row says it in plain words: *"best in the box at what it does — stars pay off here"*
  or *"no role in the box — the stars do nothing for you"*. Your queue now opens with Jetragon and
  Lyleen instead of species you never take out.

- **The pal you keep is picked for its role, not for its score.** "Best of its species" was decided
  by a score that rewards high passive tiers even when the passive is junk — for Digtoise it chose
  79/74/21 with four passives over 86/44/83 with two. It now goes by *fitting* gold passives, then
  IV, then cleanliness, then stars already banked. That is the pal you feed 48 others into, so it is
  worth getting right.

- **The app tells you when you got it.** With live mode on, the save is re-read the moment the game
  saves — so the app knows before you do that the egg you just hatched *is* the pal the planner is
  aiming at. A band under the page title now says so, on whatever page you happen to be on: **"You
  got it"** when the pal matches your breeding goal, or **"Nearly there"** when it carries every
  wanted passive and only the numbers are missing — with the count that matters: *"12 IV fruits
  finish it: 8× Power Fruit, 4× Stout Fruit."* Only pals that are actually new since the last read
  are announced, the first run is silent instead of greeting you with your whole box, and each
  message can be dismissed for good.

- **The Box filters are one button now.** Search, sort and hit count stay in the row; quick
  filters, IV thresholds and the passive picker live in one Filter panel, and your active choices
  show as removable chips under the row. Same filters, a third of the clutter.

- **"Star of the box" is your strongest fighter, not a scoring quirk.** The old pick used the
  keep-score, which favours clean breeding stock and happily crowned a level-32 duplicate. The
  hero now shows your highest combat power and says so; the strength card that duplicated it
  shows your best gold-passive carrier instead.

- **The global palbox is read too.** Pals you park in the game's Dimensional Pal Storage now
  show up like any others — in the box, as breeding carriers, as duplicates in the condense
  queue — labelled *Global palbox* so you can see where they are. That storage lives in its
  own file outside the world save, so until now every pal you set aside there was invisible to
  the app, and a breeding plan could tell you to catch a carrier you already owned. Pals kept
  there are counted as stored rather than deployed: they do not earn a base's partner-skill
  bonus, and they are left out of the expedition squad, because neither works until you fetch
  them back out.

- **The app now reads your progression from the save** — the same "Read from the game" button as
  before, nothing new to set up. Towers defeated, effigies collected, fast travel points unlocked
  and alpha bosses beaten are matched per instance, so the map ticks off exactly the ones *you*
  found. Camps, dungeons, oil rigs, predators and treasure are shown as the save's own counters.
  Your progression is as personal as your box: it is blanked from the installer payload the same
  way, and a release refuses to ship if it leaks.

- **Partner skills are in the app.** Every species' partner skill (the game's own text, datamined)
  shows in Base Info's Partner Skill frame — which used to show the Paldeck description as a
  stand-in — and as a chip on every Best for… portrait, answering "why this one?" for real:
  Jetragon's missiles, Anubis's player buff, Eidrolon's party stacking. Two new sections use
  them: **Best for the player** (pals whose skill buffs you — Solenne, the Gobfin stack, element
  mounts) and **Base defense** (Panthalus's skill literally is air defense).

- **"CATCH" tells you how.** Recommending a legendary or raid pal with a bare CATCH promised a
  wild spawn that does not exist. Those tags now read "ALPHA BOSS Lv 70" (the fixed spawn) or
  "RAID EGG", everywhere species are suggested. Astralym — the uncatchable final boss — no
  longer tops the attack rankings.

### Look, feel and housekeeping

- **Legendary passive banners catch the light.** A rank 4 banner now gets a slow sheen travelling
  across it and its edge stripe pulses, like in the game — gold, grey and negative banners stay
  still, and World Tree passives keep their rainbow. It is mostly pause and the banners are
  phase-shifted, so several in one panel glint one after another instead of blinking in unison.
  The box grid stays still: it draws over two hundred banners at once, and most of them are
  legendary in a box like yours. Turning on "reduce motion" in Windows stops all of it, as before.

- **The top bar has icons and a center.** Navigation now sits centered with the game's own
  icons on every page — the Pal Sphere for the Box, the egg for Breeding, the passive rank
  arrow for Recommendations, the map's tower and fast-travel glyphs for Quests and the Map —
  with the brand on the left and your player card on the right.

- **The app is about to be renamed to PalCompanion, and this version is the one that survives it.**
  The next release moves to a new name and a new address, and an installed copy that only knows the
  old one would see the update, announce it, and then refuse to install it — for good. This version
  accepts both, so the rename arrives like any other update: you click install and the new name is
  there afterwards. Nothing you have set is lost in the move.

- **The installer now carries the licence it is given under.** The program is AGPL-3.0 and always
  has been, but the copy you install said so nowhere — the terms and the list of what belongs to
  Pocketpair and to the other projects this is built on only existed on GitHub. `LICENSE.txt` and
  `NOTICE.txt` now sit in the program folder, and the read-me points at them.

## 2.3.0 – 2026-08-09

- **Condensing asked for more than twice the pals the game actually wants.** The costs were the
  ones from before Palworld 1.0 — 4, 16, 32 and 64 duplicates, 116 for four stars. 1.0 lowered
  that to 48 in total, and the page had never been told. It is now 4, 8, 12 and 24.

  This was not just a wrong number on screen. Everything on Recommendations is counted from it, so
  the page held back species that were already there: "Almost there" listed pals as needing a
  dozen more duplicates when the star was waiting for you, and the work order put off condensing
  you could have done that evening. If the page has felt pessimistic, that is why — check it again.

- **Removed the "Fishing" purpose from the breeding planner, because it was wrong.** It suggested
  breeding for Lunker and Whopper and told you they gave bigger catches. They do not: both are
  water damage, ice damage and defence — the game's own description of them says so, and the app
  showed you that same description one panel away. The mistake is an easy one to make, so it is
  worth knowing: Lunker is *guaranteed on some pals you get by fishing*, which is the opposite of
  a passive that helps you fish.

  Nothing in the game improves fishing through breeding. How well a pal fishes is its partner
  skill, so it is the species you want — and that list is still there, under **Fishing pals** on
  *Best for…*. Your fishing pals are also no longer judged by their passives on the
  Recommendations page: Gloopie, Jelliette and Jellroy are only ever fishers, and the page could
  end up suggesting you feed away a perfectly good one.

- **Passive descriptions no longer show the game's own markup.** Hovering some passives in English
  printed raw tags in the middle of the sentence — Demon's Hand read "Work Speed
  `<NumBlue_13>`+`</>`90.0". Twenty descriptions were affected, all of them in English, which is
  the language the app starts in.

## 2.2.2 – 2026-08-09

- **"Update" now actually installs the update.** Pressing it closed the app and left you on the
  same version: the installer was started by the app itself, and everything the app starts is torn
  down together with it — so the installation was killed a second or two in, before it had written
  anything. The swap is now handed to the program's own launcher, which runs it once the app is
  properly closed, waits for it to finish and starts the new version. It also waits for the app to
  release its files before installing (the old wait never waited at all), keeps working when your
  Windows user name contains å, ä or ö, and writes an `update.log` next to the app's settings so a
  failed update leaves evidence instead of a shrug.

  This fix cannot fix itself: to get it, install this version by hand once. From here on, updating
  from inside the app works.

- **The app now only listens to itself.** PalCompanion runs a small web server on your own machine,
  and until now any web page you happened to have open in another tab could send it requests —
  enough to make the app start installing an update you never asked for, or, with a DNS trick, to
  read your box straight out of it. Every request is now checked against where it came from and
  refused unless it came from the app's own window. Nothing you do changes; you will not notice it
  at all.

- **Stricter check on what an update is allowed to download.** The rule that says an installer may
  only come from this project's own releases now compares the actual address rather than the text
  of it, so an address that merely *starts* the right way no longer passes.

- **Bundled components updated** to versions without known vulnerabilities.

## 2.2.1 – 2026-08-09

- **"Check for updates" has moved to the left rail**, next to the theme and language controls,
  where the rest of the things you *do to* the app live — rather than at the bottom of the page
  among the things you read *about* it. The answer sits under the button, and the rail no longer
  clips it when the wording is long.

## 2.2.0 – 2026-08-09


- **A "check for updates" button, at the bottom of every page.** The app asks GitHub once a day and
  is quiet the rest of the time. That is right for a notice you never asked for and wrong the moment
  you have heard there is a new version and want it now. The button asks straight away, brings back
  a version you once waved off with "Later", and answers even when the answer is bad: "could not
  reach GitHub" is its own reply and is never dressed up as "you are up to date". The version you
  are running is printed next to it, so there is somewhere to read it off when reporting a problem.

- **The language switch now changes the whole app, not just the menu.** Every screen speaks the
  language you pick — the breeding planner's odds and explanations, the recommendation queue and its
  keep-reasons, best-for, the save panel, the update notice, and the error messages that come back
  from reading your save. Passive descriptions follow along too: the hover card shows the game's own
  wording in your language. English is the default and the fallback, Swedish is complete, and the
  six other languages in the list fall back to English until they are translated. Species, passive,
  element and work names stay in the game's English on purpose, so you can still find them in
  Palworld's own menus.

- **The red warning box at the top of the recommendations page is gone.** The page now opens
  straight into **keep these**, followed by the condensing queue. What condensing costs — the pals
  you feed are gone from the box for good, and their passives and IVs can only be inherited — is
  still spelled out under *What condensing does* above the queue.
- **Manual mode: pick the two parents yourself.** The planner otherwise chooses carriers from your
  box and minimises how many you need. Manual mode answers the other question — "I *want* to use
  these two, what does it cost?" Take two from your box, or build a parent by hand (species plus the
  passives you intend it to have) to price a pal you are *planning* to catch. You get the pool, the
  odds per egg, the eggs and the time. It also says plainly when the pair **cannot** work: no child
  in the breeding table, both the same gender, or a wanted passive neither parent carries — passives
  can only be inherited, and planning on the game's random roll is planning on luck.
  A finding worth knowing: unlike the normal plan, breaking a manual pair into stages usually does
  **not** help. Every child comes out of the same pool, so staging pays the dirty pool twice. It only
  wins once the pool gets large — with four wanted in a pool of six, direct wins (~150 eggs vs ~160);
  in a pool of ten, staging wins by a mile (~460 vs ~2100).
- **A home for your implants.** A panel at the top of the breeding page lists what your world holds,
  and each row adds that passive to your goals in one click. Previously implants were only mentioned
  when one of your wanted passives happened to be implantable — so the question "what implants do I
  have?" had no answer anywhere in the app.
- **A checkbox that makes the implant advice real.** "Use the implants" lifts the passives you hold
  an implant for out of what the plan *breeds*, so the odds are the ones for the smaller pool. The
  goal card still shows all four — the target is unchanged, only the road there is shorter. Before
  this, the advice said "the plan shrinks to three" while the plan below kept breeding four.

- **Fixed: the installed app could shut itself down a few seconds after starting.** It opens its
  window in a browser profile of its own, but "own profile" turned out not to mean "empty profile":
  on a machine with a work account the browser signs itself in there and syncs down your extensions.
  An ad blocker that has just landed in it opens a "thank you for using…" window on top of the app —
  and the launcher, which watched the window title to know when you had closed the app, was handed
  the title of *that* window instead and concluded you had quit. It now looks at every window rather
  than the topmost one, and no extension loads in the app's profile any more.
- **The planner reads your implant stash.** Reading the save now also picks up the Pal Surgery Table
  implants lying in your world, and the passive picker tells you — right where you choose — which of
  your wanted passives you can simply install instead of breeding, and what it saves. An implant goes
  on the *finished* pal, after breeding, so the passive never enters the inheritance pool: two
  implants took a four-passive plan from 10 % to 60 % per egg on the final step, **six times fewer
  eggs**. Passives you hold an implant for are marked in the grid, are never hidden behind "show
  all" (you need no carrier for them), and every hover box says how many you hold.
- **Correction: the app no longer claims a passive *can't* be implanted.** The first version went by
  a published implant list that stops at legendary rank — and a real save had implants for Swift and
  Mastery of Fasting, both above it. The list is one family of items, not the whole set, so the app
  now states what you own (read from the save), hints at what is known to exist, and never denies.
- Your implant stash is scrubbed from the installer along with your box, and the release refuses to
  publish a package that carries it.

## 2.1.0 – 2026-08-09

- **The planner now tells you what you can skip breeding.** 26 passives exist as implants for the
  Pal Surgery Table, and one you implant afterwards never enters the inheritance pool — so it costs
  nothing. Since the odds are steeply convex in pool size, implanting one of four wanted passives
  makes the final step **~3× cheaper** (10 % → 30 % per egg), and two makes it 6× cheaper. The plan
  now says which of your wanted passives are available as implants, which must still be bred, and
  what the saving is. Nothing at legendary rank or above is available, so it also says so plainly
  when the answer is "none of these" — that assumption is free to make and wrong. Every passive
  hover box now states whether it can be implanted, right next to how many in your box carry it.
- **Breeding base** at the top of the planner: what actually makes eggs come faster, measured
  against your own box. Braloha in the base, **Grintale** in the party — every egg you pick up has a
  50 % chance of yielding an extra one, and that extra egg is its own passive roll, so it counts in
  full — and **Dynamoff** in the base for shorter incubation. The panel is also what turns the
  plans' egg counts into hours.
- **Philanthropist is no longer recommended outright.** The passive has to sit on the exact two pals
  you are pairing, which means it sits in the inheritance pool — and there it is junk. With four
  wanted passives it drops the final step from 10 % to 2 % per egg, five times more eggs, against
  only 2.4× faster egg production: a **net loss**. The panel now computes that trade against the
  passives you picked and says plainly when it pays off (three wanted or fewer, and free when you
  are only chasing IVs) and when to leave it alone. The same applies to Insomnia. Time estimates
  under the plan therefore compare against a ceiling that keeps the pool clean.
- **The breeding plan now pairs carriers two at a time.** It used to add one wanted passive at a
  time along a single line. Building two parents with two passives each and meeting in the middle
  is cheaper — the final step costs the same either way, but the road there is shorter. Against a
  real box: unchanged with two carriers, ~5 % fewer eggs with three and ~14 % with four, never
  more. The plan now also accounts for what **gender** costs: a chick from an earlier step is a
  50/50, so needing a specific one takes on average one more clutch. It's stated on the step it
  applies to.
- **The merge order is chosen across the whole plan**, not just phase one: different orders land in
  different species, and one that costs a few eggs more can land one species step closer to the
  target. When the plan takes such a detour, it says why, and what it saves in total.
- **Recommendations now say what condensing gets you**, not just how many stars: the same pal
  before and after in HP, attack and defense, what you get back in box slots — and that what you
  feed is gone for good. A star means nothing until you convert it.
- **The ranch no longer crowns whoever has the highest number.** "Best in box at Farming" pointed
  at the highest work level, but every species drops its own product in the ranch and the level
  only sets the rate — which made a pal look indispensable for something you may not even want.
  The ranch is still shown, with that explanation. Same for work types where the box's "best" is a
  level 1: it now says **only one in the box**, not best.
- **The recommendations page is rebuilt as a work order.** The grid of cards is replaced by one row
  per species — species, star jump, how many to feed, how many slots you get back — where you
  expand the one you're working on. The page reads top to bottom: warning, **keep these** (what not
  to feed), then condensing, and finally the species a few duplicates short of the next star.
- **A warning at the top of the page.** Condensing can't be undone: what you feed is gone forever,
  the advice is based on the save as it looked at the last import, and you do the feeding yourself
  in the game at your own risk.
- **The base dream team no longer includes a ranch pal.** The ranch counted as any other work type,
  so whoever had the highest Farming number took a team slot — even though what it drops decides
  whether you want it at all. The team now covers the twelve real work types, and the ranch has its
  own list.
- **The team drops members that became redundant.** Whoever was best when the team was empty stayed
  on even after two better pals joined (Whalaska stayed next to both a stronger waterer and a
  stronger cooler). It's now removed — the team promises the smallest crew, not eight pals.
- **Ranch — who drops what** is a new list under Best for…: the product you need, who drops it and
  how fast. Species whose product we don't have on file are listed as unknown rather than guessed.
- **The base crew says where the specimen is.** The team picks the best individual of a species, and
  it's usually still sitting in the box even though a worse one is already deployed — that's now
  stated under the portrait.

## 2.0.0 – 2026-08-09

First public release.

- **The box** — your whole box as tiles with level, IVs and passives, with search, filter and sort.
  The game's own Base Info view is there for the selected pal.
- **Breeding planner** — pick a target species, what the pal is for, and up to four wanted passives.
  You get carriers from your box, a merge order and odds per egg, plus a species chain to the
  target. The plan is measured in expected number of eggs rather than number of steps, which often
  makes a longer chain with clean parents cheaper than a short one with a junk-carrying partner.
- **Perfect 100/100/100** — searches for the shortest path to maxed IVs across generations, and
  accounts for gender costing and for siblings from the same clutch sharing eggs.
- **Recommendations** — what to condense now, ranked by biggest gain, including what the one you
  keep is good at so you don't feed away your best worker.
- **Best for…** — attack team, base team, best workers per work type, fishing pals and fastest
  mounts.
- **Live mode** — keeps the box up to date while you play. Between checks only the save file's
  timestamp is read, so it costs practically nothing.
- **Light and dark mode** with three palettes.
- The save file is always opened read-only and nothing leaves your machine.
