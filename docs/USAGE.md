# Using PalCompanion

This guide covers the app in depth. If you just want to get going, the [README](../README.md) is
enough: install, click **Read from the game**, done.

> The interface is in English by default (Swedish is complete too — pick your language behind the
> gear in the top bar), so the **bold** labels below match what you see.

---

## Getting started

1. Download and run the [installer](../README.md#download).
2. Start **PalCompanion** from the Start menu.
3. Click **Read from the game** in the top right.

The app finds your most recent save under `%LOCALAPPDATA%\Pal\Saved\SaveGames` by itself. Palworld
may keep running — the file is opened read-only and never touched.

### If your save is somewhere else

Click **Folder**. Leave the field empty for the game's own folder, or point it somewhere
else:

- **dedicated server** — the server's `Pal\Saved\SaveGames`
- **cloud-synced folder** — OneDrive, Dropbox, a Steam Cloud copy
- **a copy** you set aside

Both a folder and a `Level.sav` directly will work. The folder is searched four levels down, and
quotes from Explorer's *"Copy as path"* are stripped automatically. Worlds found are listed with
their timestamps so you can pick a specific one — or let **Latest saved world** follow along when
you switch worlds.

### Live mode

Tick **Live** and the app watches for the game saving, reloading your box as soon as something
happens. Catch a pal, alt-tab, and it's already in the list.

Between checks **only the save file's timestamp is read** — no parsing of a 27 MB save until the
game has actually written something new. You choose a 10, 30 or 60 second interval; the game
autosaves roughly every 30.

The occasional failure is normal: if we catch the file mid-write, the app says it looks half-written
and picks it up on the next round. After five failures in a row Live turns itself off, so a deleted
folder doesn't mean retries forever.

---

## The box

Every tile shows name, level and IVs. The colour comes from the pal's first element — that's
information, not decoration, and it carries through the whole app.

Click a tile and it moves into the hero band at the top. The **Base Info** button opens the game's
own view: level and next, condense stars, HP/hunger/sanity, Attack, Defense and Work Speed with
buff arrows, the work suitability strip, the Paldeck description and the passives as real banners.

Search, filter and sort along the top. Search matches species, nickname, element and Paldeck number.

### Reading a pal

- **IVs** (Talent) are 0–100 per stat and inherited independently of each other. 100/100/100 is the
  goal but rare — how to get there is under *Perfect 100/100/100* below.
- **Stars** are condensing, four maximum.
- **Passives** are shown as in the game: tiers 1–3 with gold arrows, tier 4 in teal, World Tree in
  rainbow and negatives in red. More arrows means stronger.
- **Alpha** and **Lucky** are marked with the game's own icons.

---

## Recommendations — the five roles

One page, five tabs, one per role: **The box · Combat · The base · Mounts & fishing · The
player**. The five gauges at the top are the tabs — each carries its role's game icon, the one
number that matters for that role and a meter, so every role's state is in view no matter which
tab you are on. One role shows at a time; the back button returns to the previous tab.

Inside a tab everything sits in **modules**: a framed panel with a small title and a count in
its header, so you can tell at a glance where one thing ends and the next begins. Sources and
caveats live in the module's footer rather than mixed into what you are reading.

### 01 · The box

The **condense queue** is one row per species, biggest gain first. Each row shows the star jump
as four lamps (filled = stars it already has, lit = stars you get now), how many specimens it
consumes, the gain as a meter against the +20 % ceiling a 4★ gives, and warning dots for
anything you might regret. Click a row and you also get **what the one you keep is good at**,
with the game's work icons and "best in box" in green — plus what the stars are actually worth
in HP, attack and defence, rather than a star count you have to convert yourself. That part is
there for a reason: it is easy to feed away your best miner just because it happened to be a
duplicate. *Why condense* — and its price, that fed pals never come back — sits in the module's
footer.

**Keep these** is everything the keep rules protect, as one bar split by reason: how big
"clean carrier" is next to "already condensed" is a thing you can see rather than count. The
chips under the bar pick a reason and the pals in it appear as tiles; a pal only counts in its
first reason. Colour groups the reasons by *kind* — gold for "the passive is the reason", blue
for IV, violet for the pal's own state.

Then **More to do** (the best expedition to send right now, what is worth butchering),
**Almost there** — species a few duplicates short of the next star — and every expedition site
with your idle firepower.

Costs are **cumulative, not a total**: 4 duplicates for the first star, then 8 more for the second,
12 for the third and 24 for the fourth — 48 in all. So the same pile of duplicates is worth very
different amounts depending on where the species already stands.

### 02 · Combat

**Do this** holds the passives your attack team is still missing (click a task and you land in a
breeding plan with them pre-filled — or the app tells you it can be implanted, if you own the
module), the cheap soul ranks and your next tower fight. Next to it: the attack formation, the
loadout cards, the best-in-slot template, the rankings (top attackers you own and globally) and
**Find a pal for…** (element × job, owned or not).

### 03 · The base

**Do this** holds crew members still standing in the box while a worse specimen works, a producer
worth keeping for the ranch before you condense the species, base defense and worker soul ranks.
Next to it: the base dream team, the loadout cards, **the ranch guide** (the species IS the
product — the level only sets the pace), the base-defense picks and best workers per work type
(your own and the game's).

### 04 · Mounts & fishing

**Do this** holds what your fastest mounts are missing (including the reserved stamina slot — a
mount without stamina drops to walking speed when the meter runs out), mount soul ranks and
fishing helpers to get. Next to it: the podium, the loadout cards, the mount template and the
full fishing list.

### 05 · The player

Pals whose partner skill buffs **you**, not themselves — the classic 4× Gobfin stack first. The
reason shown is the game's own skill text.

---

## The breeding planner

The hard part, and the reason the app exists.

### 1. Pick the target species

The grid shows every species; the ones you already own come first. Search matches name, element and
Paldeck number.

### 2. Pick what the pal is for

**Combat**, **Tanky**, **Base & work** or **Mount**. The choice suggests passives you can add with
one click. Under *Base & work* you also pick a work type (Mining, Kindling, …) and get species
suggestions sorted by work level, tagged OWNED / BREED ×n / CATCH. One click sets the species as
your target.

There is deliberately no *fishing* purpose: no passive in the game affects fishing. How well a pal
fishes comes from its partner skill, so it is the species that matters — see **Mounts & fishing**
under *Recommendations*.

### 3. Pick the passives you want

Up to four. The number beside each passive is how many carriers you have in your box. Passives are
shown as real banners, grouped World Tree → Legendary → Common → Negative.

### The goal card

Below the picker you see what the pal looks like **when the plan is done** — the species, your
wanted passives as banners, empty slots up to four, the IV goal and the work strip. The plan below
shows the steps; the goal card shows the result.

### The passive plan

First the passives are gathered. The app picks carriers from your box, one per wanted passive where
possible, and an order to breed them in. Every step shows the **odds per egg** — the chance that the
chick inherits all the wanted passives in that step.

> **Keep the line clean.** The chick inherits from the parents' *combined* passive pool. Every extra
> passive a parent carries competes with the ones you want. With four wanted passives, a single junk
> passive is enough to multiply the number of eggs — which is why parents are chosen on *purity*
> first and IVs only second.

Impossible pairs are flagged. A legendary can be paired with anything, but you can only *get* a
legendary out of an egg when both parents are that species — so a chain that has to end on one
simply doesn't exist.

### The species chain — why more steps can be cheaper

Once the passives are gathered, the app changes species toward your target. The chain is measured in
**expected number of eggs, not number of steps.**

That matters. In a real box, the shortest chain from Dogen to Renjishi was three steps — but the
first step used a partner with four passives: 1.7 % per egg, meaning roughly **59 eggs for that one
step** and 82 in total. A four-step chain with clean partners cost **25 eggs**.

When the longer route is still more than 20 % cheaper, the app shows the shortcut beside it so you
can see why the detour was chosen.

### Perfect 100/100/100

Switch the IV goal to **Perfekt** and the app searches for the shortest path to 100 in all three
stats plus your wanted passives. That's a search problem, not a pairing: each stat is inherited
independently — 30 % from the father, 30 % from the mother, and 40 % a freshly rolled value. A stat
where *both* parents have 100 therefore goes 30 % → 60 %.

In practice:

- 100/100/100 × 100/100/100 is roughly **22 % per egg**. Only one maxed parent: **2.7 %**.
- A stat neither parent has can only come from the 40 % reroll, about **1 %**. There the app warns
  you instead of pretending to have a plan.
- A pal with four passives but three 100s is often a **worse** parent than two clean 100-carriers.

In a real box the staged plan is 60–450× cheaper than the best direct pairing. You can't see that by
eye, so calculate it.

The app also accounts for **gender costing** (a chick is a 50/50, so needing a specific one costs
about double on average) and for **siblings from the same clutch sharing eggs**.

### Free mode

If you only want the shortest path from your box to a species, with no passive requirements,
**free mode** gives you that chain directly.

### About the odds

They are **estimates**, and the app says so. The inheritance model is the one the community tested
(1–4 passives inherited, uniformly distributed, without mutations) and IV inheritance likewise.
They're good enough for what they're used for: comparing two plans against each other.

### Your choices are saved

Target, purpose, wanted passives and IV goal survive a trip to the box and back. **Clear all** at
the top resets them.

---

## Troubleshooting

**"Windows protected your PC" during installation.** The installer isn't code-signed — a certificate
costs hundreds of dollars a year. Click **More info** → **Run anyway**.

**No save found.** Click **Folder** and point at the folder. On a dedicated server the save lives with
the server, not with you.

**Some pals are missing after importing.** Species Palworld added after the latest release aren't in
the species list yet; they're reported as skipped. Please open an issue. Codes like `Hunter_Rifle`
and `Believer_CrossBow` are humans, not pals, and are skipped on purpose.

**The box is empty after an update.** That's expected — species data and the breeding table may have
changed, so the data file is replaced. Click **Read from the game**, or let Live do it at the next
autosave.

**The app won't start.** Close any leftovers (`PalCompanion.exe` in Task Manager) and try again. The
program runs one instance at a time; starting it while it's already running just reopens the window.

**How do I uninstall?** Settings → Apps → PalCompanion. The program lives in
`%LOCALAPPDATA%\Programs\PalCompanion` and never touches the game's files.

---

## What the app stores, and where

| What | Where |
| --- | --- |
| Your imported box | `%LOCALAPPDATA%\Programs\PalCompanion\public\data\pal-data.json` |
| Previous version of that data | `…\PalCompanion\tools\backup\pal-data.prev.json` |
| Theme and palette | browser storage, `pa-theme` / `pa-pal` |
| Breeding planner choices | browser storage, `pa-breeding` |
| Save location and Live | browser storage, `pa-save` |
| Update check | browser storage, `pa-update` |
| Window profile and port | `%LOCALAPPDATA%\PalCompanion` |

None of it leaves your machine. The one time the app touches the network is its daily check for a
new version.
