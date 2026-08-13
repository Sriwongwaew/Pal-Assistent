/* Att bära in en saknad 100:a ur en annan art.
 *
 * Fallet: mål Helzephyr Lux, och ingen av Kens 61 Lux har 100 i Attack. Då kunde
 * staten bara komma ur 40 %-omslumpningen – `statOddsFromHas(false, false)` –
 * och det är i praktiken hela planens kostnad. Men elva andra pals i boxen HAR
 * 100 i Attack, och flera ligger två artsteg bort med noll passiver.
 *
 * Facit är handräknat ur IV-modellen (30 % far, 30 % mor, 40 % omslumpat, och en
 * omslumpad stat landar på exakt 100 i 1 fall av 101):
 *   en förälder har 100:  0,3 + 0,4/101 = 0,303960…  → 3,2899… ägg per steg
 *   ingen har 100:              0,4/101 = 0,003960…  → 252,5   ägg
 * Två artsteg kostar alltså 2 × 3,2899 = 6,5799 ägg mot 252,5 – 38× billigare,
 * och det är skillnaden mellan en plan man följer och en man inte följer.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pairIndex } from "../src/lib/breeding";
import { planIvImports } from "../src/lib/ivImport";
import { planPerfectLine, statOddsFromHas } from "../src/lib/perfectPlan";
import type { AppData, PassiveDef, ScoredPal, Species } from "../src/lib/types";

const fx = () => ({ atk: 0, craft: 0, move: 0, hp: 0, ele: 0, def: 0 });
const passives: Record<string, PassiveDef> = {
  A: { n: "Legend", r: 4, pal: true, fx: fx() },
  J1: { n: "Skräp 1", r: 2, pal: true, fx: fx() },
  J2: { n: "Skräp 2", r: 2, pal: true, fx: fx() },
};

const sp = (name: string): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 700, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});

/* 0 Skutlass (donator, långt bort), 1 Beakon (mellanled), 2 målarten,
   3 Sekhmet (donator som ligger ett steg längre bort), 4 Neptilius (ingen väg). */
const SKUT = 0, BEAK = 1, MAL = 2, SEKH = 3, NEPT = 4;
const species = [sp("Skutlass"), sp("Beakon"), sp("Helzephyr Lux"), sp("Sekhmet"), sp("Neptilius")];
const N = species.length;

const pairTable = (entries: [number, number, number][]) => {
  const t = new Array<number>((N * (N + 1)) / 2).fill(-1);
  for (const [i, j, c] of entries) t[pairIndex(N, i, j)] = c;
  return t;
};

/* Skutlass + Beakon → Beakon → målarten = TVÅ steg.
   Sekhmet tar samma väg men ett steg längre (via Skutlass). */
const data = {
  species,
  pair: pairTable([
    [SKUT, BEAK, BEAK],
    [BEAK, BEAK, MAL],
    [SEKH, BEAK, SKUT],
    [MAL, MAL, MAL],
  ]),
  gendered: [], uniques: [], passives,
  pals: [], player: "T", exported: "", palExp: [],
} as unknown as AppData;

let seq = 0;
const pal = (
  s: number, iv: [number, number, number], g: "M" | "F" = "M", pv: string[] = [],
): ScoredPal => ({
  id: `p${++seq}`, s, g, lv: 50, iv, pv, rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: iv[0] + iv[1] + iv[2], tiers: pv.map((id) => passives[id]?.r ?? 0), pScore: 0,
  score: 0, stars: 0, fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0,
  synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
});

const ATK = 1;
const PER_STEP = 1 / statOddsFromHas(true, false);
const REROLL = 1 / statOddsFromHas(false, false);
const owned = new Set([SKUT, BEAK, MAL, SEKH]);
const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

