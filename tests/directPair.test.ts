/* Par vars unge ÄR målarten – fas 1 och fas 2 i en enda parning.
 *
 * Kens fall (aug 2026), mål Helzephyr Lux: han hade en Helzephyr ♀ med tre av de
 * önskade och en Beakon ♂ med de andra två, och `Helzephyr × Beakon → Helzephyr
 * Lux`. Ett steg, 10 ägg. Planeraren valde i stället en Digtoise som bar alla
 * fyra själv och två artsteg dit – 20 ägg. Orsaken var att set-covern minimerar
 * ANTAL bärare och körs före både merge-trädet och artkedjan: en bärare slår
 * alltid två, så paret kunde aldrig komma in i trädet.
 *
 * Facit nedan är handräknat ur spelets tvåslagsmodell (X ∈ 1..4 med vikterna
 * 0,4/0,3/0,2/0,1, hela poolen ärvs när X ≥ poolens storlek):
 *   inheritOdds(3, 3): X = 3 och X = 4 ärver båda hela poolen
 *                      → 0,2 + 0,1                       = 0,30 → 3,333 ägg
 *   inheritOdds(3, 5): X = 3: 0,2·C(2,0)/C(5,3) = 0,02
 *                      X = 4: 0,1·C(2,1)/C(5,4) = 0,04   → 0,06 → 16,667 ägg
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findDirectPairs } from "../src/lib/directPair";
import { buildPassivePlan } from "../src/lib/passivePlan";
import { pairIndex } from "../src/lib/breeding";
import type { AppData, GenderedCombo, PassiveDef, ScoredPal, Species } from "../src/lib/types";

const fx = () => ({ atk: 0, craft: 0, move: 0, hp: 0, ele: 0, def: 0 });
const passives: Record<string, PassiveDef> = {
  A: { n: "Legend", r: 4, pal: true, fx: fx() },
  B: { n: "Musclehead", r: 2, pal: true, fx: fx() },
  C: { n: "Serenity", r: 2, pal: true, fx: fx() },
  J1: { n: "Skräp 1", r: 2, pal: true, fx: fx() },
  J2: { n: "Skräp 2", r: 2, pal: true, fx: fx() },
};

const sp = (name: string): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 700, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});

/** 0 Digtoise (bär allt ensam), 1 partnerart, 2 Helzephyr, 3 Beakon, 4 mellanled, 5 = målet. */
const LONE = 0, MID = 1, HELZ = 2, BEAK = 3, STEP = 4, MAL = 5;
const species = [
  sp("Digtoise"), sp("Azurobe"), sp("Helzephyr"), sp("Beakon"), sp("Mellan"), sp("Helzephyr Lux"),
];
const N = species.length;

const pairTable = (entries: [number, number, number][]) => {
  const t = new Array<number>((N * (N + 1)) / 2).fill(-1);
  for (const [i, j, c] of entries) t[pairIndex(N, i, j)] = c;
  return t;
};

/* Två vägar till målet, och de ska gå att jämföra i ägg:
   – Digtoise ligger TVÅ artsteg bort (via mellanledet, partnerarten i båda).
   – Helzephyr × Beakon ger målet direkt, alltså noll artsteg. */
const makeData = (gendered: GenderedCombo[] = []): AppData => ({
  species,
  pair: pairTable([
    [HELZ, BEAK, MAL],
    [LONE, MID, STEP],
    [STEP, MID, MAL],
    [MAL, MAL, MAL],
  ]),
  gendered, uniques: [], passives,
  pals: [], player: "T", exported: "", palExp: [],
} as unknown as AppData);

let seq = 0;
const pal = (s: number, pv: string[], g: "M" | "F" | "?" = "F", iv = 80): ScoredPal => ({
  id: `p${++seq}`, s, g, lv: 50, iv: [iv, iv, iv], pv, rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: iv * 3, tiers: pv.map((id) => passives[id]?.r ?? 0), pScore: 0,
  score: pv.reduce((n, id) => n + (passives[id]?.r ?? 0) * 10, 0),
  stars: 0, fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0,
  synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
});

const wanted = ["A", "B", "C"];
const owned = new Set([LONE, MID, HELZ, BEAK]);
const prefs = { ivGoal: "fast" } as const;

