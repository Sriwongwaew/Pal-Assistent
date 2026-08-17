"use client";

/* Dumb: collector-kort för en ägd pal – raritetsram, stor artwork, IV och passiver. */
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import { ELEMENT_META, rarityClass } from "@/lib/constants";
import type { PassiveDef, ScoredPal, Species } from "@/lib/types";
import { useT } from "@/i18n/LocaleContext";
import { PassiveList } from "./PassiveRow";
import { GenderSymbol, IvRow, Tag } from "./PalBits";
import { palLocation } from "./PalIdent";

export interface PalCardProps {
  pal: ScoredPal;
  species: Species;
  passives: Record<string, PassiveDef>;
  extraTag?: ReactNode;
  onClick?: () => void;
}

export function PalCard({ pal, species, passives, extraTag, onClick }: PalCardProps) {
  const t = useT();
  const elColor = ELEMENT_META[species.elements[0] ?? "Normal"]?.color ?? "#3a4a5e";
  return (
    <div
      className={`pcard ${rarityClass(species.rarity)} ${onClick ? "clickable" : ""}`}
      /* Habitat: elementets färg tonar hela kortet, inte bara artworken. */
      style={{ "--elc": elColor } as CSSProperties}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
    >
      <div className="pcin">
        <div className="phd">
          <span className="plv">{t("pal.lv", { n: pal.lv })}</span>
          <span className="pname">{pal.nick || species.name}</span>
        </div>
        <div className="pstars">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i < pal.stars ? "on" : ""}>★</span>
          ))}
        </div>
        <div className="part">
          <span className="elb">
            {(species.elements.length ? species.elements : ["Normal" as const]).map((e) => (
              <span key={e} className="el" title={e}>{ELEMENT_META[e]?.emoji}</span>
            ))}
          </span>
          <span className="gsym"><GenderSymbol g={pal.g} /></span>
          {species.icon && <img src={species.icon} alt={species.name} />}
        </div>
        <IvRow iv={pal.iv} />
        <div className="pmeta">
          {pal.boss && <Tag kind="alpha">ALPHA</Tag>}
          {pal.lucky && <Tag kind="lucky">LUCKY</Tag>}
          {pal.keep ? <Tag kind="keep">{t("pal.keep")}</Tag> : <Tag kind="cond">{t("pal.condense")}</Tag>}
          {extraTag}
          {/* Platsen, inte bara behållaren: kortet pekar ut EN pal bland
              hundratals, och "Palbox" räcker inte för att hitta den. */}
          <span className="loc">{t.msg(palLocation(pal))}</span>
        </div>
        <PassiveList
          items={pal.pv.map((id) => ({
            id,
            name: passives[id]?.n ?? id,
            tier: passives[id]?.r ?? 0,
          }))}
        />
      </div>
    </div>
  );
}
