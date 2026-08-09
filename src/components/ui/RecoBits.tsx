/* Dumb byggstenar för rekommendationssidan: spara-listan, kondenseringskön och
 * delarna de består av.
 *
 * Sidan är en **arbetsordning**: först vad du inte får mata, sedan en rad per
 * art med vad som händer om du matar den. Detaljerna fälls ut på den rad man
 * håller på med – tolv kort samtidigt är tolv beslut samtidigt, och det var
 * det som gjorde den gamla sidan bökig.
 *
 * Ordningen är inte kosmetisk: matningen går inte att ångra, så spara-listan
 * står före kön med flit. Att den inte går att ångra sägs i `WhyCondense`;
 * varningsrutan som stod överst är borttagen.
 */
"use client";

import type { CSSProperties, ReactNode } from "react";
import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import { formatNumber, type MessageKey } from "@/i18n";
import {
  condenseGain, palUses,
  type CondenseGain, type CondensePlan, type CondenseSummary, type PalUse, type UseIndex,
} from "@/lib/condense";
import { STAR_COST } from "@/lib/constants";
import type { AppData, ScoredPal, Species } from "@/lib/types";
import { MaskIcon } from "./GameIcon";
import { PassiveList } from "./PassiveRow";
import { WorkIcon } from "./WorkIcon";
import { elementColor } from "./PalHero";
import { ElementIcons, GenderSymbol, SpeciesIcon, Stars, Tag, elementBg } from "./PalBits";

/* ============================================================
   Modellen – räknad en gång i containern
   ============================================================ */

export interface KeepGroup {
  title: MessageKey;
  hint: MessageKey;
  list: ScoredPal[];
}

export interface RecoModel {
  data: AppData;
  useIndex: UseIndex;
  /** Går att kondensera direkt, störst vinst först. */
  now: CondensePlan[];
  /** Nära nästa stjärna. */
  soon: CondensePlan[];
  /** Långt kvar eller redan 4★. */
  later: CondensePlan[];
  summary: CondenseSummary;
  keepGroups: KeepGroup[];
  /** Sparade utan utmärkande egenskap – artens bästa exemplar. */
  rest: ScoredPal[];
  totalPals: number;
  dupeCount: number;
  select: (p: ScoredPal) => void;
}

export type RecoProps = { m: RecoModel };

/** Elementets färg som kortets `--elc`. */
export const elc = (sp: Species): CSSProperties => ({ "--elc": elementColor(sp) } as CSSProperties);

export const speciesOf = (m: RecoModel, plan: CondensePlan): Species => m.data.species[plan.s]!;

export const gainOf = (m: RecoModel, plan: CondensePlan): CondenseGain => condenseGain(m.data, plan);

export const passiveItems = (m: RecoModel, p: ScoredPal) =>
  p.pv.map((id) => ({ id, name: m.data.passives[id]?.n ?? id, tier: m.data.passives[id]?.r ?? 0 }));

/** "4 → 1★ · +16 → 2★ · …" – kostnaderna är kumulativa, inte en total. */
export const STAR_LADDER = STAR_COST
  .map((c, i) => (i === 0 ? `${c} → 1★` : `+${c} → ${i + 1}★`))
  .join(" · ");

/* ============================================================
   Innehållsdelar
   ============================================================ */

/**
 * Varför man kondenserar. Stod tidigare ingenstans: sidan visade stjärnhoppet
 * och antog att man vet vad en stjärna gör. Både vinsten och priset står här,
 * för priset är det som gör valet svårt – det matade kommer aldrig tillbaka.
 */
export function WhyCondense() {
  const t = useT();
  const rich = useRichT();
  return (
    <div className="rswhy">
      <b>{t("reco.why.what")}</b>{" "}
      {rich("reco.why.body", {
        one: <i>{t("reco.why.one")}</i>,
        not: <i>{t("reco.why.not")}</i>,
        gain: <b>{t("reco.why.gain")}</b>,
      })}
      {/* Bekräftat mot palworld.wiki.gg och nodecraft (aug 2026). Det här är
          ofta ett STARKARE skäl än stat-påslaget för en basarbetare, och det
          saknades helt i texten. */}
      <b>{t("reco.why.work")}</b>{" "}
      {rich("reco.why.workBody", { one: <i>{t("reco.why.one")}</i> })}
      {/* Siffrorna är 1.0 (4/8/12/24 = 48). Fördelningen per stjärna är inte
          publicerad av Pocketpair, så raden pekar vidare till Condenser-rutan
          i stället för att låta som ett löfte. */}
      <span className="rsladder">
        {t("reco.why.cost", { ladder: STAR_LADDER })}{" "}
        {t("reco.why.costSource")}
      </span>
    </div>
  );
}

