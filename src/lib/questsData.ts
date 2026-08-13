/* Uppdragssidans kurerade tabeller: raider och hard mode-torn.
 *
 * HANDKURERAT (aug 2026), samma disciplin som FISHING_PALS. Nivåer/HP är
 * dataminade (paldb); mekanik/motdrag är communityn (märks som råd, inte
 * fakta). Save-nycklarna i `key` är verifierade: RaidBossDefeatCount-nycklarna
 * ÄR slab-id:na (PalSummon_<boss>), och `_2` är Ultra/Master-varianten.
 * Item- och bossnamn är spelets egna ord och översätts aldrig. */

import type { ElementType } from "./types";

export interface RaidInfo {
  /** Savens nyckel i RaidBossDefeatCount, utan Ultra-suffixet. */
  key: string;
  name: string;
  lv: number;
  ultraLv: number;
  /** Tom lista = elementlös (Moon Lord) – ingen svaghet att räkna på. */
  elements: ElementType[];
  /** Artkod när raidens pal finns i datasetet (ägget kläcker den). */
  code?: string;
  /** Summon-item + var delarna kommer ifrån, spelets ord. */
  summon: string;
  /** Fasnyckel för i18n-rådet (quest.raid.<mech>). */
  mech: "bellanoir" | "libero" | "ryu" | "xenolord" | "moonlord" | "hartalis";
  /** Utmärkande byte, spelets ord. */
  drops: string;
}

export const RAIDS: RaidInfo[] = [
  { key: "PalSummon_NightLady", name: "Bellanoir", lv: 35, ultraLv: 0, elements: ["Dark"], code: "NightLady", summon: "Bellanoir's Slab (4 fragments · dungeon chests)", mech: "bellanoir", drops: "Bellanoir egg · Ancient Civilization Parts" },
  { key: "PalSummon_NightLady_Dark", name: "Bellanoir Libero", lv: 45, ultraLv: 80, elements: ["Dark"], code: "NightLady_Dark", summon: "Libero Slab (4 fragments · Lv 45+ dungeons)", mech: "libero", drops: "Libero egg · Ultra slab" },
  { key: "PalSummon_KingBahamut_Dragon", name: "Blazamut Ryu", lv: 55, ultraLv: 80, elements: ["Fire", "Dragon"], code: "KingBahamut_Dragon", summon: "Blazamut Ryu Slab (4 fragments · Sakurajima dungeons)", mech: "ryu", drops: "Ryu egg · Ultra slab" },
  { key: "PalSummon_DarkMechaDragon", name: "Xenolord", lv: 65, ultraLv: 80, elements: ["Dark", "Dragon"], code: "DarkMechaDragon", summon: "Xenolord Slab (4 fragments · Feybreak dungeons)", mech: "xenolord", drops: "Xenolord egg · Ultra slab" },
  { key: "PalSummon_YakushimaBoss002", name: "Moon Lord", lv: 50, ultraLv: 80, elements: [], summon: "Celestial Sigil (100× Hallowed Bar · schematic: Sealed Realm of Terraria)", mech: "moonlord", drops: "Ancient Civ. Cores ×6 · Meowmere schematic — no egg, not catchable" },
  { key: "PalSummon_LegendDeer", name: "Hartalis", lv: 70, ultraLv: 80, elements: ["Leaf", "Water"], code: "LegendDeer", summon: "Hartalis Slab (4 fragments · high-level dungeons)", mech: "hartalis", drops: "Hartalis egg · Crown of Salvation (Ultra)" },
];

export interface HardTower {
  /** Bas-flaggan; hard-nedlägget läses ur towerClears["<flag>_Hard"]. */
  flag: string;
  name: string;
  lv: number;
  /** Legendarisk schematic vid första nedlägget (≈10 %), spelets ord. */
  schematic: string;
}

export const HARD_TOWERS: HardTower[] = [
  { flag: "GrassBoss", name: "Zoe & Grizzbolt", lv: 72, schematic: "Beam Scatter Schematic 4" },
  { flag: "ForestBoss", name: "Lily & Lyleen", lv: 74, schematic: "Drone Launcher Schematic 4" },
  { flag: "ElectricBoss", name: "Axel & Orserk", lv: 76, schematic: "Heat-Resistant Ancient Armor Schematic 4" },
  { flag: "DesertBoss", name: "Marcus & Faleris", lv: 78, schematic: "Heat- & Cold-Resistant Ancient Armor Schematic 4" },
  { flag: "SnowBoss", name: "Victor & Shadowbeak", lv: 80, schematic: "Cold-Resistant Ancient Armor Schematic 4" },
  { flag: "SakurajimaBoss", name: "Saya & Selyne", lv: 80, schematic: "Plasma Rifle Schematic 4" },
  { flag: "VikingBoss", name: "Bjorn & Bastigor", lv: 80, schematic: "Lightweight Ancient Armor Schematic 4" },
  { flag: "SorajimaBoss", name: "Auri & Shaolong", lv: 80, schematic: "Beam Launcher Schematic 4" },
  { flag: "WorldTreeBoss", name: "Zenara & Astralym", lv: 80, schematic: "Training Crystals" },
];
