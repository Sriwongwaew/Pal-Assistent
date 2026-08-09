/* Täckningskoll för passiv-beskrivningarna i src/lib/passiveText.ts.
 *
 * Texterna är spelets egna, översatta för hand – men datasetet regenereras
 * utanför repot, och en ny passiv syns då först när någon hovrar över den och
 * får "datasetet beskriver ingen effekt". Skriptet jämför tabellen mot den
 * aktuella datan och mot uppströms-l10n:en, och skriver ut färdiga rader att
 * klistra in för det som saknas.
 *
 *   node scripts/passive-text.mjs          – kolla mot data/pal-data.base.json
 *   node scripts/passive-text.mjs --offline – hoppa över nedladdningen
 *
 * Skriptet skriver aldrig i tabellen. Texten är gränssnittscopy på svenska och
 * ska läsas av en människa innan den hamnar i appen. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const L10N = "https://raw.githubusercontent.com/oMaN-Rod/palworld-save-pal"
  + "/main/data/json/l10n/en/passive_skills.json";

/** Datasetets passiver – base-filen, inte public/: den senare är gitignorerad. */
function datasetIds() {
  const data = JSON.parse(readFileSync(join(ROOT, "data/pal-data.base.json"), "utf8"));
  return Object.entries(data.passives).map(([id, def]) => ({ id, name: def.n, tier: def.r }));
}

/** Nycklarna i PASSIVE_TEXT. Läses ur källan i stället för att importeras –
 *  filen är TypeScript och skriptet ska gå att köra utan byggsteg. */
function tableIds() {
  const src = readFileSync(join(ROOT, "src/lib/passiveText.ts"), "utf8");
  const from = src.indexOf("export const PASSIVE_TEXT");
  // Måste sluta vid objektets egen avslutning: annars räknas FX_LABEL:s nycklar
  // och fälten i PassiveText som passiver, och skriptet rapporterar "atk" som
  // en text vars passiv försvunnit ur datasetet.
  const body = src.slice(from, src.indexOf("\n};", from));
  return new Set([...body.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]));
}

/** Spelets engelska beskrivning, utan dess egen märkning (<NumBlue_13>…</>). */
async function gameText() {
  if (process.argv.includes("--offline")) return null;
  try {
    const res = await fetch(L10N);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return new Map(Object.entries(json).map(([id, e]) =>
      [id, String(e.description ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()]));
  } catch (e) {
    console.warn(`Kunde inte hämta l10n (${e.message}) – kör vidare utan engelsk text.\n`);
    return null;
  }
}

const passives = datasetIds();
const table = tableIds();
const game = await gameText();

const missing = passives.filter((p) => !table.has(p.id));
const stale = [...table].filter((id) => !passives.some((p) => p.id === id));

if (missing.length) {
  console.log(`${missing.length} passiver saknar svensk text – klistra in i PASSIVE_TEXT:\n`);
  for (const p of missing) {
    console.log(`  // ${p.name} (tier ${p.tier}): ${game?.get(p.id) ?? "ingen engelsk text hittad"}`);
    console.log(`  ${p.id}: "",`);
  }
  console.log();
}
if (stale.length) {
  console.log(`${stale.length} texter pekar på id:n som inte finns i datasetet längre:`);
  for (const id of stale) console.log(`  ${id}`);
  console.log();
}
if (!missing.length && !stale.length) {
  console.log(`Alla ${passives.length} passiver har svensk text.`);
}
// exitCode, inte process.exit(): fetch-anropet kan ha en socket kvar att stänga,
// och en hård exit mitt i det ger ett libuv-assert på Windows.
process.exitCode = missing.length || stale.length ? 1 : 0;
