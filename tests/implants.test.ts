/* Pal Surgery Table.
 *
 * Testet vaktar framför allt EN sak: att appen inte påstår att något är omöjligt.
 * Första versionen av `implants.ts` byggde på wikins 26 moduler och drog
 * slutsatsen "inget med rank ≥ 4 går att operera in". Den slutsatsen föll på
 * första riktiga saven, som innehöll implantat för Swift (rank 4) och Mastery of
 * Fasting (rank 4). Testerna nedan är skrivna så att samma fel inte kan smyga
 * tillbaka: ägandet läses, modulerna antyds, och ingenting nekas.
 *
 * Oddsen är handräknade ur inheritOdds med ren pool:
 *   4 önskade → 0,1 · 3 → 0,3 · 2 → 0,6 · 1 och 0 → 1,0 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  IMPLANT_ITEM_PREFIX, KNOWN_MODULES, implantAdvice, implantItemId, isKnownModule,
  ownedImplants, ownsImplant, passiveOfImplantItem,
} from "../src/lib/implants";
import { mergeIntoAppData } from "../src/lib/saveImport";
import type { AppData } from "../src/lib/types";

const data = JSON.parse(readFileSync("data/pal-data.base.json", "utf8")) as AppData;

const near = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

/** En bundle med ett förråd. */
const withImplants = (implants: Record<string, number> | undefined): AppData =>
  ({ ...data, implants }) as AppData;

describe("item-id ↔ passiv", () => {
  it("suffixet ÄR passivens id, så inget uppslag behövs", () => {
    assert.equal(implantItemId("CraftSpeed_up2"), `${IMPLANT_ITEM_PREFIX}CraftSpeed_up2`);
    assert.equal(passiveOfImplantItem(implantItemId("Nocturnal")), "Nocturnal");
  });

  it("känner igen de två id:n som faktiskt låg i en riktig save", () => {
    // Uppmätta ur Level.sav – det är de som motbevisade wikins rank-gräns.
    assert.equal(
      passiveOfImplantItem("PalPassiveSkillChange_Consumable_MoveSpeed_up_3"),
      "MoveSpeed_up_3",
    );
    assert.equal(
      passiveOfImplantItem("PalPassiveSkillChange_Consumable_PAL_FullStomach_Down_3"),
      "PAL_FullStomach_Down_3",
    );
    // …och båda är rank 4 i datasetet. Vore de rank ≤ 3 hade wikins lista hållit.
    assert.equal(data.passives.MoveSpeed_up_3?.r, 4);
    assert.equal(data.passives.PAL_FullStomach_Down_3?.r, 4);
  });

  it("säger nej till allt som inte är ett implantat", () => {
    assert.equal(passiveOfImplantItem("SkillCard_Inferno"), null);
    assert.equal(passiveOfImplantItem("Money"), null);
    // Prefix utan suffix är inget implantat, inte ett implantat för "".
    assert.equal(passiveOfImplantItem(IMPLANT_ITEM_PREFIX), null);
    assert.equal(passiveOfImplantItem(""), null);
  });
});

describe("KNOWN_MODULES", () => {
  it("är 26 st, utan dubbletter, och pekar på passiver som finns", () => {
    assert.equal(KNOWN_MODULES.length, 26);
    assert.equal(new Set(KNOWN_MODULES).size, 26);
    const dead = KNOWN_MODULES.filter((id) => !data.passives[id]);
    assert.deepEqual(dead, [], `dött id: ${dead.join(", ")}`);
  });

  it("hela arbetsuppsättningen finns som modul", () => {
    // Serious + Work Slave + Artisan är den kompletta arbetslinjen i purpose.ts.
    ["CraftSpeed_up1", "PAL_CorporateSlave", "CraftSpeed_up2"]
      .forEach((id) => assert.equal(isKnownModule(id), true, id));
  });

  it("är ett ja-svar, aldrig ett nej: Swift saknas i listan men går ändå", () => {
    assert.equal(isKnownModule("MoveSpeed_up_3"), false);
    // Och just därför får ingen fråga appen "kan den här opereras in?" och få
    // nej. Ägandet är det enda som avgör – här har spelaren den.
    assert.equal(ownsImplant(withImplants({ MoveSpeed_up_3: 1 }), "MoveSpeed_up_3"), true);
  });
});

describe("ownedImplants – vet inte är inte samma som inga", () => {
  it("skiljer null från tomt objekt", () => {
    assert.equal(ownedImplants(withImplants(undefined)), null);
    assert.deepEqual(ownedImplants(withImplants({})), {});
  });

  it("noll i antal räknas inte som ägt", () => {
    assert.equal(ownsImplant(withImplants({ Nocturnal: 0 }), "Nocturnal"), false);
    assert.equal(ownsImplant(withImplants({ Nocturnal: 2 }), "Nocturnal"), true);
    assert.equal(ownsImplant(withImplants(undefined), "Nocturnal"), false);
  });
});

