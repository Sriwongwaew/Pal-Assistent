/* Vilket av två LIKVÄRDIGA steg planen ska välja (Kens begäran aug 2026).
 *
 * Två saker gör ett steg besvärligt utan att röra oddsen:
 *
 * 1. Partnerarten finns bara i ETT kön i boxen. Steget kräver ♂+♀, och ungen ur
 *    föregående steg är 50/50 – saknas ett kön måste man kläcka om tills könet
 *    stämmer.
 * 2. Varje exemplar står utplacerad i en BAS. Då ska den plockas ur sin syssla,
 *    flyttas till avelsfarmen och tillbaka igen.
 *
 * Poängen med testerna är gränsen: hindren får BARA bryta lika lägen. En kedja
 * som kostar fler ägg ska aldrig vinna på att vara bekvämare – äggsiffrorna är
 * uppmätta odds, hindren är en praktisk ordning, och att blanda dem hade gjort
 * totalen till en gissning. Sista utslaget ska fortfarande vara stabilt, alltså
 * oberoende av boxens ordning (se chainStable.test.ts).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chainAlternatives, compareParents, partnerPenalties, PENALTY_AT_BASE, PENALTY_ONE_GENDER,
  solveChainCheapest,
} from "../src/lib/breeding";
import type { AppData, ScoredPal, Species } from "../src/lib/types";

const sp = (name: string): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 700, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});

/* 0 BAS · 1 och 2 är två LIKVÄRDIGA mellanarter · 3 MÅL. Samma graf som
   chainStable-testet: båda vägarna är exakt två steg och exakt lika dyra, så
   det enda som kan skilja dem är det vi lägger till här. VagA har lägre
   artindex och vinner därför lika lägen när inget annat skiljer. */
const BAS = 0, VAG_A = 1, VAG_B = 2, MAL = 3;
const species = [sp("Bas"), sp("VagA"), sp("VagB"), sp("Mal")];
const N = species.length;

const pairTable = (entries: [number, number, number][]) => {
  const t = new Array<number>((N * (N + 1)) / 2).fill(-1);
  for (const [i, j, c] of entries) {
    const [a, b] = i <= j ? [i, j] : [j, i];
    t[a * N - (a * (a - 1)) / 2 + (b - a)] = c;
  }
  return t;
};

const data = {
  species,
  pair: pairTable([
    [BAS, VAG_A, VAG_A], [BAS, VAG_B, VAG_B],
    [VAG_A, VAG_A, VAG_A], [VAG_B, VAG_B, VAG_B],
    [VAG_A, MAL, MAL], [VAG_B, MAL, MAL],
    [VAG_A, VAG_B, MAL],
    [BAS, BAS, BAS], [MAL, MAL, MAL],
  ]),
  gendered: [], uniques: [], passives: {}, pals: [], player: "",
  exported: "", palExp: [], palTotalExp: [],
} as unknown as AppData;

let seq = 0;
const pal = (
  s: number, g: "M" | "F" | "?" = "F", c = "Palbox", iv = 80, pv: string[] = [],
): ScoredPal => ({
  id: `p${++seq}`, s, g, lv: 50, iv: [iv, iv, iv], pv, rk: 1, souls: [0, 0, 0, 0],
  c, slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: iv * 3, tiers: [], pScore: 0, score: 0,
  stars: 0, fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0,
  synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
} as unknown as ScoredPal);

const owned = new Set([VAG_A, VAG_B, MAL]);
/** Varje partner kostar lika mycket – då är de två vägarna helt jämbördiga. */
const flatCost = () => 2;
const codes = (steps: readonly { to: number }[] | null) =>
  steps === null ? null : steps.map((s) => species[s.to]!.code).join(" → ");

/** Ordningarna i boxen som chainStable-testet visade att svaret inte får bero på. */
const ordningar = [[VAG_A, VAG_B, MAL], [VAG_B, VAG_A, MAL], [MAL, VAG_B, VAG_A]];

describe("partnerPenalties", () => {
  it("straffar en art man bara har i ett kön", () => {
    const pen = partnerPenalties([pal(VAG_A, "F"), pal(VAG_B, "F"), pal(VAG_B, "M")]);
    assert.equal(pen(VAG_A), PENALTY_ONE_GENDER);
    assert.equal(pen(VAG_B), 0);
  });

  it("straffar en art vars alla exemplar står i en bas", () => {
    const pen = partnerPenalties([
      pal(VAG_A, "F", "Bas/övrigt 1"), pal(VAG_A, "M", "Bas/övrigt 1"),
      pal(VAG_B, "F", "Bas/övrigt 1"), pal(VAG_B, "M", "Palbox"),
    ]);
    assert.equal(pen(VAG_A), PENALTY_AT_BASE);
    // Ett enda exemplar i lådan räcker – det är den man hämtar.
    assert.equal(pen(VAG_B), 0);
  });

  it("lägger hindren ihop, och könet väger tyngre än basen", () => {
    const pen = partnerPenalties([pal(VAG_A, "F", "Bas/övrigt 1")]);
    assert.equal(pen(VAG_A), PENALTY_ONE_GENDER + PENALTY_AT_BASE);
    assert.ok(PENALTY_ONE_GENDER > PENALTY_AT_BASE,
      "könet kostar ägg i praktiken, basen bara en promenad");
  });

  it("den globala palboxen är förvaring, inte en bas", () => {
    const pen = partnerPenalties([pal(VAG_A, "F", "Global palbox"), pal(VAG_A, "M", "Party")]);
    assert.equal(pen(VAG_A), 0);
  });

  it("en art man inte äger får noll – den ska inte se BÄTTRE ut än en ägd", () => {
    assert.equal(partnerPenalties([])(VAG_A), 0);
  });
});