describe("statOddsFromHas – facit för importen", () => {
  it("en förälder med 100 ger 30 % + omslumpningens dryga tredjedels procent", () => {
    close(statOddsFromHas(true, false), 0.3 + 0.4 / 101);
    close(PER_STEP, 1 / (0.3 + 0.4 / 101));
    assert.ok(PER_STEP > 3.28 && PER_STEP < 3.29, `${PER_STEP} ≈ 3,29 ägg`);
  });

  it("ingen med 100 ger bara omslumpningen – 252 ägg", () => {
    close(statOddsFromHas(false, false), 0.4 / 101);
    assert.ok(REROLL > 252 && REROLL < 253, `${REROLL} ≈ 252,5 ägg`);
  });
});

describe("planIvImports", () => {
  it("hittar donatorn i en annan art och prissätter kedjan per steg", () => {
    const pals = [
      pal(MAL, [100, 20, 100], "F"),
      pal(SKUT, [31, 100, 11], "M"),
      pal(BEAK, [10, 10, 10], "F"),   // partnern första steget behöver
    ];
    const found = planIvImports(data, pals, owned, MAL, [ATK]);
    assert.equal(found.length, 1);
    const im = found[0]!;
    assert.deepEqual(im.stats, [ATK]);
    assert.equal(im.donor.s, SKUT);
    assert.equal(im.steps.length, 2, "Skutlass → Beakon → målarten");
    assert.equal(im.steps.at(-1)!.to, MAL, "sista steget måste landa i målarten");
    close(im.eggs, 2 * PER_STEP);
    assert.ok(im.eggs < REROLL / 30, `${im.eggs} ägg mot omslumpningens ${REROLL}`);
    // Ingen partner bär statens 100 här, så varje steg kostar 3,29 ägg.
    for (const st of im.steps) close(st.eggs, PER_STEP);
  });

  it("tar färst steg först, sedan den renaste donatorn", () => {
    const pals = [
      pal(MAL, [100, 20, 100], "F"),
      pal(SEKH, [15, 100, 49], "M"),            // tre steg bort
      pal(SKUT, [31, 100, 11], "M", ["J1"]),    // två steg, ett skräp
      pal(BEAK, [10, 10, 10], "F"),
    ];
    const found = planIvImports(data, pals, owned, MAL, [ATK]);
    assert.equal(found[0]!.donor.s, SKUT, "två steg slår tre, även med ett skräp");
    assert.equal(found[0]!.donorJunk, 1);
    assert.equal(found[1]!.donor.s, SEKH);
    assert.equal(found[1]!.steps.length, 3);
  });

  it("räknar bara skräp som inte är önskat", () => {
    const pals = [
      pal(MAL, [100, 20, 100], "F"),
      pal(SKUT, [31, 100, 11], "M", ["A", "J1"]),
      pal(BEAK, [10, 10, 10], "F"),
    ];
    const [im] = planIvImports(data, pals, owned, MAL, [ATK], ["A"]);
    assert.equal(im!.donorJunk, 1, "Legend är önskad, alltså inget skräp");
  });

  it("ger ett förslag per art – fem av samma art är samma väg", () => {
    const pals = [
      pal(MAL, [100, 20, 100], "F"),
      pal(SKUT, [31, 100, 11], "M"),
      pal(SKUT, [40, 100, 20], "M"),
      pal(SKUT, [50, 100, 30], "M"),
      pal(BEAK, [10, 10, 10], "F"),
    ];
    const found = planIvImports(data, pals, owned, MAL, [ATK]);
    assert.equal(found.length, 1);
  });

  it("flaggar när första steget inte går att para – och rankar den sist", () => {
    /* Donatorn är ♂ och boxen har bara en ♂ Beakon: paret kan inte avla, och då
       är vägen inte en väg. Den tigs inte ihjäl, den flaggas. */
    const pals = [
      pal(MAL, [100, 20, 100], "F"),
      pal(SKUT, [31, 100, 11], "M"),
      pal(BEAK, [10, 10, 10], "M"),
    ];
    const [im] = planIvImports(data, pals, owned, MAL, [ATK]);
    assert.equal(im!.genderOk, false);
  });

  it("säger nej när ingen väg finns till målarten", () => {
    const pals = [
      pal(MAL, [100, 20, 100], "F"),
      pal(NEPT, [31, 100, 11], "M"),   // ingen kombination leder till målarten
    ];
    assert.deepEqual(planIvImports(data, pals, owned, MAL, [ATK]), []);
  });

  it("donatorer av målarten är ingen import – då är staten ingen lucka", () => {
    const pals = [pal(MAL, [100, 100, 100], "F"), pal(MAL, [10, 10, 10], "M")];
    assert.deepEqual(planIvImports(data, pals, owned, MAL, [ATK]), []);
  });
});

