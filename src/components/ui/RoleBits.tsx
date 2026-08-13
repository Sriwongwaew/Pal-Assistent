"use client";

/* Dumb: Rollernas byggstenar — "Konsolen" (Kens val ur fyra designförslag
   aug 2026, omdesignrunda 2: den förra ytan underkändes som "böklig … mycket
   saker i luften och klutter").

   Diagnosen var tre saker, och konsolen svarar på alla tre:

   1. **Ingenting höll ihop innehållet.** Chips, rubriker och listor låg fritt
      mot bakgrunden. Nu bor allt i MODULER (`Module`): ram, rubrikband och en
      räknare i huvudet. Ögat ser var en sak slutar utan att läsa.
   2. **Allt hade samma vikt.** En KPI, en uppgift och en fotnot var lika
      stora. Nu är rollens siffror MÄTARE högst upp (`RoleGauge`) och
      modulernas rubriker är små — innehållet är det stora.
   3. **Listor i listor.** Kön och spara-grupperna var båda utfällbara rader.
      Nu är kön en radlista med LED-stjärnor och vinstmätare (se `RecoBits`)
      och spara-listan ett segmentband — en bild i stället för nio rubriker.

   Plattorna bakom flikrad och band är fortfarande borta (Kens begäran
   aug 2026): mätarraden och modulnätet har inga wrappar-ytor. Skillnaden är
   att modulerna ÄR innehållsytor och därför bär sina egna ramar — det är just
   den regeln, inte ett undantag från den. Bygg inte en panel runt raderna.

   Fliken väljs fortfarande med URL-hashen (#rh-box … #rh-player): mätarna är
   vanliga ankare, containern lyssnar på `hashchange`, och gamla djuplänkar
   fortsätter landa rätt. `RoleHead` bär ankarets id. */

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useT } from "@/i18n/LocaleContext";
import type { Species } from "@/lib/types";
import { partnerSkill } from "@/lib/partnerSkills";
import { SpeciesIcon, elementBg } from "./PalBits";

export const elcStyle = (color: string): CSSProperties => ({ "--elc": color } as CSSProperties);

/* ============================================================
   Mätarraden – fem rollkort som också är flikarna
   ============================================================ */

export function RoleDash({ children }: { children: ReactNode }) {
  const t = useT();
  return <nav className="rhdash" aria-label={t("hub.idx.aria")}>{children}</nav>;
}

/**
 * En roll som instrument: nummer, namn med spelikon, rollens huvudsiffra och
 * en mätare.
 *
 * **Mätaren är alltid en riktig andel**, aldrig kosmetik – därför är `fill`
 * ett tal 0–1 och `meter` texten som säger vad andelen ÄR (den läses av
 * skärmläsare och som verktygstips). En stapel utan innebörd hade varit exakt
 * den sortens dekoration omdesignen skulle bli av med.
 */
export function RoleGauge({ href, no, name, value, label, note, color, icon, fill, meter, on = false }: {
  href: string;
  /** Rollens ordningstal – "01" … "05". Siffra, inte katalogtext. */
  no: string;
  name: string;
  value: ReactNode;
  label: ReactNode;
  note: ReactNode;
  color: string;
  icon?: ReactNode;
  /** Andel 0–1. */
  fill: number;
  meter: string;
  on?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(fill) ? fill : 0)) * 100;
  return (
    <a href={href} style={elcStyle(color)} className={`rhg${on ? " on" : ""}`}
      aria-current={on ? "true" : undefined}>
      <span className="rw">
        <span className="no num">{no}</span>
        <span className="nm">{icon && <span className="ric">{icon}</span>}{name}</span>
      </span>
      <span className="big">
        <b className="num">{value}</b>
        <span className="l">{label}</span>
      </span>
      <span className="n">{note}</span>
      <span className="m" role="img" aria-label={meter} title={meter}>
        <i style={{ width: `${pct}%` }} />
      </span>
    </a>
  );
}

/* ============================================================
   Rollens rad + modulnätet
   ============================================================ */

/**
 * Rollens rubrikrad. Medvetet smal: siffrorna bor i mätarna ovanför, så här
 * står bara vad rollen är och vilken fråga den svarar på. Den gamla raden av
 * KPI-piller var en av de saker som "låg i luften".
 */
export function RoleHead({ id, no, color, title, question }: {
  id: string; no: string; color: string; title: ReactNode; question: ReactNode;
}) {
  return (
    <header className="rhhead" id={id} style={elcStyle(color)}>
      <span className="rn num">{no}</span>
      <h2>{title}</h2>
      <span className="q">{question}</span>
    </header>
  );
}

export function ModGrid({ children }: { children: ReactNode }) {
  return <div className="rhgrid">{children}</div>;
}

