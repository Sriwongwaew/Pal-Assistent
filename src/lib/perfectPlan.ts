/** Kortaste vägen till en perfekt pal – IV och passiver i samma sökning.
 *
 * Problemet: du vill ha 100/100/100 **och** rätt passiver på målarten. Att göra
 * det i ett steg är nästan alltid dyrast. Bättre är att bygga upp linjen i
 * etapper – två pals med varsin 100:a ger en unge med två 100:or, den paras med
 * en tredje bärare, och passiverna vävs in där de kostar minst.
 *
 * Nyckelinsikten som gör det värt en sökning: en pal med fyra passiver men tre
 * 100:or är ofta en SÄMRE förälder än två rena 100-bärare, eftersom varje extra
 * passiv förälderns bär hamnar i arvspoolen och späder ut oddsen. Vilken väg som
 * vinner går inte att se på ögonmått – därför räknar vi på alla.
 *
 * Modellen:
 *   - Tillstånd = (vilka av HP/ATK/DEF som är 100, vilka önskade passiver som finns).
 *     8 × 16 = 128 tillstånd, så en fullständig sökning är billig.
 *   - Varje parning slår ihop två tillstånd; barnet siktar på unionen.
 *   - Kostnad = förväntat antal ägg, summerat över stegen.
 *   - IV-oddsen kommer ur `ivPlan` (30/30/40) och passiv-oddsen ur `inheritOdds`.
 *
 * Förenklingar, medvetna och värda att känna till:
 *   - Mellanresultat antas rena: man kläcker tills ungen bär exakt de önskade
 *     passiverna. Samma antagande som `passivePlan` redan gör.
 *   - Kön ignoreras i sökningen (barnets kön är slumpat); saknas ett kön helt i
 *     arten flaggas det i stället.
 *   - Sökningen håller sig inom målarten. Att para två arter byter art på ungen,
 *     så all IV-möda måste göras med exemplar av arten man faktiskt vill ha.
 */
import { translate } from "../i18n";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";

import { childrenOf, inheritOdds } from "./breeding";
import { IV_FROM_PARENT, IV_RANDOM, type IvIndex } from "./ivPlan";
import type { AppData, ScoredPal } from "./types";

/** Att en omslumpad stat landar på exakt 100 (0–100 likformigt). */
const RANDOM_HITS_100 = 1 / 101;

/** Chans att barnet får 100 i en stat, givet om föräldrarna har 100 eller inte. */
export const statOddsFromHas = (a: boolean, b: boolean): number =>
  IV_FROM_PARENT * (a ? 1 : 0) + IV_FROM_PARENT * (b ? 1 : 0) + IV_RANDOM * RANDOM_HITS_100;

const IV_BITS: IvIndex[] = [0, 1, 2];
const bit = (i: number) => 1 << i;
const has = (mask: number, i: number) => (mask & bit(i)) !== 0;
const popcount = (m: number) => {
  let n = 0;
  for (let x = m; x; x >>= 1) n += x & 1;
  return n;
};

interface Node {
  ivMask: number;
  pvMask: number;
  /** Antal icke-önskade passiver som noden släpar med sig in i arvspoolen. */
  junk: number;
  /** Förväntat antal ägg för att ha den här individen i handen. */
  eggs: number;
  /** Ägd pal – noden kostar inget att skaffa. */
  pal?: ScoredPal;
  /** Parningen som skapade noden. */
  via?: { a: Node; b: Node; odds: number };
}

/** A är minst lika bra som B på båda axlarna – då behöver B inte sparas. */
const dominates = (a: Node, b: Node) => a.eggs <= b.eggs + 1e-9 && a.junk <= b.junk;

export interface PlanParent {
  /** Ägd pal, eller null när föräldern är resultatet av ett tidigare steg. */
  pal: ScoredPal | null;
  /** 1-baserat stegnummer när föräldern kommer ur ett tidigare steg. */
  fromStep?: number;
  ivMask: number;
  pvMask: number;
  junk: number;
}

