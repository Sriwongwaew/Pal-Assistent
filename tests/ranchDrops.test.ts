/* Ranchtabellen mot sin egen källa.
 *
 * `RANCH_DROPS` är läst ur spelets partnerskill-text, art för art: varje
 * ranch-pal har en skill vars beskrivning namnger varan ordagrant ("Sometimes
 * drops Ice Organ when assigned to Ranch"). Testet läser samma text ur
 * `src/lib/data/partnerSkills.json` och kontrollerar båda riktningarna:
 *
 * 1. **Ingen rad är påhittad** – varunamnet ska stå i artens egen skill-text.
 *    Det är det enda som skiljer den här tabellen från en gissning, och en
 *    felskriven vara ser precis lika trovärdig ut som en riktig.
 * 2. **Ingen art saknas** – varje art vars text säger att den producerar i
 *    ranchen måste ha en rad. Tolv av tjugonio saknades tidigare, och Lamball
 *    saknades av ett andra skäl: den har `ws: {}` i datasetet, så en lista
 *    driven på `MonsterFarm > 0` kan inte hitta den (aug 2026).
 *
 * Ingen nätåtkomst: både texten och den statiska halvan ligger i repot.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { RANCH_DROPS, RANCH_SPECIES, ranchItemsOf } from "../src/lib/constants";

/* Ur repo-roten, inte __dirname: testerna kompileras till tests-dist/ men
   `npm test` står alltid i roten (samma sak som partnerMeta.test.ts). */
const read = (...p: string[]) => readFileSync(path.join(process.cwd(), ...p), "utf8");

const skills = JSON.parse(read("src", "lib", "data", "partnerSkills.json")) as
  Record<string, { skill: string; desc: string; tags: string[] }>;
const base = JSON.parse(read("data", "pal-data.base.json")) as
  { species: { code: string; name: string; ws: Record<string, number> }[] };

/** Artnamn → partnerskill, som tabellen är skriven (den nycklas på namn). */
const skillOfName = new Map(
  base.species
    .map((sp) => [sp.name, skills[sp.code]] as const)
    .filter((pair): pair is [string, { skill: string; desc: string; tags: string[] }] => !!pair[1]),
);

describe("RANCH_DROPS", () => {
  it("varje rad pekar på en art som finns i datasetet", () => {
    const names = new Set(base.species.map((sp) => sp.name));
    for (const row of RANCH_DROPS) {
      assert.ok(names.has(row.sp), `okänd art i ranchtabellen: ${row.sp}`);
    }
  });

  it("varje namngiven vara står ordagrant i artens partnerskill-text", () => {
    for (const row of RANCH_DROPS) {
      // Grupper ("Seeds", "Buried items") ÄR våra ord för att texten inte
      // räknar upp varorna – de kan per definition inte stå där.
      if (row.group) continue;
      const ps = skillOfName.get(row.sp);
      assert.ok(ps, `${row.sp} saknar partnerskill – varan går inte att belägga`);
      assert.ok(
        ps.desc.includes(row.item),
        `${row.sp}: "${row.item}" står inte i skill-texten (${ps.desc})`,
      );
    }
  });

  it("varje rads text säger att den gäller ranchen", () => {
    for (const row of RANCH_DROPS) {
      const ps = skillOfName.get(row.sp);
      assert.ok(ps, `${row.sp} saknar partnerskill`);
      assert.ok(
        ps.tags.includes("ranch") || /Ranch/.test(ps.desc),
        `${row.sp}: skill-texten handlar inte om ranchen`,
      );
    }
  });

  it("ingen art med ranch-text saknas i tabellen", () => {
    const missing = base.species
      .filter((sp) => {
        const ps = skills[sp.code];
        return !!ps && /when assigned to Ranch/i.test(ps.desc) && !RANCH_SPECIES.has(sp.name);
      })
      .map((sp) => sp.name);
    assert.deepEqual(missing, [], `arter med ranch-text men utan rad: ${missing.join(", ")}`);
  });

  it("varje art med Farming-nivå har en vara", () => {
    const gaps = base.species
      .filter((sp) => (sp.ws.MonsterFarm ?? 0) > 0 && !RANCH_SPECIES.has(sp.name))
      .map((sp) => sp.name);
    assert.deepEqual(gaps, [], `MonsterFarm-arter utan vara: ${gaps.join(", ")}`);
  });

  it("Lamball finns, fast datasetet inte ger den någon Farming-nivå", () => {
    /* Regressionen som motiverar att listan INTE drivs av ws.MonsterFarm:
       No.001 lägger Wool enligt sin egen skill men har tom ws i datasetet. */
    const lamball = base.species.find((sp) => sp.name === "Lamball");
    assert.ok(lamball, "Lamball saknas i datasetet");
    assert.equal(lamball.ws.MonsterFarm ?? 0, 0, "datasetet har fått en Farming-nivå – läs om raden");
    assert.deepEqual(ranchItemsOf("Lamball").map((r) => r.item), ["Wool"]);
  });

  it("ranchItemsOf ger ALLA varor för en art som lägger flera", () => {
    // `new Map(RANCH_DROPS)` hade tappat den ena tyst – det är hela skälet
    // till att tabellen är rader och helpern finns.
    assert.deepEqual(ranchItemsOf("Shroomer").map((r) => r.item), ["Mushroom", "Cavern Mushroom"]);
    const gild = ranchItemsOf("Dumud Gild");
    assert.deepEqual(gild.map((r) => r.item), ["High Quality Pal Oil", "Gold Coin"]);
    assert.equal(gild[1]?.side, true, "Gold Coin är bivaran med liten chans");
  });

  it("ingen dubblerad art+vara", () => {
    const seen = new Set<string>();
    for (const row of RANCH_DROPS) {
      const key = `${row.sp}|${row.item}`;
      assert.ok(!seen.has(key), `dubblerad rad: ${key}`);
      seen.add(key);
    }
  });
});
