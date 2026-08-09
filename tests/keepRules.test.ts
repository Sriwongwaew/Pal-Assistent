/* Spara-reglerna för pals man använder som avelsstam.
 *
 * Tier-reglerna ensamma missar precis den pal man helst vill behålla:
 * Artisan är tier 3 och Work Slave tier 1, så en färdig arbetsuppsättning har
 * bara EN guldpassiv och föreslogs som matarpal. Och en pal som bär Legend helt
 * ensam är en bättre förälder än en som bär Legend plus tre andra, eftersom
 * varje extra passiv hamnar i arvspoolen – det är hela poängen med "ren bärare".
 * Tierna nedan är dataset-värden, inte påhitt. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { translate } from "../src/i18n";
import { applyKeepRules, scorePal } from "../src/lib/scoring";
import type { AppData, OwnedPal, PassiveDef, ScoredPal, Species } from "../src/lib/types";

const fx = (o: Partial<Record<"atk" | "craft" | "move" | "hp" | "ele" | "def", number>> = {}) =>
  ({ atk: 0, craft: 0, move: 0, hp: 0, ele: 0, def: 0, ...o });

const passives: Record<string, PassiveDef> = {
  // Arbetsuppsättningen ur Kens box – bara Remarkable är guld.
  CraftSpeed_up3: { n: "Remarkable Craftsmanship", r: 4, pal: true, fx: fx({ craft: 75 }) },
  CraftSpeed_up2: { n: "Artisan", r: 3, pal: true, fx: fx({ craft: 50 }) },
  PAL_CorporateSlave: { n: "Work Slave", r: 1, pal: true, fx: fx({ craft: 30, atk: -30 }) },
  // Försvarspassiver: bidrar till Strid med vikt 0,15 – alltså nästan inget.
  Deffence_up2: { n: "Burly Body", r: 3, pal: true, fx: fx({ def: 20 }) },
  Deffence_up2_2: { n: "Heavyweight", r: 2, pal: true, fx: fx({ def: 20 }) },
  ElementBoost_Ice_1_PAL: { n: "Coldblooded", r: 1, pal: true, fx: fx({ ele: 10 }) },
  Legend: { n: "Legend", r: 4, pal: true, fx: fx({ atk: 20, move: 20, def: 20 }) },
  Rare: { n: "Lucky", r: 4, pal: true, fx: fx({ atk: 15, craft: 20 }) },
  Nimble: { n: "Nimble", r: 1, pal: true, fx: fx({ move: 10 }) },
  Hooligan: { n: "Hooligan", r: 1, pal: true, fx: fx({ atk: 10 }) },
  CraftSpeed_down2: { n: "Slacker", r: -3, pal: true, fx: fx({ craft: -30 }) },
  // Lunker: elementskada + försvar. Gör ingenting för en arbetare.
  Nushi: { n: "Lunker", r: 4, pal: true, fx: fx({ ele: 40, def: 20 }) },
  // Heart of the Immovable King har TOMMA fx i datasetet – effekten finns i
  // spelet men beskrivs inte, så den går inte att döma.
  HeartOfImmovable: { n: "Heart of the Immovable King", r: 4, pal: true, fx: fx() },
  ElementBoost_Dark_2_PAL: { n: "Lord of the Underworld", r: 4, pal: true, fx: fx({ ele: 30 }) },
};

const species = (
  name: string, elements: Species["elements"] = ["Normal"], extra: Partial<Species> = {},
): Species => ({
  code: name, name, combi: 1, rarity: 5, elements, gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 700, noct: false, stom: 300, food: 5, deck: 1, desc: "",
  ...extra,
});

/* Art 0 och 1 har inga roller alls (låga scalings, ingen arbetslämplighet), så
   passform-regeln lämnar dem i fred – de testerna handlar om något annat.
   Art 2 och 3 är Gildra-fallet: arbetare respektive stridspal. */
