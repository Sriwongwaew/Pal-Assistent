/* Bygger om `pair` i data/pal-data.base.json – hela avelstabellen, Palworld 1.0.
 *
 *   node tools/build-pair-table.mjs [--src <breeding.json>] [--dry]
 *
 * VARFÖR DET HÄR SKRIPTET FINNS (aug 2026, Kens fynd)
 *
 * Den statiska halvan genereras utanför repot ur oMaN-Rod/palworld-save-pal,
 * och dess `child_to_parents_formula` räknar ALDRIG upp en art med
 * `ignore_combi: true` som FÖRÄLDER. Flaggan betyder "kan inte bli resultatet
 * av en parning" – den säger ingenting om att vara förälder. Följden i appen
 * var 12 326 par utan barn och ett påstående i gränssnittet som inte stämmer:
 * "legendarer avlar bara med sin egen art". De avlar med vad som helst; det man
 * inte kan är att FÅ en legendar ur ägget om inte båda föräldrarna är den.
 *
 * FORMELN, OCH VARFÖR VI VÅGAR RÄKNA SJÄLVA
 *
 *   mål  = floor((rankA + rankB + 1) / 2)
 *   barn = den art i formel-poolen vars combi_rank ligger närmast målet;
 *          vid lika avstånd vinner den HÖGRE rangen.
 *
 * Poolen är de 183 arter som faktiskt går att få ur formeln. Den härleds ur
 * källan i stället för att skrivas för hand: en art som bara förekommer i EN
 * formelrad är unik-kombo-material (elementvarianterna – Rayhound Cryst,
 * Smokie Cryst, Elphidran Aqua …), inte en formelträff. De ligger dessutom
 * tätt packade kring rank 1570–1650 mitt i spannet, så hade de hört till
 * poolen skulle de ha vunnit hundratals av källans egna rader. De vinner noll.
 *
 * Tie-breaken (högre rang) är inte gissad utan uppmätt: den är den enda av
 * varianterna som reproducerar KÄLLANS EGNA 33 853 formelpar utan ett enda
 * fel. `assertFormula` kör om den kontrollen vid varje bygge – glider källan
 * stannar skriptet i stället för att skriva en tabell full av påhittade barn.
 * Samma disciplin som kolumnkontrollen i build-item-info.mjs.
 *
 * TVÅ SORTERS RADER RÖRS ALDRIG
 *
 * 1. Unika kombos vinner över formeln (Frostallion + Helzephyr = Frostallion
 *    Noct, inte Wumpo Botan). Skriptet fyller bara tomma rutor och rör aldrig
 *    en befintlig – och kontrollerar dessutom att varje befintlig rad som INTE
 *    matchar formeln står med i källans unika lista.
 * 2. Fem arter har `combi_rank: 9999`, vilket är ett saknat värde och inte en
 *    rang: Dragostrophe, Boltmane och de tre platshållarna "Unidentified Pal".
 *    Med det talet blir målet ~5 000, alltså alltid poolens högsta art – ett
 *    räknefel förklätt till ett svar. De lämnas tomma. Att 304 − 5 = 299 är
 *    exakt antalet arter palbreeder.cc:s egen 1.0-kalkylator räknar med är ett
 *    kvitto på att gränsen ligger rätt.
 *
 * STICKPROVET SOM GJORDE METODEN TROVÄRDIG: med formeln ovan ger Frostallion
 * som förälder 72 olika arter räknat över alla 304 arter som partner.
 * palbreeder.com, en oberoende 1.0-kalkylator, skriver ordagrant "Frostallion
 * can also be used as a parent to produce 72 different Pals". Samma tal ur två
 * håll. (Tabellen vi skriver landar på 73 barn för Frostallion: fem partners
 * utan rang faller bort, och självparningen plus Frostallion Noct tillkommer.)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_URL =
  "https://raw.githubusercontent.com/oMaN-Rod/palworld-save-pal/main/data/json/breeding.json";
const BASE = path.join(ROOT, "data/pal-data.base.json");
const LIVE = path.join(ROOT, "public/data/pal-data.json");

/** `combi_rank` som betyder "okänd", inte en rang. Se filhuvudet. */
const NO_RANK = 9999;

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const dry = process.argv.includes("--dry");

