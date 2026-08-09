/* Dumb byggstenar för rekommendationssidan: varningen, spara-listan,
 * kondenseringskön och delarna de består av.
 *
 * Sidan är en **arbetsordning**: först vad du inte får mata, sedan en rad per
 * art med vad som händer om du matar den. Detaljerna fälls ut på den rad man
 * håller på med – tolv kort samtidigt är tolv beslut samtidigt, och det var
 * det som gjorde den gamla sidan bökig.
 *
 * Ordningen är inte kosmetisk: matningen går inte att ångra, så spara-listan
 * står före kön med flit (se `RecoWarning`).
 */
import type { CSSProperties, ReactNode } from "react";
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
  title: string;
  hint: string;
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
  return (
    <div className="rswhy">
      <b>Vad kondensering gör:</b> du matar dubbletter till <i>ett</i> exemplar i Pal Essence
      Condenser. Det du matar försvinner ur boxen för alltid – dess passiver och IV går bara
      att ärva, aldrig få tillbaka. Det du behåller får en stjärna per fullbordad nivå och blir
      permanent starkare: <b>≈ +5 % HP, attack och försvar per stjärna</b>. Passiver och IV på
      den du behåller ändras <i>inte</i> – kondensering gör en bra pal starkare, aldrig en
      medelmåttig pal bra.
      {/* Bekräftat mot palworld.wiki.gg och nodecraft (aug 2026). Det här är
          ofta ett STARKARE skäl än stat-påslaget för en basarbetare, och det
          saknades helt i texten. */}
      <b> Dessutom höjs arbetslämpligheten:</b> varje rang lyfter <i>en</i> av palens
      befintliga sysslor ett steg, och full rang lyfter alla. Det är vägen från nivå 8 till
      spelets tak på 10 – tillsammans med Applied Technique-böckerna (+1 permanent, en per
      syssla) och arbetsauror.
      <span className="rsladder">
        Kostnad per stjärna: {STAR_LADDER} – kumulativt, inte en total.{" "}
        <b>OBS: de siffrorna är pre-1.0.</b> Palworld 1.0 sänkte full kondensering till 48 pals
        totalt, men fördelningen per stjärna är inte publicerad. Din Condenser visar den exakta
        siffran för nästa rang – säg till så rättas den här sidan.
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
  const uses: PalUse[] = palUses(m.data, p, m.useIndex, limit);
  /* Förbehållet står som egen rad, inte inuti brickan: brickorna ligger på en
     rad som inte bryter, så en mening därinne sprängde kortet i sidled. */
  const caveats = compact ? [] : [...new Set(uses.map((u) => u.caveat).filter(Boolean))];
  return (
    <span className="couses">
      {uses.map((u) => (
        <span
          key={`${u.kind}-${u.work ?? u.label}`}
          className={`couse${u.best ? " best" : ""}${u.only ? " only" : ""}`}
          title={u.caveat}
        >
          {u.work
            ? <WorkIcon type={u.work} size={14} />
            : u.kind === "combat"
              ? <MaskIcon name="attack" color="var(--ink2)" width={13} height={13} />
              : <span className="em">{u.kind === "mount" ? "🐎" : "🎣"}</span>}
          <span className="t">{u.label}</span>
          {u.kind === "work" && <b className="lv">{u.level}</b>}
          {!compact && u.best && <em>bäst i boxen</em>}
          {!compact && u.only && <em className="w">enda i boxen</em>}
        </span>
      ))}
      {!uses.length && <span className="couse none"><span className="t">Ren avelspal</span></span>}
      {caveats.map((c) => <span key={c} className="rscav">{c}</span>)}
    </span>
  );
}

/** Passiver som inte gör nytta på arten – banners får inte ändras, så texten står under. */
export function Misfit({ m, p }: { m: RecoModel; p: ScoredPal }) {
  if (!p.misfit.length) return null;
  return (
    <span className="komiss" title="Passiverna gör ingen nytta för det arten faktiskt används till – men de ligger ändå i arvspoolen och sänker oddsen">
      Passar inte arten: {p.misfit.map((id) => m.data.passives[id]?.n ?? id).join(", ")}
    </span>
  );
}

