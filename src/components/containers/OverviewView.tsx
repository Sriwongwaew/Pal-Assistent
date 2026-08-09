"use client";

/* Smart: översikten – höjdpunkter och statistik ur boxen. */
import { useMemo } from "react";
import { usePalData } from "@/context/PalDataContext";
import { useSelectedPal } from "@/context/SelectedPalContext";
import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import type { MessageKey } from "@/i18n";
import { isPerfectIv } from "@/lib/scoring";
import type { ScoredPal } from "@/lib/types";
import { PalCard } from "@/components/ui/PalCard";
import { PalHero } from "@/components/ui/PalHero";
import { Section, SpeciesIcon, StatTile, Tag } from "@/components/ui/PalBits";

export function OverviewView() {
  const { data, pals, ownedSpecies, bestOf } = usePalData();
  const { select } = useSelectedPal();
  const t = useT();
  const rich = useRichT();

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

  const featured = highlights[0]?.[1] ?? pals[0]!;
  const fsp = data.species[featured.s]!;

  return (
    <>
      <PalHero
        pal={featured}
        species={fsp}
        data={data}
        kicker={t("overview.star")}
        sub={featured.reasons.map(t.msg).join(" · ") || featured.c}
        onOpen={() => select(featured)}
      />

      <div className="tiles">
        <StatTile value={pals.length} label={t("overview.tile.total")}
          sub={t.plural("overview.tile.species", ownedSpecies.size)} tint="rgba(74,157,248,.14)" />
        <StatTile value={stats.keeps} label={t("overview.tile.keep")}
          sub={t("overview.tile.keepSub", { n: pals.length - stats.keeps })} tint="rgba(74,222,128,.13)" />
        <StatTile value={stats.perfect} label={t("overview.tile.perfect")} sub="100 / 100 / 100" tint="rgba(245,197,66,.15)" />
        <StatTile value={stats.r5} label={t("overview.tile.rainbow")}
          sub={t("overview.tile.rainbowSub", { n: stats.r4 })} tint="rgba(167,139,250,.15)" />
      </div>

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
