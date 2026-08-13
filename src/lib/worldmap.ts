/* Kartans datalager: riktiga spelkoordinater på den riktiga kartbilden.
 *
 * `data/worldmap.json` genereras av tools/build-worldmap.mjs ur 1.0-daterade
 * källor (paldb.cc:s PAK-extraherade markörer, PalworldSaveTools snabbresor,
 * palworld-save-pals reliker/bossar) och bär SPELETS visade koordinater –
 * samma siffror som spelaren ser i spelets eget koordinatfält.
 *
 * Bilden är spelets egen kartrendering (public/img/worldmap.webp, 8192²),
 * vars ram i UE-enheter är X ∈ [−1 099 400, 349 400], Y ∈ [−724 400, 724 400]
 * (paldb:s `landScapeRealPosition`, empiriskt verifierad mot oljeriggarna).
 * Omräknat till spelkoordinater med x = (UE_Y − 158000)/459 blir projektionen
 * de två linjära uttrycken i `mapPct` – konstanterna är alltså härledda, inte
 * kalibrerade på ögonmått, och testas mot tornens kända koordinater.
 *
 * Hittat-status kommer ur savens egna instans-id:n (`AppData.progress`):
 * effigies/snabbresor matchas på GUID, alfabossar på spawner-id, tornen på
 * flaggnamn. Inga gissningar – ett lager utan save-koppling (läger, dungeons)
 * visar bara savens RÄKNARE och påstår aldrig vilka enskilda som är tagna. */

import type { PlayerProgress } from "./types";
import raw from "./data/worldmap.json";

export interface MapTower { x: number; y: number; name: string; flag: string }
export interface MapTravel { g: string; x: number; y: number; name: string; kind: "eagle" | "tower" | "watch" }
export interface MapRelic { g: string; x: number; y: number; t: "effigy" | "relic" }
export interface MapAlpha { x: number; y: number; sp: string; lv: number; spawner: string }
/**
 * Fiendeläger. Bär REGION och FRAKTION, inte ett namn.
 *
 * Källans `item` är markörens interna id ("Grass2", "DLC3_AreaBarrier") och dög
 * aldrig som platsnamn. `region` är dess `RewardName`-token ("Snow1",
 * "SeaBase_Snow_1") och är en **nyckel, inte en etikett**: den ska aldrig ritas.
 * Den finns för att kunna slå upp "Snow enemy camp" i `LEGENDARY_SCHEMATICS` mot
 * riktiga koordinater – förut stod källan som prosa man inte kunde göra något
 * med (Kens fynd aug 2026). Regionernas *visningsnamn* ligger i `regions`, och
 * `Snow1` ↔ `REGION_Frost_*` är INTE en säker koppling, så de joinas inte.
 */
export interface MapCamp { x: number; y: number; region: string; faction: string | null }
export interface MapDungeon { x: number; y: number; name: string; lv: number | null }
export interface MapPoint { x: number; y: number }
export interface MapOre { x: number; y: number; t: "ore" | "coal" | "sulfur" | "quartz" }
/**
 * Spelets egna regionnamn, med nivåspann där namnet bär ett.
 *
 * "Lv.60 Rayne Syndicate Platform Oil Rig" är delad i `name` + `lo`/`hi` av
 * generatorn, så nivån går att jämföra i stället för att läsas. Det är den här
 * tabellen som gör en källa begriplig: "Oil rig Lv60" är en text, platsen på
 * (−1722, −1462) med sitt namn är ett svar.
 */
export interface MapRegion {
  x: number; y: number;
  name: string;
  /** Nivåspann ur namnet. null = namnet bar ingen nivå. */
  lo: number | null;
  hi: number | null;
  /** paldb:s region-id ("REGION_Oilrig_3") – stabil nyckel för uppslag. */
  id: string;
}

/**
 * Ancient Ruin – en fast plats som ger EN bestämd schematic, garanterat.
 *
 * `gives` är spelets egna itemnamn ur markörens `comment`-fält och översätts
 * aldrig. Det här lagret fyllde hela luckan Ken hittade aug 2026 ("vi saknar
 * massor med schematics för t.ex. katis ringen"): samtliga 71 legendariska
 * tillbehör – ringarna, talismanerna, batongerna, visselpiporna, pendangerna –
 * har exakt en ruin var, med koordinat och 100 % byte enligt paldb. Det är
 * därför de kan läggas in UTAN att en enda källa gissas fram: se
 * `ruinSchematics` i findIndex.ts, som härleder raderna ur det här i stället
 * för att någon skriver hundra rader för hand.
 */