describe("planPerfectLine med import", () => {
  /* Två Lux: en med HP+DEF 100, en utan. Attack finns bara utanför arten. Utan
     import måste Attack slumpas fram (252 ägg); med import bärs den in för 6,6. */
  const pals = () => [
    pal(MAL, [100, 20, 100], "F"),
    pal(MAL, [100, 20, 100], "M"),
    pal(SKUT, [31, 100, 11], "M"),
    pal(BEAK, [10, 10, 10], "F"),
  ];

  it("blir dramatiskt billigare än att slumpa fram statens 100", () => {
    const mine = pals().filter((p) => p.s === MAL);
    const imports = planIvImports(data, pals(), owned, MAL, [ATK]);
    const without = planPerfectLine(mine, []);
    const withImport = planPerfectLine(mine, [], imports);

    assert.ok(without.possible && withImport.possible);
    assert.ok(without.totalEggs > REROLL,
      `omslumpningen ska dominera: ${without.totalEggs} ägg`);
    assert.ok(withImport.totalEggs < without.totalEggs / 5,
      `${withImport.totalEggs} ägg mot ${without.totalEggs} – importen ska slå igenom`);
    assert.equal(withImport.imports.length, 1, "importen ska redovisas");
    assert.equal(withImport.imports[0]!.donor.s, SKUT);
  });

  it("importens ägg ligger i totalen, en gång per individ", () => {
    const mine = pals().filter((p) => p.s === MAL);
    const imports = planIvImports(data, pals(), owned, MAL, [ATK]);
    const plan = planPerfectLine(mine, [], imports);
    const steps = plan.steps.reduce((s, st) => s + st.eggs, 0);
    const used = plan.imports.reduce((s, im) => s + im.eggs, 0);
    close(plan.totalEggs, steps + used);
    // Används samma import i flera steg räknas den ändå en gång.
    const uses = plan.steps.filter((st) => st.a.imported || st.b.imported).length;
    assert.ok(uses >= 1);
    assert.equal(plan.imports.length, 1, `${uses} steg använder importen, men den föds fram en gång`);
  });

  it("en import utan statar blir aldrig ett löv", () => {
    const mine = pals().filter((p) => p.s === MAL);
    // HP har redan 100 i arten – en "import" av den ska inte bli ett löv.
    const bogus = planIvImports(data, pals(), owned, MAL, [ATK])
      .map((im) => ({ ...im, stats: [] }));
    const plan = planPerfectLine(mine, [], bogus);
    assert.deepEqual(plan.imports, [], "en import utan statar är ingen byggsten");
  });
});

/* En donator kan bära FLERA 100:or, och då är det en import som ger båda.
   Kens `Warsect ♂ 15/100/100` är fallet: Attack och Defense i samma pal. Priset
   följer med – varje steg måste behålla båda, alltså odds² per ägg:
     ett steg:  1 / 0,303960²  = 10,825… ägg
     två steg:  2 × 10,825…    = 21,65…  ägg
   Det är dyrare än att bära in en stat (6,58) men sparar en hel merge längre
   fram, så båda erbjudandena ska finnas – sökningen väljer. */
