"use client";

/* Dumb: leden – avelsplanen ritad som en resväg (designrundan aug 2026).
   Läsordningen är Kens: ÖVERST står bara de pals som startar linjen (första
   stegets föräldrar). En bärare eller partner som paras in i ett SENARE steg
   står som kort VID det steget, med en kort gren in i noden – annars ser
   linjen ut att säga att förra ungen paras "för att få" bärarens art.

   Grenarna mäts ur layouten (kort → nod) och ritas i en överlagring som
   räknas om när något byter storlek. Huvudlinjen mellan noderna ritas per
   rad, oskalad, så streckmönstret aldrig dras isär. Rörelsen (`.brmarch`)
   stängs av med prefers-reduced-motion. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Species } from "@/lib/types";
import { elementColor } from "./PalHero";
import { DeckNo, SpeciesIcon } from "./PalBits";

export interface RouteHead {
  /** Palens art – färgar grenens streck. */
  species: Species;
  /** Kortet, i sin helhet. */
  card: ReactNode;
  /** Radindex grenarna pekar på (normalt [0] – linjens start). */
  rows: number[];
}

export interface RouteRow {
  /** Ungens (eller målets) art – nod på leden, färgar segmentet. */
  species: Species;
  /** Etikett under noden ("unge · steg 1", "MÅL"). */
  label: string;
  /** Radens innehåll – stegkortet. Föräldrarna till steget står SOM BRICKOR
   *  inuti kortet (`.brparents` i BreedingView), inte som egna kort på leden:
   *  parningen hör hemma i steget den beskriver. Bara linjens START har kort
   *  på leden, och de är `heads`. */
  card: ReactNode;
  /** goal = målring i stället för fortsatt linje. */
  kind?: "mid" | "goal";
}

/** Ryggradens mitt: kolumnen är 128 px bred. */
const SPINE_X = 64;

interface Branch {
  d: string;
  color: string;
}

export function BreedRoute({ heads, rows }: { heads?: RouteHead[]; rows: RouteRow[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const headRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  /* Grenarna mäts ur layouten och ritas om när containern byter storlek –
     bilder som laddar, kort som fälls ut och fönsterbredd flyttar noderna. */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !heads?.length) return;

    const measure = () => {
      const wb = wrap.getBoundingClientRect();
      const out: Branch[] = [];

      heads.forEach((h, i) => {
        const he = headRefs.current[i];
        if (!he) return;
        const hb = he.getBoundingClientRect();
        const x1 = hb.left + hb.width / 2 - wb.left;
        const y1 = hb.bottom - wb.top;
        for (const r of h.rows) {
          const ne = nodeRefs.current[r];
          if (!ne) continue;
          const nb = ne.getBoundingClientRect();
          const x2 = nb.left + nb.width / 2 - wb.left;
          const y2 = nb.top - wb.top + 3;
          /* Skissens kurva, samma proportioner som artefaktens `convsvg`:
             kontrollpunkterna ligger på 55 % respektive 45 % av fallet, så
             grenen bestämmer sig för ledens x tidigt och möter de andra
             grenarna mjukt uppe i ungen. Ingenting ligger i vägen längre –
             föräldrarna står i stegkortet, inte som kort på leden – så den
             gamla omvägen runt ett partnerkort behövs inte. */
          out.push({
            d: `M ${x1} ${y1} C ${x1} ${y1 + (y2 - y1) * 0.55}, ${x2} ${y1 + (y2 - y1) * 0.45}, ${x2} ${y2}`,
            color: elementColor(h.species),
          });
        }
      });

      /* Leden med huvuden ÄGER sin start: ryggraden börjar i första radens nod,
         inte vid radens överkant – annars sticker ett streck upp förbi noden
         mot ingenting (Kens fynd aug 2026). Radens statiska lina döljs
         (`.trim`) och ersätts med det här uppmätta segmentet. */
      if (rows[0] && rows[0].kind !== "goal") {
        const ne = nodeRefs.current[0];
        const rowEl = ne?.closest(".brrow");
        if (ne && rowEl) {
          const nb = ne.getBoundingClientRect();
          const rb = rowEl.getBoundingClientRect();
          const x = nb.left + nb.width / 2 - wb.left;
          out.push({
            d: `M ${x} ${nb.top - wb.top + 3} L ${x} ${rb.bottom - wb.top}`,
            color: elementColor(rows[0].species),
          });
        }
      }

      setBranches(out);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [heads, rows.length]);

  return (
    <div className="brroute" ref={wrapRef}>
      {/* Minst två spalter, även med ETT huvud. Skissens fas 1 har två
          bärarkort vars grenar möts nere vid leden, och grenen fästs i
          kortets mitt – med en enda spalt blir kortet fullbrett och mitten
          hamnar en halv sidbredd till höger om ryggraden. Kurvan blev då en
          nästan vågrät utflykt dit och tillbaka (Kens fynd aug 2026). Ett
          ensamt huvud står i stället i vänsterspalten, där skissens första
          bärare stod, och grenen blir den korta S:en igen. */}
      {heads && heads.length > 0 && (
        <div
          className="brheads"
          style={{ "--brcols": Math.max(2, Math.min(heads.length, 3)) } as React.CSSProperties}
        >
          {heads.map((h, i) => (
            <div
              key={i}
              ref={(el) => { headRefs.current[i] = el; }}
              className="brhcard"
              style={{ "--elc": elementColor(h.species) } as React.CSSProperties}
            >
              {h.card}
            </div>
          ))}
        </div>
      )}

      {/* Den uppmätta överlagringen: en gren per kort och steg. */}
      <svg className="brov" aria-hidden="true">
        {branches.map((b, i) => (
          <path
            key={i}
            className="brmarch"
            d={b.d}
            fill="none"
            stroke={b.color}
            strokeWidth="2.5"
            strokeDasharray="7 6"
          />
        ))}
      </svg>

      {rows.map((row, i) => {
        const color = elementColor(row.species);
        const kind = row.kind ?? "mid";
        /* Första raden i en led med huvuden: den statiska linan ersätts av
           överlagringens startsegment (se measure) – annars dubbelritas den
           och sticker upp ovanför knutpunkten. */
        const trim = i === 0 && !!heads?.length && kind !== "goal";
        return (
          <div key={i} className={`brrow ${trim ? "trim" : ""}`}>
            <div className="brspine">
              <svg className="brline" aria-hidden="true">
                {kind === "goal" ? (
                  <line x1={SPINE_X} y1="0" x2={SPINE_X} y2="128" stroke={color} strokeWidth="3" />
                ) : (
                  <line
                    className="brmarch"
                    x1={SPINE_X} y1="0" x2={SPINE_X} y2="100%"
                    stroke={color} strokeWidth="2.5" strokeDasharray="7 6"
                  />
                )}
              </svg>
              {kind === "goal" && <span className="brring" style={{ borderColor: color }} />}
              <span className="brnode" style={{ "--elc": color } as React.CSSProperties}>
                <span className="bricon" ref={(el) => { nodeRefs.current[i] = el; }}>
                  <SpeciesIcon sp={row.species} size={38} radius={19} />
                </span>
                <span className="nm">{row.species.name} <DeckNo sp={row.species} /></span>
                <span className="lb">{row.label}</span>
              </span>
            </div>
            <div className="brcard" style={{ "--elc": color } as React.CSSProperties}>
              {row.card}
            </div>
          </div>
        );
      })}
    </div>
  );
}