async function loadSource() {
  const local = arg("--src");
  if (local) return JSON.parse(readFileSync(local, "utf8"));
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`${SRC_URL}: HTTP ${res.status}`);
  return res.json();
}

/* Samma index som `pairIndex` i src/lib/breeding.ts – platt övre triangel. */
const pairIndex = (n, i, j) => {
  if (i > j) [i, j] = [j, i];
  return i * n - (i * (i - 1)) / 2 + (j - i);
};

const src = await loadSource();
const info = src.pal_info;
const formula = src.child_to_parents_formula;
const base = JSON.parse(readFileSync(BASE, "utf8"));

/* ---- 1. Arterna måste vara samma på båda sidor ---- */
const missing = base.species.filter((s) => !info[s.code]);
if (missing.length) {
  throw new Error(
    `${missing.length} arter i bundlen saknas i källan (${missing
      .map((s) => s.code)
      .slice(0, 5)
      .join(", ")}…). Regenerera den statiska halvan först.`,
  );
}
const drift = base.species.filter((s) => info[s.code].combi_rank !== s.combi);
if (drift.length) {
  throw new Error(
    `combi_rank skiljer sig mellan bundlen och källan för ${drift.length} arter ` +
      `(${drift[0].name}: ${drift[0].combi} vs ${info[drift[0].code].combi_rank}). ` +
      "Tabellen skulle bli fel – regenerera den statiska halvan först.",
  );
}

/* ---- 2. Formel-poolen: arter som går att FÅ ur rangformeln ---- */
const pool = Object.keys(formula)
  .filter((code) => formula[code].length > 1 && !info[code].ignore_combi)
  .map((code) => ({ code, rank: info[code].combi_rank }))
  .sort((a, b) => a.rank - b.rank);
if (pool.length < 150) {
  throw new Error(`Formel-poolen blev bara ${pool.length} arter – källans form har ändrats.`);
}

/** Barnet av (a, b) enligt rangformeln, eller null när en rang saknas. */
function childOf(a, b) {
  const ra = info[a].combi_rank;
  const rb = info[b].combi_rank;
  if (ra >= NO_RANK || rb >= NO_RANK) return null;
  const target = Math.floor((ra + rb + 1) / 2);
  let best = null;
  let bestDist = Infinity;
  for (const p of pool) {
    const d = Math.abs(p.rank - target);
    /* <= och stigande rang: vid lika avstånd vinner den högre rangen. */
    if (d <= bestDist) {
      bestDist = d;
      best = p.code;
    }
  }
  return best;
}

/* ---- 3. Formeln måste reproducera källans egna rader, allihop ---- */
function assertFormula() {
  let checked = 0;
  const wrong = [];
  for (const [child, parents] of Object.entries(formula)) {
    if (info[child].ignore_combi || parents.length <= 1) continue; // unik-kombo-rader
    for (const p of parents) {
      checked++;
      const got = childOf(p.parent_a, p.parent_b);
      if (got !== child) wrong.push(`${p.parent_a} × ${p.parent_b} → ${got}, källan säger ${child}`);
    }
  }
  if (wrong.length) {
    throw new Error(
      `Formeln stämmer inte med källan i ${wrong.length} av ${checked} par:\n  ` +
        wrong.slice(0, 5).join("\n  ") +
        "\nSkriv INGEN tabell på den – räkna om tie-break och pool först.",
    );
  }
  return checked;
}
const checked = assertFormula();

/* ---- 4. Varje befintlig rad som avviker från formeln måste vara en unik kombo ---- */
const uniquePairs = new Set();
for (const u of src.unique_combos) uniquePairs.add([u.parent_a, u.parent_b].sort().join("|"));
for (const [child, parents] of Object.entries(src.child_to_parents_unique ?? {})) {
  void child;
  for (const p of parents) uniquePairs.add([p.parent_a, p.parent_b].sort().join("|"));
}

