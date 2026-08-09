/* Avelstakten.
 *
 * Varje siffra nedan är handräknad ur `tid = 300 / takt`, och de fyra
 * kombinationerna högst upp är dessutom uppmätta i spelet (300 / 201 / 150 /
 * 100 / 85 s). Det är hela poängen med testet: en felräknad takt ser precis
 * lika trovärdig ut som en riktig, och den multiplicerar dessutom varje
 * äggsiffra planeraren visar. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BASE_EGG_SECONDS, CAP_FREE, CAP_RATE, CAP_SPEED, alphaChance, bralohaBonus, dynamoffCut,
  eggRate, eggSeconds, eggSpeed, eggTimeText, grintaleExtra, philanthropistVerdict,
  pickupFactor, planBreedSetup, spanText, speedText,
} from "../src/lib/breedRate";
import type { AppData, ScoredPal, Species } from "../src/lib/types";

/** Oddskvoterna är exakta i decimal men inte i binärt (0,1/0,02 blir
 *  4,999999999999999), så jämför aldrig med ===. */
const near = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

const species = (code: string, name = code): Species => ({
  code, name, combi: 1, rarity: 8, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 0, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});

/* Index med flit i en annan ordning än koderna nämns i breedRate.ts – arterna
   ska slås upp på `code`, aldrig på position. */
const data: AppData = {
  species: [
    species("Lamball"),
    species("SakuraSaurus_Water", "Broncherry Aqua"),
    species("Plesiosaur", "Braloha"),
    species("SakuraSaurus", "Broncherry"),
    species("NaughtyCat", "Grintale"),
    species("ThunderFluffyBird", "Dynamoff"),
  ],
  pair: [], gendered: [], uniques: [], passives: {},
  pals: [], player: "T", exported: "", palExp: [],
};

let seq = 0;
const pal = (s: number, o: Partial<ScoredPal> = {}): ScoredPal => ({
  id: `p${seq++}`, s, g: "F", lv: 50, iv: [50, 50, 50], pv: [], rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: 150, tiers: [], pScore: 0, score: 0, stars: 0,
  fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0, synergy: null,
  cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
  ...o,
});

const BRALOHA = 2, BRONCHERRY = 3, AQUA = 1, GRINTALE = 4, DYNAMOFF = 5;
const secs = (philanthropists: number, stars: number | null) =>
  eggSeconds(eggSpeed(philanthropists, stars));

describe("eggSpeed – de uppmätta uppställningarna", () => {
  it("utan något alls är ett ägg 300 s", () => {
    assert.equal(eggSpeed(0, null), 1);
    assert.equal(secs(0, null), BASE_EGG_SECONDS);
  });

  it("4★ Braloha ensam ger 1,5× = 200 s (uppmätt 201)", () => {
    assert.equal(eggSpeed(0, 4), 1.5);
    assert.equal(secs(0, 4), 200);
  });

  it("en förälder med Philanthropist ger 2,0× = 150 s", () => {
    assert.equal(eggSpeed(1, null), 2);
    assert.equal(secs(1, null), 150);
  });

  it("båda föräldrarna ger 3,0× = 100 s – bonusen är additiv, inte multiplikativ", () => {
    assert.equal(eggSpeed(2, null), 3);
    assert.equal(secs(2, null), 100);
  });

  it("båda + 4★ Braloha är takets 3,5× ≈ 85,7 s (uppmätt 85)", () => {
    assert.equal(eggSpeed(2, 4), 3.5);
    assert.equal(CAP_SPEED, 3.5);
    assert.ok(Math.abs(secs(2, 4) - 85.71) < 0.01);
  });

  it("en tredje bärare ger ingenting – ett par har två föräldrar", () => {
    assert.equal(eggSpeed(3, null), eggSpeed(2, null));
    assert.equal(eggSpeed(9, 4), 3.5);
  });

  it("Balmy Weather skalar 20/26/32/38/50 % med stjärnorna", () => {
    assert.deepEqual([0, 1, 2, 3, 4].map(bralohaBonus), [0.2, 0.26, 0.32, 0.38, 0.5]);
    // Stjärnor utanför 0–4 får inte ge en bonus spelet inte har.
    assert.equal(bralohaBonus(9), 0.5);
    assert.equal(bralohaBonus(-1), 0.2);
  });
});