const EGGS_POOL3 = 1 / 0.3;
const EGGS_POOL5 = 1 / 0.06;

/** Kens uppställning i miniatyr: en ensam bärare av allt, och paret. */
const kensBox = () => [
  pal(LONE, ["A", "B", "C"], "F"),
  pal(MID, [], "M"),               // ren partner för artstegen, båda könen
  pal(MID, [], "F"),
  pal(HELZ, ["A", "B"], "F"),      // ↓ paret: tillsammans allt, unge = målarten
  pal(BEAK, ["C"], "M"),
];

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

describe("findDirectPairs – uppräkningen som saknades", () => {
  it("hittar paret av olika art vars unge är målarten", () => {
    const found = findDirectPairs(makeData(), kensBox(), MAL, wanted, prefs);
    assert.equal(found.length, 1);
    const dp = found[0]!;
    assert.equal(dp.a.s, BEAK, "♂ först");
    assert.equal(dp.b.s, HELZ, "♀ sedan");
    assert.equal(dp.pool, 3, "poolen är exakt de önskade");
    assert.deepEqual(dp.poolJunk, []);
    close(dp.odds, 0.3);
  });

  it("kräver att båda bidrar med något den andra saknar", () => {
    /* Bär den ena redan allt är paret bara "ensam bärare + partner av en art som
       ger målet" – och det är precis vad fas 2:s första steg redan är. */
    const pals = [pal(HELZ, ["A", "B", "C"], "F"), pal(BEAK, ["A"], "M")];
    assert.deepEqual(findDirectPairs(makeData(), pals, MAL, wanted, prefs), []);
  });

  it("kräver att paret täcker ALLA önskade", () => {
    const pals = [pal(HELZ, ["A"], "F"), pal(BEAK, ["B"], "M")];
    assert.deepEqual(findDirectPairs(makeData(), pals, MAL, wanted, prefs), []);
  });

  it("parar aldrig två av samma kön, och aldrig ett okänt kön", () => {
    const same = [pal(HELZ, ["A", "B"], "F"), pal(BEAK, ["C"], "F")];
    assert.deepEqual(findDirectPairs(makeData(), same, MAL, wanted, prefs), []);
    const unknown = [pal(HELZ, ["A", "B"], "?"), pal(BEAK, ["C"], "M")];
    assert.deepEqual(findDirectPairs(makeData(), unknown, MAL, wanted, prefs), []);
  });

  it("bryr sig om vilket barn paret faktiskt ger", () => {
    // Samma två pals, men målet är mellanledet – det ger de inte.
    assert.deepEqual(findDirectPairs(makeData(), kensBox(), STEP, wanted, prefs), []);
  });

  /* Könsstyrda unika kombos ger olika barn åt olika håll. Att fråga vilka barn
     ARTPARET kan ge räcker därför inte – då hade planen påstått att en parning
     ger målarten fast spelets könsregel säger något annat. */
  it("respekterar könsstyrda kombos i stället för att gissa", () => {
    const combo: GenderedCombo[] = [{ a: HELZ, b: BEAK, c: MAL, ga: "Male", gb: "Female" }];
    const rightWay = [pal(HELZ, ["A", "B"], "M"), pal(BEAK, ["C"], "F")];
    const wrongWay = [pal(HELZ, ["A", "B"], "F"), pal(BEAK, ["C"], "M")];
    assert.equal(findDirectPairs(makeData(combo), rightWay, MAL, wanted, prefs).length, 1);
    assert.deepEqual(findDirectPairs(makeData(combo), wrongWay, MAL, wanted, prefs), [],
      "kombon gäller Helzephyr ♂ + Beakon ♀, inte omvänt");
  });

  /* "Hur avlar jag en TILL?" är den enda frågan där en förälder som redan bär
     allt är hela poängen med parningen. För huvudplanen vore samma par bara fas
     2:s första steg, så kravet står kvar där. */
  it("släpper subset-kravet bara när flaggan är satt", () => {
    const pals = [pal(MAL, ["A", "B", "C"], "F"), pal(MAL, ["A"], "M")];
    assert.deepEqual(findDirectPairs(makeData(), pals, MAL, wanted, prefs), [],
      "utan flaggan är paret bara en bärare med en passagerare");
    const found = findDirectPairs(makeData(), pals, MAL, wanted, prefs, 2, true);
    assert.equal(found.length, 1);
    assert.equal(found[0]!.pool, 3, "poolen är den färdiga palens tre");
    close(found[0]!.odds, 0.3);
  });

  /* Lika många ägg: föräldrar av MÅLARTEN vinner. Ingen oddsvinst – en praktisk,
     och det svar man förväntar sig när man har två av målarten som tillsammans
     bär allt (Kens rättning aug 2026). */
  it("föredrar föräldrar som redan är målarten vid lika odds", () => {
    const pals = [
      pal(HELZ, ["A", "B"], "F"),   // korsartat par: ger också målet, pool 3
      pal(BEAK, ["C"], "M"),
      pal(MAL, ["A", "B"], "F"),    // par av målarten: samma pool, samma renhet
      pal(MAL, ["C"], "M"),
    ];
    const found = findDirectPairs(makeData(), pals, MAL, wanted, prefs, 4);
    assert.equal(found.length, 2, "båda paren ska räknas upp");
    close(found[0]!.odds, found[1]!.odds);
    assert.equal(found[0]!.a.s, MAL, "målartens par först");
    assert.equal(found[0]!.b.s, MAL);
  });

  it("tar de renaste paren först", () => {
    const pals = [
      pal(HELZ, ["A", "B"], "F"),
      pal(BEAK, ["C"], "M"),
      pal(BEAK, ["C", "J1", "J2"], "M"),
    ];
    const found = findDirectPairs(makeData(), pals, MAL, wanted, prefs);
    assert.equal(found.length, 2);
    assert.equal(found[0]!.pool, 3, "det rena paret först");
    assert.equal(found[1]!.pool, 5);
  });
});

