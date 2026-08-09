/* Which languages the interface speaks, and how a stored preference is
   turned back into one of them.

   The list is ordered by how much of Palworld's player base each language
   reaches (China and the US are ~27 % each on Steam, Japan is the game's home
   market), with Swedish kept because it is the language the app was written in.
   English is both the default and the fallback: a key missing from any other
   catalogue falls through to English rather than rendering as `nav.box`. */

export const LOCALES = [
  { id: "en", label: "English", html: "en" },
  { id: "sv", label: "Svenska", html: "sv" },
  { id: "zh-Hans", label: "简体中文", html: "zh-Hans" },
  { id: "ja", label: "日本語", html: "ja" },
  { id: "de", label: "Deutsch", html: "de" },
  { id: "fr", label: "Français", html: "fr" },
  { id: "es", label: "Español", html: "es" },
  { id: "pt-BR", label: "Português (BR)", html: "pt-BR" },
] as const;

export type Locale = (typeof LOCALES)[number]["id"];

export const DEFAULT_LOCALE: Locale = "en";

/** localStorage key, and the cookie the server reads to avoid a flash of
    English before the client has mounted. Same value in both. */
export const LOCALE_KEY = "pa-lang";

const IDS = LOCALES.map((l) => l.id) as readonly string[];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && IDS.includes(value);
}

/** Anything at all in, a supported locale out.

    Accepts a plain tag ("sv"), a stored preference, or a browser
    Accept-Language-style tag ("pt-BR", "zh-Hans-CN", "de-AT"): an exact match
    wins, otherwise the base language decides, so "de-AT" lands on German
    instead of silently falling back to English. */
export function normalizeLocale(value: unknown): Locale {
  if (isLocale(value)) return value;
  if (typeof value !== "string") return DEFAULT_LOCALE;

  const wanted = value.trim().toLowerCase();
  if (!wanted) return DEFAULT_LOCALE;

  const exact = IDS.find((id) => id.toLowerCase() === wanted);
  if (exact) return exact as Locale;

  const base = wanted.split("-")[0];
  const byBase = IDS.find((id) => id.toLowerCase().split("-")[0] === base);
  return (byBase as Locale) ?? DEFAULT_LOCALE;
}

export function localeLabel(id: Locale): string {
  return LOCALES.find((l) => l.id === id)?.label ?? id;
}

/** The value for <html lang>. Kept separate from the id so a future locale
    can use a tag the app does not key its catalogues by. */
export function htmlLang(id: Locale): string {
  return LOCALES.find((l) => l.id === id)?.html ?? DEFAULT_LOCALE;
}
