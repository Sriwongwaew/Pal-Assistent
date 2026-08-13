/* Kartdatat och projektionen.
 *
 * Facit är HANDRÄKNAT ur transformen px = (459·x + 882 400)/1 448 800 mot
 * tornens datamine-koordinater – går projektionen sönder pekar varje markör
 * fel utan att något ser trasigt ut, precis som en felräknad sannolikhet. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { WORLD_MAP, catchInfo, foundSets, igCoord, mapPct } from "../src/lib/worldmap";

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
