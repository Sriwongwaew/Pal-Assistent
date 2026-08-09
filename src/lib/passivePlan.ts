import { findAltRoutes } from "./altRoutes";
import type { AltRoute } from "./altRoutes";
import {
  childrenOf, compareParents, DEFAULT_PARENT_PREFS, inheritOdds, solveChain,
  solveChainCheapest,
} from "./breeding";
import type { ParentPrefs } from "./breeding";
import type { AppData, ChainStep, ScoredPal } from "./types";

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

export interface MergeStep {
  lineSpecies: number;
  carrier: ScoredPal;
  childSpecies: number;
  /** Önskade passiver som linjen har efter steget. */
  haveAfter: string[];
  odds: number;
  /** false = paret kan inte avla (t.ex. legendar × annan art) – steget kräver omväg. */
  possible: boolean;
  /** false = båda föräldrarna har samma kön, alltså ingen parning alls. */
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
  /** Vald startbärare (null om inga bärare alls). */
  start: ScoredPal | null;
  mergeSteps: MergeStep[];
  /** Art som linjen landar i efter fas 1. */
  lineSpecies: number | null;
  speciesPhase: SpeciesPhaseStep[] | null;
  speciesPhaseFailed: boolean;
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

/**
 * Bygger en komplett plan: greedy set cover av bärare → merge-ordning med odds,
 * sedan artbyteskedja till target (om satt) med renaste partner per steg.
 */
export function buildPassivePlan(
  data: AppData,
  pals: ScoredPal[],
  ownedSpecies: ReadonlySet<number>,
  wanted: string[],
  target: number | null,
  prefs: ParentPrefs = DEFAULT_PARENT_PREFS,
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
    start: null, mergeSteps: [], lineSpecies: null,
    speciesPhase: null, speciesPhaseFailed: false, speciesPhaseShortcut: null,
    expectedEggs: 0, alternatives: [],
  };
  if (!usable.length) return plan;

  // Greedy set cover: färst bärare som täcker alla önskade.
  const remaining = new Set(usable);
  const selected: ScoredPal[] = [];
  const candidates = pals.filter((p) => p.pv.some((id) => remaining.has(id)));
  while (remaining.size) {
    let best: ScoredPal | null = null;
    let bestCover = 0;
    for (const p of candidates) {
      if (selected.includes(p)) continue;
      const cover = p.pv.filter((id) => remaining.has(id)).length;
      // Täcker flest önskade först; vid lika täckning den renaste (minst skräp),
      // och därefter den som är bäst förälder enligt IV-målet.
      if (
        cover > bestCover ||
        (cover === bestCover && cover > 0 && best &&
          (junkOf(p) < junkOf(best) ||
            (junkOf(p) === junkOf(best) && compareParents(p, best, parentPrefs) < 0)))
      ) {
        best = p;
        bestCover = cover;
      }
    }
    if (!best) break;
    selected.push(best);
    best.pv.forEach((id) => remaining.delete(id));
  }
  selected.sort(
    (a, b) =>
      b.pv.filter((id) => wantedSet.has(id)).length -
      a.pv.filter((id) => wantedSet.has(id)).length,
  );

  // Peka ut vilken av de valda bärarna varje passiv faktiskt kommer ifrån, så
  // korten överst och stegen under aldrig kan säga emot varandra.
  for (const c of carrierInfo) {
    c.chosen = selected.find((p) => p.pv.includes(c.passiveId)) ?? c.carriers[0] ?? null;
    c.covers = c.chosen ? coverOf(c.chosen) : 0;
  }

  const start = selected[0] ?? null;
  plan.start = start;
  if (!start) return plan;

  let lineSpecies = start.s;
  let have = new Set(start.pv.filter((id) => wantedSet.has(id)));
  /**
   * Linjens *faktiska* passiver, skräpet inräknat. Startpalen är en riktig pal ur
   * boxen och bär det den bär – räknar vi bara de önskade blir första stegets odds
   * för höga. Efter ett steg är linjen däremot en unge man kläcker tills den har de
   * önskade, så då antas den ren (samma antagande som resten av planen vilar på).
   */
  let linePv = new Set(start.pv);
  let eggs = 0;
  /**
   * Könet på linjens individ. Startpalen är en riktig pal ur boxen, så den
   * FÖRSTA parningen sker mellan två kända individer och måste vara ♂+♀ – annars
   * blir det ingen parning alls. Efter första kläckningen är linjen en unge vars
   * kön är slumpat, och då duger vilken partner som helst: man kläcker helt
   * enkelt tills man får det kön som behövs. Därför nollas det efter ett steg.
   */
  let lineGender: "M" | "F" | "?" | null = start.g;
  const opposite = (g: "M" | "F" | "?") => (g === "M" ? "F" : g === "F" ? "M" : null);

