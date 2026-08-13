"use client";

/* Smart: översikten – expeditionens läge. Hero med aura, "att göra nu"-remsan
   som knyter ihop sidorna, styrkeradarn, höjdpunkter och statistik ur boxen. */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePalData } from "@/context/PalDataContext";
import { useSelectedPal } from "@/context/SelectedPalContext";
import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import type { MessageKey } from "@/i18n";
import { pickBaseCrew } from "@/lib/best";
import { planBreedSetup } from "@/lib/breedRate";
import { progressSummary } from "@/lib/progressSummary";
import { BREEDING_PREFS_KEY, parseBreedingPrefs } from "@/lib/breedingPrefs";
import { planCondense } from "@/lib/condense";
import { isStored } from "@/lib/constants";
import { boxStrengths } from "@/lib/radar";
import { isPerfectIv } from "@/lib/scoring";
import type { ScoredPal } from "@/lib/types";
import { CountUp } from "@/components/ui/CountUp";
import { PalCard } from "@/components/ui/PalCard";
import { PalHero, elementColor } from "@/components/ui/PalHero";
import { RadarChart } from "@/components/ui/RadarChart";
import { Section, SpeciesIcon, StatTile, Tag } from "@/components/ui/PalBits";

export function OverviewView() {
  const { data, pals, ownedSpecies, bestOf } = usePalData();
  const { select } = useSelectedPal();
  const t = useT();
  const rich = useRichT();

  /* "Att göra nu": tre signaler som pekar vidare till sina sidor. Kondenserings-
     räkningen och basgänget är samma modeller som sidorna själva använder –
     remsan får aldrig säga något som sidan bakom länken inte står för. */
  const setup = useMemo(() => planBreedSetup(data, pals), [data, pals]);
  const tally = useMemo(() => progressSummary(data), [data]);
  const condenseNow = useMemo(
    () => planCondense(data, pals, bestOf).filter((p) => p.verdict === "now").length,
    [data, pals, bestOf],
  );
  /* Bästa arbetaren som ligger i förvaring i stället för i en bas — Palboxen
     eller den globala palboxen, båda lika outplacerade. */
  const boxedWorker = useMemo(
    () => pickBaseCrew(data, pals, bestOf).find((p) => isStored(p.c)) ?? null,
    [data, pals, bestOf],
  );
  /* Sparad avelsled läses först på klienten (localStorage) – servern renderar
     utan raden och den dyker upp vid montering, precis som planeraren själv. */
  const [savedTarget, setSavedTarget] = useState<string | null>(null);
  useEffect(() => {
    try {
      const prefs = parseBreedingPrefs(localStorage.getItem(BREEDING_PREFS_KEY), data);
      setSavedTarget(prefs.target !== null ? data.species[prefs.target]?.name ?? null : null);
    } catch { /* privat läge – strunt samma */ }
  }, [data]);

  const strengths = useMemo(
    () => boxStrengths(data, pals, setup.rate),
    [data, pals, setup.rate],
  );
  /** De fyra styrkekorten: boxens bästa i varje roll, med elementtvätt.
      Anfallaren är hjältebandets stjärna numera – kortet visar högsta poängen
      i stället, så samma pal inte står två gånger på samma skärm. */
  const strengthCards = useMemo(() => {
    const by = (cmp: (a: ScoredPal, b: ScoredPal) => number) => [...pals].sort(cmp)[0];
    return [
      ["overview.hl.gold", by((a, b) =>
        b.tiers.filter((r) => r >= 4).length - a.tiers.filter((r) => r >= 4).length
        || b.score - a.score), (p: ScoredPal) => t("ov.card.gold", { n: p.tiers.filter((r) => r >= 4).length })],
      ["ov.card.mountLabel", by((a, b) => b.mount - a.mount), (p: ScoredPal) => t("ov.card.mount", { n: p.mount })],
      ["overview.hl.tough", by((a, b) => {
        const tough = (p: ScoredPal) => {
          const sp = data.species[p.s]!;
          return sp.sc[0] * (1 + p.iv[0] / 300) + sp.sc[2] * (1 + p.iv[2] / 300);
        };
        return tough(b) - tough(a);
      }), (p: ScoredPal) => `IV ${p.iv.join("/")}`],
      ["overview.hl.score", by((a, b) => b.score - a.score), (p: ScoredPal) => t("ov.card.score", { n: p.score })],
    ] as const;
  }, [pals, data, t]);

  const stats = useMemo(() => ({
    keeps: pals.filter((p) => p.keep).length,
    perfect: pals.filter(isPerfectIv).length,
    r5: pals.filter((p) => p.tiers.includes(5)).length,
    r4: pals.filter((p) => p.tiers.includes(4)).length,
  }), [pals]);

  /* Etiketterna är nycklar, inte text: kortet ritas i den ordning listan har,
     och översättningen sker först vid renderingen. */
  const highlights = useMemo(() => {
    const picked = new Set<string>();
    const out: [MessageKey, ScoredPal][] = [];
    const grab = (label: MessageKey, p: ScoredPal | undefined) => {
      if (p && !picked.has(p.id)) { picked.add(p.id); out.push([label, p]); }
    };
    const by = (cmp: (a: ScoredPal, b: ScoredPal) => number, filter?: (p: ScoredPal) => boolean) =>
      [...pals].filter(filter ?? (() => true)).sort(cmp)[0];
    grab("overview.hl.score", by((a, b) => b.score - a.score));
    grab("overview.hl.attacker", by((a, b) => b.combat - a.combat));
    grab("overview.hl.perfect", by((a, b) => b.score - a.score, isPerfectIv));
    grab("overview.hl.lucky", by((a, b) => b.score - a.score, (p) => p.lucky));
    grab("overview.hl.gold", by((a, b) =>
      b.tiers.filter((r) => r === 4).length - a.tiers.filter((r) => r === 4).length || b.score - a.score));
    grab("overview.hl.level", by((a, b) => b.lv - a.lv || b.score - a.score));
    grab("overview.hl.condensed", by((a, b) => b.stars - a.stars || b.score - a.score));
    grab("overview.hl.tough", by((a, b) => {
      const tough = (p: ScoredPal) => {
        const sp = data.species[p.s]!;
        return sp.sc[0] * (1 + p.iv[0] / 300) + sp.sc[2] * (1 + p.iv[2] / 300);
      };
      return tough(b) - tough(a);
    }));
    return out.slice(0, 8);
  }, [pals, data]);

  const topSpecies = useMemo(() => {
    const counts = new Map<number, number>();
    for (const p of pals) counts.set(p.s, (counts.get(p.s) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [pals]);
  const max = topSpecies[0]?.[1] ?? 1;

  // En tom box är inte ett felläge utan förstaintrycket i en färsk installation:
  // programmet är just installerat och saven inte inläst än. Utan den här grenen
  // saknar både "Boxens stjärna" och höjdpunkterna en pal att peka på, och
  // `pals[0]!` ger en vit sida med "Cannot read properties of undefined".
  if (pals.length === 0) {
    return (
      <Section title={t("overview.welcome.title")} sub={t("overview.welcome.sub")}>
        <div className="meta" style={{ lineHeight: 1.7, maxWidth: 620 }}>
          {rich("overview.welcome.read", {
            action: <b>{t("save.read")}</b>,
            path: "%LOCALAPPDATA%\\Pal\\Saved\\SaveGames",
          })}
          <br />
          <br />
          {rich("overview.welcome.folder", {
            folder: <b>{t("save.folder")}</b>,
            live: <b>{t("save.live")}</b>,
          })}
          <br />
          <br />
          {t("overview.welcome.readonly")}
        </div>
      </Section>
    );
  }

  /* Stjärnan är den STARKASTE palen, inte den högst poängsatta. Poängen mäter
     avelsvärde (rena bärare, hög IV) och kröner gärna en låg-levlad dubblett –
     det lästes som slumpmässigt (Kens fråga aug 2026). Boxens stjärna ska vara
     den man skulle visa upp, och skälet står utskrivet i underraden i stället
     för poängmotiveringarna. */
  const featured = [...pals].sort((a, b) => b.combat - a.combat)[0] ?? pals[0]!;
  const fsp = data.species[featured.s]!;

  return (
    <>
      <PalHero
        pal={featured}
        species={fsp}
        data={data}
        kicker={t("overview.star")}
        sub={t("ov.star.why", { n: featured.combat })}
        onOpen={() => select(featured)}
      />

      {/* Lägesbandet från Uppdrag (Kens önskan): samma progressSummary-
          beräkning, så sidorna aldrig säger olika. Länkarna går dit siffran
          bor. Renderas bara när saven bär progressionsfältet. */}
      {tally && (
        <div className="qstats">
          <Link href="/quests" className="qstat"><b className="num">{tally.towers.done}/{tally.towers.total}</b><span>{t("quest.stat.towers")}</span></Link>
          <Link href="/map" className="qstat"><b className="num">{tally.effigies.done}/{tally.effigies.total}</b><span>{t("quest.stat.effigies")}</span></Link>
          <Link href="/map" className="qstat"><b className="num">{tally.travels.done}/{tally.travels.total}</b><span>{t("quest.stat.travels")}</span></Link>
          <Link href="/map" className="qstat"><b className="num">{tally.camps.done}/{tally.camps.total}</b><span>{t("quest.stat.camps")}</span></Link>
          <Link href="/quests" className="qstat"><b className="num">{tally.mains.done}/{tally.mains.total}</b><span>{t("quest.stat.mains")}</span></Link>
          <Link href="/quests" className="qstat"><b className="num">{tally.raids}</b><span>{t("quest.stat.raids")}</span></Link>
          {tally.deck && (
            <Link href="/quests" className="qstat"><b className="num">{tally.deck.done}/{tally.deck.total}</b><span>{t("quest.stat.deck")}</span></Link>
          )}
        </div>
      )}

      {/* Att göra nu: sidorna säger var arbetet väntar. Bara rader med något
          att säga renderas – en tom remsa är brus. */}
      {(condenseNow > 0 || boxedWorker || savedTarget) && (
        <div className="ovticker">
          {condenseNow > 0 && (
            <Link className="tk" href="/recommendations">
              <span className="dot" style={{ background: "var(--gold)" }} />
              {t("ov.todo.condense", { n: condenseNow })} →
            </Link>
          )}
          {boxedWorker && (
            <Link className="tk" href="/recommendations#rh-base">
              <span className="dot" style={{ background: "var(--red)" }} />
              {t("ov.todo.deploy", { name: data.species[boxedWorker.s]?.name ?? "?" })} →
            </Link>
          )}
          {savedTarget && (
            <Link className="tk" href="/breeding">
              <span className="dot" style={{ background: "var(--acc)" }} />
              {t("ov.todo.plan", { name: savedTarget })} →
            </Link>
          )}
        </div>
      )}

      <div className="tiles">
        <StatTile value={<CountUp to={pals.length} />} label={t("overview.tile.total")}
          sub={t.plural("overview.tile.species", ownedSpecies.size)} tint="rgba(74,157,248,.14)" />
        <StatTile value={<CountUp to={stats.keeps} />} label={t("overview.tile.keep")}
          sub={t("overview.tile.keepSub", { n: pals.length - stats.keeps })} tint="rgba(74,222,128,.13)" />
        <StatTile value={<CountUp to={stats.perfect} />} label={t("overview.tile.perfect")} sub="100 / 100 / 100" tint="rgba(245,197,66,.15)" />
        <StatTile value={<CountUp to={stats.r5} />} label={t("overview.tile.rainbow")}
          sub={t("overview.tile.rainbowSub", { n: stats.r4 })} tint="rgba(167,139,250,.15)" />
      </div>

      <Section title={t("ov.strength.title")} sub={t("ov.strength.sub")}>
        <div className="ovstr">
          <div className="ovradar">
            <RadarChart axes={[
              { label: t("ov.ax.attack"), value: strengths.attack },
              { label: t("ov.ax.defense"), value: strengths.defense },
              { label: t("ov.ax.work"), value: strengths.work },
              { label: t("ov.ax.mount"), value: strengths.mount },
              { label: t("ov.ax.breed"), value: strengths.breed },
              { label: t("ov.ax.deck"), value: strengths.deck },
            ]} />
          </div>
          <div className="ovcards">
            {strengthCards.map(([label, p, valueOf]) => p && (
              <button
                key={label}
                type="button"
                className="ovcard"
                style={{ "--elc": elementColor(data.species[p.s]!) } as React.CSSProperties}
                onClick={() => select(p)}
              >
                <SpeciesIcon sp={data.species[p.s]!} size={44} radius={22} />
                <span className="txt">
                  <span className="k">{t(label as MessageKey)}</span>
                  <span className="nm">{data.species[p.s]!.name}</span>
                  <span className="v">{valueOf(p)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t("overview.highlights.title")} sub={t("overview.highlights.sub")}>
        <div className="grid">
          {highlights.map(([label, p]) => (
            <PalCard key={p.id} pal={p} species={data.species[p.s]!} passives={data.passives}
              extraTag={<Tag kind="info">{t(label)}</Tag>} onClick={() => select(p)} />
          ))}
        </div>
      </Section>

      <Section title={t("overview.top.title")} sub={t("overview.top.sub")}>
        {topSpecies.map(([s, c]) => {
          const sp = data.species[s]!;
          const keeper = bestOf.get(s);
          return (
            <div key={s} className="hbar">
              <span className="lab">
                {sp.name} <SpeciesIcon sp={sp} size={28} />
              </span>
              <span className="bar" style={{ width: `${(c / max) * 100}%` }} />
              <span className="num">{c}</span>
              {keeper && (
                <span className="visually-hidden">{t("pal.bestIv", { iv: keeper.iv.join("/") })}</span>
              )}
            </div>
          );
        })}
      </Section>
    </>
  );
}
