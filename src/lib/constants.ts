import type { ElementType, WorkType } from "./types";

/** Poängvikter per passiv-tier. */
export const TIER_WEIGHTS: Record<number, number> = {
  5: 40, 4: 25, 3: 12, 2: 6, 1: 2, 0: 0, [-1]: -8, [-2]: -12, [-3]: -16,
};

/** Antal pals som krävs per kondenserings-stjärna (1★–4★). */
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

/** Fiske-hjälpar enligt Palworld 1.0-guider: [speciesName, beskrivning]. */
export const FISHING_PALS: [string, string][] = [
  ["Gloopie", "Fångst-mätaren töms 12–35 % långsammare"],
  ["Whalaska", "Högre startläge + extra progress vid överlapp"],
  ["Whalaska Ignis", "Starkare Whalaska + ridbar på vatten"],
  ["Solmora", "Lättare att fiska upp pals med hög talang (IV)"],
  ["Solmora Lux", "Starkare Solmora + el-vattenmount"],
  ["Jelliette", "Föremål från fiske +55–95 %"],
  ["Jellroy", "Föremål från bärgning +55–95 %"],
];

export const rarityClass = (rarity: number): "leg" | "epic" | "rare" | "com" =>
  rarity >= 10 ? "leg" : rarity >= 8 ? "epic" : rarity >= 5 ? "rare" : "com";

export const rarityColor = (rarity: number): string =>
  rarity >= 10 ? "var(--r-leg)" : rarity >= 8 ? "var(--r-epic)" : rarity >= 5 ? "var(--r-rare)" : "var(--r-com)";
