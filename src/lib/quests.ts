/* Uppdragen – tornbossar och raider med motståndslag ur boxen.
 *
 * Bossarnas element, svagheter och ungefärliga nivåer är en HANDKURERAD
 * tabell, samma disciplin som FISHING_PALS och RANCH_DROPS: datasetet har
 * inga bossar alls, och hellre en kort ärlig lista än en gissad lång.
 * Nivåerna är ungefärliga (märks ≈ i gränssnittet) – tornens HP-siffror är
 * inte publicerade och utelämnas hellre än hittas på.
 *
 * Elementmotverkan är spelets cirkel (en svaghet per element):
 * Neutral→Dark→Dragon→Ice→Fire→Water→Electric→Ground→Grass→Fire.
 */
import type { AppData, ElementType, ScoredPal } from "./types";

/** Vad varje element är SVAGT mot. */
export const WEAK_TO: Record<ElementType, ElementType> = {
  Normal: "Dark",
  Dark: "Dragon",
  Dragon: "Ice",
  Ice: "Fire",
  Fire: "Water",
  Water: "Electricity",
  Electricity: "Earth",
  Earth: "Leaf",
  Leaf: "Fire",
};

export interface QuestBoss {
  id: string;
  /** Spelets namn på paret/bossen – spelets ord, översätts aldrig. */
  name: string;
  /** tower = tornstrid, world = världsboss (Panthalus), raid = Summoning Altar. */
  kind: "tower" | "world" | "raid";
  elements: ElementType[];
  /** Rekommenderad lägsta nivå, ungefärlig. */
  level: number;
  /** Kräver Summoning Altar (raider). */
  altar?: boolean;
  /**
   * Savens flaggnyckel (utan `BOSS_BATTLE_NAME_`-prefixet). Mappningen är
   * verifierad mot en riktig 1.0-save + spelets GYM-l10n och är KONTRAINTUITIV:
   * namnen följer palens element/hemtrakt, inte tornets – GrassBoss är Zoe &
   * Grizzbolt (gräsmarkerna) och ElectricBoss är Axel & Orserk (Orserk är
   * elektrisk). Ändra aldrig tillbaka "logiskt".
   */
  flag?: string;
  /** Bossens artkod i datasetet – elementen slås upp där när koden finns,
   *  så en dataset-uppdatering rättar korten utan kodändring. */
  code?: string;
  /** Rustningskrav i arenan (värme/köld) – en REDO-dom utan rustningen ljuger. */
  gear?: "heat" | "cold";
  /** Striden vinns genom FÅNGST: att döda Panthalus stoppar questlinjen. */
  capture?: boolean;
  /** Elementlös boss (Zenara & Astralym): ingen svaghet att räkna motlag på. */
  typeless?: boolean;
}

export const QUEST_BOSSES: QuestBoss[] = [
  { id: "rayne", name: "Zoe & Grizzbolt", kind: "tower", elements: ["Electricity"], level: 15, flag: "GrassBoss", code: "ElecPanda" },
  { id: "free", name: "Lily & Lyleen", kind: "tower", elements: ["Leaf"], level: 25, flag: "ForestBoss", code: "LilyQueen" },
  { id: "eternal", name: "Axel & Orserk", kind: "tower", elements: ["Dragon", "Electricity"], level: 40, flag: "ElectricBoss", code: "ThunderDragonMan", gear: "heat" },
  { id: "pidf", name: "Marcus & Faleris", kind: "tower", elements: ["Fire"], level: 45, flag: "DesertBoss", code: "Horus", gear: "heat" },
  { id: "pal", name: "Victor & Shadowbeak", kind: "tower", elements: ["Dark"], level: 50, flag: "SnowBoss", code: "BlackGriffon", gear: "cold" },
  { id: "sakurajima", name: "Saya & Selyne", kind: "tower", elements: ["Dark", "Normal"], level: 55, flag: "SakurajimaBoss", code: "MoonQueen" },
  { id: "feybreak", name: "Bjorn & Bastigor", kind: "tower", elements: ["Ice"], level: 60, flag: "VikingBoss", code: "SnowTigerBeastman" },
  { id: "sorajima", name: "Auri & Shaolong", kind: "tower", elements: ["Dragon", "Water"], level: 62, flag: "SorajimaBoss", code: "BlueSkyDragon" },
  /* Panthalus STÅR FÖRE Världsträdet med flit: fångsten är nyckeln som
     öppnar trädet, och nextFight sorterar på nivå med STABIL ordning – båda
     är Lv 70, så arrayordningen avgör. Låg trädet först pekade sidan på
     Zenara & Astralym fast resan går via Panthalus (designrundans fynd,
     aug 2026). Flytta inte tillbaka den. */
  { id: "kingwhale", name: "Panthalus", kind: "world", elements: ["Water"], level: 70, flag: "KingWhaleBoss", code: "KingWhale", capture: true },
  /* Zenara & Astralym är ELEMENTLÖSA (communityt + speldatan är eniga:
     Astralym står utan element även i datasetet). typeless stänger av
     motlags-matematiken – "ingen svaghet" är svaret, inte ett gissat element. */
  { id: "worldtree", name: "Zenara & Astralym", kind: "tower", elements: [], level: 70, flag: "WorldTreeBoss", code: "WorldTreeDragon", typeless: true },
];

