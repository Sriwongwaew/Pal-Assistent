/* Versionsjämförelsen som avgör om en uppdatering erbjuds.
 *
 * Två fel är dyra här och båda ser harmlösa ut i koden: strängjämförelse gör
 * 2.10.0 äldre än 2.9.0, och en otolkbar tagg som råkar se "större" ut skulle
 * be alla installationer ladda ner något som inte är en uppgradering. Facit
 * nedan är handräknat. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareVersions, isNewer } from "../src/lib/version";

describe("compareVersions", () => {
  it("jämför siffra för siffra, inte som text", () => {
    // Hela poängen: som strängar är "2.10.0" < "2.9.0".
    assert.equal(compareVersions("2.10.0", "2.9.0"), 1);
    assert.equal(compareVersions("2.9.0", "2.10.0"), -1);
    assert.equal(compareVersions("10.0.0", "9.99.99"), 1);
  });

  it("bryr sig inte om ledande v", () => {
    assert.equal(compareVersions("v2.1.0", "2.1.0"), 0);
    assert.equal(compareVersions("V2.2.0", "v2.1.9"), 1);
  });

  it("räknar saknad del som noll", () => {
    assert.equal(compareVersions("2.1", "2.1.0"), 0);
    assert.equal(compareVersions("2", "2.0.0"), 0);
    assert.equal(compareVersions("2.1.1", "2.1"), 1);
  });

  it("gör förhandsutgåvor äldre än den färdiga versionen", () => {
    assert.equal(compareVersions("2.1.0-beta.1", "2.1.0"), -1);
    assert.equal(compareVersions("2.1.0", "2.1.0-beta.1"), 1);
    assert.equal(compareVersions("2.1.0-beta.2", "2.1.0-beta.1"), 1);
    assert.equal(compareVersions("2.1.0-beta.1", "2.1.0-beta.1"), 0);
  });

  it("svarar 'vet inte' på skräp i stället för att gissa", () => {
    assert.equal(compareVersions("senaste", "2.0.0"), 0);
    assert.equal(compareVersions("", "2.0.0"), 0);
    assert.equal(compareVersions("2.x.0", "2.0.0"), 0);
    assert.equal(compareVersions("2.0.0", "inte-en-version"), 0);
  });
});

describe("isNewer", () => {
  it("erbjuder bara äkta uppgraderingar", () => {
    assert.equal(isNewer("2.1.0", "2.0.0"), true);
    assert.equal(isNewer("2.0.0", "2.0.0"), false);
    assert.equal(isNewer("1.9.9", "2.0.0"), false);
  });

  it("erbjuder ingenting när versionen inte går att tolka", () => {
    // En trasig tagg ska aldrig kunna trigga en nedladdning.
    assert.equal(isNewer("release-final", "2.0.0"), false);
    assert.equal(isNewer("", "2.0.0"), false);
  });
});
