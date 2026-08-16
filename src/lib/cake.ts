/* Tårtan – avelns ANDRA kostnad.
 *
 * Planeraren har alltid räknat ägg, och `breedRate.ts` översätter äggen till
 * TID ("~14 ägg ≈ 48 min"). Men varje ägg kostar också en tårta i avelsfarmen,
 * och den kostnaden fanns ingenstans i appen: en plan på 239 ägg är 239 tårtor,
 * alltså 1 912 Egg, 1 673 Milk, 1 195 Flour (= 3 585 Wheat), 478 Honey och
 * 1 912 Red Berries. Det är inte en detalj man ser i huvudet.
 *
 * Fyra saker som är valda, inte råkade så:
 *
 * 1. **Receptet är DATA, inte en handskriven tabell.** Det ligger i
 *    `crafting`-tabellen i pyPalworldAPI-dumpen som `tools/build-item-info.mjs`
 *    redan hämtar, och genereras till `data/recipes.json` med en kolumnkontroll
 *    mot två kända recept. En handskriven ingredienslista hade sett precis lika
 *    trovärdig ut som en riktig och tystnat vid nästa patch.
 * 2. **`out` respekteras.** Ett recept ger inte alltid 1 – räknar man
 *    ingredienser utan att dela med utbytet blir allt fel så fort spelet ger
 *    flera. Tårtorna ger 1 i dag, men koden ska inte behöva ändras när något
 *    annat inte gör det.
 * 3. **Underrecepten vecklas ut EN nivå och redovisas som "= N Wheat".**
 *    Flour är det enda som har ett underrecept i praktiken, och att slå ihop
 *    det i totalen hade dolt att man behöver en kvarn, inte en till åker.
 * 4. **En tårta per ägg är COMMUNITYNS siffra, inte dumpens.** Spelets egen
 *    text säger bara att tårta krävs. Talet märks därför ≈ i gränssnittet,
 *    precis som avelsoddsen och expeditionernas FP-formel.
 *
 * Producenterna kommer ur `RANCH_DROPS`, som redan är belagd mot varje pals
 * partnerskill-text: tre av fem ingredienser i standardtårtan (Egg, Milk,
 * Honey) läggs av en pal i ranchen, och då är "du äger tre Mozzarina men ingen
 * står i en bas" det som faktiskt får bygget att gå framåt. Grödorna (Wheat,
 * Red Berries) har ingen producent och står utan – Red Berries läggs visserligen
 * av Caprity, och den raden kommer med av sig själv eftersom den finns i
 * tabellen.
 */

import raw from "./data/recipes.json";
import { atBase, RANCH_DROPS } from "./constants";
import type { AppData, ScoredPal } from "./types";

export interface Recipe {
  /** Antal varan ger per hantverk. */
  out: number;
  /** Ingrediens → antal, spelets egna namn. */
  mats: Record<string, number>;
}

export const RECIPES = raw as Record<string, Recipe>;

/** Spelets standardtårta – den avelsfarmen brukar matas med. */
export const DEFAULT_CAKE = "Cake";

/**
 * Tårtor per ägg. Communityns siffra: spelets egen text säger bara att tårta
 * krävs, inte hur mycket, så den ska märkas ≈ där den visas.
 */
export const CAKE_PER_EGG = 1;

/** Alla tårtor spelet har, standardtårtan först. */
export function cakeNames(): string[] {
  const all = Object.keys(RECIPES).filter((n) => /(^|\s)Cake$/.test(n));
  return [DEFAULT_CAKE, ...all.filter((n) => n !== DEFAULT_CAKE)];
}

export interface CakeMat {
  item: string;
  qty: number;
  /** Underrecept, redan multiplicerat: Flour 5 → { item: "Wheat", qty: 15 }. */
  from: { item: string; qty: number } | null;
  /** Arter som lägger varan i ranchen. Tom lista = gröda eller annan källa. */
  ranch: CakeProducer[];
}

export interface CakeProducer {
  /** Artindex i `data.species`. */
  s: number;
  name: string;
  /** Antal du äger. */
  owned: number;
  /** Hur många av dem som står i en bas (och alltså kan sättas i ranchen). */
  atBase: number;
}

export interface CakePlan {
  /** Receptet som räknats på. */
  cake: string;
  /** Tårtans äggmultiplikator (Vegetable Cake = 2). Gränssnittet ska kunna
   *  säga VARFÖR antalet är lägre än äggen. */
  perLay: number;
  /** Antal tårtor planen kräver. */
  cakes: number;
  /** Äggen de kommer ur – samma tal som planeraren visar. */
  eggs: number;
  mats: CakeMat[];
  /** Ingredienser vars rad saknas i receptdatan. Tom i normalfallet; en icke-tom
   *  lista är en lucka som ska SYNAS, inte tigas ihjäl. */
  unknown: string[];
}