describe("planBreedSetup – vad boxen faktiskt ger", () => {
  it("en tom box avlar i grundtakt och har allt kvar att göra", () => {
    const s = planBreedSetup(data, []);
    assert.equal(s.speed, 1);
    assert.equal(s.seconds, 300);
    assert.equal(s.braloha.owned, 0);
    assert.equal(s.pickup, 1);
    assert.equal(s.rate, 1);
    /* Fyra: Braloha, Grintale, Dynamoff, Broncherry. Att kondensera en Braloha
       man inte har är ingen egen åtgärd – fånga den först, den punkten står
       redan i listan. Philanthropist och Insomnia räknas INTE med: de kostar
       odds, och "N kvar" läses som "det här ska du fixa". */
    assert.equal(s.todo, 4);
  });

  it("en Braloha i Palboxen räknas inte – skillen gäller i basen", () => {
    const s = planBreedSetup(data, [pal(BRALOHA)]);
    assert.equal(s.braloha.owned, 1);
    assert.equal(s.braloha.placed, false);
    assert.equal(s.speed, 1);
  });

  it("samma Braloha utplacerad ger 1,2× = 250 s", () => {
    const s = planBreedSetup(data, [pal(BRALOHA, { c: "Bas/övrigt 2" })]);
    assert.equal(s.braloha.placed, true);
    assert.equal(s.speed, 1.2);
    assert.equal(s.seconds, 250);
  });

  it("Braloha i partyt är inte i basen", () => {
    const s = planBreedSetup(data, [pal(BRALOHA, { c: "Party" })]);
    assert.equal(s.braloha.placed, false);
  });

  it("takten följer det bäst kondenserade exemplaret", () => {
    const s = planBreedSetup(data, [
      pal(BRALOHA, { c: "Bas/övrigt 1", stars: 3, rk: 4 }),
      pal(BRALOHA, { c: "Bas/övrigt 1" }),
    ]);
    assert.equal(s.braloha.stars, 3);
    assert.equal(s.speed, 1.38);
  });

  it("25 st 0★ Braloha räcker till 2★: 4 + 16 = 20 av 24 matarpals", () => {
    // Nästa stjärna kostar 32 – 4 kvar räcker inte, precis som på Rekommendationer.
    const pals = Array.from({ length: 25 }, (_, i) =>
      pal(BRALOHA, { c: i === 0 ? "Bas/övrigt 2" : "Palbox" }));
    const s = planBreedSetup(data, pals);
    assert.equal(s.braloha.owned, 25);
    assert.equal(s.braloha.stars, 0);
    assert.equal(s.braloha.reach, 2);
    assert.equal(s.speed, 1.2);
    assert.equal(s.reachRate, 1.32);
  });

  it("en ensam Braloha kan inte kondenseras och lovar därför ingen vinst", () => {
    const s = planBreedSetup(data, [pal(BRALOHA, { c: "Bas/övrigt 1" })]);
    assert.equal(s.braloha.reach, 0);
    assert.equal(s.reachRate, s.rate);
  });

  it("Philanthropist och Insomnia räknas som bärare, aldrig som takt", () => {
    const s = planBreedSetup(data, [
      pal(0, { pv: ["Test_PalEgg_HatchingSpeed_Up"] }),
      pal(0, { pv: ["Test_PalEgg_HatchingSpeed_Up", "Nocturnal"] }),
      pal(0, { pv: ["Nocturnal"] }),
    ]);
    assert.equal(s.philanthropist.carriers, 2);
    assert.equal(s.nocturnal.carriers, 2);
    // Två bärare i boxen är råmaterial – de sitter inte på föräldrarna än.
    assert.equal(s.speed, 1);
  });

  it("Broncherry räknas bara i partyt, Aqua ger högre alpha-chans", () => {
    const s = planBreedSetup(data, [
      pal(BRONCHERRY, { c: "Party" }),
      pal(AQUA, { c: "Palbox" }),
    ]);
    assert.equal(s.broncherry.placed, true);
    assert.equal(s.broncherryAqua.placed, false);
    assert.equal(alphaChance(s.broncherry, false), 0.35);
    assert.equal(alphaChance(s.broncherryAqua, true), 0.45);
    assert.equal(alphaChance(s.broncherryAqua, true, 4), 0.55);
  });

  it("todo räknar åtgärder: utplacering och kondensering var för sig", () => {
    const pals = [
      // Braloha står rätt men har 24 dubbletter kvar att mata → 1 kvar …
      ...Array.from({ length: 25 }, (_, i) =>
        pal(BRALOHA, { c: i === 0 ? "Bas/övrigt 2" : "Palbox" })),
      pal(0, { pv: ["Test_PalEgg_HatchingSpeed_Up"] }),
      pal(AQUA, { c: "Party" }),
      // … och Grintale + Dynamoff är kvar att ställa på plats.
    ];
    assert.equal(planBreedSetup(data, pals).todo, 3);
  });

  it("Aqua i partyt räcker – den är strikt bättre än vanlig Broncherry", () => {
    const s = planBreedSetup(data, [
      pal(BRALOHA, { c: "Bas/övrigt 1", stars: 4, rk: 5 }),
      pal(0, { pv: ["Test_PalEgg_HatchingSpeed_Up"] }),
      pal(AQUA, { c: "Party" }),
      pal(GRINTALE, { c: "Party" }),
      pal(DYNAMOFF, { c: "Bas/övrigt 1" }),
    ]);
    assert.equal(s.todo, 0);
    assert.equal(s.speed, 1.5);
    // Full uppställning UTAN Philanthropist är precis det tak mätaren står mot.
    assert.equal(s.rate, CAP_FREE);
  });

  it("en bundle utan arterna kraschar inte – och räknar inte osynliga punkter", () => {
    const bare: AppData = { ...data, species: [species("Lamball")] };
    const s = planBreedSetup(bare, [pal(0)]);
    assert.equal(s.braloha.s, null);
    assert.equal(s.grintale.s, null);
    assert.equal(s.speed, 1);
    /* En rad som inte kan ritas ut går inte att beta av, så den får inte ligga
       i "N kvar" heller. */
    assert.equal(s.todo, 0);
  });
});

