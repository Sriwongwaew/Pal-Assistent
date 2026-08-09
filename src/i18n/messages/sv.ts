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
};
