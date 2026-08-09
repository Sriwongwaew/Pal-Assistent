/* Alternativa vägar – "du kan också göra såhär".
 *
 * Fallet som föranledde testerna är Kens egen box. `buildPassivePlan` gör en
 * greedy set cover som minimerar ANTAL BÄRARE, så när en enda pal täcker alla
 * önskade blir den start och fas 1 hoppas över. Men planen mäts i ägg: den
 * startpalen är en riktig individ, så första partnern måste ha motsatt kön, och
 * finns bara en smutsig sådan hamnar dess skräp i arvspoolen. Två *andra* ägda
 * pals som tillsammans bär precis de önskade – och inget mer – ger pool = k,
 * den bästa odds som går att få, och ligger dessutom ibland närmare målarten.
 *
 * Facit under är handräknat ur spelets tvåslagsmodell: X ∈ 1..4 med vikterna
 * 0,4/0,3/0,2/0,1, och **hela poolen ärvs när X ≥ poolens storlek**.
 *   inheritOdds(3, 3): X = 3 och X = 4 ärver båda hela poolen
 *                      → 0,2 + 0,1          = 0,30 = 30 %       → 3,333 ägg
 *   inheritOdds(3, 4): X = 3: 0,2·C(1,0)/C(4,3) = 0,05
 *                      X = 4: hela poolen      = 0,10
 *                      → 0,15 = 15 %                            → 6,667 ägg
 *   inheritOdds(3, 5): X = 3: 0,2·C(2,0)/C(5,3) = 0,02
 *                      X = 4: 0,1·C(2,1)/C(5,4) = 0,04
 *                      → 0,06 = 6 %                             → 16,667 ägg
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPassivePlan } from "../src/lib/passivePlan";
import type { AppData, PassiveDef, ScoredPal, Species } from "../src/lib/types";

const fx = () => ({ atk: 0, craft: 0, move: 0, hp: 0, ele: 0, def: 0 });
const passives: Record<string, PassiveDef> = {
  A: { n: "Artisan", r: 3, pal: true, fx: fx() },
  B: { n: "Work Slave", r: 1, pal: true, fx: fx() },
  C: { n: "Remarkable Craftsmanship", r: 4, pal: true, fx: fx() },
  J1: { n: "Serious", r: 2, pal: true, fx: fx() },
  J2: { n: "Skräp 2", r: 2, pal: true, fx: fx() },
};

const sp = (name: string): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 700, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});
/** 0 Venusa (bär allt), 1 Partner, 2 Botan (närmare målet), 3 Mellan, 4 Mål. */
const VENUSA = 0, PARTNER = 1, BOTAN = 2, MELLAN = 3, MAL = 4;
const species = [sp("Venusa"), sp("Partner"), sp("Botan"), sp("Mellan"), sp("Mal")];
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

/* Venusa ligger TRE steg från målet, Botan TVÅ. Självparningarna måste stå med:
   hopsamlingen bygger på att två av samma art ger samma art, och `findAltRoutes`
   slår upp det i pardatan i stället för att anta det. */
const makeData = (): AppData => ({
  species,
  pair: pairTable([
    [VENUSA, PARTNER, BOTAN],
    [BOTAN, PARTNER, MELLAN],
    [MELLAN, PARTNER, MAL],
    [VENUSA, VENUSA, VENUSA],
    [BOTAN, BOTAN, BOTAN],
    [PARTNER, PARTNER, PARTNER],
    [MELLAN, MELLAN, MELLAN],
    [MAL, MAL, MAL],
  ]),
  gendered: [], uniques: [], passives,
  pals: [], player: "T", exported: "", palExp: [],
} as unknown as AppData);

let seq = 0;
const pal = (s: number, pv: string[], g: "M" | "F" = "F"): ScoredPal => ({
  id: `p${++seq}`, s, g, lv: 50, iv: [80, 80, 80], pv, rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: 240, tiers: pv.map((id) => passives[id]?.r ?? 0), pScore: 0,
  score: pv.reduce((n, id) => n + (passives[id]?.r ?? 0) * 10, 0),
  stars: 0, fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0,
  synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
});

const wanted = ["A", "B", "C"];
const owned = new Set([VENUSA, PARTNER, BOTAN, MELLAN]);

const EGGS_POOL3 = 1 / 0.3;
const EGGS_POOL4 = 1 / 0.15;

/** Kens uppställning i miniatyr. Partnerarten bär J1, precis som Eidrolon. */
const kensBox = () => [
  pal(VENUSA, ["A", "B", "C"], "F"),   // täcker allt ensam → planens start
  pal(PARTNER, ["J1"], "M"),           // enda ♂ av partnerarten, bär skräp
  pal(BOTAN, ["A", "C"], "M"),         // ↓ de två som gör alternativet möjligt
  pal(BOTAN, ["B"], "F"),
];

