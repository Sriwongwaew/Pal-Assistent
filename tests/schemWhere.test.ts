/* Schematics-källor som PLATSER, inte prosa.
 *
 * "Snow enemy camp" stod i gränssnittet utan koordinat, nivå eller karta – en
 * text man inte kunde göra något med (Kens fynd aug 2026). `spot` på varje rad
 * är handkurerad, och just därför måste den bevakas: en token som inte finns i
 * kartdatat ger TYST noll platser, alltså samma tomma svar som förut men med
 * mer kod bakom. Och en `spot` som pekar på fel område är värre än ingen alls.
 *
 * Testet kontrollerar tre saker:
 *   1. Varje `spot` löser ut minst en riktig plats.
 *   2. Regionstokens finns faktiskt bland lägren.
 *   3. Lägren ligger där källan säger – snölägren i snöregionen, ökenlägren i
 *      öknen – kontrollerat mot paldb:s egna regionnamn.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEGENDARY_SCHEMATICS } from "../src/lib/findData";
import { schemWhere } from "../src/lib/findIndex";
import { WORLD_MAP } from "../src/lib/worldmap";

const withSpot = LEGENDARY_SCHEMATICS.filter((s) => s.spot !== undefined);

describe("schemWhere", () => {
  it("det finns rader med spot – annars gör hela mekaniken ingenting", () => {
    assert.ok(withSpot.length >= 30, `bara ${withSpot.length} rader har spot`);
  });

  it("varje spot löser ut minst en riktig plats", () => {
    for (const s of withSpot) {
      const where = schemWhere(s.spot);
      assert.ok(where, `${s.name}: schemWhere gav null`);
      assert.ok(where.spots.length > 0, `${s.name} (${s.source}): noll platser`);
      assert.ok(where.total >= where.spots.length, `${s.name}: totalen är mindre än listan`);
    }
  });

  it("utan spot blir det null – och då säger gränssnittet det i stället", () => {
    assert.equal(schemWhere(undefined), null);
    /* Den vandrande handlaren ska medvetet INTE ha någon plats – arenan hade
       först ingen heller, men den är en byggnad med en adress och fick en
       (`REGION_Arena`) när täckningen gicks igenom. */
    const medal = LEGENDARY_SCHEMATICS.find((s) => s.source === "Medal Merchant");
    assert.ok(medal, "Medal Merchant-raden saknas");
    assert.equal(medal.spot, undefined, "en vandrande handlare har ingen adress");
  });

  it("varje regionstoken finns bland lägren", () => {
    const known = new Set(WORLD_MAP.camps.map((c) => c.region));
    for (const s of withSpot) {
      if (s.spot?.at !== "camp") continue;
      for (const token of s.spot.regions) {
        assert.ok(known.has(token), `${s.name}: okänd regionstoken "${token}"`);
      }
    }
  });

  it("snölägren ligger i snöregionen, ökenlägren i öknen", () => {
    /* Kopplingen token → område är det enda i kedjan som är ett mänskligt val,
       så den kontrolleras mot paldb:s egna regionnamn. Astral Mountains ÄR
       snöområdet, Desiccated Dunes/Duneshelter öknen. */
    const nearestName = (x: number, y: number) => WORLD_MAP.regions
      .map((r) => ({ name: r.name, d: Math.hypot(r.x - x, r.y - y) }))
      .sort((a, b) => a.d - b.d)[0]?.name ?? "";

    const snow = WORLD_MAP.camps.filter((c) => c.region === "Snow1");
    assert.ok(snow.length > 0, "inga Snow1-läger");
    for (const c of snow) {
      const name = nearestName(c.x, c.y);
      assert.match(name, /Astral|Frost|Ruins|Sanctuary|Rock Field/,
        `Snow1-läger på (${c.x}, ${c.y}) ligger närmast "${name}" – kontrollera kopplingen`);
    }

    const desert = WORLD_MAP.camps.filter((c) => c.region === "Desert1");
    assert.ok(desert.length > 0, "inga Desert1-läger");
    for (const c of desert) {
      const name = nearestName(c.x, c.y);
      assert.match(name, /Dune|Desiccated|Arena|Scars of War/,
        `Desert1-läger på (${c.x}, ${c.y}) ligger närmast "${name}" – kontrollera kopplingen`);
    }
  });

  it("oljeriggarna hittas på nivån i regionnamnet", () => {
    const rig60 = schemWhere({ at: "oilrig", lv: 60 });
    assert.ok(rig60, "Lv60-riggen gav null");
    assert.ok(rig60.regions.some((r) => /Oil Rig/i.test(r.name) && r.lo === 60),
      `Lv60 gav regionerna ${JSON.stringify(rig60.regions)}`);
    const rig30 = schemWhere({ at: "oilrig", lv: 30 });
    assert.ok(rig30?.regions.some((r) => r.lo === 30), "Lv30-riggen saknas");
    // Riggarna är inte samma plats.
    assert.notDeepEqual(rig60.spots[0], rig30?.spots[0]);
  });

  it("skattkartorna delar platser mellan rariteter – de bär ingen egen", () => {
    /* Rariteten sitter på kartan man hittar, inte på hålet man gräver i, så
       alla Treasure Map-rader ska ge exakt samma platser. */
    const legendary = LEGENDARY_SCHEMATICS.find((s) => s.source === "Treasure Map (Legendary)");
    const common = LEGENDARY_SCHEMATICS.find((s) => s.source === "Treasure Map (Common)");
    assert.ok(legendary && common, "skattkarteraderna saknas");
    assert.deepEqual(schemWhere(legendary.spot)?.spots, schemWhere(common.spot)?.spots);
    assert.equal(schemWhere(common.spot)?.total, WORLD_MAP.treasures.length);
  });

  it("dungeon-spoten matchar ett riktigt dungeon-namn och bär dess nivå", () => {
    const where = schemWhere({ at: "dungeon", name: "Cherry Blossom Cave" });
    assert.ok(where && where.spots.length > 0, "Cherry Blossom Cave gav inga platser");
    assert.equal(where.regions[0]?.name, "Cherry Blossom Cave");
    assert.ok((where.regions[0]?.lo ?? 0) > 0, "nivån saknas");
  });

  it("hard mode-tornen har koordinat och namn – ingen omväg via Uppdrag", () => {
    const towers = LEGENDARY_SCHEMATICS.filter((s) => s.kind === "tower");
    assert.equal(towers.length, 9, "tornraderna har ändrats");
    for (const s of towers) {
      const where = schemWhere(s.spot);
      assert.ok(where, `${s.source}: ingen plats`);
      assert.equal(where.spots.length, 1, `${s.source}: ett torn, en koordinat`);
      assert.ok(where.regions[0]?.name, `${s.source}: tornet saknar namn`);
      assert.ok(s.lv !== undefined, `${s.source}: hard mode-nivån saknas`);
    }
  });

  it("arenan är en adress, handlarna är det inte", () => {
    const arena = LEGENDARY_SCHEMATICS.filter((s) => s.source.startsWith("Arena"));
    assert.ok(arena.length >= 3, "arenaraderna saknas");
    for (const s of arena) {
      assert.equal(schemWhere(s.spot)?.regions[0]?.name, "Arena");
    }
    /* Medal Merchant vandrar – den SKA sakna plats. Att ge den en vore att
       påstå att man vet var den står. */
    const medal = LEGENDARY_SCHEMATICS.filter((s) => s.source === "Medal Merchant");
    assert.ok(medal.length > 0, "Medal Merchant-raderna saknas");
    for (const s of medal) assert.equal(s.spot, undefined);
  });

  it("nästan varje rad har en plats – och de som saknar den har ett skäl", () => {
    /* Talet är en spärr, inte ett mål: sjunker det har någon tagit bort en
       spot, och då blir källan prosa igen (Kens ursprungliga klagomål). */
    const placed = LEGENDARY_SCHEMATICS.filter((s) =>
      s.coord !== undefined || (schemWhere(s.spot)?.spots.length ?? 0) > 0);
    assert.ok(
      placed.length >= 82,
      `bara ${placed.length} av ${LEGENDARY_SCHEMATICS.length} rader har en plats`,
    );
    /* De som återstår ska vara EXAKT de tre källor som inte har en fast plats:
       en raidboss man kallar vid sitt eget altare, en vandrande handlare, och
       en art utan alfaspawn i kartdatat. Dyker en fjärde upp ska testet falla. */
    const rest = [...new Set(LEGENDARY_SCHEMATICS
      .filter((s) => !placed.includes(s))
      .map((s) => s.source))].sort();
    assert.deepEqual(rest, ["Medal Merchant", "Warsect", "[Master] Moon Lord raid"]);
  });

  it("listan kapas men totalen ljuger aldrig", () => {
    const maps = schemWhere({ at: "map" });
    assert.ok(maps);
    assert.ok(maps.spots.length <= 8, "fler än taket ritas");
    assert.equal(maps.total, WORLD_MAP.treasures.length);
    assert.ok(maps.total > maps.spots.length, "42 platser ska trunkeras");
  });
});
