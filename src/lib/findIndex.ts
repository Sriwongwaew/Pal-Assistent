/* Hitta-sidans uppslagslager: allt appen redan VET, gjort sökbart.
 *
 * Bakgrunden (auditen aug 2026): Hitta kunde svara på arter, element, pal-drops,
 * passiver, schematics, ranchvaror och fiske – men repot bar mycket mer data som
 * inte gick att fråga efter. Kartan hade 157 namngivna snabbresor, 170 dungeons
 * med nivå, 58 läger, 83 malmnoder och 31 fruktträd; partnerskills fanns för 298
 * arter och användes bara av Rollerna; expeditionernas belöningar, raidernas
 * byte, IV-frukterna och själsschemat gick inte att söka alls. Följden var att
 * frågor med ett svar i repot ändå inte hade ett svar i appen: *"var bryter jag
 * svavel?"*, *"var får jag Life Fruit?"*, *"vad gör den här palen som partner?"*
 *
 * Filen är rena uppslag, ingen React och ingen text: allt som ska läsas av en
 * människa returneras som **spelets egna ord** (varunamn, sajtnamn, valutor) och
 * allt som ska formuleras returneras som en **`kind`-diskriminant** som
 * komponenten översätter. Samma disciplin som resten av `src/lib` (se types.ts).
 *
 * Tre saker som är valda, inte råkade så:
 *
 * 1. **Varan är EN fråga, inte fem.** "Var får jag X?" hade annars blivit en
 *    kategori per källa (drops, ranch, brytning, expedition, handlare, raid) och
 *    samma varunamn i sex chips med sex olika räknare. `itemIndex` slår därför
 *    ihop alla källor till en post per vara – det är också varför ranchvarorna
 *    inte längre är en egen kategori: de är en KÄLLA till en vara.
 * 2. **Platser grupperas på namn, aldrig per prick.** 83 malmnoder och 31
 *    fruktträd är samma svar 114 gånger; det man vill veta är *hur många och
 *    var närmast*. Grupperna bär sina koordinater, och snabbresornas GUID:n
 *    följer med så savens hittat-status kan räknas per grupp.
 * 3. **Ingen källa hittas på.** En vara utan belagd källa får inga rader – det
 *    är ärligt. Handlarpriserna nedan är de enda som är dokumenterade
 *    (`ivFruits.ts`), och handlarnas sortiment i övrigt saknas fortfarande med
 *    flit.
 */

import { RANCH_DROPS, type RanchDrop } from "./constants";
import { pairIndex } from "./breeding";
import { EXPEDITION_SITES, type ExpeditionSite } from "./expedition";
import { MATERIAL_DROPS, type DropPal, type Schematic, type SchemSpot } from "./findData";
import { FRUIT_NAMES, FRUIT_STEP, IV_MAX } from "./ivFruits";
import { partnerSkill } from "./partnerSkills";
import { RAIDS, type RaidInfo } from "./questsData";
import { WORLD_MAP, type MapOre, type MapRegion } from "./worldmap";
import type { AppData } from "./types";

/* ============================================================
   Varor – "var får jag X?"
   ============================================================ */

/** Malmnodernas typ → varan spelet ger, i spelets ord. */
export const ORE_ITEM: Record<MapOre["t"], string> = {
  ore: "Ore",
  coal: "Coal",
  sulfur: "Sulfur",
  quartz: "Pure Quartz",
};

/**
 * Handlarpriser vi kan belägga. Bara IV-frukterna står här, och det är hela
 * poängen: `ivFruits.ts` dokumenterar dem med källa, medan handlarnas sortiment
 * i övrigt är den lucka `find.dataNote` erkänner. Valutorna är spelets ord.
 */
const FRUIT_PRICES: readonly string[] = [
  "200 Dog Coins",
  "100 Battle Tickets",
  "25 Successful Bounty Tokens",
];

/** Var IV-frukternas material kommer ifrån, spelets ord. */
const FRUIT_MATERIAL = "Power Lotus (L) — raids · Cherry Blossom dungeons";

