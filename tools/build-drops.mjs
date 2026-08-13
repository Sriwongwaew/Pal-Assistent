/* Genererar src/lib/data/drops.json – vem släpper vad, Palworld 1.0.
 *
 *   node tools/build-drops.mjs [--sql <fil>] [--kb <fil>]
 *
 * Två datamined källor (efterforskade aug 2026, se src/lib/findData.ts):
 *
 * 1. PRIMÄR: stolenvw/pyPalworldAPI (MIT) – `mysqldb/PalAPI.sql`, speldata
 *    v1.0.1. Tabellen `pals` bär en Drops-kolumn per art ({Name,Min,Max,Rate}),
 *    nycklad på DevName = exakt våra artkoder. Tabellen `bosspals` täcker
 *    nio arter som bara finns som bossar (BOSS_<kod>) – deras mängder är
 *    boss-skalade och raderna flaggas därför `u` (osäkrare).
 * 2. UTFYLLNAD: beliarance/palworld-kb – `data/items.json` (game_version 1.0),
 *    "Dropped by <art> x1–3 (50%)"-prosa. Täcker de ~22 arter som saknas i
 *    primärkällan (Sekhmet, Azurmane, Boltmane m.fl.) men saknar redovisad
 *    proveniens – raderna därifrån flaggas `u` och ritas med ≈ i gränssnittet.
 *
 * Bara arter som finns i appens dataset kommer med (matchning på kod
 * respektive visningsnamn, skiftlägesokänsligt – saven skriver LazyCatFish
 * där metadatan säger LazyCatfish, samma fälla som palsave.py hanterar).
 * Poster utan kvarvarande art faller bort. Skriv aldrig i drops.json för
 * hand – kör om det här skriptet.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SQL_URL = "https://raw.githubusercontent.com/stolenvw/pyPalworldAPI/main/mysqldb/PalAPI.sql";
const KB_URL = "https://raw.githubusercontent.com/beliarance/palworld-kb/main/data/items.json";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}
async function load(flag, url) {
  const local = arg(flag);
  if (local) return readFileSync(local, "utf8");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/* ---- Appens arter: kod → namn och namn → kod ---- */
const base = JSON.parse(readFileSync(path.join(ROOT, "data/pal-data.base.json"), "utf8"));
const codeToName = new Map();
const nameSet = new Map(); // lowercase namn → kanoniskt namn
for (const sp of base.species) {
  if (sp.name.startsWith("Unidentified")) continue;
  codeToName.set(sp.code.toLowerCase(), sp.name);
  nameSet.set(sp.name.toLowerCase(), sp.name);
}

/* ---- SQL-tolkning: en teckenautomat i stället för regex – fälten är
   citerade strängar fulla av kommatecken och \-escapade citattecken. ---- */
function* insertTuples(sql, table) {
  const marker = `INSERT INTO \`${table}\``;
  let at = 0;
  while ((at = sql.indexOf(marker, at)) >= 0) {
    let i = sql.indexOf("VALUES", at) + 6;
    let depth = 0, inQ = false, field = "", fields = [];
    for (; i < sql.length; i++) {
      const c = sql[i];
      if (inQ) {
        if (c === "\\") { field += sql[i + 1] === "n" ? "\n" : sql[i + 1]; i++; continue; }
        if (c === "'") { inQ = false; continue; }
        field += c;
        continue;
      }
      if (c === "'") { inQ = true; continue; }
      if (c === "(") { depth++; if (depth === 1) { fields = []; field = ""; } continue; }
      if (c === ")") {
        depth--;
        if (depth === 0) { fields.push(field.trim()); yield fields; field = ""; }
        continue;
      }
      if (c === "," && depth === 1) { fields.push(field.trim()); field = ""; continue; }
      if (c === ";" && depth === 0) break;
      if (depth >= 1) field += c;
    }
    at = i;
  }
}

