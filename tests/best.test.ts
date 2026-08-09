/* Basgänget och ranchen.
 *
 * Båda testerna finns för fel som gick att se på skärmen men inte i koden:
 * en ranch-pal tog en lagplats för att den hade högst Farming-siffra, och en
 * pal som var bäst när laget var tomt satt kvar långt efter att två bättre
 * kommit in. Greedy-algoritmer ser alltid rimliga ut i efterhand.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickBaseCrew, ranchGuide } from "../src/lib/best";
import type { AppData, ScoredPal, Species } from "../src/lib/types";

const species = (name: string, ws: Species["ws"] = {}): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws, spr: 0, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});

const makeData = (list: Species[]): AppData => ({
  species: list, pair: [], gendered: [], uniques: [], passives: {},
  pals: [], player: "T", exported: "", palExp: [],
});

let seq = 0;
const pal = (s: number): ScoredPal => ({
  id: `p${seq++}`, s, g: "F", lv: 50, iv: [50, 50, 50], pv: [], rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: 150, tiers: [], pScore: 0, score: 0, stars: 0,
  fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0,
  synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
});

/** En pal per art, och `bestOf` som pekar på dem – som containern bygger den. */
function box(data: AppData) {
  const pals = data.species.map((_, i) => pal(i));
  return { pals, bestOf: new Map(pals.map((p) => [p.s, p] as const)) };
}

const nameOf = (data: AppData, crew: ScoredPal[]) =>
  crew.map((p) => data.species[p.s]!.name).sort();

describe("pickBaseCrew", () => {
  it("tar inte in en ranch-pal – Farming-nivån säger inget om varan", () => {
    const data = makeData([
      species("Blazamut", { Mining: 7 }),
      species("Dumud Gild", { MonsterFarm: 4, Watering: 2, Mining: 2 }),
      species("Neptilius", { Watering: 7 }),
    ]);
    const { pals, bestOf } = box(data);
    const crew = pickBaseCrew(data, pals, bestOf);
    assert.deepEqual(nameOf(data, crew), ["Blazamut", "Neptilius"]);
  });

  it("släpper den som inte längre toppar någon syssla", () => {
    /* Whalaska är bästa öppningsdraget (5 + 6 = 11 mot Neptilius 7), men när
       både Watering 7 och Cool 7 kommit in toppar den ingenting. */
    const data = makeData([
      species("Whalaska", { Watering: 5, Cool: 6 }),
      species("Neptilius", { Watering: 7 }),
      species("Frostallion", { Cool: 7 }),
    ]);
    const { pals, bestOf } = box(data);
    const crew = pickBaseCrew(data, pals, bestOf);
    assert.deepEqual(nameOf(data, crew), ["Frostallion", "Neptilius"]);
  });

  it("behåller den som är ensam om en syssla, hur låg nivån än är", () => {
    const data = makeData([
      species("Verdash", { Handcraft: 5, Collection: 5 }),
      species("Sparkit", { GenerateElectricity: 1 }),
    ]);
    const { pals, bestOf } = box(data);
    assert.deepEqual(nameOf(data, pickBaseCrew(data, pals, bestOf)), ["Sparkit", "Verdash"]);
  });

  it("tappar inte täckningen när två är lika bra", () => {
    // Ingen av dem är *bättre* än den andra på Cool – laget måste ändå ha en.
    const data = makeData([
      species("Whalaska", { Cool: 6 }),
      species("Pierdon Cryst", { Cool: 6 }),
    ]);
    const { pals, bestOf } = box(data);
    const crew = pickBaseCrew(data, pals, bestOf);
    assert.equal(crew.length, 1);
  });
});

describe("ranchGuide", () => {
  const data = makeData([
    species("Melpaca", { MonsterFarm: 2 }),
    species("Cremis", { MonsterFarm: 2, Collection: 1 }),
    species("Chikipi", { MonsterFarm: 1 }),
    species("Shroomer", { MonsterFarm: 3, Seeding: 3 }),
    species("Blazamut", { Mining: 7 }),
  ]);

  it("grupperar på varan, inte på nivån", () => {
    const wool = ranchGuide(data, new Set()).find((e) => e.item === "Wool");
    assert.ok(wool);
    assert.deepEqual(wool.producers.map((p) => data.species[p.s]!.name), ["Cremis", "Melpaca"]);
  });

  it("sätter den du äger först – nivån avgör bara mellan likar", () => {
    // Melpaca ägs, Cremis inte: ägd vinner trots samma nivå.
    const melpaca = data.species.findIndex((s) => s.name === "Melpaca");
    const wool = ranchGuide(data, new Set([melpaca])).find((e) => e.item === "Wool");
    assert.equal(data.species[wool!.producers[0]!.s]!.name, "Melpaca");
  });

  it("gissar aldrig en vara – arter utan rad hamnar i en egen grupp", () => {
    const entries = ranchGuide(data, new Set());
    const unknown = entries.find((e) => e.item === null);
    assert.ok(unknown, "Shroomer saknar vara i tabellen och måste synas som okänd");
    assert.deepEqual(unknown.producers.map((p) => data.species[p.s]!.name), ["Shroomer"]);
    // …och den gruppen ligger sist, för den är en lucka och inte ett råd.
    assert.equal(entries[entries.length - 1], unknown);
  });

  it("tar bara med arter som faktiskt har ranch", () => {
    const all = ranchGuide(data, new Set()).flatMap((e) => e.producers.map((p) => data.species[p.s]!.name));
    assert.ok(!all.includes("Blazamut"));
    assert.equal(all.length, 4);
  });
});
