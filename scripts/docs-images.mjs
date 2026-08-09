/**
 * Kontrollerar att varje bild dokumentationen pekar på faktiskt finns.
 *
 * Varför det behöver en spärr: en trasig bildlänk syns inte någonstans i det
 * vanliga arbetet. `npm run build` bryr sig inte om markdown, typecheck ser
 * inte filen, och lokalt renderas README sällan. Först på GitHub blir den en
 * radda blå alt-texter med sönderikon — alltså precis på det enda ställe där
 * README är hela förstaintrycket.
 *
 * Felet vi faktiskt gick på: bilderna döptes om till engelska
 * (`oversikt.png` → `overview.png`) i samma veva som dokumentationen
 * översattes, men referenserna i README följde inte med. Fem av sex bilder dog
 * och `breeding.png` levde vidare, eftersom den råkade heta likadant på båda
 * språken — vilket gjorde det ännu svårare att se, för sidan såg ju inte helt
 * trasig ut.
 *
 * Brutna referenser är därför ett fel som stoppar CI. Föräldralösa bilder (en
 * fil i docs/img som ingen text nämner) är bara en **varning**: det är oftast
 * andra halvan av samma omdöpning, men en bild kan mycket väl ligga där för
 * något annat än README — utgåvetexter, issues — och då vore ett hårt fel bara
 * i vägen.
 *
 *   node scripts/docs-images.mjs
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Mappar vi aldrig letar i: inte vår dokumentation, och stora. */
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", ".next-package", "dist", "out",
  "tests-dist", "packaging/build", "_to_delete",
]);

/** Bildmappen vars innehåll ska vara använt. */
const IMG_DIR = "docs/img";

/** ![alt](sökväg) och <img src="sökväg">, som är de två formerna vi använder. */
const MARKDOWN_IMG = /!\[[^\]]*\]\(([^)\s]+)/g;
const HTML_IMG = /<img[^>]+src="([^"]+)"/g;

async function markdownFiles(dir = ROOT) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || SKIP_DIRS.has(rel)) continue;
      out.push(...(await markdownFiles(full)));
    } else if (entry.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/** Referenser vi inte kan – eller ska – kontrollera mot disken. */
function external(target) {
  return /^(https?:|data:|mailto:|#|\/\/)/i.test(target);
}

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

const files = await markdownFiles();
const broken = [];
const referenced = new Set();

for (const file of files.sort()) {
  const text = await readFile(file, "utf8");
  const lines = text.split(/\r?\n/);

  for (const [pattern, kind] of [[MARKDOWN_IMG, "md"], [HTML_IMG, "html"]]) {
    for (const match of text.matchAll(pattern)) {
      // Titeln i ![alt](fil.png "Titel") är inte del av sökvägen.
      const target = match[1].split('"')[0].trim();
      if (!target || external(target)) continue;

      // Sökvägen är relativ mot filen som nämner den, inte mot repots rot –
      // README ligger i roten idag, men docs/*.md gör det inte.
      const resolved = path.resolve(path.dirname(file), decodeURI(target));
      const rel = path.relative(ROOT, resolved).replaceAll("\\", "/");
      referenced.add(rel);

      if (!(await exists(resolved))) {
        // Radnumret är hela värdet i felutskriften: det ska gå att klicka.
        const before = text.slice(0, match.index).split(/\r?\n/).length;
        broken.push({
          file: path.relative(ROOT, file).replaceAll("\\", "/"),
          line: before,
          target,
          kind,
          source: lines[before - 1]?.trim() ?? "",
        });
      }
    }
  }
}

/* Andra halvan av en omdöpning: filen finns men ingen nämner den längre. */
const orphans = [];
try {
  for (const entry of await readdir(path.join(ROOT, IMG_DIR), { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const rel = `${IMG_DIR}/${entry.name}`;
    if (!referenced.has(rel)) orphans.push(rel);
  }
} catch {
  // Ingen bildmapp är inget fel – projektet behöver inte ha skärmdumpar.
}

console.log(`Läste ${files.length} markdown-filer, ${referenced.size} bildreferenser.`);

if (orphans.length > 0) {
  console.log(`\nAnvänds inte av någon text (${orphans.length}):`);
  for (const file of orphans) console.log(`  ${file}`);
  console.log("  Ligger de kvar efter en omdöpning kan de tas bort.");
}

if (broken.length === 0) {
  console.log("\nAlla bilder finns.");
  process.exit(0);
}

console.error(`\nSaknade bilder (${broken.length}):`);
for (const b of broken) {
  console.error(`  ${b.file}:${b.line} → ${b.target}`);
  console.error(`    ${b.source}`);
}
console.error(
  "\nAntingen är sökvägen fel eller så saknas filen. Har en bild bytt namn ska" +
  "\nreferensen med – GitHub visar annars bara alt-texten och en sönderikon.",
);
process.exit(1);
