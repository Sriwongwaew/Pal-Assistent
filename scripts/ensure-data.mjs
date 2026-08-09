/**
 * Makes sure public/data/pal-data.json exists before the app is run or built.
 *
 * Why the file is split in two:
 *
 *   data/pal-data.base.json     version controlled. The static half only —
 *                               species, breeding table, passives, icons, EXP
 *                               table. `pals` is empty and `player` is "".
 *   public/data/pal-data.json   generated and gitignored. This is where
 *                               "Read from the game" writes YOUR box.
 *
 * Without that split your own save ends up in the repo on the first commit —
 * player name, every pal and where they stand. As it is you can import as much
 * as you like without `git status` so much as reacting.
 *
 * Runs automatically via predev/prebuild/prepackage. If the working file is
 * already there it is never touched.
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = join(root, "data", "pal-data.base.json");
const live = join(root, "public", "data", "pal-data.json");

if (existsSync(live)) {
  process.exit(0);
}

if (!existsSync(base)) {
  console.error(
    `Cannot find ${live} or ${base}.\n` +
      "Without the base data the app cannot start - fetch it from the repo again.",
  );
  process.exit(1);
}

mkdirSync(dirname(live), { recursive: true });
copyFileSync(base, live);
console.log("public/data/pal-data.json created from the base data (empty box).");
