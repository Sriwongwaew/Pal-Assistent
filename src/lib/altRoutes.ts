/** Alternativa vägar till målet – "du kan också göra såhär nu".
 *
 * `buildPassivePlan` väljer start med en greedy set cover som minimerar **antal
 * bärare**: täcker en enda pal alla önskade passiver blir den start, och fas 1
 * hoppas över helt. Det är ofta rätt, men inte alltid – planen mäts trots allt i
 * ägg, inte i bärare. Två saker kan göra en annan startart billigare:
 *
 * 1. **Renare hopsamling.** Startpalen är en riktig individ, så första partnern
 *    måste ha motsatt kön. Finns bara en smutsig partner av rätt kön i den arten
 *    hamnar dess skräp i arvspoolen. Två *andra* ägda pals som tillsammans bär
 *    precis de önskade – och inget mer – ger poolen k i stället, vilket är den
 *    bästa odds som över huvud taget går att få.
 * 2. **Kortare artkedja.** Hopsamlingsarten kan ligga närmare målet än den art
 *    som råkade bära flest önskade passiver, så det extra steget äts upp igen.
 *
 * I Kens box: planen startar på en Venusa ♀ som redan har alla tre, men första
 * partnern måste vara ♂ och den renaste bär *Serious* → pool 4, ~20 ägg totalt.
 * Två Wumpo Botan (♂ med Artisan + Remarkable Craftsmanship, ♀ med enbart Work
 * Slave) täcker samma tre utan en enda skräp-passiv → pool 3, och Botan ligger
 * dessutom ett steg närmare Renjishi: ~18 ägg. Alternativet **ersätter aldrig**
 * planen, det ligger som ett förslag under den.
 *
 * Modellen är medvetet densamma som resten av planeraren: `inheritOdds` är
 * P(ungen ärver alla önskade), och efter en kläckning antas linjen ren. Att
 * räkna annorlunda här skulle göra siffrorna omöjliga att jämföra med planens.
 * `cleanAssembly` säger däremot ärligt när poolen är exakt de önskade – då är
 * ungen garanterat ren, vilket är just det som gör en sådan väg bra.
 *
 * **Två slags vägar räknas upp, och den andra fanns inte förut.** Hopsamlingen
 * ovan vilar på att två av samma art ger samma art – det är det som håller
 * landningsarten förutsägbar, men det gjorde också att par av **olika** art
 * aldrig kunde hittas. Kens Helzephyr ♀ × Beakon ♂ → Helzephyr Lux var inte
 * bortsållad av ett filter, den räknades aldrig upp. Sådana par (`directPair.ts`)
 * läggs därför till som egen sorts väg: barnet ÄR målarten, så det finns ingen
 * artkedja efteråt. `passivePlan` provar dem numera också som huvudplan, så det
 * som återstår här är fallen där planen inte fick välja fritt – manuellt läge,
 * där en utpekad pal måste vara med.
 */

import {
  childrenOf, compareParents, inheritOdds, solveChain, solveChainCheapest,
} from "./breeding";
import type { ParentPrefs } from "./breeding";
import { findDirectPairs } from "./directPair";
import type { AppData, ChainStep, ScoredPal } from "./types";

/** Minsta besparing (i ägg) för att en alternativ väg ska vara värd att visa. */
const MIN_SAVING = 1;

/** Så många alternativ visas som mest – fler blir brus, inte hjälp. */
const MAX_ALTS = 2;

/** Djupgräns för artkedjan, samma som planeraren använder. */
const MAX_DEPTH = 10;

export interface AltStep extends ChainStep {
  /** Renaste ägda pal av partner-arten. */
  partner: ScoredPal | null;
  odds: number;
  /** Passiv-poolen ungen lottar ur (önskade ∪ partnerns passiver). */
  pool: number;
}

export interface AltRoute {
  /**
   * Arten passiverna samlas på i stället – alltså hopsamlingsstegets UNGE.
   * Är föräldrarna av olika art (`a.s !== b.s`) är det målarten, och då finns
   * ingen kedja efteråt.
   */
  species: number;
  /** De två ägda pals som paras ihop. Alltid ♂ + ♀. */
  a: ScoredPal;
  b: ScoredPal;
  /** Unionen av föräldrarnas passiver. */
  pool: number;
  odds: number;
  assembleEggs: number;
  /** Skräp-passiver som följer med in i poolen. */
  poolJunk: string[];
  /** Sant när poolen är exakt de önskade – ungen kan inte få skräp. */
  cleanAssembly: boolean;
  chain: AltStep[];
  totalEggs: number;
  /** Ägg billigare än huvudplanen. Alltid ≥ MIN_SAVING. */
  saves: number;
}

/**
 * Letar startarter som slår huvudplanen.
 *
 * `baseline` är planens `expectedEggs` och `skipSpecies` den art planen redan
 * bygger linjen på – att föreslå samma art igen vore inget alternativ. `usedIds`
 * är de pals planen faktiskt använder: ett par den redan står på är inget
 * "du kan också", det är planen.
 */
