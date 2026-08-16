/* Avelstabellen mot spelets faktiska regel.
 *
 * Regeln appen påstod var fel, och felet satt i datan: uppströms
 * `child_to_parents_formula` räknar aldrig upp en art med `ignore_combi` som
 * FÖRÄLDER, så 12 326 par saknade barn och gränssnittet förklarade det med
 * "legendarer avlar bara med sin egen art". Det stämmer inte. Rätt regel är
 * den omvända, och det är den här filen håller fast vid:
 *
 *   en legendar kan paras med VAD SOM HELST – man kan bara inte FÅ en
 *   legendar ur ägget om inte båda föräldrarna är den arten.
 *
 * Facit under är räknat med `tools/build-pair-table.mjs` och stickprovat mot
 * en oberoende källa: med rangformeln ger Frostallion som förälder 72 olika
 * arter, vilket är exakt vad palbreeder.com:s 1.0-kalkylator uppger.
 *
 * Ingen nätåtkomst – tabellen ligger i repot.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { childrenOf, pairIndex } from "../src/lib/breeding";
import type { AppData } from "../src/lib/types";

/* Ur repo-roten, inte __dirname: testerna kompileras till tests-dist/ men
   `npm test` står alltid i roten (samma sak som ranchDrops.test.ts). */
const data = JSON.parse(
  readFileSync(path.join(process.cwd(), "data/pal-data.base.json"), "utf8"),
) as AppData;

const n = data.species.length;
const idx = (name: string) => {
  const i = data.species.findIndex((s) => s.name === name);
  assert.ok(i >= 0, `arten ${name} finns inte i datasetet`);
  return i;
};
const kid = (a: string, b: string) => {
  const c = data.pair[pairIndex(n, idx(a), idx(b))] ?? -1;
  return c >= 0 ? data.species[c]!.name : null;
};

/** Arter som bara går att få av två av sin egen art. */
const OWN_SPECIES_ONLY = [
  "Frostallion", "Jetragon", "Paladius", "Necromus", "Shadowbeak",
  "Grizzbolt", "Orserk", "Lyleen", "Faleris", "Astralym", "Panthalus",
];

/** De fem arter vars `combi_rank` är 9999 – ett saknat värde, inte en rang. */
const NO_RANK = ["Dragostrophe", "Boltmane"];

describe("avelstabellen: legendarer som föräldrar", () => {
  it("en legendar kan paras med en helt vanlig art", () => {
    assert.equal(kid("Frostallion", "Lamball"), "Felbat");
    assert.equal(kid("Jetragon", "Lamball"), "Bushi");
    assert.equal(kid("Necromus", "Anubis"), "Eidrolon");
    assert.equal(kid("Frostallion", "Warsect"), "Whalaska");
  });

  it("Frostallion har barn med i stort sett hela dataset:et", () => {
    const partners = data.species.filter((_, j) => (data.pair[pairIndex(n, idx("Frostallion"), j)] ?? -1) >= 0);
    /* 304 arter minus de fem utan rang = 299. */
    assert.equal(partners.length, 299);
  });

  /* 73 = 71 ur rangformeln + Frostallion själv (självparningen) + Frostallion
     Noct (unik kombo med Helzephyr). Rangformeln ensam ger 72 räknat över alla
     304 arter som partner – talet palbreeder.com uppger – men fem av dem saknar
     rang och står inte i tabellen, så härifrån är formeldelen 71. */
  it("ger 73 olika arter som förälder", () => {
    const f = idx("Frostallion");
    const kids = new Set<number>();
    for (let j = 0; j < n; j++) {
      const c = data.pair[pairIndex(n, f, j)] ?? -1;
      if (c >= 0) kids.add(c);
    }
    assert.equal(kids.size, 73);
  });
});

describe("avelstabellen: vad man inte kan FÅ", () => {
  it("ingen legendar kommer ur ett par som inte är två av dess egen art", () => {
    const locked = new Set(OWN_SPECIES_ONLY.map(idx));
    const leaks: string[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const c = data.pair[pairIndex(n, i, j)] ?? -1;
        if (c < 0 || !locked.has(c)) continue;
        if (i === j && i === c) continue; // egen art × egen art, hela regeln
        leaks.push(`${data.species[i]!.name} × ${data.species[j]!.name} → ${data.species[c]!.name}`);
      }
    }
    assert.deepEqual(leaks, []);
  });

  it("två av samma legendar ger fortfarande arten", () => {
    for (const name of OWN_SPECIES_ONLY) assert.equal(kid(name, name), name);
  });

  it("arter utan rang i källan får inget påhittat barn", () => {
    for (const name of NO_RANK) {
      assert.equal(kid(name, "Lamball"), null, `${name} ska inte ha ett uträknat barn`);
      assert.equal(kid(name, "Anubis"), null, `${name} ska inte ha ett uträknat barn`);
    }
  });
});

describe("avelstabellen: unika kombos vinner över formeln", () => {
  it("Frostallion + Helzephyr ger Frostallion Noct, inte formelns barn", () => {
    assert.equal(kid("Frostallion", "Helzephyr"), "Frostallion Noct");
  });

  it("childrenOf läser samma tabell", () => {
    const kids = childrenOf(data, idx("Frostallion"), idx("Lamball"));
    assert.equal(kids.length, 1);
    assert.equal(data.species[kids[0]!.c]!.name, "Felbat");
  });
});