describe("artkedjan väljer det steg som går att gå", () => {
  it("tar partnern man har i båda könen när kedjorna är lika dyra", () => {
    /* VagA finns bara som hona, VagB i båda könen. Utan regeln vinner VagA på
       lägre artindex – och då står planen och väntar på en hane man inte har. */
    const pen = partnerPenalties([
      pal(VAG_A, "F"), pal(VAG_B, "F"), pal(VAG_B, "M"), pal(MAL, "F"), pal(MAL, "M"),
    ]);
    for (const o of ordningar) {
      assert.equal(
        codes(solveChainCheapest(data, new Set(o), BAS, MAL, flatCost, 10, pen)),
        "VagB → Mal",
      );
    }
  });

  it("tar partnern som ligger i lådan framför den som står i en bas", () => {
    const pen = partnerPenalties([
      pal(VAG_A, "F", "Bas/övrigt 1"), pal(VAG_A, "M", "Bas/övrigt 2"),
      pal(VAG_B, "F"), pal(VAG_B, "M"),
      pal(MAL, "F"), pal(MAL, "M"),
    ]);
    for (const o of ordningar) {
      assert.equal(
        codes(solveChainCheapest(data, new Set(o), BAS, MAL, flatCost, 10, pen)),
        "VagB → Mal",
      );
    }
  });

  it("men äggen går före bekvämligheten", () => {
    /* VagB är den bekväma vägen men dyr i BÅDA sina steg; VagA är obekväm men
       billig. Priset ska vinna – annars har tie-breaket blivit en kostnad. */
    const pen = partnerPenalties([pal(VAG_A, "F", "Bas/övrigt 1"), pal(VAG_B, "F"), pal(VAG_B, "M")]);
    const dyrB = (o: number) => (o === VAG_B ? 9 : 1);
    for (const o of ordningar) {
      assert.equal(
        codes(solveChainCheapest(data, new Set(o), BAS, MAL, dyrB, 10, pen)),
        "VagA → Mal",
      );
    }
  });

  it("utan hinder är svaret exakt som förut", () => {
    const pen = partnerPenalties([
      pal(VAG_A, "F"), pal(VAG_A, "M"), pal(VAG_B, "F"), pal(VAG_B, "M"),
    ]);
    assert.equal(
      codes(solveChainCheapest(data, owned, BAS, MAL, flatCost, 10, pen)),
      codes(solveChainCheapest(data, owned, BAS, MAL, flatCost)),
      "lägst artindex ska fortfarande avgöra när ingenting annat skiljer",
    );
  });
});

describe("chainAlternatives rankar det gångbara först", () => {
  const pen = partnerPenalties([
    pal(VAG_A, "F"), pal(VAG_B, "F"), pal(VAG_B, "M"), pal(MAL, "F"), pal(MAL, "M"),
  ]);

  it("lika dyra vägar sorteras på hur besvärliga de är", () => {
    const opts = chainAlternatives(data, owned, BAS, MAL, flatCost, 10, 6, pen);
    assert.deepEqual(opts.map((o) => codes(o.steps)), ["VagB → Mal", "VagA → Mal"]);
    // Och priset är fortfarande detsamma: hindret får inte smyga in i äggen.
    for (const o of opts) assert.equal(o.eggs, 4);
  });

  it("den dyrare vägen ligger kvar sist, inte bortsorterad", () => {
    const dyrB = (o: number) => (o === VAG_B ? 9 : 1);
    const opts = chainAlternatives(data, owned, BAS, MAL, dyrB, 10, 6, pen);
    assert.equal(codes(opts[0]!.steps), "VagA → Mal");
    assert.ok(opts.length > 1 && opts[1]!.eggs > opts[0]!.eggs);
  });

  it("ger samma lista oavsett boxens ordning", () => {
    const listor = ordningar.map((o) =>
      chainAlternatives(data, new Set(o), BAS, MAL, flatCost, 10, 6, pen)
        .map((x) => codes(x.steps)));
    for (const l of listor) assert.deepEqual(l, listor[0]);
  });
});

describe("compareParents tar den som inte står utplacerad", () => {
  const prefs = { ivGoal: "fast" } as const;

  it("lika bra föräldrar: lådan slår basen", () => {
    const iLada = pal(VAG_A, "F", "Palbox");
    const iBas = pal(VAG_A, "F", "Bas/övrigt 1");
    assert.ok(compareParents(iLada, iBas, prefs) < 0);
    assert.ok(compareParents(iBas, iLada, prefs) > 0);
  });

  it("men IV går före – en promenad är billigare än ett sämre ägg", () => {
    const bra = pal(VAG_A, "F", "Bas/övrigt 1", 100);
    const sämre = pal(VAG_A, "F", "Palbox", 40);
    assert.ok(compareParents(bra, sämre, prefs) < 0);
  });

  it("och skräp-passiver går före båda", () => {
    const ren = pal(VAG_A, "F", "Bas/övrigt 1", 40, []);
    const smutsig = pal(VAG_A, "F", "Palbox", 100, ["Skräp"]);
    assert.ok(compareParents(ren, smutsig, { ivGoal: "fast", wanted: new Set<string>() }) < 0);
  });

  it("den globala palboxen räknas som lådan, inte som en bas", () => {
    const global = pal(VAG_A, "F", "Global palbox");
    const iBas = pal(VAG_A, "F", "Bas/övrigt 1");
    assert.ok(compareParents(global, iBas, prefs) < 0);
  });
});
