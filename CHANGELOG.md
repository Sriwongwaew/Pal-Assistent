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