const sql = await load("--sql", SQL_URL);
/* Kolumnindex ur INSERT-huvudet i stället för hårdkodade positioner. */
function columnIndex(table, col) {
  const head = sql.match(new RegExp(`INSERT INTO \\\`${table}\\\` \\(([^)]+)\\)`));
  const cols = head[1].split(",").map((s) => s.trim().replace(/\`/g, ""));
  const at = cols.indexOf(col);
  if (at < 0) throw new Error(`${table} saknar kolumnen ${col}`);
  return at;
}

/** kod (gemener) → [{Name,Min,Max,Rate}] */
function readDrops(table, devPrefix = "") {
  const iDev = columnIndex(table, "DevName");
  const iDrops = columnIndex(table, "Drops");
  const out = new Map();
  for (const f of insertTuples(sql, table)) {
    let dev = f[iDev];
    if (devPrefix) {
      if (!dev.toUpperCase().startsWith(devPrefix)) continue;
      dev = dev.slice(devPrefix.length);
    }
    let drops;
    try { drops = JSON.parse(f[iDrops] || "[]"); } catch { continue; }
    if (Array.isArray(drops) && drops.length) out.set(dev.toLowerCase(), drops);
  }
  return out;
}

const palDrops = readDrops("pals");
const bossDrops = readDrops("bosspals", "BOSS_");

/* ---- Bygg item → arter ---- */
/** item → Map(artnamn → {q, u}) */
const items = new Map();
function add(item, palName, min, max, rate, u) {
  /* Enstaka rader i dumpen saknar Name (trasig post) – hoppa, gissa inte. */
  if (!item || typeof item !== "string") return;
  const qty = max > 1 || min > 1 ? (min === max ? `x${min}` : `x${min}–${max}`) : "";
  const pct = rate < 100 ? `@${rate % 1 ? rate.toFixed(1) : rate}%` : "";
  const q = [qty, pct].filter(Boolean).join(" ") || null;
  const m = items.get(item) ?? new Map();
  if (!m.has(palName)) m.set(palName, { q, u });
  items.set(item, m);
}

const covered = new Set();
for (const [code, name] of codeToName) {
  const drops = palDrops.get(code);
  const boss = !drops ? bossDrops.get(code) : null;
  const rows = drops ?? boss;
  if (!rows) continue;
  covered.add(name.toLowerCase());
  for (const d of rows) add(d.Name, name, d.Min ?? 1, d.Max ?? 1, d.Rate ?? 100, !drops);
}

/* kb-utfyllnad för arter ingen SQL-tabell täcker. */
const kb = JSON.parse(await load("--kb", KB_URL));
const RX = /^Dropped by (.+?) x(\d+)(?:[–-](\d+))? \((\d+(?:\.\d+)?)%\)$/;
let kbRows = 0;
for (const it of kb.items) {
  for (const src of it.obtained_from ?? []) {
    const m = src.match(RX);
    if (!m) continue;
    const canon = nameSet.get(m[1].toLowerCase());
    if (!canon || covered.has(canon.toLowerCase())) continue;
    add(it.name, canon, Number(m[2]), Number(m[3] ?? m[2]), Number(m[4]), true);
    kbRows++;
  }
}

/* ---- Ut: vanligaste materialen först, säkra rader före ≈-rader ---- */
const out = [...items.entries()]
  .map(([item, pals]) => ({
    item,
    pals: [...pals.entries()]
      .sort((a, b) => (a[1].u ? 1 : 0) - (b[1].u ? 1 : 0) || a[0].localeCompare(b[0]))
      .map(([n, { q, u }]) => (u ? { n, q, u: true } : { n, q })),
  }))
  .sort((a, b) => b.pals.length - a.pals.length || a.item.localeCompare(b.item));

writeFileSync(path.join(ROOT, "src/lib/data/drops.json"), JSON.stringify(out, null, 1) + "\n");

const kbOnlySpecies = new Set(out.flatMap((d) => d.pals.filter((p) => p.u).map((p) => p.n)));
console.log(`ok: ${out.length} items, ${out.reduce((n, d) => n + d.pals.length, 0)} rader`
  + ` (${kbRows} ur kb för ${kbOnlySpecies.size} arter/bossrader)`);
const missing = [...codeToName.values()].filter((n) => !out.some((d) => d.pals.some((p) => p.n === n)));
if (missing.length) console.log(`arter helt utan drops-rad (${missing.length}): ${missing.join(", ")}`);
