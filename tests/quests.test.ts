/* Uppdragens motståndslag.
 *
 * Domen ska mana till förberedelse, inte lova segrar – facit nedan är
 * handräknat mot de grova reglerna: REDO = minst två motståndare i nivå,
 * NÄSTAN = motelementet finns alls, RISK = det saknas helt. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickCounterSquad, weaknessesOf, QUEST_BOSSES, WEAK_TO } from "../src/lib/quests";
import type { AppData, ScoredPal, Species } from "../src/lib/types";

const species = (name: string, extra: Partial<Species> = {}): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 0, noct: false, stom: 300, food: 5, deck: 1, desc: "",
  ...extra,
});

const data = {
  species: [
    species("Jordi", { elements: ["Earth"] }),   // 0: motelement mot Electric
    species("Blöt", { elements: ["Water"] }),    // 1
    species("Neutral"),                          // 2
  ],
  passives: {}, pair: [], gendered: [], uniques: [], pals: [], player: "T", exported: "", palExp: [],
} as unknown as AppData;

let seq = 0;
const pal = (s: number, lv: number, combat: number): ScoredPal => ({
  id: `p${seq++}`, s, g: "F", lv, iv: [50, 50, 50], pv: [], rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  score: 0, combat, mount: 0, ivSum: 150, tiers: [], keep: false, reasons: [],
  misfit: [], synergy: null, cleanCarrier: [], soleCarrier: [], stars: 0, fxCraft: 0,
} as unknown as ScoredPal);

const rayne = QUEST_BOSSES.find((b) => b.id === "rayne")!; // Electric, nivå ~15

describe("weaknessesOf", () => {
  it("ett motelement per bosselement, utan dubbletter", () => {
    assert.deepEqual(weaknessesOf(rayne), ["Earth"]);
    const axel = QUEST_BOSSES.find((b) => b.id === "eternal")!; // Dragon + Electricity
    assert.deepEqual(weaknessesOf(axel), [WEAK_TO.Dragon, WEAK_TO.Electricity]);
  });
});

describe("pickCounterSquad", () => {
  it("REDO: två motståndare i nivå med bossen", () => {
    const squad = pickCounterSquad(data, [pal(0, 20, 900), pal(0, 18, 800), pal(1, 50, 999)], rayne);
    assert.equal(squad.verdict, "ready");
    // Motståndarna först, starkast först – vattenpalen är bara utfyllnad.
    assert.equal(squad.counters[0]!.combat, 900);
    assert.equal(squad.counters.every((p) => p.s === 0), true);
  });

  it("NÄSTAN: motelementet finns men nivån räcker inte", () => {
    const squad = pickCounterSquad(data, [pal(0, 5, 100), pal(2, 60, 2000)], rayne);
    assert.equal(squad.verdict, "close");
  });

  it("RISK: motelementet saknas helt – utfyllnaden är boxens starkaste", () => {
    const squad = pickCounterSquad(data, [pal(2, 60, 2000), pal(1, 40, 500)], rayne);
    assert.equal(squad.verdict, "risky");
    assert.equal(squad.counters.length, 0);
    assert.equal(squad.backup[0]!.combat, 2000);
  });

  it("samma individ står aldrig både som motståndare och utfyllnad", () => {
    const only = pal(0, 30, 700);
    const squad = pickCounterSquad(data, [only], rayne);
    assert.equal(squad.counters.length, 1);
    assert.equal(squad.backup.some((p) => p.id === only.id), false);
  });
});