const data = {
  species: [
    species("Venusa", ["Leaf"]),
    species("Azurobe Cryst", ["Ice", "Dragon"]),
    species("Gildra", ["Earth"], { ws: { Handcraft: 5 } as Species["ws"], sc: [105, 120, 105], spr: 720 }),
    species("Necromus", ["Dark"], { sc: [130, 145, 120], spr: 1900 }),
    /* Gloopie står med i FISHING_PALS och får därför rollen "fiske". Allt annat
       är standardvärden, alltså under varje ROLE_FLOOR – den har fiske som ENDA
       roll, precis som Jelliette och Jellroy. */
    species("Gloopie", ["Water"]),
  ],
  pair: [], gendered: [], uniques: [], passives, pals: [], player: "T", exported: "", palExp: [],
} as unknown as AppData;

let seq = 0;
const owned = (pv: string[], o: Partial<OwnedPal> = {}): OwnedPal => ({
  id: `p${++seq}`, s: 0, g: "F", lv: 50, iv: [50, 50, 50], pv, rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  ...o,
});

/**
 * Kör hela kedjan scorePal → applyKeepRules, som `PalDataContext` gör.
 * `bestOf` sätts till en pal som inte finns, annars fastnar allt på
 * "Bäst i sin art" och testet mäter inget.
 */
function keepOf(list: OwnedPal[]): ScoredPal[] {
  const scored = list.map((p) => scorePal(data, p));
  applyKeepRules(data, scored, new Map());
  return scored;
}

/* Skälen är `Msg` och inte text – logiken väljer nyckel, gränssnittet språk.
   Testet läser dem på svenska, så facit går att jämföra med vad som står i
   appen. */
const reasons = (p: ScoredPal) => p.reasons.map((m) => translate("sv", m.key, m.vars)).join(" · ");

describe("färdig passiv-uppsättning", () => {
  it("Remarkable + Work Slave + Artisan sparas, trots bara en guldpassiv", () => {
    const [p] = keepOf([owned(["CraftSpeed_up3", "PAL_CorporateSlave", "CraftSpeed_up2"])]);
    assert.ok(p);
    assert.equal(p.tiers.filter((t) => t === 4).length, 1, "bara en guldpassiv – gamla regeln räckte inte");
    assert.equal(p.keep, true, `sparades inte: ${reasons(p)}`);
    assert.deepEqual(p.synergy?.label, "purpose.work");
    assert.equal(p.synergy?.names.length, 3);
  });

  it("två arbetspassiver räcker inte – tre är kravet", () => {
    const [p] = keepOf([owned(["PAL_CorporateSlave", "CraftSpeed_up2", "Nimble"])]);
    assert.equal(p?.synergy, null);
  });

  /* Burly Body (+20 % försvar) väger 0,15 i Strid = 3 poäng. Utan tröskeln
     räknades den som en attackpassiv och nästan varje pal fick en uppsättning. */
  it("småbidrag åt fel håll räknas inte som en uppsättning", () => {
    const [p] = keepOf([
      owned(["Deffence_up2", "Deffence_up2_2", "ElementBoost_Ice_1_PAL", "Hooligan"], { s: 1 }),
    ]);
    assert.equal(p?.synergy, null, `råkade bli en uppsättning: ${p?.synergy?.names.join(", ")}`);
  });

  it("men tre riktiga försvarspassiver ÄR en tålig-uppsättning", () => {
    const [p] = keepOf([owned(["Deffence_up2", "Deffence_up2_2", "Legend"], { s: 1 })]);
    assert.equal(p?.synergy?.label, "purpose.tank");
  });
});

