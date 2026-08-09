/** Uppdateringsnotisens läge – när ska vi fråga GitHub, och när ska vi säga till?
 *
 * Två regler som gränssnittet inte ska behöva känna till:
 *
 * 1. **Fråga högst en gång per dygn.** GitHubs API tål 60 anrop i timmen per
 *    IP-adress, och appen startas om varje gång man vill titta på boxen. Utan
 *    en spärr skulle en aktiv kväll bränna kvoten och kollen sluta fungera just
 *    när den behövdes.
 * 2. **Ett "senare" gäller den versionen, inte för alltid.** Avfärdar man 2.1.0
 *    ska 2.2.0 fråga igen. En notis som aldrig kommer tillbaka är en notis man
 *    missar; en som kommer varje start är en man lär sig klicka bort.
 *
 * Precis som de andra sparade valen är det här gammal data när den läses:
 * allt trasigt blir tomma val i stället för fel.
 */

/** Nyckeln i localStorage – samma `pa-`-prefix som tema-, avels- och save-valen. */
export const UPDATE_PREFS_KEY = "pa-update";

/** Ett dygn mellan kollarna. */
export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Serverns svar från /api/update/check. */
export interface UpdateCheck {
  /** Falskt i bygget från källkoden – då visas ingenting alls. */
  enabled: boolean;
  current: string;
  latest?: string;
  newer: boolean;
  page?: string;
  notes?: string;
  size?: number;
  error?: string;
}

export interface UpdatePrefs {
  /** När vi senast frågade GitHub, som millisekunder. */
  lastCheck: number;
  /** Version användaren tryckt bort. Tom = ingen. */
  skipped: string;
}

export function emptyUpdatePrefs(): UpdatePrefs {
  return { lastCheck: 0, skipped: "" };
}

export function parseUpdatePrefs(raw: string | null): UpdatePrefs {
  const out = emptyUpdatePrefs();
  if (!raw) return out;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return out;
  const o = parsed as Record<string, unknown>;

  // En tidsstämpel i framtiden är trasig – den skulle annars stänga av kollen
  // tills klockan hunnit ikapp, vilket kan vara år.
  const last = typeof o.lastCheck === "number" && Number.isFinite(o.lastCheck) ? o.lastCheck : 0;
  out.lastCheck = last > 0 && last <= Date.now() ? last : 0;
  out.skipped = typeof o.skipped === "string" && o.skipped.length <= 40 ? o.skipped : "";

  return out;
}

export function serializeUpdatePrefs(prefs: UpdatePrefs): string {
  return JSON.stringify(prefs);
}

/** Har det gått ett dygn sedan vi frågade sist? */
export function shouldCheck(prefs: UpdatePrefs, now: number): boolean {
  return now - prefs.lastCheck >= CHECK_INTERVAL_MS;
}

/** Ska notisen synas för det här svaret? */
export function shouldShow(check: UpdateCheck | null, prefs: UpdatePrefs): boolean {
  if (!check || !check.enabled || !check.newer || !check.latest) return false;
  return check.latest !== prefs.skipped;
}