/**
 * "Bra för…" – spelets arbetsikoner.
 *
 * Tre nivåer med flit: **bäst i boxen** (grönt, ett riktigt skäl att inte mata
 * bort den), **enda i boxen** (dämpat – ingen annan kan, men nivån är låg) och
 * vanlig. Ranchen får aldrig någon av dem: varan sitter i arten, nivån är bara
 * takten, så "bäst på Farming" pekade ut den med högst siffra oavsett om man
 * ville ha det den lägger.
 */
export function UseChips({ m, p, limit = 4, compact = false }: {
  m: RecoModel; p: ScoredPal; limit?: number; compact?: boolean;
}) {
  const t = useT();
  const uses: PalUse[] = palUses(m.data, p, m.useIndex, limit);
  /* Förbehållet står som egen rad, inte inuti brickan: brickorna ligger på en
     rad som inte bryter, så en mening därinne sprängde kortet i sidled. */
  const caveats = compact
    ? []
    : [...new Set(uses.map((u) => (u.caveat ? t.msg(u.caveat) : null)).filter(Boolean))];
  return (
    <span className="couses">
      {uses.map((u) => (
        <span
          key={`${u.kind}-${u.work ?? t.msg(u.label)}`}
          className={`couse${u.best ? " best" : ""}${u.only ? " only" : ""}`}
          title={u.caveat ? t.msg(u.caveat) : undefined}
        >
          {u.work
            ? <WorkIcon type={u.work} size={14} />
            : u.kind === "combat"
              ? <MaskIcon name="attack" color="var(--ink2)" width={13} height={13} />
              : <span className="em">{u.kind === "mount" ? "🐎" : "🎣"}</span>}
          <span className="t">{t.msg(u.label)}</span>
          {u.kind === "work" && <b className="lv">{u.level}</b>}
          {!compact && u.best && <em>{t("use.best")}</em>}
          {!compact && u.only && <em className="w">{t("use.only")}</em>}
        </span>
      ))}
      {!uses.length && <span className="couse none"><span className="t">{t("use.none")}</span></span>}
      {caveats.map((c) => <span key={c} className="rscav">{c}</span>)}
    </span>
  );
}

/** Passiver som inte gör nytta på arten – banners får inte ändras, så texten står under. */
export function Misfit({ m, p }: { m: RecoModel; p: ScoredPal }) {
  const t = useT();
  if (!p.misfit.length) return null;
  return (
    <span className="komiss" title={t("reco.row.misfitWhy")}>
      {t("reco.row.misfit", { names: p.misfit.map((id) => m.data.passives[id]?.n ?? id).join(", ") })}
    </span>
  );
}

/** Raden som identifierar ett exemplar: kön, level, IV, stjärnor, taggar. */
export function PalLine({ p, container = true }: { p: ScoredPal; container?: boolean }) {
  const t = useT();
  return (
    <span className="cokeep">
      <GenderSymbol g={p.g} />
      <span className="ivt">{t("pal.lv", { n: p.lv })} · IV {p.iv.join("/")}</span>
      <Stars count={p.stars} />
      {p.boss && <Tag kind="alpha">ALPHA</Tag>}
      {p.lucky && <Tag kind="lucky">LUCKY</Tag>}
      {container && <span className="meta">{p.c}</span>}
    </span>
  );
}

/**
 * Vinsten i spelets egna siffror. "+2★" betyder ingenting för den som inte
 * räknat om det till stats; HP 3 625 → 3 987 gör det, och visar också när
 * hoppet är för litet för att vara värt exemplaren man matar bort.
 */
export function GainStats({ gain }: { gain: CondenseGain }) {
  const t = useT();
  const num = (n: number) => formatNumber(n, t.locale);
  /* Stat-namnen är spelets egna, som i Base Info – inte katalogtext. */
  const rows: [string, number, number][] = [
    ["HP", gain.before.hp, gain.after.hp],
    ["ATTACK", gain.before.atk, gain.after.atk],
    ["DEFENSE", gain.before.def, gain.after.def],
  ];
  return (
    <span className="rsgain">
      {rows.map(([k, a, b]) => (
        <span key={k} className="g">
          <span className="k">{k}</span>
          <span className="a">{num(a)}</span>
          <span className="ar">→</span>
          <span className="b">{num(b)}</span>
        </span>
      ))}
    </span>
  );
}

/** Sakerna man ångrar efteråt. Låg ton – de ska bromsa, inte skrika. */
export function WarnNotes({ plan, inline = false }: { plan: CondensePlan; inline?: boolean }) {
  const t = useT();
  if (!plan.notes.length) return null;
  return (
    <>
      {plan.notes.map((n) => (
        <p key={n.kind} className={`conote n-${n.kind}${inline ? " inl" : ""}`}>{t.msg(n.text)}</p>
      ))}
    </>
  );
}

