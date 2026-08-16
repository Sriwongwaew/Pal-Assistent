/* Hämtar spelets item-ikoner ur oMaN-Rod/palworld-save-pal (samma källa som
 * artikonerna) för allt Hitta visar: materialdrops, ranchvaror och
 * schematic-vapnen/rustningarna. Skriver public/icons/items/<slug>.webp och
 * src/lib/data/itemIcons.json (engelskt namn → slug). Namn utan belagd ikon
 * hamnar i rapporten och FÅR ingen bild – aldrig gissa.
 *
 *   node tools/build-item-icons.mjs
 *
 * Körs om när drops.json regenererats (tools/build-drops.mjs), RANCH_DROPS
 * eller LEGENDARY_SCHEMATICS fått nya namn. Uppslag: l10n en (namn → item-id)
 * → items.json (id → ikonfil) → repo-trädet (finns filen?). Allt hämtas
 * direkt från GitHub, ingenting cachas i repot.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW = "https://raw.githubusercontent.com/oMaN-Rod/palworld-save-pal/main";

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}
const tree = await getJson("https://api.github.com/repos/oMaN-Rod/palworld-save-pal/git/trees/main?recursive=1");
if (tree.truncated) throw new Error("GitHub-trädet är trunkerat – ikonkontrollen vore ofullständig.");
const imgFiles = new Set(
  tree.tree.map((e) => e.path).filter((p) => p.startsWith("ui/src/lib/assets/img/")),
);
const items = await getJson(`${RAW}/data/json/items.json`);
const en = await getJson(`${RAW}/data/json/l10n/en/items.json`);

/* Engelskt visningsnamn → alla item-id:n som bär det. */
const byName = new Map();
for (const [id, meta] of Object.entries(en)) {
  const n = meta.localized_name?.trim();
  if (!n) continue;
  byName.set(n, [...(byName.get(n) ?? []), id]);
}

/* ---- Vilka namn behöver ikoner? ---- */
const drops = JSON.parse(readFileSync(`${ROOT}/src/lib/data/drops.json`, "utf8"));
const dropNames = drops.map((d) => d.item);

/* RANCH_DROPS, ORE_ITEM, FRUIT_NAMES och LEGENDARY_SCHEMATICS läses ur
   källfilerna med enkla regexar – de är handkurerade tabeller med stabil form.

   Ranchtabellen bytte form aug 2026 (tuple → objekt med `sp`/`item`, för en art
   kan lägga flera varor). Den gamla regexen matchade `["Art", "Vara"]` och gav
   därför TYST noll ranchnamn, alltså noll ikoner för de nya varorna – bygget
   gick igenom, ikonerna bara saknades. Rader märkta `group: true` är våra egna
   samlingsord ("Seeds", "Buried items") och har med flit ingen item-ikon. */
