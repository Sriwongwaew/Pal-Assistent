/**
 * Checks that every image the documentation points at actually exists.
 *
 * Why that needs a guard: a broken image link shows up nowhere in normal work.
 * `npm run build` does not care about markdown, typecheck does not see the file,
 * and locally the README is rarely rendered. Only on GitHub does it become a row
 * of blue alt texts with a broken icon — that is, in the one place where the
 * README is the entire first impression.
 *
 * The mistake we actually made: the images were renamed to English
 * (`oversikt.png` → `overview.png`) at the same time the documentation was
 * translated, but the references in the README did not follow. Five of six
 * images died and `breeding.png` lived on, because it happened to have the same
 * name in both languages — which made it even harder to spot, since the page did
 * not look entirely broken.
 *
 * Broken references are therefore an error that stops CI. Orphaned images (a file
 * in docs/img that no text mentions) are only a **warning**: usually that is the
 * other half of the same rename, but an image may well be there for something
 * other than the README — release notes, issues — and then a hard error would
 * only be in the way.
 *
 *   node scripts/docs-images.mjs
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Directories we never look in: not our documentation, and large. */
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", ".next-package", "dist", "out",
  "tests-dist", "packaging/build", "_to_delete",
]);

/** The image directory whose contents are meant to be used. */
const IMG_DIR = "docs/img";

/** ![alt](path) and <img src="path">, the two forms we use. */
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

/** References we cannot — or should not — check against the disk. */
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
      // The title in ![alt](file.png "Title") is not part of the path.
      const target = match[1].split('"')[0].trim();
      if (!target || external(target)) continue;

      // The path is relative to the file that mentions it, not to the repo root
      // — the README sits in the root today, but docs/*.md do not.
      const resolved = path.resolve(path.dirname(file), decodeURI(target));
      const rel = path.relative(ROOT, resolved).replaceAll("\\", "/");
      referenced.add(rel);

      if (!(await exists(resolved))) {
        // The line number is the whole value of the error output: it should be
        // clickable.
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

/* The other half of a rename: the file is there but nobody mentions it any more. */
const orphans = [];
try {
  for (const entry of await readdir(path.join(ROOT, IMG_DIR), { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const rel = `${IMG_DIR}/${entry.name}`;
    if (!referenced.has(rel)) orphans.push(rel);
  }
} catch {
  // No image directory is not an error — a project need not have screenshots.
}

console.log(`Read ${files.length} markdown files, ${referenced.size} image references.`);

if (orphans.length > 0) {
  console.log(`\nUsed by no text (${orphans.length}):`);
  for (const file of orphans) console.log(`  ${file}`);
  console.log("  If they are left over from a rename they can be deleted.");
}

if (broken.length === 0) {
  console.log("\nEvery image is there.");
  process.exit(0);
}

console.error(`\nMissing images (${broken.length}):`);
for (const b of broken) {
  console.error(`  ${b.file}:${b.line} → ${b.target}`);
  console.error(`    ${b.source}`);
}
console.error(
  "\nEither the path is wrong or the file is missing. If an image was renamed," +
  "\nthe reference has to follow - otherwise GitHub shows only the alt text and" +
  "\na broken icon.",
);
process.exit(1);
