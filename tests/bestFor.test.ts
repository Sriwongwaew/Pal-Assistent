/* Rekommendationerna på "Bäst för…".
 *
 * Två fel som båda var osynliga tills man jämförde med spelet:
 *
 * 1. `PassiveDef.fx` har sex fält, och ALLT utanför dem (uthållighet, simfart,
 *    SAN, hunger, nedkylning) stod som noll. Eternal Engine (+75 % uthållighet)
 *    fanns därför inte bland riddjursförslagen över huvud taget.
 * 2. Fyra elementboostar har id:n som inte följer `ElementBoost_*`-mönstret och
 *    räknades som element-neutrala. Necromus (Dark) fick Eternal Flame
 *    (eld och el) i tre av fyra platser.
 *
 * Procenten i testet är spelets egna, kontrollerade mot palworld.wiki.gg. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { idealLoadout } from "../src/lib/loadout";
import { boostElements, isStamina, PURPOSES, recommendPassives } from "../src/lib/purpose";
import type { AppData, PassiveDef, ScoredPal, Species } from "../src/lib/types";

const fx = (o: Partial<Record<"atk" | "craft" | "move" | "hp" | "ele" | "def", number>> = {}) =>
  ({ atk: 0, craft: 0, move: 0, hp: 0, ele: 0, def: 0, ...o });

const passives: Record<string, PassiveDef> = {
  // Fartpassiverna – de enda datasetet beskriver för riddjur.
  WorldTree_MoveSpeed: { n: "Dimensional Leap", r: 5, pal: true, fx: fx({ move: 50 }) },
  MoveSpeed_up_3: { n: "Swift", r: 4, pal: true, fx: fx({ move: 30 }) },
  MoveSpeed_up_2: { n: "Runner", r: 3, pal: true, fx: fx({ move: 20 }) },
  MoveSpeed_up_1: { n: "Nimble", r: 1, pal: true, fx: fx({ move: 10 }) },
  Legend: { n: "Legend", r: 4, pal: true, fx: fx({ atk: 20, move: 20, def: 20 }) },
  // …och de datasetet INTE beskriver. Alla har tom fx i den riktiga datan.
  Stamina_Up_3: { n: "Eternal Engine", r: 4, pal: true, fx: fx() },
  Stamina_Up_1: { n: "Infinite Stamina", r: 3, pal: true, fx: fx() },
  SwimSpeed_up_3: { n: "King of the Waves", r: 4, pal: true, fx: fx() },
  PAL_Sanity_Down_3: { n: "Heart of the Immovable King", r: 4, pal: true, fx: fx() },
  CoolTimeReduction_Up_1: { n: "Serenity", r: 3, pal: true, fx: fx({ atk: 10 }) },
  // Tempest Fury ger 0 % i nuvarande version – den ska förbli poänglös.
  CoolTimeReduction_Up_3: { n: "Tempest Fury", r: 4, pal: true, fx: fx() },
  // Elementboostarna med avvikande id.
  EternalFlame: { n: "Eternal Flame", r: 4, pal: true, fx: fx({ ele: 60 }) },
  Invader: { n: "Invader", r: 4, pal: true, fx: fx({ ele: 60 }) },
  Nushi: { n: "Lunker", r: 4, pal: true, fx: fx({ ele: 40, def: 20 }) },
  ElementBoost_Dark_2_PAL: { n: "Lord of the Underworld", r: 3, pal: true, fx: fx({ ele: 30 }) },
  CraftSpeed_up2: { n: "Artisan", r: 3, pal: true, fx: fx({ craft: 50 }) },
};

const species = (name: string, elements: Species["elements"], extra: Partial<Species> = {}): Species => ({
  code: name, name, combi: 1, rarity: 5, elements, gp: 0.5, icon: null,
  sc: [100, 100, 100], ws: {}, spr: 1500, noct: false, stom: 300, food: 5, deck: 1, desc: "",
  ...extra,
});

const data = {
  species: [], pair: [], gendered: [], uniques: [], passives,
  pals: [], player: "T", exported: "", palExp: [],
} as unknown as AppData;

const pal = (pv: string[] = []): ScoredPal => ({
  id: "x", s: 0, g: "F", lv: 50, iv: [50, 50, 50], pv, rk: 1, souls: [0, 0, 0, 0],
  c: "Palbox", slot: 0, nick: "", boss: false, lucky: false, xp: 0, fd: null, sn: 100,
  misfit: [], ivSum: 150, tiers: [], pScore: 0, score: 0, stars: 0,
  fxAtk: 0, fxCraft: 0, fxMove: 0, combat: 0, mount: 0,
  synergy: null, cleanCarrier: [], soleCarrier: [], keep: false, reasons: [],
});

/** Ingen bärare alls i boxen – det är själva poängen i första testet. */
const noCarriers = new Map<string, number>();
const names = (l: { name: string }[]) => l.map((x) => x.name);

