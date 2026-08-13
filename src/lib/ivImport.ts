/** Hämta hem en saknad 100:a från en ANNAN art – i stället för att slumpa fram den.
 *
 * `perfectPlan` håller sig inom målarten, och det är rätt i grunden: att para två
 * arter byter art på ungen, så all IV-möda måste göras med exemplar av arten man
 * vill ha. Men konsekvensen var att en stat **ingen** av artens pals har 100 i
 * bara kunde komma ur 40 %-omslumpningen: `statOddsFromHas(false, false)` ≈ 0,4 %
 * per ägg, alltså ~253 ägg för en enda stat. Det är nästan alltid hela planens
 * kostnad, och det behöver det inte vara.
 *
 * En 100:a kan nämligen **bäras in** genom artkedjan. Varje steg parar linjen med
 * en ägd art och ungen ärver statens 100 med `statOddsFromHas(true, false)`
 * ≈ 30,4 % – 3,3 ägg per steg. Kens box (aug 2026), mål Helzephyr Lux: ingen Lux
 * har 100 i Attack, men elva andra pals har det, och flera ligger **två** artsteg
 * bort med noll passiver (Robinquill Terra, Skutlass). 2 × 3,3 = 6,6 ägg mot 253:
 * **38× billigare** för just den stat som gjorde planen dyr.
 *
 * Att det ser ut som en genväg men inte är en: föräldrarnas art avgör ungens art,
 * så importen är en riktig artkedja fram till målarten. Det som skiljer den från
 * `findIvDonors` är att den inte kräver att donatorns art parar **direkt** med
 * målarten – den får ta vägen om. (`findIvDonors` finns kvar: en donator som
 * parar direkt är ett steg, inte två, och den visas som tips.)
 *
 * Fyra saker modellen medvetet gör:
 *
 * 1. **Kostnaden är IV:ns, inte passivernas.** Mellanungar antas rena – man
 *    kläcker tills ungen bär det man vill ha – vilket är samma antagande som
 *    `passivePlan` och `perfectPlan` redan vilar på. Det gör importen något
 *    optimistisk om partnerarterna i kedjan är smutsiga, och därför står
 *    donatorns eget skräp i `donorJunk`: gränssnittet ska kunna säga "ta en ren
 *    partner i varje steg".
 * 2. **Partnerns 100:or räknas.** Varje steg parar linjen med en ägd pal, och bär
 *    den också statens 100 blir oddsen 60,4 % i stället för 30,4 % – hälften så
 *    många ägg. Priset räknas därför steg för steg med den bästa individen av
 *    partnerarten (`bestPartner`), inte som "steg × 3,29". Det var Kens fråga:
 *    *"varför tar vi inte inräkningen av dom 100/100/100 på andra pals som vi
 *    har?"* – 100:orna hos pals man parar MED räknades inte. Rankningen går
 *    därför på **ägg**, inte på antal steg: tre steg med bärande partners (5 ägg)
 *    slår två steg med tomma (6,6). Vad som med flit INTE görs: kedjan *söks*
 *    fortfarande på färst steg (`solveChain`), inte på ägg. Att göra den
 *    partnermedveten vore en Dijkstra per donatorart och stat-uppsättning –
 *    hundratals sökningar i en memo som körs varje gång man byter passiv – och
 *    partners som råkar bära just den statens 100 är sällsynta (i Kens box har
 *    varken Helzephyr eller Beakon en enda 100:a). Felet är alltså litet och
 *    priset för att jaga det stort. Ändra först om det visar sig fel i praktiken.
 * 3. **Ett förslag per art.** Fem exemplar av samma art är samma väg; det är
 *    arten som avgör kedjan.
 * 4. **Könet på första steget räknas.** Donatorn är en riktig individ, så
 *    partnern måste ha motsatt kön – finns ingen sådan av partnerarten i boxen
 *    flaggas vägen (`genderOk: false`) i stället för att tigas ihjäl. Resten av
 *    kedjan är kläckta ungar, alltså slumpat kön, och det kostar `perfectPlan`
 *    redan för via `genderExtra`.
 */

import { solveChain } from "./breeding";
import type { IvIndex } from "./ivPlan";
import { statOddsFromHas } from "./perfectPlan";
import type { AppData, ChainStep, ScoredPal } from "./types";

/** Så många vägar per stat som skickas vidare till sökningen. */
const PER_STAT = 3;

/**
 * Djupgräns för importkedjan. Fyra steg är ~13 ägg, alltså fortfarande en
 * tjugondel av omslumpningen – men varje steg kräver att man äger partnerarten,
 * och en led på sex steg för en enda stat är inte ett råd någon följer.
 */