/**
 * Vad en vara är TILL för, när det inte är självklart av namnet.
 *
 * `soul` = Statue of Power-schemat (souls.ts), `fruit` = +10 IV med tak 100
 * (ivFruits.ts). Komponenten formulerar; siffrorna kommer härifrån så de inte
 * kan glida isär från logiken som räknar med dem.
 */
export type ItemUse =
  | { kind: "soul" }
  | { kind: "fruit"; stat: 0 | 1 | 2; step: number; cap: number };

const SOUL_ITEMS = new Set([
  "Small Pal Soul", "Medium Pal Soul", "Large Pal Soul", "Giant Pal Soul",
]);

function itemUse(item: string): ItemUse | null {
  if (SOUL_ITEMS.has(item)) return { kind: "soul" };
  const fruit = FRUIT_NAMES.indexOf(item);
  if (fruit >= 0) return { kind: "fruit", stat: fruit as 0 | 1 | 2, step: FRUIT_STEP, cap: IV_MAX };
  return null;
}

export interface ItemEntry {
  /** Varans namn, spelets ord. */
  item: string;
  /** Pals som släpper den vid nedlägg. Tom = ingen pal släpper den. */
  drops: DropPal[];
  /** Ranch-producenter. */
  ranch: RanchDrop[];
  /** Bryts på kartan: malmtyp + antal kända noder. */
  mine: { t: MapOre["t"]; nodes: number } | null;
  /** Expeditionssajter vars belöningslista nämner varan. */
  exped: string[];
  /** Raider vars byte nämner varan. */
  raids: string[];
  /** Belagda priser hos handlare (bara IV-frukterna, se `FRUIT_PRICES`). */
  prices: readonly string[];
  /** Materialkälla i klartext, spelets ord (IV-frukternas Power Lotus). */
  material: string | null;
  /** Vad varan är till för, när det inte syns på namnet. */
  use: ItemUse | null;
}

/**
 * Alla varor appen kan säga något om, med samtliga kända källor slagna ihop.
 *
 * Ordningen är: flest källor först (den varan har vi mest att säga om), sedan
 * alfabetiskt – katalogläget ska inte se ut som en slumpad lista.
 */
export function itemIndex(): ItemEntry[] {
  const by = new Map<string, ItemEntry>();
  const at = (item: string): ItemEntry => {
    const found = by.get(item);
    if (found) return found;
    const fresh: ItemEntry = {
      item, drops: [], ranch: [], mine: null, exped: [], raids: [],
      prices: [], material: null, use: itemUse(item),
    };
    by.set(item, fresh);
    return fresh;
  };

  for (const d of MATERIAL_DROPS) at(d.item).drops = d.pals;
  for (const row of RANCH_DROPS) at(row.item).ranch.push(row);

  /* Malmen: en post per typ med antalet kända noder – 83 prickar är samma
     svar 83 gånger, och det man vill veta är att varan BRYTS och hur vanlig
     den är. Koordinaterna finns i platsindexet nedan. */
  const nodes = new Map<MapOre["t"], number>();
  for (const o of WORLD_MAP.ores) nodes.set(o.t, (nodes.get(o.t) ?? 0) + 1);
  for (const [t, n] of nodes) at(ORE_ITEM[t]).mine = { t, nodes: n };

  /* Expeditioner och raider: belöningslistorna är spelets ord i en enda
     sträng, så matchningen är en delsträngstest mot varunamnen vi känner.
     Det ger aldrig en falsk vara – bara möjligen en vara för lite, vilket är
     rätt håll att fela på. */
  const known = [...by.keys()];
  for (const site of EXPEDITION_SITES) {
    for (const item of known) if (site.rewards.includes(item)) at(item).exped.push(site.name);
  }
  for (const raid of RAIDS) {
    for (const item of known) if (raid.drops.includes(item)) at(item).raids.push(raid.name);
  }

  /* IV-frukterna finns i ingen droptabell – de köps. Utan de här raderna är
     "var får jag Life Fruit?" obesvarad, fast ivFruits.ts vet svaret. */
  for (const name of FRUIT_NAMES) {
    const e = at(name);
    e.prices = FRUIT_PRICES;
    e.material = FRUIT_MATERIAL;
    e.raids = [...new Set([...e.raids, "Moon Lord"])];
  }

  const weight = (e: ItemEntry) =>
    (e.drops.length > 0 ? 1 : 0) + (e.ranch.length > 0 ? 1 : 0) + (e.mine ? 1 : 0)
    + (e.exped.length > 0 ? 1 : 0) + (e.raids.length > 0 ? 1 : 0) + (e.prices.length > 0 ? 1 : 0);

  return [...by.values()].sort((a, b) => weight(b) - weight(a) || a.item.localeCompare(b.item, "en"));
}

