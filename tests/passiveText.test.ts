/* Beskrivningarna som hover-rutan visar.
 *
 * Det som kan gå sönder tyst här är täckningen: en passiv utan text ser ut som
 * vilken banner som helst ända tills någon hovrar över den. Testet kollar därför
 * hela datasetet mot tabellen, precis som `npm run passive-text` – men utan nät,
 * så det går i CI. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { describeEffects, PASSIVE_TEXT, passiveText, tierLabel } from "../src/lib/passiveText";
import type { AppData, PassiveDef } from "../src/lib/types";

const data = JSON.parse(readFileSync("data/pal-data.base.json", "utf8")) as AppData;

describe("PASSIVE_TEXT", () => {
  it("täcker varenda passiv i datasetet", () => {
    const missing = Object.keys(data.passives).filter((id) => !PASSIVE_TEXT[id]);
    assert.deepEqual(missing, [], `saknar text: ${missing.join(", ")}`);
  });

  it("har ingen text för ett id som inte finns kvar", () => {
    const stale = Object.keys(PASSIVE_TEXT).filter((id) => !data.passives[id]);
    assert.deepEqual(stale, [], `död text: ${stale.join(", ")}`);
  });

  it("skriver minus som minustecken, inte bindestreck", () => {
    // Ett bindestreck bland siffrorna ser ut som ett avstavat tal i Zen Kaku.
    const hyphen = Object.entries(PASSIVE_TEXT).filter(([, t]) => /-\d/.test(t));
    assert.deepEqual(hyphen.map(([id]) => id), []);
  });
});

describe("passiveText", () => {
  it("tar spelets text före den härledda", () => {
    // Serenity är hela poängen med tabellen: fx säger bara atk +10, men
    // passiven sänker dessutom laddningstiden 30 % – det står inte i fx alls.
    const def = data.passives.CoolTimeReduction_Up_1!;
    assert.equal(describeEffects(def.fx), "Attack +10 %");
    const got = passiveText("CoolTimeReduction_Up_1", def);
    assert.equal(got.fromGame, true);
    assert.match(got.text!, /−30 %/);
  });

  it("faller tillbaka på fx-raden för en passiv som saknar text", () => {
    const def: PassiveDef = { n: "Nykomling", r: 3, pal: true,
      fx: { atk: 20, craft: -50, move: 0, hp: 0, ele: 0, def: 0 } };
    const got = passiveText("Framtida_Passiv", def);
    assert.equal(got.fromGame, false);
    assert.equal(got.text, "Attack +20 % · Arbetshastighet −50 %");
  });

  it("ger null när varken text eller fx säger något", () => {
    const def: PassiveDef = { n: "Tom", r: 1, pal: true };
    assert.deepEqual(passiveText("Okand", def), { text: null, fromGame: false });
    assert.deepEqual(passiveText("Okand", undefined), { text: null, fromGame: false });
  });
});

describe("tierLabel", () => {
  it("följer bannerns egen indelning", () => {
    assert.equal(tierLabel(5), "World Tree");
    assert.equal(tierLabel(4), "Legendarisk");
    assert.equal(tierLabel(3), "Tier 3");
    assert.equal(tierLabel(1), "Tier 1");
    assert.equal(tierLabel(-3), "Negativ");
    assert.equal(tierLabel(0), "Okänd nivå");
  });
});
