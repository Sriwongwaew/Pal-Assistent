/** Par ur boxen vars unge **är målarten** – fas 1 och fas 2 i EN parning.
 *
 * Planeraren har två faser: samla ihop de önskade passiverna på en linje (fas 1),
 * byt sedan art fram till målet (fas 2). Uppdelningen är rätt i det allmänna
 * fallet, men den missar ett: när två ägda pals **tillsammans** bär alla önskade
 * passiver *och* deras unge råkar vara just målarten. Då gör en enda parning
 * bådas jobb.
 *
 * Kens fall (aug 2026), mål Helzephyr Lux:
 *
 *   Helzephyr ♀ (Legend, Musclehead, Demon God) × Beakon ♂ (Musclehead, Serenity)
 *   → Helzephyr Lux, pool 4 → `inheritOdds(4, 4)` = 10 % ≈ 10 ägg, ETT steg.
 *
 * Planeraren valde i stället en Digtoise som bar alla fyra själv och sedan två
 * artsteg dit (10 + 10 = 20 ägg). Orsaken var ordningen, inte sökningen: set
 * covern minimerar **antal bärare** och körs före både merge-trädet och
 * artkedjan, så ett par kan aldrig slå en ensam bärare – och covern kan ändå
 * inte se skillnad på "två bärare som ger en godtycklig art" och "två bärare
 * vars unge ÄR målarten".
 *
 * Uppräkningen här är den saknade byggstenen, och den delas av två ställen:
 * `passivePlan` provar paren som **kandidatuppsättningar** mot hela planens
 * äggkostnad, och `altRoutes` visar dem som förslag under planen när de inte
 * vann (t.ex. i manuellt läge, där en utpekad pal måste vara med).
 *
 * Tre avgränsningar, alla medvetna:
 *
 * 1. **Båda föräldrarna måste bidra med minst en passiv den andra saknar.**
 *    Täcker den ena redan allt är paret bara "ensam bärare + partner av en art
 *    som ger målet", och det är precis vad fas 2:s första steg redan är – det
 *    behöver inget eget spår. **Utom** när frågan är "hur avlar jag en TILL?":
 *    då är föräldern som redan bär allt hela poängen med parningen, och kravet
 *    stängs av med `allowSubset` (Kens rättning aug 2026 – han hade två färdiga
 *    Helzephyr Lux och fick en plan som parade en vanlig Helzephyr med en Beakon
 *    i stället för att sätta ihop de två han hade).
 * 2. **Paret måste täcka alla önskade.** Ett par som täcker tre av fyra kan
 *    också vara en bra grund, men då är det ett merge-träd med fler bärare och
 *    hör hemma i `passivePlan`s vanliga sökning, inte här.
 * 3. **Könen är riktiga individer, inte kläckta ungar.** Två av samma kön kan
 *    inte avla, och `?` är ett okänt kön vi inte vågar räkna med.
 */

import { compareParents, inheritOdds, pairIndex } from "./breeding";
import type { ParentPrefs } from "./breeding";
import type { AppData, ScoredPal } from "./types";

export interface DirectPair {
  /** ♂ först, ♀ sedan – samma ordning som `AltRoute`. */
  a: ScoredPal;
  b: ScoredPal;
  /** Passiv-poolen ungen lottar ur (unionen av föräldrarnas passiver). */
  pool: number;
  odds: number;
  /** Skräp som följer med in i poolen. Tom = ungen kan inte få skräp. */
  poolJunk: string[];
}

/**
 * Ger paret målarten med **just de här könen**?
 *
 * Könsstyrda unika kombos ger olika barn åt olika håll, så det räcker inte att
 * fråga vilka barn artparet kan ge. Finns könsstyrda kombos för arterna men
 * ingen som matchar de två individernas kön svarar vi nej i stället för att
 * falla tillbaka på par-tabellen: att påstå att en parning ger målarten när
 * spelets könsregel säger något annat är värre än att missa ett förslag.
 */