/** Världsträdets mellanbossar – egna savflaggor men inga egna kort. */
export const WORLDTREE_MID_FLAGS = [
  "WorldTreeMiddleBoss1", "WorldTreeMiddleBoss2", "WorldTreeMiddleBoss3",
] as const;

/** Bossens element ur datasetet när arten finns där, annars tabellens.
 *  Tom elementlista i datasetet räknas som "vet inte" och faller tillbaka. */
export function bossElements(data: AppData, boss: QuestBoss): ElementType[] {
  if (boss.code) {
    const code = boss.code.toLowerCase();
    const sp = data.species.find((s) => s.code.toLowerCase() === code);
    if (sp && sp.elements.length > 0) return sp.elements;
  }
  return boss.elements;
}

/** Bossens svagheter – ett motelement per bosselement, utan dubbletter. */
export function weaknessesOf(boss: QuestBoss, elements?: ElementType[]): ElementType[] {
  return [...new Set((elements ?? boss.elements).map((e) => WEAK_TO[e]))];
}

export type QuestVerdict = "ready" | "close" | "risky";

export interface QuestSquad {
  /** Motståndarna – bästa ägda med rätt element, starkast först. */
  counters: ScoredPal[];
  /** Utfyllnad: boxens starkaste oavsett element (aldrig samma individ två gånger). */
  backup: ScoredPal[];
  verdict: QuestVerdict;
}

/**
 * Laget mot en boss: pals vars art bär något av motelementen, rangordnade på
 * kampkraft, plus boxens starkaste som utfyllnad upp till fyra.
 *
 * Domen är medvetet grov (den ska mana till förberedelse, inte lova segrar):
 * REDO kräver minst två motståndare i nivå med bossen, NÄSTAN att motelementet
 * finns alls, RISK att det saknas helt.
 */
export function pickCounterSquad(
  data: AppData,
  pals: readonly ScoredPal[],
  boss: QuestBoss,
  size = 4,
): QuestSquad {
  /* Elementlös boss: det finns ingen svaghet att räkna motlag på – laget är
     boxens starkaste rakt av, och domen blir aldrig REDO (vi kan inte lova
     det utan elementmatematiken; nivå/utrustning avgör). */
  if (boss.typeless) {
    const backup = [...pals].sort((a, b) => b.combat - a.combat).slice(0, size);
    const strong = backup.filter((p) => p.lv >= boss.level).length;
    return { counters: [], backup, verdict: strong >= 2 ? "close" : "risky" };
  }
  const weak = new Set(weaknessesOf(boss, bossElements(data, boss)));
  const counters = pals
    .filter((p) => (data.species[p.s]?.elements ?? []).some((e) => weak.has(e)))
    .sort((a, b) => b.combat - a.combat)
    .slice(0, size);

  const used = new Set(counters.map((p) => p.id));
  const backup = pals
    .filter((p) => !used.has(p.id))
    .sort((a, b) => b.combat - a.combat)
    .slice(0, Math.max(0, size - counters.length));

  const strong = counters.filter((p) => p.lv >= boss.level).length;
  const verdict: QuestVerdict = strong >= 2 ? "ready" : counters.length > 0 ? "close" : "risky";

  return { counters, backup, verdict };
}

/**
 * Nästa strid: den lägsta obesegrade striden enligt saven, raider undantagna
 * (de kräver altare och material – de är ett val, inte nästa steg).
 * `null` betyder "allt är nedlagt" – och `undefined` in betyder att saven är
 * inläst utan progressionsfältet, då gissar vi inte utan tar lägsta tornet.
 */
export function nextFight(progress: { towers: string[] } | undefined, bosses = QUEST_BOSSES): QuestBoss | null {
  const fights = bosses
    .filter((b) => b.kind !== "raid" && b.flag)
    .sort((a, b) => a.level - b.level);
  if (!progress) return fights[0] ?? null;
  const done = new Set(progress.towers);
  return fights.find((b) => !done.has(b.flag!)) ?? null;
}
