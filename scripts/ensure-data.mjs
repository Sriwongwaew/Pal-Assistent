/**
 * Ser till att public/data/pal-data.json finns innan appen körs eller byggs.
 *
 * Varför filen är delad i två:
 *
 *   data/pal-data.base.json     versionshanterad. Bara den statiska halvan –
 *                               arter, avelstabell, passiver, ikoner, EXP-tabell.
 *                               `pals` är tom och `player` är "".
 *   public/data/pal-data.json   genererad och gitignorerad. Det är hit
 *                               "Läs in från spelet" skriver DIN box.
 *
 * Utan den uppdelningen hamnar ens egen save i repot vid första commit – med
 * spelarnamn, alla pals och deras positioner. Nu kan man importera hur mycket
 * man vill utan att `git status` ens reagerar.
 *
 * Körs automatiskt via predev/prebuild/prepackage. Finns arbetsfilen redan rörs
 * den aldrig.
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
    `Hittar varken ${live} eller ${base}.\n` +
      "Utan grunddatan kan appen inte starta – hämta den från repot igen.",
  );
  process.exit(1);
}

mkdirSync(dirname(live), { recursive: true });
copyFileSync(base, live);
console.log("public/data/pal-data.json skapad ur grunddatan (tom box).");