describe("buildPassivePlan – bärarvalet mäts i ägg, inte i bärare", () => {
  it("tar paret framför den ensamma bäraren när det blir billigare", () => {
    const plan = buildPassivePlan(makeData(), kensBox(), owned, wanted, MAL);

    assert.equal(plan.carriersUsed.length, 2, "två bärare, inte den ensamma");
    assert.deepEqual(plan.carriersUsed.map((p) => p.s).sort(), [HELZ, BEAK].sort());
    assert.equal(plan.mergeSteps.length, 1, "en enda parning");
    assert.equal(plan.lineSpecies, MAL, "som landar rakt på målarten");
    assert.equal(plan.speciesPhase?.length ?? 0, 0, "ingen artkedja efteråt");

    const step = plan.mergeSteps[0]!;
    assert.equal(step.childSpecies, MAL);
    assert.equal(step.pool, 3);
    assert.equal(step.possible, true);
    assert.equal(step.genderOk, true);
    close(step.eggs, EGGS_POOL3);
    close(plan.expectedEggs, EGGS_POOL3);

    /* Den gamla planen: Digtoise bar allt själv och låg två artsteg bort, båda
       med ren partner ur pool 3 → 2 × 3,333 = 6,667 ägg. Dubbelt så dyrt, och
       ett steg mer. */
    assert.ok(plan.expectedEggs < 2 * EGGS_POOL3 - 1e-9,
      `${plan.expectedEggs} ägg – den ensamma bäraren kostar 6,67`);
  });

  it("står kvar på den ensamma bäraren när paret är dyrare", () => {
    /* Beakon-hanen släpar med två skräp-passiver: poolen blir 5, alltså 16,667
       ägg för parningen mot 6,667 för artkedjan. Ett dyrare par är inte ett
       bättre bärarval. */
    const pals = [
      pal(LONE, ["A", "B", "C"], "F"),
      pal(MID, [], "M"),
      pal(MID, [], "F"),
      pal(HELZ, ["A", "B"], "F"),
      pal(BEAK, ["C", "J1", "J2"], "M"),
    ];
    const plan = buildPassivePlan(makeData(), pals, owned, wanted, MAL);
    assert.equal(plan.carriersUsed.length, 1);
    assert.equal(plan.carriersUsed[0]!.s, LONE);
    assert.equal(plan.mergeSteps.length, 0);
    assert.equal(plan.speciesPhase?.length, 2);
    close(plan.expectedEggs, 2 * EGGS_POOL3);
    assert.ok(plan.expectedEggs < EGGS_POOL5);
  });

  it("visar paret som alternativ när manuellt läge låser en annan pal", () => {
    /* Manuellt läge svarar på "vad kostar det att envisas med DEN HÄR?", så
       paret får inte tysta den frågan – men det ska stå kvar som förslag under
       planen, annars är hålet i uppräkningen bara flyttat. */
    const box = kensBox();
    const lone = box[0]!;
    const plan = buildPassivePlan(makeData(), box, owned, wanted, MAL, prefs, [], lone);

    assert.equal(plan.forced?.id, lone.id);
    assert.deepEqual(plan.carriersUsed.map((p) => p.id), [lone.id], "den låsta palen används");
    close(plan.expectedEggs, 2 * EGGS_POOL3);

    const alt = plan.alternatives.find((r) => r.a.s !== r.b.s);
    assert.ok(alt, "det korsartade paret ska föreslås");
    assert.equal(alt!.species, MAL, "vägen landar på målarten");
    assert.equal(alt!.chain.length, 0, "alltså ingen artkedja");
    assert.equal(alt!.cleanAssembly, true);
    close(alt!.totalEggs, EGGS_POOL3);
    close(alt!.saves, 2 * EGGS_POOL3 - EGGS_POOL3);
  });

  /* Har man redan avlat fram palen kostar planen noll ägg – rätt svar, men då
     finns ingen led att titta på, och vägen dit är ofta det man kom för. I läget
     `breedAnother` räknas den färdiga palen som FÖRÄLDER i stället för som svar.
     Första försöket lämnade i stället ut den ur boxen, och då föreslog planen en
     omväg via två andra arter fast paret stod i lådan (Kens rättning aug 2026). */
  describe("avla en till", () => {
    /* Den färdiga palen har högre IV än den ensamma bäraren i kensBox: annars
       vinner den senare set-covern på lika täckning och lika renhet, och då är
       planen inte "klar" utan en vanlig led. Det är precis så det ska vara – det
       är IV-målet som bryter lika bärare. */
    const box = () => [
      ...kensBox(),
      pal(MAL, ["A", "B", "C"], "F", 95),   // den färdiga: målarten, alla önskade
      pal(MAL, ["A"], "M"),                 // partnern man parar den med
    ];

    it("är klart – noll ägg – när frågan är vad målbilden kostar", () => {
      const plan = buildPassivePlan(makeData(), box(), owned, wanted, MAL);
      assert.equal(plan.expectedEggs, 0);
      assert.equal(plan.mergeSteps.length, 0);
      assert.equal(plan.lineSpecies, MAL);
    });

    it("parar den färdiga palen med det man har i stället för att lämna ut den", () => {
      const plan = buildPassivePlan(
        makeData(), box(), owned, wanted, MAL, prefs, [], null, { breedAnother: true },
      );
      assert.equal(plan.mergeSteps.length, 1, "en parning, inte noll och inte en omväg");
      const step = plan.mergeSteps[0]!;
      assert.equal(step.childSpecies, MAL);
      assert.deepEqual(plan.carriersUsed.map((p) => p.s), [MAL, MAL],
        "båda föräldrarna är målarten – inte Helzephyr × Beakon");
      assert.equal(step.pool, 3, "den färdiga palens tre, partnern lägger inget till");
      close(plan.expectedEggs, EGGS_POOL3);
    });

    it("flaggan gör aldrig planen tom när ingen parning finns", () => {
      // Bara den färdiga palen: ingen att para med, alltså står "klart" kvar.
      const pals = [pal(MAL, ["A", "B", "C"], "F")];
      const plan = buildPassivePlan(
        makeData(), pals, owned, wanted, MAL, prefs, [], null, { breedAnother: true },
      );
      assert.equal(plan.mergeSteps.length, 0);
      assert.equal(plan.expectedEggs, 0);
      assert.equal(plan.start?.s, MAL);
    });
  });

  it("föreslår inte paret som alternativ när planen redan står på det", () => {
    const plan = buildPassivePlan(makeData(), kensBox(), owned, wanted, MAL);
    assert.deepEqual(plan.alternatives, [],
      "ett par planen använder är inte ett 'du kan också'");
  });
});
