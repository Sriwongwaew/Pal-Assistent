/* Målbevakningen: "du har fått den" – och frukterna som gör beskedet handlingsbart.
 *
 * Fruktmatten är enkel men lätt att göra fel: en frukt ger +10 och taket är 100,
 * så en pal på 91 behöver EN frukt (inte noll, inte 0,9), och en på 100 ingen.
 * Handräknat facit:
 *   iv 100 → 0 frukter        iv 91 → ceil(9/10)  = 1
 *   iv 90  → 1                iv 66 → ceil(34/10) = 4
 *   iv 25  → ceil(75/10) = 8  iv 0  → 10
 * Kens Lux ♀ 100/25/66 = 0 + 8 + 4 = **12 frukter**, mot planerarens 239 ägg.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fruitsFor, fruitTotal, FRUIT_NAMES } from "../src/lib/ivFruits";
import {
  emptySeen, markSeen, MAX_CARDS, parseSeen, serializeSeen, watchGoal,
} from "../src/lib/goalWatch";
import type { PassiveDef, ScoredPal } from "../src/lib/types";

const fx = () => ({ atk: 0, craft: 0, move: 0, hp: 0, ele: 0, def: 0 });
const passives: Record<string, PassiveDef> = {
  A: { n: "Legend", r: 4, pal: true, fx: fx() },
  B: { n: "Musclehead", r: 2, pal: true, fx: fx() },
  J: { n: "Skräp", r: 2, pal: true, fx: fx() },
};

let seq = 0;
const pal = (
  s: number, iv: [number, number, number], pv: string[] = [], g: "M" | "F" = "F", id?: string,
): ScoredPal => ({
  id: id ?? `p${++seq}`, s, g, lv: 50, iv, pv, rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: iv[0] + iv[1] + iv[2], tiers: pv.map((x) => passives[x]?.r ?? 0), pScore: 0,
  score: 0, stars: 0, fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0,
  synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
});

const TARGET = 116;
const wanted = ["A", "B"];

describe("IV-frukter", () => {
  it("räknar upp till taket, aldrig över", () => {
    assert.deepEqual(fruitsFor(pal(TARGET, [100, 100, 100])), []);
    assert.equal(fruitTotal(pal(TARGET, [100, 100, 100])), 0);
    assert.deepEqual(fruitsFor(pal(TARGET, [91, 90, 100])), [
      { stat: 0, count: 1 }, { stat: 1, count: 1 },
    ]);
  });

  it("Kens fall: 100/25/66 är tolv frukter", () => {
    const p = pal(TARGET, [100, 25, 66]);
    assert.deepEqual(fruitsFor(p), [{ stat: 1, count: 8 }, { stat: 2, count: 4 }]);
    assert.equal(fruitTotal(p), 12);
  });

  it("noll IV är tio frukter, inte elva", () => {
    assert.equal(fruitTotal(pal(TARGET, [0, 0, 0])), 30);
    assert.deepEqual(fruitsFor(pal(TARGET, [0, 100, 100])), [{ stat: 0, count: 10 }]);
  });

  it("namnen är spelets, i statordning", () => {
    assert.deepEqual([...FRUIT_NAMES], ["Life Fruit", "Power Fruit", "Stout Fruit"]);
  });
});

describe("watchGoal", () => {
  const fresh = (...ids: string[]) => new Set(ids);

  it("säger DONE när målbilden är nådd, inklusive IV-målet", () => {
    const p = pal(TARGET, [100, 100, 100], ["A", "B"], "F", "x1");
    const w = watchGoal([p], fresh("x1"), TARGET, wanted, "perfect");
    assert.equal(w.hits.length, 1);
    assert.equal(w.hits[0]!.done, true);
    assert.equal(w.hits[0]!.fruitTotal, 0);
  });

  it("säger NÄSTAN med frukträkning när bara IV saknas", () => {
    const p = pal(TARGET, [100, 25, 66], ["A", "B"], "F", "x2");
    const w = watchGoal([p], fresh("x2"), TARGET, wanted, "perfect");
    assert.equal(w.hits[0]!.done, false);
    assert.equal(w.hits[0]!.fruitTotal, 12);
  });

  /* Med IV-målet "snabbt" är passiverna hela målbilden – då är palen klar, men
     frukträkningen står kvar som upplysning. */
  it("är klar i snabbt läge men redovisar frukterna ändå", () => {
    const p = pal(TARGET, [100, 25, 66], ["A", "B"], "F", "x3");
    const w = watchGoal([p], fresh("x3"), TARGET, wanted, "fast");
    assert.equal(w.hits[0]!.done, true);
    assert.equal(w.hits[0]!.fruitTotal, 12);
  });

  it("passiverna är förkrav – dem kan ingen frukt ge", () => {
    const p = pal(TARGET, [100, 100, 100], ["A"], "F", "x4");
    assert.deepEqual(watchGoal([p], fresh("x4"), TARGET, wanted, "perfect").hits, []);
  });

  it("bara rätt art räknas", () => {
    const p = pal(115, [100, 100, 100], ["A", "B"], "F", "x5");
    assert.deepEqual(watchGoal([p], fresh("x5"), TARGET, wanted, "perfect").hits, []);
  });

  it("bara NYA pals annonseras", () => {
    const p = pal(TARGET, [100, 100, 100], ["A", "B"], "F", "old");
    assert.deepEqual(watchGoal([p], fresh(), TARGET, wanted, "perfect").hits, [],
      "ingen ny = inget besked");
    assert.equal(watchGoal([p], fresh("old"), TARGET, wanted, "perfect").hits.length, 1);
  });

  it("bortklickade kommer inte tillbaka", () => {
    const p = pal(TARGET, [100, 100, 100], ["A", "B"], "F", "x6");
    const w = watchGoal([p], fresh("x6"), TARGET, wanted, "perfect", new Set(["x6"]));
    assert.deepEqual(w.hits, []);
  });

  it("utan målart finns inget att bevaka", () => {
    const p = pal(TARGET, [100, 100, 100], ["A", "B"], "F", "x7");
    assert.deepEqual(watchGoal([p], fresh("x7"), null, wanted, "perfect").hits, []);
  });

  it("färdig först, sedan färst frukter", () => {
    const a = pal(TARGET, [100, 25, 66], ["A", "B"], "F", "a");
    const b = pal(TARGET, [100, 100, 100], ["A", "B"], "M", "b");
    const c = pal(TARGET, [100, 91, 100], ["A", "B"], "M", "c");
    const w = watchGoal([a, b, c], fresh("a", "b", "c"), TARGET, wanted, "perfect");
    assert.equal(w.hits.length, MAX_CARDS, "listan kapas till korten som visas");
    assert.equal(w.hits[0]!.pal.id, "b", "den färdiga överst");
    assert.equal(w.hits[1]!.pal.id, "c", "sedan den med en frukt kvar");
    assert.equal(w.more, 1, "resten räknas");
  });

  it("skräp-passiver hindrar inte en träff", () => {
    const p = pal(TARGET, [100, 100, 100], ["A", "B", "J"], "F", "x8");
    assert.equal(watchGoal([p], fresh("x8"), TARGET, wanted, "perfect").hits.length, 1);
  });
});