const n = base.species.length;
const codeOf = base.species.map((s) => s.code);
const nameOf = base.species.map((s) => s.name);
const table = base.pair.slice();
if (table.length !== (n * (n + 1)) / 2) {
  throw new Error(`pair-tabellen är ${table.length} lång, väntade ${(n * (n + 1)) / 2}.`);
}

const unexplained = [];
for (let i = 0; i < n; i++) {
  for (let j = i; j < n; j++) {
    const cur = table[pairIndex(n, i, j)];
    if (cur < 0) continue;
    const got = childOf(codeOf[i], codeOf[j]);
    if (got === codeOf[cur]) continue;
    if (uniquePairs.has([codeOf[i], codeOf[j]].sort().join("|"))) continue;
    /* Egen art × egen art för en `ignore_combi`-art ÄR regeln: de går bara att
       få av två av sig själva. Källan skriver de flesta av dem som unika
       kombos men inte alla – Panthalus, Astralym och platshållarna saknas där,
       så listan ensam räcker inte som förklaring. */
    if (i === j && info[codeOf[i]].ignore_combi && cur === i) continue;
    unexplained.push(`${nameOf[i]} × ${nameOf[j]} → ${nameOf[cur]} (formeln: ${got})`);
  }
}
if (unexplained.length) {
  throw new Error(
    `${unexplained.length} befintliga rader är varken formel eller unik kombo:\n  ` +
      unexplained.slice(0, 5).join("\n  ") +
      "\nFyll inte på en tabell vi inte förstår.",
  );
}

/* ---- 5. Fyll de tomma rutorna ---- */
const idxOfCode = new Map(codeOf.map((c, i) => [c, i]));
let filled = 0;
let stillEmpty = 0;
const gained = new Map(); // art → antal nya partners
for (let i = 0; i < n; i++) {
  for (let j = i; j < n; j++) {
    const at = pairIndex(n, i, j);
    if (table[at] >= 0) continue;
    const got = childOf(codeOf[i], codeOf[j]);
    if (got === null) {
      stillEmpty++;
      continue;
    }
    table[at] = idxOfCode.get(got);
    filled++;
    for (const s of new Set([i, j])) gained.set(s, (gained.get(s) ?? 0) + 1);
  }
}

/* ---- 6. Rapport ---- */
const before = base.pair.filter((c) => c >= 0).length;
console.log(`Källa: ${arg("--src") ?? SRC_URL}`);
console.log(`Formel-pool: ${pool.length} arter, verifierad mot ${checked} par ur källan.`);
console.log(`Par med barn: ${before} → ${before + filled} av ${table.length} (+${filled}).`);
console.log(`Kvar utan barn: ${stillEmpty} – par där en förälder saknar rang (combi_rank 9999).`);
const top = [...gained.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log("Störst förändring:");
for (const [s, c] of top) console.log(`  ${nameOf[s].padEnd(20)} +${c} partners`);

if (dry) {
  console.log("--dry: inget skrevs.");
  process.exit(0);
}

/* Basdatan är sanningen. Den levande bundlen bär Kens box och rörs bara i
   `pair` – annars vore det att slänga en inläsning för en tabelluppdatering. */
base.pair = table;
writeFileSync(BASE, JSON.stringify(base));
console.log(`Skrev ${path.relative(ROOT, BASE)}.`);
if (existsSync(LIVE)) {
  const live = JSON.parse(readFileSync(LIVE, "utf8"));
  if (live.species?.length === n) {
    live.pair = table;
    writeFileSync(LIVE, JSON.stringify(live));
    console.log(`Uppdaterade ${path.relative(ROOT, LIVE)} (bara pair – boxen orörd).`);
  } else {
    console.log(`HOPPADE ÖVER ${path.relative(ROOT, LIVE)}: annat antal arter. Läs in saven igen.`);
  }
}
