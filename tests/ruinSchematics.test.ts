/* Ancient Ruins som schematic-källa.
 *
 * Kens fynd aug 2026: "vi saknar massor med schematics för t.ex. katis ringen."
 * Det var sant, och gapet var 71 rader — hela familjen legendariska tillbehör
 * (ringar, talismaner, batonger, visselpipor, pendanger). De var osynliga för
 * den förra granskningen av ett trivialt skäl: deras blueprint heter
 * "Katress Ring Schematic" UTAN sifferändelse, och granskningen sökte på
 * "Schematic 4".
 *
 * Raderna HÄRLEDS nu ur kartdatat i stället för att skrivas för hand: varje
 * Ancient Ruin-markör bär namnet på den schematic den ger. Testet bevakar det
 * som kan gå sönder tyst i den kedjan:
 *
 *   1. Att ruinlagret finns och bär `gives` (en tom generator ger noll rader
 *      utan att något ser trasigt ut — samma fälla som ranchikonerna).
 *   2. Att just tillbehören faktiskt kommer med, Katress Ring inräknad.
 *   3. Att koordinaten är rätt — verifierad mot paldb:s egen sida för
 *      schematicen, som anger (−1730, −990).
 *   4. Att böckerna INTE räknas som schematics, och att inget namn dubbleras
 *      mot den kurerade tabellen.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEGENDARY_SCHEMATICS } from "../src/lib/findData";
import { ruinSchematics, schemWhere } from "../src/lib/findIndex";
import { WORLD_MAP } from "../src/lib/worldmap";

const derived = ruinSchematics();

describe("Ancient Ruins som schematic-källa", () => {
  it("ruinlagret finns och varje ruin säger vad den ger", () => {
    assert.ok(WORLD_MAP.ruins.length >= 100, `bara ${WORLD_MAP.ruins.length} ruiner`);
    for (const r of WORLD_MAP.ruins) {
      assert.ok(r.gives.trim().length > 0, "ruin utan gives");
      assert.equal(typeof r.x, "number");
      assert.equal(typeof r.y, "number");
    }
  });

  it("härleder många schematics – en tom lista vore samma lucka som förut", () => {
    assert.ok(derived.length >= 85, `bara ${derived.length} härledda rader`);
  });

  it("Katress Ring finns, med paldb:s egen koordinat", () => {
    /* Stickprovet som gjorde metoden trovärdig: vår UE→spelkoordinat-transform
       och paldb:s egen sida för schematicen ger samma plats. */
    const katress = derived.find((s) => s.name === "Katress Ring Schematic");
    assert.ok(katress, "Katress Ring Schematic saknas");
    assert.equal(katress.kind, "ruin");
    assert.equal(katress.rate, "100 %");
    assert.equal(katress.sure, true);
    assert.ok(katress.coord, "koordinaten saknas");
    assert.equal(Math.round(katress.coord[0]), -1730);
    assert.equal(Math.round(katress.coord[1]), -990);
  });

  it("hela familjen tillbehör kom med, inte bara ringen", () => {
    const names = new Set(derived.map((s) => s.name));
    for (const want of [
      "Anubis's Talisman Schematic",
      "Jetragon's Talisman Schematic",
      "Blazehowl Ring Schematic",
      "Celestial Emperor's Baton Schematic",
      "Attack Pendant Schematic",
      "Ring of Fire Resistance Schematic",
      "Fire Support Whistle Schematic",
      "Phantom Ring Schematic",
      "Air Walker EX Schematic",
    ]) {
      assert.ok(names.has(want), `${want} saknas`);
    }
  });

  it("varje härledd rad löser ut sin egen plats", () => {
    for (const s of derived) {
      const where = schemWhere(s.spot);
      assert.ok(where, `${s.name}: schemWhere gav null`);
      assert.ok(where.spots.length > 0, `${s.name}: noll platser`);
    }
  });

  it("Applied Technique-böckerna är INTE schematics", () => {
    /* Ruinerna ger också arbetsböcker. De är verkliga och nyttiga, men de är
       inte ritningar och hör inte i schematics-kategorin. */
    assert.ok(WORLD_MAP.ruins.some((r) => /Applied .* Handbook/.test(r.gives)),
      "böckerna finns inte i ruindatat längre – har källan ändrats?");
    assert.equal(derived.filter((s) => /Handbook/.test(s.name)).length, 0);
    for (const s of derived) assert.match(s.name, / Schematic( \d+)?$/);
  });

  it("inget namn krockar med den kurerade tabellen", () => {
    /* Två rader med samma namn hade gett dubbletter i träfflistan och två
       olika källor för samma sak. */
    const curated = new Set(LEGENDARY_SCHEMATICS.map((s) => s.name));
    const clash = derived.filter((s) => curated.has(s.name)).map((s) => s.name);
    assert.deepEqual(clash, [], `krockar: ${clash.join(", ")}`);
  });

  it("de härledda raderna är sorterade och unika", () => {
    const names = derived.map((s) => s.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
    assert.equal(new Set(names).size, names.length, "dubblerade namn");
  });
});
