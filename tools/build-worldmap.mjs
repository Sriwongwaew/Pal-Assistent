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
 *      av 2026 är delvis fel. VÄRLDSTRÄDET är en egen last (`treemap_data_en`)
 *      med en egen bildram – se `MAPS` nedan.
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
const PALDB_TREE = "https://paldb.cc/js/treemap_data_en.js";
const PST_RAW = "https://raw.githubusercontent.com/deafdudecomputers/PalworldSaveTools/main/resources/game_data";
const PSP_RAW = "https://raw.githubusercontent.com/oMaN-Rod/palworld-save-pal/main/data/json";

/** UE-världsenheter → spelets visade koordinater. */
const ig = (ueX, ueY) => ({
  x: Math.round(((ueY - 158000) / 459) * 10) / 10,
  y: Math.round(((ueX + 123888) / 459) * 10) / 10,
});

/* SPELET HAR TVÅ KARTOR, och de delar koordinatsystem utan att dela bildram.
   Världsträdet är en egen spelkarta med en egen rendering, och dess punkter
   ligger utanför huvudkartans ram – de filtrerades tidigare bort ur alla lager
   och fanns alltså inte i appen alls.

   Ramen HÄRLEDS ur respektive lasts `config.landScapeRealPosition`, inte ur
   avlästa siffror: samma två rader ger huvudkartans dokumenterade ram
   (x ∈ [−1922,4, 1234,0], y ∈ [−2125,3, 1031,1]) och trädets, så en patch som
   flyttar en kartram flyttar filtret med i stället för att tyst börja slänga
   markörer. `assertFrame` håller huvudkartan mot de dokumenterade siffrorna –
   de står i src/lib/worldmap.ts och i testerna, och ska inte kunna glida isär.

   Uppströmskällorna (snabbresor, reliker, bossar) är VÄRLDSOMSPÄNNANDE och
   nycklade på instans-GUID: samma fil bär både kartornas punkter. Det är därför
   varje sådan källa delas mellan kartorna med `splitByMap` i stället för att
   filtreras mot en ram – ett bortfall där är en effigy som saknas i appen. */
function frameOf(config) {
  const { landScapeRealPositionMin: lo, landScapeRealPositionMax: hi } = config;
  return {
    x: [(lo.Y - 158000) / 459, (hi.Y - 158000) / 459],
    y: [(lo.X + 123888) / 459, (hi.X + 123888) / 459],
  };
}

function assertFrame(frame, want, what) {
  const got = [...frame.x, ...frame.y].map((v) => Math.round(v * 10) / 10);
  if (got.join() !== want.join()) {
    throw new Error(`${what}: bildramen har flyttat sig – ${got.join()} ≠ ${want.join()}. `
      + "Stämmer den nya ramen ska mapPct-konstanterna i src/lib/worldmap.ts och "
      + "tests/worldmap.test.ts uppdateras i samma veva.");
  }
}

const inFrame = (frame) => (m) =>
  m.x >= frame.x[0] && m.x <= frame.x[1] && m.y >= frame.y[0] && m.y <= frame.y[1];

/* Delar en världsomspännande källa på kartorna. En punkt som hamnar i BÅDA
   ramarna (de tangerar varandra i y) eller i ingen är inte ett bortfall att
   logga utan ett tecken på att transformen glidit – då stannar bygget. */
