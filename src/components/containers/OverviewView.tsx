"use client";

/* Smart: översikten – höjdpunkter och statistik ur boxen. */
import { useMemo } from "react";
import { usePalData } from "@/context/PalDataContext";
import { useSelectedPal } from "@/context/SelectedPalContext";
import { isPerfectIv } from "@/lib/scoring";
import type { ScoredPal } from "@/lib/types";
import { PalCard } from "@/components/ui/PalCard";
import { PalHero } from "@/components/ui/PalHero";
import { Section, SpeciesIcon, StatTile, Tag } from "@/components/ui/PalBits";

export function OverviewView() {
  const { data, pals, ownedSpecies, bestOf } = usePalData();
  const { select } = useSelectedPal();

  const stats = useMemo(() => ({
    keeps: pals.filter((p) => p.keep).length,
    perfect: pals.filter(isPerfectIv).length,
    r5: pals.filter((p) => p.tiers.includes(5)).length,
    r4: pals.filter((p) => p.tiers.includes(4)).length,
  }), [pals]);

  const highlights = useMemo(() => {
    const picked = new Set<string>();
    const out: [string, ScoredPal][] = [];
    const grab = (label: string, p: ScoredPal | undefined) => {
      if (p && !picked.has(p.id)) { picked.add(p.id); out.push([label, p]); }
    };
    const by = (cmp: (a: ScoredPal, b: ScoredPal) => number, filter?: (p: ScoredPal) => boolean) =>
      [...pals].filter(filter ?? (() => true)).sort(cmp)[0];
    grab("👑 Högst poäng", by((a, b) => b.score - a.score));
    grab("⚔️ Bästa attacker", by((a, b) => b.combat - a.combat));
    grab("💯 Perfekt IV", by((a, b) => b.score - a.score, isPerfectIv));
    grab("✨ Bästa Lucky", by((a, b) => b.score - a.score, (p) => p.lucky));
    grab("🏅 Flest guldpassiver", by((a, b) =>
      b.tiers.filter((t) => t === 4).length - a.tiers.filter((t) => t === 4).length || b.score - a.score));
    grab("📈 Högst level", by((a, b) => b.lv - a.lv || b.score - a.score));
    grab("⭐ Mest kondenserad", by((a, b) => b.stars - a.stars || b.score - a.score));
    grab("🛡️ Tåligast", by((a, b) => {
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
      <Section
        title="Välkommen till PalAssistent"
        sub="Boxen är tom – sparfilen är inte inläst än."
      >
        <div className="meta" style={{ lineHeight: 1.7, maxWidth: 620 }}>
          Klicka <b>Läs in från spelet</b> uppe till höger. Då letas din senaste
          sparfil upp under {"%LOCALAPPDATA%\\Pal\\Saved\\SaveGames"} och boxen fylls
          med dina egna pals.
          <br />
          <br />
          Ligger saven någon annanstans – en dedikerad server, en molnmapp eller en
          kopia – pekar du ut mappen under <b>Mapp</b>. Där finns också{" "}
          <b>Live</b>, som håller boxen uppdaterad av sig själv medan du spelar.
          <br />
          <br />
          Sparfilen öppnas alltid skrivskyddat, så Palworld kan ligga kvar och köra.
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
        kicker="Boxens stjärna"
        sub={featured.reasons.join(" · ") || featured.c}
        onOpen={() => select(featured)}
      />

      <div className="tiles">
        <StatTile value={pals.length} label="Pals totalt" sub={`${ownedSpecies.size} arter`} tint="rgba(74,157,248,.14)" />
        <StatTile value={stats.keeps} label="Spara" sub={`${pals.length - stats.keeps} kan kondenseras`} tint="rgba(74,222,128,.13)" />
        <StatTile value={stats.perfect} label="Perfekt IV" sub="100 / 100 / 100" tint="rgba(245,197,66,.15)" />
        <StatTile value={stats.r5} label="Rainbow-passiv" sub={`${stats.r4} pals med guldpassiv`} tint="rgba(167,139,250,.15)" />
      </div>

      <Section title="Höjdpunkter i boxen" sub="Dina mest anmärkningsvärda pals just nu – hela boxen finns under fliken Boxen.">
        <div className="grid">
          {highlights.map(([label, p]) => (
            <PalCard key={p.id} pal={p} species={data.species[p.s]!} passives={data.passives}
              extraTag={<Tag kind="info">{label}</Tag>} onClick={() => select(p)} />
          ))}
        </div>
      </Section>

      <Section title="Flest exemplar per art" sub="Bra kondenserings-bränsle – se fliken Rekommendationer.">
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
              {keeper && <span className="visually-hidden">bästa IV {keeper.iv.join("/")}</span>}
            </div>
          );
        })}
      </Section>
    </>
  );
}