  /**
   * En likvärdig individ av motsatt kön. Set-covern väljer bärare enbart på
   * passiver, så den kan råka plocka två honor – och två honor kan inte avla.
   * Bär någon annan i boxen samma önskade passiver men har rätt kön är den ett
   * fullgott byte, och renast vinner bland dem.
   */
  const sameCoverAlt = (p: ScoredPal, need: "M" | "F" | null): ScoredPal | null => {
    if (!need) return null;
    const gives = p.pv.filter((id) => wantedSet.has(id));
    return pals
      .filter((x) => x.g === need && x.id !== p.id && gives.every((id) => x.pv.includes(id)))
      .sort((a, b) => junkOf(a) - junkOf(b) || compareParents(a, b, parentPrefs))[0] ?? null;
  };

  // Para ihop bärarna i en ordning där varje steg faktiskt kan avla, om möjligt.
  const rest = selected.slice(1);
  while (rest.length) {
    const canBreed = (c: ScoredPal) => childrenOf(data, lineSpecies, c.s).length > 0;
    const needG = lineGender ? opposite(lineGender) : null;
    // Först en som både kan avla OCH har rätt kön; annars vilken som kan avla.
    let idx = rest.findIndex((c) => canBreed(c) && (!needG || c.g === needG));
    if (idx < 0) idx = rest.findIndex(canBreed);
    if (idx < 0) idx = 0; // ingen giltig partner kvar – ta första och flagga steget
    let carrier = rest.splice(idx, 1)[0]!;
    /* Fel kön kvar? Byt individ, inte plan: först bäraren mot en likvärdig av
       motsatt kön, annars startpalen. Först när ingetdera går flaggas steget. */
    if (needG && carrier.g !== needG) {
      const altCarrier = sameCoverAlt(carrier, needG);
      if (altCarrier) {
        carrier = altCarrier;
      } else if (plan.mergeSteps.length === 0 && lineGender) {
        const altStart = sameCoverAlt(start, opposite(carrier.g));
        if (altStart) {
          plan.start = altStart;
          have = new Set(altStart.pv.filter((id) => wantedSet.has(id)));
          linePv = new Set(altStart.pv);
          lineSpecies = altStart.s;
          lineGender = altStart.g;
        }
      }
    }
    const genderOk = !lineGender || carrier.g === opposite(lineGender);
    // Union av mängderna, inte summa av antal: bär båda samma skräp-passiv ligger
    // den bara en gång i poolen.
    const union = new Set([...linePv, ...carrier.pv]).size;
    const haveAfter = new Set([...have, ...carrier.pv.filter((id) => wantedSet.has(id))]);
    const odds = inheritOdds(haveAfter.size, union);
    eggs += odds > 0 ? 1 / odds : 0;
    const child = childrenOf(data, lineSpecies, carrier.s);
    const possible = child.length > 0;
    const childSpecies = child[0]?.c ?? lineSpecies;
    plan.mergeSteps.push({
      lineSpecies, carrier, childSpecies, haveAfter: [...haveAfter], odds, possible, genderOk,
    });
    lineSpecies = childSpecies;
    have = haveAfter;
    linePv = new Set(haveAfter);
    lineGender = null; // ungens kön är slumpat – kläck tills det stämmer
  }
  plan.lineSpecies = lineSpecies;

  if (target !== null && lineSpecies !== target) {
    const k = usable.length;
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
       linjen redan har växer poolen inte. Första steget utgår från `linePv`, som
       kan innehålla startpalens eget skräp; därefter är linjen en ren unge. */
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
      st.reduce((n, x, i) => n + stepEggs(x.with, i === 0), 0);

    // Billigast i ägg, inte färst steg: ett steg med en partner som bär fyra
    // skräp-passiver kan kosta mer än en hel längre kedja med rena partners.
    const steps =
      solveChainCheapest(data, ownedSpecies, lineSpecies, target, stepEggs, 10) ??
      solveChain(data, ownedSpecies, lineSpecies, target, 10);
    if (!steps) {
      plan.speciesPhaseFailed = true;
    } else {
      // Vad den kortaste vägen hade kostat – bara för att kunna motivera omvägen.
      const short = solveChain(data, ownedSpecies, lineSpecies, target, 10);
      if (short && short.length < steps.length) {
        const shortEggs = chainEggs(short);
        if (shortEggs > chainEggs(steps) * 1.2) {
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
          const eggsIfClean = short.reduce((n, st, i) => {
            if (worst && st.with === worst.s) {
              const o = inheritOdds(k, i === 0 ? new Set([...linePv, ...usable]).size : k);
              return n + (o > 0 ? 1 / o : Infinity);
            }
            return n + stepEggs(st.with, i === 0);
          }, 0);
          plan.speciesPhaseShortcut = {
            steps: short.length, eggs: shortEggs,
            blockedBy: worst && worst.junk > 0 ? worst.s : null,
            eggsIfClean,
          };
        }
      }
      plan.speciesPhase = steps.map((st, i) => {
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
      data, pals, ownedSpecies, usable, target, eggs, lineSpecies, parentPrefs,
    );
  }
  return plan;
}
