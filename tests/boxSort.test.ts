/* Boxens sorteringar.
 *
 * En felsorterad lista kastar inget undantag – den ser bara fel ut, och med 727
 * brickor märker man det inte förrän man letat efter en pal som inte ligger där
 * den borde. Facit här är därför handskrivna ordningar, inte "kör och se". */
import assert from "node:assert/strict";
import { test } from "node:test";
import { BOX_SORTS, boxComparator } from "../src/lib/boxSort";
import type { AppData, ScoredPal } from "../src/lib/types";

const DATA = {
  species: [
    { name: "Anubis" }, { name: "Beakon" }, { name: "Älgfrost" },
  ],
} as unknown as AppData;

/** Bara fälten sorteringen läser. */
function p(id: string, o: Partial<ScoredPal> = {}): ScoredPal {
  return {
    id, s: 0, lv: 1, stars: 0, score: 0, ivSum: 0, combat: 0,
    iv: [0, 0, 0], pv: [], tiers: [], c: "Palbox", slot: 0,
    ...o,
  } as unknown as ScoredPal;
}

const order = (sort: Parameters<typeof boxComparator>[0], pals: ScoredPal[]) =>
  [...pals].sort(boxComparator(sort, DATA, "sv")).map((x) => x.id);

test("stjärnor ↓ och level ↑ är två nycklar åt OLIKA håll", () => {
  const pals = [
    p("a", { stars: 4, lv: 50 }),
    p("b", { stars: 4, lv: 12 }),
    p("c", { stars: 2, lv: 1 }),
    p("d", { stars: 4, lv: 30 }),
  ];
  // Fyrstjärniga först, och bland dem den LÄGSTA nivån först: b(12) → d(30) → a(50).
  assert.deepEqual(order("starsLow", pals), ["b", "d", "a", "c"]);
  // Den vanliga stjärnsorteringen bryr sig inte om nivån alls.
  assert.deepEqual(order("stars", pals).slice(3), ["c"]);
});

test("riktningsknappen speglar BÅDA nycklarna", () => {
  /* Speglingen av "mest stjärnor, lägst level" är "minst stjärnor, högst
     level" – alltså matlistan. Vänds bara den första nyckeln får man en
     ordning ingen frågat efter, och det är hela skälet att regeln är skriven. */
  const pals = [
    p("hi-low", { stars: 4, lv: 5 }),
    p("hi-high", { stars: 4, lv: 60 }),
    p("lo-high", { stars: 0, lv: 60 }),
  ];
  const cmp = boxComparator("starsLow", DATA, "sv");
  const flipped = [...pals].sort((a, b) => -cmp(a, b)).map((x) => x.id);
  assert.deepEqual(flipped, ["lo-high", "hi-high", "hi-low"]);
});

test("svagaste stat före summan – 90/90/90 slår 100/100/40", () => {
  const even = p("even", { iv: [90, 90, 90], ivSum: 270 });
  const spiky = p("spiky", { iv: [100, 100, 40], ivSum: 240 });
  const spikier = p("spikier", { iv: [100, 100, 99], ivSum: 299 });
  assert.deepEqual(order("ivFloor", [spiky, even, spikier]), ["spikier", "even", "spiky"]);
  // Rena IV-summan svarar tvärtom, och båda finns kvar med flit.
  assert.deepEqual(order("iv", [spiky, even, spikier]), ["spikier", "even", "spiky"]);
});

test("flest passiver, och vid lika antal den med högsta nivån", () => {
  const four = p("four", { pv: ["a", "b", "c", "d"], tiers: [1, 1, 1, 1] });
  const fourGold = p("fourGold", { pv: ["a", "b", "c", "d"], tiers: [1, 1, 1, 4] });
  const three = p("three", { pv: ["a", "b", "c"], tiers: [5, 5, 5] });
  // Antalet väger tyngst – men fyra skräp är inte samma sak som fyra med guld.
  assert.deepEqual(order("pv", [four, three, fourGold]), ["fourGold", "four", "three"]);
});

test("var den står: behållare först, sedan platsnummer", () => {
  const pals = [
    p("bas2", { c: "Bas/övrigt 2", slot: 0 }),
    p("box9", { c: "Palbox", slot: 9 }),
    p("box2", { c: "Palbox", slot: 2 }),
    p("bas1", { c: "Bas/övrigt 1", slot: 5 }),
  ];
  assert.deepEqual(order("slot", pals), ["bas1", "bas2", "box2", "box9"]);
});

test("artnamnet sorteras på läsarens språk", () => {
  const pals = [p("z", { s: 2 }), p("a", { s: 0 }), p("b", { s: 1 })];
  // Ä sorteras sist på svenska – inte som A, vilket en rå kodpunktsjämförelse ger.
  assert.deepEqual(order("art", pals), ["a", "b", "z"]);
});

test("lika värden får en stabil ordning, inte en slumpad", () => {
  /* Utan sista nyckeln byter identiska pals plats mellan omritningar och listan
     ser ut att blinka. Två sorteringar av samma mängd ska ge samma svar. */
  const pals = [p("c"), p("a"), p("b")];
  for (const sort of BOX_SORTS) {
    const first = order(sort, pals);
    const again = order(sort, [...pals].reverse());
    assert.deepEqual(first, again, `${sort} är inte stabil`);
  }
});

test("varje sortering i menyn har en jämförare", () => {
  for (const sort of BOX_SORTS) {
    assert.equal(typeof boxComparator(sort, DATA, "sv"), "function", sort);
  }
});
