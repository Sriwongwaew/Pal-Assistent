/* Dumb: Habitats hero-band. Används både på Översikt (boxens stjärna) och
   i Boxen (vald pal). Elementets färg tonar porträttet, brickorna och
   IV-staplarna – det är hela poängen med riktningen. */
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import { ELEMENT_ICON, ELEMENT_META, WORK_META, WORK_TYPES } from "@/lib/constants";
import type { AppData, ScoredPal, Species } from "@/lib/types";
import { GameIcon } from "./GameIcon";
import { PassiveList } from "./PassiveRow";
import { WorkIcon } from "./WorkIcon";

export function elementColor(sp: Species): string {
  return ELEMENT_META[sp.elements[0] ?? "Normal"]?.color ?? "#8f7bff";
}

export interface PalHeroProps {
  pal: ScoredPal;
  species: Species;
  data: AppData;
  /** Liten etikett ovanför namnet, t.ex. "Boxens stjärna". */
  kicker?: ReactNode;
  /** Rad under namnet – fri text (skäl, level, behållare…). */
  sub?: ReactNode;
  /** Öppnar Base Info-modalen. */
  onOpen?: () => void;
}

export function PalHero({ pal, species, data, kicker, sub, onOpen }: PalHeroProps) {
  const work = WORK_TYPES.map((t) => [t, species.ws[t] ?? 0] as const).filter(([, lv]) => lv > 0);
  const els = species.elements.length ? species.elements : (["Normal"] as const);
  const ivs: [string, number][] = [["HP", pal.iv[0]], ["ATK", pal.iv[1]], ["DEF", pal.iv[2]]];

  return (
    <div className="hero" style={{ "--elc": elementColor(species) } as CSSProperties}>
      <div className="hpor">
        {species.icon && <img src={species.icon} alt={species.name} />}
      </div>

      <div className="hbody">
        {kicker && <div className="kick">{kicker}</div>}
        <div className="hname">{pal.nick || species.name}</div>
        <div className="chips">
          {els.map((e) => (
            <span key={e} className="chip elc" style={{ "--c": ELEMENT_META[e]?.color } as CSSProperties}>
              <GameIcon name={ELEMENT_ICON[e] ?? "neutral"} size={14} />{e}
            </span>
          ))}
          {pal.boss && <span className="chip alpha"><GameIcon name="alpha" size={13} />Alfa</span>}
          {pal.lucky && <span className="chip"><GameIcon name="lucky" size={13} />Lucky</span>}
          <span className="chip">Lv {pal.lv}</span>
          <span className="chip">No.{species.deck}</span>
          <span className="chip">
            <span className="st">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i < pal.stars ? "on" : ""}>★</span>
              ))}
            </span>
          </span>
        </div>
        {sub && <div className="hsub">{sub}</div>}
        <div className="hstats">
          {ivs.map(([k, v]) => (
            <div key={k} className={`hstat ${v >= 100 ? "max" : ""}`}>
              <div className="k">IV {k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
          <div className="hstat"><div className="k">Poäng</div><div className="v">{pal.score}</div></div>
        </div>
        {onOpen && (
          <button type="button" className="ghost" onClick={onOpen}>Base Info</button>
        )}
      </div>

      <div className="hpassives">
        <span className="kick" style={{ display: "block", marginBottom: 6 }}>Passiva färdigheter</span>
        <PassiveList
          items={pal.pv.map((id) => ({
            id, name: data.passives[id]?.n ?? id, tier: data.passives[id]?.r ?? 0,
          }))}
        />
      </div>

      <div className="hside">
        <span className="k">Arbetslämplighet</span>
        <div className="hwork">
          {work.length ? work.map(([t, lv]) => (
            <span key={t} className="wi" title={`${WORK_META[t]!.label} Lv ${lv}`}>
              <WorkIcon type={t} size={18} />
              <b>{lv}</b>
            </span>
          )) : <span className="meta">Inget arbete</span>}
        </div>
        <span className="k" style={{ marginTop: 16 }}>Talang (IV)</span>
        <div className="ivbars">
          {ivs.map(([k, v]) => (
            <div key={k} className={`ivbar ${v >= 100 ? "max" : ""}`}>
              <span className="k">{k}</span>
              <span className="t"><i style={{ width: `${Math.min(100, v)}%` }} /></span>
              <span className="n">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
