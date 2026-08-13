/* Metaradernas artkoder mot datasetet.
 *
 * Raderna slås upp mot `Species.code`, och en rad vars kod inte finns faller
 * TYST bort ur listan – så stod 10 av 16 rader skrivna som visningsnamn
 * ("Gobfin" i stället för "SharkKid") och sidan visade en tredjedel av metan
 * utan att något såg trasigt ut. Testet läser den statiska halvan som skeppas
 * (data/pal-data.base.json), så en felskriven kod stoppar bygget i stället. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { DEFENSE_META, SUPPORT_META } from "../src/lib/partnerMeta";
import { BUTCHER_ROWS } from "../src/lib/recoData";

/* Ur repo-roten, inte __dirname: testerna kompileras till tests-dist/ och
   körs därifrån, men `npm test` står alltid i roten. */
const base = JSON.parse(
  readFileSync(path.join(process.cwd(), "data", "pal-data.base.json"), "utf8"),
) as { species: { code: string }[] };
const codes = new Set(base.species.map((s) => s.code.toLowerCase()));

describe("partnerMeta", () => {
  it("varje stödrad pekar på en art som finns i datasetet", () => {
    for (const { code } of SUPPORT_META) {
      assert.ok(codes.has(code.toLowerCase()), `SUPPORT_META: okänd artkod ${code}`);
    }
  });

  it("varje försvarsrad pekar på en art som finns i datasetet", () => {
    for (const { code } of DEFENSE_META) {
      assert.ok(codes.has(code.toLowerCase()), `DEFENSE_META: okänd artkod ${code}`);
    }
  });

  it("varje slaktrad pekar på en art som finns i datasetet", () => {
    for (const { code, name } of BUTCHER_ROWS) {
      assert.ok(codes.has(code.toLowerCase()), `BUTCHER_ROWS: okänd artkod ${code} (${name})`);
    }
  });
});