describe("Grintale – upplockningsaxeln", () => {
  it("ger 1,5 ägg per upplockning, men bara i partyt", () => {
    assert.equal(grintaleExtra(), 0.5);
    assert.equal(pickupFactor(true), 1.5);
    assert.equal(pickupFactor(false), 1);

    const box = planBreedSetup(data, [pal(GRINTALE, { c: "Palbox" })]);
    assert.equal(box.grintale.owned, 1);
    assert.equal(box.grintale.placed, false);
    assert.equal(box.pickup, 1);

    const party = planBreedSetup(data, [pal(GRINTALE, { c: "Party" })]);
    assert.equal(party.pickup, 1.5);
    assert.equal(party.rate, 1.5);
    assert.equal(party.seconds, 200);
  });

  it("multipliceras med timern – 1,2× × 1,5 = 1,8× = ≈167 s", () => {
    const s = planBreedSetup(data, [
      pal(BRALOHA, { c: "Bas/övrigt 1" }),
      pal(GRINTALE, { c: "Party" }),
    ]);
    assert.equal(s.speed, 1.2);
    // 1,2 × 1,5 = 1,7999999999999998 i binärt – produkten jämförs med near.
    near(eggRate(s.speed, s.pickup), 1.8);
    near(s.seconds, 300 / 1.8);
  });

  it("stjärnorna gör ingenting – effekttexten har ingen skalning", () => {
    const flat = planBreedSetup(data, [pal(GRINTALE, { c: "Party", stars: 4, rk: 5 })]);
    assert.equal(flat.pickup, 1.5);
  });

  it("taken: 2,25× utan Philanthropist, 5,25× med", () => {
    assert.equal(CAP_FREE, 2.25);
    assert.equal(CAP_RATE, 5.25);
    near(eggSeconds(CAP_FREE), 133.333, 1e-3);
    near(eggSeconds(CAP_RATE), 57.143, 1e-3);
    // Timerns tak är oförändrat – axlarna hålls åtskilda.
    assert.equal(CAP_SPEED, 3.5);
  });
});

describe("Dynamoff – kläckningen, utanför takten", () => {
  it("skalar 20/22/26/32/40 % med stjärnorna", () => {
    const row = planBreedSetup(data, [pal(DYNAMOFF, { c: "Bas/övrigt 1" })]).dynamoff;
    assert.deepEqual([0, 1, 2, 3, 4].map((n) => dynamoffCut(row, n)),
      [0.2, 0.22, 0.26, 0.32, 0.4]);
  });

  it("rör inte takten – kläckning är inte farmens timer", () => {
    const s = planBreedSetup(data, [pal(DYNAMOFF, { c: "Bas/övrigt 1", stars: 4, rk: 5 })]);
    assert.equal(s.dynamoff.placed, true);
    assert.equal(s.speed, 1);
    assert.equal(s.rate, 1);
    assert.equal(s.seconds, 300);
  });

  it("i partyt gör den ingenting – skillen gäller i basen", () => {
    assert.equal(planBreedSetup(data, [pal(DYNAMOFF, { c: "Party" })]).dynamoff.placed, false);
  });
});

