/* Sannolikhetsmatematiken i avelsplaneraren.
 *
 * De här funktionerna är rena och lätta att testa, och det är precis där fel
 * blir dyra: en felaktig siffra ser lika trovärdig ut som en riktig. Facit är
 * handräknat i varje test, inte kopierat ur implementationen. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planPerfectLine, statOddsFromHas } from "../src/lib/perfectPlan";
import { inheritOdds } from "../src/lib/breeding";
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

describe("inheritOdds – passivarv utan mutationer", () => {
  it("noll önskade passiver är alltid uppfyllt", () => {
    close(inheritOdds(0, 0), 1);
    close(inheritOdds(0, 5), 1);
  });

  it("kan inte ärva fler önskade än poolen innehåller", () => {
    close(inheritOdds(3, 2), 0);
  });

  it("en ren pool på 1 ärvs så ofta ett arv alls sker", () => {
    // Med u=1 finns bara c=1 att lotta på, och den viktas 1.0 efter normalisering.
    close(inheritOdds(1, 1), 1);
  });

  it("skräp i poolen späder ut oddsen", () => {
    const clean = inheritOdds(2, 2);
    const dirty = inheritOdds(2, 4);
    assert.ok(dirty < clean, `${dirty} < ${clean}`);
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