const constantsSrc = readFileSync(`${ROOT}/src/lib/constants.ts`, "utf8");
const ranchBlock = constantsSrc.match(/RANCH_DROPS[^=]*=\s*\[([\s\S]*?)\n\];/);
const ranchNames = [...new Set(
  ranchBlock[1]
    .split("\n")
    .filter((line) => !line.includes("group: true"))
    .flatMap((line) => [...line.matchAll(/item:\s*"([^"]+)"/g)].map((m) => m[1])),
)];
if (ranchNames.length === 0) throw new Error("RANCH_DROPS gav noll namn – har tabellens form ändrats?");

/* Malmen och IV-frukterna kom in i Hitta aug 2026: de släpps av ingen pal, så
   de fanns inte i droptabellen och alltså inte bland ikonerna heller. */
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
/* `worldmap.json` bär TVÅ kartor sedan aug 2026 (`{ main, tree }`) – ruinerna
   ligger på huvudkartan. Läser man den gamla platta formen blir listan tom, och
   spärran nedan är det enda som skiljer det från ett tyst bortfall. */
const worldmap = JSON.parse(readFileSync(`${ROOT}/src/lib/data/worldmap.json`, "utf8"));
const ruinNames = [...new Set(
  (worldmap.main?.ruins ?? worldmap.ruins ?? [])
    .map((r) => String(r.gives ?? "").replace(/ Schematic( \d+)?$/, ""))
    .filter((n) => n && !/Handbook/.test(n)),
)];
if (ruinNames.length === 0) throw new Error("worldmap.json:s ruins gav noll namn – har lagret försvunnit?");

const findSrc = readFileSync(`${ROOT}/src/lib/findData.ts`, "utf8");
const schemNames = [...new Set([...findSrc.matchAll(/name:\s*"([^"]+?) Schematic(?: \d+)?"/g)].map((m) => m[1]))];

/* Receptens ingredienser (aug 2026): tårtplanen ritar en rad per ingrediens, och
   Flour och Wheat fanns i ingen av de andra listorna – de är varken drop, ranchvara,
   malm, frukt eller schematic. Källan är genererad JSON, inte en regex mot en
   källfil, så den kan inte glida isär tyst. */
const recipes = JSON.parse(readFileSync(`${ROOT}/src/lib/data/recipes.json`, "utf8"));
const matNames = [...new Set(
  Object.entries(recipes).flatMap(([name, r]) => [name, ...Object.keys(r.mats ?? {})]),
)];
if (matNames.length === 0) throw new Error("recipes.json gav noll namn – har generatorn slutat skriva den?");

const wanted = [...new Set([...dropNames, ...ranchNames, ...oreNames, ...fruitNames, ...schemNames, ...ruinNames, ...matNames])];
console.log(`behöver: ${wanted.length} namn (${dropNames.length} drops, ${ranchNames.length} ranch, `
  + `${oreNames.length} malm, ${fruitNames.length} frukter, ${schemNames.length} schematics, `
  + `${ruinNames.length} ur ruiner, ${matNames.length} ingredienser)`);

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* Uppströms-l10n har enstaka egna stavningar – alias: vårt namn → deras.
   Undertröjan är Pocketpairs egen inkonsekvens: FÖREMÅLET heter "Heat Resistant
   Undershirt" men RITNINGEN "Heat-Resistant Undershirt Schematic", med
   bindestreck. Ruinlagret ger oss ritningens stavning. */
const ALIAS = {
  "Flamethrower": "FlameThrower",
  "Heat-Resistant Undershirt": "Heat Resistant Undershirt",
};

const mapping = {};
const missing = [];
mkdirSync(`${ROOT}/public/icons/items`, { recursive: true });

for (const name of wanted) {
  const ids = byName.get(name) ?? byName.get(ALIAS[name] ?? "") ?? [];
  /* Flera id:n delar namn (raritetsvarianter) – ta första vars ikonfil finns.
     Vapnen: föredra det legendariska id:t (suffix _5/_4) om det finns, ikonen
     är densamma men det är ärligare mot vad schematic-raden faktiskt ger. */
  let iconPath = null;
  for (const id of ids) {
    const icon = items[id]?.icon?.toLowerCase();
    if (!icon) continue;
    const p = `ui/src/lib/assets/img/${icon}.webp`;
    if (imgFiles.has(p)) { iconPath = p; break; }
  }
  if (!iconPath) { missing.push(name); continue; }
  const s = slug(name);
  const res = await fetch(`${RAW}/${iconPath}`);
  if (!res.ok) { missing.push(`${name} (HTTP ${res.status})`); continue; }
  writeFileSync(`${ROOT}/public/icons/items/${s}.webp`, Buffer.from(await res.arrayBuffer()));
  mapping[name] = s;
}

writeFileSync(
  `${ROOT}/src/lib/data/itemIcons.json`,
  JSON.stringify(mapping, null, 2) + "\n",
);
console.log(`hämtade: ${Object.keys(mapping).length} ikoner`);
if (missing.length) console.log(`UTAN ikon (får ingen bild): ${missing.join(", ")}`);
