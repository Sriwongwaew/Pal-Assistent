/* Sannolikhetsmatematiken i avelsplaneraren.
 *
 * De här funktionerna är rena och lätta att testa, och det är precis där fel
 * blir dyra: en felaktig siffra ser lika trovärdig ut som en riktig. Facit är
 * handräknat i varje test, inte kopierat ur implementationen. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planPerfectLine, statOddsFromHas } from "../src/lib/perfectPlan";
import { exactOdds, inheritOdds, RANDOM_EXTRA_ODDS } from "../src/lib/breeding";
import { condenseReach } from "../src/lib/scoring";
import type { ScoredPal } from "../src/lib/types";

/** Minimal ScoredPal – bara fälten planeraren faktiskt läser. */
let seq = 0;
const pal = (iv: [number, number, number], g: "M" | "F", pv: string[] = []): ScoredPal => ({
  id: `p${++seq}`, s: 0, g, lv: 50, iv, pv, rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: iv[0] + iv[1] + iv[2], tiers: [], pScore: 0, score: 0, stars: 0,
  fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0, synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
});

const close = (a: number, b: number, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

describe("statOddsFromHas – 30/30/40-modellen", () => {
  const REROLL = 0.4 / 101;

  it("ingen förälder har 100 → bara omslumpningen", () => {
    close(statOddsFromHas(false, false), REROLL);
  });

  it("en förälder har 100 → 30 % + omslumpningen", () => {
    close(statOddsFromHas(true, false), 0.3 + REROLL);
    close(statOddsFromHas(false, true), 0.3 + REROLL);
  });

  it("båda har 100 → 60 %, alltså dubbelt mot en", () => {
    close(statOddsFromHas(true, true), 0.6 + REROLL);
  });
});

/* Spelets tvåslagsmodell (Palworld-wikin, "Breeding"):
 *   X ∈ 1..4 med 0,4/0,3/0,2/0,1 → så många ärvs ur poolen, eller HELA poolen
 *   om X ≥ poolens storlek. Sedan Y med samma vikter; är Y > X får ungen Y−X
 *   helt slumpade passiver. Facit nedan är handräknat ur just det. */
describe("inheritOdds – ärver ungen alla önskade?", () => {
  it("noll önskade passiver är alltid uppfyllt", () => {
    close(inheritOdds(0, 0), 1);
    close(inheritOdds(0, 5), 1);
  });

  it("kan inte ärva fler önskade än poolen innehåller", () => {
    close(inheritOdds(3, 2), 0);
  });

  it("en pool på 1 ärvs alltid – varje X ≥ 1 tar hela poolen", () => {
    close(inheritOdds(1, 1), 1);
  });

  it("ren pool: X större än poolen kastas inte bort", () => {
    // u = k, alltså ärvs allt så fort X ≥ u. Summan är vikterna från k och upp.
    close(inheritOdds(2, 2), 0.3 + 0.2 + 0.1);
    close(inheritOdds(3, 3), 0.2 + 0.1);
    close(inheritOdds(4, 4), 0.1);
  });

  it("smutsig pool: dragningen måste råka få med alla önskade", () => {
    // X = 3: 0,2·C(1,0)/C(4,3) = 0,05 · X = 4 tar hela poolen: 0,10
    close(inheritOdds(3, 4), 0.15);
    // X = 3: 0,2·C(2,0)/C(5,3) = 0,02 · X = 4: 0,1·C(2,1)/C(5,4) = 0,04
    close(inheritOdds(3, 5), 0.06);
    // X = 2: 0,3·C(1,0)/C(3,2) = 0,1 · X = 3 och 4 tar hela poolen: 0,3
    close(inheritOdds(2, 3), 0.4);
  });

  it("skräp i poolen späder ut oddsen", () => {
    const clean = inheritOdds(2, 2);
    const dirty = inheritOdds(2, 4);
    assert.ok(dirty < clean, `${dirty} < ${clean}`);
  });
});

describe("exactOdds – får ungen PRECIS de önskade?", () => {
  it("slumpslaget är det enda som kan smutsa ner en ren pool", () => {
    // u = k = 3: X = 3 → allt ärvs, men Y = 4 lägger på en (P = 0,1) → 0,2·0,9
    //            X = 4 → allt ärvs och Y kan aldrig överstiga 4    → 0,1·1,0
    close(exactOdds(3, 3), 0.2 * 0.9 + 0.1 * 1);
    // u = k = 2: 0,3·P(Y≤2) + 0,2·P(Y≤3) + 0,1·P(Y≤4)
    close(exactOdds(2, 2), 0.3 * 0.7 + 0.2 * 0.9 + 0.1 * 1);
  });

  it("fyra önskade har ingen ledig plats – exakt = minst", () => {
    close(exactOdds(4, 4), inheritOdds(4, 4));
  });

  it("skräp i poolen kräver att dragningen blir precis de önskade", () => {
    // Bara X = 3 duger (X = 4 drar med skräpet): 0,2 · 1/C(4,3) · P(Y≤3)
    close(exactOdds(3, 4), 0.2 * (1 / 4) * 0.9);
  });

  it("är aldrig bättre än chansen att alls få dem", () => {
    for (let k = 1; k <= 4; k++) {
      for (let u = k; u <= 6; u++) {
        assert.ok(exactOdds(k, u) <= inheritOdds(k, u) + 1e-12, `k=${k} u=${u}`);
      }
    }
  });
});

describe("RANDOM_EXTRA_ODDS – slumppassiver går inte att avla bort", () => {
  it("P(Y > X) = 35 % oavsett pool", () => {
    // 0,4·P(Y>1) + 0,3·P(Y>2) + 0,2·P(Y>3) + 0,1·0
    close(RANDOM_EXTRA_ODDS, 0.4 * 0.6 + 0.3 * 0.3 + 0.2 * 0.1);
    close(RANDOM_EXTRA_ODDS, 0.35);
  });

  it("är komplementet till en helt ren tom kull", () => {
    // Inga passiver alls hos föräldrarna → allt som dyker upp är slumpat.
    close(exactOdds(0, 0), 1 - RANDOM_EXTRA_ODDS);
  });
});

describe("planPerfectLine – kortaste vägen", () => {
  it("två pals med 2 perfekta var, komplementära → 5,58 % i ett steg", () => {
    const plan = planPerfectLine([pal([100, 100, 40], "M"), pal([50, 100, 100], "F")], []);
    assert.equal(plan.possible, true);
    assert.equal(plan.steps.length, 1);
    // HP: en förälder · ATK: båda · DEF: en förälder
    const facit = (0.3 + 0.4 / 101) * (0.6 + 0.4 / 101) * (0.3 + 0.4 / 101);
    close(plan.steps[0]!.odds, facit);
    close(plan.totalEggs, 1 / facit, 1e-3);
  });

  it("två pals med SAMMA två perfekta → tredje staten måste slumpas, men planen finns", () => {
    const plan = planPerfectLine([pal([100, 100, 40], "M"), pal([100, 100, 30], "F")], []);
    assert.equal(plan.possible, true, "överlappande bärare ska ge en dyr plan, inte ingen plan");
    const facit = (0.6 + 0.4 / 101) ** 2 * (0.4 / 101);
    close(plan.steps[0]!.odds, facit);
  });

  it("väljer det komplementära paret när flera finns", () => {
    const plan = planPerfectLine([
      pal([100, 100, 40], "M"), pal([100, 100, 30], "M"),
      pal([100, 100, 20], "F"), pal([50, 100, 100], "F"),
    ], []);
    assert.equal(plan.steps.length, 1);
    assert.equal(plan.steps[0]!.b.pal?.iv.join("/"), "50/100/100");
  });

  it("tre bärare med varsin 100:a byggs ihop i etapper, inte i ett hopp", () => {
    const plan = planPerfectLine([
      pal([100, 20, 30], "M"), pal([20, 100, 30], "F"), pal([20, 30, 100], "F"),
    ], []);
    assert.equal(plan.steps.length, 3);
    assert.equal(plan.steps.at(-1)!.ivMask, 0b111);
    assert.ok(plan.direct, "en direktjämförelse ska alltid finnas");
    assert.ok(plan.totalEggs * 10 < plan.direct!.eggs,
      `etappvis (${plan.totalEggs}) ska vara långt billigare än direkt (${plan.direct!.eggs})`);
  });

  it("en pal som redan är klar ger ingen plan alls", () => {
    const done = pal([100, 100, 100], "F", ["Legend"]);
    const plan = planPerfectLine([done, pal([50, 50, 50], "M")], ["Legend"]);
    assert.equal(plan.alreadyDone?.id, done.id);
    assert.equal(plan.steps.length, 0);
  });

  it("passiver som ingen bär är ett förkrav, inte ett stopp", () => {
    const plan = planPerfectLine([pal([100, 100, 40], "M"), pal([50, 100, 100], "F")], ["Legend"]);
    assert.deepEqual(plan.missingPassives, ["Legend"]);
    assert.equal(plan.possible, true, "IV-planen ska finnas även när en passiv saknas");
  });

  it("saknas ett kön går det inte att avla", () => {
    const plan = planPerfectLine([pal([100, 0, 0], "M"), pal([0, 100, 0], "M")], []);
    assert.equal(plan.missingGender, true);
    assert.equal(plan.possible, false);
  });

  it("skräppassiver hos föräldrarna sänker oddsen", () => {
    const a = pal([100, 100, 40], "M", ["Legend"]);
    const b = pal([50, 100, 100], "F", ["Legend"]);
    const clean = planPerfectLine([a, b], ["Legend"]);
    const dirty = planPerfectLine(
      [pal([100, 100, 40], "M", ["Legend", "Skräp1"]), pal([50, 100, 100], "F", ["Legend", "Skräp2"])],
      ["Legend"],
    );
    assert.ok(dirty.totalEggs > clean.totalEggs,
      `skräp ska kosta: ${dirty.totalEggs} > ${clean.totalEggs}`);
  });

  it("delad kull kostar mindre än två separata omgångar", () => {
    // Tre bärare → två steg med samma föräldrapar, en kull ger båda ungarna.
    const plan = planPerfectLine([
      pal([100, 20, 30], "M"), pal([20, 100, 100], "F"), pal([20, 100, 100], "F"),
    ], []);
    const shared = plan.steps.filter((s) => s.sharesClutchWith.length > 0);
    for (const st of shared) {
      const naive = 1 / st.odds;
      assert.ok(st.eggs <= naive + 1e-9,
        `steg ur delad kull ska inte kosta mer än ensamt: ${st.eggs} ≤ ${naive}`);
    }
  });
});

describe("condenseReach – stjärnkostnaden 4/16/32/64", () => {
  it("fyra foder ger första stjärnan", () => {
    assert.deepEqual(condenseReach(0, 4), { reach: 1, left: 0, nextCost: 16 });
  });

  it("tre foder räcker inte", () => {
    assert.deepEqual(condenseReach(0, 3), { reach: 0, left: 3, nextCost: 4 });
  });

  it("allt på en gång: 4+16+32+64 = 116 ger fyra stjärnor", () => {
    assert.deepEqual(condenseReach(0, 116), { reach: 4, left: 0, nextCost: 0 });
  });

  it("redan maxad art kan inte gå längre", () => {
    assert.deepEqual(condenseReach(4, 500), { reach: 4, left: 500, nextCost: 0 });
  });
});