/** Har varan någon källa alls? En post utan källor är en lucka, inte ett svar. */
export const hasSource = (e: ItemEntry): boolean =>
  e.drops.length > 0 || e.ranch.length > 0 || e.mine !== null
  || e.exped.length > 0 || e.raids.length > 0 || e.prices.length > 0;

/** Sök bland varor: varunamn, art som släpper, ranch-art eller sajt/raid. */
export function itemsMatching(all: readonly ItemEntry[], q: string): ItemEntry[] {
  const needle = q.toLowerCase();
  return all.filter((e) =>
    e.item.toLowerCase().includes(needle)
    || e.drops.some((p) => p.n.toLowerCase().includes(needle))
    || e.ranch.some((r) => r.sp.toLowerCase().includes(needle))
    || e.exped.some((s) => s.toLowerCase().includes(needle))
    || e.raids.some((s) => s.toLowerCase().includes(needle)));
}

/* ============================================================
   Platser – kartan, sökbar
   ============================================================ */

export type PlaceKind = "tower" | "travel" | "dungeon" | "camp" | "ore" | "fruit";

export interface Place {
  kind: PlaceKind;
  /** Gruppens namn: platsens egna, eller varan för malm. */
  name: string;
  /** Alla kända koordinater i gruppen, närmast origo först. */
  spots: { x: number; y: number }[];
  /** Nivåspann för dungeons där källan har nivå. */
  lv: { min: number; max: number } | null;
  /** Snabbresornas instans-GUID:n – savens hittat-status per grupp. */
  guids: string[];
  /** Tornets flagga, för savens nedlagt-status. */
  flag: string | null;
  /** Malmtypen, när gruppen är en malmsort. */
  ore: MapOre["t"] | null;
}

/**
 * Kartans lager som sökbara grupper.
 *
 * Grupperas på (typ, namn): dungeon- och lägernamn återkommer på flera ställen,
 * och en grupp per prick hade gjort brickremsan till 400 nästan identiska rutor.
 * Malm och fruktträd har inga namn i källan alls – de får varans namn respektive
 * en egen typ, och räknaren är hela svaret ("83 noder").
 *
 * Alfabossarna är med flit INTE med: de hör till arten, och artheron visar redan
 * var de står plus om saven bockat av dem.
 */
/** Lagrets enda belagda namn – se kommentaren vid lägren i `placeIndex`. */
const CAMP_NAME = "Enemy Camp";

/** Har markören ett namn att visa? Källan har både tomma och "???". */
const isNamed = (name: string): boolean => name.trim() !== "" && name !== "???";

/**
 * Vad platsindexet INTE kan visa, i antal.
 *
 * Redovisas i gränssnittet under träffarna. Ett tyst bortfall ser ut som att
 * kartan är fullständigt täckt, och då letar man efter en dungeon som finns på
 * kartan men inte i sökningen och tror att appen är trasig.
 */
export function placeGaps(): { dungeonsUnnamed: number; campsCollapsed: number } {
  return {
    dungeonsUnnamed: WORLD_MAP.dungeons.filter((d) => !isNamed(d.name)).length,
    campsCollapsed: WORLD_MAP.camps.length,
  };
}

