/** Passiv-planen: samla ihop de önskade passiverna, byt sedan art till målet.
 *
 * **Fas 1 är ett träd, inte en kedja.** Det är hela poängen med filen, och det
 * togs fel en gång: planen lade tidigare på en passiv i taget på en och samma
 * linje (start + bärare → + bärare → + bärare). Att i stället para ihop bärarna
 * **två och två** och slå ihop mellanresultaten är billigare, och skälet är att
 * kostnaden är konvex i poolens storlek:
 *
 *   `inheritOdds(2, 2)` = 60 % → ~1,7 ägg      (två önskade ur en ren pool)
 *   `inheritOdds(3, 3)` = 30 % → ~3,3 ägg
 *   `inheritOdds(4, 4)` = 10 % → ~10 ägg
 *
 * Sista steget kostar 10 ägg oavsett hur man kommer dit – poolen är de fyra
 * önskade i båda fallen. Skillnaden ligger i vägen fram: den linjära bygger en
 * trea på vägen (1,7 + 3,3 = 5 ägg), den parvisa bygger två tvåor (1,7 + 1,7 =
 * 3,3 ägg). Med fyra bärare som har varsin passiv blir det 15 mot 13,3 ägg, och
 * räknar man med kön (nedan) 20 mot 15 – en fjärdedel billigare. Har en bärare
 * redan två av dem sparar den parvisa 12,5 % oavsett kön.
 *
 * Därför söks **alla** sätt att para ihop bärarna igenom, inte bara ett. Att det
 * går är ingen tur: en pal har fyra passiv-platser i spelet, så `MAX_WANTED` är
 * 4 och set-covern kan aldrig välja fler än fyra bärare. Sökningen är alltså
 * 2⁴ = 16 delmängder och kostar ingenting. Höjs taket någon gång är det 3ⁿ
 * uppdelningar det växer med – fortfarande försumbart långt förbi åtta.
 *
 * Tre saker modellen räknar med, som inte syns i oddsen:
 *
 * 1. **Kön kostar.** En unge ur ett tidigare steg är 50/50, så måste den ha ett
 *    bestämt kön kostar den i snitt en kull till. Är båda föräldrarna mellansteg
 *    räcker det att jaga kön på den *billigare*. Är den ena en ägd bärare som
 *    finns i båda könen i boxen är det gratis – då väljer man partner efter vad
 *    ungen råkade bli. Det är just den kostnaden som gör den parvisa vägen så
 *    mycket bättre: den linjära betalar könspåslag i vartenda steg efter det
 *    första, den parvisa bara i det sista.
 * 2. **Bara ägda pals bär skräp.** Ett mellansteg kläcker man tills det har de
 *    önskade, och antas då rent – samma antagande som resten av planeraren.
 * 3. **Poolen är unionen av mängder**, aldrig summan av antal: bär båda
 *    föräldrarna samma skräp-passiv ligger den bara en gång i poolen.
 *
 * **Bärarvalet mäts också i ägg, inte i bärare.** Set-covern minimerar *antal*
 * bärare, och en bärare mindre är oftast ett steg mindre – men bara oftast. Kens
 * fall (aug 2026): en Digtoise bar alla fyra önskade själv och låg två artsteg
 * från Helzephyr Lux (10 + 10 = 20 ägg), medan hans Helzephyr ♀ + Beakon ♂
 * tillsammans bar samma fyra **och** ger Helzephyr Lux direkt – ett steg, 10 ägg.
 * En bärare slår alltid två i covern, så det paret kunde aldrig komma in i
 * trädet. Därför byggs flera **kandidatuppsättningar** (`directPair.ts` letar upp
 * paren) och var och en prövas mot HELA planens äggkostnad, samma princip som
 * `ROOT_CANDIDATES` redan använder för att välja rot. Det som fortfarande *inte*
 * provas är godtyckliga uppsättningar med en extra bärare som landar i en art
 * *nära* målet – det är vad `altRoutes.ts` letar efter, som ett tillägg under
 * planen.
 */

import { findAltRoutes } from "./altRoutes";
import type { AltRoute } from "./altRoutes";
import { findDirectPairs } from "./directPair";
import {
  chainAlternatives, childrenOf, compareParents, DEFAULT_PARENT_PREFS, inheritOdds, solveChain,
  solveChainCheapest,
} from "./breeding";
import type { ParentPrefs } from "./breeding";
import type { AppData, ChainStep, ScoredPal } from "./types";

/** Djupgräns för artkedjan i fas 2. */
const MAX_DEPTH = 10;

/**
 * Så många rot-kandidater (en per landningsart) som får kosta en artkedje-sökning.
 * Trädet kan landa i olika arter beroende på hur bärarna paras ihop, och fas 2
 * kostar väldigt olika mycket därifrån – men varje uppslag är en Dijkstra över
 * alla arter, så listan måste ha ett tak.
 */
const ROOT_CANDIDATES = 4;

/** Så många noder som mest sparas per delmängd. Fler ger inga bättre träd. */
const NODES_PER_MASK = 8;

