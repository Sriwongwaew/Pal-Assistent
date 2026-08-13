/* Hittas uppslagslager: att varje fråga verkligen får ett svar.
 *
 * Testerna är skrivna som de frågor auditen (aug 2026) visade att appen inte
 * kunde svara på fast datan låg i repot – *"var bryter jag svavel?"*, *"var får
 * jag Life Fruit?"*, *"vad blir Anubis?"* – plus de två fällor som gör svaren
 * fel utan att något ser trasigt ut: en vara som tappar en av sina källor, och
 * en platsgrupp som spricker i en prick per nod.
 *
 * `itemIndex`/`placeIndex` läser bara tabeller i repot, alltså inget nät och
 * ingen save. Där `AppData` behövs byggs en minimal värld för hand. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pairIndex } from "../src/lib/breeding";
import {
  hasSource, itemIndex, itemsMatching, ORE_ITEM, parentPairsOf, parseCombo,
  placeGaps, placeIndex, placesMatching, expedMatching, raidsMatching, skillIndex,
} from "../src/lib/findIndex";
import type { AppData, Species } from "../src/lib/types";

const items = itemIndex();
const places = placeIndex();
const item = (name: string) => items.find((e) => e.item === name);

describe("itemIndex – var får jag X?", () => {
  it("en vara som både släpps och läggs i ranchen bär BÅDA källorna", () => {
    /* Flame Organ var det ursprungliga exemplet på sidan: 38 arter släpper den
       vid nedlägg, och tre lägger den i ranchen. Att bara visa den ena vore
       ett halvt svar. */
    const flame = item("Flame Organ");
    assert.ok(flame, "Flame Organ saknas i varuindexet");
    assert.ok(flame.drops.length > 1, "pal-dropsen saknas");
    assert.deepEqual(
      flame.ranch.map((r) => r.sp).sort(),
      ["Flambelle", "Kelpsea Ignis", "Rooby"],
      "ranch-producenterna saknas eller är fel",
    );
  });

  it("en art som lägger flera varor tappar ingen av dem", () => {
    // `new Map(RANCH_DROPS)` hade tappat den ena tyst.
    assert.ok(item("Mushroom")?.ranch.some((r) => r.sp === "Shroomer"));
    assert.ok(item("Cavern Mushroom")?.ranch.some((r) => r.sp === "Shroomer"));
    assert.ok(item("Gold Coin")?.ranch.some((r) => r.sp === "Dumud Gild"));
  });

  it("malmen är brytbar, inte en pal-drop", () => {
    // "Var bryter jag svavel?" hade inget svar: ingen pal släpper Sulfur.
    const sulfur = item(ORE_ITEM.sulfur);
    assert.ok(sulfur, "Sulfur saknas i varuindexet");
    assert.equal(sulfur.drops.length, 0, "ingen pal ska släppa Sulfur");
    assert.ok((sulfur.mine?.nodes ?? 0) > 0, "malmnoderna saknas");
    assert.ok(hasSource(sulfur), "varan skulle sakna källa helt");
  });

  it("IV-frukterna har pris och material, inte en droptabell", () => {
    for (const name of ["Life Fruit", "Power Fruit", "Stout Fruit"]) {
      const fruit = item(name);
      assert.ok(fruit, `${name} saknas i varuindexet`);
      assert.equal(fruit.drops.length, 0, `${name} ska inte ha pal-drops`);
      assert.equal(fruit.prices.length, 3, `${name} saknar handlarpriser`);
      assert.ok(fruit.material?.includes("Power Lotus"), `${name} saknar materialkälla`);
      assert.equal(fruit.use?.kind, "fruit");
    }
    // Statordningen är HP, Attack, Defense – samma som ivPlan räknar med.
    const stat = (name: string) => {
      const use = item(name)?.use;
      return use?.kind === "fruit" ? use.stat : null;
    };
    assert.equal(stat("Life Fruit"), 0);
    assert.equal(stat("Power Fruit"), 1);
    assert.equal(stat("Stout Fruit"), 2);
  });

  it("själarna vet vad de är till för", () => {
    assert.equal(item("Giant Pal Soul")?.use?.kind, "soul");
    assert.equal(item("Small Pal Soul")?.use?.kind, "soul");
    // En vanlig vara ska INTE få en påhittad användning.
    assert.equal(item("Leather")?.use, null);
  });

  it("varje post har minst en källa – en post utan källa är en lucka", () => {
    const empty = items.filter((e) => !hasSource(e)).map((e) => e.item);
    assert.deepEqual(empty, [], `varor utan någon källa: ${empty.join(", ")}`);
  });

  it("sökningen hittar varan både på namnet och på arten", () => {
    assert.ok(itemsMatching(items, "flame organ").some((e) => e.item === "Flame Organ"));
    assert.ok(itemsMatching(items, "flambelle").some((e) => e.item === "Flame Organ"));
    assert.ok(itemsMatching(items, "shroomer").some((e) => e.item === "Cavern Mushroom"));
  });
});

