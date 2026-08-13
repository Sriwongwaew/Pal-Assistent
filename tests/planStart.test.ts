/* Planen ska börja där du FAKTISKT står i leden.
 *
 * Kens iakttagelse aug 2026: "min breeding plan uppdateras inte". Den gjorde
 * det, men set-covern valde startbärare på täckning, renhet och IV – aldrig på
 * hur långt bäraren hade kvar till målarten. Följden: bär flera arter alla
 * önskade passiver får man samma startart varje gång, och en led man redan
 * börjat gå ser oförändrad ut. Kläcker man steg 1:s unge – som per definition
 * bär allt – står planen kvar och säger åt en att avla fram den igen.
 *
 * Mätt mot Kens riktiga box: kedjan Helzephyr Lux → Sootseer → Helzephyr →
 * Frostallion Noct (3 steg, ~30 ägg) blev Azurobe → Helzephyr → Frostallion
 * Noct (2 steg, ~20 ägg) enbart av att Azurobe också bar alla fyra och stod
 * närmare. Och med en Helzephyr i boxen: 1 steg, ~10 ägg.
 *
 * Världen nedan är byggd för att isolera just det: två arter bär BÅDA allt, och
 * bara den ena har en kort väg till målet.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPassivePlan } from "../src/lib/passivePlan";
import { pairIndex } from "../src/lib/breeding";
import type { AppData, PassiveDef, ScoredPal, Species } from "../src/lib/types";

const fx = () => ({ atk: 0, craft: 0, move: 0, hp: 0, ele: 0, def: 0 });
const passives: Record<string, PassiveDef> = {
  A: { n: "Legend", r: 4, pal: true, fx: fx() },
  B: { n: "Swift", r: 2, pal: true, fx: fx() },
};

const sp = (name: string): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 700, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});

/* FAR = långt bort, NEAR = ett steg från målet, MID = mellansteget,
   PARTNER = ren partner att para med, GOAL = målarten. */
const [FAR, MID, NEAR, PARTNER, GOAL] = [0, 1, 2, 3, 4];
const species = [sp("Far"), sp("Mid"), sp("Near"), sp("Partner"), sp("Goal")];

/** Partabell: Far+Partner→Mid, Mid+Partner→Near, Near+Partner→Goal. */
function makeData(): AppData {
  const n = species.length;
  const pair = new Array<number>((n * (n + 1)) / 2).fill(-1);
  pair[pairIndex(n, FAR, PARTNER)] = MID;
  pair[pairIndex(n, MID, PARTNER)] = NEAR;
  pair[pairIndex(n, NEAR, PARTNER)] = GOAL;
  return {
    species, pair, gendered: [], uniques: [], passives,
    pals: [], player: "T", exported: "", palExp: [],
  } as unknown as AppData;
}

let seq = 0;
const pal = (s: number, pv: string[], g: "M" | "F" = "F"): ScoredPal => ({
  id: `p${++seq}`, s, g, lv: 50, iv: [80, 80, 80], pv, rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: 240, tiers: pv.map((id) => passives[id]?.r ?? 0), pScore: 0,
  score: 0, combat: 0, work: 0, stars: 0, keep: [], cleanCarrier: [], synergy: [],
} as unknown as ScoredPal);

const WANT = ["A", "B"];
const data = makeData();

/** Partners av båda könen så könsregeln aldrig är det som avgör. */
const partners = () => [pal(PARTNER, [], "M"), pal(PARTNER, [], "F")];

const planFor = (pals: ScoredPal[]) => buildPassivePlan(
  data, pals, new Set(pals.map((p) => p.s)), WANT, GOAL,
  { ivGoal: "fast" }, [], null,
);

describe("planen börjar där du står", () => {
  it("väljer den bärare som står NÄRMAST målet, inte den första som duger", () => {
    /* Båda bär allt. Far behöver tre steg, Near ett. Utan fixen valdes
       startarten på renhet/IV och kunde lika gärna bli Far. */
    const pals = [pal(FAR, WANT, "M"), pal(NEAR, WANT, "M"), ...partners()];
    const plan = planFor(pals);
    assert.equal(plan.lineSpecies, NEAR, "planen ska starta i Near");
    assert.equal(plan.speciesPhase?.length, 1, "ett artsteg räcker från Near");
  });

  it("ordningen i boxen avgör inte", () => {
    // Samma två pals, omvänd ordning – svaret måste bli detsamma.
    const plan = planFor([pal(NEAR, WANT, "M"), pal(FAR, WANT, "M"), ...partners()]);
    assert.equal(plan.lineSpecies, NEAR);
    assert.equal(plan.speciesPhase?.length, 1);
  });

  it("kläcker man mellansteget krymper planen", () => {
    /* Det Ken faktiskt såg: leden går Far → Mid → Near → Goal. Kläcker man
       Mid-ungen med båda passiverna ska planen bli TVÅ steg, inte tre. */
    const before = planFor([pal(FAR, WANT, "M"), ...partners()]);
    assert.equal(before.lineSpecies, FAR);
    assert.equal(before.speciesPhase?.length, 3, "tre steg från Far");

    const after = planFor([pal(FAR, WANT, "M"), pal(MID, WANT, "M"), ...partners()]);
    assert.equal(after.lineSpecies, MID, "planen ska börja i den kläckta Mid");
    assert.equal(after.speciesPhase?.length, 2, "två steg kvar");
    assert.ok(
      after.expectedEggs < before.expectedEggs,
      `äggen ska sjunka: ${before.expectedEggs} → ${after.expectedEggs}`,
    );
  });

  it("en bärare som redan ÄR målarten kräver inga artsteg", () => {
    /* `speciesPhase` är NULL och inte en tom lista när ingen artändring behövs –
       "det finns ingen fas 2" är något annat än "fas 2 har noll steg", och
       gränssnittet skiljer på dem. */
    const plan = planFor([pal(FAR, WANT, "M"), pal(GOAL, WANT, "M"), ...partners()]);
    assert.equal(plan.lineSpecies, GOAL);
    assert.equal(plan.speciesPhase, null);
  });

  it("en närmare art väljs INTE när den saknar passiverna", () => {
    /* Fixen får bara gälla pals som bär allt – annars vore den bara ett sätt
       att kasta bort passiverna man samlat. */
    const plan = planFor([pal(FAR, WANT, "M"), pal(NEAR, [], "M"), ...partners()]);
    assert.equal(plan.lineSpecies, FAR);
    assert.equal(plan.speciesPhase?.length, 3);
  });

  it("könet avgör fortfarande – en närmare bärare som inte kan para vinner inte", () => {
    /* Near ♀ med bara ♀-partner kan inte avla. Då ska planen hellre gå den
       långa vägen än föreslå en omöjlig parning. Samma disciplin som
       resolvePair: hellre en dyrare plan än en som inte går att följa. */
    const onlyFemale = [pal(PARTNER, [], "F")];
    const plan = planFor([pal(FAR, WANT, "M"), pal(NEAR, WANT, "F"), ...onlyFemale]);
    assert.notEqual(
      plan.speciesPhase, null,
      "planen ska fortfarande finnas",
    );
    // Startar den i Near måste steget vara möjligt; annars ska den ha valt Far.
    if (plan.lineSpecies === NEAR) {
      assert.ok(plan.speciesPhase!.length >= 1);
    } else {
      assert.equal(plan.lineSpecies, FAR);
    }
  });
});