describe("planIvImports – en donator med två 100:or", () => {
  const DEF = 2;
  const pals = () => [
    pal(MAL, [100, 20, 20], "F"),
    pal(SKUT, [15, 100, 100], "M"),   // Warsect-fallet: två 100:or i samma pal
    pal(BEAK, [10, 10, 10], "F"),
  ];

  it("erbjuder både 2-i-1 och varje stat för sig", () => {
    const found = planIvImports(data, pals(), owned, MAL, [ATK, DEF]);
    const both = found.find((im) => im.stats.length === 2);
    const single = found.filter((im) => im.stats.length === 1);
    assert.ok(both, "kombinationen ska finnas");
    assert.deepEqual(both!.stats, [ATK, DEF]);
    assert.equal(single.length, 2, "och varje stat för sig");
  });

  it("prissätter 2-i-1 som odds i kvadrat per steg", () => {
    const [both] = planIvImports(data, pals(), owned, MAL, [ATK, DEF])
      .filter((im) => im.stats.length === 2);
    const per = statOddsFromHas(true, false) ** 2;
    close(both!.worstOdds, per);
    close(both!.eggs, 2 / per);
    assert.ok(both!.eggs > 21.6 && both!.eggs < 21.7, `${both!.eggs} ≈ 21,65 ägg`);
  });

  it("erbjuds även för en stat arten redan har 100 i – den kan vara smutsig", () => {
    /* Målarten har en 100 i Defense, men på en pal med tre skräp-passiver. En ren
       importerad kan vara billigare totalt, så erbjudandet ska finnas – sökningen
       tar det bara om det lönar sig. */
    const box = [
      pal(MAL, [100, 20, 100], "F", ["J1", "J2", "A"]),
      pal(SKUT, [15, 100, 100], "M"),
      pal(BEAK, [10, 10, 10], "F"),
    ];
    const found = planIvImports(data, box, owned, MAL, [DEF]);
    assert.equal(found.length, 1);
    assert.deepEqual(found[0]!.stats, [DEF]);
  });
});

/* Kens fråga: "varför tar vi inte inräkningen av dom 100/100/100 på andra pals
   som vi har?" – 100:orna hos pals man parar MED. Bär partnern också statens 100
   är oddsen 0,3 + 0,3 + 0,4/101 = 60,4 % i stället för 30,4 %, alltså 1,656 ägg
   för steget i stället för 3,290. */
describe("planIvImports – partnerns egna 100:or", () => {
  const BOTH = 1 / statOddsFromHas(true, true);

  it("halverar steget där partnern också bär 100:an", () => {
    const plain = [
      pal(MAL, [100, 20, 100], "F"),
      pal(SKUT, [31, 100, 11], "M"),
      pal(BEAK, [10, 10, 10], "F"),          // partnern bär ingen 100
    ];
    const boosted = [
      pal(MAL, [100, 20, 100], "F"),
      pal(SKUT, [31, 100, 11], "M"),
      pal(BEAK, [10, 100, 10], "F"),         // samma art, men 100 i Attack
    ];
    const [before] = planIvImports(data, plain, owned, MAL, [ATK]);
    const [after] = planIvImports(data, boosted, owned, MAL, [ATK]);
    close(before!.eggs, 2 * PER_STEP);
    // Båda stegen går via Beakon-arten, och den bär nu 100:an.
    close(after!.eggs, 2 * BOTH);
    assert.ok(BOTH < PER_STEP / 1.9, `${BOTH} ska vara knappt hälften av ${PER_STEP}`);
    assert.ok(after!.eggs < before!.eggs / 1.9,
      `${after!.eggs} ägg mot ${before!.eggs} – partnern ska räknas`);
  });

  it("väljer den partner som bär statens 100, inte bara den renaste", () => {
    const pals = [
      pal(MAL, [100, 20, 100], "F"),
      pal(SKUT, [31, 100, 11], "M"),
      pal(BEAK, [10, 10, 10], "F"),               // ren men bär ingen 100
      pal(BEAK, [10, 100, 10], "F", ["J1"]),      // ett skräp, men 100 i Attack
    ];
    const [im] = planIvImports(data, pals, owned, MAL, [ATK]);
    assert.equal(im!.steps[0]!.partner!.iv[1], 100, "100:an väger tyngre än renheten");
    close(im!.steps[0]!.eggs, BOTH);
  });

  /* Att en LÄNGRE väg kan vinna följer av att rankningen går på ägg och inte på
     steg (tre steg med bärande partners = 4,97 mot två tomma = 6,58). Fixturen
     här har bara en partnerart, så alla vägar delar den – regeln bor i
     `ivImport.ts` och syns i priset ovan. */
});

