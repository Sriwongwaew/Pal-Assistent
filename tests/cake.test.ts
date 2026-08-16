/* Tårtans matematik.
 *
 * Facit är HANDRÄKNAT ur spelets recept, för det är samma sorts tal som
 * avelsoddsen: en felräknad ingredienslista ser precis lika trovärdig ut som en
 * riktig, och varken bygge, typecheck eller lint fångar den. Den här filen
 * fångar dessutom det fel som faktiskt inträffade under bygget – att bara
 * FÖRSTA INSERT-satsen ur `crafting` lästes, vilket tog bort Flour och därmed
 * halva tårtans kostnad utan att något såg trasigt ut. */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CAKE_EFFECTS, CAKE_PER_EGG, DEFAULT_CAKE, RECIPES, cakeAdvice, cakeNames,
  cakesForEggs, planCake,
} from "../src/lib/cake";
import { itemInfo } from "../src/lib/itemInfo";
import type { AppData, ScoredPal } from "../src/lib/types";

/* Spelets recept, ordagrant ur crafting-tabellen (v1.0.1). */
const CAKE = { Egg: 8, Milk: 7, Flour: 5, Honey: 2, "Red Berries": 8 };

test("receptet är spelets, och underreceptet finns med", () => {
  assert.deepEqual(RECIPES[DEFAULT_CAKE]?.mats, CAKE);
  assert.equal(RECIPES[DEFAULT_CAKE]?.out, 1);
  /* Flour ligger i dumpens ANDRA INSERT-sats. Saknas den har generatorn
     klippt tabellen för tidigt igen – och då är hela mjölkostnaden borta. */
  assert.deepEqual(RECIPES.Flour?.mats, { Wheat: 3 });
});

test("alla fem tårtor finns, standardtårtan först", () => {
  const names = cakeNames();
  assert.equal(names[0], "Cake");
  for (const n of ["Mushroom Cake", "Vegetable Cake", "Extravagant Vegetable Cake", "Special Cake"]) {
    assert.ok(names.includes(n), `saknar ${n}`);
  }
});

test("en tårta per ägg, alltid uppåt", () => {
  assert.equal(CAKE_PER_EGG, 1);
  assert.equal(cakesForEggs(14), 14);
  // 13,4 ägg är 14 tårtor: en halv tårta finns inte.
  assert.equal(cakesForEggs(13.4), 14);
  assert.equal(cakesForEggs(0), 0);
  assert.equal(cakesForEggs(-3), 0, "negativa ägg ska inte ge negativa tårtor");
});

/** Minimal AppData: bara det `planCake` läser. */
function fakeData(names: string[]): AppData {
  return {
    species: names.map((name) => ({
      code: name, name, combi: null, rarity: 1, elements: [], gp: 0.5, icon: null,
      sc: [100, 100, 100], ws: {}, spr: 500, noct: false, stom: 150, food: 5,
      deck: 1, desc: "",
    })),
    passives: {},
    pair: [],
    exp: [],
    pals: [],
  } as unknown as AppData;
}

function pal(s: number, c: string): ScoredPal {
  return { id: `${s}-${c}-${Math.random()}`, s, c } as unknown as ScoredPal;
}

test("14 ägg blir 14 tårtor och spelets ingredienser × 14", () => {
  const data = fakeData(["Chikipi", "Mozzarina", "Beegarde", "Caprity"]);
  const plan = planCake(data, [], 14);
  assert.ok(plan);
  assert.equal(plan.cakes, 14);
  const qty = Object.fromEntries(plan.mats.map((m) => [m.item, m.qty]));
  // Handräknat: 8·14 = 112 Egg, 7·14 = 98 Milk, 5·14 = 70 Flour,
  //             2·14 = 28 Honey, 8·14 = 112 Red Berries.
  assert.deepEqual(qty, { Egg: 112, Milk: 98, Flour: 70, Honey: 28, "Red Berries": 112 });
});

test("Flour vecklas ut till Wheat, inte in i totalen", () => {
  const data = fakeData(["Chikipi"]);
  const plan = planCake(data, [], 14)!;
  const flour = plan.mats.find((m) => m.item === "Flour")!;
  // 70 Flour à 3 Wheat = 210 Wheat. Wheat får INTE stå som egen ingrediensrad:
  // man behöver en kvarn, inte en till åker, och det syns bara om raden hänger
  // under Flour.
  assert.deepEqual(flour.from, { item: "Wheat", qty: 210 });
  assert.ok(!plan.mats.some((m) => m.item === "Wheat"));
});

test("ranch-arterna hängs på rätt ingrediens, med vad du äger", () => {
  const data = fakeData(["Chikipi", "Mozzarina", "Beegarde", "Caprity"]);
  /* Två Chikipi i Palboxen och en i en bas: bara den i basen kan sättas i
     ranchen, och skillnaden är hela rådet. */
  const pals = [pal(0, "Palbox"), pal(0, "Palbox"), pal(0, "Bas/övrigt 1"), pal(1, "Palbox")];
  const plan = planCake(data, pals, 1)!;

  const egg = plan.mats.find((m) => m.item === "Egg")!;
  assert.deepEqual(egg.ranch.map((p) => [p.name, p.owned, p.atBase]), [["Chikipi", 3, 1]]);

  const milk = plan.mats.find((m) => m.item === "Milk")!;
  assert.deepEqual(milk.ranch.map((p) => [p.name, p.owned, p.atBase]), [["Mozzarina", 1, 0]]);

  const honey = plan.mats.find((m) => m.item === "Honey")!;
  assert.deepEqual(honey.ranch.map((p) => [p.name, p.owned]), [["Beegarde", 0]]);

  // Red Berries HAR en producent (Caprity) – grödan är inte enda källan.
  const berries = plan.mats.find((m) => m.item === "Red Berries")!;
  assert.deepEqual(berries.ranch.map((p) => p.name), ["Caprity"]);

  // Flour läggs inte av någon pal: raden ska vara tom, inte gissad.
  assert.deepEqual(plan.mats.find((m) => m.item === "Flour")!.ranch, []);
});

