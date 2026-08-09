/** Sparade val i avelsplaneraren.
 *
 * Planeraren är det enda stället i appen där man klickar ihop något som tar tid
 * – mål-art, syfte, syssla och upp till fyra passiver. Att tappa allt bara för
 * att man gick till Boxen och tittade på en pal är den enklaste tänkbara
 * irritationen, så valen skrivs som JSON under `pa-breeding` i localStorage.
 *
 * Allt som läses tillbaka valideras mot den **aktuella** datan: art-index pekar
 * rakt in i `data.species` och passiv-id:n in i `data.passives`, och båda kan ha
 * flyttat sig sedan förra gången (en ny Palworld-patch → ny `pal-data.json` →
 * nya index). Ett gammalt index skulle annars slå igenom som
 * `data.species[target]!` = undefined och krascha hela sidan i stället för att
 * bara vara ett bortglömt val. Samma sak för handredigerad localStorage.
 */
import { WORK_TYPES } from "./constants";
import { PURPOSES, type PurposeId } from "./purpose";
import type { IvGoal } from "./breeding";
import type { AppData, WorkType } from "./types";

/** Nyckeln i localStorage – samma `pa-`-prefix som temavalen. */
export const BREEDING_PREFS_KEY = "pa-breeding";

/** Spelet ger en pal högst fyra passiver, så väljaren stannar där. */
export const MAX_WANTED = 4;

export interface BreedingPrefs {
  /** Art-index i `data.species`, eller null. */
  target: number | null;
  base: number | null;
  /** Passiv-id:n, högst `MAX_WANTED`, utan dubbletter. */
  wanted: string[];
  ivGoal: IvGoal;
  purpose: PurposeId | null;
  /** Bara meningsfull när `purpose === "work"`. */
  work: WorkType | null;
}

/** Ny tom uppsättning. Funktion, inte konstant, så ingen kan råka dela `wanted`. */
export function emptyBreedingPrefs(): BreedingPrefs {
  return { target: null, base: null, wanted: [], ivGoal: "fast", purpose: null, work: null };
}

/** Art-index bara om det pekar på en art som finns i den här bundlen. */
function speciesIdx(v: unknown, data: AppData): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < data.species.length
    ? v
    : null;
}

/**
 * Tolkar det som ligger i localStorage. Trasig JSON, fel typer och försvunna
 * arter/passiver ger tomma val i stället för fel – ett sparat val är aldrig
 * viktigare än att sidan går att öppna.
 */
export function parseBreedingPrefs(raw: string | null, data: AppData): BreedingPrefs {
  const out = emptyBreedingPrefs();
  if (!raw) return out;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return out;
  const o = parsed as Record<string, unknown>;

  out.target = speciesIdx(o.target, data);
  out.base = speciesIdx(o.base, data);

  if (Array.isArray(o.wanted)) {
    const seen = new Set<string>();
    for (const id of o.wanted) {
      // Dubbletter skulle ge två banners med samma React-nyckel och dessutom
      // räknas två gånger i arvspoolen.
      if (typeof id !== "string" || seen.has(id) || !(id in data.passives)) continue;
      seen.add(id);
      out.wanted.push(id);
      if (out.wanted.length === MAX_WANTED) break;
    }
  }

  out.ivGoal = o.ivGoal === "perfect" ? "perfect" : "fast";
  out.purpose = PURPOSES.some((p) => p.id === o.purpose) ? (o.purpose as PurposeId) : null;
  // Sysslan hänger på syftet: väljaren nollar den så fort man lämnar "Bas & arbete".
  out.work = out.purpose === "work" && WORK_TYPES.includes(o.work as WorkType)
    ? (o.work as WorkType)
    : null;

  return out;
}

export function serializeBreedingPrefs(prefs: BreedingPrefs): string {
  return JSON.stringify(prefs);
}

/** Finns det något att rensa? Styr om "Rensa allt" är klickbar. */
export function hasBreedingPrefs(prefs: BreedingPrefs): boolean {
  return prefs.target !== null || prefs.base !== null || prefs.wanted.length > 0
    || prefs.purpose !== null || prefs.ivGoal !== "fast";
}
