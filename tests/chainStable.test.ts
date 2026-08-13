/* Artkedjan ska inte byta sig själv.
 *
 * Kens observation: "ibland byter den rekommenderad breeding chain". Orsaken var
 * inte att boxen ändrats på ett sätt som spelade roll, utan att BÅDA sökningarna
 * bröt lika lägen på **iterationsordning**:
 *
 * - `ownedSpecies` är ett `Set` och itereras i insättningsordning, alltså i den
 *   ordning arterna råkade dyka upp i pals-listan. Den ordningen ändras när man
 *   läser in saven på nytt, när ett basläger tillkommer eller när en helt ny
 *   behållare börjar läsas – som globala palboxen (aug 2026), som lägger 33
 *   pals sist i listan.
 * - `dist` är en `Map` och itereras i upptäcktsordning, som i sin tur följer av
 *   ordningen ovan.
 *
 * Två kedjor som kostar exakt lika mycket bytte alltså plats utan att någonting
 * i boxen som PÅVERKAR kostnaden hade ändrats. Testerna här kör samma box med
 * arterna i olika ordning och kräver identiskt svar.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chainAlternatives, solveChain, solveChainCheapest } from "../src/lib/breeding";
import type { AppData, Species } from "../src/lib/types";

const sp = (name: string): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 700, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});

/* 0 BAS · 1 och 2 är två LIKVÄRDIGA mellanarter · 3 MÅL.
   Båda vägarna är exakt två steg och exakt lika dyra – det är hela poängen. */
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

/* Bas + VagA → VagA, Bas + VagB → VagB, och båda mellanarterna når målet.
   Självparningarna måste stå med, annars finns inga kanter alls att gå på. */
const data: AppData = {
  species,
  pair: pairTable([
    [BAS, VAG_A, VAG_A], [BAS, VAG_B, VAG_B],
    [VAG_A, VAG_A, VAG_A], [VAG_B, VAG_B, VAG_B],
    [VAG_A, MAL, MAL], [VAG_B, MAL, MAL],
    [VAG_A, VAG_B, MAL],
    [BAS, BAS, BAS], [MAL, MAL, MAL],
  ]),
  gendered: [], uniques: [], passives: {}, pals: [], player: "",
  exported: "", palExp: [],
};

/** Varje partner kostar lika mycket – då är de två vägarna helt jämbördiga. */
const flatCost = () => 2;

const chainCodes = (steps: readonly { to: number }[] | null) =>
  steps === null ? null : steps.map((s) => species[s.to]!.code).join(" → ");

/** Samma arter, olika insättningsordning – delas av båda beskrivningarna. */
const ordningarAlla: number[][] = [
  [VAG_A, VAG_B, MAL],
  [VAG_B, VAG_A, MAL],
  [MAL, VAG_B, VAG_A],
];

describe("artkedjan är stabil oavsett boxens ordning", () => {
  /* Samma arter, olika insättningsordning i Set:et. Före rättningen räckte det
     här för att svaret skulle bli ett annat. */
  const ordningar: number[][] = [
    [VAG_A, VAG_B, MAL],
    [VAG_B, VAG_A, MAL],
    [MAL, VAG_B, VAG_A],
  ];

  it("solveChainCheapest ger samma kedja i alla ordningar", () => {
    const svar = ordningar.map((o) =>
      chainCodes(solveChainCheapest(data, new Set(o), BAS, MAL, flatCost)));
    assert.equal(svar[0], "VagA → Mal", "lägst artindex ska vinna det lika läget");
    for (const s of svar) assert.equal(s, svar[0]);
  });

  it("solveChain ger samma kedja i alla ordningar", () => {
    const svar = ordningar.map((o) =>
      chainCodes(solveChain(data, new Set(o), BAS, MAL)));
    for (const s of svar) assert.equal(s, svar[0]);
  });

  /* Vaktposten: rättningen får inte ha gjort sökningen "stabil" genom att sluta
     leta efter den billigaste vägen. Blir VagA-vägen dyrare ska VagB vinna,
     trots att VagA har lägre index och alltså vinner lika lägen.
     Obs vad som INTE duger som test: att bara göra VagB billig som *partner*.
     Då kostar väg A "dyr partner + billig partner" och väg B tvärtom, båda
     summerar till samma tal och läget är fortfarande lika – första försöket
     här gjorde precis det misstaget och testet föll av rätt skäl. Det är
     partnern man använder i BÅDA stegen på en väg som måste skilja. */
  it("men kostnaden går fortfarande före stabiliteten", () => {
    const dyrA = (o: number) => (o === VAG_A ? 9 : 1);
    for (const o of ordningar) {
      assert.equal(
        chainCodes(solveChainCheapest(data, new Set(o), BAS, MAL, dyrA)),
        "VagB → Mal",
      );
    }
  });
});

describe("chainAlternatives – vägarna man får välja mellan", () => {
  const alla = new Set([VAG_A, VAG_B, MAL]);

  it("hittar båda vägarna när de är lika långa", () => {
    const opts = chainAlternatives(data, alla, BAS, MAL, flatCost);
    assert.deepEqual(opts.map((o) => chainCodes(o.steps)), ["VagA → Mal", "VagB → Mal"]);
    // Lika dyra – båda två steg à 2 ägg.
    for (const o of opts) assert.equal(o.eggs, 4);
  });

  it("ger samma lista oavsett boxens ordning", () => {
    const listor = ordningarAlla.map((o) =>
      chainAlternatives(data, new Set(o), BAS, MAL, flatCost).map((x) => chainCodes(x.steps)));
    for (const l of listor) assert.deepEqual(l, listor[0]);
  });

  it("rankar på ägg, billigast först", () => {
    const dyrA = (o: number) => (o === VAG_A ? 9 : 1);
    const opts = chainAlternatives(data, alla, BAS, MAL, dyrA);
    assert.equal(chainCodes(opts[0]!.steps), "VagB → Mal", "billigaste vägen ska ligga först");
    // Den dyrare vägen ska finnas kvar som val – den är ju lika lång.
    assert.ok(opts.length > 1, "den dyrare men lika långa vägen ska gå att välja");
    assert.ok(opts[1]!.eggs > opts[0]!.eggs, "och priset ska skilja dem åt");
  });

  /* Kedjan planeraren rekommenderar måste finnas i listan, annars kan
     gränssnittet inte markera vilken som är vald. */
  it("innehåller alltid den rekommenderade kedjan", () => {
    const rek = chainCodes(solveChainCheapest(data, alla, BAS, MAL, flatCost));
    const opts = chainAlternatives(data, alla, BAS, MAL, flatCost);
    assert.ok(opts.some((o) => chainCodes(o.steps) === rek));
  });
});
