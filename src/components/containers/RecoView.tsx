"use client";

/* Smart: spara/kondensera-rekommendationer.
 *
 * Kondenseringen ligger överst. "Ska jag mata bort den här arten?" är frågan
 * sidan finns för att svara på, och den gick inte att läsa ur det gamla
 * rutnätet av förloppsmätare: varje art såg likadan ut oavsett om den kunde
 * kondenseras på direkten eller saknade trettio pals. Nu är korten åtgärder –
 * stjärnhoppet, antalet platser man får tillbaka och vad exemplaret man
 * behåller faktiskt är bra för. */
import { useMemo, useState, type CSSProperties } from "react";
import { usePalData } from "@/context/PalDataContext";
import { useSelectedPal } from "@/context/SelectedPalContext";
import {
  buildUseIndex, palUses, planCondense, summarizeCondense,
  type CondensePlan, type PalUse,
} from "@/lib/condense";
import { STAR_COST } from "@/lib/constants";
import { fittingGold, isPerfectIv } from "@/lib/scoring";
import type { ScoredPal } from "@/lib/types";
import { MaskIcon } from "@/components/ui/GameIcon";
import { PassiveList } from "@/components/ui/PassiveRow";
import { WorkIcon } from "@/components/ui/WorkIcon";
import { elementColor } from "@/components/ui/PalHero";
import {
  ElementIcons, GenderSymbol, Section, SpeciesIcon, Stars, StatTile, Tag, elementBg,
} from "@/components/ui/PalBits";

/** Spara-grupperna speglar `applyKeepRules`. En pal visas bara i sin första grupp. */
const GROUPS: { title: string; hint: string; test: (p: ScoredPal) => boolean }[] = [
  { title: "Rainbow-passiv", hint: "Tier 5 – går bara att ärva, aldrig slumpa fram", test: (p) => p.tiers.includes(5) },
  { title: "Perfekt IV", hint: "100/100/100 – utgångspunkten för varje avelslinje", test: isPerfectIv },
  { title: "Flera guldpassiver", hint: "Två eller fler legendariska passiver som gör nytta på arten", test: (p) => fittingGold(p) >= 2 },
  { title: "Färdig uppsättning", hint: "Tre eller fler passiver som drar åt samma håll – en stam att avla vidare på", test: (p) => p.synergy !== null },
  { title: "Ren bärare", hint: "Toppassiv som gör nytta på arten, utan skräp runt sig – varje extra passiv späder ut arvspoolen", test: (p) => p.cleanCarrier.length > 0 },
  { title: "Enda bäraren", hint: "Passiven passar inte arten, men ingen annan sparad pal bär den – och passiver går bara att ärva", test: (p) => p.soleCarrier.length > 0 },
  { title: "Guldpassiv + hög IV", hint: "En legendarisk passiv som passar arten, och IV-summa 240 eller mer", test: (p) => fittingGold(p) === 1 && p.ivSum >= 240 },
  { title: "Hög IV", hint: "Snitt 90 eller mer – bra föräldrar även utan passiver", test: (p) => p.ivSum >= 270 },
  { title: "Lucky", hint: "Går inte att avla fram", test: (p) => p.lucky },
  { title: "Redan kondenserad", hint: "Stjärnorna är matade pals du inte får tillbaka", test: (p) => p.stars > 0 },
  { title: "I ditt party", hint: "Följer med dig ut", test: (p) => p.c === "Party" },
];

/** "4 → 1★ · +16 → 2★ · …" – kostnaderna är kumulativa, inte en total. */
const STAR_LADDER = STAR_COST.map((c, i) => (i === 0 ? `${c} → 1★` : `+${c} → ${i + 1}★`)).join(" · ");

/** Hur många kondenseringskort som visas innan "visa alla". */
const NOW_PREVIEW = 12;

