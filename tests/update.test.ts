/* Uppdateringsnotisens läge.
 *
 * Två saker som går sönder tyst: en trasig tidsstämpel som stänger av kollen i
 * flera år, och ett "senare" som råkar gälla för evigt så att nästa version
 * aldrig annonseras. Båda ser ut som ingenting när de händer. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHECK_INTERVAL_MS, emptyUpdatePrefs, parseUpdatePrefs, serializeUpdatePrefs,
  shouldCheck, shouldShow, type UpdateCheck, type UpdatePrefs,
} from "../src/lib/update";

const check = (over: Partial<UpdateCheck> = {}): UpdateCheck => ({
  enabled: true, current: "2.0.0", latest: "2.1.0", newer: true, ...over,
});

describe("parseUpdatePrefs", () => {
  it("tar tillbaka en hel uppsättning oförändrad", () => {
    const p: UpdatePrefs = { lastCheck: Date.now() - 1000, skipped: "2.1.0" };
    assert.deepEqual(parseUpdatePrefs(serializeUpdatePrefs(p)), p);
  });

  it("ger tomma val för saknad och trasig lagring", () => {
    const empty = emptyUpdatePrefs();
    assert.deepEqual(parseUpdatePrefs(null), empty);
    assert.deepEqual(parseUpdatePrefs("{inte json"), empty);
    assert.deepEqual(parseUpdatePrefs('"en strang"'), empty);
    assert.deepEqual(parseUpdatePrefs("[1,2]"), empty);
  });

  it("kastar en tidsstämpel i framtiden", () => {
    // Annars stängs kollen av tills klockan hunnit ikapp – kan bli år.
    const future = Date.now() + 10 * CHECK_INTERVAL_MS;
    assert.equal(parseUpdatePrefs(JSON.stringify({ lastCheck: future })).lastCheck, 0);
    assert.equal(parseUpdatePrefs(JSON.stringify({ lastCheck: -5 })).lastCheck, 0);
    assert.equal(parseUpdatePrefs(JSON.stringify({ lastCheck: "igar" })).lastCheck, 0);
  });
});

describe("shouldCheck", () => {
  it("frågar en gång per dygn, inte varje start", () => {
    const now = 1_000_000_000_000;
    assert.equal(shouldCheck({ lastCheck: 0, skipped: "" }, now), true);
    assert.equal(shouldCheck({ lastCheck: now - CHECK_INTERVAL_MS, skipped: "" }, now), true);
    assert.equal(shouldCheck({ lastCheck: now - CHECK_INTERVAL_MS + 1, skipped: "" }, now), false);
    assert.equal(shouldCheck({ lastCheck: now - 60_000, skipped: "" }, now), false);
  });
});

describe("shouldShow", () => {
  const fresh = emptyUpdatePrefs();

  it("visar bara när det finns en nyare version", () => {
    assert.equal(shouldShow(check(), fresh), true);
    assert.equal(shouldShow(check({ newer: false }), fresh), false);
    assert.equal(shouldShow(null, fresh), false);
  });

  it("tiger i bygget från källkoden", () => {
    assert.equal(shouldShow(check({ enabled: false }), fresh), false);
  });

  it("tiger om GitHub inte gick att nå", () => {
    assert.equal(shouldShow(check({ newer: false, error: "Kunde inte nå GitHub." }), fresh), false);
  });

  it("respekterar 'senare' – men bara för den versionen", () => {
    const skipped: UpdatePrefs = { lastCheck: 0, skipped: "2.1.0" };
    assert.equal(shouldShow(check({ latest: "2.1.0" }), skipped), false);
    assert.equal(shouldShow(check({ latest: "2.2.0" }), skipped), true);
  });
});