test("okänt recept ger ingen plan alls", () => {
  assert.equal(planCake(fakeData([]), [], 10, "Sockerkaka"), null);
});

test("utbytet delar antalet omgångar, inte ingredienserna", () => {
  /* Tårtorna ger 1 styck i dag. Skulle en ge 2 ska 14 tårtor bli 7 omgångar –
     regeln testas mot receptdatan så den inte tyst blir fel den dagen. */
  for (const name of cakeNames()) {
    const r = RECIPES[name]!;
    assert.ok(r.out >= 1, `${name} har utbyte ${r.out}`);
    const plan = planCake(fakeData([]), [], 14, name)!;
    /* Två olika delningar, och de får inte blandas ihop: `perLay` är hur många
       ÄGG tårtan ger (Vegetable Cake 2) och styr antalet tårtor, `out` är hur
       många TÅRTOR ett hantverk ger och styr antalet omgångar. */
    assert.equal(plan.cakes, Math.ceil(14 / plan.perLay), `${name}: antal tårtor`);
    const batches = Math.ceil(plan.cakes / r.out);
    for (const m of plan.mats) {
      assert.equal(m.qty, r.mats[m.item]! * batches, `${name}: ${m.item}`);
    }
  }
});

/* ---------- Rådet: vilken tårta, och vad det vilar på ---------- */

test("varje tårtas råd står på orden i SPELETS egen text", () => {
  /* Det här är hela skillnaden mellan ett råd och en gissning. Klassningen i
     CAKE_EFFECTS är en läsning av beskrivningen; skriver Pocketpair om den ska
     testet falla, inte rådet tyst börja peka på fel tårta. Samma disciplin som
     tests/ranchDrops.test.ts håller ranchvarorna mot partnerskill-texten. */
  for (const e of CAKE_EFFECTS) {
    const info = itemInfo(e.cake);
    assert.ok(info, `${e.cake} saknar rad i itemInfo.json`);
    assert.ok(
      info.d.toLowerCase().includes(e.proof.toLowerCase()),
      `${e.cake}: spelets text säger inte längre "${e.proof}" – texten är nu: ${info.d}`,
    );
    // Alla fem är avelsmat, och det ska stå i texten.
    assert.match(info.d, /Breeding Farm/i, `${e.cake} nämner inte avelsfarmen`);
  }
});

test("planens mål väljer tårta: passiver > IV > volym", () => {
  // Kens exempel, båda: passiver → Special Cake, kondensering → Vegetable Cake.
  assert.equal(cakeAdvice({ wanted: 4, ivGoal: "perfect" }).pick.cake, "Special Cake");
  assert.equal(cakeAdvice({ wanted: 0, volume: true }).pick.cake, "Vegetable Cake");
  // IV-jakt utan önskade passiver: mutationstårtan, som säger BÅDE mutation och talents.
  assert.equal(cakeAdvice({ wanted: 0, ivGoal: "perfect" }).pick.cake, "Extravagant Vegetable Cake");
  // Inget särskilt på gång: den billiga vanliga.
  assert.equal(cakeAdvice({ wanted: 0, ivGoal: "fast" }).pick.cake, "Cake");
  // Passiver väger tyngst även när man jagar IV: de går inte att köpa med frukt.
  assert.equal(cakeAdvice({ wanted: 1, ivGoal: "perfect", volume: true }).because, "passives");
  // Alternativen försvinner aldrig – valet är spelarens.
  const advice = cakeAdvice({ wanted: 4 });
  assert.equal(advice.rest.length, CAKE_EFFECTS.length - 1);
  assert.ok(!advice.rest.includes(advice.pick));
});

test("Vegetable Cake halverar antalet tårtor, inte ingredienserna per tårta", () => {
  const data = fakeData([]);
  /* "Lay eggs twice at once": 14 ägg tas ur 7 läggningar. Ingredienserna per
     tårta är oförändrade – det är ANTALET tårtor som halveras. */
  const veg = planCake(data, [], 14, "Vegetable Cake")!;
  assert.equal(veg.perLay, 2);
  assert.equal(veg.cakes, 7);
  const qty = Object.fromEntries(veg.mats.map((m) => [m.item, m.qty]));
  // Handräknat ur receptet × 7: Egg 8·7 = 56, Flour 8·7 = 56, Honey 4·7 = 28,
  // Tomato 8·7 = 56, Lettuce 7·7 = 49.
  assert.deepEqual(qty, { Egg: 56, Flour: 56, Honey: 28, Tomato: 56, Lettuce: 49 });
  // Och den vanliga tårtan är fortfarande en per ägg.
  assert.equal(planCake(data, [], 14)!.cakes, 14);
  assert.equal(cakesForEggs(14, 2), 7);
  assert.equal(cakesForEggs(13, 2), 7, "udda ägg rundas uppåt, inte ned");
});
