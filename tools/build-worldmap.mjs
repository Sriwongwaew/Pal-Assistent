/* Genererar kartans, questkatalogens och partnerskill-tabellens statiska data.
 *
 *   node tools/build-worldmap.mjs
 *
 * Skriver `src/lib/data/worldmap.json`, `src/lib/data/missions.json` och
 * `src/lib/data/partnerSkills.json` ur 1.0-verifierade källor (aug 2026):
 *
 *   1. paldb.cc:s kartlast (PAK-extraherad) – torn, läger, dungeons,
 *      skill fruit-träd och malmkluster. Ingen annan hittad källa är
 *      1.0-komplett: 1.0 byggde om världen (FPA-tornet flyttade, åttonde
 *      tornet tillkom, effigies omfördelades), så allt daterat före ~mitten
 *      av 2026 är delvis fel.
 *   2. PalworldSaveTools `fast_travel_points.json` – snabbresor, nycklade på
 *      SAMMA instans-GUID:n som savens `FastTravelPointUnlockFlag`, så appen
 *      kan pricka av exakt vilka som är upplåsta.
 *   3. palworld-save-pal `relics.json` – alla 407 reliker (effigies =
 *      capture_power) med GUID:n som matchar `RelicObtainForInstanceFlag`.
 *   4. palworld-save-pal `bosses.json` + `missions.json` (+ l10n) –
 *      alfabossar med spawner-id (matchar savens `NormalBossDefeatFlag`)
 *      och questkatalogen med engelska namn.
 *
 * Koordinater: källorna talar UE-världsenheter (cm). Här räknas de om till
 * SPELETS visade koordinater med den communityt-belagda transformen
 *   x = (UE_Y − 158000) / 459,  y = (UE_X + 123888) / 459
 * (verifierad mot tornens kända koordinater; delaren är exakt 459).
 * Bildprojektionen (procent på 8192-kartan) görs i `src/lib/worldmap.ts` –
 * datat bär bara spelkoordinater, samma siffror som spelaren ser i spelet.
 *
 * Körs om när världen ändras (ny patch) – utdatat är statisk världsdata utan
 * något personligt och checkas in i repot. */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(import.meta.dirname, "..", "src", "lib", "data");
const BASE_DATA = path.join(import.meta.dirname, "..", "data", "pal-data.base.json");

const PALDB_MAP = "https://paldb.cc/js/map_data_en.js";
const PST_RAW = "https://raw.githubusercontent.com/deafdudecomputers/PalworldSaveTools/main/resources/game_data";
const PSP_RAW = "https://raw.githubusercontent.com/oMaN-Rod/palworld-save-pal/main/data/json";

/** UE-världsenheter → spelets visade koordinater. */
const ig = (ueX, ueY) => ({
  x: Math.round(((ueY - 158000) / 459) * 10) / 10,
  y: Math.round(((ueX + 123888) / 459) * 10) / 10,
});

/* Huvudkartans bildram i spelkoordinater (härledd ur paldb:s
   landScapeRealPosition). Världsträdet är en EGEN karta med egen transform –
   dess punkter ligger utanför ramen och filtreras bort ur ALLA lager, med
   loggade antal så bortfallet aldrig är tyst. */