export function findAltRoutes(
  data: AppData,
  pals: ScoredPal[],
  ownedSpecies: ReadonlySet<number>,
  usable: string[],
  target: number | null,
  baseline: number,
  skipSpecies: number | null,
  prefs: ParentPrefs,
  usedIds: ReadonlySet<string> = new Set(),
): AltRoute[] {
  const k = usable.length;
  if (target === null || k === 0 || !Number.isFinite(baseline) || baseline <= 0) return [];

  const want = new Set(usable);
  const junkOf = (p: ScoredPal) => p.pv.reduce((n, id) => n + (want.has(id) ? 0 : 1), 0);

  const bySpecies = new Map<number, ScoredPal[]>();
  for (const p of pals) {
    const list = bySpecies.get(p.s);
    if (list) list.push(p);
    else bySpecies.set(p.s, [p]);
  }

  /* Renaste ägda pal per art – partnern i ett kedjesteg. Linjen är här alltid en
     kläckt unge, så inget könskrav ställs: man kläcker tills könet stämmer.
     Memoiserad, för Dijkstra frågar om samma art hundratals gånger. */
  const partnerCache = new Map<number, ScoredPal | null>();
  const partnerFor = (s: number): ScoredPal | null => {
    const hit = partnerCache.get(s);
    if (hit !== undefined) return hit;
    const p = (bySpecies.get(s) ?? [])
      .slice()
      .sort((x, y) => junkOf(x) - junkOf(y) || compareParents(x, y, prefs))[0] ?? null;
    partnerCache.set(s, p);
    return p;
  };
  const poolFor = (s: number) => {
    const pool = new Set(usable);
    partnerFor(s)?.pv.forEach((id) => pool.add(id));
    return pool.size;
  };
  const stepEggs = (s: number) => {
    const o = inheritOdds(k, poolFor(s));
    return o > 0 ? 1 / o : Infinity;
  };

  const routes: AltRoute[] = [];
  for (const [species, list] of bySpecies) {
    if (species === skipSpecies || list.length < 2) continue;
    /* Hela idén vilar på att två av samma art ger samma art. Det gäller för
       alla 304 arter i datasetet, men slås ändå upp i pardatan i stället för
       att antas: går den regeln någonsin sönder ska förslaget utebli, inte
       ljuga om vad ungen blir. */
    if (!childrenOf(data, species, species).some((c) => c.c === species)) continue;

    // Billigaste ♂+♀-paret av arten som tillsammans bär alla önskade.
    let best: { a: ScoredPal; b: ScoredPal; pool: number; odds: number } | null = null;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const x = list[i]!;
        const y = list[j]!;
        // Två av samma kön kan inte avla, och "?" är ett okänt kön vi inte vågar
        // räkna med – båda är riktiga individer ur boxen, inte kläckta ungar.
        if (x.g === y.g || x.g === "?" || y.g === "?") continue;
        const union = new Set([...x.pv, ...y.pv]);
        if (!usable.every((id) => union.has(id))) continue;
        const odds = inheritOdds(k, union.size);
        if (odds <= 0) continue;
        const pair = x.g === "M" ? { a: x, b: y } : { a: y, b: x };
        if (
          !best ||
          odds > best.odds ||
          // Lika odds: renaste paret vinner, sedan IV-målet.
          (odds === best.odds &&
            (junkOf(pair.a) + junkOf(pair.b) < junkOf(best.a) + junkOf(best.b) ||
              compareParents(pair.a, best.a, prefs) + compareParents(pair.b, best.b, prefs) < 0))
        ) {
          best = { ...pair, pool: union.size, odds };
        }
      }
    }
    if (!best) continue;

    // Artkedjan därifrån. Linjen är en kläckt unge hela vägen, så första steget
    // har inget könskrav och inget eget skräp – därav samma kostnad överallt.
    let steps: ChainStep[] = [];
    if (species !== target) {
      const found =
        solveChainCheapest(data, ownedSpecies, species, target, stepEggs, MAX_DEPTH) ??
        solveChain(data, ownedSpecies, species, target, MAX_DEPTH);
      if (!found) continue;
      steps = found;
    }

    const assembleEggs = 1 / best.odds;
    const chain: AltStep[] = steps.map((st) => {
      const pool = poolFor(st.with);
      return { ...st, partner: partnerFor(st.with), odds: inheritOdds(k, pool), pool };
    });
    const totalEggs = chain.reduce(
      (n, st) => n + (st.odds > 0 ? 1 / st.odds : Infinity),
      assembleEggs,
    );
    if (!Number.isFinite(totalEggs)) continue;

    const saves = baseline - totalEggs;
    if (saves < MIN_SAVING) continue;

    const poolJunk = [...new Set([...best.a.pv, ...best.b.pv])].filter((id) => !want.has(id));
    routes.push({
      species, a: best.a, b: best.b,
      pool: best.pool, odds: best.odds, assembleEggs, poolJunk,
      cleanAssembly: best.pool === k,
      chain, totalEggs, saves,
    });
  }

  /* Par av OLIKA art vars unge är målarten: ett steg, ingen kedja. Samma
     uppräkning som planeraren själv provar som huvudplan, så det som dyker upp
     här är par den inte fick välja (manuellt läge). Samma art hanteras redan av
     loopen ovan – landar den på målet är dess kedja tom och resultatet
     identiskt, så villkoret hindrar dubbletter. */
  for (const dp of findDirectPairs(data, pals, target, usable, prefs, MAX_ALTS + 1)) {
    if (dp.a.s === dp.b.s) continue;
    if (usedIds.has(dp.a.id) && usedIds.has(dp.b.id)) continue;
    const totalEggs = 1 / dp.odds;
    const saves = baseline - totalEggs;
    if (saves < MIN_SAVING) continue;
    routes.push({
      species: target,
      a: dp.a, b: dp.b,
      pool: dp.pool, odds: dp.odds, assembleEggs: totalEggs, poolJunk: dp.poolJunk,
      cleanAssembly: dp.pool === k,
      chain: [], totalEggs, saves,
    });
  }

  return routes.sort((x, y) => x.totalEggs - y.totalEggs).slice(0, MAX_ALTS);
}
