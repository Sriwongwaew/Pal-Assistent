/* Dumb byggstenar för rekommendationssidan: spara-listan, kondenseringskön och
 * delarna de består av.
 *
 * Sedan "Konsolen" (Kens val ur fyra designförslag aug 2026, omdesignrunda 2)
 * är de två stora delarna instrument i stället för listor:
 *
 * - **Kön** är radlista (`CondenseRow`): löpnummer, porträtt, art,
 *   LED-stjärnor som visar hoppet, antal att mata, vinstmätare och
 *   varningsprickar. Detaljerna fälls ut på den rad man håller på med – tolv
 *   utfällda kort samtidigt är tolv beslut samtidigt, och det var det som
 *   gjorde första versionen bökig.
 * - **Sparade** är ett segmentband (`KeepConsole`): 291 pals som EN bild,
 *   delad på skäl, med skälen som väljbara brickor under. Nio hopfällda
 *   rubriker sa aldrig hur stor någon grupp var i förhållande till de andra.
 *
 * Segmentens färg är inte dekoration: den säger vilken FAMILJ av skäl gruppen
 * hör till (passiv / IV / status / artens bästa), och tonen kommer ur temats
 * egna tokens så båda lägena fungerar. Element­färgen är reserverad för pals.
 *
 * Ordningen är inte kosmetisk: matningen går inte att ångra, så det som ska
 * sparas redovisas i samma flik. Att matningen inte går att ångra sägs i
 * `WhyCondense`; varningsrutan som stod överst är borttagen på Kens begäran.
 */
"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import { formatNumber, type MessageKey } from "@/i18n";
import {
  condenseGain, palUses,
  type CondenseGain, type CondensePlan, type CondenseSummary, type PalUse, type UseIndex,
} from "@/lib/condense";
import { STAR_COST } from "@/lib/constants";
import type { AppData, ScoredPal, Species } from "@/lib/types";
import { GameIcon, MaskIcon } from "./GameIcon";
import { PassiveList } from "./PassiveRow";
import { WorkIcon } from "./WorkIcon";
import { elementColor } from "./PalHero";
import { ElementIcons, GenderSymbol, SpeciesIcon, Stars, Tag, elementBg } from "./PalBits";

/* ============================================================
   Modellen – räknad en gång i containern
   ============================================================ */

/**
 * Familjen ett spara-skäl hör till. Segmentbandets färg kommer härifrån, och
 * det är information: `pv` = passiven är skälet, `iv` = IV är skälet, `st` =
 * palens tillstånd (lucky, redan kondenserad, i partyt), `rest` = inget
 * utmärkande men artens bästa exemplar. Utan familjerna hade bandet behövt nio
 * godtyckliga färger, och en godtycklig färg ser ut som att den betyder något.
 */
export type KeepFamily = "pv" | "iv" | "st" | "rest";