/** Kompakt varningsmärke till täta lägen (tabell, kö) – texten ligger i title. */
export function WarnDots({ plan }: { plan: CondensePlan }) {
  const t = useT();
  if (!plan.notes.length) return <span className="rswarn none">–</span>;
  return (
    <span className="rswarn" title={plan.notes.map((n) => t.msg(n.text)).join("\n")}>
      {plan.notes.map((n) => <i key={n.kind} className={`d n-${n.kind}`} />)}
      <b>{plan.notes.length}</b>
    </span>
  );
}

/** Mätaren mot nästa stjärna efter att man matat. */
export function NextStar({ plan }: { plan: CondensePlan }) {
  const t = useT();
  if (plan.nextCost <= 0) return null;
  const pct = Math.round((plan.leftover / plan.nextCost) * 100);
  return (
    <div className="prog">
      <div className="lbl">
        <span>{t("reco.row.nextStar", { n: plan.reach + 1 })}</span>
        <span>{plan.leftover}/{plan.nextCost}</span>
      </div>
      <div className="track"><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/**
 * Artens porträtt i elementets ton.
 *
 * Måtten sätts inline: `.ava` är låst till 40 px med `overflow: hidden`, så ett
 * stort porträtt (guiden, fokus-heron) klipps till en fyrkant om man bara
 * skickar in en större bild.
 */
export function Portrait({ sp, size = 36, pad = 0 }: { sp: Species; size?: number; pad?: number }) {
  return (
    <span className="ava" style={{ background: elementBg(sp), width: size + pad * 2, height: size + pad * 2 }}>
      <SpeciesIcon sp={sp} size={size} radius={size / 2} />
    </span>
  );
}

/** Namnet med element, klickbart till Base Info för exemplaret man behåller. */
export function SpeciesTitle({ m, plan }: RecoProps & { plan: CondensePlan }) {
  const t = useT();
  const sp = speciesOf(m, plan);
  return (
    <button type="button" className="cotitle" onClick={() => m.select(plan.keeper)}
      title={t("reco.row.keeperBaseInfo")}>
      <span className="nm">{sp.name}</span>
      <span className="els"><ElementIcons sp={sp} /></span>
    </button>
  );
}

/* ============================================================
   Listor som flera förslag delar
   ============================================================ */

/** En art som inte går att kondensera än – en rad räcker, ett kort vore lögn. */
export function WaitRow({ m, plan }: RecoProps & { plan: CondensePlan }) {
  const t = useT();
  const sp = speciesOf(m, plan);
  const pct = plan.nextCost > 0 ? Math.round((plan.leftover / plan.nextCost) * 100) : 100;
  return (
    <button type="button" className="colrow" style={elc(sp)}
      onClick={() => m.select(plan.keeper)}
      title={t("reco.wait.rowTitle", { name: sp.name, have: plan.leftover, need: plan.nextCost || plan.leftover })}>
      <span className="ava sm" style={{ background: elementBg(sp) }}>
        <SpeciesIcon sp={sp} size={26} radius={13} />
      </span>
      <span className="nm">{sp.name}</span>
      <span className="need">
        {plan.nextCost > 0
          ? t("reco.wait.needs", { n: plan.missing, star: plan.reach + 1 })
          : t("reco.wait.already", { n: plan.reach })}
      </span>
      <span className="statbar" title={t("reco.wait.has", { have: plan.leftover, need: plan.nextCost })}>
        <i style={{ width: `${pct}%` }} />
      </span>
    </button>
  );
}

export function WaitLists({ m, heading = true }: RecoProps & { heading?: boolean }) {
  const t = useT();
  return (
    <>
      {heading && m.soon.length === 0 && <div className="hint">{t("reco.wait.none")}</div>}
      <div className="colist">{m.soon.map((plan) => <WaitRow key={plan.s} m={m} plan={plan} />)}</div>
      {m.later.length > 0 && (
        <details className="dgroup">
          <summary>
            {t("reco.wait.farTitle")}{" "}
            <span className="n">{t("reco.wait.farCount", { n: m.later.length })}</span>
            <span className="why">{t("reco.wait.farWhy")}</span>
          </summary>
          <div className="colist" style={{ marginTop: 8 }}>
            {m.later.map((plan) => <WaitRow key={plan.s} m={m} plan={plan} />)}
          </div>
        </details>
      )}
    </>
  );
}

/** En sparad pal som rad. */
export function KeepRow({ m, p }: RecoProps & { p: ScoredPal }) {
  const t = useT();
  const sp = m.data.species[p.s]!;
  return (
    <button type="button" className="krow" style={elc(sp)}
      onClick={() => m.select(p)} title={t("reco.row.baseInfo")}>
      <span className="ava sm" style={{ background: elementBg(sp) }}>
        <SpeciesIcon sp={sp} size={26} radius={13} />
      </span>
      <span className="knm">
        <b>{sp.name}</b>
        <GenderSymbol g={p.g} />
        <Stars count={p.stars} />
        {p.boss && <Tag kind="alpha">ALPHA</Tag>}
        {p.lucky && <Tag kind="lucky">LUCKY</Tag>}
      </span>
      <span className="ivt">{t("pal.lv", { n: p.lv })} · {p.iv.join("/")}</span>
      <UseChips m={m} p={p} limit={2} compact />
      <span className="kpv">
        <PassiveList items={passiveItems(m, p)} />
        <Misfit m={m} p={p} />
      </span>
    </button>
  );
}

/** Spara-listan grupperad efter anledning – en pal visas bara i sin första grupp. */
export function KeepGroups({ m, openFirst = 2 }: RecoProps & { openFirst?: number }) {
  const t = useT();
  return (
    <>
      {m.keepGroups.map(({ title, hint, list }, gi) => (
        <details key={title} className="dgroup" open={gi < openFirst}>
          <summary>
            {t(title)} <span className="n">({list.length})</span>
            {hint && <span className="why">{t(hint)}</span>}
          </summary>
          <div className="kgrid">{list.map((p) => <KeepRow key={p.id} m={m} p={p} />)}</div>
        </details>
      ))}
      {m.rest.length > 0 && (
        <details className="dgroup">
          <summary>
            {t("reco.keep.restTitle")} <span className="n">({m.rest.length})</span>
            <span className="why">{t("reco.keep.restWhy")}</span>
          </summary>
          <div className="kgrid">{m.rest.map((p) => <KeepRow key={p.id} m={m} p={p} />)}</div>
        </details>
      )}
    </>
  );
}

/** Tom-läget: en färsk installation har inga dubbletter alls. */
export function NothingToDo({ children }: { children: ReactNode }) {
  return <div className="okbox">{children}</div>;
}

/* ============================================================
   Kön – bandet och en rad per art
   ============================================================ */

/** Summan av allt som går att göra nu, i en rad. */
export function QueueBand({ m }: RecoProps) {
  const t = useT();
  return (
    <div className="rqband">
      <span className="k">{t("reco.band.todo")}</span>
      <span className="v">
        {t("reco.band.value", {
          species: m.summary.species, feed: m.summary.feed,
          stars: m.summary.stars, slots: m.summary.feed,
        })}
      </span>
      <span className="s">{t("reco.band.dupes", { dupes: m.dupeCount, total: m.totalPals })}</span>
    </div>
  );
}

/** Kolumnrubrikerna – samma åtta kolumner som raderna, annars glider de isär. */
export function QueueHead() {
  const t = useT();
  return (
    <div className="rqhead">
      <span>#</span><span /><span>{t("reco.head.species")}</span><span>{t("reco.head.becomes")}</span>
      <span>{t("reco.head.feed")}</span><span>{t("reco.head.slots")}</span>
      <span>{t("reco.head.watch")}</span><span />
    </div>
  );
}

/**
 * En art som en rad. Stängd säger den vad som händer; utfälld säger den vem du
 * behåller, vad stjärnorna är värda i stats och vad du bör se upp med.
 */
export function QueueRow({ m, plan, n }: RecoProps & { plan: CondensePlan; n: number }) {
  const t = useT();
  const sp = speciesOf(m, plan);
  const gain = gainOf(m, plan);
  const k = plan.keeper;
  return (
    <li>
      <details className="rqrow" style={elc(sp)}>
        <summary>
          <span className="n">{n}</span>
          <Portrait sp={sp} size={28} />
          <span className="nm">{sp.name}</span>
          <span className="jm">{plan.fromStars}★ <i>→</i> <b>{plan.reach}★</b></span>
          <span className="fd">{t("reco.queue.count", { n: plan.feed })}</span>
          <span className="sl">+{plan.feed}</span>
          <WarnDots plan={plan} />
          <span className="cv" aria-hidden>▾</span>
        </summary>

        <div className="rqbody">
          <div className="c">
            <span className="rsk">{t("reco.row.youKeep")}</span>
            <button type="button" className="rqkeep" onClick={() => m.select(k)} title={t("reco.row.baseInfo")}>
              <PalLine p={k} />
            </button>
            <PassiveList items={passiveItems(m, k)} />
            <Misfit m={m} p={k} />
            <div className="rquses"><UseChips m={m} p={k} /></div>
          </div>
          <div className="c">
            <span className="rsk">{t("reco.row.itGives")}</span>
            <GainStats gain={gain} />
            <p className="rqfact">
              {t("reco.row.fact", { pct: gain.pct, slots: plan.feed })}
              {plan.leftover > 0 && t("reco.row.leftover", { n: plan.leftover })}
            </p>
            <WarnNotes plan={plan} inline />
            <NextStar plan={plan} />
          </div>
        </div>
      </details>
    </li>
  );
}