const FRAME = { x: [-1922.4, 1234.0], y: [-2125.3, 1031.1] };
const dropped = {};
function inFrame(layer) {
  return (m) => {
    const ok = m.x >= FRAME.x[0] && m.x <= FRAME.x[1] && m.y >= FRAME.y[0] && m.y <= FRAME.y[1];
    if (!ok) dropped[layer] = (dropped[layer] ?? 0) + 1;
    return ok;
  };
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": "palassistent-build" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

/* paldb-lasten är en JS-fil med `var`-block; blocket mellan
   `var fixedDungeon =` och `var regionData` är ren JSON (minus semikolonet). */
function paldbMarkers(source) {
  const start = source.indexOf("var fixedDungeon =");
  const end = source.indexOf("var regionData");
  if (start < 0 || end < 0) throw new Error("paldb-lasten har bytt form – uppdatera parsern.");
  const json = source.slice(start + "var fixedDungeon =".length, end).trim().replace(/;$/, "");
  return JSON.parse(json);
}

/* `var regionData` – spelets EGNA regionnamn, flera med nivåspann i namnet
   ("Lv.40-50 Desiccated Dunes", "Lv.60 Rayne Syndicate Platform Oil Rig").
   Det är det som gör en källa begriplig: "Oil rig Lv60" är en text, men
   "Lv.60 Rayne Syndicate Platform Oil Rig" på (−1722, −1462) är en plats.
   Positionerna står redan i SPELKOORDINATER här (`ipos`), inte i UE-cm som
   markörerna – de ska alltså inte gå genom `ig()`. */
function paldbRegions(source) {
  const key = "var regionData =";
  const start = source.indexOf(key);
  if (start < 0) throw new Error("regionData finns inte i paldb-lasten – uppdatera parsern.");
  const tail = source.slice(start + key.length);
  const end = tail.search(/\]\s*;/);
  if (end < 0) throw new Error("regionData saknar sitt slut – uppdatera parsern.");
  return JSON.parse(tail.slice(0, end + 1).trim());
}

/** "Lv.40-50 Desiccated Dunes" → { name, lo: 40, hi: 50 }. Utan prefix: null-nivå. */
function splitRegionName(raw) {
  const m = /^Lv\.(\d+)(?:\s*-\s*(\d+))?\s+(.*)$/.exec(raw);
  if (!m) return { name: raw, lo: null, hi: null };
  return { name: m[3], lo: Number(m[1]), hi: m[2] ? Number(m[2]) : Number(m[1]) };
}

const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, "").trim();

/* Tornnamn (paldb) → savens flaggnyckel (BOSS_BATTLE_NAME_<flag>).
   Mappningen är verifierad mot en riktig save + spelets GYM-l10n; notera att
   namnen följer PALENS element/region och inte tornets: GrassBoss är Zoe &
   Grizzbolt (gräsmarkerna), ElectricBoss är Axel & Orserk (Orserk är elektrisk). */
const TOWER_FLAGS = [
  ["rayne", "GrassBoss"],
  ["free pal alliance", "ForestBoss"],
  ["eternal pyre", "ElectricBoss"],
  ["pidf", "DesertBoss"],
  ["pal genetic research", "SnowBoss"],
  ["moonflower", "SakurajimaBoss"],
  ["feybreak", "VikingBoss"],
  ["azure", "SorajimaBoss"],
];

function towerFlag(name) {
  const n = name.toLowerCase();
  const hit = TOWER_FLAGS.find(([needle]) => n.includes(needle));
  if (!hit) throw new Error(`Okänt torn i paldb-lasten: "${name}" – lägg till i TOWER_FLAGS.`);
  return hit[1];
}

const ORE_TYPES = new Map([
  ["Ore Cluster", "ore"],
  ["Coal Cluster", "coal"],
  ["Sulfur Cluster", "sulfur"],
  ["Pure Quartz Cluster", "quartz"],
]);

