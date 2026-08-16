"use client";

/* Dumb: art-väljare som ett ikonrutnät i spelets boxstil i stället för en dropdown.
   Sökfältet är rent presentationsstate – valet självt äger föräldern. */

import { useT } from "@/i18n/LocaleContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Species } from "@/lib/types";
import { DeckNo, ElementIcons, elementBg, SpeciesIcon } from "./PalBits";

export interface PalPickerProps {
  species: Species[];
  owned: ReadonlySet<number>;
  value: number | null;
  onChange: (index: number | null) => void;
  /** Visa bara arter du äger (bas-väljaren) – annars hela paldecket. */
  ownedOnly?: boolean;
  /** Text för "inget valt"-rutan. Utelämnas den går valet inte att nollställa. */
  noneLabel?: string;
}

export function PalPicker({
  species, owned, value, onChange, ownedOnly = false, noneLabel,
}: PalPickerProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [mineOnly, setMineOnly] = useState(ownedOnly);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const restrict = ownedOnly || mineOnly;
    return species
      .map((sp, i) => ({ sp, i }))
      .filter(({ sp, i }) => {
        if (restrict && !owned.has(i)) return false;
        if (!q) return true;
        // Sök också på element ("fire") och Paldeck-nummer ("134") – det är så
        // man letar när man vet vad man vill ha men inte vad den heter.
        return sp.name.toLowerCase().includes(q)
          || sp.code.toLowerCase().includes(q)
          || sp.elements.some((e) => e.toLowerCase().includes(q))
          || (sp.deck > 0 && String(sp.deck) === q);
      })
      // Ägda först – det är dem man planerar med – sedan bokstavsordning.
      .sort((a, b) => {
        const mine = Number(owned.has(b.i)) - Number(owned.has(a.i));
        return mine || a.sp.name.localeCompare(b.sp.name, "sv");
      });
  }, [species, owned, query, mineOnly, ownedOnly]);

  const selected = value !== null ? species[value] : undefined;

  const gridRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<HTMLButtonElement>(null);

  /* Rullar fram den valda cellen i rutnätet. Rutnätet är 300 arter högt men
     bara 320 px synligt, och ett sparat val ligger nästan alltid utanför –
     kommer man tillbaka till planeraren ser rutnätet därför tomt ut fast valet
     lever. Bara rutnätets egen scrollTop rörs, aldrig sidans. Returnerar false
     när rutnätet är dolt (bas-väljaren ligger i en stängd <details>), så
     anroparen kan vänta tills det får höjd. */
  const reveal = useCallback((onlyIfHidden: boolean) => {
    const grid = gridRef.current;
    const cell = selRef.current;
    if (!grid || !cell || !grid.clientHeight) return false;
    const g = grid.getBoundingClientRect();
    const c = cell.getBoundingClientRect();
    // Halvsynlig räknas som synlig: annars hoppar listan när man klickar på en
    // cell i underkanten.
    if (onlyIfHidden && c.bottom > g.top + 4 && c.top < g.bottom - 4) return true;
    grid.scrollTop += c.top - g.top - (g.height - c.height) / 2;
    return true;
  }, []);

  useEffect(() => {
    // Inget valt, eller bortfiltrerat av sökningen – då finns ingen cell att visa.
    if (value === null || !selRef.current || reveal(true)) return;
    // Dolt rutnät: visa valet först när <details> öppnas och det får en höjd.
    const grid = gridRef.current;
    if (!grid) return;
    const ro = new ResizeObserver(() => { if (reveal(true)) ro.disconnect(); });
    ro.observe(grid);
    return () => ro.disconnect();
  }, [value, reveal]);

  return (
    <div className="picker">
      <div className="picker-bar">
        <input
          type="text"
          className="grow"
          placeholder={t("picker.searchSpecies")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!ownedOnly && (
          <button
            type="button"
            className={`fchip ${mineOnly ? "on" : ""}`}
            onClick={() => setMineOnly((v) => !v)}
          >
            {t("picker.onlyMine")}
          </button>
        )}
        {selected ? (
          // Valet som en riktig bricka, inte "Vald: <namn>" i löptext – och
          // klickbar, för sökningen kan ha filtrerat bort den ur rutnätet.
          <button
            type="button"
            className="selchip"
            title={`Vald: ${selected.name} – visa i listan`}
            onClick={() => reveal(false)}
          >
            <SpeciesIcon sp={selected} size={20} radius={6} />
            <b>{selected.name}</b>
            <ElementIcons sp={selected} size={14} />
            <DeckNo sp={selected} />
          </button>
        ) : (
          <span className="meta">{rows.length} arter</span>
        )}
      </div>

      <div className="picker-grid" ref={gridRef}>
        {noneLabel && (
          <button
            type="button"
            className={`pcell ${value === null ? "sel" : ""}`}
            onClick={() => onChange(null)}
          >
            <span className="circ none">✕</span>
            <span className="nm">{noneLabel}</span>
          </button>
        )}
        {rows.map(({ sp, i }) => (
          <button
            type="button"
            key={i}
            ref={value === i ? selRef : undefined}
            className={`pcell ${value === i ? "sel" : ""}`}
            /* Ingen `title`: webbläsarens egen ruta krockar med hover-rutan, och
               den sa bara namnet som redan står under porträttet. */
            data-species={sp.code}
            onClick={() => onChange(i)}
          >
            <span className="circ" style={{ background: elementBg(sp) }}>
              <SpeciesIcon sp={sp} size={52} radius={26} />
              {owned.has(i) && <span className="mk owned" title={t("picker.youOwn")} />}
              <span className="els"><ElementIcons sp={sp} size={14} /></span>
            </span>
            <span className="nm">{sp.name}</span>
            <DeckNo sp={sp} />
          </button>
        ))}
        {rows.length === 0 && <div className="meta pad">{t("picker.noSpecies")}</div>}
      </div>
    </div>
  );
}
