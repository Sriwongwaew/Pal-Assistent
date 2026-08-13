/* Hämtar vad varje vara FAKTISKT gör: spelets egen beskrivning plus siffrorna.
 *
 *   node tools/build-item-info.mjs
 *
 * Skriver `src/lib/data/itemInfo.json` (engelskt visningsnamn → beskrivning +
 * stats) som `ItemTip` visar när man hovrar en vara eller en schematic i Hitta.
 *
 * Källa: `items`-tabellen i stolenvw/pyPalworldAPI (speldata v1.0.1, datamined)
 * – samma dump `build-drops.mjs` redan hämtar, så inget nytt beroende. Texten är
 * Pocketpairs egen och översätts aldrig, precis som artnamn och passivnamn.
 *
 * Fem saker som är valda, inte råkade så:
 *
 * 1. **Schematics slås upp på VAPNET, inte på pappret.** "Assault Rifle
 *    Schematic 4" finns som egen Blueprint-rad, men dess beskrivning handlar om
 *    ritningen. Det man vill veta är vad vapnet gör, så namnet kapas vid
 *    " Schematic N" och uppslaget görs mot vapen-/rustningsraden. Saknas den
 *    faller vi tillbaka på blueprint-raden – hellre ritningens text än ingen.
 * 2. **Siffrorna är BASVARIANTENS, och det måste synas i gränssnittet.** Varje
 *    vapen har exakt EN rad i tabellen (`AssaultRifle_Default1`), medan
 *    "Schematic 4" bygger `_Default5`. De högre varianternas värden finns inte
 *    i källan – `gear`-tabellen har per-raritet men bara för 20 av våra 85 namn,
 *    och saknar attack helt. Att skala själv vore en gissning. Därför exporteras
 *    basvärdena med `base: true`, och `ItemTip` säger det rakt ut.
 * 3. **Bara det Hitta kan visa exporteras.** Tabellen har 1 790 rader; vi
 *    behöver drops, ranchvaror, malm, IV-frukter och schematics. 526 item-id ur
 *    någons värld hör inte i en fil som skickas vidare, och filen bundlas till
 *    klienten.
 * 4. **Namnlistan läses ur källfilerna**, samma regexar som
 *    `build-item-icons.mjs` – och kastar likadant när en tabell byter form.
 *    En tyst tom lista gav noll ikoner en gång; samma fälla finns här.
 * 5. **Tomma fält utelämnas.** `null` och 0 betyder olika saker (ett svärd har
 *    inget magasin, en rustning ingen attack), och `undefined` är det enda som
 *    ärligt betyder "står inte i källan".
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SQL_URL = "https://raw.githubusercontent.com/stolenvw/pyPalworldAPI/main/mysqldb/PalAPI.sql";
const OUT = path.join(ROOT, "src/lib/data/itemInfo.json");

/* ---- Vilka namn behöver en beskrivning? (samma urval som ikonbygget) ---- */

const drops = JSON.parse(readFileSync(`${ROOT}/src/lib/data/drops.json`, "utf8"));
const dropNames = drops.map((d) => d.item);

const constantsSrc = readFileSync(`${ROOT}/src/lib/constants.ts`, "utf8");
const ranchBlock = constantsSrc.match(/RANCH_DROPS[^=]*=\s*\[([\s\S]*?)\n\];/);
const ranchNames = [...new Set(
  ranchBlock[1]
    .split("\n")
    .filter((line) => !line.includes("group: true"))
    .flatMap((line) => [...line.matchAll(/item:\s*"([^"]+)"/g)].map((m) => m[1])),
)];
if (ranchNames.length === 0) throw new Error("RANCH_DROPS gav noll namn – har tabellens form ändrats?");

const findIndexSrc = readFileSync(`${ROOT}/src/lib/findIndex.ts`, "utf8");
const oreBlock = findIndexSrc.match(/ORE_ITEM[^=]*=\s*\{([\s\S]*?)\n\};/);
const oreNames = [...oreBlock[1].matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1]);