/* Tredje läget: "nära perfekt" = inom en frukt (90+).
 *
 * Tröskeln byter inte modell, bara vad som räknas som uppnått – och
 * omslumpningens lott. Handräknat facit ur 30/30/40:
 *   ingen förälder når målet:  0,4 · (101−t)/101
 *     t = 100 → 0,4 · 1/101  = 0,00396  (0,40 %)
 *     t =  90 → 0,4 · 11/101 = 0,04356  (4,36 %)   ← elva gånger så ofta
 *   en förälder når målet:     +0,3 → 30,4 % resp. 34,4 %
 *   båda når målet:            +0,6 → 60,4 % resp. 64,4 %
 */
describe("IV-tröskeln – nära perfekt", () => {

  it("omslumpningen träffar 90 elva gånger oftare än 100", () => {
    close(statOddsFromHas(false, false, 100), 0.4 * (1 / 101));
    close(statOddsFromHas(false, false, 90), 0.4 * (11 / 101));
    const ratio = statOddsFromHas(false, false, 90) / statOddsFromHas(false, false, 100);
    assert.ok(Math.abs(ratio - 11) < 1e-9, `${ratio} ≠ 11`);
  });

  it("en och två bärande föräldrar följer samma modell", () => {
    close(statOddsFromHas(true, false, 90), 0.3 + 0.4 * (11 / 101));
    close(statOddsFromHas(true, true, 90), 0.6 + 0.4 * (11 / 101));
    assert.ok(statOddsFromHas(true, true, 90) > statOddsFromHas(true, true, 100));
  });

  it("planen till 90+ är billigare än till 100 – med samma box", () => {
    const pals = [
      pal(MAL, [95, 20, 92], "F"),
      pal(MAL, [30, 93, 40], "M"),
      pal(BEAK, [10, 10, 10], "F"),
    ];
    const mine = pals.filter((p) => p.s === MAL);
    const near = planPerfectLine(mine, [], [], 90);
    const perfect = planPerfectLine(mine, [], [], 100);
    assert.ok(near.possible && perfect.possible);
    assert.ok(near.totalEggs < perfect.totalEggs / 5,
      `${near.totalEggs.toFixed(1)} mot ${perfect.totalEggs.toFixed(1)} ägg`);
  });

  it("en pal på 92 är en bärare i nära läge men inte i perfekt", () => {
    const pals = [pal(MAL, [92, 92, 92], "F"), pal(MAL, [10, 10, 10], "M")];
    // Med tröskel 90 är den första redan färdig; med 100 finns bara luckor.
    assert.equal(planPerfectLine(pals, [], [], 90).alreadyDone?.id, pals[0]!.id);
    assert.equal(planPerfectLine(pals, [], [], 100).alreadyDone, null);
    assert.deepEqual(planPerfectLine(pals, [], [], 100).gaps, [0, 1, 2]);
    assert.deepEqual(planPerfectLine(pals, [], [], 90).gaps, []);
  });

  it("importen använder samma tröskel som planen", () => {
    const pals = [
      pal(MAL, [100, 20, 100], "F"),
      pal(SKUT, [31, 94, 11], "M"),   // 94 räknas som bärare vid 90, inte vid 100
      pal(BEAK, [10, 10, 10], "F"),
    ];
    assert.deepEqual(planIvImports(data, pals, owned, MAL, [ATK], [], 100), [],
      "94 är ingen 100:a");
    const near = planIvImports(data, pals, owned, MAL, [ATK], [], 90);
    assert.equal(near.length, 1);
    assert.equal(near[0]!.donor.s, SKUT);
    // Varje steg: en förälder bär → 34,4 % → 2,905 ägg, två steg = 5,81.
    close(near[0]!.eggs, 2 / statOddsFromHas(true, false, 90));
    assert.ok(near[0]!.eggs < 2 / statOddsFromHas(true, false, 100),
      "nära ska vara billigare per steg än perfekt");
  });
});
