/**
 * CHANGELOG.md as the single source of the release text.
 *
 *   node scripts/changelog.mjs check          is there anything to release at all?
 *   node scripts/changelog.mjs bump           patch | minor | major
 *   node scripts/changelog.mjs stamp          renames "Unreleased" to the version
 *                                             in package.json and today's date
 *   node scripts/changelog.mjs notes 2.1.0    prints that version's section
 *
 * `check` runs as npm's `preversion`, `stamp` as `version`. The split exists for
 * a concrete reason: npm bumps package.json BEFORE `version` runs and does not
 * roll back when the script fails. With the whole check inside `stamp` the result
 * was a bumped but uncommitted number, and the next attempt skipped a version.
 * `preversion` runs before the bump, so stopping there leaves everything as it was.
 *
 * `notes` is run by the release workflow and becomes the release text.
 *
 * Both **refuse** when the section is empty. That is the whole point: a release
 * without notes is a release nobody understands, and the only thing that reliably
 * makes someone write them is the build stopping otherwise.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "CHANGELOG.md");

/** The heading in CHANGELOG.md. The file is English — users read it. */
const UNRELEASED = "Unreleased";

/**
 * The version step is written as `<!-- bump: minor -->` under "Unreleased".
 *
 * A comment and not a heading, for two reasons: it does not show up in the
 * rendered text users meet, and it can be left in place without anyone wondering
 * what it means. With no marker it is `patch`, which is the right guess for most
 * releases and the harmless choice when someone forgot.
 */
const BUMP_PATTERN = /<!--\s*bump:\s*(patch|minor|major)\s*-->/i;
/** Every HTML comment is stripped before the text becomes the release body. */
const COMMENTS = /<!--[\s\S]*?-->/g;

/** A level-2 heading starts a section. Everything up to the next one belongs to it. */
function sections(text) {
  const lines = text.split(/\r?\n/);
  const found = [];
  lines.forEach((line, index) => {
    if (line.startsWith("## ")) found.push({ title: line.slice(3).trim(), index });
  });
  return found.map((s, i) => ({
    ...s,
    // The body is the lines after the heading up to the next one (or end of file).
    body: lines
      .slice(s.index + 1, found[i + 1]?.index ?? lines.length)
      .join("\n")
      .trim(),
  }));
}

/** "2.1.0 – 2026-08-15" and "[2.1.0] - ..." both count as version 2.1.0. */
function versionOf(title) {
  const match = title.match(/^\[?(\d+\.\d+\.\d+[^\]\s]*)\]?/);
  return match ? match[1] : null;
}

function read() {
  try {
    return readFileSync(file, "utf8");
  } catch {
    console.error(`Cannot find ${file}.`);
    process.exit(1);
  }
}

// ------------------------------------------------------------------- notes

function notes(wanted) {
  if (!wanted) {
    console.error("Say which version: node scripts/changelog.mjs notes 2.1.0");
    process.exit(1);
  }
  const version = wanted.replace(/^v/i, "");
  const hit = sections(read()).find((s) => versionOf(s.title) === version);

  if (!hit) {
    console.error(
      `CHANGELOG.md has no section for ${version}.\n` +
        "Add it under the heading \"## " + version + "\" and tag again.",
    );
    process.exit(1);
  }
  if (!hit.body) {
    console.error(`The section for ${version} in CHANGELOG.md is empty.`);
    process.exit(1);
  }

  // Comments are instructions to ourselves, not to users. They must never end up
  // in the release body or in the app's "What's new?" box.
  const text = hit.body.replace(COMMENTS, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) {
    console.error(`The section for ${version} contains nothing but comments.`);
    process.exit(1);
  }

  process.stdout.write(text + "\n");
}

// ------------------------------------------------------------- check / stamp

/** Returns the "Unreleased" section, or stops with a message that explains itself. */
function unreleasedOrDie(found) {
  const unreleased = found.find((s) => s.title === UNRELEASED);
  if (!unreleased) {
    console.error(`CHANGELOG.md has no "## ${UNRELEASED}" heading.`);
    process.exit(1);
  }
  if (!unreleased.body) {
    console.error(
      `No lines under "## ${UNRELEASED}" in CHANGELOG.md.\n` +
        "Write what changed for the person using the app and the release will go through.",
    );
    process.exit(1);
  }
  return unreleased;
}

/** Is it worth a release? Comments do not count as content. */
function unreleasedText(found) {
  return unreleasedOrDie(found).body.replace(COMMENTS, "").trim();
}

function check() {
  const text = unreleasedText(sections(read()));
  if (!text) {
    console.error(
      `"## ${UNRELEASED}" contains nothing but comments - nothing to release.`,
    );
    process.exit(1);
  }
  const rows = text.split("\n").filter((line) => line.trim()).length;
  console.log(`"${UNRELEASED}" has ${rows} lines - ready to release.`);
}

/**
 * Which version step the release should take. Printed bare so a shell script can
 * use the answer directly; never write anything else to stdout here.
 *
 * Answers `none` when there is nothing to release — then the automatic release
 * should stand down, not fail. A week without changes is not an error.
 */
function bump() {
  const found = sections(read());
  const unreleased = found.find((s) => s.title === UNRELEASED);
  if (!unreleased || !unreleased.body.replace(COMMENTS, "").trim()) {
    process.stdout.write("none\n");
    return;
  }
  const match = unreleased.body.match(BUMP_PATTERN);
  process.stdout.write((match?.[1]?.toLowerCase() ?? "patch") + "\n");
}

function stamp() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const version = pkg.version;
  const text = read();
  const found = sections(text);

  if (found.some((s) => versionOf(s.title) === version)) {
    console.error(
      `CHANGELOG.md already has a section for ${version}. ` +
        "Move your lines to \"Unreleased\" if you meant to redo the release.",
    );
    process.exit(1);
  }

  const unreleased = unreleasedOrDie(found);

  // Local date, not UTC: a release a quarter past midnight should not be dated
  // yesterday.
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const lines = text.split(/\r?\n/);
  lines[unreleased.index] = `## ${UNRELEASED}\n\n## ${version} – ${date}`;

  // The marker applied to this release and must not be left in the released
  // section — next time it should be written afresh or left out.
  const kept = lines.filter((line) => !BUMP_PATTERN.test(line) || line.replace(BUMP_PATTERN, "").trim());
  writeFileSync(file, kept.join("\n"));

  console.log(`CHANGELOG.md: "${UNRELEASED}" became ${version} – ${date}.`);
}

// --------------------------------------------------------------------------

const [command, argument] = process.argv.slice(2);
if (command === "check") check();
else if (command === "bump") bump();
else if (command === "stamp") stamp();
else if (command === "notes") notes(argument);
else {
  console.error("Usage: changelog.mjs check | bump | stamp | notes <version>");
  process.exit(1);
}