export function RecoView() {
  const { data, pals, bestOf } = usePalData();
  const { select } = useSelectedPal();
  const [showAllNow, setShowAllNow] = useState(false);

  const useIndex = useMemo(() => buildUseIndex(data, pals), [data, pals]);

  const { now, soon, later, summary } = useMemo(() => {
    const plans = planCondense(data, pals, bestOf);
    return {
      now: plans.filter((p) => p.verdict === "now"),
      soon: plans.filter((p) => p.verdict === "soon"),
      later: plans.filter((p) => p.verdict === "hold" || p.verdict === "max"),
      summary: summarizeCondense(plans),
    };
  }, [data, pals, bestOf]);

  const { keepGroups, rest } = useMemo(() => {
    const keeps = pals.filter((p) => p.keep);
    const seen = new Set<string>();
    const groups: { title: string; hint: string; list: ScoredPal[] }[] = [];
    for (const { title, hint, test } of GROUPS) {
      const list = keeps.filter((p) => test(p) && !seen.has(p.id)).sort((a, b) => b.score - a.score);
      list.forEach((p) => seen.add(p.id));
      if (list.length) groups.push({ title, hint, list });
    }
    return {
      keepGroups: groups,
      rest: keeps.filter((p) => !seen.has(p.id)).sort((a, b) => b.score - a.score),
    };
  }, [pals]);

  /** Allt som spara-reglerna inte plockade upp – kondenseringsmaterial. */
  const dupeCount = pals.length - pals.filter((p) => p.keep).length;
  const passiveItems = (p: ScoredPal) =>
    p.pv.map((id) => ({ id, name: data.passives[id]?.n ?? id, tier: data.passives[id]?.r ?? 0 }));

  /* Banners får aldrig ändras (designregel 3), så mismatchen står som text
     under dem i stället – annars går den inte att se på palen alls. */
  const Misfit = ({ p }: { p: ScoredPal }) => (
    p.misfit.length > 0
      ? (
        <span className="komiss" title="Passiverna gör ingen nytta för det arten faktiskt används till – men de ligger ändå i arvspoolen och sänker oddsen">
          Passar inte arten: {p.misfit.map((id) => data.passives[id]?.n ?? id).join(", ")}
        </span>
      )
      : null
  );

  /* ---------- små byggstenar för sidan ---------- */

  const UseChips = ({ uses, compact = false }: { uses: PalUse[]; compact?: boolean }) => (
    <span className="couses">
      {uses.map((u) => (
        <span key={`${u.kind}-${u.work ?? u.label}`} className={`couse${u.best ? " best" : ""}`}>
          {u.work
            ? <WorkIcon type={u.work} size={14} />
            : u.kind === "combat"
              ? <MaskIcon name="attack" color="var(--ink2)" width={13} height={13} />
              : <span className="em">{u.kind === "mount" ? "🐎" : "🎣"}</span>}
          <span className="t">{u.label}</span>
          {u.kind === "work" && <b className="lv">{u.level}</b>}
          {u.best && !compact && <em>bäst i boxen</em>}
        </span>
      ))}
      {!uses.length && <span className="couse none"><span className="t">Ren avelspal</span></span>}
    </span>
  );

  const CondenseCard = ({ plan, rank }: { plan: CondensePlan; rank: number }) => {
    const sp = data.species[plan.s]!;
    const k = plan.keeper;
    const pct = plan.nextCost > 0 ? Math.round((plan.leftover / plan.nextCost) * 100) : 100;
    return (
      <article className="cocard" style={{ "--elc": elementColor(sp) } as CSSProperties}>
        <header className="cohead">
          {rank <= 3 && <span className={`rank r${rank}`}>{rank}</span>}
          <span className="ava" style={{ background: elementBg(sp) }}>
            <SpeciesIcon sp={sp} size={36} radius={18} />
          </span>
          <button type="button" className="cotitle" onClick={() => select(k)}
            title="Visa Base Info för exemplaret du behåller">
            <span className="nm">{sp.name}</span>
            <span className="els"><ElementIcons sp={sp} /></span>
          </button>
          <span className="cnt">
            <span className="v">{plan.fodder.length}</span>
            <span className="l">DUBBLETTER</span>
          </span>
        </header>

        <div className="coverdict">
          <span className="jump">
            <span className="from">{plan.fromStars}★</span>
            <span className="ar">→</span>
            <span className="to">{plan.reach}★</span>
          </span>
          <span className="txt">
            Mata <b>{plan.feed}</b> st · frigör <b>{plan.feed} platser</b>
            {plan.leftover > 0 && <> · {plan.leftover} blir över</>}
          </span>
        </div>

        <div className="corow">
          <span className="k">Bra för</span>
          <span className="b"><UseChips uses={palUses(data, k, useIndex)} /></span>
        </div>

        <div className="corow">
          <span className="k">Behåll</span>
          <span className="b">
            <span className="cokeep">
              <GenderSymbol g={k.g} />
              <span className="ivt">Lv {k.lv} · IV {k.iv.join("/")}</span>
              <Stars count={k.stars} />
              {k.boss && <Tag kind="alpha">ALPHA</Tag>}
              {k.lucky && <Tag kind="lucky">LUCKY</Tag>}
              <span className="meta">{k.c}</span>
            </span>
            <PassiveList items={passiveItems(k)} />
            <Misfit p={k} />
          </span>
        </div>

        {plan.notes.map((n) => (
          <p key={n.kind} className={`conote n-${n.kind}`}>{n.text}</p>
        ))}

        {plan.nextCost > 0 && (
          <div className="prog">
            <div className="lbl">
              <span>Sedan mot {plan.reach + 1}★</span>
              <span>{plan.leftover}/{plan.nextCost}</span>
            </div>
            <div className="track"><i style={{ width: `${pct}%` }} /></div>
          </div>
        )}
      </article>
    );
  };

  const WaitRow = ({ plan }: { plan: CondensePlan }) => {
    const sp = data.species[plan.s]!;
    const pct = plan.nextCost > 0 ? Math.round((plan.leftover / plan.nextCost) * 100) : 100;
    return (
      <button type="button" className="colrow" style={{ "--elc": elementColor(sp) } as CSSProperties}
        onClick={() => select(plan.keeper)}
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
  };

  const KeepRow = ({ p }: { p: ScoredPal }) => {
    const sp = data.species[p.s]!;
    return (
      <button type="button" className="krow" style={{ "--elc": elementColor(sp) } as CSSProperties}
        onClick={() => select(p)} title="Visa Base Info">
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
        <UseChips uses={palUses(data, p, useIndex, 2)} compact />
        <span className="kpv">
          <PassiveList items={passiveItems(p)} />
          <Misfit p={p} />
        </span>
      </button>
    );
  };

  const shownNow = showAllNow ? now : now.slice(0, NOW_PREVIEW);

  return (
    <>
      <div className="tiles">
        <StatTile value={pals.length - dupeCount} label="Spara" sub={`av ${pals.length} pals i boxen`} tint="rgba(74,222,128,.13)" />
        <StatTile value={summary.species} label="Arter redo att kondenseras" sub={`${dupeCount} dubbletter totalt`} tint="rgba(251,146,60,.13)" />
        <StatTile value={summary.feed} label="Platser du frigör" sub={`${pals.length} → ${pals.length - summary.feed} pals`} tint="rgba(74,168,255,.13)" />
        <StatTile value={`+${summary.stars}`} label="Stjärnor att hämta" sub="≈ +5 % HP/ATK/DEF per stjärna" tint="rgba(245,197,66,.15)" />
      </div>

      <Section
        title="Kondensera nu"
        sub={<>
          Arterna där du <b>redan</b> har nog med dubbletter, störst vinst först. Mata dem till
          exemplaret under ”Behåll” – det du matar försvinner ur boxen, så platsen får du tillbaka
          på köpet.
        </>}
      >
        <div className="hint colad">
          Kostnad per stjärna: {STAR_LADDER}. Varje stjärna ger ≈ +5 % HP, attack och försvar.
        </div>
        {now.length === 0
          ? <div className="okbox">Inget att kondensera just nu – ingen art har nog med dubbletter för en stjärna till.</div>
          : (
            <>
              <div className="cogrid">
                {shownNow.map((plan, i) => <CondenseCard key={plan.s} plan={plan} rank={i + 1} />)}
              </div>
              {now.length > NOW_PREVIEW && (
                <button type="button" className="ghost comore" onClick={() => setShowAllNow((v) => !v)}>
                  {showAllNow ? `Visa bara de ${NOW_PREVIEW} bästa` : `Visa alla ${now.length} arter`}
                </button>
              )}
            </>
          )}
      </Section>

      {(soon.length > 0 || later.length > 0) && (
        <Section
          title="Nästan där"
          sub="Några pals till så går det. Dubbletter duger – det är antalet som räknas, inte kvaliteten."
        >
          <div className="colist">{soon.map((plan) => <WaitRow key={plan.s} plan={plan} />)}</div>
          {soon.length === 0 && <div className="hint">Ingen art ligger nära nästa stjärna.</div>}
          {later.length > 0 && (
            <details className="dgroup">
              <summary>
                Långt kvar eller redan maxade <span className="n">({later.length} arter)</span>
              </summary>
              <div className="colist" style={{ marginTop: 8 }}>
                {later.map((plan) => <WaitRow key={plan.s} plan={plan} />)}
              </div>
            </details>
          )}
        </Section>
      )}

      <Section title="Spara dessa" sub="Grupperat efter anledning – en pal visas bara i sin första grupp. Klicka för Base Info.">
        {keepGroups.map(({ title, hint, list }, gi) => (
          <details key={title} className="dgroup" open={gi < 2}>
            <summary>
              {title} <span className="n">({list.length})</span>
              {hint && <span className="why">{hint}</span>}
            </summary>
            <div className="kgrid">{list.map((p) => <KeepRow key={p.id} p={p} />)}</div>
          </details>
        ))}
        {rest.length > 0 && (
          <details className="dgroup">
            <summary>
              Bäst i sin art (övriga) <span className="n">({rest.length})</span>
              <span className="why">Ingen utmärkande egenskap, men artens bästa exemplar</span>
            </summary>
            <div className="kgrid">{rest.map((p) => <KeepRow key={p.id} p={p} />)}</div>
          </details>
        )}
      </Section>
    </>
  );
}