describe("uppsättningen visar rollens bästa, inte bara det du äger", () => {
  const jetragon = species("Jetragon", ["Dragon"], { spr: 3300 });

  it("Dimensional Leap föreslås även när ingen i boxen bär den", () => {
    const lo = idealLoadout(data, noCarriers, pal(), jetragon, "mount");
    assert.ok(names(lo.slots).includes("Dimensional Leap"),
      `rollens bästa fartpassiv saknas: ${names(lo.slots).join(", ")}`);
    assert.equal(lo.slots.find((s) => s.name === "Dimensional Leap")?.carriers, 0,
      "att den saknas i boxen ska synas som 0 bärare, inte genom att döljas");
  });

  it("de fyra bästa på fart är guidernas endgame-uppsättning", () => {
    const lo = idealLoadout(data, noCarriers, pal(), jetragon, "mount");
    assert.deepEqual(names(lo.slots).slice(0, 4),
      ["Dimensional Leap", "Swift", "Legend", "Runner"]);
  });
});

describe("uthållighet räknas för riddjur", () => {
  const jetragon = species("Jetragon", ["Dragon"], { spr: 3300 });

  it("Eternal Engine får en plats trots att datasetet säger noll", () => {
    const lo = idealLoadout(data, noCarriers, pal(), jetragon, "mount");
    assert.ok(names(lo.slots).includes("Eternal Engine"),
      `Eternal Engine saknas: ${names(lo.slots).join(", ")}`);
    assert.equal(lo.overSubscribed, true, "fem kandidater på fyra platser ska flaggas");
  });

  it("men den tar femte platsen, inte en av fartens fyra", () => {
    const lo = idealLoadout(data, noCarriers, pal(), jetragon, "mount");
    assert.equal(names(lo.slots).indexOf("Eternal Engine"), 4);
  });

  it("uthållighet hör inte hemma i en arbetsuppsättning", () => {
    const worker = species("Verdash", ["Leaf"], { ws: { Handcraft: 5 } as Species["ws"], spr: 700 });
    const lo = idealLoadout(data, noCarriers, pal(), worker, "work");
    assert.ok(!names(lo.slots).includes("Eternal Engine"));
  });

  it("isStamina går på familjen, inte på styrkan i suffixet", () => {
    // Stamina_Up_1 är Infinite Stamina (+50 %) och _3 är Eternal Engine (+75 %).
    assert.equal(isStamina("Stamina_Up_1"), true);
    assert.equal(isStamina("Stamina_Up_3"), true);
    assert.equal(isStamina("MoveSpeed_up_3"), false);
  });
});

