/** Var save-filen ligger och om den ska läsas om automatiskt.
 *
 * Standardläget är fortfarande spelets egen mapp
 * (`%LOCALAPPDATA%\Pal\Saved\SaveGames`), men den räcker inte för alla: en
 * dedikerad server, en molnsynkad mapp eller en kopierad save ligger någon
 * annanstans. Därför kan man peka ut mappen själv – och när den väl är utpekad
 * kan appen hålla koll på när spelet sparat och läsa in på nytt av sig själv.
 *
 * Valen ligger under `pa-save` i localStorage. Precis som avelsplanerarens val
 * är de alltid *gamla* när de läses tillbaka: sökvägen kan peka på en mapp som
 * inte finns längre. Här kan det aldrig krascha sidan (allt är strängar), men
 * en trasig sökväg ska ge tomt fält i stället för konstiga fel från servern, så
 * allt valideras ändå vid inläsning.
 */

/** Nyckeln i localStorage – samma `pa-`-prefix som tema- och avelsvalen. */
export const SAVE_PREFS_KEY = "pa-save";

/** Sekunder mellan koll på om saven ändrats. Spelet autosparar ca var 30:e. */
export const LIVE_INTERVALS = [10, 30, 60] as const;

export type LiveInterval = (typeof LIVE_INTERVALS)[number];

export interface SavePrefs {
  /** Mapp att leta `Level.sav` i. Tom sträng = spelets egen mapp. */
  root: string;
  /** Vald `Level.sav`. Tom = den senast ändrade i mappen. */
  path: string;
  /** Läs om automatiskt när spelet sparat. */
  live: boolean;
  /** Hur ofta vi kollar, i sekunder. */
  every: LiveInterval;
}

/** Ny tom uppsättning. Funktion, inte konstant, så ingen kan råka dela objektet. */
export function emptySavePrefs(): SavePrefs {
  return { root: "", path: "", live: false, every: 30 };
}

/** En sökväg vi vågar skicka till servern: sträng, inte tom, inte orimligt lång. */
function pathish(v: unknown): string {
  if (typeof v !== "string") return "";
  // Explorer klistrar in med citattecken runt sig vid "Kopiera som sökväg".
  const text = v.trim().replace(/^"|"$/g, "").trim();
  return text.length > 0 && text.length <= 500 ? text : "";
}

/**
 * Tolkar det som ligger i localStorage. Trasig JSON och fel typer ger tomma val
 * i stället för fel – ett sparat val är aldrig viktigare än att sidan öppnas.
 */
export function parseSavePrefs(raw: string | null): SavePrefs {
  const out = emptySavePrefs();
  if (!raw) return out;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return out;
  const o = parsed as Record<string, unknown>;

  out.root = pathish(o.root);
  out.path = pathish(o.path);
  out.live = o.live === true;
  out.every = LIVE_INTERVALS.includes(o.every as LiveInterval)
    ? (o.every as LiveInterval)
    : 30;

  // Live utan vald fil är inget fel: då gäller den senast ändrade i mappen, och
  // den slås upp vid första kollen.
  return out;
}

export function serializeSavePrefs(prefs: SavePrefs): string {
  return JSON.stringify(prefs);
}