describe("ren bärare av en toppassiv", () => {
  it("Legend helt ensam sparas – ingenting späder ut arvspoolen", () => {
    const [p] = keepOf([owned(["Legend"])]);
    assert.equal(p?.keep, true);
    assert.deepEqual(p?.cleanCarrier.map((c) => c.name), ["Legend"]);
  });

  it("en extra passiv går bra, tre gör den smutsig", () => {
    const [ok, dirty] = keepOf([
      owned(["Legend", "Nimble"]),
      owned(["Legend", "Nimble", "Hooligan", "Deffence_up2"]),
    ]);
    assert.equal(ok?.cleanCarrier.length, 1);
    assert.equal(dirty?.cleanCarrier.length, 0, "tre extra passiver är ingen ren bärare");
  });

  /* Den rena Legend-bäraren måste finnas med: annars är den negativa palen
     boxens ENDA Legend-bärare och räddas av skyddsnätet i stället. */
  it("en negativ passiv diskvalificerar", () => {
    const [p] = keepOf([owned(["Legend", "CraftSpeed_down2"]), owned(["Legend"])]);
    assert.equal(p?.cleanCarrier.length, 0);
    assert.equal(p?.keep, false, `sparades ändå: ${reasons(p!)}`);
  });

  it("utan toppassiv är renhet ingen anledning", () => {
    const [p] = keepOf([owned(["Nimble"])]);
    assert.equal(p?.cleanCarrier.length, 0);
    assert.equal(p?.keep, false);
  });
});

/* Kens invändning: "vi har Gildra med Lunker som jag är ganska säker är dålig
   för den". Gildra ligger under 90:e percentilen i attack (120), HP+försvar
   (210) och sprint (720) men har Handiwork 5 – alltså arbetare, och då gör
   elementskada + försvar ingen nytta. */
const GILDRA = 2, NECROMUS = 3, GLOOPIE = 4;

describe("passiven måste göra nytta på arten", () => {
  it("Lunker på en arbetare är ingen anledning att spara den", () => {
    const [gildra] = keepOf([
      owned(["Nushi"], { s: GILDRA }),
      owned(["Nushi"], { s: NECROMUS }),  // så skyddsnätet inte räddar Gildran
    ]);
    assert.equal(gildra?.cleanCarrier.length, 0);
    assert.equal(gildra?.keep, false, `sparades ändå: ${reasons(gildra!)}`);
  });

  it("samma Lunker på en stridspal ÄR en anledning", () => {
    const [necromus] = keepOf([owned(["Nushi"], { s: NECROMUS })]);
    assert.deepEqual(necromus?.cleanCarrier.map((c) => c.name), ["Lunker"]);
  });

  it("arbetspassiven passar arbetaren", () => {
    const [gildra] = keepOf([owned(["CraftSpeed_up3"], { s: GILDRA })]);
    assert.deepEqual(gildra?.cleanCarrier.map((c) => c.name), ["Remarkable Craftsmanship"]);
  });

  it("en passiv utan fx döms inte – effekten finns, datasetet beskriver den bara inte", () => {
    const [gildra] = keepOf([owned(["HeartOfImmovable"], { s: GILDRA })]);
    assert.deepEqual(gildra?.cleanCarrier.map((c) => c.name), ["Heart of the Immovable King"]);
  });

  it("elementboost för fel element passar ingen", () => {
    const [gildra] = keepOf([
      owned(["ElementBoost_Dark_2_PAL"], { s: GILDRA }),   // Gildra är Earth
      owned(["ElementBoost_Dark_2_PAL"], { s: NECROMUS }), // Necromus är Dark
    ]);
    assert.equal(gildra?.cleanCarrier.length, 0);
  });

  it("en art utan tydlig roll går inte att jämföra mot – då duger allt", () => {
    const [filler] = keepOf([owned(["Nushi"], { s: 0 })]);
    assert.deepEqual(filler?.cleanCarrier.map((c) => c.name), ["Lunker"]);
  });

  /* Fiske är en roll utan syfte: ingen passiv i spelet påverkar fisket, det
     sitter i artens partnerfärdighet. Rollen får därför aldrig döma passiver —
     gör den det blir svaret "ingen passiv passar" för Gloopie, Jelliette och
     Jellroy, som inte har någon annan roll, och sidan föreslår att mata bort
     boxens fiskare med Legend och allt. */
  it("en fiskare döms inte på sina passiver – fiske är en roll utan syfte", () => {
    const [gloopie] = keepOf([
      owned(["Legend"], { s: GLOOPIE }),
      owned(["Legend"], { s: NECROMUS }),  // så skyddsnätet inte räddar fiskaren
    ]);
    assert.deepEqual(gloopie?.cleanCarrier.map((c) => c.name), ["Legend"]);
  });

  it("tre arbetspassiver på en stridspal är ingen uppsättning", () => {
    const [p] = keepOf([
      owned(["CraftSpeed_up3", "PAL_CorporateSlave", "CraftSpeed_up2"], { s: NECROMUS }),
    ]);
    assert.equal(p?.synergy, null, `blev ändå en uppsättning: ${p?.synergy?.label}`);
  });
});