describe("placeIndex – kartan sökbar", () => {
  it("malm och fruktträd är EN grupp med en räknare, inte en prick var", () => {
    const ore = places.filter((p) => p.kind === "ore");
    assert.equal(ore.length, 4, "en grupp per malmsort");
    assert.ok(ore.every((p) => p.spots.length > 0));
    const fruit = places.filter((p) => p.kind === "fruit");
    assert.equal(fruit.length, 1, "fruktträden är en grupp");
    assert.ok((fruit[0]?.spots.length ?? 0) > 10, "fruktträdens koordinater saknas");
  });

  it("alla åtta torn finns med sin flagga", () => {
    const towers = places.filter((p) => p.kind === "tower");
    assert.equal(towers.length, 8);
    assert.ok(towers.every((p) => p.flag !== null), "tornen behöver flaggan för savens status");
  });

  it("snabbresorna bär sina GUID:n så savens hittat-status går att räkna", () => {
    const travels = places.filter((p) => p.kind === "travel");
    assert.ok(travels.length > 100, "snabbresorna saknas");
    assert.ok(travels.every((p) => p.guids.length === p.spots.length));
  });

  it("dungeons bär nivåspann, och en grupp med flera ingångar spänner över dem", () => {
    const dungeons = places.filter((p) => p.kind === "dungeon");
    assert.ok(dungeons.length >= 8, "dungeons saknas");
    assert.ok(dungeons.some((p) => p.lv !== null), "inga nivåer alls");
    for (const p of dungeons) {
      if (p.lv) assert.ok(p.lv.min <= p.lv.max, `${p.name}: spannet är bakvänt`);
    }
    // Ravine Grotto finns på 15 ställen och ska vara EN grupp med 15 prickar.
    const ravine = dungeons.find((p) => p.name === "Ravine Grotto");
    assert.equal(ravine?.spots.length, 15);
  });

  it("ingen grupp heter ingenting, och bortfallet redovisas", () => {
    /* 33 dungeon-markörer saknar namn i källan och en heter "???". Att
       utelämna dem är rätt – att göra det TYST är det inte, för då letar man
       efter en dungeon som syns på kartan men inte i sökningen. */
    assert.ok(places.every((p) => p.name.trim() !== "" && p.name !== "???"));
    const gaps = placeGaps();
    assert.ok(gaps.dungeonsUnnamed > 0, "bortfallet ska räknas, inte gömmas");
    assert.equal(gaps.campsCollapsed, 58);
  });

  it("lägren är EN grupp – källans namn är interna id:n, inte platsnamn", () => {
    /* `build-worldmap.mjs` tar lägrets namn ur markörens item-id kapat vid
       understrecket, så källan säger "Grass2"/"DLC3". Att visa en intern kod
       som ett platsnamn är samma gissning som en påhittad ranch-vara. */
    const camps = places.filter((p) => p.kind === "camp");
    assert.equal(camps.length, 1);
    assert.equal(camps[0]?.name, "Enemy Camp");
    assert.equal(camps[0]?.spots.length, 58);
    assert.ok(!places.some((p) => /^(Grass2?|Forest1|DLC3|FireCult)$/.test(p.name)));
  });

  it("koordinaterna i en grupp är sorterade, närmast origo först", () => {
    for (const p of places) {
      const d = p.spots.map((s) => s.x ** 2 + s.y ** 2);
      assert.deepEqual(d, [...d].sort((a, b) => a - b), `${p.name}: osorterade koordinater`);
    }
  });

  it("sökningen hittar på namn, typord och malmsort", () => {
    assert.ok(placesMatching(places, "sulfur").some((p) => p.kind === "ore"));
    assert.ok(placesMatching(places, "dungeon").every((p) => p.kind === "dungeon"));
    assert.ok(placesMatching(places, "tower").some((p) => p.kind === "tower"));
  });

  it("alfabossarna hör till arten och är INTE platser", () => {
    // Artheron visar redan var de står plus savens ✓ – två svar på samma fråga
    // är precis den dubblering kategorierna ska slippa.
    assert.equal(places.filter((p) => p.kind === "camp" && p.name === "Alpha").length, 0);
    assert.ok(!places.some((p) => (p.kind as string) === "alpha"));
  });
});

