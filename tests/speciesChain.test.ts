/* Fas 2 – artkedjan ska minimera ÄGG, inte antal steg.
 *
 * Buggen som föranledde testerna: `solveChain` är en BFS och tar alltid färst
 * steg. Den bryr sig inte om *vem* du parar med, men varje skräp-passiv partnern
 * bär hamnar i arvspoolen. I Kens box gav det Dogen + Aegidron (fyra passiver)
 * som första steg mot Renjishi: 1,7 % per ägg, ~59 ägg för det enda steget, när
 * en väg med ett steg till men rena partners kostade ~23 ägg totalt.
 *
 * Facit under är handräknat ur spelets tvåslagsmodell: X ∈ 1..4 med vikterna
 * 0,4/0,3/0,2/0,1, och hela poolen ärvs när X ≥ poolens storlek. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPassivePlan } from "../src/lib/passivePlan";
import type { AppData, PassiveDef, ScoredPal, Species } from "../src/lib/types";

const fx = () => ({ atk: 0, craft: 0, move: 0, hp: 0, ele: 0, def: 0 });
const passives: Record<string, PassiveDef> = {
  A: { n: "Artisan", r: 3, pal: true, fx: fx() },
  B: { n: "Work Slave", r: 1, pal: true, fx: fx() },
  C: { n: "Remarkable Craftsmanship", r: 4, pal: true, fx: fx() },
  J1: { n: "Skräp 1", r: 2, pal: true, fx: fx() },
  J2: { n: "Skräp 2", r: 2, pal: true, fx: fx() },
  J3: { n: "Skräp 3", r: 2, pal: true, fx: fx() },
};

const sp = (name: string): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 700, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});
/** 0 Linje, 1 Smutsig, 2 Ren, 3 Mellan, 4 Mål. */
const species = [sp("Linje"), sp("Smutsig"), sp("Ren"), sp("Mellan"), sp("Mal")];
const N = species.length;

/** Platt triangulär tabell, samma index som `pairIndex`. */
const pairTable = (entries: [number, number, number][]) => {
  const t = new Array<number>((N * (N + 1)) / 2).fill(-1);
  for (const [i, j, c] of entries) {
    const [a, b] = i <= j ? [i, j] : [j, i];
    t[a * N - (a * (a - 1)) / 2 + (b - a)] = c;
  }
  return t;
};

/* Två vägar från Linje till Mål:
 *   kort:  Linje + Smutsig      -> Mål        (1 steg)
 *   lång:  Linje + Ren -> Mellan, + Ren -> Mål (2 steg) */
const makeData = (): AppData => ({
  species,
  pair: pairTable([[0, 1, 4], [0, 2, 3], [2, 3, 4]]),
  gendered: [], uniques: [], passives,
  pals: [], player: "T", exported: "", palExp: [],
} as unknown as AppData);

let seq = 0;
const pal = (s: number, pv: string[], g: "M" | "F" = "F"): ScoredPal => ({
  id: `p${++seq}`, s, g, lv: 50, iv: [80, 80, 80], pv, rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: 240, tiers: pv.map((id) => passives[id]?.r ?? 0), pScore: 0,
  score: pv.reduce((n, id) => n + (passives[id]?.r ?? 0) * 10, 0),
  stars: 0, fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0, synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
});

const wanted = ["A", "B", "C"];
const owned = new Set([0, 1, 2]);
/* Alla tre önskade sitter på en enda pal, så fas 1 är tom och det enda som
   mäts är artkedjan. */
const linje = () => pal(0, ["A", "B", "C"]);

/* Handräknat, k = 3 önskade:
 *  Ren partner (0 skräp) → pool u = 3. Både X = 3 och X = 4 ärver hela poolen,
 *    alltså alla tre: odds = 0,2 + 0,1 = 0,30 = 30 %  →  3,333 ägg.
 *  Smutsig partner (3 skräp) → pool u = 6, och X når aldrig upp till poolen.
 *    X = 3: 0,2·C(3,0)/C(6,3) = 0,2/20  = 0,010
 *    X = 4: 0,1·C(3,1)/C(6,4) = 0,1·3/15 = 0,020
 *    odds = 0,03 = 3 %  →  33,33 ägg. */
const REN_ODDS = 0.3;
const REN_EGGS = 1 / 0.3;
const SMUTSIG_EGGS = 100 / 3;