/* ============================================================
   VILKEN TÅRTA? – rådet, och vad det får vila på
   ============================================================

   Spelet har fem tårtor och FYRA av dem gör något utöver ägget. Det står i
   spelets egen text, ordagrant (v1.0.1, `items`-tabellen – texten ligger i
   `itemInfo.json` och visas i gränssnittet):

     Cake                        "…lay a particularly healthy egg."  (inget mer)
     Mushroom Cake               "The talents … will grow SLIGHTLY more easily."
     Vegetable Cake              "Lay eggs twice at once."
     Extravagant Vegetable Cake  "Mutations are more likely … talents will grow more easily."
     Special Cake                "More likely inherit multiple passive skills from their parents."

   Två saker gör skillnaden mellan ett råd och en gissning här:

   1. **Klassningen nedan är en LÄSNING av den meningen, inte en egen teori.**
      Varje rad bär `proof` – orden påståendet vilar på – och
      `tests/cake.test.ts` håller dem mot texten i `itemInfo.json`. Skriver
      Pocketpair om en beskrivning faller testet i stället för att rådet tyst
      börjar peka på fel tårta.
   2. **Ingen procent hittas på.** Spelet säger "more likely" och aldrig hur
      mycket, så appen säger riktningen och aldrig ett tal. Enda undantaget är
      Vegetable Cake, där "twice at once" ÄR ett tal – och även det märks ≈,
      eftersom vi inte vet om farmen drar en tårta per läggning eller per ägg.
*/

/** Vad man är ute efter just nu. Planeraren vet det redan. */
export type CakeGoal = "passives" | "iv" | "volume" | "plain";

export interface CakeEffect {
  cake: string;
  /** Vad tårtan är BÄST till. */
  goal: CakeGoal;
  /** Orden i spelets egen beskrivning som påståendet vilar på. Testas. */
  proof: string;
  /**
   * Äggmultiplikator när effekten ÄR ett tal. Bara Vegetable Cake har en:
   * "Lay eggs twice at once". Övriga är `1` – inte för att de saknar effekt,
   * utan för att effekten inte är kvantifierad någonstans.
   */
  eggs: number;
}

/**
 * Tårtorna i den ordning rådet väger dem, starkast särdrag först.
 *
 * `Special Cake` står först under `passives` av samma skäl som den kostar 20 400
 * i guld mot vanliga tårtans 6 300: den gör det planeraren faktiskt kämpar med.
 * Att den är dyr är inget skäl att dölja den – appen visar priset och låter
 * spelaren värdera det, precis som med IV-frukterna.
 */
export const CAKE_EFFECTS: readonly CakeEffect[] = [
  { cake: "Special Cake", goal: "passives", proof: "multiple passive skills", eggs: 1 },
  { cake: "Vegetable Cake", goal: "volume", proof: "twice at once", eggs: 2 },
  { cake: "Extravagant Vegetable Cake", goal: "iv", proof: "Mutations", eggs: 1 },
  { cake: "Mushroom Cake", goal: "iv", proof: "slightly more easily", eggs: 1 },
  { cake: DEFAULT_CAKE, goal: "plain", proof: "healthy egg", eggs: 1 },
];

export interface CakeAdvice {
  /** Tårtan planen pekar på. */
  pick: CakeEffect;
  /** Varför just den – vad i planen som avgjorde. */
  because: CakeGoal;
  /** De andra, i vägd ordning. Alltid med: valet är spelarens. */
  rest: readonly CakeEffect[];
}

/**
 * Vilken tårta planen pekar på.
 *
 * Ordningen är den planeraren själv redan använder: **passiver väger tyngst**,
 * för de är det enda som inte går att skaffa på något annat sätt (IV går att
 * köpa med frukt, arten går att avla fram). Sedan IV-jakten, och sist ren
 * volym – många billiga ägg, till exempel dubbletter att kondensera, där det
 * enda som räknas är hur fort lådan fylls.
 */
