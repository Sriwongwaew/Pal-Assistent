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
import { pairIndex } from "../src/lib/breeding";
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

const close = (a: number, b: number, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

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
    const used = new Set(plan.carriersUsed.map((p) => p.id));
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

  /* Bärarna är riktiga individer ur boxen, så en parning mellan två av dem
     måste vara ♂+♀. Planen rekommenderade tidigare två honor, eftersom
     partnern valdes enbart på renhet. */
  it("parar inte två kända individer av samma kön", () => {
    const honaA = pal(0, ["A"], "F");
    const honaB = pal(1, ["B"], "F");
    const haneB = pal(1, ["B"], "M");
    const plan = buildPassivePlan(data, [honaA, honaB, haneB], new Set([0, 1]), wanted, null);
    const first = plan.mergeSteps[0];
    assert.ok(first, "det ska finnas ett merge-steg");
    assert.ok(first!.a.pal && first!.b.pal, "steget parar två ägda bärare");
    assert.notEqual(first!.a.pal!.g, first!.b.pal!.g,
      `${first!.a.pal!.g} × ${first!.b.pal!.g} kan inte avla`);
    assert.equal(first!.genderOk, true);
  });

  it("flaggar steget när det bara finns ett kön att välja på", () => {
    const honaA = pal(0, ["A"], "F");
    const honaB = pal(1, ["B"], "F");
    const plan = buildPassivePlan(data, [honaA, honaB], new Set([0, 1]), wanted, null);
    assert.equal(plan.mergeSteps[0]!.genderOk, false,
      "två honor ska flaggas, inte tyst rekommenderas");
  });

  /* En unge ur ett tidigare steg har slumpat kön – då går det alltid att kläcka
     tills rätt kön dyker upp. Kostnaden syns i `genderEggs`, inte som ett
     omöjligt steg. */
  it("steg med en unge som förälder blockeras aldrig av kön", () => {
    const honaA = pal(0, ["A", "B"], "F");
    const haneC = pal(1, ["C"], "M");
    const honaC = pal(1, ["C"], "F");
    const plan = buildPassivePlan(data, [honaA, haneC, honaC], new Set([0, 1]), ["A", "B", "C"], null);
    for (const st of plan.mergeSteps) {
      if (st.a.pal && st.b.pal) continue;
      assert.equal(st.genderOk, true, "bara två kända individer kan ha könskrock");
    }
  });
});

/* Kärnan i fas 1: bärarna paras ihop PARVIS, inte en i taget.
 *
 * Kostnaden är konvex i poolens storlek – 1/0,6 = 1,67 ägg för två önskade ur en
 * ren pool, men 1/0,3 = 3,33 för tre. Sista steget kostar 1/0,1 = 10 ägg hur man
 * än kommer dit, så det enda som skiljer vägarna åt är vad man bygger på vägen:
 * en trea (dyr) eller en andra tvåa (billig). Facit nedan är handräknat ur just
 * det, inte hämtat ur implementationen. */