describe("expeditioner och raider", () => {
  it("en vara vars enda källa är en expedition hittas via sajten", () => {
    // Kinship Peach finns i ingen droptabell – utan det här är frågan obesvarad.
    assert.ok(expedMatching("kinship peach").length > 0);
    assert.ok(expedMatching("paloxite").length > 0);
    assert.ok(expedMatching("manuscript").length > 0);
  });

  it("expeditioner hittas också på elementkravet", () => {
    const dragon = expedMatching("dragon");
    assert.ok(dragon.some((s) => s.need?.el === "Dragon"));
  });

  it("raider hittas på boss, summon-item och byte", () => {
    assert.ok(raidsMatching("bellanoir").length > 0);
    assert.ok(raidsMatching("slab").length > 0);
    assert.ok(raidsMatching("meowmere").some((r) => r.name === "Moon Lord"));
  });
});

/* En minimal värld: fyra arter och en partabell där A+B ger C. */
const species = (name: string, extra: Partial<Species> = {}): Species => ({
  code: name, name, combi: 1, rarity: 3, elements: ["Normal"], gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 700, noct: false, stom: 150, food: 3, deck: 1,
  desc: "", ...extra,
});

function world(): AppData {
  const names = ["Alpha", "Beaky", "Cindy", "Dogen"];
  const list = names.map((n) => species(n));
  const n = list.length;
  const pair = new Array<number>((n * (n + 1)) / 2).fill(-1);
  pair[pairIndex(n, 0, 1)] = 2; // Alpha × Beaky → Cindy
  pair[pairIndex(n, 0, 3)] = 2; // Alpha × Dogen → Cindy
  pair[pairIndex(n, 2, 2)] = 2; // Cindy × Cindy → Cindy
  return {
    species: list, pair, gendered: [], uniques: [], passives: {},
    pals: [], player: null, exported: "", palExp: [],
  } as unknown as AppData;
}

describe("avelskombon", () => {
  const data = world();

  it("'A x B' tolkas som ett par – och bara när frågan verkligen är ett par", () => {
    assert.deepEqual(parseCombo(data, "alpha x beaky"), { a: 0, b: 1 });
    assert.deepEqual(parseCombo(data, "Alpha + Dogen"), { a: 0, b: 3 });
    assert.deepEqual(parseCombo(data, "alpha × beaky"), { a: 0, b: 1 });
    assert.equal(parseCombo(data, "alpha"), null, "en ensam art är ingen kombo");
    assert.equal(parseCombo(data, "alpha x nonesuch"), null, "okänd part ger ingen kombo");
    assert.equal(parseCombo(data, "a x b"), null, "ettecknsdelar är för lösa för att matcha");
  });

  it("'vilka blir X?' hittar alla föräldrapar och räknar dem", () => {
    const { pairs, total } = parentPairsOf(data, 2, new Set([0, 1]));
    assert.equal(total, 3, "tre par ger Cindy");
    // Paret man äger båda halvorna av står först – frågan är i praktiken
    // "vilka av MINA blir X?".
    assert.deepEqual(pairs[0], { a: 0, b: 1, owned: true });
    assert.ok(pairs.every((p) => data.pair[pairIndex(4, p.a, p.b)] === 2));
  });

  it("taket skär listan men aldrig totalen", () => {
    const { pairs, total } = parentPairsOf(data, 2, new Set(), 1);
    assert.equal(pairs.length, 1);
    assert.equal(total, 3, "totalen ska säga hur många som FINNS, inte hur många vi visar");
  });
});

describe("skillIndex", () => {
  it("arter utan partnerskill i tabellen utelämnas i stället för att nollas", () => {
    // Vår minimala värld har artkoder som inte finns i skrapet.
    assert.deepEqual(skillIndex(world()), []);
  });
});
