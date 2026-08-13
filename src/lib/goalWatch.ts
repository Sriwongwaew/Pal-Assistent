/** "Du har fått den!" – målbevakningen som live-läget gör meningsfull.
 *
 * Appen läser om saven så fort spelet sparat (live-läget i `savePrefs.ts`), och
 * då vet den något spelaren inte vet: att ägget som just kläcktes ÄR den pal
 * planeraren siktar på. Utan den här filen står svaret nere i planen och väntar
 * på att någon ska rulla dit.
 *
 * Två slags svar, och skillnaden mellan dem är hela poängen:
 *
 * 1. **Träff** – rätt art, alla önskade passiver, och IV-målet uppfyllt.
 *    Planen är klar.
 * 2. **Nästan** – rätt art och alla önskade passiver, men IV:na är inte 100.
 *    Då räknas skillnaden i **frukter** (`ivFruits.ts`), för det är så en pal
 *    faktiskt görs perfekt i 1.0: *"denna pal är nästan perfekt – du behöver bara
 *    två frukter"* är ett besked man kan handla på. Ett "62 % av målet" är det
 *    inte.
 *
 * **Bara NYA pals rapporteras**, och det är ett medvetet val: "du har fått" är
 * ett påstående om något som just hänt. Därför sparas de instans-id:n vi redan
 * sett (`SeenState`), och första gången appen körs **seedas** listan tyst – annars
 * hade en färsk installation öppnat med "du har fått 678 pals". Byter man
 * målbild kan en gammal pal plötsligt matcha; den ska inte heller annonseras som
 * ny, och gör det inte, eftersom nyheten avgörs på id och inte på matchningen.
 *
 * Id:t är savens **instans-GUID**, samma nyckel kartan prickar av effigies på –
 * stabilt mellan inläsningar och unikt per individ (verifierat: 702 unika av 702
 * i Kens box). Ett bortmatat exemplar ligger kvar i listan, vilket är harmlöst.
 */

import { fruitsFor, fruitTotal, type FruitNeed } from "./ivFruits";
import { ivTargetOf } from "./ivPlan";
import type { IvGoal } from "./breeding";
import type { ScoredPal } from "./types";

/** Nyckeln i localStorage – samma `pa-`-prefix som de andra valen. */
export const SEEN_KEY = "pa-seen";

/**
 * Tak för hur många id:n vi sparar. En box på 10 000 pals finns inte, men en
 * localStorage-post som växer utan gräns är ändå en läcka: 4 000 GUID:n är
 * ~36 kB, och över det slutar vi bara komma ihåg de äldsta (som ändå inte kan
 * vara nya).
 */
export const MAX_SEEN = 4000;

export interface SeenState {
  /**
   * Har vi någonsin sett en box? Falskt = första körningen, och då annonseras
   * ingenting alls – bara listan fylls.
   */
  seeded: boolean;
  ids: string[];
  /** Träffar användaren har klickat bort. Stannar bortklickade. */
  dismissed: string[];
}

export const emptySeen = (): SeenState => ({ seeded: false, ids: [], dismissed: [] });

/**
 * Läser tillståndet ur localStorage-strängen.
 *
 * Allt valideras, och skräp ger tomt läge i stället för ett fel – samma
 * disciplin som `breedingPrefs`: det som ligger i localStorage kan vara skrivet
 * av en annan version, av en annan värld, eller för hand.
 */
export function parseSeen(raw: string | null): SeenState {
  if (!raw) return emptySeen();
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return emptySeen();
  }
  if (!obj || typeof obj !== "object") return emptySeen();
  const o = obj as Record<string, unknown>;
  const ids = Array.isArray(o.ids)
    ? o.ids.filter((x): x is string => typeof x === "string").slice(-MAX_SEEN)
    : [];
  const dismissed = Array.isArray(o.dismissed)
    ? o.dismissed.filter((x): x is string => typeof x === "string").slice(-MAX_SEEN)
    : [];
  return { seeded: o.seeded === true, ids, dismissed };
}

export function serializeSeen(state: SeenState): string {
  return JSON.stringify({
    seeded: state.seeded,
    ids: state.ids.slice(-MAX_SEEN),
    dismissed: state.dismissed.slice(-MAX_SEEN),
  });
}

/** Tillståndet efter en inläsning: alla nuvarande pals är sedda. */
export function markSeen(state: SeenState, pals: readonly ScoredPal[]): SeenState {
  const ids = new Set(state.ids);
  for (const p of pals) ids.add(p.id);
  return { seeded: true, ids: [...ids].slice(-MAX_SEEN), dismissed: state.dismissed };
}

export interface GoalHit {
  pal: ScoredPal;
  /** Frukter kvar till 100/100/100. Tom = redan perfekt. */
  fruits: FruitNeed[];
  fruitTotal: number;
  /** Uppfyller palen målbilden som den är satt – inklusive IV-målet? */
  done: boolean;
}

export interface GoalWatch {
  /** Nya pals som matchar målbilden, bäst först. */
  hits: GoalHit[];
  /** Sant om listan är kapad – gränssnittet säger "+N fler". */
  more: number;
}

/** Så många kort visas som mest; resten blir "+N fler". */
export const MAX_CARDS = 2;

/**
 * Nya pals som är målbilden – eller så nära att bara frukter skiljer.
 *
 * `newIds` är det som gör svaret till en nyhet; är den tom finns inget att säga.
 * Ordningen är färdiga först, sedan färst frukter, sedan bäst IV – alltså den
 * pal man faktiskt ska titta på överst.
 */
export function watchGoal(
  pals: readonly ScoredPal[],
  newIds: ReadonlySet<string>,
  target: number | null,
  wanted: readonly string[],
  ivGoal: IvGoal,
  dismissed: ReadonlySet<string> = new Set(),
): GoalWatch {
  if (target === null || !newIds.size) return { hits: [], more: 0 };

  const hits: GoalHit[] = [];
  for (const pal of pals) {
    if (pal.s !== target || !newIds.has(pal.id) || dismissed.has(pal.id)) continue;
    // Passiverna är förkravet: dem kan ingen frukt ge.
    if (!wanted.every((id) => pal.pv.includes(id))) continue;
    const fruits = fruitsFor(pal);
    const total = fruitTotal(pal);
    hits.push({
      pal, fruits, fruitTotal: total,
      /* Målbilden är uppnådd när varje stat når IV-målets tröskel: 100 för
         perfekt, 90 för nära – och i "snabbt" läge är tröskeln 0, alltså är
         passiverna hela målbilden. */
      done: pal.iv.every((v) => v >= ivTargetOf(ivGoal)),
    });
  }
  hits.sort(
    (a, b) =>
      Number(b.done) - Number(a.done) ||
      a.fruitTotal - b.fruitTotal ||
      b.pal.ivSum - a.pal.ivSum,
  );
  return { hits: hits.slice(0, MAX_CARDS), more: Math.max(0, hits.length - MAX_CARDS) };
}
