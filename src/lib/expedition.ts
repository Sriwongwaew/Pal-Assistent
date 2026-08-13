/* Expeditioner (1.0): det enda systemet som använder HELA boxen.
 *
 * Pal Expedition Station skickar upp till 100 pals ur boxen (inte partyt,
 * inte utplacerade) på 30–120 min – de förbrukas ALDRIG, de är bara upptagna.
 * Belöningen skalar med lagets Firepower mot sajtens riktvärde, upp till ett
 * hårt 10×-tak, och de flesta sajter kräver dessutom ett antal pals av ett
 * visst element (ren räkning – svaga duger).
 *
 * FP-formeln är communityuppmätt (palpedia), INTE datamined – märks ≈ i
 * gränssnittet: FP = (⌊HP/5⌋ + attack + försvar) × (1 + stjärnor)².
 * Passiver räknas inte; level/IV/souls gör det via statsen. Att en 4★ är värd
 * 25× sin ostjärnade tvilling är hela kopplingen till kondenseringssidan.
 *
 * Sajttabellen är handkurerad ur tre korslagda 1.0-källor (palpedia.com,
 * palpedia.net, game8, aug 2026). Enda sifferkonflikten: Sunreach Isle 589k
 * (två källor) mot game8:s 476k – vi använder 589k. Hard-sajterna kräver
 * hard-tornet nedlagt; upplåsningen läses ur savens towerClears. */

import { PALBOX } from "./constants";
import { displayStats } from "./scoring";
import type { AppData, ElementType, ScoredPal } from "./types";

export interface ExpeditionSite {
  name: string;
  /** Tornflaggan som låser upp ("GrassBoss"); hard-sajter kräver `_Hard`. */
  flag: string;
  hard: boolean;
  minutes: number;
  /** Rekommenderad Firepower (≈, community). */
  fp: number;
  /** Elementkrav: antal pals av elementet. null = vilka som helst. */
  need: { el: ElementType; n: number } | null;
  /** Huvudbelöningarna, spelets ord – översätts inte. */
  rewards: string;
}

