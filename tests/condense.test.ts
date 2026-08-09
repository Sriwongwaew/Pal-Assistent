/* Kondenseringsråden.
 *
 * Stjärnkostnaderna är kumulativa (4 → 16 → 32 → 64), så "antal dubbletter"
 * säger ingenting utan att man vet var arten står i dag. Varje siffra nedan är
 * handräknad – det är hela poängen med testet, eftersom en felräknad
 * stjärna ser precis lika trovärdig ut som en riktig. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildUseIndex, condenseGain, palUses, planCondense, summarizeCondense,
} from "../src/lib/condense";
import type { AppData, PassiveDef, ScoredPal, Species } from "../src/lib/types";

const passives: Record<string, PassiveDef> = {
  Legend: { n: "Legend", r: 4, pal: true },
  Swift: { n: "Swift", r: 2, pal: true },
};

const species = (name: string, ws: Species["ws"] = {}, extra: Partial<Species> = {}): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws, spr: 0, noct: false, stom: 300, food: 5, deck: 1, desc: "",
  ...extra,
});

const makeData = (list: Species[]): AppData => ({
  species: list, pair: [], gendered: [], uniques: [], passives,
  pals: [], player: "T", exported: "", palExp: [],
});

let seq = 0;
const pal = (s: number, o: Partial<ScoredPal> = {}): ScoredPal => {
  const iv = o.iv ?? [50, 50, 50];
  return {
    id: `p${seq++}`, s, g: "F", lv: 50, iv, pv: [], rk: 1, souls: [0, 0, 0, 0],
    c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
    misfit: [], ivSum: iv[0] + iv[1] + iv[2], tiers: [], pScore: 0, score: 0, stars: 0,
    fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0, synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
    ...o,
  };
};

/** En art med `dupes` dubbletter och en behållare på `stars` stjärnor. */
function box(stars: number, dupes: number, s = 0) {
  const keeper = pal(s, { keep: true, stars, rk: stars + 1 });
  const pals = [keeper, ...Array.from({ length: dupes }, () => pal(s))];
  return { keeper, pals, bestOf: new Map([[s, keeper]]) };
}

const data = makeData([species("Relaxaurus"), species("Rushoar")]);

describe("planCondense – vad går att göra nu", () => {
  it("12 dubbletter från 0★ räcker till 2★ (4 + 8) och lämnar inget kvar", () => {
    const { pals, bestOf } = box(0, 12);
    const [p] = planCondense(data, pals, bestOf);
    assert.ok(p);
    assert.equal(p.verdict, "now");
    assert.equal(p.reach, 2);
    assert.equal(p.feed, 12);
    assert.equal(p.leftover, 0);
    // Nästa stjärna kostar 12 och man börjar om från noll sparade.
    assert.equal(p.nextCost, 12);
    assert.equal(p.missing, 12);
  });

  /* Hela poängen med kumulativa kostnader: samma antal dubbletter är värt helt
     olika mycket beroende på var arten står. Fem ger en stjärna från noll, men
     ingenting alls från 2★ – där kostar nästa steg 12 ensamt. */
  it("5 dubbletter från 2★ räcker inte till någonting", () => {
    const { pals, bestOf } = box(2, 5);
    const [p] = planCondense(data, pals, bestOf);
    assert.ok(p);
    assert.equal(p.verdict, "hold");
    assert.equal(p.reach, 2);
    assert.equal(p.feed, 0);
    assert.equal(p.leftover, 5);
    assert.equal(p.missing, 7); // 12 − 5
  });

  it("samma 5 dubbletter från 0★ ger däremot en stjärna", () => {
    const { pals, bestOf } = box(0, 5);
    const [p] = planCondense(data, pals, bestOf);
    assert.ok(p);
    assert.equal(p.verdict, "now");
    assert.equal(p.reach, 1);
    assert.equal(p.feed, 4);
    assert.equal(p.leftover, 1);
    assert.equal(p.missing, 7); // 8 − 1 sparad
  });

  it("3 dubbletter från 0★ är 'nästan där' – en enda till ger 1★", () => {
    const { pals, bestOf } = box(0, 3);
    const [p] = planCondense(data, pals, bestOf);
    assert.ok(p);
    assert.equal(p.verdict, "soon");
    assert.equal(p.missing, 1);
    assert.equal(p.feed, 0);
  });

  it("en art på 4★ har inget kvar att hämta", () => {
    const { pals, bestOf } = box(4, 10);
    const [p] = planCondense(data, pals, bestOf);
    assert.ok(p);
    assert.equal(p.verdict, "max");
    assert.equal(p.nextCost, 0);
    assert.equal(p.missing, 0);
  });

  it("13 dubbletter ger samma två stjärnor som 12 – men en blir över", () => {
    const { pals, bestOf } = box(0, 13);
    const [p] = planCondense(data, pals, bestOf);
    assert.ok(p);
    assert.equal(p.reach, 2);
    assert.equal(p.feed, 12);
    assert.equal(p.leftover, 1);
    assert.equal(p.missing, 11); // 12 − 1 sparad
  });

  it("en art utan dubbletter får ingen plan alls", () => {
    const { keeper } = box(0, 0);
    assert.deepEqual(planCondense(data, [keeper], new Map([[0, keeper]])), []);
  });
});