function givesTarget(data: AppData, a: ScoredPal, b: ScoredPal, target: number): boolean {
  const fits = (need: "Male" | "Female" | null, g: "M" | "F" | "?") =>
    need === null || (need === "Male" ? g === "M" : g === "F");
  let gendered = false;
  for (const gc of data.gendered) {
    if (gc.a === a.s && gc.b === b.s) {
      gendered = true;
      if (fits(gc.ga, a.g) && fits(gc.gb, b.g) && gc.c === target) return true;
    }
    if (gc.a === b.s && gc.b === a.s) {
      gendered = true;
      if (fits(gc.ga, b.g) && fits(gc.gb, a.g) && gc.c === target) return true;
    }
  }
  if (gendered) return false;
  return data.pair[pairIndex(data.species.length, a.s, b.s)] === target;
}

/**
 * Ägda par vars unge är `target` och som tillsammans bär alla `usable`.
 * Bäst odds först (alltså minst pool), sedan renast, sedan **föräldrar av
 * målarten**, sedan IV-målet.
 */
export function findDirectPairs(
  data: AppData,
  pals: ScoredPal[],
  target: number | null,
  usable: readonly string[],
  prefs: ParentPrefs,
  limit = 2,
  /**
   * Släpp kravet att båda föräldrarna bidrar med något den andra saknar.
   *
   * Sant bara för frågan "hur avlar jag en till?" – se punkt 1 i filhuvudet.
   * Partners som inte bär någon önskad passiv alls räknas fortfarande inte upp:
   * de ger samma pool som en likvärdig bärare (och alltså samma antal ägg), så
   * de skulle bara göra uppräkningen dyrare utan att ge ett billigare svar.
   */
  allowSubset = false,
): DirectPair[] {
  const k = usable.length;
  if (target === null || k === 0) return [];

  const want = new Set(usable);
  const junkOf = (p: ScoredPal) => p.pv.reduce((n, id) => n + (want.has(id) ? 0 : 1), 0);
  /* Täckningen som bitmask: uppräkningen nedan är |♂| × |♀| par och ska aldrig
     bygga en Set per par bara för att se att de inte täcker allt. Högst fyra
     önskade passiver finns (`MAX_WANTED`), så masken ryms i en nibble. */
  const full = (1 << k) - 1;
  const maskOf = (p: ScoredPal) =>
    usable.reduce((m, id, i) => m | (p.pv.includes(id) ? 1 << i : 0), 0);

  const males: [ScoredPal, number][] = [];
  const females: [ScoredPal, number][] = [];
  for (const p of pals) {
    if (p.g !== "M" && p.g !== "F") continue;
    const m = maskOf(p);
    if (!m) continue;
    (p.g === "M" ? males : females).push([p, m]);
  }

  const out: DirectPair[] = [];
  for (const [a, ma] of males) {
    for (const [b, mb] of females) {
      // Tillsammans allt – och (utom för "en till") något var.
      if ((ma | mb) !== full) continue;
      if (!allowSubset && (!(ma & ~mb) || !(mb & ~ma))) continue;
      if (!givesTarget(data, a, b, target)) continue;
      const union = new Set([...a.pv, ...b.pv]);
      const odds = inheritOdds(k, union.size);
      if (odds <= 0) continue;
      out.push({
        a, b,
        pool: union.size,
        odds,
        poolJunk: [...union].filter((id) => !want.has(id)),
      });
    }
  }

  /* Hur många av föräldrarna som redan ÄR målarten. Bryter lika odds och lika
     renhet, före IV-målet, och det är ingen oddsvinst utan en praktisk: paret är
     linjen man håller på att bygga, ungen kan paras direkt med båda föräldrarna,
     och nästa försök kräver inte att två andra arter står kvar i boxen. Det är
     också det svaret man förväntar sig när man har två av målarten som
     tillsammans bär allt (Kens rättning aug 2026). */
  const onTarget = (d: DirectPair) => (d.a.s === target ? 1 : 0) + (d.b.s === target ? 1 : 0);
  return out
    .sort(
      (x, y) =>
        y.odds - x.odds ||
        junkOf(x.a) + junkOf(x.b) - (junkOf(y.a) + junkOf(y.b)) ||
        onTarget(y) - onTarget(x) ||
        compareParents(x.a, y.a, prefs) ||
        compareParents(x.b, y.b, prefs),
    )
    .slice(0, limit);
}
