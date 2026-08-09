import type { MessageKey } from "../i18n";
import type { ElementType, WorkType } from "./types";

/** Poängvikter per passiv-tier. */
export const TIER_WEIGHTS: Record<number, number> = {
  5: 40, 4: 25, 3: 12, 2: 6, 1: 2, 0: 0, [-1]: -8, [-2]: -12, [-3]: -16,
};

/**
 * Antal pals som krävs per kondenserings-stjärna (1★–4★).
 *
 * ⚠️ **De här siffrorna är PRE-1.0 och alltså föråldrade.** 4+16+32+64 = 116,
 * vilket var kostnaden före 1.0. Palworld 1.0 sänkte full kondensering till
 * **48 pals totalt** — men Pocketpair har inte publicerat någon fördelning per
 * stjärna, och 1.0 gjorde om arbetslämpligheten i grunden i stället för att
 * skala ner den gamla kurvan. Att halvera 4/16/32/64 vore alltså en gissning.
 *
 * Rätt siffror står i spelets egen Condenser-ruta, som visar exakt hur många
 * dubbletter nästa rang kostar i den patch man kör. Byt hit dem när du har
 * dem — allt på rekommendationssidan räknas ur den här arrayen, så det är den
 * enda rad som behöver ändras. Uppdatera testerna i `tests/condense.test.ts`
 * samtidigt: de har handräknat facit mot just de här värdena.
 */
export const STAR_COST = [4, 16, 32, 64] as const;

export const ELEMENT_META: Record<ElementType, { color: string; emoji: string }> = {
  Fire: { color: "#ff6b4a", emoji: "🔥" },
  Water: { color: "#4aa8ff", emoji: "💧" },
  Leaf: { color: "#5ad06b", emoji: "🍃" },
  Electricity: { color: "#ffd93b", emoji: "⚡" },
  Ice: { color: "#7be0f0", emoji: "❄️" },
  Earth: { color: "#c98e5a", emoji: "🪨" },
  Dark: { color: "#b06bf0", emoji: "🌙" },
  Dragon: { color: "#8f7bff", emoji: "🐉" },
  Normal: { color: "#b9c2d0", emoji: "⭐" },
};

/** Spelets engelska namn och ordning (som i Work Suitability-panelen). */
export const WORK_META: Partial<Record<WorkType, { label: string; emoji: string; color: string }>> = {
  EmitFlame: { label: "Kindling", emoji: "🔥", color: "#ff7a45" },
  Watering: { label: "Watering", emoji: "💧", color: "#4aa8ff" },
  Seeding: { label: "Planting", emoji: "🌱", color: "#5ad06b" },
  GenerateElectricity: { label: "Generating Electricity", emoji: "⚡", color: "#ffd93b" },
  Handcraft: { label: "Handiwork", emoji: "🔨", color: "#e8edf4" },
  Collection: { label: "Gathering", emoji: "🧺", color: "#5ad06b" },
  Deforest: { label: "Lumbering", emoji: "🪓", color: "#d8a05a" },
  Mining: { label: "Mining", emoji: "⛏️", color: "#c9d2dd" },
  ProductMedicine: { label: "Medicine Production", emoji: "💊", color: "#b98ef0" },
  Cool: { label: "Cooling", emoji: "❄️", color: "#7be0f0" },
  Transport: { label: "Transporting", emoji: "📦", color: "#d8b98a" },
  MonsterFarm: { label: "Farming", emoji: "🐄", color: "#e8edf4" },
};

export const WORK_TYPES = Object.keys(WORK_META) as WorkType[];

/** Filnamn i /public/icons för spelets riktiga ikoner. */
export const WORK_ICON: Partial<Record<WorkType, string>> = {
  EmitFlame: "kindling", Watering: "watering", Seeding: "planting",
  GenerateElectricity: "generating", Handcraft: "handiwork", Collection: "gathering",
  Deforest: "deforesting", Mining: "mining", ProductMedicine: "production",
  Cool: "cooling", Transport: "transporting", MonsterFarm: "farming",
};

export const ELEMENT_ICON: Record<ElementType, string> = {
  Fire: "fire", Water: "water", Leaf: "grass", Electricity: "electric",
  Ice: "ice", Earth: "ground", Dark: "dark", Dragon: "dragon", Normal: "neutral",
};

/**
 * Vad varje art lägger i **ranchen**: [speciesName, vara].
 *
 * Handkurerad, precis som `FISHING_PALS` – datasetet innehåller inga
 * ranch-varor alls, bara `MonsterFarm`-nivån, och nivån säger bara hur snabbt
 * det kommer. Utan den här tabellen kan appen inte svara på den enda fråga man
 * ställer sig framför ranchen: *vem ska jag ställa dit för att få X?*
 *
 * Varunamnen står på engelska som i spelet, av samma skäl som passiver och
 * arter gör det – man ska kunna matcha mot menyn utan att översätta.
 *
 * **Gissa aldrig hit.** En art utan rad hamnar i "vara okänd" i gränssnittet,
 * vilket är ärligt; en påhittad vara ser precis lika trovärdig ut som en riktig
 * och skickar någon till ranchen med fel pal.
 */
export const RANCH_DROPS: [string, string][] = [
  ["Chikipi", "Egg"],
  ["Mozzarina", "Milk"],
  ["Beegarde", "Honey"],
  ["Caprity", "Red Berries"],
  ["Melpaca", "Wool"],
  ["Cremis", "Wool"],
  ["Woolipop", "Cotton Candy"],
  ["Mau", "Gold Coin"],
  ["Flambelle", "Flame Organ"],
  ["Sibelyx", "High Quality Cloth"],
  ["Vixy", "Pal Sphere"],
  ["Dumud Gild", "High Quality Pal Oil"],
];

/** Fiske-hjälpar enligt Palworld 1.0-guider: [speciesName, beskrivning]. */
/* Effekten är en nyckel, inte text: `src/lib` har ingen översättare (se types.ts).
   Artnamnen är spelets egna och slås upp mot datasetet, så de står kvar. */
export const FISHING_PALS: [string, MessageKey][] = [
  ["Gloopie", "fish.gloopie"],
  ["Whalaska", "fish.whalaska"],
  ["Whalaska Ignis", "fish.whalaskaIgnis"],
  ["Solmora", "fish.solmora"],
  ["Solmora Lux", "fish.solmoraLux"],
  ["Jelliette", "fish.jelliette"],
  ["Jellroy", "fish.jellroy"],
];

export const rarityClass = (rarity: number): "leg" | "epic" | "rare" | "com" =>
  rarity >= 10 ? "leg" : rarity >= 8 ? "epic" : rarity >= 5 ? "rare" : "com";

export const rarityColor = (rarity: number): string =>
  rarity >= 10 ? "var(--r-leg)" : rarity >= 8 ? "var(--r-epic)" : rarity >= 5 ? "var(--r-rare)" : "var(--r-com)";