const fruitSrc = readFileSync(`${ROOT}/src/lib/ivFruits.ts`, "utf8");
const fruitBlock = fruitSrc.match(/FRUIT_NAMES[^=]*=\s*\[([^\]]*)\]/);
const fruitNames = [...fruitBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

/* Ruinernas schematics (aug 2026): 106 fasta platser ger var sin ritning, och
   deras varor – ringar, talismaner, batonger, visselpipor – fanns i inget av
   de andra urvalen. Namnen kapas vid " Schematic N": det är föremålet som har
   en ikon och en beskrivning, inte pappret. */
const worldmap = JSON.parse(readFileSync(`${ROOT}/src/lib/data/worldmap.json`, "utf8"));
const ruinNames = [...new Set(
  (worldmap.ruins ?? [])
    .map((r) => String(r.gives ?? "").replace(/ Schematic( \d+)?$/, ""))
    .filter((n) => n && !/Handbook/.test(n)),
)];
if (ruinNames.length === 0) throw new Error("worldmap.json:s ruins gav noll namn – har lagret försvunnit?");

const findSrc = readFileSync(`${ROOT}/src/lib/findData.ts`, "utf8");
/* Schematics: både hela namnet (blueprint-raden) och det kapade (vapnet), för
   uppslaget provar vapnet först och pappret som reserv. */
const schemFull = [...new Set([...findSrc.matchAll(/name:\s*"([^"]+? Schematic(?: \d+)?)"/g)].map((m) => m[1]))];
const schemBase = [...new Set(schemFull.map((n) => n.replace(/ Schematic( \d+)?$/, "")))];
if (schemBase.length === 0) throw new Error("LEGENDARY_SCHEMATICS gav noll namn – har tabellens form ändrats?");

const wanted = new Set([...dropNames, ...ranchNames, ...oreNames, ...fruitNames, ...schemBase, ...ruinNames]);
console.log(`behöver: ${wanted.size} namn (${dropNames.length} drops, ${ranchNames.length} ranch, `
  + `${oreNames.length} malm, ${fruitNames.length} frukter, ${schemBase.length} schematics, `
  + `${ruinNames.length} ur ruiner)`);

/* ---- Hämta och tolka items-tabellen ---- */

const res = await fetch(SQL_URL);
if (!res.ok) throw new Error(`${SQL_URL}: HTTP ${res.status}`);
const sql = await res.text();

const start = sql.indexOf("INSERT INTO `items`");
if (start < 0) throw new Error("items-tabellen finns inte i dumpen längre.");
const blk = sql.slice(start, start + 900_000);

/* Ett SQL-strängliteral: '…' där \' och \\ är escapade. Kolumnordningen är
   tabellens (se CREATE TABLE `items` i dumpen) och kontrolleras nedan genom att
   ett känt vapen måste komma ut med rätt attack – en tyst kolumnglidning ger
   annars påhittade siffror, vilket är värre än inga. */
const STR = String.raw`'((?:[^'\\]|\\.)*)'`;
const NUM = String.raw`(NULL|-?[\d.]+)`;
const ROW = new RegExp(
  String.raw`\((\d+), ${STR}, ${STR}, (?:NULL|${STR}), ${STR}`   // id, Name, DevName, Image, Type
  + String.raw`, ${NUM}, ${NUM}, ${NUM}, ${NUM}`                 // Rank, MaxStackCount, Weight, Gold
  + String.raw`, ${NUM}, ${NUM}, ${NUM}`                         // Durability, MagazineSize, PhysicalAttack
  + String.raw`, ${NUM}, ${NUM}, ${NUM}`                         // HPValue, PhysicalDefense, Shield
  + String.raw`, ${NUM}, ${NUM}`                                 // MagicAttack, MagicDefense
  + String.raw`, (NULL|${STR})`,                                 // Description
  "g",
);
const FIELDS = ["id", "name", "dev", "image", "type", "rank", "stack", "weight", "gold",
  "dur", "mag", "atk", "hp", "def", "shield", "matk", "mdef", "descRaw", "desc"];

const unesc = (s) => (s ?? "").replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, " ").replace(/\\\\/g, "\\");
const num = (v) => (v === "NULL" || v === undefined ? undefined : Number(v));

const rows = new Map();
for (const m of blk.matchAll(ROW)) {
  const r = Object.fromEntries(FIELDS.map((f, i) => [f, m[i + 1]]));
  const name = unesc(r.name);
  if (!rows.has(name)) rows.set(name, r);
}
console.log(`tolkade ${rows.size} unika item-namn`);
if (rows.size < 1000) throw new Error("misstänkt få rader – har kolumnordningen ändrats?");

/* Kolumnkontroll mot ett känt värde. Assault Rifle är rank 3 med 320 attack och
   magasin 20 i 1.0-dumpen; glider kolumnerna hamnar de talen i fel fält och
   ingenting annat i skriptet märker det. */
const probe = rows.get("Assault Rifle");
if (!probe || num(probe.atk) !== 320 || num(probe.mag) !== 20) {
  throw new Error(`kolumnkontrollen föll: Assault Rifle gav atk=${probe?.atk} mag=${probe?.mag} (väntade 320/20)`);
}

/* ---- Bygg utdata ---- */

/* Samma alias som ikonbygget: spelets data stavar undertröjan med bindestreck
   i ritningens namn och utan i föremålets. */
const ALIAS = { "Heat-Resistant Undershirt": "Heat Resistant Undershirt" };

const out = {};
const missing = [];
for (const name of [...wanted].sort()) {
  const row = rows.get(name) ?? rows.get(ALIAS[name] ?? "");
  if (!row) { missing.push(name); continue; }
  const desc = unesc(row.desc).trim();
  const entry = { t: row.type, d: desc };
  const weapon = row.type === "Weapon" || row.type === "SpecialWeapon";
  const armor = row.type === "Armor" || row.type === "Accessory" || row.type === "Glider";
  /* Bara fält som betyder något för sorten – ett svärd har inget magasin, och
     "0" hade lästs som "magasin noll" i stället för "finns inte". */
  const put = (k, v) => { if (v !== undefined && v > 0) entry[k] = v; };
  if (weapon) { put("atk", num(row.atk)); put("mag", num(row.mag)); }
  if (armor) { put("def", num(row.def)); put("hp", num(row.hp)); put("shield", num(row.shield)); }
  put("dur", num(row.dur));
  put("w", num(row.weight));
  put("g", num(row.gold));
  /* Basvariantens siffror – se punkt 2 i filens huvud. Sätts bara när det FINNS
     siffror som skalar, annars vore förbehållet i gränssnittet vilseledande. */
  if (entry.atk || entry.def || entry.hp || entry.dur) entry.base = true;
  out[name] = entry;
}

/* Schematics vars vapenrad saknas får blueprint-radens egen text som reserv –
   ritningens beskrivning är sämre än vapnets, men bättre än tomt. */
const fallbacks = [];
for (const full of schemFull) {
  const base = full.replace(/ Schematic( \d+)?$/, "");
  if (out[base]) continue;
  const row = rows.get(full);
  if (!row) continue;
  out[base] = { t: "Blueprint", d: unesc(row.desc).trim(), blueprint: true };
  fallbacks.push(base);
}

writeFileSync(OUT, `${JSON.stringify(out, null, 0)}\n`);
const bytes = readFileSync(OUT).length;
console.log(`skrev ${Object.keys(out).length} rader till ${path.relative(ROOT, OUT)} (${Math.round(bytes / 1024)} kB)`);
if (fallbacks.length) console.log(`ritningstext som reserv (${fallbacks.length}): ${fallbacks.join(", ")}`);
const stillMissing = missing.filter((m) => !out[m]);
if (stillMissing.length) console.log(`UTAN BESKRIVNING (${stillMissing.length}): ${stillMissing.join(", ")}`);
