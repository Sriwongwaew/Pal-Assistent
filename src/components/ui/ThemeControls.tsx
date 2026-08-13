"use client";

/* Dumb: light/dark/system, Habitat's three palettes, and the language.
   The choices are written onto <html data-theme data-pal lang> and saved in
   localStorage; the same keys are read by the inline script in layout.tsx
   before the first paint, so the page never flashes the wrong theme. */
import { useEffect, useState } from "react";
import { LOCALES, type Locale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n";

export const THEME_KEY = "pa-theme";
export const PAL_KEY = "pa-pal";

type Theme = "system" | "light" | "dark";
type Pal = "basalt" | "nightwood" | "deepwater" | "dusk";

const THEMES: [Theme, MessageKey][] = [
  ["light", "theme.light"],
  ["system", "theme.auto"],
  ["dark", "theme.dark"],
];

/** The dot in the button shows the palette's accent colour in dark mode.
 *  Dusk first — it has been the default since the August 2026 design round. */
const PALS: [Pal, MessageKey, string][] = [
  ["dusk", "palette.dusk", "#ffcf6e"],
  ["basalt", "palette.basalt", "#8f7bff"],
  ["nightwood", "palette.nightwood", "#5ad06b"],
  ["deepwater", "palette.deepwater", "#4aa8ff"],
];

export function ThemeControls() {
  const [theme, setTheme] = useState<Theme>("system");
  const [pal, setPal] = useState<Pal>("dusk");
  const { locale, setLocale } = useLocale();
  const t = useT();

  // Mirror what the inline script already set, so the buttons show the real state.
  useEffect(() => {
    const el = document.documentElement;
    setTheme((el.dataset.theme as Theme) || "system");
    setPal((el.dataset.pal as Pal) || "dusk");
  }, []);

  const applyTheme = (next: Theme) => {
    setTheme(next);
    const el = document.documentElement;
    if (next === "system") delete el.dataset.theme;
    else el.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode — never mind */ }
  };

  const applyPal = (next: Pal) => {
    setPal(next);
    document.documentElement.dataset.pal = next;
    try { localStorage.setItem(PAL_KEY, next); } catch { /* private mode — never mind */ }
  };

  return (
    <div className="tctl">
      <div className="seg" role="group" aria-label={t("theme.aria")}>
        {THEMES.map(([id, key]) => (
          <button key={id} type="button" aria-pressed={theme === id} onClick={() => applyTheme(id)}>
            {t(key)}
          </button>
        ))}
      </div>
      <div className="pals" role="group" aria-label={t("palette.aria")}>
        {PALS.map(([id, key, color]) => (
          <button
            key={id}
            type="button"
            className="swatch"
            aria-pressed={pal === id}
            aria-label={t("palette.named", { name: t(key) })}
            title={t(key)}
            style={{ background: color }}
            onClick={() => applyPal(id)}
          />
        ))}
      </div>
      {/* Eight languages do not fit as chips in a rail this narrow, and the
          native control is the one every reader already knows how to operate
          in their own language. Each option carries its own endonym, so it is
          findable even when the interface is currently in a language you do
          not read. */}
      <select
        className="lang"
        aria-label={t("language.aria")}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((l) => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}
