/* Boxens sortering – jämförarna, utan React.
 *
 * **Sorteringen är TVÅ nycklar med var sin riktning, inte en lista med färdiga
 * kombinationer.** Första försöket (aug 2026) var namngivna förval, bland dem
 * "Stjärnor ↓, level ↑". Det räckte inte, och Kens formulering säger precis
 * varför: *"jag ville kunna sortera på en pal med många stjärnor men låg level –
 * nu kan jag välja många stjärnor eller inga, alltså tvärtom."* Ett förval kan
 * bara erbjudas i sin egen riktning och sin spegling; det man vill åt är att
 * ställa nycklarna oberoende av varandra. Nio nycklar × två riktningar × en
 * andranyckel är hundratals ordningar – de går inte att lista, bara att bygga.
 *
 * Riktningen sitter därför PER NYCKEL (`SortRule.asc`) och inte på hela
 * jämförelsen. Det är hela skillnaden: "stjärnor fallande, sedan level
 * stigande" går inte att uttrycka med en global riktningsknapp, för den vänder
 * båda samtidigt.
 *
 * Sista utvägen är alltid `score` och därefter `id`. Utan den nyckeln byter
 * pals med identiska värden plats mellan omritningar – listan ser ut att blinka
 * utan att något ändrats.
 */

import type { AppData, ScoredPal } from "./types";

export type SortKey =
  /** Appens egen sammanvägning – standardordningen. */
  | "score"
  /** Summan av de tre IV:na. */
  | "iv"
  /** Den SVAGASTE av de tre – den som avgör hur långt kvar till perfekt. */
  | "ivFloor"
  | "combat"
  | "lvl"
  | "stars"
  /** Antal passiver, sedan högsta nivån bland dem. */
  | "pv"
  | "art"
  /** Ordningen pals faktiskt står i: behållare, sedan platsnummer. */
  | "slot";

export interface SortRule {
  key: SortKey;
  /** true = lägst först. Sitter per nyckel, aldrig på hela sorteringen. */
  asc: boolean;
}

/** Nycklarna i menyns ordning. */
export const SORT_KEYS: SortKey[] = [
  "score", "iv", "ivFloor", "combat", "lvl", "stars", "pv", "art", "slot",
];

/** Palens svagaste stat – den som avgör hur långt kvar den har till perfekt. */
const ivFloorOf = (p: ScoredPal): number => Math.min(...p.iv);

/** Högsta passivnivå palen bär, 0 om den är tom. */
const topTier = (p: ScoredPal): number => (p.tiers.length ? Math.max(...p.tiers) : 0);

/**
 * En nyckels jämförare i sitt NATURLIGA håll, alltså "mest först": högst level,
 * flest stjärnor, bäst IV. Bokstäver är undantaget – A–Ö är naturligt stigande,
 * och `asc` vänder det som allt annat.
 */
function keyComparator(
  key: SortKey,
  data: AppData,
  locale: string,
): (a: ScoredPal, b: ScoredPal) => number {
  switch (key) {
    case "iv": return (a, b) => b.ivSum - a.ivSum;
    /* Golvet först, sedan summan: 90/90/90 ska ligga före 100/100/40 när man
       jagar perfekt, precis som `compareParents` gör i planeraren. */
    case "ivFloor": return (a, b) => ivFloorOf(b) - ivFloorOf(a) || b.ivSum - a.ivSum;
    case "combat": return (a, b) => b.combat - a.combat;
    case "lvl": return (a, b) => b.lv - a.lv;
    case "stars": return (a, b) => b.stars - a.stars;
    /* Fyra passiver före tre, och inom samma antal den med högsta nivån –
       fyra skräppassiver är inte samma sak som fyra guld. */
    case "pv": return (a, b) => b.pv.length - a.pv.length || topTier(b) - topTier(a);
    /* Behållare för behållare, plats för plats. Namnen jämförs som text: "Bas/
       övrigt 2" ska ligga efter "Bas/övrigt 1", och Palboxen är en egen
       behållare och inte ett tal. */
    case "slot": return (a, b) => a.c.localeCompare(b.c, locale) || a.slot - b.slot;
    /* Artnamnen är spelets egna (engelska), men sorteringen ska följa läsarens
       språk – annars hamnar Ä och Ö fel för den som läser svenska. */
    case "art": return (a, b) =>
      (data.species[a.s]?.name ?? "").localeCompare(data.species[b.s]?.name ?? "", locale);
    case "score":
    default: return (a, b) => b.score - a.score;
  }
}

/**
 * Reglerna sammanvägda till EN jämförare: första nyckeln avgör, andra bryter
 * lika, och `score` + `id` bryter det som fortfarande är lika.
 *
 * En tom lista är samma sak som standardordningen – vyn ska aldrig kunna hamna
 * i ett läge utan sortering.
 */
export function boxComparator(
  rules: readonly SortRule[],
  data: AppData,
  locale: string,
): (a: ScoredPal, b: ScoredPal) => number {
  const used = rules.length ? rules : [{ key: "score" as SortKey, asc: false }];
  const cmps = used.map((r) => {
    const cmp = keyComparator(r.key, data, locale);
    return r.asc ? (a: ScoredPal, b: ScoredPal) => -cmp(a, b) : cmp;
  });
  return (a, b) => {
    for (const cmp of cmps) {
      const v = cmp(a, b);
      if (v !== 0) return v;
    }
    return b.score - a.score || a.id.localeCompare(b.id);
  };
}

/** Nästa nyckel att föreslå som andranyckel – aldrig samma som den första. */
export function otherKeys(primary: SortKey): SortKey[] {
  return SORT_KEYS.filter((k) => k !== primary);
}
