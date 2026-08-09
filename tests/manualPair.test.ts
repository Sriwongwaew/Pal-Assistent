/* Manuellt läge: ett givet par → billigaste vägen till önskade passiver.
 *
 * Facit är handräknat ur `exactOdds`/`inheritOdds` med vikterna 40/30/20/10.
 * Nyckeltalen, alla med ren pool (poolen ÄR de önskade):
 *
 *   inheritOdds: 1 av 1 → 1,0 · 2 av 2 → 0,6 · 3 av 3 → 0,3 · 4 av 4 → 0,1
 *   exactOdds:   1 av 1 → 0,4 (Y-slaget lägger till skräp i 60 % av äggen)
 *                2 av 2 → 0,49 · 3 av 3 → 0,3 · 4 av 4 → 0,1
 *
 * Och med skräp i poolen, som är hela poängen med testet:
 *   inheritOdds(2, 3) = 0,4 · inheritOdds(2, 4) = 0,25
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exactOdds, inheritOdds } from "../src/lib/breeding";
import { planManualPair, type ManualParent } from "../src/lib/manualPair";
import type { AppData, Species } from "../src/lib/types";

const species = (code: string, name = code): Species => ({
  code, name, combi: 1, rarity: 8, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 0, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});

/* Tre arter. Par-tabellen är den platta triangulära: index via pairIndex, och vi
   fyller den så att 0×1 → 2 och allt annat saknar barn. */
const N = 3;
const pairTable = () => {
  const t = new Array<number>((N * (N + 1)) / 2).fill(-1);
  // pairIndex(3, 0, 1) = 0*3 - 0 + 1 = 1
  t[1] = 2;
  // 2×2 → 2, så en unge kan paras med en annan unge av samma art.
  // pairIndex(3, 2, 2) = 2*3 - 1 + 0 = 5
  t[5] = 2;
  return t;
};

const data: AppData = {
  species: [species("A"), species("B"), species("Child")],
  pair: pairTable(),
  gendered: [], uniques: [],
  passives: {}, pals: [], player: "", exported: "", palExp: [],
};

const parent = (s: number, pv: string[], g: "M" | "F" = "M"): ManualParent =>
  ({ s, pv, g, label: null });

const near = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

describe("planManualPair – vad paret kan ge", () => {
  it("en önskad passiv som ingen förälder bär är ett NEJ, inte ett dyrt ja", () => {
    const p = planManualPair(data, parent(0, ["W1"]), parent(1, ["W2"], "F"), ["W1", "W2", "W3"]);
    const missing = p.blocks.find((b) => b.kind === "missing");
    assert.ok(missing && missing.kind === "missing");
    assert.deepEqual(missing.ids, ["W3"]);
    /* Slumpslaget KAN lägga till en passiv ingen förälder bär, men den dras ur
       hela tabellen – att planera på det vore att planera på tur. */
    assert.equal(p.steps.length, 0);
  });

  it("samma kön går inte att para", () => {
    const p = planManualPair(data, parent(0, ["W1"], "M"), parent(1, ["W2"], "M"), ["W1", "W2"]);
    assert.ok(p.blocks.some((b) => b.kind === "sameGender"));
  });

  it("okänt kön blockerar inte – en påhittad förälder är användarens sak", () => {
    const a: ManualParent = { s: 0, pv: ["W1"], g: "?", label: null };
    const b: ManualParent = { s: 1, pv: ["W2"], g: "?", label: null };
    assert.equal(planManualPair(data, a, b, ["W1", "W2"]).blocks.length, 0);
  });

  it("ett par utan barn i tabellen flaggas", () => {
    // 0×2 finns inte i vår tabell.
    const p = planManualPair(data, parent(0, ["W1"]), parent(2, ["W2"], "F"), ["W1", "W2"]);
    assert.ok(p.blocks.some((b) => b.kind === "noChild"));
  });

  it("poolen är en UNION, inte en summa – samma skräp hos båda räknas en gång", () => {
    const p = planManualPair(
      data,
      parent(0, ["W1", "junk"]),
      parent(1, ["W2", "junk"], "F"),
      ["W1", "W2"],
    );
    assert.deepEqual([...p.pool].sort(), ["W1", "W2", "junk"]);
    assert.deepEqual(p.junk, ["junk"]);
    // Pool 3, 2 önskade → 40 %, inte 25 % som en pool på 4 hade gett.
    near(p.direct!.odds, inheritOdds(2, 3));
    near(p.direct!.odds, 0.4);
  });
});

