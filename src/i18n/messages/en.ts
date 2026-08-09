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
} as const;

export type Messages = typeof en;
export type MessageKey = keyof Messages;

/* What every other language is typed as. `Partial<Messages>` would demand the
   English *literal* — "Boxen" is not assignable to "Box" — because `as const`
   is what gives us the key union in the first place. So the keys come from
   English and the values are plain strings: an unknown key still fails to
   compile, a missing one still falls back. */
export type Catalogue = Partial<Record<MessageKey, string>>;
