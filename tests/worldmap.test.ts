/* Kartdatat och projektionen.
 *
 * Facit är HANDRÄKNAT ur transformen px = (459·x + 882 400)/1 448 800 mot
 * tornens datamine-koordinater – går projektionen sönder pekar varje markör
 * fel utan att något ser trasigt ut, precis som en felräknad sannolikhet. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { TREE_MAP, WORLD_MAP, catchInfo, foundSets, igCoord, mapPct } from "../src/lib/worldmap";

const GUID = /^[0-9A-F]{32}$/;

test("projektionen träffar Rayne-tornet där det ligger", () => {
  // Rayne Syndicate Tower: spelkoordinat (111.3, −430.7).
  // left = (459·111.3 + 882 400)/1 448 800 = 64.43 %
  // top  = (473 288 + 459·430.7)/1 448 800 = 46.31 %
  const { left, top } = mapPct(111.3, -430.7);
  assert.ok(Math.abs(left - 64.43) < 0.05, `left ${left}`);
  assert.ok(Math.abs(top - 46.31) < 0.05, `top ${top}`);
});

test("projektionen träffar Feybreak-tornet (negativa koordinater)", () => {
  // Feybreak: (−1293.7, −1668.7) → left 19.92 %, top 85.53 %.
  const { left, top } = mapPct(-1293.7, -1668.7);
  assert.ok(Math.abs(left - 19.92) < 0.05, `left ${left}`);
  assert.ok(Math.abs(top - 85.53) < 0.05, `top ${top}`);
});

test("alla markörer ligger på bilden", () => {
  const layers = [
    ...WORLD_MAP.towers, ...WORLD_MAP.travels, ...WORLD_MAP.relics,
    ...WORLD_MAP.alphas, ...WORLD_MAP.camps, ...WORLD_MAP.dungeons,
    ...WORLD_MAP.fruits, ...WORLD_MAP.ores,
  ];
  assert.ok(layers.length > 900, `bara ${layers.length} markörer`);
  for (const m of layers) {
    const { left, top } = mapPct(m.x, m.y);
    assert.ok(left >= 0 && left <= 100 && top >= 0 && top <= 100,
      `utanför bilden: (${m.x}, ${m.y}) → ${left}, ${top}`);
  }
});

test("de åtta tornen bär savens flaggnamn", () => {
  const flags = WORLD_MAP.towers.map((t) => t.flag).sort();
  assert.deepEqual(flags, [
    "DesertBoss", "ElectricBoss", "ForestBoss", "GrassBoss",
    "SakurajimaBoss", "SnowBoss", "SorajimaBoss", "VikingBoss",
  ]);
});

test("effigies och snabbresor är GUID-nycklade och unika", () => {
  /* 140 = paldb:s 1.0-antal Lifmunk-effigies på huvudkartan, och exakt vad
     relics.json ger efter ramfiltret – två oberoende källor på samma tal.
     (15 till står i Världsträdet, som är en egen karta.) */
  const effigies = WORLD_MAP.relics.filter((r) => r.t === "effigy");
  assert.equal(effigies.length, 140, "Lifmunk-effigies i 1.0");
  assert.equal(WORLD_MAP.relics.length, 360, "alla reliker på huvudkartan");
  const guids = [...WORLD_MAP.relics, ...WORLD_MAP.travels].map((m) => m.g);
  assert.ok(guids.every((g) => GUID.test(g)), "GUID-formatet");
  assert.equal(new Set(guids).size, guids.length, "dubbletter");
});

test("foundSets skiljer 'vet inte' från 'inget hittat'", () => {
  assert.equal(foundSets(undefined), null);
  const sets = foundSets({
    towers: ["GrassBoss"], raids: {}, relics: ["abc123"], relicHeld: 0,
    travels: [], fieldBosses: [], counts: {
      dungeons: 0, fixedDungeons: 0, oilrigs: 0, camps: 0, predators: 0, treasure: 0,
    },
    quests: { active: [], completed: [] },
  });
  assert.ok(sets);
  // GUID:n normaliseras till versaler åt uppslaget.
  assert.ok(sets.relics.has("ABC123"));
  assert.ok(sets.towers.has("GrassBoss"));
});

test("igCoord skriver som spelet", () => {
  assert.equal(igCoord(-134.4, -94.2), "(-134, -94)");
});

/* ---------- Världsträdet: EGEN karta, GEMENSAM save ---------- */