const MAX_STEPS = 4;

export interface IvImportStep extends ChainStep {
  /**
   * Den ägda pal av partnerarten som steget bör paras med.
   *
   * Vilken individ det är spelar roll, och det gjorde det inte förut: bär
   * partnern **också** 100 i statens vi bär in går oddsen från 30,4 % till
   * 60,4 % – hälften så många ägg för det steget. Kens fråga *"varför tar vi
   * inte inräkningen av dom 100/100/100 på andra pals som vi har?"* var precis
   * det: 100:orna hos pals vi parar MED räknades inte.
   */
  partner: ScoredPal | null;
  /** Chansen per ägg att alla statarna följer med i just det här steget. */
  odds: number;
  /** Ägg för steget. */
  eggs: number;
}

export interface IvImport {
  /**
   * Statarna vägen bär in (0 = HP, 1 = Attack, 2 = Defense).
   *
   * Oftast en, men en donator kan bära flera 100:or och då är det **en** import
   * som ger båda: Kens `Warsect ♂ 15/100/100` bär Attack och Defense samtidigt.
   * Priset följer med – varje steg måste behålla alla statarna, alltså
   * `odds^antal` per ägg – så en 2-i-1 är dyrare per steg men sparar en hel
   * merge längre fram. Vilket som vinner avgör sökningen, inte den här filen.
   */
  stats: IvIndex[];
  /** Palen som bär 100:orna, ur en annan art. */
  donor: ScoredPal;
  /** Artstegen från donatorns art fram till målarten, med partner och pris. */
  steps: IvImportStep[];
  /** Sämsta stegets odds – det som avgör hur segt det känns. */
  worstOdds: number;
  /** Förväntat antal ägg för hela importen: summan av stegen. */
  eggs: number;
  /** Skräp-passiver donatorn bär: de hamnar i FÖRSTA stegets pool. */
  donorJunk: number;
  /** false = ingen partner av motsatt kön finns av första stegets art. */
  genderOk: boolean;
}

/** Så många vägar som mest, oavsett hur många donatorer boxen råkar innehålla. */
const MAX_ROUTES = 16;

/**
 * Billigaste sätten att bära in 100:or i `target` för statarna i `stats`.
 *
 * **`stats` är inte bara luckorna.** Första versionen tog bara stats där arten
 * helt saknade 100, och då kom Kens `Warsect ♂ 15/100/100` aldrig fram: hans enda
 * Helzephyr Lux med 100 i Defense är en 12/20/100 med tre skräp-passiver, alltså
 * en dyr förälder – *"ganska säker på att jag har perfekt defense pals i basen men
 * den kommer inte upp"*. En import kostar ägg och en ägd pal är gratis, så
 * sökningen tar bara importen när den faktiskt är billigare; att erbjuda den är
 * alltså aldrig fel, men att INTE erbjuda den var det.
 *
 * `wanted` används bara för att avgöra vad som är *skräp* hos donatorn – en
 * passiv man ändå vill ha är inget skräp.
 */