export function placeIndex(): Place[] {
  const by = new Map<string, Place>();
  const at = (kind: PlaceKind, name: string): Place => {
    const key = `${kind}|${name}`;
    const found = by.get(key);
    if (found) return found;
    const fresh: Place = { kind, name, spots: [], lv: null, guids: [], flag: null, ore: null };
    by.set(key, fresh);
    return fresh;
  };

  for (const t of WORLD_MAP.towers) {
    const p = at("tower", t.name);
    p.spots.push({ x: t.x, y: t.y });
    p.flag = t.flag;
  }
  for (const t of WORLD_MAP.travels) {
    const p = at("travel", t.name);
    p.spots.push({ x: t.x, y: t.y });
    p.guids.push(t.g);
  }
  for (const d of WORLD_MAP.dungeons) {
    // Namnlösa markörer utelämnas i stället för att bli en grupp som heter
    // ingenting. Antalet redovisas av `placeGaps` – tyst bortfall är värre.
    if (!isNamed(d.name)) continue;
    const p = at("dungeon", d.name);
    p.spots.push({ x: d.x, y: d.y });
    if (d.lv !== null) {
      p.lv = p.lv ? { min: Math.min(p.lv.min, d.lv), max: Math.max(p.lv.max, d.lv) } : { min: d.lv, max: d.lv };
    }
  }
  /* Lägren blir EN grupp, och det är ett medvetet informationsbortfall.
     Källans `name` är markörens interna id kapat vid första understrecket
     (`build-worldmap.mjs`), alltså "Grass2", "Forest1", "DLC3" – region- och
     nivåkoder, inte namn spelet visar. Några av dem läser som fraktioner
     ("Hunter", "Ninja"), men att presentera en intern kod som ett platsnamn är
     samma sorts gissning som en påhittad ranch-vara. Kartan kallar hela lagret
     "Enemy Camp"; det är det enda vi kan belägga. */
  for (const c of WORLD_MAP.camps) at("camp", CAMP_NAME).spots.push({ x: c.x, y: c.y });
  for (const o of WORLD_MAP.ores) {
    const p = at("ore", ORE_ITEM[o.t]);
    p.spots.push({ x: o.x, y: o.y });
    p.ore = o.t;
  }
  /* Fruktträden har inget namn i källan – "Fruit Tree" är paldb:s term och
     står kvar oöversatt, som alla spelord. */
  for (const f of WORLD_MAP.fruits) at("fruit", "Fruit Tree").spots.push({ x: f.x, y: f.y });

  const order: Record<PlaceKind, number> = { tower: 0, travel: 1, dungeon: 2, camp: 3, ore: 4, fruit: 5 };
  for (const p of by.values()) {
    p.spots.sort((a, b) => (a.x ** 2 + a.y ** 2) - (b.x ** 2 + b.y ** 2));
  }
  return [...by.values()].sort((a, b) =>
    order[a.kind] - order[b.kind]
    || b.spots.length - a.spots.length
    || a.name.localeCompare(b.name, "en"));
}

/** Sök bland platser: namnet, malmsorten eller typordet ("dungeon", "tower"). */
export function placesMatching(all: readonly Place[], q: string): Place[] {
  const needle = q.toLowerCase();
  return all.filter((p) =>
    p.name.toLowerCase().includes(needle)
    || p.kind.includes(needle)
    || (p.ore !== null && p.ore.includes(needle)));
}

/* ============================================================
   Schematics: från prosa till plats
   ============================================================ */

export interface SchemWhere {
  /** Koordinater att gå till, närmast origo först. */
  spots: { x: number; y: number }[];
  /** Spelets egna regionnamn som platsen ligger i, med nivåspann där det finns.
   *  Tom lista = vi har koordinater men inget belagt namn. */
  regions: { name: string; lo: number | null; hi: number | null }[];
  /** Hela antalet, även när `spots` kapats. */
  total: number;
}

