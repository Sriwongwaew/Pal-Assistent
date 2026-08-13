/* Själsrådgivaren: vad Pal Souls-plånboken räcker till, och var den gör nytta.
 *
 * Statue of Power i 1.0: fyra förstärkningsbara stats per pal (HP, Attack,
 * Defense, Work Speed – savens Rank_HP/Attack/Defence/CraftSpeed, som appen
 * redan läser), 20 ranker à +3 % = max +60 %. Kostnaderna är wiki-verifierade
 * (Pal Enhancement) och SCHEMAT är hela rådet: rank 1–10 kostar 10 små + 6
 * medel + 6 stora själar för +30 %, rank 11–20 kostar 30 jättesjälar för
 * nästa +30 %. Alltså: ta varje nyckelpal till rank 10 innan någon går mot 20.
 *
 * Crushern växlar 2:1 åt båda hållen, så plånboken kan uttryckas i
 * jätte-ekvivalenter – det är så "räcker det?" ska räknas, inte per valör. */

import type { ScoredPal } from "./types";

/** Kostnad i själar per rank, per stat: rank 1–4 små, 5–7 medel, 8–10 stora,
 *  11–20 jättar. Index 0 = kostnaden för rank 1. */
const RANK_COST: { kind: "s" | "m" | "l" | "g"; n: number }[] = [
  { kind: "s", n: 1 }, { kind: "s", n: 2 }, { kind: "s", n: 3 }, { kind: "s", n: 4 },
  { kind: "m", n: 1 }, { kind: "m", n: 2 }, { kind: "m", n: 3 },
  { kind: "l", n: 1 }, { kind: "l", n: 2 }, { kind: "l", n: 3 },
  { kind: "g", n: 1 }, { kind: "g", n: 1 }, { kind: "g", n: 2 }, { kind: "g", n: 2 },
  { kind: "g", n: 3 }, { kind: "g", n: 3 }, { kind: "g", n: 4 }, { kind: "g", n: 4 },
  { kind: "g", n: 4 }, { kind: "g", n: 4 },
];

export interface SoulCost { s: number; m: number; l: number; g: number }

/** Själar från rank `from` (exklusive) till `to` (inklusive) för EN stat. */
export function soulCost(from: number, to: number): SoulCost {
  const cost: SoulCost = { s: 0, m: 0, l: 0, g: 0 };
  for (let r = Math.max(0, from); r < Math.min(20, to); r++) {
    const step = RANK_COST[r]!;
    cost[step.kind] += step.n;
  }
  return cost;
}

/** Plånboken i jätte-ekvivalenter via Crusherns 2:1-växling (8 små = 1 jätte). */
export function giantEquivalents(w: SoulCost): number {
  return w.g + w.l / 2 + w.m / 4 + w.s / 8;
}

export const addCost = (a: SoulCost, b: SoulCost): SoulCost => ({
  s: a.s + b.s, m: a.m + b.m, l: a.l + b.l, g: a.g + b.g,
});

/** Statindex i `ScoredPal.souls`: [HP, Attack, Defense, Work Speed]. */
export type SoulStat = 0 | 1 | 2 | 3;

export interface SoulAdvice {
  pal: ScoredPal;
  /** Vilka stats rådet gäller (rollens): anfallare Attack+HP, arbetare Work
   *  Speed, riddjur HP. */
  stats: SoulStat[];
  /** Kostnaden att ta rollens stats till rank 10 (första, billiga +30 %). */
  to10: SoulCost;
  /** Ranker som saknas till 10 över rollens stats. */
  missing: number;
}

/**
 * Rådrader för nyckelpals: de av rollens stats som inte nått rank 10, dyrast
 * försummade först (flest saknade ranker). Pals som redan står på 10+ i allt
 * rollen bryr sig om filtreras bort – rådet är "fyll de billiga rankerna",
 * aldrig "max allt".
 */
export function soulAdvice(
  keepers: { pal: ScoredPal; stats: SoulStat[] }[],
): SoulAdvice[] {
  const rows: SoulAdvice[] = [];
  const seen = new Set<string>();
  for (const { pal, stats } of keepers) {
    if (seen.has(pal.id)) continue;
    seen.add(pal.id);
    let to10: SoulCost = { s: 0, m: 0, l: 0, g: 0 };
    let missing = 0;
    for (const st of stats) {
      const rank = pal.souls[st] ?? 0;
      if (rank >= 10) continue;
      to10 = addCost(to10, soulCost(rank, 10));
      missing += 10 - rank;
    }
    if (missing > 0) rows.push({ pal, stats, to10, missing });
  }
  return rows.sort((a, b) => b.missing - a.missing);
}