/**
 * En spalt av moduler i nätet.
 *
 * Varför den finns: moduler direkt i rutnätet blir RADER, och två rader vars
 * moduler är olika höga lämnar ett tomrum lika högt som skillnaden — första
 * försöket hade 250 px luft mellan kön och "Mer att göra". En spalt staplar
 * sina moduler tätt och nästa spalt bryr sig inte om höjden. Fördela därför
 * modulerna så att spalterna blir ungefär lika långa; helt jämnt behöver det
 * inte bli, luften hamnar under den korta spalten och inte mitt i sidan.
 */
export function ModCol({ span, children }: { span: 4 | 5 | 6 | 7 | 8; children: ReactNode }) {
  return <div className={`rhcol s${span}`}>{children}</div>;
}

/**
 * En modul: ram, rubrikband med räknare, kropp.
 *
 * `span` är kolumner i tolvspaltsnätet – håll modulerna FÅ och STORA. Tolv
 * små moduler är samma klutter som tolv lösa listor, bara med ramar runt.
 * `flush` tar bort kroppens innerkant för listor som ska gå ut i kanten.
 */
export function Module({ title, count, span = 12, tone, flush = false, foot, children }: {
  title: ReactNode;
  /** Räknaren i huvudet – siffran som gör rubriken kontrollerbar. */
  count?: ReactNode;
  span?: 4 | 5 | 6 | 7 | 8 | 12;
  /** Elementton för modulens ram; utelämnad ärver rollens. */
  tone?: string;
  flush?: boolean;
  /** Fotnot under kroppen – källor och förbehåll hör hit, inte i brödtexten. */
  foot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`rhmod s${span}`} style={tone ? elcStyle(tone) : undefined}>
      <header className="rhmh">
        <h3>{title}</h3>
        {count !== undefined && <span className="n">{count}</span>}
      </header>
      <div className={`rhmb${flush ? " flush" : ""}`}>{children}</div>
      {foot && <div className="rhmf">{foot}</div>}
    </section>
  );
}

/** Mellanrubrik inne i en modul. */
export function RhSub({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <h4 className="rhsub">
      {children}
      {note && <span className="note">{note}</span>}
    </h4>
  );
}

/* ============================================================
   Uppgiften – numrerad rad i en "Gör detta"-modul
   ============================================================ */

/**
 * En uppgift. Med `children` blir den en utfällbar `<details>`; med `href`
 * en länkrad; annars en statisk rad. Nummer + titel + chips är samma anatomi
 * i alla tre, så modulen läses som EN lista.
 */
export function Task({ n, color, title, body, chips, open, href, onClick, children }: {
  n: number;
  /** Elementton – utelämnad ärver modulens. */
  color?: string;
  title: ReactNode;
  /** En rads faktatext under titeln (alltid synlig). */
  body?: ReactNode;
  /** `.imp`-brickor under texten. */
  chips?: ReactNode;
  open?: boolean;
  href?: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const style = color ? elcStyle(color) : undefined;
  const inner = (
    <>
      <span className="ix num">{n}</span>
      <div className="tx">
        <h5>{title}</h5>
        {body && <p>{body}</p>}
        {chips && <div className="imp">{chips}</div>}
      </div>
    </>
  );
  if (children) {
    return (
      <details className="rhtask" style={style} open={open}>
        <summary>{inner}<span className="cv" aria-hidden>▾</span></summary>
        <div className="rhtb">{children}</div>
      </details>
    );
  }
  if (href) {
    return (
      <Link className="rhtask lnk" style={style} href={href}>
        {inner}<span className="cv" aria-hidden>→</span>
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className="rhtask lnk" style={style} onClick={onClick}>
        {inner}<span className="cv" aria-hidden>→</span>
      </button>
    );
  }
  return <div className="rhtask" style={style}>{inner}</div>;
}

/* ============================================================
   Flyttat ur BestView (sidan gick upp i rollerna aug 2026)
   ============================================================ */

/* Partnerskillen som chip: NAMNET syns, spelets beskrivning ligger i title.
   Det är svaret på "varför just den?" som rankningarna aldrig kunde ge. */
export function PartnerChip({ code }: { code: string }) {
  const ps = partnerSkill(code);
  if (!ps) return null;
  return <span className="pskill" title={ps.desc}>◈ {ps.skill}</span>;
}

export function TeamPortrait({ species, why, rank, size = 58 }: {
  species: Species; why: ReactNode; rank?: number;
  /** Porträttets sida – formationen låter ettan vara störst. */
  size?: number;
}) {
  return (
    <div className="tp">
      {/* Utanför .por: den har overflow:hidden för att maska bilden rund. */}
      {rank !== undefined && <span className={`rank pin r${Math.min(rank, 4)}`}>{rank}</span>}
      <div className="por" style={{ width: size + 14, height: size + 14 }}>
        <div className="bgel" style={{ background: elementBg(species) }} />
        {species.icon && <SpeciesIcon sp={species} size={size} radius={Math.round(size / 4.5)} />}
      </div>
      <div className="nm">{species.name}</div>
      <PartnerChip code={species.code} />
      <div className="why">{why}</div>
    </div>
  );
}
