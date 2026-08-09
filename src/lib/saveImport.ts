/** Översätter rådata från tools/palsave.py till appens `OwnedPal`-format.
 *
 * Ren logik utan I/O – API-routen läser filerna, den här filen mappar bara.
 */

import type { AppData, Gender, OwnedPal, Species } from "./types";

/** En pal precis som palsave.py levererar den (art som kod, inte index). */
export interface RawSavePal {
  id: string;
  code: string;
  g: string;
  lv: number;
  iv: [number, number, number];
  pv: string[];
  rk: number;
  souls: [number, number, number, number];
  c: string;
  slot: number;
  nick: string;
  boss: boolean;
  lucky: boolean;
  fd: number | null;
  sn: number;
  xp: number;
}

/** Svaret från `palsave.py read`. */
export interface RawSaveRead {
  ok: boolean;
  error?: string;
  player?: string;
  pals?: RawSavePal[];
  containers?: string[];
  path?: string;
  modified?: number;
}

/** En hittad värld från `palsave.py scan`. */
export interface SaveCandidate {
  path: string;
  world: string;
  account: string;
  size: number;
  modified: number;
  players: number;
}

export interface MapResult {
  pals: OwnedPal[];
  /** Arter i saven som inte finns i species-listan (NPC:er, nya pals) → antal. */
  skipped: Record<string, number>;
}

/** Bygger artkod → index. Saven blandar skiftlägen (LazyCatFish/LazyCatfish). */
function speciesIndex(species: Species[]): Map<string, number> {
  const byCode = new Map<string, number>();
  species.forEach((s, i) => byCode.set(s.code.toLowerCase(), i));
  return byCode;
}

function gender(raw: string): Gender {
  return raw === "M" || raw === "F" ? raw : "?";
}

/**
 * Mappar savens pals till appens format och sorterar dem stabilt.
 *
 * Allt som inte går att slå upp i species-listan hoppas över – i praktiken
 * människor (Hunter_Rifle, Believer_CrossBow) som ligger i samma tabell som pals.
 */
export function mapSavePals(species: Species[], raw: RawSavePal[]): MapResult {
  const byCode = speciesIndex(species);
  const pals: OwnedPal[] = [];
  const skipped: Record<string, number> = {};

  for (const p of raw) {
    const s = byCode.get(p.code.toLowerCase());
    if (s === undefined) {
      skipped[p.code] = (skipped[p.code] ?? 0) + 1;
      continue;
    }
    pals.push({
      id: p.id,
      s,
      g: gender(p.g),
      lv: p.lv,
      iv: p.iv,
      pv: p.pv,
      rk: p.rk,
      souls: p.souls,
      c: p.c,
      slot: p.slot,
      nick: p.nick,
      boss: p.boss,
      lucky: p.lucky,
      xp: p.xp,
      fd: p.fd,
      sn: p.sn,
    });
  }

  // Samma ordning varje inläsning: container, sedan slot.
  pals.sort((a, b) => (a.c === b.c ? a.slot - b.slot : a.c.localeCompare(b.c, "sv")));
  return { pals, skipped };
}

/**
 * Sätter in savens pals i den befintliga bundlen.
 *
 * All statisk metadata (arter, breeding-tabell, passiver, exp-kurva) kommer från
 * `palworld-save-pal` och finns inte i saven – därför behålls den orörd.
 */
export function mergeIntoAppData(
  base: AppData,
  read: { player: string; pals: OwnedPal[]; modified: number },
): AppData {
  return {
    ...base,
    pals: read.pals,
    player: read.player || base.player,
    exported: new Date(read.modified * 1000).toISOString().slice(0, 10),
  };
}
