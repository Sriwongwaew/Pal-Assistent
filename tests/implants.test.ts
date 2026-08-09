/* Pal Surgery Table.
 *
 * Två sorters fel vaktas här, och de går åt olika håll:
 *
 * 1. **Ett dött id.** Tabellen är handskriven ur wikin, så ett stavfel eller en
 *    passiv som bytt id gör tyst att appen slutar föreslå operation för den –
 *    det syns aldrig i gränssnittet, bara i att rådet uteblir.
 * 2. **En påhittad möjlighet.** Att föreslå att man opererar in Demon God vore
 *    värre än att inte föreslå något: man skulle avla efter tre passiver och
 *    sedan stå där. Därför testas invarianten "inget med rank ≥ 4" mot datasetet
 *    i stället för mot tabellen.
 *
 * Oddsen är handräknade ur inheritOdds med ren pool:
 *   4 önskade → 0,1 · 3 → 0,3 · 2 → 0,6 · 1 och 0 → 1,0 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { IMPLANTS, canImplant, implantAdvice } from "../src/lib/implants";
import type { AppData } from "../src/lib/types";

const data = JSON.parse(readFileSync("data/pal-data.base.json", "utf8")) as AppData;

const near = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

describe("IMPLANTS", () => {
  it("är 26 st och innehåller inga dubbletter", () => {
    assert.equal(IMPLANTS.length, 26);
    assert.equal(new Set(IMPLANTS).size, 26);
  });

  it("pekar bara på passiver som finns i datasetet", () => {
    const dead = IMPLANTS.filter((id) => !data.passives[id]);
    assert.deepEqual(dead, [], `dött id: ${dead.join(", ")}`);
  });

  it("innehåller ingenting med rank ≥ 4 – den invarianten är hela poängen", () => {
    const high = IMPLANTS.filter((id) => (data.passives[id]?.r ?? 0) >= 4);
    assert.deepEqual(high, [], `rank ≥ 4 går inte att operera in: ${high.join(", ")}`);
  });

  it("de dyra passiverna måste fortfarande avlas", () => {
    // Stickprov ur datasetets rank 4 – de som gör mest skillnad i planeraren.
    for (const id of ["PAL_ALLAttack_up3", "CraftSpeed_up3", "Deffence_up3", "Rare"]) {
      assert.equal(data.passives[id]?.r, 4, `${id} ska vara rank 4 i datasetet`);
      assert.equal(canImplant(id), false, `${id} ska inte gå att operera in`);
    }
  });

  it("känner igen dem som går, och bryr sig inte om okända id:n", () => {
    assert.equal(canImplant("CraftSpeed_up2"), true); // Artisan
    assert.equal(canImplant("Nocturnal"), true); // Insomnia
    assert.equal(canImplant("Test_PalEgg_HatchingSpeed_Up"), true); // Philanthropist
    assert.equal(canImplant("Framtida_Passiv"), false);
    assert.equal(canImplant(""), false);
  });

  it("hela arbetsuppsättningen går att operera in – utom toppen", () => {
    // Serious + Work Slave + Artisan är den kompletta arbetslinjen i purpose.ts.
    ["CraftSpeed_up1", "PAL_CorporateSlave", "CraftSpeed_up2"]
      .forEach((id) => assert.equal(canImplant(id), true, id));
    // Remarkable Craftsmanship är rank 4 och måste avlas.
    assert.equal(canImplant("CraftSpeed_up3"), false);
  });
});

describe("implantAdvice", () => {
  it("en opererad av fyra gör sista steget 3× billigare", () => {
    const a = implantAdvice(["CraftSpeed_up3", "Deffence_up3", "Rare", "CraftSpeed_up2"]);
    assert.deepEqual(a.implantable, ["CraftSpeed_up2"]);
    assert.deepEqual(a.bred, ["CraftSpeed_up3", "Deffence_up3", "Rare"]);
    near(a.oddsAll, 0.1);
    near(a.oddsBred, 0.3);
    near(a.saving, 3);
  });

  it("två opererade ger 6×, fyra ger 10×", () => {
    const two = implantAdvice(["CraftSpeed_up3", "Rare", "CraftSpeed_up2", "Nocturnal"]);
    near(two.oddsBred, 0.6);
    near(two.saving, 6);

    const all = implantAdvice(["CraftSpeed_up2", "Nocturnal", "MoveSpeed_up_2", "Deffence_up2"]);
    assert.equal(all.bred.length, 0);
    near(all.oddsBred, 1);
    near(all.saving, 10);
  });

  it("inget operabelt bland de önskade ger ingen vinst att skryta med", () => {
    const a = implantAdvice(["CraftSpeed_up3", "Deffence_up3", "Rare", "MoveSpeed_up_3"]);
    assert.deepEqual(a.implantable, []);
    near(a.saving, 1);
  });

  it("vinsten är mindre vid färre önskade – poolen var redan billig", () => {
    // 3 → 2 önskade är 30 % → 60 %, alltså 2×, inte 3×.
    near(implantAdvice(["CraftSpeed_up3", "Rare", "CraftSpeed_up2"]).saving, 2);
    // 2 → 1 är 60 % → 100 %.
    near(implantAdvice(["Rare", "CraftSpeed_up2"]).saving, 1 / 0.6);
    // En enda önskad som går att operera in: inget att avla alls.
    near(implantAdvice(["CraftSpeed_up2"]).saving, 1);
  });

  it("inga önskade passiver alls är ett giltigt läge, inte en division med noll", () => {
    const a = implantAdvice([]);
    assert.deepEqual(a.implantable, []);
    near(a.oddsAll, 1);
    near(a.saving, 1);
  });
});