function splitByMap(rows, frames, what) {
  const out = { main: [], tree: [] };
  for (const row of rows) {
    const hits = Object.keys(frames).filter((id) => inFrame(frames[id])(row));
    if (hits.length !== 1) {
      throw new Error(`${what}: punkten (${row.x}, ${row.y}) ligger i ${hits.length} kartramar `
        + `(${hits.join(", ") || "ingen"}) – transformen eller ramarna stämmer inte.`);
    }
    out[hits[0]].push(row);
  }
  return out;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": "palcompanion-build" } });
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

/* `var config` – kartans bildram i UE-enheter. Samma form i båda lasterna. */
function paldbConfig(source) {
  const key = "var config =";
  const start = source.indexOf(key);
  if (start < 0) throw new Error("config finns inte i paldb-lasten – uppdatera parsern.");
  const tail = source.slice(start + key.length);
  /* Objektet är nästlat (`landScapeRealPositionMin` m.fl.), så första `}` är
     fel slut – räkna klammerdjup i stället. */
  let depth = 0;
  for (let i = tail.indexOf("{"); i < tail.length; i++) {
    if (tail[i] === "{") depth++;
    else if (tail[i] === "}" && --depth === 0) return JSON.parse(tail.slice(tail.indexOf("{"), i + 1));
  }
  throw new Error("config saknar sitt slut – uppdatera parsern.");
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
  const [paldbSrc, treeSrc, pstTravelSrc, relicsSrc, bossesSrc] = await Promise.all([
    fetchText(PALDB_MAP),
    fetchText(PALDB_TREE),
    fetchText(`${PST_RAW}/fast_travel_points.json`),
    fetchText(`${PSP_RAW}/relics.json`),
    fetchText(`${PSP_RAW}/bosses.json`),
  ]);

  const frames = { main: frameOf(paldbConfig(paldbSrc)), tree: frameOf(paldbConfig(treeSrc)) };
  assertFrame(frames.main, [-1922.4, 1234, -2125.3, 1031.1], "huvudkartan");
  assertFrame(frames.tree, [-2126.8, -1382.1, 1026.7, 1771.3], "Världsträdet");

  /* De tre världsomspännande källorna delas på kartorna. Talen är verifierade
     aug 2026: 157/17 snabbresor, 360/47 reliker (varav 15 effigies i trädet)
     och 83/7 fältbossar – och INGEN punkt hamnar utanför båda ramarna, vilket
     är det som gör delningen trovärdig i stället för att bara vara ett filter. */
  const split = {
    travels: splitByMap(Object.entries(JSON.parse(pstTravelSrc)).map(([guid, p]) => ({
      g: guid.toUpperCase(),
      ...ig(p.x, p.y),
      name: p.localized_name || p.id,
      kind: /^WatchTower/i.test(p.id ?? "") ? "watch"
        : /Tower/i.test(p.class ?? "") ? "tower" : "eagle",
    })), frames, "snabbresor"),
    relics: splitByMap(Object.entries(JSON.parse(relicsSrc)).map(([guid, r]) => ({
      g: guid.toUpperCase(),
      ...ig(r.x, r.y),
      t: r.relic_type === "capture_power" ? "effigy" : "relic",
    })), frames, "reliker"),
    alphas: splitByMap(Object.values(JSON.parse(bossesSrc))
      .filter((b) => b.character_id && b.character_id !== "None")
      .map((b) => ({
        ...ig(b.x, b.y),
        sp: b.character_id.replace(/^BOSS_/i, ""),
        lv: b.level,
        spawner: b.spawner_id,
      })), frames, "fältbossar"),
  };

  const markers = paldbMarkers(paldbSrc);
  const byType = (t) => markers.filter((m) => m.type === t && m.pos);
  /* Lasten är kartans egen och ska ligga i kartans egen ram. Ett bortfall här
     vore tyst datasvinn, alltså kastar vi hellre. */
  const stray = markers.filter((m) => m.pos && !inFrame(frames.main)(ig(m.pos.X, m.pos.Y)));
  if (stray.length) {
    throw new Error(`${stray.length} markörer i huvudlasten ligger utanför huvudkartans ram `
      + `(t.ex. "${stripHtml(stray[0].item)}") – har paldb slagit ihop kartorna?`);
  }

  const towers = byType("Tower").map((m) => ({
    ...ig(m.pos.X, m.pos.Y),
    name: stripHtml(m.item).replace(/ Entrance$/, ""),
    flag: towerFlag(stripHtml(m.item)),
  }));
  if (towers.length !== 8) throw new Error(`Väntade 8 torn, fick ${towers.length}.`);

  const travels = split.travels.main;
  const relics = split.relics.main;
  const alphas = split.alphas.main;

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
    }));
  if (camps.some((c) => !c.region)) {
    throw new Error("läger utan RewardName – har paldb-lasten bytt form?");
  }

  /* Oljeriggarnas guldkistor (3 speldygns nedkylning enligt källan) och
     skattkartornas fasta platser. Båda är källor i LEGENDARY_SCHEMATICS som
     tidigare bara stod som text. Skattkartorna har ingen raritet i datan –
     rariteten sitter på kartan man hittar, inte på platsen. */
  const oilrigs = byType("Oilrig Chest")
    .map((m) => ({ ...ig(m.pos.X, m.pos.Y) }));
  const treasures = byType("Treasure Map")
    .map((m) => ({ ...ig(m.pos.X, m.pos.Y) }));

  /* ANCIENT RUINS – den starkaste schematic-källan som finns, och den låg
     oanvänd i lasten. Varje ruinmarkör bär i sitt `comment`-fält NAMNET på den
     schematic (eller Applied Technique-bok) den ger, och paldb anger 100 % på
     platsen. Det betyder att 106 schematics har en fast adress med garanterat
     byte – inget att gissa, inget att korsläsa mot guider.

     Det här fyllde hela luckan Ken hittade ("vi saknar massor med schematics
     för t.ex. katis ringen", aug 2026): samtliga 71 rank-8-tillbehör – ringarna,
     talismanerna, batongerna, visselpiporna, pendangerna – har exakt en ruin
     var. Katress Ring hamnar på (−1729,9, −989,7), vilket är precis den
     koordinat paldb:s egen sida för schematicen anger; transformen är alltså
     bekräftad mot en oberoende läsning av samma källa.

     `gives` är spelets egna itemnamn och översätts aldrig. En ruin utan
     `comment` vore en lucka vi inte kan beskriva, så den räknas och rapporteras
     i stället för att tas med tom. */
  const ruinsRaw = byType("Ancient Ruin");
  const ruins = ruinsRaw
    .map((m) => ({ ...ig(m.pos.X, m.pos.Y), gives: stripHtml(m.comment) }))
    .filter((r) => r.gives);
  const ruinsBlank = ruinsRaw.length - ruins.length;
  if (ruinsBlank > 0) console.log(`  ruiner utan comment (utelämnade): ${ruinsBlank}`);

  const dungeons = byType("Dungeon")
    .map((m) => ({
      ...ig(m.pos.X, m.pos.Y),
      name: stripHtml(m.item),
      lv: m.lv ?? null,
    }));

  const fruits = byType("Fruit Tree")
    .map((m) => ig(m.pos.X, m.pos.Y));

  const ores = markers
    .filter((m) => ORE_TYPES.has(m.type) && m.pos)
    .map((m) => ({ ...ig(m.pos.X, m.pos.Y), t: ORE_TYPES.get(m.type) }));

  /* Regionerna: namn + nivåspann + position. Tomma namn ("-") och Arena-raden
     hör inte på en karta man letar platser på. */
  const regions = paldbRegions(paldbSrc)
    .filter((r) => r.ipos && stripHtml(r.item) && stripHtml(r.item) !== "-")
    .map((r) => {
      const { name, lo, hi } = splitRegionName(stripHtml(r.item));
      return { x: r.ipos.X, y: r.ipos.Y, name, lo, hi, id: r.id };
    })
    .filter(inFrame(frames.main));

  const main = {
    towers, travels, relics, alphas, camps, dungeons, fruits, ores,
    oilrigs, treasures, regions, ruins,
  };
  const tree = buildTree(treeSrc, split);

  const worldmap = { main, tree };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUT_DIR, "worldmap.json"),
    JSON.stringify(worldmap),
  );
  for (const [id, map] of Object.entries(worldmap)) {
    const counts = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.length]));
    console.log(`worldmap.json ${id}:`, JSON.stringify(counts));
  }
}

