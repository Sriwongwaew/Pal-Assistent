"use client";

/* Dumb: ljust/mörkt/system + Habitats tre paletter.
   Valen skrivs på <html data-theme data-pal> och sparas i localStorage;
   samma nycklar läses av inline-skriptet i layout.tsx innan första
   målningen, så sidan aldrig blinkar fel tema. */
import { useEffect, useState } from "react";

export const THEME_KEY = "pa-theme";
export const PAL_KEY = "pa-pal";

type Theme = "system" | "light" | "dark";
type Pal = "basalt" | "nattskog" | "djupvatten";

const THEMES: [Theme, string][] = [["light", "Ljust"], ["system", "Auto"], ["dark", "Mörkt"]];
/** Punkten i knappen visar palettens accentfärg i mörkt läge. */
const PALS: [Pal, string, string][] = [
  ["basalt", "Basalt", "#8f7bff"],
  ["nattskog", "Nattskog", "#5ad06b"],
  ["djupvatten", "Djupvatten", "#4aa8ff"],
];

export function ThemeControls() {
  const [theme, setTheme] = useState<Theme>("system");
  const [pal, setPal] = useState<Pal>("basalt");

  // Spegla vad inline-skriptet redan satt, så knapparna visar rätt läge.
  useEffect(() => {
    const el = document.documentElement;
    setTheme((el.dataset.theme as Theme) || "system");
    setPal((el.dataset.pal as Pal) || "basalt");
  }, []);

  const applyTheme = (t: Theme) => {
    setTheme(t);
    const el = document.documentElement;
    if (t === "system") delete el.dataset.theme;
    else el.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch { /* privat läge – strunt samma */ }
  };

  const applyPal = (p: Pal) => {
    setPal(p);
    document.documentElement.dataset.pal = p;
    try { localStorage.setItem(PAL_KEY, p); } catch { /* privat läge – strunt samma */ }
  };

  return (
    <div className="tctl">
      <div className="seg" role="group" aria-label="Färgläge">
        {THEMES.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={theme === id} onClick={() => applyTheme(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="pals" role="group" aria-label="Palett">
        {PALS.map(([id, label, color]) => (
          <button
            key={id}
            type="button"
            className="swatch"
            aria-pressed={pal === id}
            aria-label={`Palett: ${label}`}
            title={label}
            style={{ background: color }}
            onClick={() => applyPal(id)}
          />
        ))}
      </div>
    </div>
  );
}