describe("elementboostar med avvikande id", () => {
  const rec = (sp: Species) => {
    const purpose = PURPOSES.find((p) => p.id === "attack")!;
    return names(recommendPassives(data, noCarriers, { purpose, target: sp, limit: 20 }).all);
  };

  it("Eternal Flame är eld och el – inte något för en mörkerpal", () => {
    assert.deepEqual(boostElements("EternalFlame"), ["Fire", "Electricity"]);
    assert.ok(!rec(species("Necromus", ["Dark"])).includes("Eternal Flame"));
  });

  it("…men självklar för en eldpal", () => {
    assert.ok(rec(species("Blazamut", ["Fire"])).includes("Eternal Flame"));
  });

  it("Invader täcker två element och gäller båda", () => {
    assert.deepEqual(boostElements("Invader"), ["Dark", "Dragon"]);
    assert.ok(rec(species("Necromus", ["Dark"])).includes("Invader"));
    assert.ok(rec(species("Jetragon", ["Dragon"])).includes("Invader"));
    assert.ok(!rec(species("Verdash", ["Leaf"])).includes("Invader"));
  });

  /* Lunker är "+20 % vatten, +20 % is, +20 % försvar". Elementdelen faller bort
     på fel element, men försvaret gör det inte – därför ska passiven sjunka i
     värde, inte försvinna. Nollar man hela passiven tappar man den delen tyst. */
  it("Lunker är vatten och is – elementdelen faller bort på fel element", () => {
    assert.deepEqual(boostElements("Nushi"), ["Water", "Ice"]);
    const purpose = PURPOSES.find((p) => p.id === "attack")!;
    const scoreFor = (sp: Species) => recommendPassives(data, noCarriers, { purpose, target: sp, limit: 20 })
      .all.find((r) => r.name === "Lunker")?.score ?? 0;
    const ice = scoreFor(species("Frostallion", ["Ice"]));
    const earth = scoreFor(species("Gildra", ["Earth"]));
    assert.ok(ice > earth * 3, `is ${ice} skulle vara långt över jord ${earth}`);
    assert.ok(earth > 0, "försvarsdelen är inte elementbunden och ska finnas kvar");
  });

  it("mönster-id:n fungerar precis som förut", () => {
    assert.deepEqual(boostElements("ElementBoost_Dark_2_PAL"), ["Dark"]);
    assert.deepEqual(boostElements("MoveSpeed_up_3"), []);
  });

  it("beskrivningen säger vilket element boosten gäller", () => {
    const purpose = PURPOSES.find((p) => p.id === "attack")!;
    const all = recommendPassives(data, noCarriers, {
      purpose, target: species("Necromus", ["Dark"]), limit: 20,
    }).all;
    assert.match(all.find((r) => r.name === "Invader")?.why ?? "", /Dark, Dragon/);
  });
});

describe("simfart bara där man simmar", () => {
  const rec = (sp: Species) => {
    const purpose = PURPOSES.find((p) => p.id === "mount")!;
    return names(recommendPassives(data, noCarriers, { purpose, target: sp, limit: 20 }).all);
  };

  it("King of the Waves föreslås en vattenpal", () => {
    assert.ok(rec(species("Whalaska", ["Ice", "Water"])).includes("King of the Waves"));
  });

  it("men inte en flygande drake", () => {
    assert.ok(!rec(species("Jetragon", ["Dragon"], { spr: 3300 })).includes("King of the Waves"));
  });
});

describe("passiver vi medvetet lämnar poänglösa", () => {
  it("Tempest Fury ger 0 % i spelet och ska inte rekommenderas", () => {
    const purpose = PURPOSES.find((p) => p.id === "attack")!;
    const all = recommendPassives(data, noCarriers, {
      purpose, target: species("Necromus", ["Dark"]), limit: 20,
    }).all;
    assert.ok(!names(all).includes("Tempest Fury"),
      "Tempest Fury är en oåtkomlig platshållare utan effekt");
  });

  it("Serenitys nedkylning läggs OVANPÅ dess attack i datan", () => {
    const purpose = PURPOSES.find((p) => p.id === "attack")!;
    const all = recommendPassives(data, noCarriers, {
      purpose, target: species("Necromus", ["Dark"]), limit: 20,
    }).all;
    const serenity = all.find((r) => r.name === "Serenity");
    // fx ger 10 (attack), nedkylningen 20, plus tier-knuffen 1,5.
    assert.ok(serenity && serenity.score > 25, `för låg poäng: ${serenity?.score}`);
  });
});

describe("SAN och hunger räknas för basarbetare", () => {
  const worker = species("Verdash", ["Leaf"], { ws: { Handcraft: 5 } as Species["ws"], spr: 700 });

  it("Heart of the Immovable King är ett arbetsförslag, inte ett stridsförslag", () => {
    const purpose = PURPOSES.find((p) => p.id === "work")!;
    const all = recommendPassives(data, noCarriers, { purpose, target: worker, limit: 20 }).all;
    assert.ok(names(all).includes("Heart of the Immovable King"));
  });

  it("men Artisan slår den – ren arbetshastighet går först", () => {
    const purpose = PURPOSES.find((p) => p.id === "work")!;
    const all = recommendPassives(data, noCarriers, { purpose, target: worker, limit: 20 });
    const iv = (n: string) => all.all.findIndex((r) => r.name === n);
    assert.ok(iv("Artisan") < iv("Heart of the Immovable King"));
  });
});