/** Raden som identifierar ett exemplar: kön, level, IV, stjärnor, taggar. */
export function PalLine({ p, container = true }: { p: ScoredPal; container?: boolean }) {
  return (
    <span className="cokeep">
      <GenderSymbol g={p.g} />
      <span className="ivt">Lv {p.lv} · IV {p.iv.join("/")}</span>
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
  const rows: [string, number, number][] = [
    ["HP", gain.before.hp, gain.after.hp],
    ["ATTACK", gain.before.atk, gain.after.atk],
    ["FÖRSVAR", gain.before.def, gain.after.def],
  ];
  return (
    <span className="rsgain">
      {rows.map(([k, a, b]) => (
        <span key={k} className="g">
          <span className="k">{k}</span>
          <span className="a">{a.toLocaleString("sv-SE")}</span>
          <span className="ar">→</span>
          <span className="b">{b.toLocaleString("sv-SE")}</span>
        </span>
      ))}
    </span>
  );
}

/** Sakerna man ångrar efteråt. Låg ton – de ska bromsa, inte skrika. */
export function WarnNotes({ plan, inline = false }: { plan: CondensePlan; inline?: boolean }) {
  if (!plan.notes.length) return null;
  return (
    <>
      {plan.notes.map((n) => (
        <p key={n.kind} className={`conote n-${n.kind}${inline ? " inl" : ""}`}>{n.text}</p>
      ))}
    </>
  );
}

/** Kompakt varningsmärke till täta lägen (tabell, kö) – texten ligger i title. */
export function WarnDots({ plan }: { plan: CondensePlan }) {
  if (!plan.notes.length) return <span className="rswarn none">–</span>;
  return (
    <span className="rswarn" title={plan.notes.map((n) => n.text).join("\n")}>
      {plan.notes.map((n) => <i key={n.kind} className={`d n-${n.kind}`} />)}
      <b>{plan.notes.length}</b>
    </span>
  );
}

/** Mätaren mot nästa stjärna efter att man matat. */
export function NextStar({ plan }: { plan: CondensePlan }) {
  if (plan.nextCost <= 0) return null;
  const pct = Math.round((plan.leftover / plan.nextCost) * 100);
  return (
    <div className="prog">
      <div className="lbl">
        <span>Sedan mot {plan.reach + 1}★</span>
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
  const sp = speciesOf(m, plan);
  return (
    <button type="button" className="cotitle" onClick={() => m.select(plan.keeper)}
      title="Visa Base Info för exemplaret du behåller">
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
  const sp = speciesOf(m, plan);
  const pct = plan.nextCost > 0 ? Math.round((plan.leftover / plan.nextCost) * 100) : 100;
  return (
    <button type="button" className="colrow" style={elc(sp)}
      onClick={() => m.select(plan.keeper)}
      title={`${sp.name}: har ${plan.leftover} dubbletter av ${plan.nextCost || plan.leftover} – klicka för Base Info`}>
      <span className="ava sm" style={{ background: elementBg(sp) }}>
        <SpeciesIcon sp={sp} size={26} radius={13} />
      </span>
      <span className="nm">{sp.name}</span>
      <span className="need">
        {plan.nextCost > 0
          ? <>saknar <b>{plan.missing}</b> → {plan.reach + 1}★</>
          : <>redan {plan.reach}★</>}
      </span>
      <span className="statbar" title={`Har ${plan.leftover} av ${plan.nextCost}`}>
        <i style={{ width: `${pct}%` }} />
      </span>
    </button>
  );
}

export function WaitLists({ m, heading = true }: RecoProps & { heading?: boolean }) {
  return (
    <>
      {heading && m.soon.length === 0 && <div className="hint">Ingen art ligger nära nästa stjärna.</div>}
      <div className="colist">{m.soon.map((plan) => <WaitRow key={plan.s} m={m} plan={plan} />)}</div>
      {m.later.length > 0 && (
        <details className="dgroup">
          <summary>
            Långt kvar eller redan maxade <span className="n">({m.later.length} arter)</span>
            <span className="why">Dubbletterna räcker inte till nästa stjärna – de tar bara plats</span>
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
  const sp = m.data.species[p.s]!;
  return (
    <button type="button" className="krow" style={elc(sp)}
      onClick={() => m.select(p)} title="Visa Base Info">
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
      <span className="ivt">Lv {p.lv} · {p.iv.join("/")}</span>
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
  return (
    <>
      {m.keepGroups.map(({ title, hint, list }, gi) => (
        <details key={title} className="dgroup" open={gi < openFirst}>
          <summary>
            {title} <span className="n">({list.length})</span>
            {hint && <span className="why">{hint}</span>}
          </summary>
          <div className="kgrid">{list.map((p) => <KeepRow key={p.id} m={m} p={p} />)}</div>
        </details>
      ))}
      {m.rest.length > 0 && (
        <details className="dgroup">
          <summary>
            Bäst i sin art (övriga) <span className="n">({m.rest.length})</span>
            <span className="why">Ingen utmärkande egenskap, men artens bästa exemplar</span>
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
   Varningen – överst på sidan, aldrig hopfälld
   ============================================================ */

/**
 * Matningen görs i spelet och går inte att ångra: de matade palsen finns inte
 * kvar någonstans, och deras passiver går bara att ärva.
 *
 * Två saker rutan gör som är lätta att slarva bort:
 *
 * 1. **Den är alltid utfälld.** En varning man måste klicka fram är ingen
 *    varning. Den är däremot lågmäld i färg – röd panel över hela sidan gör
 *    att man slutar läsa den efter tredje besöket.
 * 2. **Den säger vad appen INTE vet.** Listan bygger på saven som den såg ut
 *    vid senaste inläsningen och på våra egna spara-regler; den vet ingenting
 *    om vad du tänkt använda en pal till. Det är hela skälet att spara-listan
 *    ligger före kön på sidan.
 */
export function RecoWarning() {
  return (
    <div className="rqwarn" role="note">
      <span className="h">Kondensering går inte att ångra</span>
      <p>
        De pals du matar <b>försvinner ur boxen för alltid</b> – deras passiver, IV och
        stjärnor går bara att ärva, aldrig få tillbaka. Gå igenom <b>Spara dessa</b> nedan
        först, och titta på varje exemplar i spelet innan du matar det.
      </p>
      <p className="dis">
        Råden här är beräknade ur sparfilen som den såg ut vid senaste inläsningen, och kan
        inte veta vad du tänkt använda en pal till. Matningen gör du själv i spelet och på
        egen risk: PalAssistent rör aldrig din sparfil och kan varken ångra en matning eller
        ersätta en pal du matat bort.
      </p>
    </div>
  );
}

/* ============================================================
   Kön – bandet och en rad per art
   ============================================================ */

/** Summan av allt som går att göra nu, i en rad. */
export function QueueBand({ m }: RecoProps) {
  return (
    <div className="rqband">
      <span className="k">Att göra nu</span>
      <span className="v">
        <b>{m.summary.species}</b> arter · mata <b>{m.summary.feed}</b> pals ·
        <b> +{m.summary.stars}★</b> · <b>{m.summary.feed}</b> platser tillbaka
      </span>
      <span className="s">{m.dupeCount} dubbletter av {m.totalPals} pals i boxen</span>
    </div>
  );
}

/** Kolumnrubrikerna – samma åtta kolumner som raderna, annars glider de isär. */
export function QueueHead() {
  return (
    <div className="rqhead">
      <span>#</span><span /><span>Art</span><span>Blir</span>
      <span>Mata</span><span>Platser</span><span>Se upp</span><span />
    </div>
  );
}

/**
 * En art som en rad. Stängd säger den vad som händer; utfälld säger den vem du
 * behåller, vad stjärnorna är värda i stats och vad du bör se upp med.
 */
export function QueueRow({ m, plan, n }: RecoProps & { plan: CondensePlan; n: number }) {
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
          <span className="fd">{plan.feed} st</span>
          <span className="sl">+{plan.feed}</span>
          <WarnDots plan={plan} />
          <span className="cv" aria-hidden>▾</span>
        </summary>

        <div className="rqbody">
          <div className="c">
            <span className="rsk">Du behåller</span>
            <button type="button" className="rqkeep" onClick={() => m.select(k)} title="Visa Base Info">
              <PalLine p={k} />
            </button>
            <PassiveList items={passiveItems(m, k)} />
            <Misfit m={m} p={k} />
            <div className="rquses"><UseChips m={m} p={k} /></div>
          </div>
          <div className="c">
            <span className="rsk">Det ger</span>
            <GainStats gain={gain} />
            <p className="rqfact">
              +{gain.pct} % på HP, attack och försvar · {plan.feed} platser fria
              {plan.leftover > 0 && <> · {plan.leftover} dubbletter blir över</>}
            </p>
            <WarnNotes plan={plan} inline />
            <NextStar plan={plan} />
          </div>
        </div>
      </details>
    </li>
  );
}
