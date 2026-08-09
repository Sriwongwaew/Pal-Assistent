/* Önskad passiv-uppsättning per roll.
 *
 * Reglerna här är lätta att bryta av misstag: elementplatsen och den trevägs-
 * indelningen (i uppsättningen / bra men får inte plats / onödig). Utan test
 * hamnade Necromus egen "Lord of the Underworld" först som skräp, och sedan
 * hamnade Legend där i stället. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { idealLoadout, topWork } from "../src/lib/loadout";
import type { AppData, PassiveDef, ScoredPal, Species, WorkType } from "../src/lib/types";

const fx = (o: Partial<Record<"atk" | "craft" | "move" | "hp" | "ele" | "def", number>> = {}) =>
  ({ atk: 0, craft: 0, move: 0, hp: 0, ele: 0, def: 0, ...o });

/** Ett minimalt dataset med just de passiver testet behöver. */
const passives: Record<string, PassiveDef> = {
  Legend: { n: "Legend", r: 4, pal: true, fx: fx({ atk: 20, move: 20, def: 20 }) },
  Noukin: { n: "Musclehead", r: 2, pal: true, fx: fx({ atk: 30, craft: -50 }) },
  PAL_ALLAttack_up2: { n: "Ferocious", r: 3, pal: true, fx: fx({ atk: 20 }) },
  PAL_ALLAttack_up3: { n: "Demon God", r: 4, pal: true, fx: fx({ atk: 30, def: 5 }) },
  ElementBoost_Dark_2_PAL: { n: "Lord of the Underworld", r: 3, pal: true, fx: fx({ ele: 30 }) },
  ElementBoost_Fire_2_PAL: { n: "Flame Emperor", r: 3, pal: true, fx: fx({ ele: 30 }) },
  CraftSpeed_up3: { n: "Remarkable Craftsmanship", r: 4, pal: true, fx: fx({ craft: 75 }) },
  CraftSpeed_up2: { n: "Artisan", r: 3, pal: true, fx: fx({ craft: 50 }) },
  WorkSuitabilityAddRank_MonsterFarm_1: { n: "Farmhand", r: 3, pal: true, fx: fx() },
  BottomlessStomach: { n: "Bottomless Stomach", r: 1, pal: true, fx: fx() },
};

const species = (name: string, elements: Species["elements"], ws: Species["ws"] = {}): Species => ({
  code: name, name, combi: 1, rarity: 5, elements, gp: 0.5, icon: null,
  sc: [100, 100, 100], ws, spr: 700, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});

const data = { species: [], pair: [], gendered: [], uniques: [], passives, pals: [], player: "T", exported: "", palExp: [] } as unknown as AppData;

const pal = (pv: string[]): ScoredPal => ({
  id: "x", s: 0, g: "F", lv: 50, iv: [50, 50, 50], pv, rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: 150, tiers: [], pScore: 0, score: 0, stars: 0,
  fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0, synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
});

/** Alla passiver har minst en bärare, annars filtreras de bort som oåtkomliga. */
const counts = new Map(Object.keys(passives).map((id) => [id, 5]));
const names = (l: { name: string }[]) => l.map((x) => x.name);

describe("idealLoadout – anfallare", () => {
  const dark = species("Necromus", ["Dark"]);

  it("reserverar en plats åt artens egen elementboost", () => {
    const lo = idealLoadout(data, counts, pal([]), dark, "attack");
    assert.ok(names(lo.slots).includes("Lord of the Underworld"),
      `elementboosten ska alltid med: ${names(lo.slots).join(", ")}`);
  });

  it("tar inte med boostar för fel element", () => {
    const lo = idealLoadout(data, counts, pal([]), dark, "attack");
    assert.ok(!names(lo.slots).includes("Flame Emperor"));
  });

  it("elementboosten räknas ALDRIG som skräp", () => {
    const lo = idealLoadout(data, counts, pal(["ElementBoost_Dark_2_PAL"]), dark, "attack");
    assert.equal(names(lo.junk).length, 0);
    assert.equal(lo.score, 1);
  });

  it("Legend räknas ALDRIG som skräp – på sin höjd som alternativ", () => {
    const lo = idealLoadout(data, counts, pal(["Legend"]), dark, "attack");
    assert.ok(!names(lo.junk).includes("Legend"),
      `Legend hamnade som skräp: ${names(lo.junk).join(", ")}`);
  });

  it("passiv utan nytta i rollen hamnar som skräp", () => {
    const lo = idealLoadout(data, counts, pal(["BottomlessStomach"]), dark, "attack");
    assert.deepEqual(names(lo.junk), ["Bottomless Stomach"]);
  });

  it("flaggar att det finns fler kandidater än platser", () => {
    const lo = idealLoadout(data, counts, pal([]), dark, "attack");
    assert.equal(lo.overSubscribed, lo.slots.length > 4);
  });

  it("en pal som bär allt är klar", () => {
    const full = idealLoadout(data, counts, pal([]), dark, "attack");
    const lo = idealLoadout(data, counts, pal(full.slots.map((s) => s.id)), dark, "attack");
    assert.equal(lo.perfect, true);
    assert.equal(lo.score, lo.slots.length);
  });
});

describe("idealLoadout – arbete", () => {
  const farm = species("Mozzarina", ["Normal"], { MonsterFarm: 3 } as Species["ws"]);

  it("arbetshastighet styr, och elementboostar hör inte hit", () => {
    const lo = idealLoadout(data, counts, pal([]), farm, "work", "MonsterFarm");
    assert.ok(names(lo.slots).includes("Remarkable Craftsmanship"));
    assert.ok(!names(lo.slots).some((n) => /Emperor|Underworld/.test(n)));
  });

  /* Farmhand har inga fx alls – utan det uttryckliga påslaget för rätt syssla
     skulle den poängsättas till 0 och falla bort helt. Att den KOMMER MED är
     kravet; att den skulle slå +75 % arbetshastighet är en åsikt jag inte kan
     belägga, så testet påstår det inte. */
  it("arbetsrang-passiven kommer med för rätt syssla trots tomma fx", () => {
    const lo = idealLoadout(data, counts, pal([]), farm, "work", "MonsterFarm");
    assert.ok(names(lo.slots).includes("Farmhand"),
      `Farmhand saknas: ${names(lo.slots).join(", ")}`);
  });

  it("samma passiv hör inte hit för en annan syssla", () => {
    const mine = species("Anubis", ["Earth"], { Mining: 6 } as Species["ws"]);
    const lo = idealLoadout(data, counts, pal([]), mine, "work", "Mining");
    assert.ok(!names(lo.slots).includes("Farmhand"));
  });
});

describe("topWork", () => {
  const order = ["Mining", "Handcraft", "Transport"] as WorkType[];
  it("hittar den högsta arbetsnivån", () => {
    const s = species("X", ["Normal"], { Mining: 3, Handcraft: 7, Transport: 2 } as Species["ws"]);
    assert.equal(topWork(s, order), "Handcraft");
  });
  it("ger null för en art utan arbete", () => {
    assert.equal(topWork(species("Y", ["Normal"]), order), null);
  });
});
