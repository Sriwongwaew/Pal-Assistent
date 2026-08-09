"use client";

/* Dumb småkomponenter: avatarer, element-ikoner, taggar, IV-plattor, stat-tiles. */
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import { ELEMENT_ICON, ELEMENT_META } from "@/lib/constants";
import type { ElementType, Gender, Species } from "@/lib/types";
import { useT } from "@/i18n/LocaleContext";
import { GameIcon } from "./GameIcon";

export function elementBg(sp: Species): string {
  const el = sp.elements[0] ?? "Normal";
  const c = ELEMENT_META[el]?.color ?? "#26304a";
  return `radial-gradient(circle at 35% 30%, ${c}40, ${c}14 70%)`;
}

export function SpeciesIcon({ sp, size = 30, radius = 8 }: { sp: Species; size?: number; radius?: number }) {
  const style: CSSProperties = { width: size, height: size, borderRadius: radius };
  return sp.icon
    ? <img src={sp.icon} alt={sp.name} style={style} />
    : <span className="fb" style={{ ...style, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{sp.name[0]}</span>;
}

export function GenderSymbol({ g }: { g: Gender }) {
  if (g === "M") return <GameIcon name="male" size={14} />;
  if (g === "F") return <GameIcon name="female" size={14} />;
  return <span style={{ color: "var(--muted)" }}>•</span>;
}

export function ElementIcons({ sp, size = 17 }: { sp: Species; size?: number }) {
  const els: ElementType[] = sp.elements.length ? sp.elements : ["Normal"];
  return (
    <>
      {els.map((e) => (
        <span key={e} className="el" title={e}>
          <GameIcon name={ELEMENT_ICON[e] ?? "neutral"} size={size} />
        </span>
      ))}
    </>
  );
}

/**
 * Paldeck-numret, så man hittar arten i spelets Paldeck.
 *
 * Två saker datasetet gör som gränssnittet måste respektera:
 * 1. **Varianter delar basartens nummer** (Wumpo och Wumpo Botan är båda 134).
 *    Spelet skiljer dem med en bokstav – "134B" – men suffixet finns inte i
 *    datasetet, så vi visar basnumret. Det leder till rätt uppslag ändå.
 * 2. **0 och −1 betyder "inget index"** (platshållarna, och Lamball som saknar
 *    nummer i exporten). Skriv aldrig ut "No.0" – då ser en dataset-lucka ut
 *    som ett riktigt nummer.
 */
export function DeckNo({ sp }: { sp: Species }) {
  const t = useT();
  if (sp.deck <= 0) return null;
  return (
    <span className="deckno" title={t("pal.deckTitle", { n: sp.deck })}>
      {t("pal.deck", { n: sp.deck })}
    </span>
  );
}

export type TagKind = "alpha" | "lucky" | "keep" | "cond" | "info";

export function Tag({ kind, children }: { kind: TagKind; children: ReactNode }) {
  return <span className={`tag ${kind}`}>{children}</span>;
}

export function Stars({ count }: { count: number }) {
  return count > 0 ? <span className="stars">{"★".repeat(count)}</span> : null;
}

export function IvStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={`iv ${value >= 100 ? "max" : ""}`}>
      <div className="k">{label}</div>
      <div className="n">{value}</div>
      <div className="bar"><i style={{ width: `${Math.min(100, value)}%` }} /></div>
    </div>
  );
}

export function IvRow({ iv }: { iv: [number, number, number] }) {
  return (
    <div className="ivrow">
      <IvStat label="HP" value={iv[0]} />
      <IvStat label="ATK" value={iv[1]} />
      <IvStat label="DEF" value={iv[2]} />
    </div>
  );
}

export function StatTile({ value, label, sub, tint }: { value: ReactNode; label: string; sub?: string; tint: string }) {
  return (
    <div className="tile" style={{ "--tint": tint } as CSSProperties}>
      <div className="v">{value}</div>
      <div className="l">{label}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

export function Section({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="panel">
      <span className="notch" />
      <h2>{title}</h2>
      {sub && <div className="sub">{sub}</div>}
      {children}
    </div>
  );
}
