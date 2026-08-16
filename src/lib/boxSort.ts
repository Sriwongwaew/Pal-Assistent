/* Boxens sorteringar – jämförarna, utan React.
 *
 * De låg tidigare inline i `BoxView`. De ligger här av två skäl: de går att
 * testa (en jämförare som glider ser inte trasig ut, listan blir bara fel), och
 * **de sammansatta sorteringarna behöver en bestämd regel för riktningsknappen**.
 *
 * En sammansatt sortering är två nycklar som pekar ÅT OLIKA HÅLL – "höga
 * stjärnor, låg level" (Kens exempel aug 2026: kondenserade pals man inte hunnit
 * leva upp). Riktningsknappen vänder hela jämförelsen, alltså BÅDA nycklarna, och
 * det är rätt: speglingen av "mest stjärnor, lägst level" är "minst stjärnor,
 * högst level", vilket är precis matlistan. Att vända bara den första nyckeln
 * hade gett en ordning ingen frågat efter.
 *
 * Alla jämförare bryter lika-fall på `score` och sist på `id`. Utan den sista
 * nyckeln byter pals med identiska värden plats mellan omritningar – listan ser
 * ut att blinka utan att något ändrats.
 */

import type { AppData, ScoredPal } from "./types";

export type BoxSort =
  | "score" | "iv" | "combat" | "lvl" | "stars" | "art"
  /** Höga stjärnor först, och inom samma stjärna den lägsta nivån. */
  | "starsLow"
  /** Ordningen pals FAKTISKT står i, behållare för behållare. */
  | "slot"
  /** Flest passiver först, sedan högsta nivå bland dem. */
  | "pv"
  /** Bästa SVAGASTE stat – den som är närmast 100/100/100. */
  | "ivFloor";

/** Sorteringarnas ordning i menyn: de fyra vanliga först, de riktade sist. */
export const BOX_SORTS: BoxSort[] = [
  "score", "iv", "combat", "lvl", "stars", "art",
  "starsLow", "ivFloor", "pv", "slot",
];

/** Palens svagaste stat. Det är den som avgör hur långt kvar den har till
 *  perfekt, och därför den man vill sortera på när man jagar 100/100/100. */
const ivFloorOf = (p: ScoredPal): number => Math.min(...p.iv);

/** Högsta passivnivå palen bär, 0 om den är tom. */
const topTier = (p: ScoredPal): number => (p.tiers.length ? Math.max(...p.tiers) : 0);

export function boxComparator(
  sort: BoxSort,
  data: AppData,
  locale: string,
): (a: ScoredPal, b: ScoredPal) => number {
  /* Sista utvägen i varje jämförare: stabil ordning mellan omritningar. */
  const tie = (a: ScoredPal, b: ScoredPal) => b.score - a.score || a.id.localeCompare(b.id);

  switch (sort) {
    case "iv": return (a, b) => b.ivSum - a.ivSum || tie(a, b);
    case "combat": return (a, b) => b.combat - a.combat || tie(a, b);
    case "lvl": return (a, b) => b.lv - a.lv || tie(a, b);
    /* Lika många stjärnor bryts på poäng och inte på inläsningsordningen: fyra
       0★-pals av samma art ska ligga i samma ordning som annars. */
    case "stars": return (a, b) => b.stars - a.stars || tie(a, b);
    /* Kens fall: de kondenserade som ännu inte fått nivåer. Andra nyckeln går
       ÅT ANDRA HÅLLET, och det är hela poängen med raden. */
    case "starsLow": return (a, b) => b.stars - a.stars || a.lv - b.lv || tie(a, b);
    /* Golvet först, sedan summan: 90/90/90 ska ligga före 100/100/40 när man
       jagar perfekt, precis som `compareParents` gör i planeraren. */
    case "ivFloor": return (a, b) => ivFloorOf(b) - ivFloorOf(a) || b.ivSum - a.ivSum || tie(a, b);
    /* Fyra passiver före tre, och inom samma antal den med högsta nivån –
       fyra skräppassiver är inte samma sak som fyra guld. */
    case "pv": return (a, b) => b.pv.length - a.pv.length || topTier(b) - topTier(a) || tie(a, b);
    /* Så som de står i spelet: behållare för behållare, plats för plats. Namnen
       jämförs som text eftersom "Bas/övrigt 2" ska ligga efter "Bas/övrigt 1"
       och Palboxen är en egen behållare, inte ett tal. */
    case "slot": return (a, b) => a.c.localeCompare(b.c, locale) || a.slot - b.slot || tie(a, b);
    // Artnamnen är spelets egna (engelska), men sorteringen ska följa läsarens
    // språk – annars hamnar Ä och Ö fel för den som läser svenska.
    case "art": return (a, b) =>
      (data.species[a.s]?.name ?? "").localeCompare(data.species[b.s]?.name ?? "", locale) || tie(a, b);
    case "score":
    default: return (a, b) => b.score - a.score || a.id.localeCompare(b.id);
  }
}