export const EXPEDITION_SITES: ExpeditionSite[] = [
  { name: "Verdant Hollow", flag: "GrassBoss", hard: false, minutes: 30, fp: 25_000, need: null, rewards: "Ancient Pal Manuscript 5–7 · Small Pal Soul 3–5 · Ore" },
  { name: "Secret Realm of the Forest", flag: "ForestBoss", hard: false, minutes: 30, fp: 56_000, need: { el: "Leaf", n: 15 }, rewards: "Manuscript 7–10 · Small/Medium Soul · Bellanoir Slab Fragment 1–2" },
  { name: "Blazing Cavern", flag: "ElectricBoss", hard: false, minutes: 45, fp: 144_000, need: { el: "Fire", n: 20 }, rewards: "Manuscript 10–13 · Medium/Large Soul · Sulfur" },
  { name: "Hidden Sanctum of the Desert", flag: "DesertBoss", hard: false, minutes: 45, fp: 209_000, need: { el: "Earth", n: 20 }, rewards: "Manuscript 13–15 · Medium/Large Soul · Coal" },
  { name: "Astral Frost Cavern", flag: "SnowBoss", hard: false, minutes: 60, fp: 286_000, need: { el: "Ice", n: 20 }, rewards: "Manuscript 15–17 · Large Soul 5–7 · Pure Quartz · Ancient Civ. Core" },
  { name: "Celestial Sakura Cavern", flag: "SakurajimaBoss", hard: false, minutes: 60, fp: 375_000, need: { el: "Water", n: 20 }, rewards: "Manuscript 17–20 · Giant Soul 3–6 · Crude Oil" },
  { name: "Dark Cave of Feybreak", flag: "VikingBoss", hard: false, minutes: 60, fp: 476_000, need: { el: "Dark", n: 20 }, rewards: "Manuscript 20–22 · Giant Soul 4–8 · Chromite" },
  { name: "Sunreach Isle", flag: "SorajimaBoss", hard: false, minutes: 60, fp: 589_000, need: { el: "Dragon", n: 20 }, rewards: "Manuscript 23–25 · Giant Soul 4–8 · Soralite · Sol Sphere" },
  { name: "World Tree Subterranean City Ruins", flag: "WorldTreeBoss", hard: false, minutes: 60, fp: 851_000, need: null, rewards: "Giant Soul 8–12 · Radiant Gems (all elements) · Ancient Sphere · Paloxite" },
  { name: "Rayne Syndicate Smuggling Warehouse", flag: "GrassBoss", hard: true, minutes: 120, fp: 1_600_000, need: { el: "Normal", n: 20 }, rewards: "Manuscript 25–30 · Sol Sphere · Kinship Peach" },
  { name: "Free Pal Alliance Illicit Trading Post", flag: "ForestBoss", hard: true, minutes: 120, fp: 1_600_000, need: { el: "Leaf", n: 20 }, rewards: "Manuscript 25–30 · Kinship Peach 1–3" },
  { name: "Eternal Pyre's Forbidden Market", flag: "ElectricBoss", hard: true, minutes: 120, fp: 1_600_000, need: { el: "Fire", n: 20 }, rewards: "Manuscript 25–30 · Ancient Sphere" },
  { name: "PIDF Illegal Factory", flag: "DesertBoss", hard: true, minutes: 120, fp: 1_600_000, need: { el: "Earth", n: 20 }, rewards: "Manuscript 25–30 · High Quality Pal Oil" },
  { name: "PAL Genetic Research Laboratory", flag: "SnowBoss", hard: true, minutes: 120, fp: 1_600_000, need: { el: "Ice", n: 20 }, rewards: "Manuscript 25–30 · Diamond 6–12" },
  { name: "Moonflower's Secret Hideout", flag: "SakurajimaBoss", hard: true, minutes: 120, fp: 1_600_000, need: { el: "Water", n: 20 }, rewards: "Manuscript 25–30 · Large Soul 7–11 · Giant Soul 5–10" },
  { name: "Ancient Feybreak Ruins", flag: "VikingBoss", hard: true, minutes: 120, fp: 1_600_000, need: { el: "Dark", n: 20 }, rewards: "Manuscript 25–30 · Hexolite Quartz" },
  { name: "Sunreach Dragon Husk", flag: "SorajimaBoss", hard: true, minutes: 120, fp: 1_600_000, need: { el: "Dragon", n: 20 }, rewards: "Manuscript 25–30 · Soralite · Coralum Ore" },
  { name: "The World Tree's Forbidden Area", flag: "WorldTreeBoss", hard: true, minutes: 120, fp: 2_100_000, need: null, rewards: "Radiant Gems 2–5 · Ancient Civ. Core 6–9 · Ancient Relics" },
];

/** ≈Firepower för en pal: (⌊HP/5⌋ + attack + försvar) × (1 + stjärnor)². */
export function palFirepower(data: AppData, p: ScoredPal): number {
  const st = displayStats(data, p);
  return Math.round((Math.floor(st.hp / 5) + st.atk + st.def) * (1 + p.stars) ** 2);
}

export interface ExpeditionSquad {
  /** Total ≈FP för de 100 starkaste lediga (boxen minus party/utplacerade). */
  fp: number;
  /** Antal lediga pals som räknats. */
  size: number;
  /** Antal lediga per element – mot sajternas huvudräkningskrav. */
  byElement: ReadonlyMap<ElementType, number>;
}

/** Lediga = i Palboxen (inte party, inte utplacerade i en bas).
 *
 *  Testet är med flit `=== PALBOX` och inte "i förvaring": den globala palboxen
 *  är också förvaring, men expeditionerna hämtar sitt manskap ur världens egen
 *  Palbox. Pals i det världsöverskridande lagret går inte att skicka ut förrän
 *  man hämtat ut dem, så att räkna med dem hade blåst upp ≈FP med folk som inte
 *  kan åka. */
export function idleSquad(data: AppData, pals: readonly ScoredPal[]): ExpeditionSquad {
  const idle = pals.filter((p) => p.c === PALBOX);
  const top = [...idle]
    .map((p) => ({ p, fp: palFirepower(data, p) }))
    .sort((a, b) => b.fp - a.fp)
    .slice(0, 100);
  const byElement = new Map<ElementType, number>();
  for (const p of idle) {
    for (const el of data.species[p.s]?.elements ?? []) {
      byElement.set(el, (byElement.get(el) ?? 0) + 1);
    }
  }
  return { fp: top.reduce((a, r) => a + r.fp, 0), size: Math.min(idle.length, 100), byElement };
}
