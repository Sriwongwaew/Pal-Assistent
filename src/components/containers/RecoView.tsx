"use client";

/* Smart: spara/kondensera-rekommendationer.
 *
 * Sidan är en arbetsordning, i den ordning man ska läsa den:
 *
 *   1. Spara dessa – vad du INTE ska mata, grupperat efter anledning.
 *   2. Kondensera – en rad per art, störst vinst först, detaljer på begäran.
 *   3. Nästan där – arter som saknar några dubbletter till nästa stjärna.
 *
 * Att spara-listan står först är ett medvetet val och inte en layoutdetalj:
 * det enda felet som inte går att laga är att mata bort fel pal. Att matningen
 * inte går att ångra står i "Varför kondensera?" (`WhyCondense`) – rutan som
 * sade det överst på sidan är borttagen på Kens begäran (2026-08).
 */
import { useMemo, useState } from "react";
import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n";
import { useSelectedPal } from "@/context/SelectedPalContext";
import { buildUseIndex, planCondense, summarizeCondense } from "@/lib/condense";
import { fittingGold, isPerfectIv } from "@/lib/scoring";
import type { ScoredPal } from "@/lib/types";
import { Section } from "@/components/ui/PalBits";
import {
  KeepGroups, NothingToDo, QueueBand, QueueHead, QueueRow, WaitLists, WhyCondense,
  type KeepGroup, type RecoModel,
} from "@/components/ui/RecoBits";

/** Spara-grupperna speglar `applyKeepRules`. En pal visas bara i sin första grupp. */
const GROUPS: { title: MessageKey; hint: MessageKey; test: (p: ScoredPal) => boolean }[] = [
  { title: "reco.group.rainbow", hint: "reco.group.rainbowWhy", test: (p) => p.tiers.includes(5) },
  { title: "reco.group.perfectIv", hint: "reco.group.perfectIvWhy", test: isPerfectIv },
  { title: "reco.group.gold", hint: "reco.group.goldWhy", test: (p) => fittingGold(p) >= 2 },
  { title: "reco.group.synergy", hint: "reco.group.synergyWhy", test: (p) => p.synergy !== null },
  { title: "reco.group.carrier", hint: "reco.group.carrierWhy", test: (p) => p.cleanCarrier.length > 0 },
  { title: "reco.group.sole", hint: "reco.group.soleWhy", test: (p) => p.soleCarrier.length > 0 },
  { title: "reco.group.goldIv", hint: "reco.group.goldIvWhy", test: (p) => fittingGold(p) === 1 && p.ivSum >= 240 },
  { title: "reco.group.highIv", hint: "reco.group.highIvWhy", test: (p) => p.ivSum >= 270 },
  { title: "reco.group.lucky", hint: "reco.group.luckyWhy", test: (p) => p.lucky },
  { title: "reco.group.condensed", hint: "reco.group.condensedWhy", test: (p) => p.stars > 0 },
  { title: "reco.group.party", hint: "reco.group.partyWhy", test: (p) => p.c === "Party" },
];

/** Hur många rader kön visar innan "visa alla" – en skärm, inte en vägg. */
const PREVIEW = 10;

export function RecoView() {
  const { data, pals, bestOf } = usePalData();
  const { select } = useSelectedPal();
  const t = useT();
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
      <Section
        title={t("reco.keep.title")}
        sub={t("reco.keep.sub", { n: model.totalPals - model.dupeCount })}
      >
        {/* Hopfällda och tätare än på andra sidor: listan står först för att den
            ska läsas, men tio utfällda grupper skulle trycka ner kön långt
            under sidkanten. */}
        <div className="rqkeeps"><KeepGroups m={model} openFirst={0} /></div>
      </Section>

      <QueueBand m={model} />

      <Section title={t("reco.queue.title")} sub={t("reco.queue.sub")}>
        <details className="rqwhy">
          <summary>{t("reco.queue.why")}</summary>
          <WhyCondense />
        </details>

        {now.length === 0
          ? <NothingToDo>{t("reco.queue.nothing")}</NothingToDo>
          : (
            <>
              <QueueHead />
              <ol className="rqlist">
                {shown.map((plan, i) => <QueueRow key={plan.s} m={model} plan={plan} n={i + 1} />)}
              </ol>
              {now.length > PREVIEW && (
                <button type="button" className="ghost comore" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? t("reco.queue.showFirst", { n: PREVIEW }) : t("reco.queue.showAll", { n: now.length })}
                </button>
              )}
            </>
          )}
      </Section>

      <Section
        title={t("reco.wait.title")}
        sub={t("reco.wait.sub")}
      >
        <WaitLists m={model} />
      </Section>
    </>
  );
}