/** Hur många koordinater en källa som mest räknar upp. Fler är inte ett svar. */
const SPOT_CAP = 8;

/**
 * Slår upp en schematics `spot` mot kartdatat.
 *
 * Poängen: "Snow enemy camp" var en text man inte kunde göra något med (Kens
 * fynd aug 2026). Här blir den tre koordinater i Astral Mountains. `null` =
 * källan går inte att peka ut (arenan, handlarna, "coastal bases"), och då ska
 * gränssnittet säga just det i stället för att gissa fram en plats.
 */
export function schemWhere(spot: SchemSpot | undefined): SchemWhere | null {
  if (!spot) return null;
  const byDist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x ** 2 + a.y ** 2) - (b.x ** 2 + b.y ** 2);
  const take = (all: { x: number; y: number }[], regions: SchemWhere["regions"]): SchemWhere => ({
    spots: [...all].sort(byDist).slice(0, SPOT_CAP).map((p) => ({ x: p.x, y: p.y })),
    regions,
    total: all.length,
  });

  switch (spot.at) {
    case "camp": {
      const want = new Set(spot.regions);
      const camps = WORLD_MAP.camps.filter((c) => want.has(c.region));
      /* Regionnamnet hämtas GEOMETRISKT – närmast namngiven region per läger –
         eftersom lägrens `region` är en token ("Snow1") och paldb:s region-id
         ("REGION_Frost_1") inte går att joina med den. Namnet är alltså
         "området lägret ligger i", inte en påstådd tillhörighet, och det är
         därför bara de närmaste som räknas: en region 400 enheter bort säger
         ingenting om var man ska leta. */
      const named = new Map<string, SchemWhere["regions"][number]>();
      for (const c of camps) {
        const hit = nearestRegion(c.x, c.y, 200);
        if (hit) named.set(hit.name, { name: hit.name, lo: hit.lo, hi: hit.hi });
      }
      return take(camps, [...named.values()]);
    }
    case "oilrig": {
      /* Riggarna är namngivna regioner med nivån i namnet, så nivån matchas mot
         `lo` i stället för att läsas ur texten. Kistorna själva är egna
         markörer – de som ligger inom riggens område är de man ska öppna. */
      const rigs = WORLD_MAP.regions.filter((r) => /oil rig|drilling rig/i.test(r.name) && r.lo === spot.lv);
      const chests = WORLD_MAP.oilrigs.filter((c) =>
        rigs.some((r) => Math.hypot(r.x - c.x, r.y - c.y) <= 300));
      return take(
        chests.length > 0 ? chests : rigs,
        rigs.map((r) => ({ name: r.name, lo: r.lo, hi: r.hi })),
      );
    }
    case "map":
      return take(WORLD_MAP.treasures, []);
    case "ruin": {
      const hits = WORLD_MAP.ruins.filter((r) => r.gives === spot.gives);
      return take(hits, []);
    }
    case "tower": {
      /* Tornen står still och har både koordinat och namn – att skicka någon
         till Uppdrag för att leta upp adressen var en omväg. Namnet är paldb:s
         (fraktionen + paret), nivån står redan på schematics-raden. */
      const hits = WORLD_MAP.towers.filter((t) => t.flag === spot.flag);
      return take(hits, hits.map((t) => ({ name: t.name, lo: null, hi: null })));
    }
    case "region": {
      const hits = WORLD_MAP.regions.filter((r) => r.id === spot.id);
      return take(hits, hits.map((r) => ({ name: r.name, lo: r.lo, hi: r.hi })));
    }
    case "dungeon": {
      const hits = WORLD_MAP.dungeons.filter((d) => d.name === spot.name);
      const lv = hits.find((d) => d.lv !== null)?.lv ?? null;
      return take(hits, hits.length > 0 ? [{ name: spot.name, lo: lv, hi: lv }] : []);
    }
  }
}