test("trädets projektion är en egen ram, inte huvudkartans", () => {
  /* Zenara & Astralym står på (−1993,1, 1349,7) – utanför huvudkartans ram
     (x ≥ −1922,4), alltså precis den sortens punkt som förut föll bort.
     Handräknat ur trädets ram: left = (459·(−1993,1) + 976 197)/341 797 =
     17,95 %, top = (813 036,5 − 459·1349,7)/341 797 = 56,62 %. */
  const tree = mapPct(-1993.1, 1349.7, "tree");
  assert.ok(Math.abs(tree.left - 17.95) < 0.05, `left ${tree.left}`);
  assert.ok(Math.abs(tree.top - 56.62) < 0.05, `top ${tree.top}`);
  // Samma punkt på huvudkartan hamnar utanför bilden – därför två kartor.
  assert.ok(mapPct(-1993.1, 1349.7).left < 0, "trädet ligger utanför huvudbilden");
});

test("alla trädets markörer ligger på trädets bild", () => {
  const layers = [
    ...TREE_MAP.towers, ...TREE_MAP.travels, ...TREE_MAP.relics, ...TREE_MAP.alphas,
    ...TREE_MAP.ores, ...TREE_MAP.chests, ...TREE_MAP.eggs, ...TREE_MAP.fruits,
    ...TREE_MAP.fishing, ...TREE_MAP.springs, ...TREE_MAP.journals, ...TREE_MAP.junk,
  ];
  assert.ok(layers.length > 300, `bara ${layers.length} markörer`);
  for (const m of layers) {
    const { left, top } = mapPct(m.x, m.y, "tree");
    assert.ok(left >= 0 && left <= 100 && top >= 0 && top <= 100,
      `utanför bilden: (${m.x}, ${m.y}) → ${left}, ${top}`);
  }
});

test("trädets save-nycklar krockar inte med huvudkartans", () => {
  /* Reliker och snabbresor är instans-GUID:n för HELA världen och delas mellan
     kartorna av generatorn. Delade nycklar hade betytt att en och samma effigy
     prickas av på båda kartorna – och dubbelräknas i lägesbandets total. */
  const main = new Set([...WORLD_MAP.relics, ...WORLD_MAP.travels].map((m) => m.g));
  const tree = [...TREE_MAP.relics, ...TREE_MAP.travels].map((m) => m.g);
  assert.ok(tree.every((g) => GUID.test(g)), "GUID-formatet");
  assert.equal(tree.filter((g) => main.has(g)).length, 0, "samma GUID på båda kartorna");
  assert.equal(TREE_MAP.relics.length, 47, "reliker i trädet");
  assert.equal(TREE_MAP.relics.filter((r) => r.t === "effigy").length, 15, "Lifmunk i trädet");
  assert.equal(TREE_MAP.travels.length, 17, "snabbresor i trädet");
});

test("bara trädets SLUTBOSS bär en savflagga", () => {
  /* Mellanbossarna ligger i saven som WorldTreeMiddleBoss1..3, men ingen källa
     säger vilken av de tre som är vilket nummer. En gissad koppling hade bockat
     av fel boss, alltså bär de ingen flagga alls. */
  assert.equal(TREE_MAP.towers.length, 4);
  const flagged = TREE_MAP.towers.filter((t) => t.flag);
  assert.equal(flagged.length, 1);
  assert.equal(flagged[0]!.flag, "WorldTreeBoss");
  assert.match(flagged[0]!.name, /Zenara/);
});

test("catchInfo hittar alfabossar i trädet och säger vilken karta", () => {
  /* Sex av trädets sju alfor finns INGEN annanstans. Så länge bara huvudkartan
     lästes sa appen "FÅNGA" utan plats, fast platsen fanns i källan. */
  const aegidron = catchInfo("DomeArmorDragon");
  assert.equal(aegidron?.kind, "alpha");
  if (aegidron?.kind === "alpha") {
    assert.equal(aegidron.map, "tree");
    assert.ok(aegidron.lv >= 70, `Lv ${aegidron.lv}`);
  }
  // Huvudkartans alfor svarar fortfarande "main".
  const jet = catchInfo("JetDragon");
  if (jet?.kind === "alpha") assert.equal(jet.map, "main");
});

test("catchInfo säger HUR en oavlingsbar art skaffas", () => {
  // Jetragon: legendar utan vild spawn – källan är den fasta alfabossen,
  // och den lägsta nivån av spawnarna är den som ska visas.
  const jet = catchInfo("JetDragon");
  assert.equal(jet?.kind, "alpha");
  if (jet?.kind === "alpha") assert.ok(jet.lv >= 50, `Jetragon Lv ${jet.lv}`);
  // Raid-arterna går inte att fånga alls – de kläcks ur raidens ägg.
  assert.deepEqual(catchInfo("NightLady"), { kind: "raid" });
  assert.deepEqual(catchInfo("KingBahamut_Dragon"), { kind: "raid" });
  // Vanlig vild art utan alfaspawn: null = säg FÅNGA som förut.
  assert.equal(catchInfo("SheepBall"), null);
});
