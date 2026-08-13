/* Boxens sökning.
 *
 * Det som gick sönder tyst här var täckningen: boxen sökte bara på artnamn,
 * smeknamn och passiver, medan art-väljaren i planeraren redan sökte på element
 * och Paldeck-nummer. "fire" gav alltså träffar i en vy och noll i en annan —
 * och noll träffar ser ut som "du äger inga eldpals", inte som en lucka. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  matchesPassives, meetsIvMins, palHaystack, palMatches, searchTerms,
} from "../src/lib/palSearch";
import type { AppData, OwnedPal, Species } from "../src/lib/types";

const species = (name: string, extra: Partial<Species> = {}): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 0, noct: false, stom: 300, food: 5, deck: 1, desc: "",
  ...extra,
});

const data = {
  species: [
    species("Foxparks", { elements: ["Fire"], ws: { EmitFlame: 1 }, deck: 29 }),
    species("Digtoise", { elements: ["Earth"], ws: { Mining: 3 }, deck: 134 }),
    species("Lamball", { deck: 0 }),  // dataset-lucka: 0 betyder "inget index"
  ],
  passives: {
    CraftSpeed_up2: { n: "Artisan", r: 3, pal: true },
    Legend: { n: "Legend", r: 4, pal: true },
  },
  pair: [], gendered: [], uniques: [], pals: [], player: "T", exported: "", palExp: [],
} as unknown as AppData;

let seq = 0;
const pal = (s: number, o: Partial<OwnedPal> = {}): OwnedPal => ({
  id: `p${seq++}`, s, g: "F", lv: 50, iv: [50, 50, 50], pv: [], rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  ...o,
});

const hit = (p: OwnedPal, q: string) => palMatches(palHaystack(data, p), searchTerms(q));

describe("searchTerms", () => {
  it("delar på blanksteg och struntar i tomrum", () => {
    assert.deepEqual(searchTerms("  fire   mining "), ["fire", "mining"]);
  });

  it("tomt fält ger inga termer alls – alltså inget filter", () => {
    assert.deepEqual(searchTerms("   "), []);
  });
});

describe("palMatches", () => {
  const foxparks = pal(0, { nick: "Elden", pv: ["CraftSpeed_up2"] });

  it("hittar på artnamn, oavsett skiftläge", () => {
    assert.equal(hit(foxparks, "FOXPARKS"), true);
  });

  it("hittar på smeknamn", () => {
    assert.equal(hit(foxparks, "elden"), true);
  });

  it("hittar på passivnamn", () => {
    assert.equal(hit(foxparks, "artisan"), true);
  });

  it("hittar på element – det som saknades i boxen", () => {
    assert.equal(hit(foxparks, "fire"), true);
    assert.equal(hit(pal(1), "fire"), false);
  });

  it("hittar på syssla, men bara den arten faktiskt har", () => {
    assert.equal(hit(pal(1), "mining"), true);
    // Foxparks har Kindling, inte Mining. Matchade vi hela WORK_TYPES skulle
    // "mining" släppa igenom varenda pal och filtret se ut att fungera.
    assert.equal(hit(foxparks, "mining"), false);
  });

  it("hittar på Paldeck-nummer, exakt och inte som delsträng", () => {
    assert.equal(hit(pal(1), "134"), true);
    // 13 är inte 134 – annars blir varje nummer också ett prefixfilter.
    assert.equal(hit(pal(1), "13"), false);
  });

  it("matchar aldrig ett nummer när arten saknar Paldeck-index", () => {
    // deck 0 betyder "inget index", inte nummer noll (se DeckNo i PalBits).
    assert.equal(hit(pal(2), "0"), false);
  });

  it("flera termer är OCH, inte ELLER", () => {
    // Foxparks är Fire OCH kan Kindling – men kan inte bryta.
    assert.equal(hit(foxparks, "fire kindling"), true);
    assert.equal(hit(foxparks, "fire mining"), false);
  });

  it("utan termer matchar allt", () => {
    assert.equal(hit(foxparks, ""), true);
  });

  it("en art som inte finns i datan kraschar inte, den matchar bara inget", () => {
    assert.equal(hit(pal(99), "fire"), false);
  });
});

describe("matchesPassives", () => {
  const pv = ["Legend", "CraftSpeed_up2"];

  it("tomt val är inget filter", () => {
    assert.equal(matchesPassives(pv, [], "all"), true);
    assert.equal(matchesPassives([], [], "any"), true);
  });

  it("ALLA kräver hela uppsättningen", () => {
    assert.equal(matchesPassives(pv, ["Legend", "CraftSpeed_up2"], "all"), true);
    // En avelsförälder som bara bär halva uppsättningen är inte svaret på frågan.
    assert.equal(matchesPassives(pv, ["Legend", "Swift"], "all"), false);
  });

  it("NÅGON nöjer sig med en", () => {
    assert.equal(matchesPassives(pv, ["Legend", "Swift"], "any"), true);
    assert.equal(matchesPassives(pv, ["Swift"], "any"), false);
  });
});

describe("meetsIvMins", () => {
  it("0 betyder inget krav – standardläget filtrerar ingenting", () => {
    assert.equal(meetsIvMins([1, 2, 3], [0, 0, 0]), true);
  });

  it("tröskeln gäller per stat och är ≥, inte >", () => {
    assert.equal(meetsIvMins([90, 50, 50], [90, 0, 0]), true);
    assert.equal(meetsIvMins([89, 100, 100], [90, 0, 0]), false);
  });

  it("flera trösklar är OCH – som resten av filtren", () => {
    assert.equal(meetsIvMins([90, 95, 40], [90, 90, 0]), true);
    assert.equal(meetsIvMins([90, 85, 100], [90, 90, 0]), false);
  });
});