describe("planCondense – ordning och summering", () => {
  it("störst stjärnvinst först, sedan flest frigjorda platser", () => {
    const two = box(0, 12, 0);   // 0★ → 2★
    const one = box(0, 5, 1);    // 0★ → 1★, matar 4
    const plans = planCondense(
      makeData([species("A"), species("B")]),
      [...one.pals, ...two.pals],
      new Map([[0, two.keeper], [1, one.keeper]]),
    );
    assert.deepEqual(plans.map((p) => p.s), [0, 1]);
  });

  it("summeringen räknar bara det som går att göra nu", () => {
    const now = box(0, 12, 0);   // 2 stjärnor, 12 matade
    const wait = box(2, 5, 1);   // ingenting
    const sum = summarizeCondense(planCondense(
      makeData([species("A"), species("B")]),
      [...now.pals, ...wait.pals],
      new Map([[0, now.keeper], [1, wait.keeper]]),
    ));
    assert.deepEqual(sum, { species: 1, feed: 12, stars: 2 });
  });
});

describe("planCondense – varningar", () => {
  const bestOf = (k: ScoredPal) => new Map([[0, k]]);

  it("flaggar dubbletter som bär en guldpassiv", () => {
    const keeper = pal(0, { keep: true });
    const pals = [keeper, pal(0, { pv: ["Legend"], tiers: [4] }), pal(0), pal(0), pal(0)];
    const [p] = planCondense(data, pals, bestOf(keeper));
    assert.ok(p?.notes.some((n) => n.kind === "passive" && n.text.vars?.n === 1));
  });

  it("flaggar dubbletter med en 100:a – de är IV-byggstenar, inte mat", () => {
    const keeper = pal(0, { keep: true });
    const pals = [keeper, pal(0, { iv: [100, 20, 20] }), pal(0, { iv: [20, 100, 20] }), pal(0), pal(0)];
    const [p] = planCondense(data, pals, bestOf(keeper));
    assert.ok(p?.notes.some((n) => n.kind === "iv" && n.text.vars?.n === 2));
  });

  it("pekar ut att bästa IV sitter någon annanstans", () => {
    const keeper = pal(0, { keep: true, iv: [40, 40, 40] });
    const pals = [keeper, pal(0, { iv: [90, 90, 90] }), pal(0), pal(0), pal(0)];
    const [p] = planCondense(data, pals, bestOf(keeper));
    assert.ok(p?.notes.some((n) => n.kind === "better"));
  });

  it("tiger om skillnaden i IV är liten", () => {
    const keeper = pal(0, { keep: true, iv: [50, 50, 50] });
    const pals = [keeper, pal(0, { iv: [55, 55, 55] }), pal(0), pal(0), pal(0)];
    const [p] = planCondense(data, pals, bestOf(keeper));
    assert.ok(!p?.notes.some((n) => n.kind === "better"));
  });

  it("varnar när matningen lämnar ett enda exemplar av arten", () => {
    const { pals, bestOf: bo } = box(0, 4);
    const [p] = planCondense(data, pals, bo);
    assert.ok(p?.notes.some((n) => n.kind === "last"));
  });

  it("varnar inte när dubbletter blir över", () => {
    const { pals, bestOf: bo } = box(0, 5);
    const [p] = planCondense(data, pals, bo);
    assert.ok(!p?.notes.some((n) => n.kind === "last"));
  });
});