export interface PerfectStep {
  n: number;
  a: PlanParent;
  b: PlanParent;
  /** Tillståndet barnet siktar på. */
  ivMask: number;
  pvMask: number;
  /** Delodds, så man ser var det tar emot. */
  ivOdds: number;
  pvOdds: number;
  odds: number;
  /** Ägg för just det här steget, efter kull- och könskorrigering. */
  eggs: number;
  /** Passivpoolen barnet lottar ur – stor pool = utspädda odds. */
  pool: number;
  /** Stegnummer som delar föräldrapar – samma kull ger båda ungarna. */
  sharesClutchWith: number[];
  /** Extra ägg för att träffa rätt kön på en unge ur ett tidigare steg. */
  genderEggs: number;
}

export interface PerfectPlan {
  /** Finns någon väg alls till 100/100/100 + alla önskade passiver? */
  possible: boolean;
  steps: PerfectStep[];
  totalEggs: number;
  /** Redan klar – en ägd pal uppfyller allt. */
  alreadyDone: ScoredPal | null;
  /** Statar där ingen av artens pals har 100 – de kan bara slumpas fram (≈1 %). */
  gaps: IvIndex[];
  /** Önskade passiver som ingen av artens pals bär. */
  missingPassives: string[];
  /** Bästa direktparningen, för jämförelse mot den etappvisa planen. */
  direct: { a: ScoredPal; b: ScoredPal; odds: number; eggs: number } | null;
  missingGender: boolean;
}

const isMax = (v: number) => v >= 100;
const ivMaskOf = (p: ScoredPal) =>
  IV_BITS.reduce<number>((m, i) => (isMax(p.iv[i] ?? 0) ? m | bit(i) : m), 0);

/**
 * Söker den billigaste vägen till 100/100/100 med alla önskade passiver,
 * med exemplar av `palsOfSpecies` som byggstenar.
 */
