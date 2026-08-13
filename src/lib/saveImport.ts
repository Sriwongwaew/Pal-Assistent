/** Översätter rådata från tools/palsave.py till appens `OwnedPal`-format.
 *
 * Ren logik utan I/O – API-routen läser filerna, den här filen mappar bara.
 */

import type { AppData, Gender, OwnedPal, PlayerProgress, Species } from "./types";

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
  /**
   * Passiv-id → antal implantat du äger, summerat över alla item-behållare.
   *
   * Valfritt med flit: en bundle inläst före det här fältet fanns saknar det, och
   * en gammal `palsave.exe` i en installerad kopia skickar det inte. Behandla
   * `undefined` som "vi vet inte", inte som "du äger inga" – annars påstår appen
   * något om spelarens förråd som den inte har läst.
   */
  implants?: Record<string, number>;
  /** Spelarens progression – samma undefined-disciplin som `implants`. */
  progress?: PlayerProgress;
  /**
   * Utfallet för den globala palboxen (`<spelare>_dps.sav`).
   *
   * Pals därifrån ligger redan i `pals` med behållaren `GLOBAL_BOX`; det här
   * fältet är bara för att kunna säga *varför* de saknas när de gör det. En
   * global box som inte gick att läsa ser annars exakt ut som en tom, och
   * skillnaden är avelsstammen man lagt undan. `undefined` = en äldre
   * palsave.exe som inte känner till lagret alls.
   */
  globalBox?: { found: boolean; pals: number; error?: string };
  /** Pal Souls-plånboken – samma undefined-disciplin. */
  souls?: { s: number; m: number; l: number; g: number };
  path?: string;
  modified?: number;
}

/**
 * En hittad värld från `palsave.py scan`.
 *
 * `world` och `account` är mappnamn, alltså GUID:er ("0D0E75DA…", "76561198…").
 * De duger som nycklar men går inte att läsa. Fälten under kommer ur världens
 * `LevelMeta.sav` och är **valfria med flit**: en lös kopierad `Level.sav` och
 * vissa server-upplägg saknar den filen, och då ska världen fortfarande gå att
 * välja – bara med GUID:et som namn.
 */
export interface SaveCandidate {
  path: string;
  world: string;
  account: string;
  size: number;
  modified: number;
  players: number;
  /** Världens namn i spelet, t.ex. "Phuket Island". */
  worldName?: string;
  /** Värdens spelarnamn – det som skiljer två konton på samma dator åt. */
  host?: string;
  hostLevel?: number;
  /** Dag i spelet, säger mer om hur långt världen kommit än filstorleken. */
  day?: number;
}

/** Det man faktiskt läser i listan: namnet om det finns, annars GUID:et. */
export function saveLabel(save: SaveCandidate): string {
  return save.worldName?.trim() || save.world;
}

/**
 * Går de här världarna att skilja åt på sitt synliga namn?
 *
 * Två världar kan heta likadant (spelet hindrar det inte, och en kopierad save
 * har per definition samma namn som originalet). Då måste gränssnittet visa
 * något mer – annars ser man två identiska rader och kan inte veta vilken man
 * väljer.
 */
export function hasAmbiguousLabels(saves: SaveCandidate[]): boolean {
  const seen = new Set<string>();
  for (const s of saves) {
    const key = `${saveLabel(s)}\u0000${s.host ?? ""}`.toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
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
  read: {
    player: string;
    pals: OwnedPal[];
    modified: number;
    implants?: Record<string, number>;
    progress?: PlayerProgress;
    souls?: { s: number; m: number; l: number; g: number };
  },
): AppData {
  return {
    ...base,
    pals: read.pals,
    player: read.player || base.player,
    /* Ersätts, aldrig sammanslås eller behållet från `base`. Två skäl:
       har du använt ett implantat sedan förra inläsningen ska det försvinna (ett
       `?? base.implants` hade gjort förrådet monotont växande), och skickar en
       äldre palsave.exe inget fält alls ska resultatet bli `undefined` = "vi vet
       inte" – inte den förra läsningens siffror och inte `{}`, som hade påstått
       att förrådet är tomt. JSON.stringify släpper nyckeln, precis som vi vill. */
    implants: read.implants,
    // Samma regel som implants: ersätt eller släpp, ärv aldrig från base.
    progress: read.progress,
    souls: read.souls,
    exported: new Date(read.modified * 1000).toISOString().slice(0, 10),
  };
}
