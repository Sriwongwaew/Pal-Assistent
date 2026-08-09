/**
 * Manuellt läge: "jag *vill* använda dessa två – vad kostar det?"
 *
 * Planeraren i övrigt svarar på en annan fråga. `buildPassivePlan` väljer själv
 * bärare ur boxen och minimerar antalet, alltså "vilka två (eller fyra) ska jag
 * använda". Här är paret **givet** – ur boxen eller påhittat, för en pal man
 * planerar att fånga – och frågan är bara: går det, och hur många ägg?
 *
 * ## Vad ett par kan ge
 *
 * Ungen ärver ur föräldrarnas **samlade** pool (union av mängder, aldrig summan
 * av antal – bär båda samma skräp-passiv ligger den bara en gång i poolen). Den
 * kan alltså aldrig få en önskad passiv som ingen av föräldrarna bär. Slumpslaget
 * *kan* lägga till en passiv ingen förälder har, men den dras ur hela
 * passivtabellen – att planera på det vore att planera på tur, precis som
 * `perfectPlan` medvetet inte gör. Saknas en önskad passiv i paret är svaret
 * därför "nej", inte "dyrt".
 *
 * ## Varför staging kan slå direktparningen
 *
 * Kostnaden är konvex i poolens storlek, så den enda vägen till bättre odds är en
 * **mindre pool**. Direktparningen har poolen som den är. Men en unge som ärvt en
 * *delmängd* och inget skräp är en renare förälder än sin egen förälder — så:
 *
 *   1. Para A×B tills du får en unge som bär exakt T₁ ⊆ önskade (rent).
 *   2. Para A×B tills du får en unge som bär exakt T₂ (rent).
 *   3. Para de två ungarna: poolen är nu T₁ ∪ T₂, alltså bara önskade.
 *
 * Med fyra önskade i en pool på sex är direktparningen ~2 % per ägg (~50 ägg).
 * Två rena tvåor kostar en del var, men sista steget blir 10 % i stället – och
 * totalen kan bli mindre. Sökningen nedan provar alla delmängdsuppdelningar.
 *
 * ## Två saker som skiljer räkningen från `passivePlan`
 *
 * 1. **`exactOdds`, inte `inheritOdds`, för mellanstegen.** Den vanliga planen
 *    räknar "minst de önskade" eftersom skräp inte spelar roll i ett mellansteg.
 *    Här spelar det roll: hela poängen med ett mellansteg är att *nästa* pool ska
 *    bli mindre, och en unge med skräp gör den större. Vi betalar alltså för en
 *    **ren** unge. Sista steget använder `inheritOdds` – då finns inget efteråt
 *    som skräpet kan fördärva.
 * 2. **Poolen är föräldrarnas union, inklusive skräp.** Båda de angivna palsen är
 *    riktiga individer med allt de bär. Derivat antas rena, eftersom vi köpt dem
 *    rena med `exactOdds`.
 *
 * Könet räknas som i `passivePlan`: en unge ur ett tidigare steg är 50/50, så
 * behövs ett bestämt kön kostar den i snitt dubbelt.
 */
import { childrenOf, exactOdds, inheritOdds } from "./breeding";
import type { AppData, Gender } from "./types";

/** En angiven förälder: ur boxen eller påhittad. */
export interface ManualParent {
  /** Art-index i `data.species`. */
  s: number;
  /** Allt palen bär – önskade OCH skräp. Skräpet är halva svaret. */
  pv: string[];
  g: Gender;
  /** Namn på exemplaret när det kommer ur boxen, annars null. */
  label: string | null;
}

export type ManualBlock =
  /** Paret finns inte i avelstabellen (t.ex. två olika legendarer). */
  | { kind: "noChild" }
  /** Båda är samma kön – de kan inte paras. */
  | { kind: "sameGender"; g: Gender }
  /** Önskade passiver som ingen av föräldrarna bär. */
  | { kind: "missing"; ids: string[] };

export interface ManualStep {
  /** Vad ungen ska bära när steget är klart. */
  gives: string[];
  /** Poolen steget drar ur. */
  pool: string[];
  /** Sannolikhet per ägg. */
  odds: number;
  /** Förväntat antal ägg för själva utfallet. */
  stepEggs: number;
  /** Extra ägg för att träffa rätt kön (0 när steget är sista, eller gratis). */
  genderEggs: number;
  /** Ur vilka: index i planens `steps`, eller null = det angivna paret. */
  fromA: number | null;
  fromB: number | null;
  /** Ungens art, eller null när paret ger flera utfall/inget. */
  child: number | null;
}

