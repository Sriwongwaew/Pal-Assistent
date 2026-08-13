"use client";

/* Dumb: boxens passivfilter – innehållet i filterpanelen där varje alternativ
   är spelets riktiga banner med bärarantal, precis som i planerarens väljare.
   Väljer man flera avgör läget vad det betyder: ALLA = "bär hela
   uppsättningen" (frågan man ställer efter en avelsförälder), NÅGON =
   "bär minst en av dem" (frågan man ställer när man städar).

   Komponenten är bara panelens KROPP: boxens filterknapp (en enda för alla
   filter, Kens rättning aug 2026 – tre selects och sju chips i samma rad
   lästes som röra) äger öppet/stängt. Sökfältet är lokal state enligt
   arkitekturregeln; själva valet (id:n + läge) bor i containern. */

import { useMemo, useState } from "react";
import { useT } from "@/i18n/LocaleContext";
import type { PassiveMode } from "@/lib/palSearch";
import type { PassiveDef } from "@/lib/types";
import { MaskIcon } from "./GameIcon";
import { passiveVisual } from "./PassiveRow";

export interface PassiveFilterBodyProps {
  passives: Record<string, PassiveDef>;
  /** Antal pals i boxen som bär respektive passiv. */
  counts: ReadonlyMap<string, number>;
  value: readonly string[];
  mode: PassiveMode;
  onToggle: (id: string) => void;
  onMode: (mode: PassiveMode) => void;
  onClear: () => void;
}

export function PassiveFilterBody({
  passives, counts, value, mode, onToggle, onMode, onClear,
}: PassiveFilterBodyProps) {
  const t = useT();
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(passives)
      .map(([id, def]) => ({ id, name: def.n, tier: def.r, carriers: counts.get(id) ?? 0 }))
      /* Bara passiver någon i boxen bär: ett filter över boxen kan inte ge
         träffar på andra, så en tom rad vore en lögn om vad som går att hitta.
         Valda ligger alltid kvar – annars går de inte att bocka ur när den
         sista bäraren matats bort. */
      .filter((o) => o.carriers > 0 || value.includes(o.id))
      .filter((o) => !q || o.name.toLowerCase().includes(q))
      // Bästa nivån först, flest bärare inom nivån – det man filtrerar på oftast.
      .sort((a, b) => b.tier - a.tier || b.carriers - a.carriers
        || a.name.localeCompare(b.name, "sv"));
  }, [passives, counts, query, value]);

  return (
    <>
      <div className="pflbar">
        <input
          type="text"
          className="grow"
          placeholder={t("picker.searchPassive")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {value.length > 0 && (
          <button type="button" className="ghost sm" onClick={onClear}>
            {t("box.pv.clear")}
          </button>
        )}
      </div>
      {/* Läget står ÖVER listan: det ändrar vad en bock betyder, så det ska
          vara läst innan man börjar bocka. */}
      <div className="pflmode">
        <span className="meta">{t("box.pv.modeLabel")}</span>
        <button
          type="button"
          className={`fchip ${mode === "all" ? "on" : ""}`}
          aria-pressed={mode === "all"}
          onClick={() => onMode("all")}
        >
          {t("box.pv.modeAll")}
        </button>
        <button
          type="button"
          className={`fchip ${mode === "any" ? "on" : ""}`}
          aria-pressed={mode === "any"}
          onClick={() => onMode("any")}
        >
          {t("box.pv.modeAny")}
        </button>
      </div>
      <div className="pfllist prows">
        {items.map((o) => {
          const { cls, color, rank } = passiveVisual(o.tier);
          const on = value.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              className={`prow sm opt ${cls} ${on ? "on" : ""}`}
              aria-pressed={on}
              data-passive={o.id}
              onClick={() => onToggle(o.id)}
            >
              <span className="nm">{on ? "✓ " : ""}{o.name}</span>
              <span className="cnt">{o.carriers || "–"}</span>
              <span className="arr">
                <MaskIcon name={`rank_${rank}`} color={color} width={20} height={18} />
              </span>
            </button>
          );
        })}
        {items.length === 0 && <div className="meta pad">{t("picker.noPassive")}</div>}
      </div>
    </>
  );
}