/**
 * Så många par vars unge är målarten som provas som egen bäraruppsättning.
 * De är sorterade på odds, så den första är i praktiken alltid den som vinner –
 * de följande finns för att `combine` slår upp arten i pardatan på nytt och kan
 * landa någon annanstans än uppräkningen trodde (könsstyrda kombos).
 */
const DIRECT_CANDIDATES = 2;

/** Minsta vinst (i ägg) för att en avvikande ihopslagningsordning ska förklaras. */
const MIN_DETOUR_SAVING = 1;

export interface CarrierInfo {
  passiveId: string;
  carriers: ScoredPal[];
  /**
   * Bäraren planen faktiskt använder. Kortet och stegen under måste peka ut
   * samma individ – annars rekommenderar appen en pal den sedan inte rör.
   */
  chosen: ScoredPal | null;
  /** Hur många av de önskade passiverna `chosen` täcker. */
  covers: number;
}

/** En förälder i ett merge-steg: en ägd bärare, eller ungen ur ett tidigare steg. */
export interface MergeParent {
  /** Ägd pal, eller null när föräldern kommer ur ett tidigare steg. */
  pal: ScoredPal | null;
  /** 1-baserat stegnummer när föräldern kommer ur ett tidigare steg. */
  fromStep?: number;
  species: number;
  /** Önskade passiver föräldern bidrar med. */
  gives: string[];
}

export interface MergeStep {
  /** 1-baserat stegnummer. Stegen är ordnade så att föräldrarna alltid finns. */
  n: number;
  a: MergeParent;
  b: MergeParent;
  childSpecies: number;
  /** Önskade passiver ungen ska ha efter steget. */
  haveAfter: string[];
  /** Passiv-poolen ungen lottar ur. */
  pool: number;
  odds: number;
  /** Ägg för steget, könspåslaget inräknat. */
  eggs: number;
  /** Av dem: extra ägg för att träffa rätt kön på en unge ur ett tidigare steg. */
  genderEggs: number;
  /** false = paret kan inte avla (t.ex. legendar × annan art) – steget kräver omväg. */
  possible: boolean;
  /** false = båda föräldrarna är kända individer med samma kön, alltså ingen parning. */
  genderOk: boolean;
}

export interface SpeciesPhaseStep extends ChainStep {
  partner: ScoredPal | null;
  odds: number;
  /** false = partnern har samma kön som linjen och paret kan inte avla. */
  genderOk: boolean;
  /** Passiv-poolen barnet lottar ur. Behövs för att räkna vad en ren partner sparar. */
  pool: number;
  /** Antal skräp-passiver partnern släpar in i poolen. */
  partnerJunk: number;
  /** Sant för första steget, där linjen fortfarande är startpalen. */
  first: boolean;
}

export interface PassivePlan {
  carrierInfo: CarrierInfo[];
  missing: string[];
  usable: string[];
  /**
   * Huvudbäraren – den som täcker flest önskade. Är den ensam räcker den hela
   * vägen och fas 1 hoppas över; annars är den en av flera i trädet nedan.
   */
  start: ScoredPal | null;
  mergeSteps: MergeStep[];
  /** Ägda bärare som trädet faktiskt använder. */
  carriersUsed: ScoredPal[];
  /** Ägg för fas 1 ensam, könspåslag inräknat. */
  mergeEggs: number;
  /**
   * Satt när ihopslagningsordningen **inte** är den billigaste i fas 1.
   *
   * Trädet väljs på hela planen, inte på halva: olika sätt att para ihop bärarna
   * landar i olika arter, och en ordning som kostar några ägg mer i fas 1 kan
   * landa ett artsteg närmare målet och därmed bli billigare totalt. Utan den
   * här upplysningen ser ordningen ut som ett misstag – planen säger ju själv
   * att man ska mötas på mitten.
   */
  mergeDetour: { cheapestEggs: number; saves: number } | null;
  /** Art som linjen landar i efter fas 1. */
  lineSpecies: number | null;
  speciesPhase: SpeciesPhaseStep[] | null;
  speciesPhaseFailed: boolean;
  /**
   * Alla artkedjor som tar lika många steg som den billigaste, billigast först
   * (`chainAlternatives`). Finns bara när det är fler än en – en ensam väg är
   * inget val. Rutten identifieras av sina artkoder, samma form som
   * `BreedingPrefs.chain`, så gränssnittet kan spara valet direkt.
   */
  chainOptions: { codes: string[]; eggs: number; steps: ChainStep[] }[];
  /** Är kedjan ovan vald för hand, eller är det planerarens rekommendation? */
  chainPinned: boolean;
  /** Palen planen tvingats använda (manuellt läge), eller null. */
  forced: ScoredPal | null;
  /**
   * Hur många av de önskade passiverna den tvingade palen faktiskt bär.
   *
   * 0 betyder att den inte är en bärare alls: den bidrar bara med sin art och
   * sitt eventuella skräp, och gör planen dyrare. Det ska sägas rent ut i
   * gränssnittet – annars ser en dyr plan ut som planerarens fel.
   */
  forcedCovers: number;
  /**
   * Den kortaste (färst steg) artkedjan, när den är märkbart dyrare än den valda.
   * Finns bara för att kunna förklara i gränssnittet varför planen tar en omväg –
   * annars ser ett extra steg ut som ett fel.
   */
  speciesPhaseShortcut: {
    steps: number;
    eggs: number;
    /** Arten vars smutsiga partner gör den korta vägen dyr – fånga en ren sådan. */
    blockedBy: number | null;
    /** Vad korta vägen hade kostat med en ren partner av den arten. */
    eggsIfClean: number;
  } | null;
  expectedEggs: number;
  /**
   * Andra startarter som blir billigare i ägg än planen ovan – ett tillägg,
   * aldrig en ersättning. Set-covern här minimerar antal bärare, och när en
   * enda pal täcker allt hoppas fas 1 över; då kan två *andra* pals som
   * tillsammans bär precis de önskade vara billigare ändå. Se `altRoutes.ts`.
   */
  alternatives: AltRoute[];
}