export interface MapRuin { x: number; y: number; gives: string }

export interface WorldMap {
  towers: MapTower[];
  travels: MapTravel[];
  relics: MapRelic[];
  alphas: MapAlpha[];
  camps: MapCamp[];
  dungeons: MapDungeon[];
  fruits: MapPoint[];
  ores: MapOre[];
  /** Oljeriggarnas guldkistor (3 speldygns nedkylning enligt källan). */
  oilrigs: MapPoint[];
  /** Skattkartornas fasta platser. Rariteten sitter på KARTAN man hittar,
   *  inte på platsen – därför bär de ingen. */
  treasures: MapPoint[];
  regions: MapRegion[];
  /** Ancient Ruins – 106 st, en bestämd schematic var. Se `MapRuin`. */
  ruins: MapRuin[];
}

export const WORLD_MAP = raw as WorldMap;

/** Spelkoordinater → procent på kartbilden (0–100). Härledd ur bildramen:
 *  px = (459·x + 882 400) / 1 448 800, py = (473 288 − 459·y) / 1 448 800. */
export function mapPct(x: number, y: number): { left: number; top: number } {
  return {
    left: ((459 * x + 882400) / 1448800) * 100,
    top: ((473288 - 459 * y) / 1448800) * 100,
  };
}

/** Koordinater som spelet skriver dem: heltal, "(−134, −94)". */
export function igCoord(x: number, y: number): string {
  return `(${Math.round(x)}, ${Math.round(y)})`;
}

/* Arter vars enda källa är raid-ägget från ett Summoning Altar – de kan varken
   fångas i det vilda eller avlas fram utan att redan ägas. Handkurerad som
   FISHING_PALS; koderna är verifierade mot datasetet (aug 2026). */
const RAID_EGG_CODES = new Set([
  "nightlady", // Bellanoir
  "nightlady_dark", // Bellanoir Libero
  "darkmechadragon", // Xenolord
  "kingbahamut_dragon", // Blazamut Ryu
  "legenddeer", // Hartalis
]);

export type CatchInfo =
  | { kind: "alpha"; lv: number; x: number; y: number }
  | { kind: "raid" }
  | null;

/**
 * Hur en art som varken ägs eller går att avla fram FAKTISKT skaffas.
 *
 * Anropas bara där gränssnittet redan sagt "FÅNGA" (= oavlingsbar enligt
 * partabellen): för de arterna är en fast alfaboss den garanterade källan,
 * och raid-arterna går inte att fånga alls – de kläcks ur raidens ägg.
 * Ett rakt "FÅNGA" på en legendar lovade en vild spawn som inte finns (Kens
 * fynd aug 2026). `null` = vanlig vild art såvitt vi vet, säg FÅNGA som förut.
 */
export function catchInfo(code: string): CatchInfo {
  const key = code.toLowerCase();
  if (RAID_EGG_CODES.has(key)) return { kind: "raid" };
  const spawns = WORLD_MAP.alphas.filter((a) => a.sp.toLowerCase() === key);
  if (spawns.length === 0) return null;
  const easiest = spawns.reduce((min, a) => (a.lv < min.lv ? a : min));
  return { kind: "alpha", lv: easiest.lv, x: easiest.x, y: easiest.y };
}

/** Hittat-mängder ur saven, normaliserade för uppslag. `null` = saven är
 *  inläst av en läsare utan progressionsfältet – då finns ingen status alls,
 *  vilket är något annat än "ingenting hittat". */
export interface FoundSets {
  relics: ReadonlySet<string>;
  travels: ReadonlySet<string>;
  spawners: ReadonlySet<string>;
  towers: ReadonlySet<string>;
}

export function foundSets(progress: PlayerProgress | undefined): FoundSets | null {
  if (!progress) return null;
  return {
    relics: new Set(progress.relics.map((g) => g.toUpperCase())),
    travels: new Set(progress.travels.map((g) => g.toUpperCase())),
    spawners: new Set(progress.fieldBosses),
    towers: new Set(progress.towers),
  };
}