/* Sammanfogningen äger den enda regeln som kan gå sönder tyst: förrådet ska
   ERSÄTTAS, aldrig ärvas från den förra bundlen. Ett `?? base.implants` gör
   förrådet monotont växande – du använder ett implantat, appen fortsätter räkna
   det, och rådet "du har den här" blir fel utan att något ser trasigt ut. */
describe("mergeIntoAppData – förrådet", () => {
  const base = withImplants({ Nocturnal: 3, CraftSpeed_up2: 1 });
  const read = { player: "K", pals: [], modified: 1_700_000_000 };

  it("ersätter, ärver inte", () => {
    const merged = mergeIntoAppData(base, { ...read, implants: { Nocturnal: 1 } });
    assert.deepEqual(merged.implants, { Nocturnal: 1 });
  });

  it("ett tomt förråd är ett svar, inte ett saknat fält", () => {
    assert.deepEqual(mergeIntoAppData(base, { ...read, implants: {} }).implants, {});
  });

  it("en läsare som inte kan fältet ger 'vet inte', inte förra läsningens siffror", () => {
    const merged = mergeIntoAppData(base, read);
    assert.equal(merged.implants, undefined);
    assert.equal(ownedImplants(merged), null);
    // JSON.stringify släpper nyckeln – filen ska inte påstå ett tomt förråd.
    assert.equal("implants" in JSON.parse(JSON.stringify(merged)), false);
  });
});

describe("implantAdvice", () => {
  const FOUR = ["CraftSpeed_up3", "Deffence_up3", "Rare", "CraftSpeed_up2"];

  it("ett ägt implantat av fyra gör sista steget 3× billigare", () => {
    const a = implantAdvice(FOUR, { CraftSpeed_up2: 1 });
    assert.deepEqual(a.owned, ["CraftSpeed_up2"]);
    assert.deepEqual(a.available, []);
    assert.deepEqual(a.unknown, ["CraftSpeed_up3", "Deffence_up3", "Rare"]);
    near(a.oddsAll, 0.1);
    near(a.oddsOwned, 0.3);
    near(a.saving, 3);
  });

  it("delar upp i ägt, tillgängligt och okänt – tre olika slags påstående", () => {
    const a = implantAdvice(FOUR, { Rare: 1 });
    assert.deepEqual(a.owned, ["Rare"]); // ur saven: säkert
    assert.deepEqual(a.available, ["CraftSpeed_up2"]); // wikins modul: antytt
    assert.deepEqual(a.unknown, ["CraftSpeed_up3", "Deffence_up3"]); // vet inte
    near(a.saving, 3); // 0,3 / 0,1 – bara det ägda räknas i "i dag"
    near(a.oddsBest, 0.6); // skaffar man modulen också: 2 kvar att avla
    near(a.savingBest, 6);
  });

  it("äger man allt behövs ingen avling", () => {
    const a = implantAdvice(FOUR, Object.fromEntries(FOUR.map((id) => [id, 1])));
    assert.deepEqual(a.unknown, []);
    near(a.oddsOwned, 1);
    near(a.saving, 10);
  });

  it("okänt förråd ger ingen vinst att skryta med, bara modulerna", () => {
    const a = implantAdvice(FOUR, null);
    assert.deepEqual(a.owned, []);
    assert.deepEqual(a.available, ["CraftSpeed_up2"]);
    near(a.saving, 1); // ingenting att hoppa över i dag …
    near(a.savingBest, 3); // … men taket är 3× om modulen skaffas
  });

  it("vinsten är mindre vid färre önskade – poolen var redan billig", () => {
    // 3 → 2 önskade är 30 % → 60 %, alltså 2×, inte 3×.
    near(implantAdvice(["CraftSpeed_up3", "Rare", "CraftSpeed_up2"], { CraftSpeed_up2: 1 }).saving, 2);
    // 2 → 1 är 60 % → 100 %.
    near(implantAdvice(["Rare", "CraftSpeed_up2"], { CraftSpeed_up2: 1 }).saving, 1 / 0.6);
  });

  it("inga önskade passiver alls är ett giltigt läge, inte en division med noll", () => {
    const a = implantAdvice([], { Nocturnal: 1 });
    assert.deepEqual(a.owned, []);
    near(a.oddsAll, 1);
    near(a.saving, 1);
  });
});
