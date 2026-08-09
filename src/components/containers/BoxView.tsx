"use client";

/* Smart: boxen i Habitat-form – vald pal i ett hero-band överst, hela boxen
   som habitat-brickor under. Sök/filter/sortering ovanför. Base Info (spelets
   1:1-replika) ligger kvar och nås via knappen i heron eller genom att klicka
   på en bricka på smal skärm. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { usePalData } from "@/context/PalDataContext";
import { useSelectedPal } from "@/context/SelectedPalContext";
import { isPerfectIv } from "@/lib/scoring";
import type { ScoredPal } from "@/lib/types";
import { GameIcon } from "@/components/ui/GameIcon";
import { PalHero, elementColor } from "@/components/ui/PalHero";

type Filter = "alla" | "spara" | "kond" | "rainbow" | "guld" | "perf" | "alpha";
type Sort = "score" | "iv" | "combat" | "lvl" | "art";

const FILTERS: [Filter, string][] = [
  ["alla", "Alla"], ["spara", "Spara"], ["kond", "Kondensera"], ["rainbow", "Rainbow"],
  ["guld", "Guldpassiv"], ["perf", "Perfekt IV"], ["alpha", "Alpha/Lucky"],
];

const PAGE = 120;

export function BoxView() {
  const { data, pals } = usePalData();
  const { select } = useSelectedPal();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("alla");
  const [sort, setSort] = useState<Sort>("score");
  const [limit, setLimit] = useState(PAGE);
  const [selId, setSelId] = useState<string | null>(null);

  const rows = useMemo(() => {
    let out = pals;
    if (query) {
      const q = query.toLowerCase();
      out = out.filter((p) =>
        data.species[p.s]!.name.toLowerCase().includes(q) ||
        p.nick.toLowerCase().includes(q) ||
        p.pv.some((id) => (data.passives[id]?.n ?? "").toLowerCase().includes(q)),
      );
    }
    const predicates: Record<Filter, (p: ScoredPal) => boolean> = {
      alla: () => true,
      spara: (p) => p.keep,
      kond: (p) => !p.keep,
      rainbow: (p) => p.tiers.includes(5),
      guld: (p) => p.tiers.includes(4),
      perf: isPerfectIv,
      alpha: (p) => p.boss || p.lucky,
    };
    out = out.filter(predicates[filter]);
    const comparators: Record<Sort, (a: ScoredPal, b: ScoredPal) => number> = {
      score: (a, b) => b.score - a.score,
      iv: (a, b) => b.ivSum - a.ivSum,
      combat: (a, b) => b.combat - a.combat,
      lvl: (a, b) => b.lv - a.lv,
      art: (a, b) => data.species[a.s]!.name.localeCompare(data.species[b.s]!.name) || b.score - a.score,
    };
    return [...out].sort(comparators[sort]);
  }, [pals, data, query, filter, sort]);

  const selected = useMemo(
    () => rows.find((p) => p.id === selId) ?? rows[0] ?? null,
    [rows, selId],
  );

  // Nollställ markering när filtret gör att den valda försvinner
  useEffect(() => {
    if (selId && !rows.some((p) => p.id === selId)) setSelId(null);
  }, [rows, selId]);

  const pick = (p: ScoredPal) => {
    setSelId(p.id);
    // på smala skärmar: öppna modalen istället (högerpanelen är dold)
    if (typeof window !== "undefined" && window.innerWidth < 980) select(p);
  };

  return (
    <>
      <div className="controls">
        <input
          type="text"
          placeholder="Sök pal, smeknamn eller passiv…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
        />
        {FILTERS.map(([id, label]) => (
          <button key={id} className={`fchip ${filter === id ? "on" : ""}`}
            onClick={() => { setFilter(id); setLimit(PAGE); }}>
            {label}
          </button>
        ))}
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="score">Sortera: Poäng</option>
          <option value="iv">Sortera: IV</option>
          <option value="combat">Sortera: Stridsstyrka</option>
          <option value="lvl">Sortera: Level</option>
          <option value="art">Sortera: Art</option>
        </select>
        <span className="meta">{rows.length} träffar</span>
      </div>

      {selected ? (
        <PalHero
          pal={selected}
          species={data.species[selected.s]!}
          data={data}
          sub={<>{selected.c} · {selected.reasons.join(" · ") || "Ingen sparaflagga"}</>}
          onOpen={() => select(selected)}
        />
      ) : (
        <div className="panel"><div className="meta">Inga pals matchar filtret.</div></div>
      )}

      <div className="boxwrap">
        <div className="boxleft">
          <div className="palgrid">
            {rows.slice(0, limit).map((p) => {
              const sp = data.species[p.s]!;
              const isSel = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  className={`pcell ${isSel ? "sel" : ""}`}
                  style={{ "--elc": elementColor(sp) } as CSSProperties}
                  onClick={() => pick(p)}
                  title={`${sp.name} · Lv ${p.lv} · IV ${p.iv.join("/")}`}
                >
                  <span className="circ">
                    {sp.icon
                      ? <img src={sp.icon} alt={sp.name} />
                      : <span className="fb">{sp.name[0]}</span>}
                    {p.boss && <span className="mk alpha" title="Alpha"><GameIcon name="alpha" size={13} /></span>}
                    {p.lucky && <span className="mk lucky" title="Lucky"><GameIcon name="lucky" size={12} /></span>}
                    {p.stars > 0 && <span className="mk stars">{p.stars}★</span>}
                  </span>
                  <span className="nm">{p.nick || sp.name}</span>
                  <span className="lv">Lv {p.lv} · {p.iv.join("/")}</span>
                </button>
              );
            })}
          </div>
          {rows.length > limit && (
            <div className="boxmore">
              <button className="ghost" onClick={() => setLimit((l) => l + 180)}>
                Visa fler ({rows.length - limit} kvar)
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