describe("condenseGain – vad stjärnorna är värda", () => {
  it("0★ → 2★ är +10 % på HP, attack och försvar", () => {
    const { pals, bestOf } = box(0, 12);
    const [p] = planCondense(data, pals, bestOf);
    assert.ok(p);
    const g = condenseGain(data, p);
    assert.equal(g.stars, 2);
    assert.equal(g.pct, 10);
    assert.equal(g.slots, 12);
    /* Handräknat med spelets formel för en art med scaling 100/100/100,
       level 50 och IV 50: 500 + 5·50 + 100·0,5·50·1,15 = 3625 HP utan
       stjärnor, och 3625 · 1,10 = 3987,5 → 3987 med två. */
    assert.equal(g.before.hp, 3625);
    assert.equal(g.after.hp, 3987);
  });

  it("en art som inte kan kondenseras nu vinner ingenting", () => {
    const { pals, bestOf } = box(2, 5);
    const [p] = planCondense(data, pals, bestOf);
    assert.ok(p);
    const g = condenseGain(data, p);
    assert.equal(g.stars, 0);
    assert.equal(g.after.hp, g.before.hp);
  });
});

describe("palUses – vad är den bra för", () => {
  const workData = makeData([
    species("Verdash", { Handcraft: 5, Collection: 5, Transport: 3, Seeding: 4 }),
    species("Cattiva", { Handcraft: 1, Mining: 1 }),
    species("Jetragon", {}, { spr: 3300 }),
    species("Dumud Gild", { MonsterFarm: 4, Watering: 2 }),
    species("Chikipi", { MonsterFarm: 1 }),
  ]);

  it("tar med sysslor från nivå 3 och upp, högsta först", () => {
    const p = pal(0);
    const idx = buildUseIndex(workData, [p]);
    const uses = palUses(workData, p, idx, 4);
    assert.deepEqual(uses.filter((u) => u.kind === "work").map((u) => u.level), [5, 5, 4, 3]);
  });

  it("en låg arbetsnivå kommer med när ingen annan i boxen gör det bättre – som 'enda', inte 'bäst'", () => {
    const cat = pal(1);
    const idx = buildUseIndex(workData, [cat]);
    const mining = palUses(workData, cat, idx).find((u) => u.work === "Mining");
    assert.ok(mining, "Mining saknas trots att katten är boxens enda gruvarbetare");
    // Nivå 1 är inte "bäst i boxen på gruvarbete", det är "ingen annan kan alls".
    assert.equal(mining.best, false);
    assert.equal(mining.only, true);
  });

  it("ranchen kröner aldrig den med högst nivå – varan sitter i arten", () => {
    const dumud = pal(3);
    const chikipi = pal(4);
    const idx = buildUseIndex(workData, [dumud, chikipi]);
    const farm = palUses(workData, dumud, idx).find((u) => u.work === "MonsterFarm");
    assert.ok(farm, "Farming saknas – ranchpalen ser ut att sakna användning");
    assert.equal(farm.level, 4);
    assert.equal(farm.best, false, "nivå 4 i ranchen är takt, inte 'bäst i boxen'");
    assert.ok(farm.caveat);
    // Och den lägsta ranchpalen tappas inte bort bara för att nivån är 1.
    assert.ok(palUses(workData, chikipi, idx).some((u) => u.work === "MonsterFarm"));
  });

  it("den som gör det bättre tar 'bäst i boxen'", () => {
    const cat = pal(1);
    const verdash = pal(0);
    const idx = buildUseIndex(workData, [cat, verdash]);
    const hand = palUses(workData, cat, idx).find((u) => u.work === "Handcraft");
    // Nivå 1 mot nivå 5: katten ska inte längre visas som handarbetare alls.
    assert.equal(hand, undefined);
    assert.equal(palUses(workData, verdash, idx).find((u) => u.work === "Handcraft")?.best, true);
  });

  it("en art helt utan arbete faller tillbaka på strid/riddjur", () => {
    const jet = pal(2, { combat: 900, mount: 3300 });
    const idx = buildUseIndex(workData, [jet]);
    const kinds = palUses(workData, jet, idx).map((u) => u.kind);
    assert.deepEqual(kinds.sort(), ["combat", "mount"]);
  });

  it("'bäst i boxen' kapas aldrig bort av gränsen", () => {
    const p = pal(0);
    const idx = buildUseIndex(workData, [p]);
    const uses = palUses(workData, p, idx, 2);
    assert.equal(uses.length, 2);
    assert.ok(uses.every((u) => u.best));
  });
});
