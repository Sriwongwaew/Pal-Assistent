/** Planerar vägen till 100/100/100 (Palworld 1.0).
 *
 * Modellen: varje potential (HP / Attack / Defense) rullas **oberoende** –
 * 30 % ärvs från fadern, 30 % från modern, 40 % är en helt ny slumpad siffra.
 * Källa: Palworld-wikins Breeding-sida; siffrorna är community-testade, inte
 * datamined konstanter, så allt här är uppskattningar (märk dem som "≈" i UI).
 *
 * Konsekvensen är den viktiga: eftersom statarna rullas var för sig går det att
 * samla ihop 100:or från olika föräldrar över flera generationer.
 */

import type { ScoredPal } from "./types";

/** Chans att en enskild stat ärvs från en given förälder. */
export const IV_FROM_PARENT = 0.3;
/** Chans att staten i stället slumpas om helt. */
export const IV_RANDOM = 0.4;
/** Att den omslumpade siffran landar på exakt 100 (0–100 likformigt). */
const RANDOM_HITS_100 = 1 / 101;

export const IV_LABELS = ["HP", "Attack", "Defense"] as const;
export type IvIndex = 0 | 1 | 2;

const isMax = (v: number) => v >= 100;

/** Chans att barnet får 100 i en stat där föräldrarna har `a` respektive `b`. */
export function statOdds(a: number, b: number): number {
  return (
    IV_FROM_PARENT * (isMax(a) ? 1 : 0) +
    IV_FROM_PARENT * (isMax(b) ? 1 : 0) +
    IV_RANDOM * RANDOM_HITS_100
  );
}

export interface PairIvOdds {
  /** Chans per stat att barnet får 100. */
  per: [number, number, number];
  /** Chans att alla tre blir 100 samtidigt. */
  all: number;
}

export function pairIvOdds(a: ScoredPal, b: ScoredPal): PairIvOdds {
  const per = [0, 1, 2].map((i) => statOdds(a.iv[i] ?? 0, b.iv[i] ?? 0)) as
    [number, number, number];
  return { per, all: per[0] * per[1] * per[2] };
}

export interface IvStep {
  a: ScoredPal;
  b: ScoredPal;
  /** Statar man ska hålla utkik efter i kullen. */
  aimFor: IvIndex[];
  odds: number;
  eggs: number;
}

export interface IvPlan {
  /** Pals av arten som redan har 100 i respektive stat. */
  carriers: [ScoredPal[], ScoredPal[], ScoredPal[]];
  /** Statar där ingen ägd pal av arten har 100 – de går bara att slumpa fram. */
  gaps: IvIndex[];
  /** Bästa par att para direkt just nu. */
  best: { a: ScoredPal; b: ScoredPal; odds: PairIvOdds } | null;
  /** Mellansteg som samlar ihop 100:orna innan slutparningen. */
  steps: IvStep[];
  /** Sant när båda föräldrarna redan är 100/100/100. */
  ready: boolean;
  /** Saknar arten ♂ eller ♀ i boxen. */
  missingGender: boolean;
}

const eggsFor = (p: number) => (p > 0 ? Math.ceil(1 / p) : Infinity);

/** Hur många av de tre statarna pal:en redan har på 100. */
const maxCount = (p: ScoredPal) => p.iv.reduce((n, v) => n + (isMax(v) ? 1 : 0), 0);
const ivTotal = (p: ScoredPal) => (p.iv[0] ?? 0) + (p.iv[1] ?? 0) + (p.iv[2] ?? 0);

/** Bäst som IV-förälder: flest 100:or, därefter högst total. `score` duger inte
 *  här – den väger in passiver och stjärnor som inte påverkar arvet av statar. */
const byIv = (a: ScoredPal, b: ScoredPal) => maxCount(b) - maxCount(a) || ivTotal(b) - ivTotal(a);

/**
 * Bygger en IV-plan för en art du äger.
 *
 * Strategin är den som faktiskt fungerar i spelet: para ihop de exemplar som
 * bär olika 100:or, behåll avkomman som ärvde dem, och upprepa tills båda
 * föräldrarna är maxade – då är slutparningen ≈ 21 % per ägg i stället för 2,7 %.
 */