describe("alternativ väg – tillägg, inte ersättning", () => {
  it("hittar hopsamlingen på arten närmare målet", () => {
    const plan = buildPassivePlan(makeData(), kensBox(), owned, wanted, MAL);

    // Planen står kvar oförändrad: Venusa täcker allt, så fas 1 är tom.
    assert.equal(plan.mergeSteps.length, 0);
    assert.equal(plan.start?.s, VENUSA, "huvudplanen ska inte skrivas om");
    assert.equal(plan.speciesPhase?.length, 3, "Venusa ligger tre steg från målet");

    assert.equal(plan.alternatives.length, 1, "Botan-vägen ska föreslås");
    const alt = plan.alternatives[0]!;
    assert.equal(alt.species, BOTAN);
    assert.equal(alt.a.g, "M", "föräldrarna ska vara ♂ först, ♀ sedan");
    assert.equal(alt.b.g, "F");
    assert.equal(alt.chain.length, 2, "Botan ligger två steg från målet");
  });

  it("räknar hopsamlingen och kedjan med handräknat facit", () => {
    const plan = buildPassivePlan(makeData(), kensBox(), owned, wanted, MAL);
    const alt = plan.alternatives[0]!;

    // A,C + B = exakt de tre önskade → pool 3 → 0,30 → 3,333 ägg.
    assert.equal(alt.pool, 3);
    assert.equal(alt.cleanAssembly, true);
    assert.deepEqual(alt.poolJunk, []);
    assert.ok(Math.abs(alt.odds - 0.3) < 1e-9, `hopsamlingen ${alt.odds} ≠ 0,30`);
    assert.ok(Math.abs(alt.assembleEggs - EGGS_POOL3) < 1e-9);

    // Båda kedjestegen går via partnerarten som bär J1 → pool 4 → 6,667 ägg.
    for (const st of alt.chain) assert.ok(Math.abs(st.odds - 0.15) < 1e-9);
    assert.ok(Math.abs(alt.totalEggs - (EGGS_POOL3 + 2 * EGGS_POOL4)) < 1e-9,
      `alternativet ${alt.totalEggs} ≠ 16,67`);

    // Huvudplanen: tre steg à pool 4 = 20 ägg. Vinsten är skillnaden.
    assert.ok(Math.abs(plan.expectedEggs - 3 * EGGS_POOL4) < 1e-9,
      `planen ${plan.expectedEggs} ≠ 20`);
    assert.ok(Math.abs(alt.saves - (plan.expectedEggs - alt.totalEggs)) < 1e-9);
    assert.ok(alt.saves > 3.3 && alt.saves < 3.4, `vinsten ${alt.saves} ≠ ~3,33 ägg`);
  });

  it("tiger när alternativet inte är billigare", () => {
    /* Samma karta, men Botan-honan släpar med två skräp-passiver: poolen blir 5
       (≈16,7 ägg) och hela vägen 30 ägg mot planens 20. Ett dyrare förslag är
       inte ett förslag. */
    const pals = [
      pal(VENUSA, ["A", "B", "C"], "F"),
      pal(PARTNER, ["J1"], "M"),
      pal(BOTAN, ["A", "C"], "M"),
      pal(BOTAN, ["B", "J1", "J2"], "F"),
    ];
    const plan = buildPassivePlan(makeData(), pals, owned, wanted, MAL);
    assert.deepEqual(plan.alternatives, []);
  });

  it("föreslår aldrig två av samma kön", () => {
    // Båda Botan är hanar – de kan inte avla, och då finns ingen hopsamling.
    const pals = [
      pal(VENUSA, ["A", "B", "C"], "F"),
      pal(PARTNER, ["J1"], "M"),
      pal(BOTAN, ["A", "C"], "M"),
      pal(BOTAN, ["B"], "M"),
    ];
    const plan = buildPassivePlan(makeData(), pals, owned, wanted, MAL);
    assert.deepEqual(plan.alternatives, [], "två hanar kan inte para sig");
  });

  it("föreslår inte arten planen redan bygger på", () => {
    /* Två Venusa som tillsammans täcker allt, utöver den som täcker allt ensam.
       Linjen står redan på Venusa – att "byta" dit vore inget alternativ. */
    const pals = [
      pal(VENUSA, ["A", "B", "C"], "F"),
      pal(VENUSA, ["A", "C"], "M"),
      pal(VENUSA, ["B"], "F"),
      pal(PARTNER, ["J1"], "M"),
    ];
    const plan = buildPassivePlan(makeData(), pals, owned, wanted, MAL);
    assert.ok(!plan.alternatives.some((a) => a.species === VENUSA));
  });

  it("markerar när skräp följer med in i poolen", () => {
    /* Botan-honan bär B + J1. Poolen blir 4 (A,C,B,J1) → 15 % → 6,667 ägg, och
       hela vägen 20 ägg — exakt lika med planen, alltså under tröskeln. Höjer vi
       däremot planens kostnad genom en smutsigare partnerart vinner den ändå,
       och då ska skräpet redovisas i stället för att tigas ihjäl. */
    const pals = [
      pal(VENUSA, ["A", "B", "C"], "F"),
      pal(PARTNER, ["J1", "J2"], "M"),   // pool 5 för planens steg → 16,667 ägg × 3
      pal(BOTAN, ["A", "C"], "M"),
      pal(BOTAN, ["B", "J1"], "F"),
    ];
    const plan = buildPassivePlan(makeData(), pals, owned, wanted, MAL);
    const alt = plan.alternatives[0]!;
    assert.ok(alt, "alternativet ska finnas när planen är dyrare");
    assert.equal(alt.pool, 4);
    assert.equal(alt.cleanAssembly, false, "poolen är inte ren – ungen kan få J1");
    assert.deepEqual(alt.poolJunk, ["J1"]);
  });

  it("inga alternativ utan mål-art", () => {
    const plan = buildPassivePlan(makeData(), kensBox(), owned, wanted, null);
    assert.deepEqual(plan.alternatives, []);
  });
});
