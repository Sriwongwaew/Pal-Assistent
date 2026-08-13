/** IV-frukter: att köpa en 100:a i stället för att avla fram den.
 *
 * Palworld 1.0 har tre konsumerbara frukter som permanent höjer en pals dolda
 * IV, en stat var: **Life Fruit** (HP), **Power Fruit** (Attack) och **Stout
 * Fruit** (Defense). Var och en ger **+10**, och taket är 100 – "gränsen" som
 * guiderna pratar om är alltså inget annat än taket: en pal på 90 tar en frukt,
 * en på 50 tar fem.
 *
 * Varför det står i den här appen: planeraren räknade en perfekt Helzephyr Lux
 * till **239 ägg**, medan Kens Lux ♀ 100/25/66 – som redan bär alla fyra önskade
 * passiver – är **12 frukter** från exakt samma resultat (utredningen aug 2026).
 * Avel är för det frukterna *inte* kan ge: passiver och art. Siffror köps.
 *
 * Tre saker att inte ändra tillbaka:
 *
 * 1. **Frukterna är inte gratis, och appen får inte påstå det.** De kostar
 *    endgame-material (Power Lotus (L) ur raider och Cherry Blossom-dungeons)
 *    eller valuta hos tre olika handlare (200 Dog Coins / 100 Battle Tickets /
 *    25 Successful Bounty Tokens per frukt), eller drop ur Moon Lord-raiden.
 *    Därför säger vi **antal frukter**, aldrig "gratis" eller "enkelt".
 * 2. **Fruktade IV ärvs som vanligt** (30/30/40). Matar man upp båda föräldrarna
 *    till 100/100/100 blir varje ägg ≈21,6 % perfekt – samma tal `perfectPlan`
 *    redan räknar för två rena 100-bärare. Frukter ersätter alltså inte
 *    avelsplanen, de skaffar dess byggstenar.
 * 3. **Namnen är spelets och står på engelska**, precis som artnamn och
 *    passivnamn: man ska kunna leta upp dem i spelets meny utan att översätta
 *    tillbaka.
 *
 * Källor: [palworld.wiki.gg – Breeding](https://palworld.wiki.gg/wiki/Breeding)
 * ("Stout Fruit, Power Fruit and/or Life Fruit can be used to boost it to
 * perfect"), [game8 – Power Fruit](https://game8.co/games/Palworld/archives/450697)
 * ("+10 Attack IV", recept och priser) och 1.0-guiden hos allthings.how
 * ("+10 IV, up to 100"). Community-dokumenterat, inte datamined – samma
 * förbehåll som resten av appens odds.
 */

import type { IvIndex } from "./ivPlan";
import type { ScoredPal } from "./types";

/** En frukt ger +10 i sin stat. */
export const FRUIT_STEP = 10;

/** Taket. En stat över det finns inte. */
export const IV_MAX = 100;

/**
 * "Nära perfekt" = **inom en frukt**, alltså 90.
 *
 * Talet är inte tummat: en frukt ger +10, så 90 är exakt den nivå där en enda
 * frukt per stat gör palen perfekt. Att avla till 90 är dessutom
 * storleksordningar billigare än till 100 – en omslumpad stat landar ≥90 i 11
 * fall av 101 mot 1 av 101 – vilket är hela poängen med läget: `perfekt` får
 * fortsätta betyda 100/100/100 avlat hela vägen, och `nära` är den väg folk
 * faktiskt tar (se utredningen aug 2026).
 */
export const NEAR_IV = IV_MAX - FRUIT_STEP;

/** Spelets egna itemnamn, i statordning (HP, Attack, Defense). */
export const FRUIT_NAMES: readonly string[] = ["Life Fruit", "Power Fruit", "Stout Fruit"];

export interface FruitNeed {
  stat: IvIndex;
  /** Antal frukter för att nå 100 i staten. Aldrig 0 – tomma utelämnas. */
  count: number;
}

/** Frukter kvar till 100 i varje stat. Tom lista = palen är redan 100/100/100. */
export function fruitsFor(pal: ScoredPal): FruitNeed[] {
  const out: FruitNeed[] = [];
  for (const stat of [0, 1, 2] as IvIndex[]) {
    const iv = pal.iv[stat] ?? 0;
    if (iv >= IV_MAX) continue;
    out.push({ stat, count: Math.ceil((IV_MAX - iv) / FRUIT_STEP) });
  }
  return out;
}

/** Hur många frukter i allt. 0 = perfekt IV. */
export function fruitTotal(pal: ScoredPal): number {
  return fruitsFor(pal).reduce((n, f) => n + f.count, 0);
}
