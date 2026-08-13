/* Partnerskills: spelets egen beskrivning per art – luckan som gjorde
 * rankningarna till halvsanningar (Anubis + Sekhmet slår högre grundnivåer,
 * Jetragons missiler, Eidrolons fartstack – inget av det syntes).
 *
 * `data/partnerSkills.json` genereras av tools/build-worldmap.mjs: 298 arter
 * skrapade från paldb (via MagitekZed/palworld-helper, 2026-07-26), omnycklade
 * till Species.code. Texten är Pocketpairs engelska speltext och översätts
 * aldrig – precis som passivnamnen ska den gå att känna igen i spelet.
 * Saknade rader (Dragostrophe, Boltmane, Astralym) är luckor, inte nollor. */

import raw from "./data/partnerSkills.json";

export interface PartnerSkill {
  /** Skillens namn i spelet. */
  skill: string;
  /** Spelets beskrivning, med (lo~hi)-intervall = nivå 1–5 (datamined). */
  desc: string;
  /** Grov kategorisering ur triggerfrasen: mount/party/base/active/ranch. */
  tags: string[];
}

const SKILLS = raw as Record<string, PartnerSkill>;

/** Partnerskill för en artkod, eller null när tabellen saknar arten. */
export function partnerSkill(code: string): PartnerSkill | null {
  return SKILLS[code] ?? null;
}

/* Arter som inte går att skaffa alls (slutbossar) – de får aldrig
   rekommenderas i rankningar. Astralym står i datasetet med sc 200/200/200
   och toppade attacklistan med "FÅNGA", vilket är omöjligt. */
export const UNOBTAINABLE_CODES = new Set(["worldtreedragon"]);

export function isObtainable(code: string): boolean {
  return !UNOBTAINABLE_CODES.has(code.toLowerCase());
}
