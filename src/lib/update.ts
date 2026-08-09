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

/** Vad en koll landade i, sett från någon som just tryckt på knappen. */
export type CheckOutcome = "off" | "failed" | "newer" | "latest";

/**
 * Den automatiska kollen tiger om allt utom en ny version – att appen är
 * offline är ett normaltillstånd, inte ett fel att visa. En knapptryckning är
 * motsatsen: då har någon ställt en fråga och ska få ett svar även när svaret
 * är dåligt.
 *
 * Därför är `failed` ett eget läge och inte hopslaget med `latest`. "Du kör den
 * senaste versionen" är ett **löfte**, och det får vi inte ge när vi inte kunde
 * fråga GitHub – då hade knappen intygat att allt var i sin ordning i precis
 * det läge där den inte visste något alls.
 */
export function checkOutcome(check: UpdateCheck | null): CheckOutcome {
  if (!check || !check.enabled) return "off";
  if (check.error || !check.latest) return "failed";
  return check.newer ? "newer" : "latest";
}

/**
 * Får den här filen laddas ner och **köras**?
 *
 * GitHub kan i teorin svara med vilken URL som helst i `browser_download_url`,
 * och den URL:en pekar ut en binär som startas. Kontrollen är därför en av de
 * fyra spärrarna i `/api/update/install` – ta den inte bort.
 *
 * Den jämför den **tolkade** adressen, inte strängen. En `startsWith` på
 * `https://github.com/<repo>/releases/download/` ser rätt ut men släpper igenom
 * `.../releases/download/../../någon-annan`, eftersom `fetch` normaliserar bort
 * `..` medan strängjämförelsen inte gör det. `new URL` normaliserar sökvägen
 * först, och skiljer dessutom på värd och användarnamn: `https://github.com@ond.se/`
 * har värden `ond.se`, vilket en strängjämförelse missar helt.
 */
export function isTrustedAssetUrl(url: string, repo: string): boolean {
  if (!repo) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.host !== "github.com") return false;
  return parsed.pathname.startsWith(`/${repo}/releases/download/`);
}

/** En rad ur utgåvans noteringar, redo att renderas. */
export interface NoteBlock {
  kind: "rubrik" | "punkt" | "text";
  text: string;
}

/**
 * Gör utgåvans text läsbar i appen.
 *
 * Texten kommer från CHANGELOG.md via GitHub och är alltså Markdown, men att dra
 * in en Markdown-renderare för fyra punktlistor vore oproportionerligt. Vi bryr
 * oss om tre saker – rubrik, punkt, stycke – och skalar bort de tecken som annars
 * läcker igenom som skräp: `**fet**` mitt i en mening ser trasigt ut, inte
 * betonat.
 *
 * Allt vi inte känner igen blir vanlig text. Det är avsiktligt: en notering ska
 * hellre se enkel ut än försvinna för att den råkade innehålla en tabell.
 */
export function notesToBlocks(notes: string): NoteBlock[] {
  const out: NoteBlock[] = [];

  for (const raw of notes.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    // Fet/kursiv/kod-markörer och länkar tas bort men texten behålls.
    const clean = (text: string) =>
      text
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/(\*\*|__|`|\*|_)/g, "")
        .trim();

    if (line.startsWith("#")) {
      const text = clean(line.replace(/^#+\s*/, ""));
      if (text) out.push({ kind: "rubrik", text });
    } else if (/^[-*+]\s/.test(line)) {
      const text = clean(line.replace(/^[-*+]\s*/, ""));
      if (text) out.push({ kind: "punkt", text });
    } else {
      const text = clean(line);
      if (text) out.push({ kind: "text", text });
    }
  }

  return out;
}