async function buildWorldmap() {
  const [paldbSrc, pstTravelSrc, relicsSrc, bossesSrc] = await Promise.all([
    fetchText(PALDB_MAP),
    fetchText(`${PST_RAW}/fast_travel_points.json`),
    fetchText(`${PSP_RAW}/relics.json`),
    fetchText(`${PSP_RAW}/bosses.json`),
  ]);

  const markers = paldbMarkers(paldbSrc);
  const byType = (t) => markers.filter((m) => m.type === t && m.pos);

  const towers = byType("Tower").map((m) => ({
    ...ig(m.pos.X, m.pos.Y),
    name: stripHtml(m.item).replace(/ Entrance$/, ""),
    flag: towerFlag(stripHtml(m.item)),
  }));
  if (towers.length !== 8) throw new Error(`Väntade 8 torn, fick ${towers.length}.`);

  /* Snabbresor ur PST-filen (GUID-nycklad). */
  const pstTravels = JSON.parse(pstTravelSrc);
  const travels = Object.entries(pstTravels)
    .map(([guid, p]) => ({
      g: guid.toUpperCase(),
      ...ig(p.x, p.y),
      name: p.localized_name || p.id,
      kind: /^WatchTower/i.test(p.id ?? "") ? "watch"
        : /Tower/i.test(p.class ?? "") ? "tower" : "eagle",
    }))
    .filter(inFrame("travels"));

  const relicsRaw = JSON.parse(relicsSrc);
  const relics = Object.entries(relicsRaw)
    .map(([guid, r]) => ({
      g: guid.toUpperCase(),
      ...ig(r.x, r.y),
      t: r.relic_type === "capture_power" ? "effigy" : "relic",
    }))
    .filter(inFrame("relics"));

  const bosses = JSON.parse(bossesSrc);
  const alphas = Object.values(bosses)
    .filter((b) => b.character_id && b.character_id !== "None")
    .map((b) => ({
      ...ig(b.x, b.y),
      sp: b.character_id.replace(/^BOSS_/i, ""),
      lv: b.level,
      spawner: b.spawner_id,
    }))
    .filter(inFrame("alphas"));

  /* Lägren bär REGIONEN och FRAKTIONEN, inte ett namn.
     `item` är markörens interna id ("Grass2", "DLC3_AreaBarrier") och dög aldrig
     som platsnamn – det var därför Hitta visade alla 58 som en enda grupp. Men
     `RewardName` är regionens token ("Snow1", "Desert1", "SeaBase_Snow_1") och
     spawner-klassen bär fraktionen ("Hunter", "Ninja", "Believer"). Med dem går
     "Snow enemy camp" i schematics-tabellen att slå upp mot riktiga koordinater
     i stället för att stå som prosa man inte kan göra något med (Kens fynd).
     Regionen exporteras som TOKEN och prettas aldrig till ett biomnamn: paldb:s
     egna regionnamn ligger i `regions` nedan och `Snow1` ↔ `REGION_Frost_*` är
     inte en säker koppling. Token duger som nyckel, den ska bara aldrig ritas. */
  const camps = byType("Enemy Camp")
    .map((m) => ({
      ...ig(m.pos.X, m.pos.Y),
      region: stripHtml(m.RewardName) || null,
      faction: String(m.Type ?? "").replace(/^BP_NPCCampSpawner_/, "").split("_")[0] || null,
    }))
    .filter(inFrame("camps"));
  if (camps.some((c) => !c.region)) {
    throw new Error("läger utan RewardName – har paldb-lasten bytt form?");
  }

  /* Oljeriggarnas guldkistor (3 speldygns nedkylning enligt källan) och
     skattkartornas fasta platser. Båda är källor i LEGENDARY_SCHEMATICS som
     tidigare bara stod som text. Skattkartorna har ingen raritet i datan –
     rariteten sitter på kartan man hittar, inte på platsen. */
  const oilrigs = byType("Oilrig Chest")
    .map((m) => ({ ...ig(m.pos.X, m.pos.Y) }))
    .filter(inFrame("oilrigs"));
  const treasures = byType("Treasure Map")
    .map((m) => ({ ...ig(m.pos.X, m.pos.Y) }))
    .filter(inFrame("treasures"));

  const dungeons = byType("Dungeon")
    .map((m) => ({
      ...ig(m.pos.X, m.pos.Y),
      name: stripHtml(m.item),
      lv: m.lv ?? null,
    }))
    .filter(inFrame("dungeons"));

  const fruits = byType("Fruit Tree")
    .map((m) => ig(m.pos.X, m.pos.Y))
    .filter(inFrame("fruits"));

  const ores = markers
    .filter((m) => ORE_TYPES.has(m.type) && m.pos)
    .map((m) => ({ ...ig(m.pos.X, m.pos.Y), t: ORE_TYPES.get(m.type) }))
    .filter(inFrame("ores"));

  /* Regionerna: namn + nivåspann + position. Tomma namn ("-") och Arena-raden
     hör inte på en karta man letar platser på. */
  const regions = paldbRegions(paldbSrc)
    .filter((r) => r.ipos && stripHtml(r.item) && stripHtml(r.item) !== "-")
    .map((r) => {
      const { name, lo, hi } = splitRegionName(stripHtml(r.item));
      return { x: r.ipos.X, y: r.ipos.Y, name, lo, hi, id: r.id };
    })
    .filter(inFrame("regions"));

  const worldmap = {
    towers, travels, relics, alphas, camps, dungeons, fruits, ores,
    oilrigs, treasures, regions,
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUT_DIR, "worldmap.json"),
    JSON.stringify(worldmap),
  );
  const counts = Object.fromEntries(Object.entries(worldmap).map(([k, v]) => [k, v.length]));
  console.log("worldmap.json:", JSON.stringify(counts));
  console.log("utanför ramen (Världsträdet m.m.):", JSON.stringify(dropped));
}

