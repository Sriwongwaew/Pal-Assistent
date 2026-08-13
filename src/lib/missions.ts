/* Questkatalogen: id → engelskt namn + typ (Main/Sub).
 *
 * `data/missions.json` genereras av tools/build-worldmap.mjs ur uppströms
 * missions.json + engelska l10n:en (palworld-save-pal). Namnen är spelets
 * egna och översätts aldrig – de ska gå att känna igen i spelets logg.
 *
 * Savens quest-id:n kan vara nyare än katalogen (spelet patchas). Ett okänt
 * id visas som sitt id – fult men sant, och det syns direkt att katalogen
 * behöver regenereras. Aldrig en gissning. */

import type { PlayerProgress } from "./types";
import raw from "./data/missions.json";

export interface MissionInfo {
  n: string;
  t: "Main" | "Sub";
}

const MISSIONS = raw as Record<string, MissionInfo>;

export interface QuestRow {
  id: string;
  name: string;
  main: boolean;
  /** false = id:t saknas i katalogen (nyare spel än katalogen). */
  known: boolean;
}

/** Aktiva uppdrag i visningsordning: Main först, sedan Sub, okända sist. */
export function activeQuests(progress: PlayerProgress): QuestRow[] {
  return progress.quests.active
    .map((id): QuestRow => {
      const info = MISSIONS[id];
      return info
        ? { id, name: info.n, main: info.t === "Main", known: true }
        : { id, name: id, main: id.startsWith("Main_"), known: false };
    })
    .sort((a, b) => Number(b.main) - Number(a.main) || a.name.localeCompare(b.name, "en"));
}

/** Avklarade huvuduppdrag av katalogens alla – journey-mätaren. */
export function mainQuestTally(progress: PlayerProgress): { done: number; total: number } {
  const mains = Object.entries(MISSIONS).filter(([, m]) => m.t === "Main");
  const completed = new Set(progress.quests.completed);
  return {
    done: mains.filter(([id]) => completed.has(id)).length,
    total: mains.length,
  };
}
