/** Önskad passiv-uppsättning för en pal du faktiskt tänker använda.
 *
 * Vänder på avelsplaneraren: i stället för "välj mål och passiver" utgår vi från
 * en pal som redan har en roll – anfallare, basarbetare, riddjur – och visar
 * vilka fyra passiver den borde ha i den rollen, vad den redan har, och vad som
 * saknas. Rollens passiver kommer ur samma poängsättning som `recommendPassives`,
 * så förslagen är elementanpassade och tar hänsyn till vad du har bärare av.
 */
import { isElementBoost, PURPOSES, recommendPassives, type PassiveRec, type PurposeId } from "./purpose";
import type { AppData, ScoredPal, Species, WorkType } from "./types";

/** Antal platser i en uppsättning – spelet ger en pal högst fyra passiver. */
const SLOTS = 4;

export interface LoadoutSlot extends PassiveRec {
  /** Palen bär den redan. */
  owned: boolean;
}

export interface Loadout {
  purpose: PurposeId;
  /**
   * Passiver värda en plats i rollen. Kan vara fler än de fyra spelet tillåter –
   * för en anfallare konkurrerar Lunker, Demon God, Musclehead, Legend och
   * elementboosten om samma fyra platser, och att godtyckligt kapa vid fyra
   * skulle stämpla en av dem som skräp.
   */
  slots: LoadoutSlot[];
  /** Hur många av de rekommenderade palen redan bär. */
  score: number;
  /** Bär den, är bra för rollen – men får inte plats bland de fyra. */
  alternates: { id: string; name: string; tier: number }[];
  /** Bär den, gör ingen nytta i rollen. Späder bara ut arvspoolen. */
  junk: { id: string; name: string; tier: number }[];
  /** Fler kandidater än platser – då måste man välja. */
  overSubscribed: boolean;
  /** Sant när palen redan bär allt som rekommenderas. */
  perfect: boolean;
}

/**
 * `work` styr arbetsrangpassiver (bara Farming har några) och används när rollen
 * är "Bas & arbete". För anfallare anpassas elementboostar efter artens element.
 */
export function idealLoadout(
  data: AppData,
  counts: ReadonlyMap<string, number>,
  pal: ScoredPal,
  species: Species,
  purposeId: PurposeId,
  work: WorkType | null = null,
): Loadout {
  const purpose = PURPOSES.find((p) => p.id === purposeId) ?? PURPOSES[0]!;
  // Hämta en bredare lista än vi ska visa, så det finns något att byta in nedan.
  const { picks: ranked } = recommendPassives(data, counts, {
    purpose, target: species, work, limit: SLOTS * 3,
  });
  const picks = ranked.slice(0, SLOTS);

  /* En anfallsbuild har alltid en elementplats. Rent på poäng hamnar en
     elementboost strax under Legend och trillar utanför fyran – men den är en av
     de bästa passiverna arten kan ha, så den läggs till i stället för att kapas
     bort. Att listan då blir fem lång är sanningen: det finns fler bra passiver
     än platser, och det är ett val man får göra själv. */
  if (purposeId === "attack" && !picks.some((r) => isElementBoost(r.id))) {
    const boost = ranked.find((r) => isElementBoost(r.id));
    if (boost) picks.push(boost);
  }

  const have = new Set(pal.pv);
  const slots: LoadoutSlot[] = picks.map((r) => ({ ...r, owned: have.has(r.id) }));
  const inSet = new Set(picks.map((r) => r.id));
  // Allt som poängsatts > 0 för rollen är användbart, även om det inte fick plats.
  const useful = new Set(ranked.map((r) => r.id));
  const named = (id: string) =>
    ({ id, name: data.passives[id]?.n ?? id, tier: data.passives[id]?.r ?? 0 });

  return {
    purpose: purposeId,
    slots,
    score: slots.filter((s) => s.owned).length,
    alternates: pal.pv.filter((id) => !inSet.has(id) && useful.has(id)).map(named),
    junk: pal.pv.filter((id) => !inSet.has(id) && !useful.has(id)).map(named),
    overSubscribed: picks.length > SLOTS,
    perfect: slots.length > 0 && slots.every((s) => s.owned),
  };
}

/** Palens starkaste syssla – används för att välja arbetsrangpassiver. */
export function topWork(species: Species, order: WorkType[]): WorkType | null {
  let best: WorkType | null = null;
  let lvl = 0;
  for (const t of order) {
    const v = species.ws[t] ?? 0;
    if (v > lvl) { lvl = v; best = t; }
  }
  return best;
}
