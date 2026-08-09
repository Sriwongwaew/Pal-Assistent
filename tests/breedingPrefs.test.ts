/* Sparade val i avelsplaneraren.
 *
 * Poängen med testet är inte serialiseringen utan *valideringen*: det som ligger
 * i localStorage är gammalt per definition, och ett art-index som inte längre
 * finns skulle nå fram till `data.species[target]!` och krascha hela sidan.
 * Allt trasigt ska bli tomma val, aldrig ett fel. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyBreedingPrefs, hasBreedingPrefs, MAX_WANTED, parseBreedingPrefs,
  serializeBreedingPrefs, type BreedingPrefs,
} from "../src/lib/breedingPrefs";
import type { AppData, PassiveDef, Species } from "../src/lib/types";

const fx = { atk: 0, craft: 0, move: 0, hp: 0, ele: 0, def: 0 };
const passive = (n: string, r: number): PassiveDef => ({ n, r, pal: true, fx });

const species = (name: string): Species => ({
  code: name, name, combi: 1, rarity: 5, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 700, noct: false, stom: 300, food: 5, deck: 1, desc: "",
});

/** Tre arter (index 0–2) och tre passiver – tillräckligt för att testa gränserna. */
const data = {
  species: [species("Lamball"), species("Anubis"), species("Verdash")],
  pair: [], gendered: [], uniques: [], pals: [], player: "T", exported: "", palExp: [],
  passives: {
    Legend: passive("Legend", 4),
    Noukin: passive("Musclehead", 2),
    Swift: passive("Swift", 2),
    PAL_ALLAttack_up3: passive("Demon God", 4),
    PAL_ALLAttack_up2: passive("Ferocious", 3),
  },
} as unknown as AppData;

const roundTrip = (p: BreedingPrefs) => parseBreedingPrefs(serializeBreedingPrefs(p), data);

describe("parseBreedingPrefs", () => {
  it("tar tillbaka en hel uppsättning oförändrad", () => {
    const p: BreedingPrefs = {
      target: 1, base: 0, wanted: ["Legend", "Noukin"], ivGoal: "perfect",
      purpose: "work", work: "Mining", useImplants: false,
    };
    assert.deepEqual(roundTrip(p), p);
  });

  it("saknad useImplants blir PÅ, inte av", () => {
    /* En uppsättning sparad före flaggan fanns ska inte tysta implantat-rådet.
       Bara ett uttryckligt false stänger av det. */
    const old = '{"target":1,"base":null,"wanted":[],"ivGoal":"fast","purpose":null,"work":null}';
    assert.equal(parseBreedingPrefs(old, data).useImplants, true);
    assert.equal(parseBreedingPrefs('{"useImplants":false}', data).useImplants, false);
    assert.equal(parseBreedingPrefs('{"useImplants":"nej"}', data).useImplants, true);
  });

  it("ger tomma val för null, skräp-JSON och fel toppnivåtyp", () => {
    const empty = emptyBreedingPrefs();
    assert.deepEqual(parseBreedingPrefs(null, data), empty);
    assert.deepEqual(parseBreedingPrefs("", data), empty);
    assert.deepEqual(parseBreedingPrefs("{trasig", data), empty);
    assert.deepEqual(parseBreedingPrefs("[1,2,3]", data), empty);
    assert.deepEqual(parseBreedingPrefs('"Anubis"', data), empty);
    assert.deepEqual(parseBreedingPrefs("null", data), empty);
  });

  it("släpper art-index som inte finns i den här bundlen", () => {
    // 3 ligger utanför de tre arterna – exakt vad en ny pal-data.json kan ge.
    const out = parseBreedingPrefs('{"target":3,"base":-1}', data);
    assert.equal(out.target, null);
    assert.equal(out.base, null);
    // …och index som inte ens är heltal.
    assert.equal(parseBreedingPrefs('{"target":1.5}', data).target, null);
    assert.equal(parseBreedingPrefs('{"target":"1"}', data).target, null);
    // Ett giltigt index ska överleva, inklusive 0 (som är falsy).
    assert.equal(parseBreedingPrefs('{"target":0}', data).target, 0);
  });

  it("filtrerar bort passiver som inte finns, dubbletter och allt över taket", () => {
    const raw = JSON.stringify({
      wanted: ["Legend", "Borta", "Noukin", "Legend", 7, null, "Swift",
        "PAL_ALLAttack_up3", "PAL_ALLAttack_up2"],
    });
    const out = parseBreedingPrefs(raw, data);
    assert.deepEqual(out.wanted, ["Legend", "Noukin", "Swift", "PAL_ALLAttack_up3"]);
    assert.equal(out.wanted.length, MAX_WANTED);
    // Fel typ på hela fältet ska inte kasta.
    assert.deepEqual(parseBreedingPrefs('{"wanted":"Legend"}', data).wanted, []);
  });

  it("faller tillbaka på snabbt IV-mål och känner bara igen riktiga syften", () => {
    assert.equal(parseBreedingPrefs('{"ivGoal":"perfect"}', data).ivGoal, "perfect");
    assert.equal(parseBreedingPrefs('{"ivGoal":"snabb"}', data).ivGoal, "fast");
    assert.equal(parseBreedingPrefs('{"purpose":"attack"}', data).purpose, "attack");
    assert.equal(parseBreedingPrefs('{"purpose":"bygga"}', data).purpose, null);
  });

  it("håller ihop syssla och syfte – syssla utan 'Bas & arbete' är inget val", () => {
    // Väljaren nollar sysslan när syftet lämnar "work"; en handredigerad eller
    // gammal post får inte kunna smyga in en syssla som UI:t inte kan visa.
    assert.equal(parseBreedingPrefs('{"purpose":"work","work":"Mining"}', data).work, "Mining");
    assert.equal(parseBreedingPrefs('{"purpose":"attack","work":"Mining"}', data).work, null);
    assert.equal(parseBreedingPrefs('{"work":"Mining"}', data).work, null);
    assert.equal(parseBreedingPrefs('{"purpose":"work","work":"Gruva"}', data).work, null);
  });

  it("delar aldrig ut samma tomma uppsättning två gånger", () => {
    const a = emptyBreedingPrefs();
    a.wanted.push("Legend");
    assert.deepEqual(emptyBreedingPrefs().wanted, []);
  });
});

describe("hasBreedingPrefs", () => {
  it("är falsk bara när ingenting är valt", () => {
    assert.equal(hasBreedingPrefs(emptyBreedingPrefs()), false);
    assert.equal(hasBreedingPrefs({ ...emptyBreedingPrefs(), target: 0 }), true);
    assert.equal(hasBreedingPrefs({ ...emptyBreedingPrefs(), base: 2 }), true);
    assert.equal(hasBreedingPrefs({ ...emptyBreedingPrefs(), wanted: ["Legend"] }), true);
    assert.equal(hasBreedingPrefs({ ...emptyBreedingPrefs(), purpose: "attack" }), true);
    // IV-målet är också ett val – "Perfekt 100/100/100" ska gå att rensa.
    assert.equal(hasBreedingPrefs({ ...emptyBreedingPrefs(), ivGoal: "perfect" }), true);
  });
});