export function planPerfectLine(
  palsOfSpecies: ScoredPal[],
  wanted: string[],
): PerfectPlan {
  const goalIv = 0b111;
  const pvIndex = new Map(wanted.map((id, i) => [id, i]));
  // Passiver kan inte slumpas fram ur tomma intet – de måste redan finnas hos
  // någon av artens pals. Saknas en, är den ett förkrav som passivplanen får
  // lösa (hämta in den från en annan art) och inte ett skäl att sakna plan.
  const goalPv = wanted.reduce(
    (m, id, i) => (palsOfSpecies.some((p) => p.pv.includes(id)) ? m | bit(i) : m),
    0,
  );

  const males = palsOfSpecies.filter((p) => p.g === "M");
  const females = palsOfSpecies.filter((p) => p.g === "F");

  const plan: PerfectPlan = {
    possible: false, steps: [], totalEggs: 0, alreadyDone: null,
    gaps: IV_BITS.filter((i) => !palsOfSpecies.some((p) => isMax(p.iv[i] ?? 0))),
    missingPassives: wanted.filter((id) => !palsOfSpecies.some((p) => p.pv.includes(id))),
    direct: null,
    missingGender: males.length === 0 || females.length === 0,
  };

  // Utgångsnoder: varje ägd pal, gratis men med sitt eget skräp i bagaget.
  const leaves: Node[] = palsOfSpecies.map((p) => {
    const pvMask = p.pv.reduce((m, id) => {
      const i = pvIndex.get(id);
      return i === undefined ? m : m | bit(i);
    }, 0);
    return {
      ivMask: ivMaskOf(p),
      pvMask,
      junk: p.pv.reduce((n, id) => n + (pvIndex.has(id) ? 0 : 1), 0),
      eggs: 0,
      pal: p,
    };
  });

  plan.alreadyDone =
    leaves.find((n) => n.ivMask === goalIv && (n.pvMask & goalPv) === goalPv)?.pal ?? null;
  if (plan.alreadyDone) {
    plan.possible = true;
    return plan;
  }
  if (plan.missingGender || palsOfSpecies.length < 2) return plan;

  // Bästa direktparningen, som jämförelse mot etapplanen.
  for (const m of males) {
    for (const f of females) {
      const a = leaves.find((n) => n.pal === m)!;
      const b = leaves.find((n) => n.pal === f)!;
      const { odds } = combineOdds(a, b, goalIv, goalPv);
      if (odds > 0 && (!plan.direct || odds > plan.direct.odds)) {
        plan.direct = { a: m, b: f, odds, eggs: 1 / odds };
      }
    }
  }

  /* ---- Pareto-front per tillstånd: billigast och renast överlever ----
     VIKTIGT: två olika ägda pals i samma tillstånd är två *individer*. Den ena
     får aldrig dominera bort den andra – då finns ingen partner kvar att para
     med, och ett fall som "båda har HP+ATK, DEF måste slumpas" skulle se ut som
     att det saknade lösning i stället för att bara vara dyrt. Löven sparas därför
     var för sig (renast först, och båda könen om de finns); dominansregeln gäller
     bara härledda noder. */
  const LEAF_CAP = 4;
  const DERIVED_CAP = 2;
  const key = (iv: number, pv: number) => iv * 16 + pv;
  const front = new Map<number, Node[]>();
  const offer = (n: Node): boolean => {
    const k = key(n.ivMask, n.pvMask);
    const list = front.get(k) ?? [];
    if (n.pal) {
      list.push(n);
      // Behåll de renaste, men se till att inte alla blir samma kön.
      list.sort((x, y) => x.junk - y.junk || (y.pal?.ivSum ?? 0) - (x.pal?.ivSum ?? 0));
      const kept: Node[] = [];
      for (const g of ["M", "F"] as const) {
        const first = list.find((o) => o.pal?.g === g);
        if (first) kept.push(first);
      }
      for (const o of list) if (!kept.includes(o) && kept.length < LEAF_CAP) kept.push(o);
      front.set(k, kept);
      return true;
    }
    if (list.some((o) => dominates(o, n))) return false;
    const kept = list.filter((o) => o.pal || !dominates(n, o));
    kept.push(n);
    const derived = kept.filter((o) => !o.pal).sort((x, y) => x.eggs - y.eggs || x.junk - y.junk);
    front.set(k, [...kept.filter((o) => o.pal), ...derived.slice(0, DERIVED_CAP)]);
    return true;
  };
  for (const l of leaves) offer(l);

  /* ---- Relaxering: para ihop allt med allt tills inget blir billigare ----
     Barnet siktar normalt på unionen av föräldrarnas 100:or, men en stat som
     INGEN förälder har kan ändå landa rätt via 40 %-omslumpningen (≈1 %). Utan
     den möjligheten skulle en art med en lucka sakna plan helt, i stället för
     att få en ärlig – om än dyr – sådan. Därför provas alla delmängder av
     luckorna ovanpå unionen. */
  const gapMask = plan.gaps.reduce<number>((m, i) => m | bit(i), 0);
  const gapSubsets: number[] = [];
  for (let sub = gapMask; ; sub = (sub - 1) & gapMask) {
    gapSubsets.push(sub);
    if (sub === 0) break;
  }

  for (let round = 0; round < 6; round++) {
    const nodes = [...front.values()].flat();
    let changed = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        // En pal kan inte para sig med sig själv, och två ägda måste ha olika kön.
        if (a === b) continue;
        if (a.pal && b.pal && (a.pal.id === b.pal.id || a.pal.g === b.pal.g)) continue;

        const union = a.ivMask | b.ivMask;
        const pvMask = a.pvMask | b.pvMask;
        for (const extra of gapSubsets) {
          const ivMask = union | extra;
          // Steget måste tillföra något, annars snurrar sökningen på stället.
          if (ivMask === a.ivMask && pvMask === a.pvMask) continue;
          if (ivMask === b.ivMask && pvMask === b.pvMask) continue;

          const { odds } = combineOdds(a, b, ivMask, pvMask);
          if (odds <= 0) continue;
          const child: Node = {
            ivMask, pvMask, junk: 0,
            eggs: a.eggs + b.eggs + genderExtra(a, b) + 1 / odds,
            via: { a, b, odds },
          };
          if (offer(child)) changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const goal = (front.get(key(goalIv, goalPv)) ?? [])
    .sort((x, y) => x.eggs - y.eggs)[0];
  if (!goal) return plan;
  plan.possible = true;

  /* ---- Vik ut noden till en numrerad stegordning ----
     Sökningen summerar kostnaden som ett träd, men planen är en DAG: ett
     mellansteg som används två gånger behöver bara födas fram EN gång,
     eftersom föräldrar inte förbrukas när man avlar. Därför räknas totalen om
     här, över de faktiskt unika stegen. */
  const stepNo = new Map<Node, number>();
  const raw: { node: Node; a: Node; b: Node; odds: number }[] = [];
  const walk = (n: Node): void => {
    if (!n.via || stepNo.has(n)) return;
    walk(n.via.a);
    walk(n.via.b);
    stepNo.set(n, raw.length + 1);
    raw.push({ node: n, a: n.via.a, b: n.via.b, odds: n.via.odds });
  };
  walk(goal);

  /* Steg som delar föräldrapar hämtar sina ungar ur SAMMA kull. Att samla båda
     kostar mindre än summan av var för sig – för två utfall med sannolikhet
     p1 och p2 är väntevärdet 1/p1 + 1/p2 − 1/(p1+p2) (inklusion–exklusion). */
  const pairKey = (a: Node, b: Node) => {
    const ia = raw.findIndex((r) => r.node === a);
    const ib = raw.findIndex((r) => r.node === b);
    const id = (x: Node, i: number) => (x.pal ? `p${x.pal.id}` : `s${i}`);
    return [id(a, ia), id(b, ib)].sort().join("|");
  };
  const clutches = new Map<string, number[]>();
  raw.forEach((r, i) => {
    const k = pairKey(r.a, r.b);
    clutches.set(k, [...(clutches.get(k) ?? []), i]);
  });

  /** Väntevärde för att samla en unge av varje utfall ur samma kull. */
  const clutchEggs = (ps: number[]): number => {
    let total = 0;
    for (let mask = 1; mask < 1 << ps.length; mask++) {
      let sum = 0;
      let bits = 0;
      for (let i = 0; i < ps.length; i++) {
        if (mask & (1 << i)) { sum += ps[i]!; bits++; }
      }
      total += (bits % 2 ? 1 : -1) / sum;
    }
    return total;
  };

  const stepEggs = new Array<number>(raw.length).fill(0);
  for (const idxs of clutches.values()) {
    const ps = idxs.map((i) => raw[i]!.odds);
    const shared = clutchEggs(ps);
    // Fördela kullens kostnad proportionellt, så varje steg får en rimlig siffra.
    const naive = ps.reduce((s, p) => s + 1 / p, 0);
    idxs.forEach((i, j) => { stepEggs[i] = shared * (1 / ps[j]!) / naive; });
  }

  /* Könspåslag: en unge ur ett tidigare steg som måste ha ett bestämt kön tar i
     snitt dubbelt så många ägg. Är båda föräldrarna mellansteg räcker det att
     jaga kön på den billigare av dem. */
  const prodCost = (n: Node) => {
    const i = raw.findIndex((r) => r.node === n);
    return i < 0 ? 0 : stepEggs[i]!;
  };
  const genderOf = (r: { a: Node; b: Node }) => {
    if (r.a.pal && r.b.pal) return 0;
    if (r.a.pal) return prodCost(r.b);
    if (r.b.pal) return prodCost(r.a);
    return Math.min(prodCost(r.a), prodCost(r.b));
  };

  raw.forEach((r, i) => {
    const { ivOdds, pvOdds, odds } = combineOdds(r.a, r.b, r.node.ivMask, r.node.pvMask);
    const desc = (x: Node): PlanParent => ({
      pal: x.pal ?? null,
      fromStep: x.pal ? undefined : stepNo.get(x),
      ivMask: x.ivMask, pvMask: x.pvMask, junk: x.junk,
    });
    const gender = genderOf(r);
    plan.steps.push({
      n: i + 1,
      a: desc(r.a), b: desc(r.b),
      ivMask: r.node.ivMask, pvMask: r.node.pvMask,
      ivOdds, pvOdds, odds,
      eggs: stepEggs[i]! + gender,
      pool: popcount(r.node.pvMask) + r.a.junk + r.b.junk,
      sharesClutchWith: (clutches.get(pairKey(r.a, r.b)) ?? [])
        .filter((j) => j !== i).map((j) => j + 1),
      genderEggs: gender,
    });
  });

  plan.totalEggs = plan.steps.reduce((s, st) => s + st.eggs, 0);
  return plan;
}

/**
 * Extra ägg för att träffa rätt kön. Ägda pals har redan sitt kön (och paret är
 * redan filtrerat på ♂+♀), men en unge ur ett mellansteg är 50/50 – behöver den
 * ett bestämt kön kostar den i snitt dubbelt.
 */
function genderExtra(a: Node, b: Node): number {
  if (a.pal && b.pal) return 0;
  if (a.pal) return b.eggs;
  if (b.pal) return a.eggs;
  return Math.min(a.eggs, b.eggs);
}

/** Oddsen för att en parning ger ett barn som täcker `ivMask` och `pvMask`. */
function combineOdds(a: Node, b: Node, ivMask: number, pvMask: number) {
  const ivOdds = IV_BITS.reduce<number>(
    (acc, i) => (has(ivMask, i) ? acc * statOddsFromHas(has(a.ivMask, i), has(b.ivMask, i)) : acc),
    1,
  );
  const k = popcount(pvMask);
  // Poolen är unionen av föräldrarnas passiver: varje skräppassiv späder ut den.
  const pool = k + a.junk + b.junk;
  const pvOdds = k === 0 ? 1 : inheritOdds(k, pool);
  return { ivOdds, pvOdds, odds: ivOdds * pvOdds };
}

/** Beskriver ett tillstånd i klartext: "HP + Attack · 2 passiver". */
export function describeState(
  ivMask: number, pvMask: number, wanted: string[], names: (id: string) => string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const ivs = IV_BITS.filter((i) => has(ivMask, i)).map((i) => ["HP", "Attack", "Defense"][i]);
  const pvs = wanted.filter((_, i) => has(pvMask, i)).map(names);
  const parts: string[] = [];
  parts.push(ivs.length ? `${ivs.join(" + ")} 100` : translate(locale, "iv.noHundreds"));
  if (pvs.length) parts.push(pvs.join(" + "));
  return parts.join(" · ");
}

/**
 * Donatorer för en stat arten saknar 100 i.
 *
 * Poängen är att slippa 1 %-omslumpningen: en enda parning kan importera en
 * 100:a utifrån. Men barnets art bestäms av föräldraparet, så en godtycklig
 * donator gör att linjen byter art och all möda går förlorad. Därför tas bara
 * donatorer med vars art **parar tillbaka till samma art** – då stannar linjen
 * kvar där den ska. Renast donator först: varje passiv den bär hamnar i poolen.
 */
export function findIvDonors(
  data: AppData,
  allPals: ScoredPal[],
  speciesIdx: number,
  gaps: IvIndex[],
): { stat: IvIndex; pals: ScoredPal[] }[] {
  const keepsSpecies = new Map<number, boolean>();
  const staysInSpecies = (other: number): boolean => {
    const cached = keepsSpecies.get(other);
    if (cached !== undefined) return cached;
    const ok = childrenOf(data, speciesIdx, other).some((c) => c.c === speciesIdx);
    keepsSpecies.set(other, ok);
    return ok;
  };
  return gaps.map((stat) => ({
    stat,
    pals: allPals
      .filter((p) => isMax(p.iv[stat] ?? 0) && staysInSpecies(p.s))
      .sort((x, y) => x.pv.length - y.pv.length || y.ivSum - x.ivSum)
      .slice(0, 4),
  }));
}
