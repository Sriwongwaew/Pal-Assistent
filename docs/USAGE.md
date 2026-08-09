# Using PalAssistent

This guide covers the app in depth. If you just want to get going, the [README](../README.md) is
enough: install, click **Read from the game**, done.

> The interface is currently in Swedish. Swedish labels are given in **bold** below with a
> translation, so you can follow along.

---

## Getting started

1. Download and run the [installer](../README.md#download).
2. Start **PalAssistent** from the Start menu.
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
their timestamps so you can pick a specific one — or let **senast sparade världen** (*most recently
saved world*) follow along when you switch worlds.

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

## Recommendations

### Kondensera nu (*condense now*)

One action card per species that already has enough duplicates, ranked by biggest gain. The card
tells you what you win (0★ → 2★), how many specimens it consumes, how many box slots it frees — and
above all **what the one you keep is good at**, with the game's work icons and "best in box" in
green.

That last part is there for a reason: it's easy to feed away your best miner just because it
happened to be a duplicate.

### Nästan där (*almost there*)

Species a few specimens short of the next star. Worth knowing before you release a pal.

### Spara dessa (*keep these*)

Grouped by reason — best of its species, perfect IVs, rare passives, Lucky, alpha. Click for Base
Info.

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
fishes comes from its partner skill, so it is the species that matters — see **Fishing pals** on
*Best for…*.

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

Impossible pairs are flagged. Legendaries only breed with their own species, so a chain through one
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
**fritt läge** (*free mode*) gives you that chain directly.

### About the odds

They are **estimates**, and the app says so. The inheritance model is the one the community tested
(1–4 passives inherited, uniformly distributed, without mutations) and IV inheritance likewise.
They're good enough for what they're used for: comparing two plans against each other.

### Your choices are saved

Target, purpose, wanted passives and IV goal survive a trip to the box and back. **Rensa allt**
(*clear all*) at the top resets them.

---

## Best for…

- **Attack team** and **base dream team** from your own box.
- **Best workers per work type**, both from your own box and globally. Global rows are clickable and
  take you straight to a breeding plan for that species.
- **Fishing pals** (Palworld 1.0) and **fastest mounts**.

Each suggestion also shows the four passives the role really wants, against what the pal already
carries.

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

**The app won't start.** Close any leftovers (`PalAssistent.exe` in Task Manager) and try again. The
program runs one instance at a time; starting it while it's already running just reopens the window.

**How do I uninstall?** Settings → Apps → PalAssistent. The program lives in
`%LOCALAPPDATA%\Programs\PalAssistent` and never touches the game's files.

---

## What the app stores, and where

| What | Where |
| --- | --- |
| Your imported box | `%LOCALAPPDATA%\Programs\PalAssistent\public\data\pal-data.json` |
| Previous version of that data | `…\PalAssistent\tools\backup\pal-data.prev.json` |
| Theme and palette | browser storage, `pa-theme` / `pa-pal` |
| Breeding planner choices | browser storage, `pa-breeding` |
| Save location and Live | browser storage, `pa-save` |
| Update check | browser storage, `pa-update` |
| Window profile and port | `%LOCALAPPDATA%\PalAssistent` |

None of it leaves your machine. The one time the app touches the network is its daily check for a
new version.