/** En individ i handen under sökningen: en ägd bärare eller en kläckt unge. */
interface Node {
  /** Bitmask över bärarna i deltäckningen. Sökningens nyckel. */
  leaves: number;
  /** Önskade passiver noden bär. */
  want: ReadonlySet<string>;
  species: number;
  /** Skräp noden släpar in i poolen. Bara ägda pals har sådant. */
  junk: ReadonlySet<string>;
  /** Ägd pal, eller null för en kläckt unge. */
  pal: ScoredPal | null;
  /** Ägg för just den här kläckningen (0 för en ägd pal), könspåslaget inräknat. */
  stepEggs: number;
  genderEggs: number;
  /** Ägg för hela deltäckningen: noden och allt under den. */
  eggs: number;
  /** Antal steg som inte går att genomföra. Sorteras på före ägg – aldrig ägg. */
  broken: number;
  via?: {
    a: Node;
    b: Node;
    odds: number;
    pool: number;
    possible: boolean;
    genderOk: boolean;
  };
}

const opposite = (g: "M" | "F" | "?") => (g === "M" ? "F" : g === "F" ? "M" : null);

/**
 * Bygger en komplett plan: greedy set cover av bärare → billigaste merge-TRÄDET
 * (se filhuvudet), sedan artbyteskedja till target (om satt) med renaste partner
 * per steg.
 */