describe("skyddsnät: sista bäraren av en toppassiv", () => {
  it("sparas även när passiven inte passar arten", () => {
    const [gildra] = keepOf([owned(["Nushi"], { s: GILDRA })]);
    assert.equal(gildra?.keep, true, "boxens enda Lunker skulle matats bort");
    assert.deepEqual(gildra?.soleCarrier.map((c) => c.name), ["Lunker"]);
    // Det är inte samma sak som att palen är bra – skälen ska skilja på det.
    assert.equal(gildra?.cleanCarrier.length, 0);
    assert.ok(reasons(gildra!).startsWith("Enda bäraren av"));
  });

  it("räddar bara EN, inte alla bärare", () => {
    const kept = keepOf([
      owned(["Nushi"], { s: GILDRA }), owned(["Nushi"], { s: GILDRA }),
      owned(["Nushi"], { s: GILDRA }),
    ]).filter((p) => p.keep);
    assert.equal(kept.length, 1);
  });

  it("håller sig borta när passiven redan har ett hem", () => {
    const kept = keepOf([
      owned(["Nushi"], { s: GILDRA }),
      owned(["Nushi"], { s: NECROMUS }),
    ]).filter((p) => p.keep);
    assert.deepEqual(kept.map((p) => p.s), [NECROMUS]);
  });
});

describe("taket för rena bärare", () => {
  it("sparar två per art och passiv – resten är kondensmat", () => {
    const kept = keepOf([
      owned(["Legend"], { g: "M" }), owned(["Legend"], { g: "M" }),
      owned(["Legend"], { g: "F" }), owned(["Legend"], { g: "F" }),
      owned(["Legend"], { g: "F" }),
    ]).filter((p) => p.keep);
    assert.equal(kept.length, 2);
    // En hane och en hona: en linje kräver en parning.
    assert.deepEqual(kept.map((p) => p.g).sort(), ["F", "M"]);
  });

  it("finns bara ett kön tas de två renaste av det", () => {
    const kept = keepOf([
      owned(["Legend", "Nimble"], { g: "M" }),
      owned(["Legend"], { g: "M" }),
      owned(["Legend"], { g: "M" }),
    ]).filter((p) => p.keep);
    assert.equal(kept.length, 2);
    assert.ok(kept.every((p) => p.pv.length === 1), "den smutsigare skulle inte fått plats");
  });

  it("taket räknas per passiv, inte per pal", () => {
    const kept = keepOf([
      owned(["Legend"], { g: "M" }), owned(["Legend"], { g: "F" }),
      owned(["Rare"], { g: "M" }), owned(["Rare"], { g: "F" }),
    ]).filter((p) => p.keep);
    assert.equal(kept.length, 4);
  });

  it("och per art – samma passiv i en annan art är en egen bärare", () => {
    const kept = keepOf([
      owned(["Legend"], { g: "M" }), owned(["Legend"], { g: "F" }), owned(["Legend"], { g: "F" }),
      owned(["Legend"], { s: 1, g: "M" }), owned(["Legend"], { s: 1, g: "F" }),
    ]).filter((p) => p.keep);
    assert.equal(kept.length, 4);
  });
});
