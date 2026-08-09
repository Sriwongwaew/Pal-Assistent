"use client";

/* Smart: boxen i Habitat-form – vald pal i ett hero-band överst, hela boxen
   som habitat-brickor under. Sök/filter/sortering ovanför. Base Info (spelets
   1:1-replika) ligger kvar och nås via knappen i heron eller genom att klicka
   på en bricka på smal skärm. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { usePalData } from "@/context/PalDataContext";
import { useSelectedPal } from "@/context/SelectedPalContext";
import { useT } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n";
import { isPerfectIv } from "@/lib/scoring";
import type { ScoredPal } from "@/lib/types";
import { GameIcon } from "@/components/ui/GameIcon";
import { PalHero, elementColor } from "@/components/ui/PalHero";

type Filter = "alla" | "spara" | "kond" | "rainbow" | "guld" | "perf" | "alpha";
type Sort = "score" | "iv" | "combat" | "lvl" | "art";

const FILTERS: [Filter, MessageKey][] = [
  ["alla", "box.filter.all"], ["spara", "box.filter.keep"], ["kond", "box.filter.condense"],
  ["rainbow", "box.filter.rainbow"], ["guld", "box.filter.gold"], ["perf", "box.filter.perfect"],
  ["alpha", "box.filter.alpha"],
];

const SORTS: [Sort, MessageKey][] = [
  ["score", "box.sort.score"], ["iv", "box.sort.iv"], ["combat", "box.sort.combat"],
  ["lvl", "box.sort.level"], ["art", "box.sort.species"],
];

const PAGE = 120;

export function BoxView() {
  const { data, pals } = usePalData();
  const { select } = useSelectedPal();
  const t = useT();
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
      // Artnamnen är spelets egna (engelska), men sorteringen ska ändå följa
      // läsarens språk – annars hamnar Ä och Ö fel för den som läser svenska.
      art: (a, b) =>
        data.species[a.s]!.name.localeCompare(data.species[b.s]!.name, t.locale) || b.score - a.score,
    };
    return [...out].sort(comparators[sort]);
  }, [pals, data, query, filter, sort, t.locale]);

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
          placeholder={t("box.search")}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
        />
        {FILTERS.map(([id, key]) => (
          <button key={id} className={`fchip ${filter === id ? "on" : ""}`}
            onClick={() => { setFilter(id); setLimit(PAGE); }}>
            {t(key)}
          </button>
        ))}
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          {SORTS.map(([id, key]) => (
            <option key={id} value={id}>{t(key)}</option>
          ))}
        </select>
        <span className="meta">{t.plural("box.hits", rows.length)}</span>
      </div>

      {selected ? (
        <PalHero
          pal={selected}
          species={data.species[selected.s]!}
          data={data}
          sub={<>{selected.c} · {selected.reasons.map(t.msg).join(" · ") || t("pal.noKeepFlag")}</>}
          onOpen={() => select(selected)}
        />
      ) : (
        <div className="panel"><div className="meta">{t("box.noMatch")}</div></div>
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
                  title={t("pal.cellTitle", { name: sp.name, lv: p.lv, iv: p.iv.join("/") })}
                >
                  <span className="circ">
                    {sp.icon
                      ? <img src={sp.icon} alt={sp.name} />
                      : <span className="fb">{sp.name[0]}</span>}
                    {p.boss && <span className="mk alpha" title={t("pal.alpha")}><GameIcon name="alpha" size={13} /></span>}
                    {p.lucky && <span className="mk lucky" title={t("pal.lucky")}><GameIcon name="lucky" size={12} /></span>}
                    {p.stars > 0 && <span className="mk stars">{p.stars}★</span>}
                  </span>
                  <span className="nm">{p.nick || sp.name}</span>
                  <span className="lv">{t("pal.lv", { n: p.lv })} · {p.iv.join("/")}</span>
                </button>
              );
            })}
          </div>
          {rows.length > limit && (
            <div className="boxmore">
              <button className="ghost" onClick={() => setLimit((l) => l + 180)}>
                {t("box.more", { n: rows.length - limit })}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
