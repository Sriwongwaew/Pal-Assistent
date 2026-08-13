/* Boxens styrkor – sex axlar, 0–100, där 100 är det bästa spelet erbjuder.
 *
 * Varje axel jämför boxens bästa mot det globala taket i datasetet, inte mot
 * en handviktad känsla: radarn ska kunna läsas som "hur nära taket är jag?"
 * och ingenting annat. Partner-skills finns inte i någon data (se Domain
 * gotchas), så det här är samma grova-men-ärliga approximation som resten av
 * rankningarna.
 *
 * - attack/försvar: bästa ägda artens scaling mot bästa artens i spelet.
 * - arbete: summan av boxens bästa nivå per bassyssla mot summan av spelets
 *   bästa nivåer. Ranchen räknas inte – varan sitter i arten, inte i nivån.
 * - riddjur: snabbaste ägda artens sprint mot spelets snabbaste.
 * - avel: uppmätt takt mot spelets tak 3,5× (se breedRate.ts).
 * - paldeck: ägda arter mot alla riktiga arter (platshållarna "Unidentified
 *   Pal" räknas bort – de går inte att äga).
 */
import { BASE_WORK_TYPES } from "./best";
import { CAP_RATE } from "./breedRate";
import type { AppData, OwnedPal } from "./types";

export interface BoxStrengths {
  attack: number;
  defense: number;
  work: number;
  mount: number;
  breed: number;
  deck: number;
}

const pct = (own: number, top: number): number =>
  top > 0 ? Math.max(0, Math.min(100, Math.round((own / top) * 100))) : 0;

export function boxStrengths(
  data: AppData,
  pals: readonly OwnedPal[],
  /** Boxens avelstakt ur planBreedSetup, jämförs mot spelets tak CAP_RATE. */
  breedRate: number,
): BoxStrengths {
  const owned = new Set(pals.map((p) => p.s));

  let topAtk = 0, ownAtk = 0;
  let topDef = 0, ownDef = 0;
  let topSpr = 0, ownSpr = 0;
  let realSpecies = 0;
  const topWs = new Map<string, number>();
  const ownWs = new Map<string, number>();

  data.species.forEach((sp, i) => {
    if (sp.name.startsWith("Unidentified")) return;
    realSpecies++;
    const def = sp.sc[0] + sp.sc[2];
    topAtk = Math.max(topAtk, sp.sc[1]);
    topDef = Math.max(topDef, def);
    topSpr = Math.max(topSpr, sp.spr);
    for (const w of BASE_WORK_TYPES) {
      const lv = sp.ws[w] ?? 0;
      if (lv > (topWs.get(w) ?? 0)) topWs.set(w, lv);
    }
    if (!owned.has(i)) return;
    ownAtk = Math.max(ownAtk, sp.sc[1]);
    ownDef = Math.max(ownDef, def);
    ownSpr = Math.max(ownSpr, sp.spr);
    for (const w of BASE_WORK_TYPES) {
      const lv = sp.ws[w] ?? 0;
      if (lv > (ownWs.get(w) ?? 0)) ownWs.set(w, lv);
    }
  });

  let topWork = 0, ownWork = 0;
  for (const w of BASE_WORK_TYPES) {
    topWork += topWs.get(w) ?? 0;
    ownWork += ownWs.get(w) ?? 0;
  }

  return {
    attack: pct(ownAtk, topAtk),
    defense: pct(ownDef, topDef),
    work: pct(ownWork, topWork),
    mount: pct(ownSpr, topSpr),
    breed: pct(breedRate, CAP_RATE),
    deck: pct(owned.size, realSpecies),
  };
}