describe("artkedjan väljer billigast i ägg, inte färst steg", () => {
  it("tar omvägen med rena partners framför genvägen med en smutsig", () => {
    const pals = [linje(), pal(1, ["J1", "J2", "J3"], "M"), pal(2, [], "M")];
    const plan = buildPassivePlan(makeData(), pals, owned, wanted, 4);

    assert.equal(plan.mergeSteps.length, 0, "fas 1 ska vara tom i det här uppstället");
    assert.ok(plan.speciesPhase, "ingen artkedja hittades");
    assert.deepEqual(
      plan.speciesPhase!.map((s) => [s.from, s.with, s.to]),
      [[0, 2, 3], [3, 2, 4]],
      "sökningen tog genvägen via den smutsiga partnern",
    );
    for (const st of plan.speciesPhase!) {
      assert.ok(Math.abs(st.odds - REN_ODDS) < 1e-9, `odds ${st.odds} ≠ 0,30`);
    }
    // 2 × 3,333 = 6,667 ägg mot 33,33 för det enda korta steget.
    assert.ok(Math.abs(plan.expectedEggs - 2 * REN_EGGS) < 1e-9,
      `totalen ${plan.expectedEggs} ≠ 6,67`);
  });

  it("redovisar vad genvägen hade kostat, så omvägen går att motivera", () => {
    const pals = [linje(), pal(1, ["J1", "J2", "J3"], "M"), pal(2, [], "M")];
    const plan = buildPassivePlan(makeData(), pals, owned, wanted, 4);
    assert.ok(plan.speciesPhaseShortcut, "genvägen ska redovisas när den är dyrare");
    assert.equal(plan.speciesPhaseShortcut!.steps, 1);
    assert.ok(Math.abs(plan.speciesPhaseShortcut!.eggs - SMUTSIG_EGGS) < 1e-9,
      `genvägen ${plan.speciesPhaseShortcut!.eggs} ≠ 33,33 ägg`);
  });

  it("tar genvägen när den korta partnern är lika ren – inga onödiga steg", () => {
    // Samma karta, men Smutsig bär inget skräp: 1 steg à 3,33 ägg slår 2 steg à 3,33.
    const pals = [linje(), pal(1, [], "M"), pal(2, [], "M")];
    const plan = buildPassivePlan(makeData(), pals, owned, wanted, 4);
    assert.deepEqual(plan.speciesPhase!.map((s) => [s.from, s.with, s.to]), [[0, 1, 4]]);
    assert.equal(plan.speciesPhaseShortcut, null, "ingen omväg togs – inget att motivera");
    assert.ok(Math.abs(plan.expectedEggs - REN_EGGS) < 1e-9);
  });

  it("en enda skräp-passiv hos partnern räcker inte för att motivera omvägen", () => {
    /* 1 skräp → u = 4: X = 3: 0,2·C(1,0)/C(4,3) = 0,05
     *                  X = 4: ärver hela poolen  = 0,10  → 0,15 → 6,667 ägg.
     * I den korrigerade modellen är det exakt lika med två rena steg
     * (2 × 3,333 = 6,667) – en skräp-passiv hos partnern kostar alltså precis
     * ett extra rent steg. Likheten bryts på färst steg, så genvägen vinner. */
    const pals = [linje(), pal(1, ["J1"], "M"), pal(2, [], "M")];
    const plan = buildPassivePlan(makeData(), pals, owned, wanted, 4);
    assert.deepEqual(plan.speciesPhase!.map((s) => [s.from, s.with, s.to]), [[0, 1, 4]]);
    assert.ok(Math.abs(plan.expectedEggs - 1 / 0.15) < 1e-9,
      `totalen ${plan.expectedEggs} ≠ 6,67`);
  });

  it("räknar in startpalens EGET skräp i första stegets odds", () => {
    /* Startpalen är en riktig pal ur boxen och bär det den bär – räknas bara de
       önskade blir första steget för optimistiskt. (Ken har just nu två Dogen med
       alla tre önskade *plus* en skräp-passiv, så det här är inte hypotetiskt.)
       Handräknat, linje = A,B,C,J1 + ren partner → pool u = 4:
         X = 3: 0,2·C(1,0)/C(4,3) = 0,05
         X = 4: ärver hela poolen  = 0,10   → 15 % → 6,667 ägg
       Steg 2 utgår från en kläckt, ren unge → tillbaka till 30 % = 3,333 ägg. */
    const pals = [
      pal(0, ["A", "B", "C", "J1"]),
      pal(1, ["J1", "J2", "J3"], "M"),
      pal(2, [], "M"),
    ];
    const plan = buildPassivePlan(makeData(), pals, owned, wanted, 4);
    assert.equal(plan.mergeSteps.length, 0);
    assert.equal(plan.speciesPhase!.length, 2);
    assert.ok(Math.abs(plan.speciesPhase![0]!.odds - 0.15) < 1e-9,
      `första steget ${plan.speciesPhase![0]!.odds} ≠ 15 %`);
    assert.ok(Math.abs(plan.speciesPhase![1]!.odds - REN_ODDS) < 1e-9,
      "andra steget ska utgå från en ren unge");
    assert.ok(Math.abs(plan.expectedEggs - (1 / 0.15 + REN_EGGS)) < 1e-9,
      `totalen ${plan.expectedEggs} ≠ 10,0`);
    // Genvägen delar J1 med linjen – poolen blir 6, inte 7. Unionen, inte summan.
    assert.ok(Math.abs(plan.speciesPhaseShortcut!.eggs - SMUTSIG_EGGS) < 1e-9,
      `genvägen ${plan.speciesPhaseShortcut!.eggs} ≠ 33,33 – skräp räknades dubbelt`);
  });

  it("väljer den renaste ägda individen av partnerarten", () => {
    // Två Ren-pals: en ren, en med två skräp. Den rena ska väljas – annars blir
    // kedjan dyrare än nödvändigt och genvägen skulle vinna på fel grunder.
    const pals = [
      linje(),
      pal(1, ["J1", "J2", "J3"], "M"),
      pal(2, ["J1", "J2"], "M"),
      pal(2, [], "M"),
    ];
    const plan = buildPassivePlan(makeData(), pals, owned, wanted, 4);
    assert.equal(plan.speciesPhase!.length, 2);
    for (const st of plan.speciesPhase!) {
      assert.deepEqual(st.partner?.pv, [], "planen tog en smutsigare partner än den behövde");
    }
  });
});