/* Den här sviten är hela skälet till att Philanthropist ligger sist i panelen i
   stället för högst upp, så facit är handräknat ur inheritOdds:
   pool k (rent) mot pool k+1 (passiven ligger i poolen).

   k=1: rent x≥1 alltid → 1,0. Smutsigt: x=1 ger 1/C(2,1)=½ → 0,4·½ + 0,3+0,2+0,1 = 0,8
   k=2: rent 0,3+0,2+0,1 = 0,6.  Smutsigt: x=2 ger 1/C(3,2)=⅓ → 0,3·⅓ + 0,2+0,1 = 0,4
   k=3: rent 0,2+0,1 = 0,3.      Smutsigt: x=3 ger 1/C(4,3)=¼ → 0,2·¼ + 0,1     = 0,15
   k=4: rent 0,1.                Smutsigt: x=4 ger 1/C(5,4)=⅕ → 0,1·⅕           = 0,02 */
describe("philanthropistVerdict – takt köpt med odds", () => {
  it("oddsen halveras per önskad passiv, och sista steget femfaldigas", () => {
    const f = (k: number) => philanthropistVerdict(k, null);
    // near, inte deepEqual: inheritOdds summerar vikter, så en ren pool på 1 blir
    // 0,9999999999999999 och en på 3 blir 0,30000000000000004.
    [1, 0.6, 0.3, 0.1].forEach((want, i) => near(f(i + 1).cleanOdds, want));
    near(f(1).dirtyOdds, 0.8);
    near(f(2).dirtyOdds, 0.4);
    near(f(3).dirtyOdds, 0.15);
    near(f(4).dirtyOdds, 0.02);
    [1, 1.25, 1.5, 2, 5].forEach((want, k) => near(f(k).eggFactor, want, 1e-9));
  });

  it("vinst upp till tre önskade, förlust vid fyra", () => {
    // Utan Braloha är takthöjningen hela 3,0× – det bästa fallet för passiven.
    const net = [0, 1, 2, 3, 4].map((k) => philanthropistVerdict(k, null).net);
    [3, 2.4, 2, 1.5, 0.6].forEach((want, k) => near(net[k] ?? -1, want, 1e-9));
    assert.ok((net[3] ?? 0) > 1, "tre önskade ska löna sig");
    assert.ok((net[4] ?? 9) < 1, "fyra önskade ska vara en förlust");
  });

  it("takthöjningen är marginell, inte 3,0× – en 3★ Braloha är redan inräknad", () => {
    // 3,38× / 1,38× = 2,449, inte 3. Med 4 önskade blir nettot därför 0,49.
    const v = philanthropistVerdict(4, 3);
    near(v.speedFactor, 3.38 / 1.38, 1e-9);
    near(v.net, (3.38 / 1.38) / 5, 1e-9);
    assert.ok(v.net < philanthropistVerdict(4, null).net,
      "har man redan Braloha är Philanthropist värd ännu mindre");
  });

  it("utan önskade passiver kostar den ingenting – IV ärvs oberoende", () => {
    const v = philanthropistVerdict(0, null);
    assert.equal(v.eggFactor, 1);
    assert.equal(v.net, 3);
  });

  it("fler än fyra önskade finns inte – och 1,5 är inte 1,5 passiver", () => {
    assert.deepEqual(philanthropistVerdict(9, null), philanthropistVerdict(4, null));
    assert.deepEqual(philanthropistVerdict(-1, null), philanthropistVerdict(0, null));
    assert.deepEqual(philanthropistVerdict(2.7, null), philanthropistVerdict(2, null));
  });
});

describe("formatering", () => {
  it("takt och äggtid skrivs på svenska", () => {
    assert.equal(speedText(1.2), "1,2×");
    assert.equal(speedText(3.5), "3,5×");
    // Under halvannan minut säger sekunder mer – spelet mäter i sekunder.
    assert.equal(eggTimeText(85.7), "86 s");
    assert.equal(eggTimeText(60), "60 s");
    assert.equal(eggTimeText(250), "4 min 10 s");
    // Jämna minuter skriver inte ut "0 s".
    assert.equal(eggTimeText(300), "5 min");
  });

  it("planens längd blir grövre ju längre den är", () => {
    assert.equal(spanText(45 * 60), "45 min");
    assert.equal(spanText(5 * 3600), "5,0 h");
    assert.equal(spanText(37.8 * 3600), "1 d 14 h");
    assert.equal(spanText(48 * 3600), "2 d");
    assert.equal(spanText(0), "–");
    assert.equal(spanText(Infinity), "–");
  });
});
