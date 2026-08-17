/* Boxens sortering.
 *
 * En felsorterad lista kastar inget undantag – den ser bara fel ut, och med 727
 * brickor märker man det inte förrän man letat efter en pal som inte ligger där
 * den borde. Facit här är handskrivna ordningar.
 *
 * Det testet framför allt håller fast är att **riktningen sitter per nyckel**.
 * Första försöket hade namngivna förval och en global riktningsknapp, och då
 * gick "många stjärnor MEN låg level" inte att uttrycka: knappen vände båda
 * nycklarna samtidigt, så man fick antingen "många stjärnor, låg level" eller
 * dess spegling "inga stjärnor, hög level" (Kens rättning aug 2026). */
import assert from "node:assert/strict";
import { test } from "node:test";
import { SORT_KEYS, boxComparator, otherKeys, type SortRule } from "../src/lib/boxSort";
import type { AppData, ScoredPal } from "../src/lib/types";

const DATA = {
  species: [{ name: "Anubis" }, { name: "Beakon" }, { name: "Älgfrost" }],
} as unknown as AppData;

/** Bara fälten sorteringen läser. */
function p(id: string, o: Partial<ScoredPal> = {}): ScoredPal {
  return {
    id, s: 0, lv: 1, stars: 0, score: 0, ivSum: 0, combat: 0,
    iv: [0, 0, 0], pv: [], tiers: [], c: "Palbox", slot: 0,
    ...o,
  } as unknown as ScoredPal;
}

const order = (rules: SortRule[], pals: ScoredPal[]) =>
  [...pals].sort(boxComparator(rules, DATA, "sv")).map((x) => x.id);

test("många stjärnor MEN låg level – två nycklar åt olika håll", () => {
  const pals = [
    p("fyra-hög", { stars: 4, lv: 50 }),
    p("fyra-låg", { stars: 4, lv: 12 }),
    p("två-låg", { stars: 2, lv: 1 }),
    p("fyra-mitt", { stars: 4, lv: 30 }),
  ];
  /* Kens fall, ordagrant: stjärnor fallande, level stigande. Det GÅR inte att
     uttrycka med en global riktning – därför sitter `asc` på varje regel. */
  const rules: SortRule[] = [{ key: "stars", asc: false }, { key: "lvl", asc: true }];
  assert.deepEqual(order(rules, pals), ["fyra-låg", "fyra-mitt", "fyra-hög", "två-låg"]);

  /* Samma förstanyckel, andra riktning på den andra: nu högst level först inom
     fyrstjärnorna. Det är den andra ordningen förvalen inte kunde ge. */
  const flipSecond: SortRule[] = [{ key: "stars", asc: false }, { key: "lvl", asc: false }];
  assert.deepEqual(order(flipSecond, pals), ["fyra-hög", "fyra-mitt", "fyra-låg", "två-låg"]);

  /* Och att vända FÖRSTA nyckeln ska inte röra den andra. */
  const flipFirst: SortRule[] = [{ key: "stars", asc: true }, { key: "lvl", asc: true }];
  assert.deepEqual(order(flipFirst, pals), ["två-låg", "fyra-låg", "fyra-mitt", "fyra-hög"]);
});

test("andranyckeln bryter bara lika-fall, den styr inte ordningen", () => {
  const pals = [
    p("a", { stars: 4, lv: 1 }),
    p("b", { stars: 3, lv: 99 }),
  ];
  // Stjärnorna avgör: en 3★ på level 99 går inte före en 4★ på level 1.
  assert.deepEqual(order([{ key: "stars", asc: false }, { key: "lvl", asc: false }], pals), ["a", "b"]);
});

test("en enda regel fungerar, och ingen regel alls ger standardordningen", () => {
  const pals = [p("låg", { score: 1 }), p("hög", { score: 9 })];
  assert.deepEqual(order([{ key: "lvl", asc: false }], pals), ["hög", "låg"]);
  assert.deepEqual(order([], pals), ["hög", "låg"]);
});

test("svagaste stat före summan – 90/90/90 slår 100/100/40", () => {
  const even = p("even", { iv: [90, 90, 90], ivSum: 270 });
  const spiky = p("spiky", { iv: [100, 100, 40], ivSum: 240 });
  const spikier = p("spikier", { iv: [100, 100, 99], ivSum: 299 });
  assert.deepEqual(
    order([{ key: "ivFloor", asc: false }], [spiky, even, spikier]),
    ["spikier", "even", "spiky"],
  );
});

test("flest passiver, och vid lika antal den med högsta nivån", () => {
  const four = p("four", { pv: ["a", "b", "c", "d"], tiers: [1, 1, 1, 1] });
  const fourGold = p("fourGold", { pv: ["a", "b", "c", "d"], tiers: [1, 1, 1, 4] });
  const three = p("three", { pv: ["a", "b", "c"], tiers: [5, 5, 5] });
  assert.deepEqual(order([{ key: "pv", asc: false }], [four, three, fourGold]), ["fourGold", "four", "three"]);
});

test("var den står: behållare först, sedan platsnummer", () => {
  const pals = [
    p("bas2", { c: "Bas/övrigt 2", slot: 0 }),
    p("box9", { c: "Palbox", slot: 9 }),
    p("box2", { c: "Palbox", slot: 2 }),
    p("bas1", { c: "Bas/övrigt 1", slot: 5 }),
  ];
  assert.deepEqual(order([{ key: "slot", asc: false }], pals), ["bas1", "bas2", "box2", "box9"]);
});

test("artnamnet sorteras på läsarens språk, och stigande är A först", () => {
  const pals = [p("z", { s: 2 }), p("a", { s: 0 }), p("b", { s: 1 })];
  // Ä sist på svenska – inte som A, vilket en rå kodpunktsjämförelse ger.
  assert.deepEqual(order([{ key: "art", asc: false }], pals), ["a", "b", "z"]);
  assert.deepEqual(order([{ key: "art", asc: true }], pals), ["z", "b", "a"]);
});

test("lika värden får en stabil ordning, inte en slumpad", () => {
  const pals = [p("c"), p("a"), p("b")];
  for (const key of SORT_KEYS) {
    for (const asc of [false, true]) {
      const first = order([{ key, asc }], pals);
      const again = order([{ key, asc }], [...pals].reverse());
      assert.deepEqual(first, again, `${key} (asc=${asc}) är inte stabil`);
    }
  }
});

test("andranyckeln kan aldrig vara densamma som den första", () => {
  for (const key of SORT_KEYS) {
    const rest = otherKeys(key);
    assert.ok(!rest.includes(key), key);
    assert.equal(rest.length, SORT_KEYS.length - 1, key);
  }
});