export interface KeepGroup {
  title: MessageKey;
  hint: MessageKey;
  fam: KeepFamily;
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
  /** Spara-grupperna, sista gruppen är "artens bästa (övriga)". */
  keepGroups: KeepGroup[];
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

/** Hur många exemplar en vald grupp visar innan "visa alla". */
const KEEP_PREVIEW = 12;

/** Det starkaste skälet gruppen handlar om – bannern som ska synas i brickan. */
const topPassive = (m: RecoModel, p: ScoredPal) => {
  const items = passiveItems(m, p);
  if (!items.length) return null;
  return items.reduce((best, cur) => (cur.tier > best.tier ? cur : best));
};

/** En sparad pal som bricka: porträtt, namn, IV och det skäl den sparas för. */
export function KeepCell({ m, p }: RecoProps & { p: ScoredPal }) {
  const t = useT();
  const sp = m.data.species[p.s]!;
  const top = topPassive(m, p);
  return (
    <button type="button" className="kscell" style={elc(sp)}
      onClick={() => m.select(p)} title={t("reco.row.baseInfo")}>
      <span className="ava" style={{ background: elementBg(sp), width: 44, height: 44 }}>
        <SpeciesIcon sp={sp} size={44} radius={22} />
      </span>
      {/* Spelets egna märken, inte förkortningar: brickan är 118 px bred, och
          "A"/"L" var obegripligt medan "ALPHA"/"LUCKY" tryckte bort namnet.
          Ikonen är samma som i Base Info, alltså redan inlärd. */}
      <span className="nm">
        {sp.name}
        <GenderSymbol g={p.g} />
        {p.boss && <GameIcon name="alpha" size={13} />}
        {p.lucky && <GameIcon name="lucky" size={12} />}
      </span>
      <span className="ivt num">
        {t("pal.lv", { n: p.lv })} · {p.iv.join("/")}
        {p.stars > 0 && <Stars count={p.stars} />}
      </span>
      {top && <PassiveList items={[top]} />}
    </button>
  );
}

/**
 * Sparade som instrument: segmentbandet visar hela mängden delad på skäl,
 * brickorna under är väljare, och den valda gruppens exemplar ritas som celler.
 *
 * Valet bor lokalt med flit – det är ett filter över samma data, precis som en
 * sökruta, och ingen annan del av sidan behöver veta vilket skäl man tittar på.
 * Familjetonen (`fam`) styr färgen; stegen inom en familj skiljer grupperna åt
 * utan att införa nya hues.
 */
export function KeepConsole({ m }: RecoProps) {
  const t = useT();
  const groups = m.keepGroups;
  const total = groups.reduce((a, g) => a + g.list.length, 0);
  const [sel, setSel] = useState<MessageKey | null>(groups[0]?.title ?? null);
  const [all, setAll] = useState(false);

  /* Steg inom familjen: två grupper med samma ton skiljs på ljushet, inte på en
     ny färg. Räknas här så ordningen i GROUPS är det enda som styr. */
  const seen = new Map<KeepFamily, number>();
  const toned = groups.map((g) => {
    const step = Math.min(seen.get(g.fam) ?? 0, 2);
    seen.set(g.fam, step + 1);
    return { ...g, cls: `kfam-${g.fam} kstep${step + 1}` };
  });

  const active = toned.find((g) => g.title === sel) ?? toned[0];
  const shown = active && (all ? active.list : active.list.slice(0, KEEP_PREVIEW));

  if (!total || !active) return null;

  return (
    <div className="kscon">
      <div className="ksband" role="img"
        aria-label={t("reco.keep.bandAria", { n: total })}>
        {toned.map((g) => (
          <i key={g.title} className={`${g.cls}${g.title === active.title ? " on" : ""}`}
            style={{ width: `${(g.list.length / total) * 100}%` }}
            title={`${t(g.title)} — ${g.list.length}`} />
        ))}
      </div>
      <div className="kslegend">
        {toned.map((g) => (
          <button type="button" key={g.title} className={`kschip ${g.cls}${g.title === active.title ? " on" : ""}`}
            aria-pressed={g.title === active.title}
            onClick={() => { setSel(g.title); setAll(false); }}>
            <i />{t(g.title)} <b className="num">{g.list.length}</b>
          </button>
        ))}
      </div>
      <p className="kswhy"><b>{t(active.title)}</b> — {t(active.hint)}</p>
      <div className="kscells">{shown?.map((p) => <KeepCell key={p.id} m={m} p={p} />)}</div>
      {active.list.length > KEEP_PREVIEW && (
        <button type="button" className="ghost comore" onClick={() => setAll((v) => !v)}>
          {all
            ? t("reco.keep.showFewer", { n: KEEP_PREVIEW })
            : t("reco.keep.showAll", { n: active.list.length })}
        </button>
      )}
    </div>
  );
}

/** Tom-läget: en färsk installation har inga dubbletter alls. */
export function NothingToDo({ children }: { children: ReactNode }) {
  return <div className="okbox">{children}</div>;
}

/* ============================================================
   Kön – en rad per art i konsolens köinstrument
   ============================================================ */

/**
 * Stjärnhoppet som LED-remsa: fyllda lampor är stjärnor arten redan har,
 * lysande är de man får nu, släckta är taket man inte når.
 *
 * Fyra lampor är hela sanningen – `STAR_COST` har fyra steg och 1.0:s tak är
 * 4★. Läs aldrig antalet ur något annat: en femte lampa vore ett löfte spelet
 * inte kan hålla.
 */
export function StarLeds({ from, to }: { from: number; to: number }) {
  const t = useT();
  return (
    <span className="cqleds" role="img" aria-label={t("reco.queue.ledAria", { from, to })}>
      {STAR_COST.map((_, i) => (
        <i key={i} className={i < from ? "was" : i < to ? "new" : ""} />
      ))}
    </span>
  );
}

/** Vinstmätaren: procenten mot taket (4★ = +20 %), så raderna går att jämföra. */
const MAX_GAIN_PCT = STAR_COST.length * 5;

/**
 * En art som konsolrad. Stängd säger den vad som händer (stjärnhopp, antal,
 * vinst, varningar); utfälld vem du behåller, vad stjärnorna är värda i
 * spelets stats och vad du bör se upp med.
 */
export function CondenseRow({ m, plan, n, open }: RecoProps & {
  plan: CondensePlan; n: number; open?: boolean;
}) {
  const t = useT();
  const sp = speciesOf(m, plan);
  const gain = gainOf(m, plan);
  const k = plan.keeper;
  return (
    <details className="cqrow" style={elc(sp)} open={open}>
      <summary>
        <span className="ix num">{String(n).padStart(2, "0")}</span>
        <Portrait sp={sp} size={30} />
        <span className="nm">{sp.name}</span>
        <StarLeds from={plan.fromStars} to={plan.reach} />
        <span className="feed num">{t("reco.queue.count", { n: plan.feed })}</span>
        <span className="cqbar" title={t("hub.chip.pct", { pct: gain.pct })}>
          <i style={{ width: `${Math.min(100, (gain.pct / MAX_GAIN_PCT) * 100)}%` }} />
        </span>
        <span className="pct num">+{gain.pct} %</span>
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
          {/* Varför just den här arten står här. Prioriteten är räknad ur vad
              arten används TILL (`palUses`) × vad stjärnorna ger i stats ÷ vad
              det kostar i pals – en art utan roll får noll och hamnar sist, och
              det ska stå i klartext (helhetsutredningen aug 2026). */}
          {plan.why.length > 0 && (
            <p className={`rqwhy${plan.priority <= 0 ? " none" : ""}`}>
              {plan.why.map((w) => t.msg(w)).join(" · ")}
            </p>
          )}
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
  );
}
