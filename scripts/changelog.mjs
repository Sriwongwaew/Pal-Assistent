/**
 * CHANGELOG.md som enda källa för utgåvans text.
 *
 *   node scripts/changelog.mjs stamp          döper om "Ej släppt" till versionen
 *                                             i package.json och dagens datum
 *   node scripts/changelog.mjs notes 2.1.0    skriver ut just den versionens avsnitt
 *
 * `stamp` körs av npm som `version`-skript, alltså efter att package.json fått sitt
 * nya nummer men innan commiten görs – ändringen hamnar därmed i samma commit som
 * versionshöjningen. `notes` körs av utgåve-workflowen och blir utgåvans text.
 *
 * Båda **vägrar** när avsnittet är tomt. Det är hela poängen: en utgåva utan
 * noteringar är en utgåva ingen förstår, och det enda som säkert får någon att
 * skriva dem är att bygget stannar annars.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "CHANGELOG.md");

const UNRELEASED = "Ej släppt";

/** Rubriknivå 2 inleder ett avsnitt. Allt fram till nästa sådan hör till det. */
function sections(text) {
  const lines = text.split(/\r?\n/);
  const found = [];
  lines.forEach((line, index) => {
    if (line.startsWith("## ")) found.push({ title: line.slice(3).trim(), index });
  });
  return found.map((s, i) => ({
    ...s,
    // Kroppen är raderna efter rubriken fram till nästa rubrik (eller filslut).
    body: lines
      .slice(s.index + 1, found[i + 1]?.index ?? lines.length)
      .join("\n")
      .trim(),
  }));
}

/** "2.1.0 – 2026-08-15" och "[2.1.0] - ..." räknas båda som version 2.1.0. */
function versionOf(title) {
  const match = title.match(/^\[?(\d+\.\d+\.\d+[^\]\s]*)\]?/);
  return match ? match[1] : null;
}

function read() {
  try {
    return readFileSync(file, "utf8");
  } catch {
    console.error(`Hittar inte ${file}.`);
    process.exit(1);
  }
}

// ------------------------------------------------------------------- notes

function notes(wanted) {
  if (!wanted) {
    console.error("Ange vilken version: node scripts/changelog.mjs notes 2.1.0");
    process.exit(1);
  }
  const version = wanted.replace(/^v/i, "");
  const hit = sections(read()).find((s) => versionOf(s.title) === version);

  if (!hit) {
    console.error(
      `CHANGELOG.md saknar avsnitt för ${version}.\n` +
        "Lägg till det under rubriken \"## " + version + "\" och tagga om.",
    );
    process.exit(1);
  }
  if (!hit.body) {
    console.error(`Avsnittet för ${version} i CHANGELOG.md är tomt.`);
    process.exit(1);
  }

  process.stdout.write(hit.body + "\n");
}

// ------------------------------------------------------------------- stamp

function stamp() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const version = pkg.version;
  const text = read();
  const found = sections(text);

  if (found.some((s) => versionOf(s.title) === version)) {
    console.error(
      `CHANGELOG.md har redan ett avsnitt för ${version}. ` +
        "Flytta dina rader till \"Ej släppt\" om du menade att göra om utgåvan.",
    );
    process.exit(1);
  }

  const unreleased = found.find((s) => s.title === UNRELEASED);
  if (!unreleased) {
    console.error(`CHANGELOG.md saknar rubriken "## ${UNRELEASED}".`);
    process.exit(1);
  }
  if (!unreleased.body) {
    console.error(
      `Inga rader under "## ${UNRELEASED}" i CHANGELOG.md.\n` +
        "Skriv vad som ändrats för den som använder appen, så går utgåvan igenom.",
    );
    process.exit(1);
  }

  // Lokalt datum, inte UTC: en utgåva kvart över midnatt ska inte dateras igår.
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const lines = text.split(/\r?\n/);
  lines[unreleased.index] = `## ${UNRELEASED}\n\n## ${version} – ${date}`;
  writeFileSync(file, lines.join("\n"));

  console.log(`CHANGELOG.md: "${UNRELEASED}" blev ${version} – ${date}.`);
}

// --------------------------------------------------------------------------

const [command, argument] = process.argv.slice(2);
if (command === "stamp") stamp();
else if (command === "notes") notes(argument);
else {
  console.error("Användning: changelog.mjs stamp | notes <version>");
  process.exit(1);
}
