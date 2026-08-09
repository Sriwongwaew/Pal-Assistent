/* Beskrivningarna som hover-rutan visar.
 *
 * Det som kan gå sönder tyst här är täckningen: en passiv utan text ser ut som
 * vilken banner som helst ända tills någon hovrar över den. Testet kollar därför
 * hela datasetet mot tabellen, precis som `npm run passive-text` – men utan nät,
 * så det går i CI. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { translate } from "../src/i18n";
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
    assert.equal(describeEffects(def.fx, "sv"), "Attack +10 %");
    const got = passiveText("CoolTimeReduction_Up_1", def, "sv");
    assert.equal(got.fromGame, true);
    assert.match(got.text!, /−30 %/);
  });

  it("ger spelets egen text på läsarens språk", () => {
    const def = data.passives.Legend!;
    assert.match(passiveText("Legend", def, "sv").text!, /rörelsehastighet/);
    assert.match(passiveText("Legend", def, "en").text!, /Movement Speed/);
  });

  /* Katalogen faller tillbaka på engelska (se messages/en.ts) och passivtexten
     måste göra samma sak – annars vore japanskan den enda vyn i appen som
     plötsligt stod på svenska. */
  it("faller tillbaka på engelska för ett språk utan egen tabell", () => {
    const def = data.passives.Legend!;
    assert.equal(passiveText("Legend", def, "ja").text, passiveText("Legend", def, "en").text);
  });

  it("faller tillbaka på fx-raden för en passiv som saknar text", () => {
    const def: PassiveDef = { n: "Nykomling", r: 3, pal: true,
      fx: { atk: 20, craft: -50, move: 0, hp: 0, ele: 0, def: 0 } };
    const got = passiveText("Framtida_Passiv", def, "sv");
    assert.equal(got.fromGame, false);
    assert.equal(got.text, "Attack +20 % · Arbetshastighet −50 %");
    assert.equal(passiveText("Framtida_Passiv", def, "en").text, "Attack +20 % · Work speed −50 %");
  });

  /* Uppströms l10n färgar sina siffror med `<NumBlue_13>…</>`, och tjugo rader i
     den genererade engelska tabellen bar märkningen kvar – hover-rutan skrev ut
     den i klartext, bara på engelska, alltså standardspråket. Testet gäller hela
     datasetet och inte de tjugo raderna: filen görs om ur uppströms, så nästa
     omgång kan bära märkningen på helt andra rader. */
  it("visar aldrig spelets egen märkning", () => {
    const dirty = Object.keys(data.passives)
      .flatMap((id) => (["en", "sv"] as const).map((l) => [id, l, passiveText(id, data.passives[id], l).text] as const))
      .filter(([, , text]) => text !== null && /[<>]/.test(text));
    assert.deepEqual(dirty.map(([id, l]) => `${id} (${l})`), []);
  });

  it("faller tillbaka på fx-raden när texten bara är märkning", () => {
    // En rad som blir tom av tvätten är ingen beskrivning – då är fx bättre.
    const def: PassiveDef = { n: "Tom märkning", r: 3, pal: true,
      fx: { atk: 20, craft: 0, move: 0, hp: 0, ele: 0, def: 0 } };
    const got = passiveText("Framtida_Passiv", def, "en");
    assert.equal(got.fromGame, false);
    assert.equal(got.text, "Attack +20 %");
  });

  it("ger null när varken text eller fx säger något", () => {
    const def: PassiveDef = { n: "Tom", r: 1, pal: true };
    assert.deepEqual(passiveText("Okand", def), { text: null, fromGame: false });
    assert.deepEqual(passiveText("Okand", undefined), { text: null, fromGame: false });
  });
});

describe("tierLabel", () => {
  it("följer bannerns egen indelning", () => {
    const sv = (tier: number) => translate("sv", tierLabel(tier).key, tierLabel(tier).vars);
    assert.equal(sv(5), "World Tree");
    assert.equal(sv(4), "Legendarisk");
    assert.equal(sv(3), "Tier 3");
    assert.equal(sv(1), "Tier 1");
    assert.equal(sv(-3), "Negativ");
    assert.equal(sv(0), "Okänd nivå");
  });

  it("säger samma sak på engelska", () => {
    const en = (tier: number) => translate("en", tierLabel(tier).key, tierLabel(tier).vars);
    assert.equal(en(4), "Legendary");
    assert.equal(en(3), "Tier 3");
    assert.equal(en(-3), "Negative");
  });
});
