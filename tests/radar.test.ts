/* Boxens styrkeradar.
 *
 * Varje axel är "boxens bästa mot spelets tak", och facit nedan är handräknat
 * – en axel som räknar mot fel tak ser precis lika trovärdig ut som en riktig
 * på skärmen. Platshållar-arterna får aldrig höja taket: de går inte att äga,
 * så en 200-attack "Unidentified Pal" skulle sänka allas attackaxel utan att
 * någon kan göra något åt det. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { boxStrengths } from "../src/lib/radar";
import { CAP_RATE } from "../src/lib/breedRate";
import type { AppData, OwnedPal, Species } from "../src/lib/types";

const species = (name: string, extra: Partial<Species> = {}): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 0, noct: false, stom: 300, food: 5, deck: 1, desc: "",
  ...extra,
});

const data = {
  species: [
    species("Toppare", { sc: [200, 150, 100], ws: { Mining: 4 }, spr: 1000 }),   // 0: taket
    species("Mellis", { sc: [100, 75, 50], ws: { Mining: 2, Handcraft: 3 }, spr: 500 }), // 1
    species("Unidentified Pal", { sc: [999, 999, 999], spr: 9999 }),             // 2: platshållare
  ],
  passives: {}, pair: [], gendered: [], uniques: [], pals: [], player: "T", exported: "", palExp: [],
} as unknown as AppData;

let seq = 0;
const pal = (s: number): OwnedPal => ({
  id: `p${seq++}`, s, g: "F", lv: 50, iv: [50, 50, 50], pv: [], rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
});

describe("boxStrengths", () => {
  it("äger man mellanarten är axlarna halva taket", () => {
    const s = boxStrengths(data, [pal(1)], 0);
    assert.equal(s.attack, 50);   // 75 / 150
    assert.equal(s.defense, 50);  // 150 / 300
    assert.equal(s.mount, 50);    // 500 / 1000
    // Arbete: eget Mining 2 + Handcraft 3 = 5 mot taket Mining 4 + Handcraft 3 = 7.
    assert.equal(s.work, Math.round((5 / 7) * 100));
    // Paldeck: 1 av 2 riktiga arter – platshållaren räknas inte.
    assert.equal(s.deck, 50);
  });

  it("platshållaren höjer aldrig taket", () => {
    const s = boxStrengths(data, [pal(0)], 0);
    // Toppare ÄR taket i attack/försvar/sprint trots platshållarens 999:or.
    assert.equal(s.attack, 100);
    assert.equal(s.defense, 100);
    assert.equal(s.mount, 100);
  });

  it("avelstakten jämförs mot spelets absoluta tak", () => {
    const s = boxStrengths(data, [pal(0)], CAP_RATE);
    assert.equal(s.breed, 100);
    assert.equal(boxStrengths(data, [pal(0)], CAP_RATE / 2).breed, 50);
  });

  it("tom box är nollor, inte krasch", () => {
    const s = boxStrengths(data, [], 0);
    assert.deepEqual(
      [s.attack, s.defense, s.work, s.mount, s.deck],
      [0, 0, 0, 0, 0],
    );
  });
});
