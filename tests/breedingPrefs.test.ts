/* Sparade val i avelsplaneraren.
 *
 * Poängen med testet är inte serialiseringen utan *valideringen*: det som ligger
 * i localStorage är gammalt per definition, och ett art-index som inte längre
 * finns skulle nå fram till `data.species[target]!` och krascha hela sidan.
 * Allt trasigt ska bli tomma val, aldrig ett fel. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activePrefs, addBreedingTab, allPrefs, closeBreedingTab, emptyBreedingBook,
  emptyBreedingPrefs, hasBreedingBook, hasBreedingPrefs, MAX_TABS, MAX_WANTED,
  parseBreedingBook, parseBreedingPrefs, serializeBreedingBook,
  serializeBreedingPrefs, setActivePrefs, type BreedingPrefs,
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
      purpose: "work", work: "Mining", useImplants: false, chain: [],
    };
    assert.deepEqual(roundTrip(p), p);
  });

  /* Kedjan sparas som ARTKODER, inte index – index flyttar sig när den statiska
     halvan görs om, och en kedja för fel arter ser inte trasig ut, bara fel. */
  it("tar tillbaka en vald artkedja", () => {
    const codes = data.species.slice(0, 2).map((s) => s.code);
    const p: BreedingPrefs = { ...emptyBreedingPrefs(), chain: codes };
    assert.deepEqual(roundTrip(p).chain, codes);
  });

  it("släpper kedjan helt när en av arterna inte finns kvar", () => {
    const raw = JSON.stringify({ ...emptyBreedingPrefs(), chain: [data.species[0]!.code, "FinnsInte"] });
    assert.deepEqual(parseBreedingPrefs(raw, data).chain, [],
      "en halv kedja är inte den man valde – då är rekommendationen ärligare");
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

/* Flikarna (aug 2026). Två saker som är värda ett test var för sig: att den
   GAMLA posten fortsätter läsas – annars kostar uppdateringen alla sin pågående
   led – och att `parseBreedingPrefs` fortsätter betyda "den aktiva ledens val",
   för fem andra vyer läser samma nyckel utan att veta om flikar. */
describe("parseBreedingBook", () => {
  it("läser den gamla platta posten som en bok med en led", () => {
    const old = serializeBreedingPrefs({
      ...emptyBreedingPrefs(), target: 1, wanted: ["Legend"], ivGoal: "perfect",
    });
    const book = parseBreedingBook(old, data);
    assert.equal(book.tabs.length, 1);
    assert.equal(book.active, 0);
    assert.equal(activePrefs(book).target, 1);
    assert.deepEqual(activePrefs(book).wanted, ["Legend"]);
    assert.equal(activePrefs(book).ivGoal, "perfect");
  });

  it("tar tillbaka en hel bok oförändrad", () => {
    let book = emptyBreedingBook();
    book = setActivePrefs(book, { ...emptyBreedingPrefs(), target: 0 });
    book = addBreedingTab(book);
    book = setActivePrefs(book, { ...emptyBreedingPrefs(), target: 2, wanted: ["Swift"] });
    assert.deepEqual(parseBreedingBook(serializeBreedingBook(book), data), book);
  });

  it("validerar varje led för sig mot dagens data", () => {
    const raw = JSON.stringify({
      tabs: [
        { id: "led-1", prefs: { target: 99, wanted: ["Legend"] } },
        { id: "led-2", prefs: { target: 2, wanted: ["Finns_inte", "Swift"] } },
      ],
      active: 1,
    });
    const book = parseBreedingBook(raw, data);
    // Art 99 finns inte i den här bundlen: målet faller bort, leden står kvar.
    assert.equal(book.tabs[0]!.prefs.target, null);
    assert.deepEqual(book.tabs[0]!.prefs.wanted, ["Legend"]);
    assert.equal(book.tabs[1]!.prefs.target, 2);
    assert.deepEqual(book.tabs[1]!.prefs.wanted, ["Swift"]);
    assert.equal(book.active, 1);
  });

  it("ger alltid minst en led, och ett giltigt aktivt index", () => {
    for (const raw of [null, "", "{trasig", "[1,2,3]", '{"tabs":[]}', '{"tabs":"nej"}']) {
      const book = parseBreedingBook(raw, data);
      assert.equal(book.tabs.length >= 1, true, `tabs för ${raw}`);
      assert.equal(book.active >= 0 && book.active < book.tabs.length, true, `active för ${raw}`);
    }
    // Ett aktivt index utanför listan faller tillbaka på den första leden.
    assert.equal(parseBreedingBook('{"tabs":[{"prefs":{}}],"active":7}', data).active, 0);
  });

  it("ger varje led ett eget id även när posten saknar eller upprepar dem", () => {
    const book = parseBreedingBook(
      '{"tabs":[{"prefs":{}},{"id":"led-1","prefs":{}},{"id":"led-1","prefs":{}}]}', data,
    );
    assert.equal(new Set(book.tabs.map((t) => t.id)).size, 3);
  });

  it("släpper aldrig in fler leder än taket", () => {
    const raw = JSON.stringify({ tabs: Array.from({ length: 20 }, () => ({ prefs: {} })) });
    assert.equal(parseBreedingBook(raw, data).tabs.length, MAX_TABS);
  });

  it("en handredigerad led som själv är en bok blir tomma val, inte en rekursion", () => {
    const raw = '{"tabs":[{"prefs":{"tabs":[{"prefs":{"target":2}}]}}]}';
    assert.deepEqual(parseBreedingBook(raw, data).tabs[0]!.prefs, emptyBreedingPrefs());
  });
});

describe("parseBreedingPrefs mot en bok", () => {
  it("svarar med den AKTIVA ledens val", () => {
    const raw = JSON.stringify({
      tabs: [{ prefs: { target: 0 } }, { prefs: { target: 2, wanted: ["Swift"] } }],
      active: 1,
    });
    const prefs = parseBreedingPrefs(raw, data);
    assert.equal(prefs.target, 2);
    assert.deepEqual(prefs.wanted, ["Swift"]);
  });
});

describe("flikoperationer", () => {
  it("lägger till en led sist och gör den framme, upp till taket", () => {
    let book = emptyBreedingBook();
    for (let i = 1; i < MAX_TABS; i++) {
      book = addBreedingTab(book);
      assert.equal(book.tabs.length, i + 1);
      assert.equal(book.active, i);
    }
    // Full bok returneras oförändrad – samma objekt, alltså ingen omrendering.
    assert.equal(addBreedingTab(book), book);
  });

  it("håller samma led framme när en flik till vänster stängs", () => {
    let book = emptyBreedingBook();
    book = setActivePrefs(book, { ...emptyBreedingPrefs(), target: 0 });
    book = addBreedingTab(book);
    book = setActivePrefs(book, { ...emptyBreedingPrefs(), target: 1 });
    book = addBreedingTab(book);
    book = setActivePrefs(book, { ...emptyBreedingPrefs(), target: 2 });
    assert.equal(book.active, 2);

    const left = closeBreedingTab(book, 0);
    assert.equal(left.tabs.length, 2);
    assert.equal(activePrefs(left).target, 2, "samma led ska ligga kvar framme");

    // Stänger man den aktiva sista fliken flyttas man till den nya sista.
    const self = closeBreedingTab(book, 2);
    assert.equal(self.active, 1);
    assert.equal(activePrefs(self).target, 1);
  });

  it("tömmer sista leden i stället för att ta bort den", () => {
    const one = setActivePrefs(emptyBreedingBook(), {
      ...emptyBreedingPrefs(), target: 1, wanted: ["Legend"],
    });
    const after = closeBreedingTab(one, 0);
    assert.equal(after.tabs.length, 1);
    assert.deepEqual(activePrefs(after), emptyBreedingPrefs());
  });

  it("rör inte boken på ett index som inte finns", () => {
    const book = emptyBreedingBook();
    assert.equal(closeBreedingTab(book, 5), book);
    assert.equal(closeBreedingTab(book, -1), book);
  });

  it("allPrefs ger varje led, i ordning", () => {
    let book = emptyBreedingBook();
    book = setActivePrefs(book, { ...emptyBreedingPrefs(), target: 0 });
    book = addBreedingTab(book);
    book = setActivePrefs(book, { ...emptyBreedingPrefs(), target: 2 });
    assert.deepEqual(allPrefs(book).map((p) => p.target), [0, 2]);
  });
});

describe("hasBreedingBook", () => {
  it("är falsk bara när boken är EN tom led", () => {
    assert.equal(hasBreedingBook(emptyBreedingBook()), false);
    // Två tomma leder är ändå något att rensa – knappen får inte se död ut.
    assert.equal(hasBreedingBook(addBreedingTab(emptyBreedingBook())), true);
    assert.equal(hasBreedingBook(setActivePrefs(emptyBreedingBook(), {
      ...emptyBreedingPrefs(), target: 0,
    })), true);
  });
});
