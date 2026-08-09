"use client";

/* Smart: spara/kondensera-rekommendationer.
 *
 * Sidan är en arbetsordning, i den ordning man ska läsa den:
 *
 *   1. Varningen – matningen görs i spelet och går inte att ångra.
 *   2. Spara dessa – vad du INTE ska mata, grupperat efter anledning.
 *   3. Kondensera – en rad per art, störst vinst först, detaljer på begäran.
 *   4. Nästan där – arter som saknar några dubbletter till nästa stjärna.
 *
 * Att spara-listan står före kön är ett medvetet val och inte en layoutdetalj:
 * det enda felet som inte går att laga är att mata bort fel pal.
 */
import { useMemo, useState } from "react";
import { usePalData } from "@/context/PalDataContext";
import { useSelectedPal } from "@/context/SelectedPalContext";
import { buildUseIndex, planCondense, summarizeCondense } from "@/lib/condense";
import { fittingGold, isPerfectIv } from "@/lib/scoring";
import type { ScoredPal } from "@/lib/types";
import { Section } from "@/components/ui/PalBits";
import {
  KeepGroups, NothingToDo, QueueBand, QueueHead, QueueRow, RecoWarning, WaitLists, WhyCondense,
  type KeepGroup, type RecoModel,
} from "@/components/ui/RecoBits";

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

/** Hur många rader kön visar innan "visa alla" – en skärm, inte en vägg. */
const PREVIEW = 10;

export function RecoView() {
  const { data, pals, bestOf } = usePalData();
  const { select } = useSelectedPal();
  const [showAll, setShowAll] = useState(false);

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
    const groups: KeepGroup[] = [];
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

  const model: RecoModel = {
    data, useIndex, now, soon, later, summary, keepGroups, rest,
    totalPals: pals.length,
    dupeCount: pals.length - pals.filter((p) => p.keep).length,
    select,
  };

  const shown = showAll ? now : now.slice(0, PREVIEW);

  return (
    <>
      <RecoWarning />

      <Section
        title="Spara dessa"
        sub={<>
          <b>{model.totalPals - model.dupeCount}</b> pals som reglerna håller utanför
          kondenseringen, grupperat efter anledning – en pal visas bara i sin första grupp.
          Fäll ut och klicka en pal för Base Info. Känner du igen någon i kön nedan: leta rätt
          på den här först.
        </>}
      >
        {/* Hopfällda och tätare än på andra sidor: listan står först för att den
            ska läsas, men tio utfällda grupper skulle trycka ner kön långt
            under sidkanten. */}
        <div className="rqkeeps"><KeepGroups m={model} openFirst={0} /></div>
      </Section>

      <QueueBand m={model} />

      <Section title="Kondensera" sub="Ett steg per rad, störst vinst först. Klicka på raden för detaljerna.">
        <details className="rqwhy">
          <summary>Varför kondensera – och vad det kostar</summary>
          <WhyCondense />
        </details>

        {now.length === 0
          ? <NothingToDo>Inget att kondensera just nu – ingen art har nog med dubbletter för en stjärna till.</NothingToDo>
          : (
            <>
              <QueueHead />
              <ol className="rqlist">
                {shown.map((plan, i) => <QueueRow key={plan.s} m={model} plan={plan} n={i + 1} />)}
              </ol>
              {now.length > PREVIEW && (
                <button type="button" className="ghost comore" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? `Visa bara de ${PREVIEW} första` : `Visa alla ${now.length} arter`}
                </button>
              )}
            </>
          )}
      </Section>

      <Section
        title="Nästan där"
        sub="Några pals till så går det. Dubbletter duger – det är antalet som räknas, inte kvaliteten."
      >
        <WaitLists m={model} />
      </Section>
    </>
  );
}