export function buildPassivePlan(
  data: AppData,
  pals: ScoredPal[],
  ownedSpecies: ReadonlySet<number>,
  wanted: string[],
  target: number | null,
  prefs: ParentPrefs = DEFAULT_PARENT_PREFS,
  /**
   * Vald artkedja som artkoder (`BreedingPrefs.chain`). Tomt = ta den
   * billigaste. Matchar den ingen av de likvärdiga vägarna – boxen kan ha
   * ändrats sedan valet gjordes – faller planen tyst tillbaka på
   * rekommendationen, och `chainPinned` blir false så gränssnittet kan sluta
   * påstå att något är låst.
   */
  pinnedChain: readonly string[] = [],
  /**
   * En pal ur boxen som planen **måste** använda (manuellt läge, en vald
   * förälder). Set-covern väljer annars bärare helt själv och minimerar antalet;
   * här är en av dem given, och resten fylls på runt den.
   *
   * Bär den inga av de önskade passiverna är den ingen bärare alls – då kan den
   * bara bidra med sin art och sitt skräp. Planen byggs ändå, för svaret på "vad
   * kostar det att envisas med den här?" är en siffra och inte ett nej, men
   * `forcedCovers` blir 0 så gränssnittet kan säga det rent ut.
   */
  mustUse: ScoredPal | null = null,
  opts: {
    /**
     * "Hur avlar jag EN TILL?" i stället för "vad kostar målbilden?".
     *
     * Bär en pal i boxen redan alla önskade passiver OCH är målarten kostar
     * planen noll ägg – rätt svar på frågan som ställs, men då finns ingen led
     * att titta på, och vägen dit är ofta det man kom för (Kens rättning aug
     * 2026: *"jag hade velat att den visat pathen ändå"*). Med flaggan räknas den
     * pal som gör planen gratis inte som ett svar i sig utan som en **förälder**:
     * uppsättningar som inte innebär en enda parning läggs undan, och paren får
     * bestå av en förälder som redan bär allt (`allowSubset` i `directPair.ts`).
     * Finns ingen sådan parning står den gratis uppsättningen kvar – planen ska
     * aldrig bli tom av en flagga.
     */
    breedAnother?: boolean;
  } = {},
): PassivePlan {
  const wantedSet = new Set(wanted);
  // Varje pal som deltar bedöms mot de önskade passiverna: allt annat den bär är
  // skräp som hamnar i arvspoolen och sänker oddsen.
  const parentPrefs: ParentPrefs = { ...prefs, wanted: wantedSet };
  const junkOf = (p: ScoredPal) => p.pv.reduce((n, id) => n + (wantedSet.has(id) ? 0 : 1), 0);
  const coverOf = (p: ScoredPal) => p.pv.reduce((n, id) => n + (wantedSet.has(id) ? 1 : 0), 0);
  /**
   * Exakt samma rangordning som set-covern nedan: täcker flest önskade först,
   * sedan minst skräp, sedan IV-målet.
   *
   * Att sortera på `score` här (som tidigare) gav fel svar två gånger om: score
   * belönar höga tiers och därmed de SMUTSIGASTE palsen, och den räknade varje
   * passiv för sig – så en pal som täckte två önskade rankades inte högre än en
   * som täckte en. Resultatet var att kortet pekade ut en pal (Woolipop, fyra
   * passiver varav två skräp) som planen under aldrig använde.
   */
  const rankCarriers = (a: ScoredPal, b: ScoredPal) =>
    coverOf(b) - coverOf(a) || junkOf(a) - junkOf(b) || compareParents(a, b, parentPrefs);
  const carrierInfo: CarrierInfo[] = wanted.map((id) => ({
    passiveId: id,
    carriers: pals.filter((p) => p.pv.includes(id)).sort(rankCarriers),
    chosen: null,
    covers: 0,
  }));
  const missing = carrierInfo.filter((c) => !c.carriers.length).map((c) => c.passiveId);
  const usable = wanted.filter((id) => !missing.includes(id));

  const plan: PassivePlan = {
    carrierInfo, missing, usable,
    start: null, mergeSteps: [], carriersUsed: [], mergeEggs: 0, mergeDetour: null,
    lineSpecies: null,
    speciesPhase: null, speciesPhaseFailed: false, speciesPhaseShortcut: null,
    chainOptions: [], chainPinned: false, forced: null, forcedCovers: 0,
    expectedEggs: 0, alternatives: [],
  };
  if (!usable.length) return plan;
  const usableSet = new Set(usable);

  if (mustUse) {
    plan.forced = mustUse;
    plan.forcedCovers = mustUse.pv.filter((id) => usableSet.has(id)).length;
  }

  /**
   * Greedy set cover: färst bärare som täcker alla önskade, med `seed` given.
   *
   * Fröet läggs in FÖRE greedyn så att resten väljs med vetskap om vad det redan
   * täcker – lägger man till det efteråt får man en bärare för mycket. Det är
   * så manuellt läge fyller på runt en utpekad pal, och så ett par ur
   * `findDirectPairs` blir en komplett uppsättning.
   */
  const buildCover = (seed: readonly ScoredPal[]): ScoredPal[] => {
    const remaining = new Set(usable);
    const cover = [...seed];
    for (const p of seed) for (const id of p.pv) remaining.delete(id);
    const candidates = pals.filter((p) => p.pv.some((id) => remaining.has(id)));
    while (remaining.size) {
      let best: ScoredPal | null = null;
      let bestCover = 0;
      for (const p of candidates) {
        if (cover.includes(p)) continue;
        const covers = p.pv.filter((id) => remaining.has(id)).length;
        // Täcker flest önskade först; vid lika täckning den renaste (minst skräp),
        // och därefter den som är bäst förälder enligt IV-målet.
        if (
          covers > bestCover ||
          (covers === bestCover && covers > 0 && best &&
            (junkOf(p) < junkOf(best) ||
              (junkOf(p) === junkOf(best) && compareParents(p, best, parentPrefs) < 0)))
        ) {
          best = p;
          bestCover = covers;
        }
      }
      if (!best) break;
      cover.push(best);
      best.pv.forEach((id) => remaining.delete(id));
    }
    // Flest önskade först: linjen ska börja i den bärare som täcker mest.
    return cover.sort((a, b) => coverOf(b) - coverOf(a));
  };

  /* ---- Kandidatuppsättningar av bärare ----
     Se filhuvudet: covern minimerar antal bärare, planen mäts i ägg. Den greedy-
     minimala uppsättningen är alltid med, och dessutom de par vars unge ÄR
     målarten – de slår ihop fas 1 och fas 2 till en enda parning och kan därför
     vinna trots att de kostar en bärare mer. Var och en prövas nedan mot hela
     planens äggkostnad. */
  let covers: ScoredPal[][] = [buildCover(mustUse ? [mustUse] : [])];
  const sameCover = (a: readonly ScoredPal[], b: readonly ScoredPal[]) =>
    a.length === b.length && a.every((p) => b.some((q) => q.id === p.id));
  for (const dp of findDirectPairs(
    data, pals, target, usable, parentPrefs, DIRECT_CANDIDATES, opts.breedAnother,
  )) {
    /* Manuellt läge: uppsättningen måste innehålla den utpekade palen, annars
       svarar planen på en annan fråga än den som ställdes. Paret finns kvar som
       förslag under planen (`altRoutes`). */
    if (mustUse && dp.a.id !== mustUse.id && dp.b.id !== mustUse.id) continue;
    const pair = [dp.a, dp.b].sort((a, b) => coverOf(b) - coverOf(a));
    if (!covers.some((c) => sameCover(c, pair))) covers.push(pair);
  }
  if (opts.breedAnother && target !== null) {
    /* En ensam bärare som redan är målarten är noll parningar, alltså ingen led.
       Den läggs undan – men bara om något annat blev kvar, annars vore svaret
       en tom plan i stället för "klart". */
    const withStep = covers.filter((c) => c.length > 1 || c[0]!.s !== target);
    if (withStep.length) covers = withStep;
  }

  const leafOf = (p: ScoredPal, leaves: number): Node => ({
    leaves,
    want: new Set(p.pv.filter((id) => wantedSet.has(id))),
    species: p.s,
    junk: new Set(p.pv.filter((id) => !wantedSet.has(id))),
    pal: p,
    stepEggs: 0, genderEggs: 0, eggs: 0, broken: 0,
  });

  /** Trasiga steg först bort, sedan billigast, sedan färst steg. */
  const rank = (x: Node, y: Node) =>
    x.broken - y.broken || x.eggs - y.eggs || countSteps(x) - countSteps(y);

  /** En färdigräknad plan för EN bäraruppsättning: fas 1 + fas 2 + totalen. */
  interface Attempt {
    cover: ScoredPal[];
    root: Node;
    /** Fas 1:s billigaste rot för samma uppsättning – underlag för `mergeDetour`. */
    detour: { cheapestEggs: number; saves: number } | null;
    /** null = artkedjan gick inte att lösa därifrån. */
    chain: ChainStep[] | null;
    /** Fas 1 + fas 2 i ägg. Infinity när kedjan saknas. */
    total: number;
    /* Fas 2:s räknare, som efterarbetet nedan behöver för genvägen, de
       likvärdiga kedjorna och stegens odds. De hänger på uppsättningen (linjens
       egna passiver och kön), så de kan inte lyftas ur. */
    linePv: ReadonlySet<string>;
    lineGender: "M" | "F" | "?" | null;
    partnerFor: (s: number, first: boolean) => ScoredPal | null;
    stepPool: (s: number, first: boolean) => number;
    stepOdds: (s: number, first: boolean) => number;
    stepEggs: (s: number, first: boolean) => number;
  }

  const evaluate = (cover: ScoredPal[]): Attempt | null => {
    const start = cover[0];
    if (!start) return null;

    /**
     * En likvärdig individ av motsatt kön. Bärarna väljs enbart på passiver, så
     * set-covern kan råka plocka två honor – och två honor kan inte avla. Bär
     * någon annan i boxen samma önskade passiver är den ett fullgott byte, och
     * renast vinner bland dem.
     *
     * `maxJunk` skiljer två olika frågor åt: för att över huvud taget få paret
     * att avla duger vilken ersättare som helst (en smutsig partner är bättre än
     * ingen), men för att räkna könet som *gratis* måste bytet vara verkligt
     * likvärdigt – annars smyger sig skräp in i poolen utan att synas i oddsen.
     */
    const altOfGender = (
      p: ScoredPal,
      need: "M" | "F" | null,
      maxJunk = Infinity,
    ): ScoredPal | null => {
      if (!need) return null;
      const gives = p.pv.filter((id) => wantedSet.has(id));
      return pals
        .filter((x) =>
          x.g === need && x.id !== p.id && junkOf(x) <= maxJunk &&
          gives.every((id) => x.pv.includes(id)) &&
          !cover.some((s) => s.id === x.id))
        .sort((a, b) => junkOf(a) - junkOf(b) || compareParents(a, b, parentPrefs))[0] ?? null;
    };

    /* ---- Fas 1: billigaste merge-trädet över bärarna ---- */

    /**
     * Två kända individer måste vara ♂ + ♀. Går det inte byts *individ, inte
     * plan*: en annan pal som bär samma önskade passiver duger lika bra. Först
     * när ingetdera går flaggas steget i stället för att tigas ihjäl.
     */
    const resolvePair = (x: ScoredPal, y: ScoredPal) => {
      if (x.g !== y.g && x.g !== "?" && y.g !== "?") return { x, y, ok: true };
      const ax = altOfGender(x, opposite(y.g));
      if (ax) return { x: ax, y, ok: true };
      const ay = altOfGender(y, opposite(x.g));
      if (ay) return { x, y: ay, ok: true };
      return { x, y, ok: false };
    };

    const combine = (a: Node, b: Node): Node | null => {
      let na = a;
      let nb = b;
      let genderOk = true;
      let genderEggs = 0;

      if (a.pal && b.pal) {
        // Två ägda bärare: könet avgörs av vilka individer man väljer, inte av ägg.
        const r = resolvePair(a.pal, b.pal);
        genderOk = r.ok;
        if (r.x !== a.pal) na = leafOf(r.x, a.leaves);
        if (r.y !== b.pal) nb = leafOf(r.y, b.leaves);
      } else if (a.pal || b.pal) {
        /* En ägd bärare + en unge ur ett tidigare steg. Ungens kön är slumpat.
           Finns bäraren i båda könen i boxen väljer man partner efter vad ungen
           blev – gratis. Annars måste ungen ha ett bestämt kön: en kull till. */
        const leaf = (a.pal ? a : b).pal!;
        const derived = a.pal ? b : a;
        const free = altOfGender(leaf, opposite(leaf.g), junkOf(leaf)) !== null;
        genderEggs = free ? 0 : derived.stepEggs;
      } else {
        // Två mellansteg: jaga kön på den billigare av dem.
        genderEggs = Math.min(a.stepEggs, b.stepEggs);
      }

      const want = new Set([...na.want, ...nb.want]);
      // Union av mängderna, inte summa av antal: bär båda samma skräp-passiv ligger
      // den bara en gång i poolen.
      const pool = new Set([...want, ...na.junk, ...nb.junk]).size;
      const odds = inheritOdds(want.size, pool);
      if (odds <= 0) return null;

      /* Linjen är den sida som bär flest önskade – det är den som "fortsätter" när
         paret inte kan avla, precis som den linjära planen gjorde. */
      const line = nb.want.size > na.want.size ? nb : na;
      const kids = childrenOf(data, na.species, nb.species);
      const possible = kids.length > 0;
      const stepEggs = 1 / odds;

      return {
        leaves: a.leaves | b.leaves,
        want,
        species: kids[0]?.c ?? line.species,
        junk: new Set<string>(),
        pal: null,
        stepEggs, genderEggs,
        eggs: na.eggs + nb.eggs + stepEggs + genderEggs,
        broken: na.broken + nb.broken + (possible ? 0 : 1) + (genderOk ? 0 : 1),
        via: { a: na, b: nb, odds, pool, possible, genderOk },
      };
    };

    const n = cover.length;
    const full = (1 << n) - 1;
    const table = new Map<number, Node[]>();
    cover.forEach((p, i) => table.set(1 << i, [leafOf(p, 1 << i)]));

    for (let mask = 1; mask <= full; mask++) {
      if (table.has(mask)) continue; // löven är redan lagda
      const out: Node[] = [];
      // Dela upp i två icke-tomma delmängder. `sub < mask` alltid, så alla delar
      // är färdigräknade när masken nås.
      for (let sub = (mask - 1) & mask; sub; sub = (sub - 1) & mask) {
        const other = mask ^ sub;
        if (sub > other) continue;
        for (const x of table.get(sub) ?? []) {
          for (const y of table.get(other) ?? []) {
            const node = combine(x, y);
            if (node) out.push(node);
          }
        }
      }
      /* Bara den billigaste noden per landningsart behövs: allt ovanför beror på
         arten, inte på vägen dit. Arten sparas i stället för att slås ihop, för
         fas 2 kostar väldigt olika mycket från olika arter. */
      const bySpecies = new Map<number, Node>();
      for (const node of out.sort(rank)) {
        if (!bySpecies.has(node.species)) bySpecies.set(node.species, node);
      }
      table.set(mask, [...bySpecies.values()].slice(0, NODES_PER_MASK));
    }

    const roots = (table.get(full) ?? []).slice().sort(rank);
    if (!roots.length) return null;

    /* ---- Fas 2: artkedja till målet ----
       Kostnaden räknas *innan* roten väljs: olika träd landar i olika arter, och
       vägen därifrån till målet kan skilja mer än hela fas 1. Att välja rot på
       enbart fas 1 vore att optimera halva planen. */

    /**
     * Linjens egna passiver när fas 2 börjar. Sker minst en merge är linjen en
     * unge man kläckt tills den bär de önskade – alltså ren och med slumpat kön.
     * Räcker en enda bärare hela vägen är linjen fortfarande den ägda palen, med
     * sitt eget skräp och sitt eget kön.
     */
    const merged = n > 1;
    const linePv = merged ? new Set(usable) : new Set(start.pv);
    const lineGender: "M" | "F" | "?" | null = merged ? null : start.g;

    // Renast möjliga partner per art – varje extra passiv hos partnern hamnar i
    // poolen. Memoiserad, för sökningen nedan frågar om samma art hundratals gånger.
    const partnerCache = new Map<string, ScoredPal | null>();
    /** `first` = linjen är fortfarande startpalen, så partnern måste ha motsatt kön. */
    const partnerFor = (s: number, first: boolean): ScoredPal | null => {
      const need = first && lineGender ? opposite(lineGender) : null;
      const key = `${s}|${need ?? "*"}`;
      const hit = partnerCache.get(key);
      if (hit !== undefined) return hit;
      const list = pals
        .filter((x) => x.s === s)
        .sort((a, b) => compareParents(a, b, parentPrefs));
      // Rätt kön först; finns inget sådant tas den renaste ändå och steget flaggas.
      const p = (need ? list.find((x) => x.g === need) : undefined) ?? list[0] ?? null;
      partnerCache.set(key, p);
      return p;
    };
    /* Poolen är unionen av linjens och partnerns passiver – bär partnern en passiv
       linjen redan har växer poolen inte. */
    const stepPool = (s: number, first: boolean) => {
      const p = partnerFor(s, first);
      const pool = new Set<string>(first ? linePv : usable);
      p?.pv.forEach((id) => pool.add(id));
      return pool.size;
    };
    const stepOdds = (s: number, first: boolean) => inheritOdds(k, stepPool(s, first));
    const stepEggs = (s: number, first: boolean) => {
      const o = stepOdds(s, first);
      return o > 0 ? 1 / o : Infinity;
    };
    const chainEggs = (st: ChainStep[]) =>
      st.reduce((n2, x, i) => n2 + stepEggs(x.with, i === 0), 0);

    /** Billigaste artkedjan från en art, memoiserad – varje uppslag är en Dijkstra. */
    const chainCache = new Map<number, ChainStep[] | null>();
    const chainFrom = (from: number): ChainStep[] | null => {
      if (target === null || from === target) return [];
      const hit = chainCache.get(from);
      if (hit !== undefined) return hit;
      // Billigast i ägg, inte färst steg: ett steg med en partner som bär fyra
      // skräp-passiver kan kosta mer än en hel längre kedja med rena partners.
      const steps =
        solveChainCheapest(data, ownedSpecies, from, target, stepEggs, MAX_DEPTH) ??
        solveChain(data, ownedSpecies, from, target, MAX_DEPTH);
      chainCache.set(from, steps);
      return steps;
    };

    const cheapest = roots[0]!;
    let root = cheapest;
    let chain = chainFrom(root.species);
    const cheapestTotal = chain ? root.eggs + chainEggs(chain) : Infinity;
    let bestTotal = cheapestTotal;
    let detour: Attempt["detour"] = null;
    if (target !== null && roots.length > 1) {
      for (const cand of roots.slice(1, ROOT_CANDIDATES)) {
        if (cand.broken > root.broken) break; // roots är sorterad – trasigt blir aldrig bättre
        const c = chainFrom(cand.species);
        if (!c) continue;
        const total = cand.eggs + chainEggs(c);
        if (total < bestTotal - 1e-9) {
          bestTotal = total;
          root = cand;
          chain = c;
        }
      }
      /* Bara när omvägen faktiskt är värd en förklaring. Under ett ägg är det
         avrundningsbrus, och en ruta som förklarar noll är bara mer text. */
      if (root !== cheapest && Number.isFinite(cheapestTotal) &&
          cheapestTotal - bestTotal >= MIN_DETOUR_SAVING) {
        detour = { cheapestEggs: cheapest.eggs, saves: cheapestTotal - bestTotal };
      }
    }

    return {
      cover, root, detour, chain,
      total: chain ? bestTotal : Infinity,
      linePv, lineGender, partnerFor, stepPool, stepOdds, stepEggs,
    };
  };

  const k = usable.length;
  const attempts = covers
    .map(evaluate)
    .filter((a): a is Attempt => a !== null);
  if (!attempts.length) return plan;
  /* Vinnaren är den billigaste TOTALT. Ordningen i `covers` är tiebreak, och den
     sätter den greedy-minimala uppsättningen först: lika många ägg med färre
     bärare är färre pals att hålla reda på. En uppsättning vars artkedja inte
     gick att lösa alls hamnar sist – då kan planen inte följas hela vägen –
     men om ingen kunde det står den greedy-minimala kvar, precis som förut. */
  const grade = (a: Attempt): [number, number] => [a.chain ? 0 : 1, a.root.broken];
  /* Föräldrar som redan ÄR målarten vinner lika många ägg. Ingen oddsvinst, en
     praktisk: paret är linjen man bygger, och nästa försök kräver inte att två
     andra arter står kvar i boxen. Samma regel som `findDirectPairs` sorterar
     efter – utan den här hade uppsättningsordningen (greedy först) avgjort, och
     då kunde en omväg via två andra arter slå de två av målarten man redan har. */
  const onTarget = (a: Attempt) =>
    target === null ? 0 : a.cover.reduce((n, p) => n + (p.s === target ? 1 : 0), 0);
  const winner = attempts.reduce((best, a) => {
    const [ga, gb] = [grade(a), grade(best)];
    if (ga[0] !== gb[0]) return ga[0] < gb[0] ? a : best;
    if (ga[1] !== gb[1]) return ga[1] < gb[1] ? a : best;
    if (a.total < best.total - 1e-9) return a;
    if (a.total > best.total + 1e-9) return best;
    return onTarget(a) > onTarget(best) ? a : best;
  });
  const {
    cover: selected, root, partnerFor, stepPool, stepOdds, stepEggs, linePv, lineGender,
  } = winner;
  const chainEggs = (st: readonly ChainStep[]) =>
    st.reduce((n2, x, i) => n2 + stepEggs(x.with, i === 0), 0);
  let chain = winner.chain;
  plan.mergeDetour = winner.detour;

  // Peka ut vilken av de valda bärarna varje passiv faktiskt kommer ifrån, så
  // korten överst och stegen under aldrig kan säga emot varandra.
  for (const c of carrierInfo) {
    c.chosen = selected.find((p) => p.pv.includes(c.passiveId)) ?? c.carriers[0] ?? null;
    c.covers = c.chosen ? coverOf(c.chosen) : 0;
  }
  const start = selected[0]!;
  plan.start = start;

  /* ---- Vik ut trädet till en numrerad stegordning ----
     Post-order: föräldrarna får alltid lägre nummer än steget som använder dem,
     så listan går att läsa uppifrån och ner utan att bläddra. */
  const stepNo = new Map<Node, number>();
  const used: ScoredPal[] = [];
  const walk = (node: Node): void => {
    if (!node.via) {
      if (node.pal) used.push(node.pal);
      return;
    }
    walk(node.via.a);
    walk(node.via.b);
    const num = plan.mergeSteps.length + 1;
    stepNo.set(node, num);
    const desc = (x: Node): MergeParent => ({
      pal: x.pal,
      fromStep: x.pal ? undefined : stepNo.get(x),
      species: x.species,
      gives: [...x.want],
    });
    plan.mergeSteps.push({
      n: num,
      a: desc(node.via.a), b: desc(node.via.b),
      childSpecies: node.species,
      haveAfter: [...node.want],
      pool: node.via.pool,
      odds: node.via.odds,
      eggs: node.stepEggs + node.genderEggs,
      genderEggs: node.genderEggs,
      possible: node.via.possible,
      genderOk: node.via.genderOk,
    });
  };
  walk(root);

  /* Bärarkorten överst måste peka ut de individer trädet faktiskt använder.
     Set-covern väljer bärare enbart på passiver, så `resolvePair` kan ha bytt
     ut en av dem mot en av motsatt kön – och då pekade korten tidigare på en
     pal planen aldrig rör. */
  plan.carriersUsed = used;
  for (const c of carrierInfo) {
    const actual = used.find((p) => p.pv.includes(c.passiveId));
    if (actual) {
      c.chosen = actual;
      c.covers = coverOf(actual);
    }
  }
  plan.start = used.reduce<ScoredPal>((best, p) => (coverOf(p) > coverOf(best) ? p : best), start);
  plan.mergeEggs = root.eggs;
  plan.lineSpecies = root.species;
  let eggs = root.eggs;

  if (target !== null && root.species !== target) {
    if (!chain) {
      plan.speciesPhaseFailed = true;
    } else {
      // Vad den kortaste vägen hade kostat – bara för att kunna motivera omvägen.
      const short = solveChain(data, ownedSpecies, root.species, target, MAX_DEPTH);
      if (short && short.length < chain.length) {
        const shortEggs = chainEggs(short);
        if (shortEggs > chainEggs(chain) * 1.2) {
          /* Vilket steg på den korta vägen är det som gör den dyr? Nästan alltid
             ett enda: en partner som släpar med skräp. Kan man fånga en ren av
             just den arten blir den korta vägen plötsligt den billiga. */
          let worst: { s: number; junk: number } | null = null;
          for (const st of short) {
            const cand = partnerFor(st.with, false);
            const j = cand ? junkOf(cand) : 0;
            if (!worst || j > worst.junk) worst = { s: st.with, junk: j };
          }
          // Samma kedja, men den värsta partnern utbytt mot en ren (pool = k).
          const eggsIfClean = short.reduce((n2, st, i) => {
            if (worst && st.with === worst.s) {
              const o = inheritOdds(k, i === 0 ? new Set([...linePv, ...usable]).size : k);
              return n2 + (o > 0 ? 1 / o : Infinity);
            }
            return n2 + stepEggs(st.with, i === 0);
          }, 0);
          plan.speciesPhaseShortcut = {
            steps: short.length, eggs: shortEggs,
            blockedBy: worst && worst.junk > 0 ? worst.s : null,
            eggsIfClean,
          };
        }
      }
      /* De likvärdiga vägarna, och användarens eventuella val bland dem.
         Räknas HÄR och inte tidigare: alternativen ska utgå från den art fas 1
         faktiskt landade i, och den är inte känd förrän roten är vald. */
      const options = chainAlternatives(
        data, ownedSpecies, root.species, target, stepEggs, MAX_DEPTH,
      );
      const codesOf = (steps: readonly ChainStep[]) => steps.map((st) => data.species[st.to]!.code);
      plan.chainOptions = options.length > 1
        ? options.map((o) => ({ codes: codesOf(o.steps), eggs: o.eggs, steps: o.steps }))
        : [];
      if (pinnedChain.length) {
        const want = pinnedChain.join(" ");
        const hit = options.find((o) => codesOf(o.steps).join(" ") === want);
        /* Ingen träff = boxen har ändrats sedan valet gjordes, eller kedjan
           kommer från en annan målart. Då är rekommendationen rätt svar, och
           `chainPinned` blir false så gränssnittet inte påstår att något är
           låst som inte är det. */
        if (hit) {
          chain = hit.steps;
          plan.chainPinned = true;
        }
      }
      plan.speciesPhase = chain.map((st, i) => {
        const first = i === 0;
        const odds = stepOdds(st.with, first);
        eggs += odds > 0 ? 1 / odds : 0;
        const partner = partnerFor(st.with, first);
        const need = first && lineGender ? opposite(lineGender) : null;
        return {
          ...st, partner, odds, first,
          genderOk: !need || partner?.g === need,
          pool: stepPool(st.with, first),
          partnerJunk: partner ? junkOf(partner) : 0,
        };
      });
    }
  }
  plan.expectedEggs = eggs;
  /* Räknas sist: alternativen mäts mot planens totala äggkostnad, och den är
     inte känd förrän både fas 1 och fas 2 är lagda. Kunde inte artkedjan lösas
     alls är totalen ingen ärlig jämförelsepunkt – då hoppas de över. */
  if (!plan.speciesPhaseFailed) {
    plan.alternatives = findAltRoutes(
      data, pals, ownedSpecies, usable, target, eggs, root.species, parentPrefs,
      new Set(plan.carriersUsed.map((p) => p.id)),
    );
  }
  return plan;
}

/** Antal parningar i deltäckningen – tiebreak när två träd kostar lika mycket. */
function countSteps(node: Node): number {
  return node.via ? 1 + countSteps(node.via.a) + countSteps(node.via.b) : 0;
}