export function cakeAdvice(opts: {
  /** Antal önskade passiver planen siktar på. */
  wanted: number;
  /** IV-målet: "fast" jagar inga tröskelvärden. */
  ivGoal?: "fast" | "near" | "perfect";
  /** true när man avlar för ANTAL – dubbletter att kondensera. */
  volume?: boolean;
}): CakeAdvice {
  const goal: CakeGoal = opts.wanted > 0 ? "passives"
    : opts.volume ? "volume"
      : opts.ivGoal && opts.ivGoal !== "fast" ? "iv"
        : "plain";
  const byGoal = CAKE_EFFECTS.filter((e) => e.goal === goal);
  const pick = byGoal[0] ?? CAKE_EFFECTS[CAKE_EFFECTS.length - 1]!;
  return { pick, because: goal, rest: CAKE_EFFECTS.filter((e) => e !== pick) };
}

/**
 * Antal tårtor för ett antal ägg. Alltid uppåt – en halv tårta finns inte.
 *
 * `perLay` är tårtans äggmultiplikator: Vegetable Cake lägger "twice at once",
 * så samma plan tar hälften så många läggningar. Att det också halverar antalet
 * TÅRTOR förutsätter att farmen drar en tårta per läggning och inte per ägg,
 * och det säger spelet inte – därför är hela raden märkt ≈ i gränssnittet.
 */
export function cakesForEggs(eggs: number, perLay = 1): number {
  return Math.ceil((Math.max(0, eggs) * CAKE_PER_EGG) / Math.max(1, perLay));
}

/**
 * Vad planens ägg kostar i tårta, och vem i boxen som lägger ingredienserna.
 *
 * `null` när receptet inte finns i datan – hellre ingen ruta än en tom.
 */
export function planCake(
  data: AppData,
  pals: readonly ScoredPal[],
  eggs: number,
  cake: string = DEFAULT_CAKE,
): CakePlan | null {
  const recipe = RECIPES[cake];
  if (!recipe) return null;

  /* Tårtans egen äggmultiplikator: Vegetable Cake lägger två åt gången, så
     samma plan behöver hälften så många. Okänd tårta = 1, aldrig en gissning. */
  const perLay = CAKE_EFFECTS.find((e) => e.cake === cake)?.eggs ?? 1;
  const cakes = cakesForEggs(eggs, perLay);
  /* Utbytet delar antalet hantverk, inte ingredienserna: ger receptet två
     tårtor behöver man bara halva antalet omgångar. Uppåt igen – man kan inte
     baka en halv omgång. */
  const batches = Math.ceil(cakes / Math.max(1, recipe.out));

  const byItem = producersByItem(data, pals);
  const unknown: string[] = [];
  const mats: CakeMat[] = Object.entries(recipe.mats).map(([item, per]) => {
    const qty = per * batches;
    const sub = RECIPES[item];
    /* Underreceptet räknas på sina EGNA omgångar: 5 Flour × 3 omgångar är 15
       Flour, och 15 Flour är 15 omgångar à 3 Wheat = 45 Wheat. */
    const from = sub
      ? (() => {
        const subBatches = Math.ceil(qty / Math.max(1, sub.out));
        const [first] = Object.entries(sub.mats);
        return first ? { item: first[0], qty: first[1] * subBatches } : null;
      })()
      : null;
    return { item, qty, from, ranch: byItem.get(item) ?? [] };
  });

  for (const m of mats) if (m.qty <= 0) unknown.push(m.item);

  return { cake, perLay, cakes, eggs, mats, unknown };
}

/**
 * Vara → arterna som lägger den i ranchen, med hur många du äger.
 *
 * Bivaror (`side`) räknas med: Dumud Gild lägger Gold Coin vid sidan av sin
 * huvudvara, och för frågan "vem ger mig X?" är det ett lika giltigt svar.
 * Samlingsord (`group`) utelämnas däremot – "various seeds" är vårt ord för
 * något källan inte räknar upp, och duger inte som ingrediensrad.
 */
function producersByItem(
  data: AppData,
  pals: readonly ScoredPal[],
): Map<string, CakeProducer[]> {
  const idxByName = new Map(data.species.map((sp, s) => [sp.name, s] as const));
  const out = new Map<string, CakeProducer[]>();
  for (const row of RANCH_DROPS) {
    if (row.group) continue;
    const s = idxByName.get(row.sp);
    if (s === undefined) continue;
    const mine = pals.filter((p) => p.s === s);
    const producer: CakeProducer = {
      s,
      name: row.sp,
      owned: mine.length,
      atBase: mine.filter((p) => atBase(p.c)).length,
    };
    const list = out.get(row.item);
    if (list) list.push(producer);
    else out.set(row.item, [producer]);
  }
  /* Ägda först, och flest ägda av dem – raden ska börja med den du kan sätta i
     ranchen i dag. */
  for (const list of out.values()) {
    list.sort((a, b) => b.owned - a.owned || a.name.localeCompare(b.name, "sv"));
  }
  return out;
}
