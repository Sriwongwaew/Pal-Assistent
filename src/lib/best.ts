import { WORK_TYPES } from "./constants";
import type { AppData, ScoredPal, Species, WorkType } from "./types";

export function workScore(data: AppData, p: ScoredPal, t: WorkType): number {
  const sp = data.species[p.s] as Species;
  const rank = sp.ws[t] ?? 0;
  return rank ? rank * (1 + p.fxCraft) + (sp.noct ? 0.35 : 0) : 0;
}

/** Topp-5 attack-team med elementspridning. */
export function pickAttackTeam(data: AppData, pals: ScoredPal[]): ScoredPal[] {
  const sorted = [...pals].sort((a, b) => b.combat - a.combat);
  const team: ScoredPal[] = [];
  const elements = new Set<string>();
  for (const [idx, p] of sorted.entries()) {
    const el = data.species[p.s]?.elements[0] ?? "Normal";
    if (team.length < 5 && (!elements.has(el) || idx < 2) && !team.some((t) => t.s === p.s)) {
      team.push(p);
      elements.add(el);
    }
    if (team.length >= 5) break;
  }
  return team;
}

/** Minsta gäng som täcker alla arbetstyper med högsta nivåer (greedy). */
export function pickBaseCrew(data: AppData, pals: ScoredPal[], bestOf: Map<number, ScoredPal>): ScoredPal[] {
  const types = WORK_TYPES.filter((t) =>
    pals.some((p) => (data.species[p.s]?.ws[t] ?? 0) > 0),
  );
  const candidates = [...new Set([...bestOf.values()])];
  const cover = new Map<WorkType, number>();
  const crew: ScoredPal[] = [];
  while (crew.length < 8) {
    let best: ScoredPal | null = null;
    let bestGain = 0.2;
    for (const p of candidates) {
      if (crew.includes(p)) continue;
      let gain = 0;
      for (const t of types) {
        const s = workScore(data, p, t);
        const cur = cover.get(t) ?? 0;
        if (s > cur) gain += s - cur;
      }
      if (gain > bestGain) { bestGain = gain; best = p; }
    }
    if (!best) break;
    crew.push(best);
    for (const t of types) {
      const s = workScore(data, best, t);
      if (s > (cover.get(t) ?? 0)) cover.set(t, s);
    }
  }
  return crew;
}

/** Topp-arter globalt efter attack-scaling. */
export function topGlobalAttackers(data: AppData, count = 14): number[] {
  return [...data.species.keys()]
    .sort((a, b) => (data.species[b]?.sc[1] ?? 0) - (data.species[a]?.sc[1] ?? 0))
    .slice(0, count);
}

/** Topp-3-arter globalt per arbetstyp. */
export function topGlobalWorkers(data: AppData): [WorkType, number[]][] {
  return WORK_TYPES
    .map((t): [WorkType, number[]] => [
      t,
      [...data.species.keys()]
        .filter((s) => (data.species[s]?.ws[t] ?? 0) > 0)
        .sort((a, b) => (data.species[b]?.ws[t] ?? 0) - (data.species[a]?.ws[t] ?? 0))
        .slice(0, 3),
    ])
    .filter(([, list]) => list.length > 0);
}