describe("sedda pals", () => {
  it("första körningen seedas tyst", () => {
    const s = parseSeen(null);
    assert.equal(s.seeded, false, "utan seeded annonseras ingenting");
    const after = markSeen(s, [pal(TARGET, [1, 1, 1], [], "F", "a")]);
    assert.equal(after.seeded, true);
    assert.deepEqual(after.ids, ["a"]);
  });

  it("id:n läggs till, aldrig dubbelt", () => {
    const s = markSeen(emptySeen(), [pal(TARGET, [1, 1, 1], [], "F", "a")]);
    const again = markSeen(s, [
      pal(TARGET, [1, 1, 1], [], "F", "a"), pal(TARGET, [1, 1, 1], [], "F", "b"),
    ]);
    assert.deepEqual(again.ids.sort(), ["a", "b"]);
  });

  it("bortklickade bevaras över en inläsning", () => {
    const s = { seeded: true, ids: ["a"], dismissed: ["a"] };
    assert.deepEqual(markSeen(s, [pal(TARGET, [1, 1, 1], [], "F", "b")]).dismissed, ["a"]);
  });

  it("skräp i localStorage ger tomt läge, inte ett fel", () => {
    for (const raw of ["", "inte json", "[]", '{"ids":"nej","seeded":"kanske"}', "null"]) {
      const s = parseSeen(raw);
      assert.deepEqual(s.ids, []);
      assert.equal(s.seeded, false);
    }
  });

  it("går att skriva och läsa tillbaka", () => {
    const s = { seeded: true, ids: ["a", "b"], dismissed: ["c"] };
    assert.deepEqual(parseSeen(serializeSeen(s)), s);
  });
});
