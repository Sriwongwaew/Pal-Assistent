/* Lägesbandet: savens progression mot kartans/katalogens totaler.
 * Delas av Uppdrag och Översikten (Kens önskan: siffrorna hör hemma på
 * översikten också) – EN beräkning, så sidorna aldrig säger olika. */

import { QUEST_BOSSES, WORLDTREE_MID_FLAGS } from "./quests";
import { mainQuestTally } from "./missions";
import { WORLD_MAP } from "./worldmap";
import type { AppData, PlayerProgress } from "./types";

export interface ProgressSummary {
  towers: { done: number; total: number };
  mids: number;
  effigies: { done: number; total: number };
  /** Oanvända effigies i väskan (`RelicPossessNum`) – det mest handlingsbara
   *  talet på uppdragssidan: "7 oanvända — offra vid en Statue of Power". */
  relicHeld: number;
  travels: { done: number; total: number };
  camps: { done: number; total: number };
  /** Nedlagda alfabossar mot kartans spawners – 5 Ancient Tech-poäng styck. */
  alphas: { done: number; total: number };
  raids: number;
  mains: { done: number; total: number };
  deck: { done: number; total: number } | null;
}

export function progressSummary(data: AppData): ProgressSummary | null {
  const progress: PlayerProgress | undefined = data.progress;
  if (!progress) return null;
  const relics = new Set(progress.relics);
  const travels = new Set(progress.travels);
  const spawners = new Set(progress.fieldBosses);
  const effigies = WORLD_MAP.relics.filter((r) => r.t === "effigy");

  let deck: ProgressSummary["deck"] = null;
  if (progress.deck) {
    const seen = new Set(progress.deck.map((c) => c.toLowerCase()));
    const catalog = data.species.filter((sp) => sp.deck > 0);
    deck = {
      done: catalog.filter((sp) => seen.has(sp.code.toLowerCase())).length,
      total: catalog.length,
    };
  }

  return {
    /* Mot kända bossflaggor, inte råa listan: `progress.towers` bär även
       Världsträdets mellanbossflaggor, och de ska inte övertälja striderna. */
    towers: {
      done: QUEST_BOSSES.filter((b) => b.flag && progress.towers.includes(b.flag)).length,
      total: QUEST_BOSSES.filter((b) => b.flag).length,
    },
    mids: WORLDTREE_MID_FLAGS.filter((f) => progress.towers.includes(f)).length,
    effigies: { done: effigies.filter((r) => relics.has(r.g)).length, total: effigies.length },
    relicHeld: progress.relicHeld,
    travels: {
      done: WORLD_MAP.travels.filter((p) => travels.has(p.g)).length,
      total: WORLD_MAP.travels.length,
    },
    camps: { done: progress.counts.camps, total: WORLD_MAP.camps.length },
    alphas: {
      done: WORLD_MAP.alphas.filter((a) => spawners.has(a.spawner)).length,
      total: WORLD_MAP.alphas.length,
    },
    raids: Object.values(progress.raids).reduce((a, b) => a + b, 0),
    mains: mainQuestTally(progress),
    deck,
  };
}