describe("planManualPair – direkt mot etappvis", () => {
  it("en ren pool ger direktparningen, och den kan inte slås", () => {
    const p = planManualPair(data, parent(0, ["W1"]), parent(1, ["W2"], "F"), ["W1", "W2"]);
    assert.deepEqual(p.blocks, []);
    near(p.direct!.odds, 0.6);
    near(p.direct!.eggs, 1 / 0.6);
    // Ett steg: det finns inget att städa när poolen redan bara är de önskade.
    assert.equal(p.steps.length, 1);
    near(p.eggs, 1 / 0.6);
  });

  it("med LITE skräp vinner direktparningen – etappvis är inte automatiskt bättre", () => {
    /* Fyra önskade i en pool på sex. Handräknat:
         direkt      inheritOdds(4,6) = 0,1 · 1/C(6,4) = 0,00667 → ~150 ägg
         etappvis    två rena tvåor ur samma pool: exactOdds(2,6) = 0,3/C(6,2)
                     = 0,02 → 50 ägg styck, + 50 för könet + 10 för sista
                     steget (inheritOdds(4,4) = 10 %) = ~160 ägg
       Alltså dyrare. Och det är hela skillnaden mot `passivePlan`: där är bärarna
       olika RENA pals ur boxen, här kommer varje unge ur samma smutsiga pool, så
       staging betalar poolen två gånger. Testet finns för att ingen ska "optimera"
       fram en omväg som inte lönar sig. */
    const p = planManualPair(
      data,
      parent(0, ["W1", "W2", "j1"]),
      parent(1, ["W3", "W4", "j2"], "F"),
      ["W1", "W2", "W3", "W4"],
    );
    assert.deepEqual(p.blocks, []);
    assert.equal(p.pool.length, 6);
    near(p.direct!.odds, inheritOdds(4, 6));
    assert.equal(p.steps.length, 1, "ett steg – direkt är billigast här");
    near(p.eggs, p.direct!.eggs);
  });

  it("med MYCKET skräp vinner etappvis, och sista steget blir rent", () => {
    /* Samma önskade, men pool 10. Handräknat:
         direkt      inheritOdds(4,10) = 0,1 · 1/C(10,4) = 0,000476 → ~2 100 ägg
         etappvis    exactOdds(2,10) = 0,3/C(10,2) = 0,00667 → 150 ägg styck,
                     + 150 för könet + 10 för sista steget = ~460 ägg
       Nu lönar omvägen sig, och med marginal. Brytpunkten ligger alltså i poolens
       storlek – inte i antalet önskade. */
    const p = planManualPair(
      data,
      parent(0, ["W1", "W2", "j1", "j2", "j3"]),
      parent(1, ["W3", "W4", "j4", "j5", "j6"], "F"),
      ["W1", "W2", "W3", "W4"],
    );
    assert.deepEqual(p.blocks, []);
    assert.equal(p.pool.length, 10);
    near(p.direct!.odds, inheritOdds(4, 10));
    assert.ok(p.eggs < p.direct!.eggs,
      `etappvis ${p.eggs} ska slå direkt ${p.direct!.eggs}`);
    assert.ok(p.steps.length > 1, "etappvis ska ha flera steg");
    // Sista steget drar ur en ren pool: precis de fyra önskade.
    const last = p.steps[p.steps.length - 1]!;
    assert.equal(last.gives.length, 4);
    assert.equal(last.pool.length, 4);
    near(last.odds, 0.1);
  });

  it("mellansteg betalar för RENA ungar – annars växer nästa pool", () => {
    const p = planManualPair(
      data,
      parent(0, ["W1", "W2", "j1", "j2", "j3"]),
      parent(1, ["W3", "W4", "j4", "j5", "j6"], "F"),
      ["W1", "W2", "W3", "W4"],
    );
    /* Varje steg utom det sista drar ur det angivna parets pool och ska använda
       exactOdds – "minst" hade gett en unge med skräp, och då vore hela poängen
       med mellansteget borta. */
    for (const s of p.steps.slice(0, -1)) {
      near(s.odds, exactOdds(s.gives.length, s.pool.length));
    }
  });

  it("en enda önskad passiv är ett steg, och kostar 1/oddsen", () => {
    const p = planManualPair(data, parent(0, ["W1"]), parent(1, [], "F"), ["W1"]);
    assert.deepEqual(p.blocks, []);
    assert.equal(p.steps.length, 1);
    near(p.direct!.odds, inheritOdds(1, 1));
    near(p.eggs, 1);
  });

  it("inga önskade passiver ger ingen plan, men inte heller en krasch", () => {
    const p = planManualPair(data, parent(0, ["W1"]), parent(1, ["W2"], "F"), []);
    assert.deepEqual(p.steps, []);
    assert.equal(p.direct, null);
  });

  it("totalen räknas över UNIKA steg – ett delat mellansteg föds fram en gång", () => {
    const p = planManualPair(
      data,
      parent(0, ["W1", "W2", "j1", "j2", "j3"]),
      parent(1, ["W3", "W4", "j4", "j5", "j6"], "F"),
      ["W1", "W2", "W3", "W4"],
    );
    const sum = p.steps.reduce((n, s) => n + s.stepEggs + s.genderEggs, 0);
    near(p.eggs, sum);
    // Inga dubbletter bland stegens mål: då hade samma unge räknats två gånger.
    const keys = p.steps.map((s) => [...s.gives].sort().join("|"));
    assert.equal(new Set(keys).size, keys.length);
  });

  it("barnets art kommer ur par-tabellen, inte ur en gissning", () => {
    const p = planManualPair(data, parent(0, ["W1"]), parent(1, ["W2"], "F"), ["W1", "W2"]);
    assert.equal(p.child, 2);
    assert.equal(data.species[p.child!]?.name, "Child");
  });
});