/**
 * Schematics som ruinerna ger – HÄRLEDDA ur kartdatat, inte kurerade.
 *
 * Bakgrunden (Kens fynd aug 2026): "vi saknar massor med schematics för t.ex.
 * katis ringen". Det var sant och gapet var 71 rader – alla legendariska
 * tillbehör: ringarna, talismanerna, batongerna, visselpiporna, pendangerna.
 * De var osynliga för den förra granskningen av ett trivialt skäl: deras
 * blueprint heter "Katress Ring Schematic" UTAN sifferändelse, och granskningen
 * sökte på "Schematic 4".
 *
 * Att de kan läggas in utan att en enda källa gissas fram beror på att varje
 * Ancient Ruin-markör bär namnet på den schematic den ger, med koordinat och
 * 100 % byte. Alltså genereras raderna här i stället för att någon skriver
 * hundra rader för hand: en ny patch som flyttar en ruin flyttar raden med.
 * Stickprovet som gjorde metoden trovärdig: Katress Ring hamnar på
 * (−1729,9, −989,7), vilket är exakt den koordinat paldb:s egen sida för
 * schematicen anger – två oberoende läsningar av samma källa.
 *
 * `rate` är 100 % och ingen uppskattning: platsen ger den varje gång, och det
 * som kostar är resan dit och det som vaktar den.
 */