describe("buildPassivePlan – merge-trädet", () => {
  const owned = new Set([0, 1, 2]);

  it("parar ihop de två ensamma bärarna först, i stället för att bygga en trea", () => {
    // X bär två önskade; Y och Z bär varsin. X finns i båda könen, så steget
    // mot X kostar inget extra i kön.
    const x1 = pal(0, ["A", "B"], "F");
    const x2 = pal(0, ["A", "B"], "M");
    const y = pal(1, ["C"], "M");
    const z = pal(2, ["D"], "F");
    const plan = buildPassivePlan(data, [x1, x2, y, z], owned, ["A", "B", "C", "D"], null);

    assert.equal(plan.mergeSteps.length, 2, "två parningar räcker");
    const [first, second] = plan.mergeSteps;
    assert.deepEqual([...first!.haveAfter].sort(), ["C", "D"],
      "de ensamma bärarna slås ihop först – X sparas till sist");
    assert.ok(first!.a.pal && first!.b.pal, "första steget parar två ägda bärare");
    assert.equal(second!.a.pal === null || second!.b.pal === null, true,
      "andra steget använder ungen ur det första");

    //   C+D ur ren pool 2:  1 / 0,6 = 1,6667 ägg
    //   alla fyra ur pool 4: 1 / 0,1 = 10 ägg, kön gratis (X finns som ♂ och ♀)
    close(plan.mergeEggs, 1 / 0.6 + 1 / 0.1, 1e-9);
    // Den gamla linjära ordningen (X+C, sedan +D) hade kostat 3,33 + 10 + 3,33.
    assert.ok(plan.mergeEggs < 16.6, `${plan.mergeEggs} ägg – linjärt vore 16,67`);
  });

  it("fyra ensamma bärare möts på mitten, inte i en kedja", () => {
    const a = pal(0, ["A"], "M");
    const b = pal(1, ["B"], "F");
    const c = pal(2, ["C"], "M");
    const d = pal(0, ["D"], "F");
    const plan = buildPassivePlan(data, [a, b, c, d], owned, ["A", "B", "C", "D"], null);

    assert.equal(plan.mergeSteps.length, 3);
    const last = plan.mergeSteps[2]!;
    assert.equal(last.a.pal, null, "sista steget parar två ungar");
    assert.equal(last.b.pal, null, "sista steget parar två ungar");
    assert.equal(last.pool, 4, "poolen är exakt de fyra önskade");

    //   två tvåor:      2 × 1 / 0,6      = 3,3333
    //   sista steget:   1 / 0,1          = 10
    //   kön på den billigare ungen:        1,6667
    close(plan.mergeEggs, 2 / 0.6 + 1 / 0.1 + 1 / 0.6, 1e-9);
    // Kedjan (((A+B)+C)+D) hade kostat 1,67 + (3,33+1,67) + (10+3,33) = 20 ägg.
    assert.ok(plan.mergeEggs < 20, `${plan.mergeEggs} ägg – kedjan vore 20`);
  });

  /* Trädet väljs på HELA planen. Olika ihopslagningsordningar landar i olika
     arter, och fas 2 kostar väldigt olika mycket därifrån – så den ordning som
     är billigast i fas 1 kan vara dyrast totalt. Fixturen nedan är byggd så att
     de två vägarna går isär med bred marginal. */
  it("tar den dyrare ihopslagningen när den landar närmare målet", () => {
    // 7 arter: 0=X (bär A+B), 1=Y (C), 2=Z (D), 3–4 och 6 mellanled, 5 = målet.
    const many = Array.from({ length: 7 }, (_, i) => sp(`S${i}`));
    const pair = new Array(28).fill(-1);
    const set = (a: number, b: number, c: number) => { pair[pairIndex(7, a, b)] = c; };
    set(1, 2, 3);   // Y + Z          → 3
    set(0, 3, 4);   // X + (Y+Z)      → 4   billig i fas 1, men långt från målet
    set(1, 4, 5);   // 4 + Y          → 5   ett artsteg till
    set(0, 1, 6);   // X + Y          → 6
    set(2, 6, 5);   // (X+Y) + Z      → 5   dyrare i fas 1, men landar på målet
    const d = { ...data, species: many, pair } as unknown as AppData;

    const x = pal(0, ["A", "B"], "F");
    const y = pal(1, ["C"], "M");
    const z = pal(2, ["D"], "F");
    const plan = buildPassivePlan(d, [x, y, z], new Set([0, 1, 2]), ["A", "B", "C", "D"], 5);

    assert.equal(plan.lineSpecies, 5, "fas 1 ska landa på målarten");
    assert.equal(plan.speciesPhase?.length ?? 0, 0, "ingen artkedja behövs då");
    //   X+Y ur pool 3:  1 / 0,3                        = 3,3333
    //   + Z ur pool 4:  1 / 0,1 + kön på ungen (3,3333) = 13,3333
    close(plan.mergeEggs, 1 / 0.3 + 1 / 0.1 + 1 / 0.3, 1e-9);

    //   Den parvisa vägen: 1 / 0,6 + (1 / 0,1 + kön 1,6667) = 13,3333 i fas 1,
    //   men sedan ett artsteg ur ren pool till: + 1 / 0,1   = 23,3333 totalt.
    assert.ok(plan.mergeDetour, "omvägen ska förklaras, inte se ut som ett misstag");
    close(plan.mergeDetour!.cheapestEggs, 1 / 0.6 + 1 / 0.1 + 1 / 0.6, 1e-9);
    close(plan.mergeDetour!.saves, (1 / 0.6 + 1 / 0.1 + 1 / 0.6 + 1 / 0.1) - plan.mergeEggs, 1e-9);
  });

  it("skräp hos en bärare hamnar i poolen en gång, inte per förälder", () => {
    // Båda bärarna släpar med SAMMA skräp-passiv: poolen är unionen, alltså 3.
    const a = pal(0, ["A", "J1"], "M");
    const b = pal(1, ["B", "J1"], "F");
    const plan = buildPassivePlan(data, [a, b], owned, ["A", "B"], null);
    assert.equal(plan.mergeSteps.length, 1);
    assert.equal(plan.mergeSteps[0]!.pool, 3, "A + B + J1, inte A + B + J1 + J1");
  });
});