export interface ManualPlan {
  /** Tomt = planen går att genomföra. */
  blocks: ManualBlock[];
  /** Poolen det angivna paret drar ur. */
  pool: string[];
  /** Önskade som finns i paret. */
  have: string[];
  /** Skräp i poolen – det som gör oddsen sämre. */
  junk: string[];
  /** Arten paret ger, eller null. */
  child: number | null;
  /** Direktparningen: alla önskade i ett enda ägg. */
  direct: { odds: number; eggs: number } | null;
  /** Billigaste vägen, ett eller flera steg. Sista steget är målet. */
  steps: ManualStep[];
  /** Summan av `steps` – förväntat antal ägg totalt. */
  eggs: number;
}

const key = (ids: readonly string[]) => [...ids].sort().join("|");

/** Union av mängder. Aldrig summan av antal – samma skräp hos båda är EN pool-plats. */
const union = (a: readonly string[], b: readonly string[]) => [...new Set([...a, ...b])];

/** Alla icke-tomma delmängder av en lista, som index-bitmask. */
function subsets<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let mask = 1; mask < 1 << items.length; mask++) {
    const pick: T[] = [];
    for (let i = 0; i < items.length; i++) if (mask & (1 << i)) pick.push(items[i]!);
    out.push(pick);
  }
  return out;
}

/** Arten paret ger. Flera utfall (könsstyrda kombos) → null, vi lovar inget. */
function childSpecies(data: AppData, a: number, b: number): number | null {
  const kids = childrenOf(data, a, b);
  return kids.length === 1 ? (kids[0]?.c ?? null) : null;
}

/**
 * Sannolikheten för ett steg, och den hänger på om steget är **sista**.
 *
 * Är det målet räknas "minst de önskade" (`inheritOdds`) – det finns inget
 * efteråt som en extra skräp-passiv kan fördärva, och att kräva en ren unge där
 * vore att betala för något man inte har nytta av. Är det ett mellansteg måste
 * ungen vara **ren** (`exactOdds`), för hela poängen med steget är att nästa pool
 * ska bli mindre.
 *
 * Missas den skillnaden blir direktparningen dyrare än den är: ett enda steg som
 * ger alla fyra önskade prissattes som exactOdds(4,6) i stället för
 * inheritOdds(4,6), och sökningen valde en omväg som inte fanns.
 */
const stepOdds = (k: number, poolSize: number, isGoal: boolean): number =>
  isGoal ? inheritOdds(k, poolSize) : exactOdds(k, poolSize);