export function ruinSchematics(): Schematic[] {
  return WORLD_MAP.ruins
    // Ruinerna ger också Applied Technique-böcker; de är inte schematics.
    .filter((r) => / Schematic( \d+)?$/.test(r.gives))
    .map((r): Schematic => ({
      name: r.gives,
      source: RUIN_SOURCE,
      kind: "ruin",
      rate: "100 %",
      coord: [r.x, r.y],
      spot: { at: "ruin", gives: r.gives },
      // Dataminad markör med koordinat – starkare än de korslagda guiderna.
      sure: true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

/** Ruinens namn i spelet. Står som `source` på de härledda raderna. */
export const RUIN_SOURCE = "Ancient Ruin";

/** Närmaste namngivna region inom `maxDist` spelenheter, annars null. */
function nearestRegion(x: number, y: number, maxDist: number): MapRegion | null {
  let best: MapRegion | null = null;
  let bestD = Infinity;
  for (const r of WORLD_MAP.regions) {
    const d = Math.hypot(r.x - x, r.y - y);
    if (d < bestD) { bestD = d; best = r; }
  }
  return best !== null && bestD <= maxDist ? best : null;
}

/* ============================================================
   Partnerskills – 298 arter som bara Rollerna kunde läsa
   ============================================================ */

export interface SkillRow {
  /** Artindex i `data.species`. */
  s: number;
  code: string;
  species: string;
  skill: string;
  desc: string;
  tags: string[];
}

/** Alla arter med partnerskill, i artordning. Luckor utelämnas – en art utan
 *  rad i tabellen är en lucka i skrapet, inte en pal utan partnerskill. */
export function skillIndex(data: AppData): SkillRow[] {
  const out: SkillRow[] = [];
  data.species.forEach((sp, s) => {
    if (sp.name.startsWith("Unidentified")) return;
    const ps = partnerSkill(sp.code);
    if (ps) out.push({ s, code: sp.code, species: sp.name, skill: ps.skill, desc: ps.desc, tags: ps.tags });
  });
  return out;
}

/** Sök bland partnerskills: skillnamnet, beskrivningen, arten eller en tagg. */
export function skillsMatching(all: readonly SkillRow[], q: string): SkillRow[] {
  const needle = q.toLowerCase();
  return all.filter((r) =>
    r.skill.toLowerCase().includes(needle)
    || r.desc.toLowerCase().includes(needle)
    || r.species.toLowerCase().includes(needle)
    || r.tags.some((t) => t.includes(needle)));
}

/* ============================================================
   Expeditioner och raider
   ============================================================ */

/**
 * Sök bland expeditionssajter: namnet, elementkravet eller **belöningarna**.
 *
 * Belöningsträffen är hela skälet att sajterna är sökbara: flera varor har
 * expeditionerna som sin enda källa (Ancient Pal Manuscript, Kinship Peach, Sol
 * Sphere, Radiant Gems, Paloxite …) och de finns i ingen droptabell. Vi bygger
 * med flit INGA varuposter ur den här texten – den är prosa med mängder
 * ("Manuscript 25–30", "Radiant Gems (all elements)"), och att skära ut
 * varunamn ur den hade gett påhittade varor som "Manuscript". Frågan får sitt
 * svar via sajten i stället.
 */
export function expedMatching(q: string): ExpeditionSite[] {
  const needle = q.toLowerCase();
  return EXPEDITION_SITES.filter((s) =>
    s.name.toLowerCase().includes(needle)
    || s.rewards.toLowerCase().includes(needle)
    || (s.need?.el.toLowerCase().includes(needle) ?? false));
}

/** Sök bland raider: bossnamnet, summon-itemet, bytet eller elementet. */
export function raidsMatching(q: string): RaidInfo[] {
  const needle = q.toLowerCase();
  return RAIDS.filter((r) =>
    r.name.toLowerCase().includes(needle)
    || r.summon.toLowerCase().includes(needle)
    || r.drops.toLowerCase().includes(needle)
    || r.elements.some((e) => e.toLowerCase().includes(needle)));
}

/* ============================================================
   Avelskombon – "vad blir A × B?" och "vilka blir X?"
   ============================================================ */

export interface ComboQuery {
  /** Artindex för de två föräldrarna. */
  a: number;
  b: number;
}

/**
 * Tolkar en fråga som "Anubis x Lamball" / "anubis + lamball" till ett par.
 *
 * Kategorin visas bara när frågan FAKTISKT är ett par – ett chip som alltid
 * står där med noll träffar är den sortens klutter Rollerna redan straffades
 * för. Delarna matchas som artnamnets början, så halva namn duger.
 */
export function parseCombo(data: AppData, q: string): ComboQuery | null {
  const parts = q.split(/\s+(?:x|×|\+|och|and)\s+/i);
  if (parts.length !== 2) return null;
  const find = (needle: string): number | null => {
    const n = needle.trim().toLowerCase();
    if (n.length < 2) return null;
    let best: number | null = null;
    data.species.forEach((sp, i) => {
      if (sp.name.startsWith("Unidentified")) return;
      const name = sp.name.toLowerCase();
      if (name === n) best = i;
      else if (best === null && name.startsWith(n)) best = i;
    });
    return best;
  };
  const a = find(parts[0] ?? "");
  const b = find(parts[1] ?? "");
  return a !== null && b !== null ? { a, b } : null;
}

export interface ParentPair {
  a: number;
  b: number;
  /** true = båda föräldrarna finns i boxen. */
  owned: boolean;
}

/**
 * Föräldrapar som ger arten `target`.
 *
 * Sveper hela partabellen (≈46 000 par för 304 arter – millisekunder), och
 * sorterar de par man redan äger först: "vilka blir Anubis?" är i praktiken
 * "vilka av MINA blir Anubis?". Taket finns för att en vanlig art kan ha
 * hundratals par, och en lista på hundra rader svarar inte på något.
 */
export function parentPairsOf(
  data: AppData,
  target: number,
  ownedSpecies: ReadonlySet<number>,
  cap = 24,
): { pairs: ParentPair[]; total: number } {
  const n = data.species.length;
  const pairs: ParentPair[] = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (data.pair[pairIndex(n, i, j)] !== target) continue;
      total++;
      pairs.push({ a: i, b: j, owned: ownedSpecies.has(i) && ownedSpecies.has(j) });
    }
  }
  pairs.sort((x, y) =>
    Number(y.owned) - Number(x.owned)
    || (data.species[x.a]?.name ?? "").localeCompare(data.species[y.a]?.name ?? "", "en"));
  return { pairs: pairs.slice(0, cap), total };
}