export function planPerfectIv(palsOfSpecies: ScoredPal[]): IvPlan {
  const carriers: [ScoredPal[], ScoredPal[], ScoredPal[]] = [[], [], []];
  for (const p of palsOfSpecies) {
    for (const i of [0, 1, 2] as IvIndex[]) if (isMax(p.iv[i] ?? 0)) carriers[i].push(p);
  }
  for (const list of carriers) list.sort(byIv);

  const gaps = ([0, 1, 2] as IvIndex[]).filter((i) => carriers[i].length === 0);
  const males = palsOfSpecies.filter((p) => p.g === "M");
  const females = palsOfSpecies.filter((p) => p.g === "F");

  const plan: IvPlan = {
    carriers,
    gaps,
    best: null,
    steps: [],
    ready: false,
    missingGender: males.length === 0 || females.length === 0,
  };
  if (plan.missingGender) return plan;

  // Bästa direkta par: det som maximerar chansen till 100/100/100. Saknas 100-bärare
  // är alla par lika nära noll – då får högsta IV-summan avgöra, annars ser det
  // föreslagna paret slumpmässigt ut.
  let bestTotal = -1;
  for (const m of males) {
    for (const f of females) {
      const odds = pairIvOdds(m, f);
      const total = ivTotal(m) + ivTotal(f);
      // Jämför med tolerans: 60 %·30 %·60 % och 60 %·60 %·30 % är samma sannolikhet,
      // men flyttalsmultiplikation är inte associativ och skiljer dem i sista biten.
      // Utan epsilon skulle ett sådant "bättre" par vinna över ett med högre IV.
      const better = !plan.best || odds.all > plan.best.odds.all + 1e-9;
      const tied = plan.best && Math.abs(odds.all - plan.best.odds.all) <= 1e-9;
      if (better || (tied && total > bestTotal)) {
        plan.best = { a: m, b: f, odds };
        bestTotal = total;
      }
    }
  }
  if (!plan.best) return plan;

  plan.ready = maxCount(plan.best.a) === 3 && maxCount(plan.best.b) === 3;
  if (plan.ready) return plan;

  // Mellansteg: para ihop bärare som täcker olika statar, så nästa generation
  // samlar fler 100:or i samma individ.
  const covered = new Set<IvIndex>();
  for (const i of [0, 1, 2] as IvIndex[]) {
    if (isMax(plan.best.a.iv[i] ?? 0) && isMax(plan.best.b.iv[i] ?? 0)) covered.add(i);
  }
  const needed = ([0, 1, 2] as IvIndex[]).filter((i) => !covered.has(i) && !gaps.includes(i));

  // Flera statar leder ofta till samma föräldrapar – slå ihop dem till ett steg
  // i stället för att lista samma parning om och om igen.
  const merged = new Map<string, { a: ScoredPal; b: ScoredPal; aim: Set<IvIndex> }>();
  for (const i of needed) {
    const carrier = carriers[i][0];
    if (!carrier) continue;
    const partner = (carrier.g === "M" ? females : males)
      .filter((p) => p.id !== carrier.id)
      .sort(byIv)[0];
    if (!partner) continue;
    const a = carrier.g === "M" ? carrier : partner;
    const b = carrier.g === "M" ? partner : carrier;
    // Är det redan slutparningen så tillför steget ingenting.
    if (a.id === plan.best.a.id && b.id === plan.best.b.id) continue;
    const key = `${a.id}|${b.id}`;
    const entry = merged.get(key) ?? { a, b, aim: new Set<IvIndex>() };
    for (const j of [0, 1, 2] as IvIndex[]) {
      if (isMax(a.iv[j] ?? 0) || isMax(b.iv[j] ?? 0)) entry.aim.add(j);
    }
    merged.set(key, entry);
  }

  for (const { a, b, aim } of merged.values()) {
    const aimFor = [...aim].sort();
    const odds = aimFor.reduce<number>(
      (acc, j) => acc * statOdds(a.iv[j] ?? 0, b.iv[j] ?? 0),
      1,
    );
    plan.steps.push({ a, b, aimFor, odds, eggs: eggsFor(odds) });
  }
  return plan;
}

export const ivOddsText = (p: number): string => {
  if (p <= 0) return "~0 %";
  const pct = p * 100;
  return `≈${pct >= 10 ? Math.round(pct) : pct.toFixed(1)} %`;
};

export const ivEggsText = (p: number): string => {
  if (p <= 0) return "–";
  const n = eggsFor(p);
  // Bortom några tusen ägg är den exakta siffran meningslös – säg som det är.
  return n > 3000 ? "i praktiken omöjligt" : `~${n.toLocaleString("sv-SE")} ägg`;
};