/* Världsträdets lager. Egen karta, egen bildram, delvis egna markörtyper –
   och EN regel som skiljer den här funktionen från huvudkartans: ingenting
   döps om. Kaklen, ägget och malmen heter i källan vad de heter i spelet.

   Torn: lasten har fyra "Tower", och de är trädets bossar. Bara SLUTBOSSEN kan
   knytas till en savflagga (`WorldTreeBoss` = Zenara & Astralym, namnet står i
   klartext i markören). Mellanbossarna har flaggorna WorldTreeMiddleBoss1..3,
   men INGEN källa säger vilken av dem som är vilket nummer – att gissa hade
   bockat av fel boss, alltså får de `flag: null` och appen prickar inte av dem
   individuellt. Antalet klarade står ändå på uppdragssidan, ur saven.

   Utelämnade typer loggas. "Awakening" (21), "Incident" (9) och "NPC" (1) är
   spelinterna spawners vi inte kan beskriva ärligt, och ett lager som heter
   något vi gissat är sämre än inget lager. */
function buildTree(treeSrc, split) {
  const markers = paldbMarkers(treeSrc);
  const byType = (t) => markers.filter((m) => m.type === t && m.pos);
  const pos = (m) => ig(m.pos.X, m.pos.Y);

  const towers = byType("Tower").map((m) => {
    const name = stripHtml(m.item);
    return { ...pos(m), name, flag: /zenara|astralym/i.test(name) ? "WorldTreeBoss" : null };
  });
  if (towers.length !== 4) throw new Error(`Väntade 4 bossar i Världsträdet, fick ${towers.length}.`);
  if (towers.filter((t) => t.flag).length !== 1) {
    throw new Error("Världsträdets slutboss hittades inte bland tornen – har paldb döpt om Zenara & Astralym?");
  }

  /* Fiskeplatserna är trädets största lager efter malmen, och de fyller en
     lucka appen dokumenterat saknat ("fiskeplatser: ingen data alls"). `rare`
     är källans egen skillnad, inte vår. */
  const fishing = [
    ...byType("Fishing Spot").map((m) => ({ ...pos(m), rare: false })),
    ...byType("Rare Fishing Spot").map((m) => ({ ...pos(m), rare: true })),
  ];

  const tree = {
    towers,
    travels: split.travels.tree,
    relics: split.relics.tree,
    alphas: split.alphas.tree,
    /* Paloxite är trädets malm och har ingen motsvarighet på huvudkartan –
       den ligger som egen typ i källan och får därför ett eget lager. */
    ores: byType("Paloxite").map((m) => ({ ...pos(m), t: "paloxite" })),
    chests: byType("Chest").map(pos),
    eggs: byType("World Tree Egg").map(pos),
    fruits: byType("Fruit Tree").map(pos),
    fishing,
    springs: byType("Teafant Spring").map(pos),
    journals: byType("Journals").map((m) => ({ ...pos(m), name: stripHtml(m.item) })),
    junk: byType("Junk").map(pos),
  };

  const used = new Set(["Tower", "Fast Travel", "Watchtower", "Lifmunk Effigy", "Cattiva Effigy",
    "Yakumo Effigy", "Alpha Pal", "Paloxite", "Chest", "World Tree Egg", "Fruit Tree",
    "Fishing Spot", "Rare Fishing Spot", "Teafant Spring", "Journals", "Junk"]);
  const skipped = {};
  for (const m of markers) if (!used.has(m.type)) skipped[m.type] = (skipped[m.type] ?? 0) + 1;
  if (Object.keys(skipped).length) console.log("  Världsträdet, utelämnade typer:", JSON.stringify(skipped));
  return tree;
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
