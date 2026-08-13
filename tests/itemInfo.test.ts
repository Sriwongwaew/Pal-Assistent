/* Hover-rutans varudata: att varje vara Hitta visar också går att förklara.
 *
 * Tabellen är genererad (`tools/build-item-info.mjs`) ur samma dump som
 * drops-tabellen, och den kopplas ihop med resten på NAMN. Ett namn som byts på
 * ett ställe men inte på det andra ger ingen krasch och inget tomt fält – bara
 * en hover som tyst slutar visa något, vilket är precis den sorts tapp som
 * ingen märker. Testet håller därför ihop de fyra listorna som pekar på varor:
 * drops, ranchen, malmen, IV-frukterna och schematics.
 *
 * Inget nät: både tabellen och listorna ligger i repot.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RANCH_DROPS } from "../src/lib/constants";
import { LEGENDARY_SCHEMATICS, MATERIAL_DROPS } from "../src/lib/findData";
import { ORE_ITEM } from "../src/lib/findIndex";
import { FRUIT_NAMES } from "../src/lib/ivFruits";
import { hasItemInfo, itemInfo } from "../src/lib/itemInfo";

describe("itemInfo", () => {
  it("varje schematic går att slå upp på sitt kapade vapennamn", () => {
    const missing = LEGENDARY_SCHEMATICS
      .map((s) => s.name)
      .filter((n) => !hasItemInfo(n));
    assert.deepEqual([...new Set(missing)], [], `schematics utan beskrivning: ${missing.join(", ")}`);
  });

  it("uppslaget kapar \" Schematic N\" – rutan ska visa VAPNET, inte pappret", () => {
    const rifle = itemInfo("Assault Rifle Schematic 4");
    assert.ok(rifle, "Assault Rifle Schematic 4 gav ingen träff");
    assert.equal(rifle.t, "Weapon");
    assert.equal(itemInfo("Assault Rifle")?.d, rifle.d, "samma rad som vapnet självt");
    // Namn utan suffix ska fungera likadant (schematics utan siffra finns: Terra Blade).
    assert.ok(hasItemInfo("Terra Blade Schematic"));
  });

  it("varje pal-släppt vara har en beskrivning", () => {
    const missing = MATERIAL_DROPS.map((d) => d.item).filter((n) => !hasItemInfo(n));
    assert.deepEqual(missing, [], `drops utan beskrivning: ${missing.join(", ")}`);
  });

  it("varje ranchvara utom våra egna samlingsord har en beskrivning", () => {
    /* `group: true` är VÅRT ord för en speltext som inte räknar upp varorna
       ("Seeds", "Buried items") – de finns per definition inte i item-datan. */
    const missing = RANCH_DROPS.filter((r) => !r.group && !hasItemInfo(r.item)).map((r) => r.item);
    assert.deepEqual(missing, [], `ranchvaror utan beskrivning: ${missing.join(", ")}`);
  });

  it("malmen och IV-frukterna har beskrivningar", () => {
    for (const item of Object.values(ORE_ITEM)) {
      assert.ok(hasItemInfo(item), `${item} saknar beskrivning`);
    }
    for (const item of FRUIT_NAMES) {
      assert.ok(hasItemInfo(item), `${item} saknar beskrivning`);
    }
  });

  it("siffrorna hör till sorten – ett svärd har inget magasin", () => {
    const blade = itemInfo("Terra Blade");
    assert.ok(blade?.atk, "svärdet ska ha attack");
    assert.equal(blade.mag, undefined, "melee ska inte ha magasin");
    const rifle = itemInfo("Assault Rifle");
    assert.ok(rifle?.mag, "geväret ska ha magasin");
    const armor = itemInfo("Metal Armor");
    assert.equal(armor?.atk, undefined, "rustning ska inte ha attack");
    assert.ok(armor?.def, "rustning ska ha försvar");
  });

  it("`base` sätts när det finns skalande siffror, och bara då", () => {
    /* Förbehållet i rutan hänger på flaggan: en vara utan skalande värden
       (ett material) ska inte få en varning om att siffrorna är basvariantens. */
    assert.equal(itemInfo("Assault Rifle")?.base, true);
    assert.equal(itemInfo("Metal Armor")?.base, true);
    assert.equal(itemInfo("Flame Organ")?.base, undefined, "material skalar inte");
  });

  it("Flamethrower faller tillbaka på ritningens text och SÄGER det", () => {
    /* Vapenraden finns inte i källan (den är en fiendevariant,
       FireCult_FlameThrower). Då är ritningstexten bättre än tomt – men den får
       inte se ut som en vapenbeskrivning. */
    const flame = itemInfo("Flamethrower Schematic 4");
    assert.ok(flame, "Flamethrower saknas helt");
    assert.equal(flame.blueprint, true);
    assert.equal(flame.atk, undefined, "vi har inga siffror att visa");
  });

  it("en okänd vara ger null, inte ett tomt kort", () => {
    assert.equal(itemInfo("Nyfikna Nöten"), null);
    assert.equal(hasItemInfo("Nyfikna Nöten"), false);
  });
});