async function buildMissions() {
  const [defsSrc, l10nSrc] = await Promise.all([
    fetchText(`${PSP_RAW}/missions.json`),
    fetchText(`${PSP_RAW}/l10n/en/missions.json`),
  ]);
  const defs = JSON.parse(defsSrc);
  const l10n = JSON.parse(l10nSrc);

  /* id → { n: engelskt namn, t: "Main" | "Sub" }. Dolda/avstängda quests
     utelämnas – de dyker aldrig upp i spelarens logg. Ett id som ändå saknas
     vid uppslag visas som sitt id i gränssnittet, aldrig som en gissning. */
  const out = {};
  for (const [id, def] of Object.entries(defs)) {
    const type = String(def?.quest_type ?? "");
    const kind = type.includes("Main") ? "Main" : type.includes("Sub") ? "Sub" : null;
    if (!kind || def?.disabled) continue;
    const name = l10n[id]?.localized_name?.trim();
    if (!name) continue;
    out[id] = { n: name, t: kind };
  }
  await writeFile(
    path.join(OUT_DIR, "missions.json"),
    JSON.stringify(out),
  );
  console.log(`missions.json: ${Object.keys(out).length} quests`);
}

/* Partnerskills: 298 arter skrapade från paldb (via MagitekZed/palworld-helper,
   hämtning 2026-07-26 – proveniensen ligger i källfilens meta). Texten är
   Pocketpairs egen speltext, samma kategori som ikonerna vi redan paketerar.
   Nycklas om från engelskt NAMN till Species.code mot basdatat: namn driftar
   med patchar, koder gör det inte. Omatchade rapporteras – aldrig gissas. */
async function buildPartnerSkills() {
  const [srcRaw, baseRaw] = await Promise.all([
    fetchText("https://raw.githubusercontent.com/MagitekZed/palworld-helper/main/data/pals_partner_skills.json"),
    readFile(BASE_DATA, "utf8"),
  ]);
  const src = JSON.parse(srcRaw);
  const base = JSON.parse(baseRaw);
  const codeByName = new Map(base.species.map((s) => [s.name, s.code]));

  const out = {};
  const unmatched = [];
  for (const [name, row] of Object.entries(src.pals ?? {})) {
    const code = codeByName.get(name);
    if (!code) {
      unmatched.push(name);
      continue;
    }
    out[code] = { skill: row.skill, desc: row.desc, tags: row.tags ?? [] };
  }
  await writeFile(path.join(OUT_DIR, "partnerSkills.json"), JSON.stringify(out));
  const missing = base.species
    .filter((s) => !out[s.code] && !s.name.startsWith("Unidentified"))
    .map((s) => s.name);
  console.log(`partnerSkills.json: ${Object.keys(out).length} arter`);
  if (unmatched.length) console.log("  omatchade källnamn:", unmatched.join(", "));
  if (missing.length) console.log("  arter utan rad (visas som lucka):", missing.join(", "));
}

await buildWorldmap();
await buildMissions();
await buildPartnerSkills();
