/* Bärarvalet i passiv-planen.
 *
 * Buggen som föranledde testerna: korten överst rangordnade bärare på `score`,
 * medan set-covern under valde efter täckning och renhet. Resultatet var att
 * appen pekade ut en pal (fyra passiver, varav två skräp) som planen sedan
 * aldrig rörde. `CLAUDE.md` varnar uttryckligen för att ranka föräldrar på
 * `score` – det belönar höga tiers och därmed de smutsigaste palsen. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPassivePlan } from "../src/lib/passivePlan";
import type { AppData, PassiveDef, ScoredPal, Species } from "../src/lib/types";

const fx = () => ({ atk: 0, craft: 0, move: 0, hp: 0, ele: 0, def: 0 });
const passives: Record<string, PassiveDef> = {
  A: { n: "Artisan", r: 3, pal: true, fx: fx() },
  B: { n: "Work Slave", r: 1, pal: true, fx: fx() },
  C: { n: "Remarkable Craftsmanship", r: 4, pal: true, fx: fx() },
  J1: { n: "Mine Foreman", r: 3, pal: true, fx: fx() },
  J2: { n: "Farmhand", r: 3, pal: true, fx: fx() },
};

const sp = (name: string): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 700, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});
const species = [sp("Woolipop"), sp("Beakon"), sp("Azurobe")];

/** Alla par kan avla och ger art 0 – artbytet är inte det som testas här. */
const data = {
  species, pair: new Array(6).fill(0), gendered: [], uniques: [], passives,
  pals: [], player: "T", exported: "", palExp: [],
} as unknown as AppData;

let seq = 0;
const pal = (s: number, pv: string[], g: "M" | "F" = "F", iv = 80): ScoredPal => ({
  id: `p${++seq}`, s, g, lv: 50, iv: [iv, iv, iv], pv, rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: iv * 3, tiers: pv.map((id) => passives[id]?.r ?? 0), pScore: 0,
  // score belönar tiers: den smutsiga palen får AVSIKTLIGT högst poäng här,
  // så testet faller om rangordningen någonsin går tillbaka till `score`.
  score: pv.reduce((n, id) => n + (passives[id]?.r ?? 0) * 10, 0),
  stars: 0, fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0, synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
});

const nameOf = (p: ScoredPal | null) => (p ? species[p.s]!.name : null);

describe("buildPassivePlan – vilken bärare pekas ut", () => {
  const wanted = ["A", "B", "C"];
  //  Woolipop täcker A+B men släpar med två skräp och har högst `score`.
  //  Beakon täcker A+B helt rent. Azurobe har C.
  const smutsig = pal(0, ["J1", "J2", "A", "B"]);
  const ren = pal(1, ["A", "B"], "M");
  const tredje = pal(2, ["C"]);
  const pals = [smutsig, ren, tredje];
  const owned = new Set([0, 1, 2]);

  it("väljer den rena bäraren, inte den med högst score", () => {
    const plan = buildPassivePlan(data, pals, owned, wanted, null);
    const info = plan.carrierInfo.find((c) => c.passiveId === "A")!;
    assert.equal(nameOf(info.chosen), "Beakon",
      `smutsig pal med högre score vann: ${nameOf(info.chosen)}`);
    assert.equal(nameOf(info.carriers[0] ?? null), "Beakon", "listan ska sorteras likadant");
  });

  it("kortet pekar ut samma individ som planen faktiskt använder", () => {
    const plan = buildPassivePlan(data, pals, owned, wanted, null);
    const used = new Set<string>([plan.start?.id ?? "", ...plan.mergeSteps.map((s) => s.carrier.id)]);
    for (const info of plan.carrierInfo) {
      if (!info.chosen) continue;
      assert.ok(used.has(info.chosen.id),
        `${data.passives[info.passiveId]?.n}: kortet visar en pal planen aldrig rör`);
    }
  });

  it("räknar hur många önskade samma individ täcker", () => {
    const plan = buildPassivePlan(data, pals, owned, wanted, null);
    assert.equal(plan.carrierInfo.find((c) => c.passiveId === "A")!.covers, 2);
    assert.equal(plan.carrierInfo.find((c) => c.passiveId === "C")!.covers, 1);
  });

  it("en pal som täcker två önskade rankas före en som täcker en", () => {
    const bara = pal(1, ["A"], "M");
    const plan = buildPassivePlan(data, [smutsig, bara, tredje], owned, wanted, null);
    const info = plan.carrierInfo.find((c) => c.passiveId === "A")!;
    assert.equal(info.covers, 2, "täckning ska väga tyngre än renhet");
  });

  it("passiv utan bärare flaggas i stället för att peka ut någon", () => {
    const plan = buildPassivePlan(data, [tredje], owned, wanted, null);
    const info = plan.carrierInfo.find((c) => c.passiveId === "A")!;
    assert.equal(info.chosen, null);
    assert.ok(plan.missing.includes("A"));
  });
});

describe("buildPassivePlan – kön", () => {
  const wanted = ["A", "B"];

  /* Startpalen är en riktig individ ur boxen, så FÖRSTA parningen sker mellan
     två kända pals och måste vara ♂+♀. Planen rekommenderade tidigare två honor,
     eftersom partnern valdes enbart på renhet. */
  it("första steget parar inte två av samma kön", () => {
    const honaA = pal(0, ["A"], "F");
    const honaB = pal(1, ["B"], "F");
    const haneB = pal(1, ["B"], "M");
    const plan = buildPassivePlan(data, [honaA, honaB, haneB], new Set([0, 1]), wanted, null);
    const first = plan.mergeSteps[0];
    assert.ok(first, "det ska finnas ett merge-steg");
    assert.notEqual(first!.carrier.g, plan.start!.g,
      `${plan.start!.g} × ${first!.carrier.g} kan inte avla`);
    assert.equal(first!.genderOk, true);
  });

  it("flaggar steget när det bara finns ett kön att välja på", () => {
    const honaA = pal(0, ["A"], "F");
    const honaB = pal(1, ["B"], "F");
    const plan = buildPassivePlan(data, [honaA, honaB], new Set([0, 1]), wanted, null);
    assert.equal(plan.mergeSteps[0]!.genderOk, false,
      "två honor ska flaggas, inte tyst rekommenderas");
  });

  /* Efter första kläckningen är linjen en unge vars kön är slumpat – då går det
     alltid att kläcka tills rätt kön dyker upp, så inget krav ska ställas. */
  it("senare steg ställer inget könskrav", () => {
    const honaA = pal(0, ["A", "B"], "F");
    const haneC = pal(1, ["C"], "M");
    const honaC = pal(1, ["C"], "F");
    const plan = buildPassivePlan(data, [honaA, haneC, honaC], new Set([0, 1]), ["A", "B", "C"], null);
    for (const st of plan.mergeSteps.slice(1)) {
      assert.equal(st.genderOk, true, "bara första steget har känt kön på båda sidor");
    }
  });
});
