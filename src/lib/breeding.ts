import { msg, translate, type Msg } from "../i18n";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";
import type { AppData, BreedTree, ChainStep, ChildResult, ScoredPal } from "./types";

/** Index i den platta triangulära par-tabellen för oordnat par (i, j). */
export function pairIndex(n: number, i: number, j: number): number {
  if (i > j) [i, j] = [j, i];
  return i * n - (i * (i - 1)) / 2 + (j - i);
}

/** Vilka barn ger paret (a, b)? Könsstyrda unika kombos kan ge flera utfall. */
export function childrenOf(data: AppData, a: number, b: number): ChildResult[] {
  const out: ChildResult[] = [];
  for (const g of data.gendered) {
    if ((g.a === a && g.b === b) || (g.a === b && g.b === a)) {
      const an = data.species[g.a]?.name ?? "?";
      const bn = data.species[g.b]?.name ?? "?";
      out.push({ c: g.c, note: `${an} ${g.ga === "Male" ? "♂" : "♀"} + ${bn} ${g.gb === "Male" ? "♂" : "♀"}` });
    }
  }
  if (out.length) return out;
  const c = data.pair[pairIndex(data.species.length, a, b)] ?? -1;
  return c >= 0 ? [{ c }] : [];
}

const INF = 1e9;

export interface FreeSolveResult {
  /** Minsta antal parningar för att nå varje art från de ägda. */
  cost: number[];
  from: ([number, number, string | undefined] | null)[];
}

/** Kortaste väg (antal parningar) till alla arter, givet ägda arter som gratis startmängd. */
export function solveFree(data: AppData, ownedSpecies: ReadonlySet<number>): FreeSolveResult {
  const n = data.species.length;
  const cost = new Array<number>(n).fill(INF);
  const from = new Array<[number, number, string | undefined] | null>(n).fill(null);
  for (const s of ownedSpecies) cost[s] = 0;
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 40) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if ((cost[i] ?? INF) >= INF) continue;
      for (let j = i; j < n; j++) {
        if ((cost[j] ?? INF) >= INF) continue;
        for (const ch of childrenOf(data, i, j)) {
          const nc = (cost[i] ?? INF) + (cost[j] ?? INF) + 1;
          if (nc < (cost[ch.c] ?? INF)) {
            cost[ch.c] = nc;
            from[ch.c] = [i, j, ch.note];
            changed = true;
          }
        }
      }
    }
  }
  return { cost, from };
}

export const isReachable = (cost: number[], s: number): boolean => (cost[s] ?? INF) < INF;

/** Rekonstruerar avelsträdet för `target` ur en solveFree-lösning. */
export function buildTree(
  target: number,
  from: FreeSolveResult["from"],
  ownedSpecies: ReadonlySet<number>,
  depth = 0,
): BreedTree {
  const link = from[target];
  if (ownedSpecies.has(target) || !link || depth > 12) {
    return { s: target, owned: true };
  }
  const [a, b, note] = link;
  return {
    s: target,
    owned: false,
    note,
    a: buildTree(a, from, ownedSpecies, depth + 1),
    b: buildTree(b, from, ownedSpecies, depth + 1),
  };
}

