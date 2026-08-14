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
 * Repona en nedladdning får komma ifrån: bara det inbakade `PA_REPO`.
 *
 * Under namnbytet (2.4.0–2.6.0) stod här också en `SUCCESSOR_REPO`, så en app
 * byggd under det gamla namnet kunde hämta binären ur det omdöpta repot. Utan
 * den hade en installerad app sett den nya versionen, annonserat den och sedan
 * vägrat installera den – för alltid. Den raden hörde till de gamla byggena, och
 * de har den redan: `PA_REPO` pekar numera på PalCompanion, och GitHub
 * omdirigerar dessutom det gamla namnet hit.
 *
 * Spärren är oförändrad i sak. Adressen jämförs mot ett repo som bakats in vid
 * bygget, aldrig mot något GitHub eller klienten får bestämma, och
 * kontrollsumman kontrolleras som förut. En fork bygger med sitt eget `PA_REPO`
 * och hämtar därför bara från sig själv – samma tanke som att den får sin egen
 * källkodslänk i foten.
 */
export function trustedRepos(repo: string): string[] {
  return repo ? [repo] : [];
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
  const repos = trustedRepos(repo);
  if (repos.length === 0) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.host !== "github.com") return false;
  return repos.some((r) => parsed.pathname.startsWith(`/${r}/releases/download/`));
}

/**
 * Filnamnen uppdateringen lägger ut. Måste stämma med `Launcher.cs`, som letar
 * efter skriptet på namnet. *Mappen* de ligger i står bara på ett ställe –
 * launchern skickar den till servern som `PA_UPDATE_DIR`.
 */
export const UPDATE_SCRIPT_NAME = "uppdatera.cmd";
export const UPDATE_INSTALLER_NAME = "PalCompanion-Setup.exe";

/**
 * Namnen en installationsfil kan ha i en utgåva, det nyaste först.
 *
 * Ett namn numera. Listan var två lång under namnbytet (2.4.0–2.6.0), så att en
 * app byggd under det gamla namnet skulle hitta installern i den omdöpta
 * utgåvan. Den här byggnaden uppdaterar bara till versioner som redan heter
 * PalCompanion, så det andra namnet har spelat ut sin roll.
 *
 * Formen är kvar som lista eftersom uppslaget är **ordnat**: nästa gång något
 * byter namn läggs det nya först, och då fungerar övergången av sig själv.
 */
export const INSTALLER_ASSET_NAMES = ["PalCompanion-Setup.exe"];

/**
 * Skriptet som byter ut programmet mot den nedladdade versionen.
 *
 * Tre saker i den här texten är inlärda med möda, och alla tre ser ut som
 * petitesser tills uppdateringen tyst slutar fungera:
 *
 * 1. **`timeout` går inte att använda.** Den kräver en riktig konsol och
 *    avslutar direkt med "Input redirection is not supported" så fort stdin är
 *    omdirigerad – vilket den alltid är här. Väntan blev alltså noll sekunder,
 *    och installern startade medan appen fortfarande höll sina filer öppna.
 *    Vi väntar därför på att processen faktiskt är borta, med `ping` som klocka.
 * 2. **Ingen sökväg står i texten.** En `.cmd` läses i datorns OEM-teckentabell,
 *    inte i UTF-8, så ett användarnamn med å, ä eller ö hade gjort sökvägen
 *    obegriplig för cmd. Allt kommer i stället från `%~dp0` (mappen skriptet
 *    ligger i) och `%PA_APP_EXE%` (miljövariabel från launchern) – båda går som
 *    Unicode hela vägen. Det gör dessutom skriptet identiskt för alla, alltså
 *    testbart.
 * 3. **Skriptet städar bort sig självt.** `(goto)` får cmd att släppa
 *    handtaget på filen först; resten av raden är redan inläst och körs ändå.
 *    Utan det blir en 70 MB stor installer kvar i användarens LOCALAPPDATA
 *    efter varje uppdatering.
 *
 * Kommentarerna i själva skriptet är på engelska och utan å/ä/ö, av samma
 * kodtabellsskäl som punkt 2. Förklaringen bor här i stället.
 */
export function updateScript(): string {
  return (
    [
      "@echo off",
      "rem PalCompanion update. Started by PalCompanion.exe when the server has",
      "rem exited - never by the server itself, whose children die with the job",
      "rem object that keeps node.exe and the window in check.",
      "setlocal",
      "",
      "rem Where to start again afterwards. The launcher passes this as an",
      "rem environment variable; the fallback is the default install location.",
      "if not defined PA_APP_EXE set " +
        '"PA_APP_EXE=%LOCALAPPDATA%\\Programs\\PalCompanion\\PalCompanion.exe"',
      'set "PA_WORK=%~dp0"',
      'set "PA_WORK=%PA_WORK:~0,-1%"',
      "rem The process to wait for is whatever the launcher is called - read it",
      "rem from the path instead of hardcoding it, so the script still works",
      "rem across the release that renames the program.",
      'for %%I in ("%PA_APP_EXE%") do set "PA_APP_NAME=%%~nxI"',
      "",
      "rem Wait for the app to let go of its files. Not with timeout: it needs a",
      "rem console and exits immediately when stdin is redirected, which it is.",
      "set /a PA_TRIES=0",
      ":wait",
      'tasklist /fi "imagename eq %PA_APP_NAME%" /nh 2>nul | ' +
        'find /i "%PA_APP_NAME%" >nul || goto install',
      "set /a PA_TRIES+=1",
      "if %PA_TRIES% GEQ 60 goto install",
      "ping -n 2 127.0.0.1 >nul",
      "goto wait",
      "",
      ":install",
      `"%PA_WORK%\\${UPDATE_INSTALLER_NAME}" /SILENT /SUPPRESSMSGBOXES /NORESTART ` +
        '/LOG="%PA_WORK%\\..\\update.log"',
      'start "" "%PA_APP_EXE%"',
      "",
      "rem Remove our own folder. (goto) makes cmd let go of this file first,",
      "rem while the rest of the line has already been read and still runs.",
      '(goto) 2>nul & rd /s /q "%PA_WORK%"',
    ].join("\r\n") + "\r\n"
  );
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