export function planIvImports(
  data: AppData,
  pals: ScoredPal[],
  ownedSpecies: ReadonlySet<number>,
  target: number,
  stats: readonly IvIndex[],
  wanted: readonly string[] = [],
  /** IV-värdet som räknas som "har": 100 för perfekt, 90 för nära. */
  ivTarget = 100,
): IvImport[] {
  if (!stats.length) return [];

  const want = new Set(wanted);
  const junkOf = (p: ScoredPal) => p.pv.reduce((n, id) => n + (want.has(id) ? 0 : 1), 0);

  // Kedjan beror bara på arten, och samma art dyker upp för många donatorer.
  const chains = new Map<number, ChainStep[] | null>();
  const chainFrom = (from: number): ChainStep[] | null => {
    const hit = chains.get(from);
    if (hit !== undefined) return hit;
    const steps = from === target ? [] : solveChain(data, ownedSpecies, from, target, MAX_STEPS);
    chains.set(from, steps);
    return steps;
  };

  const carries = (p: ScoredPal, stat: IvIndex) => (p.iv[stat] ?? 0) >= ivTarget;

  /**
   * Partnern steget bör paras med: den som bär flest av statarna vi bär in,
   * sedan den renaste, sedan bäst IV i övrigt.
   *
   * `need` är könskravet – bara första steget har ett, för där är linjen
   * fortfarande donatorn själv. Senare steg utgår från en kläckt unge, och då
   * kläcker man tills könet stämmer.
   */
  const bestPartner = (species: number, carried: IvIndex[], need: "M" | "F" | null) => {
    const list = pals.filter((p) => p.s === species && (!need || p.g === need));
    const score = (p: ScoredPal) => carried.reduce<number>((n, i) => n + (carries(p, i) ? 1 : 0), 0);
    return list
      .slice()
      .sort((a, b) => score(b) - score(a) || junkOf(a) - junkOf(b) || b.ivSum - a.ivSum)[0]
      ?? null;
  };

  /** Alla statarna måste följa med, och de ärvs oberoende av varandra. */
  const oddsWith = (partner: ScoredPal | null, carried: IvIndex[]) =>
    carried.reduce<number>(
      (acc, i) => acc * statOddsFromHas(true, !!partner && carries(partner, i), ivTarget),
      1,
    );

  /** En väg, med priset räknat steg för steg – partnerns 100:or inräknade. */
  const route = (donor: ScoredPal, carried: IvIndex[], chain: ChainStep[]): IvImport => {
    const opposite = donor.g === "M" ? "F" : donor.g === "F" ? "M" : null;
    const steps: IvImportStep[] = chain.map((st, i) => {
      const partner = bestPartner(st.with, carried, i === 0 ? opposite : null);
      const odds = oddsWith(partner, carried);
      return { ...st, partner, odds, eggs: odds > 0 ? 1 / odds : Infinity };
    });
    return {
      stats: carried, donor, steps,
      worstOdds: Math.min(...steps.map((st) => st.odds)),
      eggs: steps.reduce((n, st) => n + st.eggs, 0),
      donorJunk: junkOf(donor),
      // Första steget parar två kända individer: utan en partner av motsatt kön
      // går vägen inte att starta.
      genderOk: steps[0]?.partner != null,
    };
  };

  /* Alla kandidatvägar: per donator dels 100:orna den bär tillsammans (en import
     som ger två stats sparar en merge längre fram), dels var stat för sig (den är
     billigare per ägg). Sökningen väljer – båda ska finnas att välja på. */
  const routes: IvImport[] = [];
  for (const donor of pals) {
    if (donor.s === target) continue;
    // `carries` och inte en hårdkodad 100:a – tröskeln är hela poängen med nära-läget.
    const carried = stats.filter((i) => carries(donor, i));
    if (!carried.length) continue;
    const steps = chainFrom(donor.s);
    if (!steps?.length) continue;
    routes.push(route(donor, carried, steps));
    if (carried.length > 1) for (const i of carried) routes.push(route(donor, [i], steps));
  }

  /* Parbart först (en väg som inte går att starta är ingen väg), sedan
     BILLIGAST I ÄGG – inte färst steg. Skillnaden är partnernas 100:or: tre steg
     där varje partner också bär statens 100 (3 × 1,66 = 5 ägg) slår två steg med
     tomma partners (2 × 3,29 = 6,6). Lika pris bryts på färst steg, sedan
     renaste donator, sedan flest statar per import. */
  routes.sort(
    (a, b) =>
      Number(b.genderOk) - Number(a.genderOk) ||
      a.eggs - b.eggs ||
      a.steps.length - b.steps.length ||
      a.donorJunk - b.donorJunk ||
      b.stats.length - a.stats.length ||
      b.donor.ivSum - a.donor.ivSum,
  );

  /* Ett förslag per art OCH stat-uppsättning: fem exemplar av samma art är samma
     väg, men "Warsect med bara Attack" och "Warsect med Attack + Defense" är två
     olika erbjudanden. `PER_STAT` håller listan kort per stat, `MAX_ROUTES`
     håller den kort totalt – varje väg är ett löv i sökningen. */
  const out: IvImport[] = [];
  const seen = new Set<string>();
  const count = new Map<string, number>();
  /* Taket räknas per stat OCH per sort: en 2-i-1 kostar mer i ägg än en enskild
     stat och skulle annars trängas ut av dem – men den sparar en hel merge längre
     fram, så den måste finnas kvar att välja. Sökningen avgör, inte det här
     taket. */
  const slot = (i: IvIndex, r: IvImport) => `${i}|${r.stats.length > 1 ? "multi" : "one"}`;
  for (const r of routes) {
    const key = `${r.donor.s}|${r.stats.join(",")}`;
    if (seen.has(key)) continue;
    if (r.stats.some((i) => (count.get(slot(i, r)) ?? 0) >= PER_STAT)) continue;
    seen.add(key);
    for (const i of r.stats) count.set(slot(i, r), (count.get(slot(i, r)) ?? 0) + 1);
    out.push(r);
    if (out.length >= MAX_ROUTES) break;
  }
  return out;
}