/** Planerar vad det angivna paret kan ge, och billigaste vägen dit. */
export function planManualPair(
  data: AppData,
  a: ManualParent,
  b: ManualParent,
  wanted: readonly string[],
): ManualPlan {
  const pool = union(a.pv, b.pv);
  const have = wanted.filter((id) => pool.includes(id));
  const junk = pool.filter((id) => !wanted.includes(id));
  const child = childSpecies(data, a.s, b.s);

  const blocks: ManualBlock[] = [];
  if (childrenOf(data, a.s, b.s).length === 0) blocks.push({ kind: "noChild" });
  /* Okänt kön blockerar inte: en pal ur saven har alltid ett, och en påhittad
     förälder är just påhittad – då är könet användarens sak att ordna. */
  if (a.g !== "?" && a.g === b.g) blocks.push({ kind: "sameGender", g: a.g });
  const missing = wanted.filter((id) => !pool.includes(id));
  if (missing.length > 0) blocks.push({ kind: "missing", ids: missing });

  /* Direktparningen räknas alltid ut, även när något blockerar: siffran är svaret
     på "vad hade det kostat", och den är det man jämför staging mot. */
  const directOdds = have.length === wanted.length && wanted.length > 0
    ? inheritOdds(wanted.length, pool.length)
    : 0;
  const direct = directOdds > 0 ? { odds: directOdds, eggs: 1 / directOdds } : null;

  const empty: ManualPlan = {
    blocks, pool, have, junk, child, direct, steps: [], eggs: Infinity,
  };
  if (blocks.length > 0 || wanted.length === 0) {
    return { ...empty, steps: [], eggs: direct ? direct.eggs : Infinity };
  }

  /* ---- billigaste vägen ----
     Tillståndet är "vilka önskade bär individen", och det finns bara två sätt att
     komma någonstans: hämta ur det angivna paret, eller slå ihop två saker man
     redan byggt. Med högst fyra önskade är det 15 delmängder, alltså gratis att
     söka igenom uttömmande. */
  type Node = { gives: string[]; eggs: number; step: ManualStep | null; deps: Node[] };

  const best = new Map<string, Node>();

  /* Löv: hämta en delmängd direkt ur paret. Rent om det är ett mellansteg,
     "minst" om delmängden råkar vara hela målet – då ÄR lövet direktparningen. */
  for (const want of subsets(have)) {
    const odds = stepOdds(want.length, pool.length, want.length === wanted.length);
    if (odds <= 0) continue;
    const eggs = 1 / odds;
    const k = key(want);
    const node: Node = {
      gives: want,
      eggs,
      step: {
        gives: want, pool: [...pool],
        odds, stepEggs: eggs, genderEggs: 0,
        fromA: null, fromB: null, child,
      },
      deps: [],
    };
    const prev = best.get(k);
    if (!prev || node.eggs < prev.eggs) best.set(k, node);
  }

  /* Slå ihop två byggda individer.
     Varför de alltid GÅR att para: varje nod här är en unge ur det angivna paret,
     alltså av samma art. Samma art parar sig alltid med sig själv i spelet, så
     ingen extra koll mot par-tabellen behövs – till skillnad från `passivePlan`,
     där bärarna är olika arter ur boxen och legendarer inte kan paras med annat
     än sin egen art. Byter man den här slingan till att också para ihop en unge
     med en av de ANGIVNA föräldrarna måste par-tabellen kollas igen.

     Relaxera tills inget blir billigare. Ordningen på delmängderna är
     inte topologisk, så en enda runda räcker inte – men fyra önskade ger som mest
     fyra nivåer, och `guard` finns för att en bugg aldrig ska bli en oändlig
     loop. */
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 8) {
    changed = false;
    const nodes = [...best.values()];
    for (const x of nodes) {
      for (const y of nodes) {
        const gives = union(x.gives, y.gives);
        if (gives.length <= x.gives.length && gives.length <= y.gives.length) continue;
        const mergePool = union(x.gives, y.gives);
        const p = stepOdds(gives.length, mergePool.length, gives.length === wanted.length);
        if (p <= 0) continue;
        const stepEggs = 1 / p;
        /* Båda föräldrarna är nu ungar, alltså 50/50 i kön. Det räcker att jaga
           kön på den billigare av dem – den andra tar man det man får. */
        const genderEggs = Math.min(x.eggs, y.eggs);
        const eggs = x.eggs + y.eggs + stepEggs + genderEggs;
        const k = key(gives);
        const prev = best.get(k);
        if (prev && prev.eggs <= eggs) continue;
        best.set(k, {
          gives,
          eggs,
          step: {
            gives, pool: mergePool, odds: p, stepEggs, genderEggs,
            fromA: null, fromB: null, child,
          },
          deps: [x, y],
        });
        changed = true;
      }
    }
  }

  const goal = best.get(key(wanted));
  if (!goal) return { ...empty, eggs: direct ? direct.eggs : Infinity };

  /* Vik ut trädet till en stegliste. Föräldrar förbrukas inte, så ett mellansteg
     som används två gånger föds fram EN gång – totalen räknas därför över de
     unika stegen, precis som i perfectPlan. */
  const steps: ManualStep[] = [];
  const seen = new Map<string, number>();
  const walk = (node: Node): number => {
    const k = key(node.gives);
    const already = seen.get(k);
    if (already !== undefined) return already;
    const deps = node.deps.map(walk);
    const step: ManualStep = {
      ...node.step!,
      fromA: deps[0] ?? null,
      fromB: deps[1] ?? null,
    };
    steps.push(step);
    const idx = steps.length - 1;
    seen.set(k, idx);
    return idx;
  };
  walk(goal);

  const eggs = steps.reduce((sum, s) => sum + s.stepEggs + s.genderEggs, 0);
  return { blocks, pool, have, junk, child, direct, steps, eggs };
}
