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

- **The app now only listens to itself.** PalAssistent runs a small web server on your own machine,
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
