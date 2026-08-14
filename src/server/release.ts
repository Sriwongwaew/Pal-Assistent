/** Uppslag av senaste utgåvan på GitHub. Endast serversidan.
 *
 * Både `/api/update/check` och `/api/update/install` går genom den här modulen,
 * och install-rutten hämtar utgåvan **på nytt** i stället för att lita på vad
 * klienten skickar. Skillnaden är hela säkerhetsmodellen: en webbsida som får
 * bestämma vilken URL servern laddar ner och kör är en fjärrkörningsbugg, inte
 * en uppdateringsfunktion.
 *
 * PA_REPO bakas in vid bygget av GitHub Actions (`owner/namn`). Ett bygge från
 * källkoden har den tom, och då är hela funktionen avstängd – en utvecklare ska
 * aldrig få en ruta som vill installera över hans arbetskopia.
 */

import { serverT } from "@/i18n/server";
import { INSTALLER_ASSET_NAMES, isTrustedAssetUrl as trustedAssetUrl } from "@/lib/update";
import { isNewer } from "@/lib/version";

/** `owner/namn`, tomt när appen inte är byggd av utgåve-workflowen. */
export const REPO = process.env.PA_REPO ?? "";
export const VERSION = process.env.PA_VERSION ?? "0.0.0";

/**
 * Filnamnen i utgåvan. Stabila med flit – `latest`-länken bygger på dem.
 *
 * `ASSET_NAME` är det vi själva bygger och det som står i felmeddelanden.
 * Uppslaget nedan går ändå via `INSTALLER_ASSET_NAMES` och inte via den här
 * konstanten: skulle namnet någon gång behöva bytas är det listan som får bära
 * övergången, och då finns bara ett ställe att lägga den på.
 */
export const ASSET_NAME = "PalCompanion-Setup.exe";
export const SUMS_NAME = "SHA256SUMS.txt";

/** GitHub svarar snabbt eller inte alls; vi väntar inte in en hängd förbindelse. */
const TIMEOUT_MS = 10_000;
/** Hur länge ett svar återanvänds. Utan cache är 60 anrop/timme lätt att bränna. */
const CACHE_MS = 6 * 60 * 60 * 1000;
/**
 * Golvet för en koll användaren själv bett om.
 *
 * Knappen ska kännas som att den gör något – därför inte sex timmar – men den
 * får inte heller bli en gratis linje till GitHub. Kvoten är 60 anrop i timmen
 * per IP, och den delas av alla som råkar sitta bakom samma. En minut är
 * omärkligt för den som klickar en gång och ett tak för den som klickar tjugo.
 */
export const MANUAL_CACHE_MS = 60_000;

export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
}

export interface ReleaseInfo {
  /** Taggen som den står på GitHub, t.ex. "v2.1.0". */
  tag: string;
  /** Versionen utan ledande v. */
  version: string;
  /** Sidan att öppna i webbläsaren. */
  page: string;
  notes: string;
  published: string;
  installer: ReleaseAsset | null;
  sums: ReleaseAsset | null;
}

interface GithubAsset {
  name?: unknown;
  browser_download_url?: unknown;
  size?: unknown;
}

interface GithubRelease {
  tag_name?: unknown;
  html_url?: unknown;
  body?: unknown;
  published_at?: unknown;
  assets?: unknown;
}

let cache: { at: number; value: ReleaseInfo } | null = null;

function asset(raw: unknown): ReleaseAsset | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as GithubAsset;
  if (typeof a.name !== "string" || typeof a.browser_download_url !== "string") return null;
  return {
    name: a.name,
    url: a.browser_download_url,
    size: typeof a.size === "number" ? a.size : 0,
  };
}

/**
 * Hämtar senaste utgåvan. Kastar med ett meddelande som går att visa för en
 * användare – "kunde inte nå GitHub" är information, en stacktrace är det inte.
 *
 * `maxAge` är hur gammalt ett cachat svar får vara. Tre anropare, tre behov:
 * den automatiska kollen tar standardvärdet, knappen i foten `MANUAL_CACHE_MS`
 * och installationen `0` – den senare måste ha färska URL:er och en färsk
 * kontrollsumma, för det är dem den laddar ner och kör.
 */
export async function latestRelease(maxAge = CACHE_MS): Promise<ReleaseInfo> {
  const t = await serverT();
  if (!REPO) throw new Error(t("api.noRelease"));

  const now = Date.now();
  if (maxAge > 0 && cache && now - cache.at < maxAge) return cache.value;

  let response: Response;
  try {
    response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        // GitHub kräver en User-Agent och svarar 403 utan.
        "User-Agent": `PalCompanion/${VERSION}`,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new Error(t("api.githubUnreachable"));
  }

  if (response.status === 404) {
    throw new Error(t("api.noReleases"));
  }
  if (response.status === 403 || response.status === 429) {
    throw new Error(t("api.githubRateLimit"));
  }
  if (!response.ok) {
    throw new Error(`GitHub svarade ${response.status}.`);
  }

  const raw = (await response.json()) as GithubRelease;
  const tag = typeof raw.tag_name === "string" ? raw.tag_name : "";
  if (!tag) throw new Error(t("api.releaseNoVersion"));

  const assets = Array.isArray(raw.assets) ? raw.assets.map(asset) : [];
  const value: ReleaseInfo = {
    tag,
    version: tag.replace(/^v/i, ""),
    page: typeof raw.html_url === "string" ? raw.html_url : `https://github.com/${REPO}/releases`,
    notes: typeof raw.body === "string" ? raw.body : "",
    published: typeof raw.published_at === "string" ? raw.published_at : "",
    // Namnen prövas i tur och ordning, inte utgåvans egen ordning: bär en
    // övergångsutgåva båda filerna ska den nya väljas.
    installer:
      INSTALLER_ASSET_NAMES.map((name) => assets.find((a) => a?.name === name)).find(Boolean) ??
      null,
    sums: assets.find((a) => a?.name === SUMS_NAME) ?? null,
  };

  cache = { at: now, value };
  return value;
}

/** Är utgåvan nyare än den som kör? */
export function releaseIsNewer(release: ReleaseInfo): boolean {
  return isNewer(release.version, VERSION);
}

/**
 * Nedladdningen får bara komma från utgåvorna i vårt eget repo.
 *
 * Själva jämförelsen ligger i `src/lib/update.ts` för att kunna testas utan
 * miljövariabler; här knyts den bara till vårt eget PA_REPO. Ta inte bort den:
 * URL:en pekar ut en fil vi laddar ner och **kör**.
 */
export function isTrustedAssetUrl(url: string): boolean {
  return trustedAssetUrl(url, REPO);
}
