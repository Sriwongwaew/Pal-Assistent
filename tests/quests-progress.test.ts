/* Uppdragens save-koppling: flaggmappning, nästa strid och questkatalogen. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { bossElements, nextFight, QUEST_BOSSES, WORLDTREE_MID_FLAGS } from "../src/lib/quests";
import { activeQuests, mainQuestTally } from "../src/lib/missions";
import { WORLD_MAP } from "../src/lib/worldmap";
import type { AppData, PlayerProgress } from "../src/lib/types";

const progressWith = (towers: string[], quests: PlayerProgress["quests"] = { active: [], completed: [] }): PlayerProgress => ({
  towers,
  raids: {},
  relics: [],
  relicHeld: 0,
  travels: [],
  fieldBosses: [],
  counts: { dungeons: 0, fixedDungeons: 0, oilrigs: 0, camps: 0, predators: 0, treasure: 0 },
  quests,
});

test("kartans åtta torn matchar bosstabellens flaggor", () => {
  const mapFlags = new Set(WORLD_MAP.towers.map((t) => t.flag));
  const bossFlags = QUEST_BOSSES.filter((b) => b.kind === "tower" && b.id !== "worldtree")
    .map((b) => b.flag);
  // Världsträdet och Panthalus ligger utanför huvudkartan – resten ska
  // finnas på den, annars pekar Uppdrag och Kartan på olika världar.
  assert.deepEqual([...mapFlags].sort(), [...bossFlags].sort());
});

test("nästa strid följer saven — och resan går via Panthalus", () => {
  const eightTowers = WORLD_MAP.towers.map((t) => t.flag);
  // Kens läge: åtta torn nere → nästa är PANTHALUS, inte Världsträdet.
  // Fångsten är nyckeln som öppnar trädet; båda är Lv 70, så arrayordningen
  // i QUEST_BOSSES avgör (stabil sort). Designrundans fynd aug 2026 –
  // nivåsorteringen råkade vända på den riktiga ordningen.
  assert.equal(nextFight(progressWith(eightTowers))?.id, "kingwhale");
  // Panthalus fångad → nu är trädet nästa.
  assert.equal(nextFight(progressWith([...eightTowers, "KingWhaleBoss"]))?.id, "worldtree");
  // Allt nere (inkl. mellanbossarna, som inte är kort) → null = klart.
  assert.equal(nextFight(progressWith([
    ...eightTowers, ...WORLDTREE_MID_FLAGS, "WorldTreeBoss", "KingWhaleBoss",
  ])), null);
  // Utan progressionsfält: lägsta striden, ingen gissning om vad som är nedlagt.
  assert.equal(nextFight(undefined)?.id, "rayne");
});

test("bossElements läser datasetet och faller tillbaka på tabellen", () => {
  const data = {
    species: [
      { code: "MoonQueen", elements: ["Dark", "Normal"] },
      { code: "WorldTreeDragon", elements: [] },
    ],
  } as unknown as AppData;
  const saya = QUEST_BOSSES.find((b) => b.id === "sakurajima")!;
  const tree = QUEST_BOSSES.find((b) => b.id === "worldtree")!;
  assert.deepEqual(bossElements(data, saya), ["Dark", "Normal"]);
  // Zenara & Astralym är ELEMENTLÖSA – tabellen säger [], och typeless-flaggan
  // stänger av motlags-matematiken i stället för att gissa ett element.
  assert.ok(tree.typeless);
  assert.deepEqual(bossElements(data, tree), []);
});

test("questloggen: Main först, okända id:n visas som id", () => {
  const rows = activeQuests(progressWith([], {
    active: ["Sub_Breeder03", "Main_DefeatKingWhale", "Framtida_Quest_XYZ"],
    completed: [],
  }));
  assert.equal(rows[0]!.id, "Main_DefeatKingWhale");
  assert.equal(rows[0]!.name, "Panthalus");
  assert.ok(rows[0]!.main);
  const unknown = rows.find((r) => r.id === "Framtida_Quest_XYZ")!;
  assert.equal(unknown.name, "Framtida_Quest_XYZ");
  assert.equal(unknown.known, false);
});

test("huvuduppdragsmätaren räknar mot katalogen", () => {
  const tally = mainQuestTally(progressWith([], {
    active: [],
    completed: ["Main_DefeatKingWhale", "Sub_Breeder03", "Inte_Ett_Main"],
  }));
  assert.equal(tally.done, 1);
  assert.ok(tally.total >= 40, `katalogen ser trunkerad ut (${tally.total} mains)`);
});