/** Linjär kedja: varje steg parar nuvarande resultat med en ÄGD art. BFS över arter. */
export function solveChain(
  data: AppData,
  ownedSpecies: ReadonlySet<number>,
  base: number,
  target: number,
  maxDepth = 10,
): ChainStep[] | null {
  const prev = new Map<number, number>();
  const partner = new Map<number, [number, string | undefined]>();
  const seen = new Set<number>([base]);
  let frontier = [base];
  for (let d = 0; d < maxDepth; d++) {
    const next: number[] = [];
    for (const cur of frontier) {
      for (const o of ownedSpecies) {
        for (const ch of childrenOf(data, cur, o)) {
          if (seen.has(ch.c)) continue;
          seen.add(ch.c);
          prev.set(ch.c, cur);
          partner.set(ch.c, [o, ch.note]);
          next.push(ch.c);
          if (ch.c === target) {
            const steps: ChainStep[] = [];
            let x = target;
            while (x !== base && prev.has(x)) {
              const [w, note] = partner.get(x)!;
              steps.unshift({ from: prev.get(x)!, with: w, to: x, note });
              x = prev.get(x)!;
            }
            return steps;
          }
        }
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return null;
}

/**
 * Som `solveChain`, men minimerar **förväntat antal ägg** i stället för antal steg.
 * `stepCost(partnerArt)` = ägg det kostar att ta ett steg med den arten som partner.
 *
 * Varför det behövs: BFS:en tar den kortaste vägen och bryr sig inte om *vem* du
 * parar med. Men varje skräp-passiv partnern bär hamnar i arvspoolen, så ett enda
 * steg med en smutsig partner kan kosta mer än en hel längre kedja med rena.
 * I Kens box: Dogen → Renjishi på 3 steg ≈ 82 ägg (ett av dem en Aegidron med fyra
 * passiver, ~59 ägg helt själv) mot 4 steg ≈ 23 ägg med rena partners.
 *
 * Dijkstra, O(V²) – 304 arter, körs på under en millisekund. Lika kostnad bryts
 * på färst steg, och jämförelsen använder epsilon: två vägar med samma odds i
 * annan ordning skiljer sig i sista float-biten, och ett exakt `<` skulle då
 * tappa steg-tiebreaket godtyckligt.
 */
export function solveChainCheapest(
  data: AppData,
  ownedSpecies: ReadonlySet<number>,
  base: number,
  target: number,
  stepCost: (partnerSpecies: number, isFirstStep: boolean) => number,
  maxDepth = 10,
): ChainStep[] | null {
  const EPS = 1e-9;
  /* Första steget kan kosta mer än de följande: där är linjen fortfarande en ägd
     pal med sina egna skräp-passiver, medan senare steg utgår från en unge man
     kläckt tills den är ren. Bara `base` ligger på djup 0, så uppdelningen i två
     kostnadstabeller är exakt – inte en approximation. */
  const partners: [species: number, first: number, rest: number][] = [];
  for (const o of ownedSpecies) {
    const c0 = stepCost(o, true);
    const cn = stepCost(o, false);
    if (Number.isFinite(c0) && Number.isFinite(cn)) partners.push([o, c0, cn]);
  }

  const dist = new Map<number, number>([[base, 0]]);
  const depth = new Map<number, number>([[base, 0]]);
  const prev = new Map<number, number>();
  const partner = new Map<number, [number, string | undefined]>();
  const done = new Set<number>();

  for (;;) {
    let cur = -1;
    let best = Infinity;
    for (const [s, d] of dist) {
      if (!done.has(s) && d < best) { best = d; cur = s; }
    }
    if (cur < 0 || cur === target) break;
    done.add(cur);
    const d0 = depth.get(cur) ?? 0;
    if (d0 >= maxDepth) continue;
    for (const [o, first, rest] of partners) {
      const cost = d0 === 0 ? first : rest;
      for (const ch of childrenOf(data, cur, o)) {
        if (done.has(ch.c)) continue;
        const nd = best + cost;
        const old = dist.get(ch.c) ?? Infinity;
        const better =
          nd < old - EPS ||
          (Math.abs(nd - old) <= EPS && d0 + 1 < (depth.get(ch.c) ?? Infinity));
        if (!better) continue;
        dist.set(ch.c, nd);
        depth.set(ch.c, d0 + 1);
        prev.set(ch.c, cur);
        partner.set(ch.c, [o, ch.note]);
      }
    }
  }

  if (!prev.has(target)) return null;
  const steps: ChainStep[] = [];
  let x = target;
  while (x !== base && prev.has(x)) {
    const [w, note] = partner.get(x)!;
    steps.unshift({ from: prev.get(x)!, with: w, to: x, note });
    x = prev.get(x)!;
  }
  return steps;
}

/* ---------- Val av föräldrar ---------- */

/**
 * "fast" = bästa IV som går att få direkt (summan räknas).
 * "perfect" = sikta på 100/100/100, så den svagaste statistiken avgör – en 80/80/80
 * är en bättre startpunkt än 100/100/40 även om summan är densamma.
 */
export type IvGoal = "fast" | "perfect";

export interface ParentPrefs {
  /** Passiver som ska överleva. Allt annat föräldern bär är skräp som sänker oddsen. */
  wanted?: ReadonlySet<string>;
  ivGoal: IvGoal;
}

export const DEFAULT_PARENT_PREFS: ParentPrefs = { ivGoal: "fast" };

/** Skräp-passiver först (färre är bättre), sedan IV enligt målet, sedan totalpoäng. */
function parentKey(p: ScoredPal, prefs: ParentPrefs) {
  const junk = prefs.wanted
    ? p.pv.reduce((n, id) => n + (prefs.wanted!.has(id) ? 0 : 1), 0)
    : 0;
  const iv =
    prefs.ivGoal === "perfect"
      ? Math.min(p.iv[0], p.iv[1], p.iv[2])
      : (p.iv[0] + p.iv[1] + p.iv[2]) / 3;
  return { junk, iv, score: p.score };
}

/** Negativt när `a` är den bättre föräldern. Sorterbar direkt. */
export function compareParents(a: ScoredPal, b: ScoredPal, prefs: ParentPrefs): number {
  const x = parentKey(a, prefs);
  const y = parentKey(b, prefs);
  return x.junk - y.junk || y.iv - x.iv || y.score - x.score;
}

/** Samma rangordning för ett helt par – används för att jämföra ♂/♀-uppställningar. */
export function pairQuality(a: ScoredPal, b: ScoredPal, prefs: ParentPrefs) {
  const x = parentKey(a, prefs);
  const y = parentKey(b, prefs);
  return { junk: x.junk + y.junk, iv: x.iv + y.iv, score: x.score + y.score };
}

const comparePairs = (
  a: [ScoredPal, ScoredPal],
  b: [ScoredPal, ScoredPal],
  prefs: ParentPrefs,
): number => {
  const x = pairQuality(a[0], a[1], prefs);
  const y = pairQuality(b[0], b[1], prefs);
  return x.junk - y.junk || y.iv - x.iv || y.score - x.score;
};

/** Bästa ägda ♂+♀-kombination för ett föräldrapar av arterna (a, b). */
export function bestParentPair(
  pals: ScoredPal[],
  bestOf: Map<number, ScoredPal>,
  a: number,
  b: number,
  prefs: ParentPrefs = DEFAULT_PARENT_PREFS,
): { pa: ScoredPal; pb: ScoredPal; warn?: Msg } {
  const best = (s: number, g: "M" | "F") => {
    let out: ScoredPal | null = null;
    for (const p of pals) {
      if (p.s === s && p.g === g && (!out || compareParents(p, out, prefs) < 0)) out = p;
    }
    return out;
  };
  const c1: [ScoredPal | null, ScoredPal | null] = [best(a, "M"), best(b, "F")];
  const c2: [ScoredPal | null, ScoredPal | null] = [best(a, "F"), best(b, "M")];
  const ok1 = c1[0] && c1[1];
  const ok2 = c2[0] && c2[1];
  if (ok1 && ok2) {
    return comparePairs(
      [c1[0]!, c1[1]!], [c2[0]!, c2[1]!], prefs,
    ) <= 0
      ? { pa: c1[0]!, pb: c1[1]! }
      : { pa: c2[0]!, pb: c2[1]! };
  }
  if (ok1) return { pa: c1[0]!, pb: c1[1]! };
  if (ok2) return { pa: c2[0]!, pb: c2[1]! };
  return { pa: bestOf.get(a)!, pb: bestOf.get(b)!, warn: msg("pair.needBothGenders") };
}

/* ---------- Ärvnings-odds ---------- */

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

const INHERIT_WEIGHTS = [0, 0.4, 0.3, 0.2, 0.1] as const;

/** P(Y ≤ x), alltså att slumpslaget inte lägger till något ovanpå x ärvda. */
function noExtraOdds(x: number): number {
  let p = 0;
  for (let y = 1; y <= x && y <= 4; y++) p += INHERIT_WEIGHTS[y] ?? 0;
  return p;
}

/**
 * P(barnet ärver ALLA k önskade passiver) när föräldrarnas
 * gemensamma passiv-pool innehåller u passiver.
 *
 * Spelets modell är **två slag**, inte ett (Palworld-wikin, "Breeding"):
 *
 *   1. Slå X ∈ 1..4 med vikterna 40/30/20/10.
 *   2. Ungen ärver X slumpvis valda ur poolen – **eller hela poolen om
 *      X ≥ poolens storlek**. Inget slås om.
 *   3. Slå Y ∈ 1..4 med samma vikter. Är Y > X får ungen Y−X **helt slumpade**
 *      passiver som ingen förälder bär (se `exactOdds`).
 *
 * Steg 2 är det som gör en ren pool bättre än den ser ut: rullar man 4 mot en
 * pool på 3 ärvs alla tre, utfallet kastas inte bort. Den gamla modellen här
 * normaliserade i stället bort X > u och underskattade därför precis de rena
 * stegen planeraren siktar mot (3 önskade ur ren pool: 22 % → 30 %). Från
 * pool 4 och uppåt ger de två exakt samma siffra.
 */
export function inheritOdds(k: number, u: number): number {
  if (k === 0) return 1;
  if (u < k) return 0;
  let total = 0;
  for (let x = 1; x <= 4; x++) {
    const w = INHERIT_WEIGHTS[x] ?? 0;
    // choose() ger 0 när x < k, så de utfallen faller bort av sig själva.
    total += x >= u ? w : (w * choose(u - k, x - k)) / choose(u, x);
  }
  return total;
}

/**
 * P(ungen får **precis** de k önskade och inget mer) ur en pool på u.
 *
 * Två saker kan smutsa ner den: skräp som följer med ur poolen (bara möjligt
 * när u > k) och slumppassiverna ur steg 3 ovan. Skillnaden mot `inheritOdds`
 * är hela svaret på "varför får jag aldrig exakt de jag vill ha" – med fyra
 * önskade finns ingen ledig plats och siffrorna sammanfaller, med tre ur ren
 * pool är det 30 % mot 28 %, med två 60 % mot 49 %.
 */
export function exactOdds(k: number, u: number): number {
  if (u < k) return 0;
  let total = 0;
  for (let x = 1; x <= 4; x++) {
    const w = INHERIT_WEIGHTS[x] ?? 0;
    // Ärvs hela poolen blir det exakt rätt bara om poolen ÄR de önskade;
    // annars måste dragningen råka bli precis de k, vilket kräver x = k.
    const hit = x >= u ? (u === k ? 1 : 0) : x === k ? 1 / choose(u, k) : 0;
    if (hit > 0) total += w * hit * noExtraOdds(x);
  }
  return total;
}

/**
 * P(ungen får minst en helt slumpad passiv) = P(Y > X). Oberoende av poolen,
 * och går alltså inte att avla bort – därför en konstant, inte en funktion.
 */
export const RANDOM_EXTRA_ODDS = (() => {
  let p = 0;
  for (let x = 1; x <= 4; x++) p += (INHERIT_WEIGHTS[x] ?? 0) * (1 - noExtraOdds(x));
  return p;
})();

export const oddsText = (p: number): string => {
  if (p <= 0) return "~0 %";
  const pct = p * 100;
  return `${pct >= 10 ? Math.round(pct) : pct.toFixed(1)} %`;
};

export const eggsText = (p: number, locale: Locale = DEFAULT_LOCALE): string =>
  p <= 0 ? "–" : translate(locale, "eggs.approx", { n: Math.ceil(1 / p) });
