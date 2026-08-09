/* Sparade val för var saven ligger och om den ska läsas live.
 *
 * Precis som avelsplanerarens val är det här gammal data per definition: mappen
 * kan ha försvunnit, och innehållet skickas vidare till servern som en sökväg
 * att läsa. Allt trasigt ska bli tomma val, aldrig ett fel – och en tom sökväg
 * betyder alltid "spelets egen mapp", inte "roten". */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptySavePrefs, parseSavePrefs, serializeSavePrefs, type SavePrefs,
} from "../src/lib/savePrefs";

const roundTrip = (p: SavePrefs) => parseSavePrefs(serializeSavePrefs(p));

describe("parseSavePrefs", () => {
  it("tar tillbaka en hel uppsättning oförändrad", () => {
    const p: SavePrefs = {
      root: "D:\\PalServer\\Pal\\Saved\\SaveGames",
      path: "D:\\PalServer\\Pal\\Saved\\SaveGames\\0\\ABC\\Level.sav",
      live: true,
      every: 10,
    };
    assert.deepEqual(roundTrip(p), p);
  });

  it("ger tomma val för saknad, trasig och felformad lagring", () => {
    const empty = emptySavePrefs();
    assert.deepEqual(parseSavePrefs(null), empty);
    assert.deepEqual(parseSavePrefs(""), empty);
    assert.deepEqual(parseSavePrefs("{inte json"), empty);
    assert.deepEqual(parseSavePrefs('"en sträng"'), empty);
    assert.deepEqual(parseSavePrefs("[1,2,3]"), empty);
  });

  it("skalar bort citattecken från Kopiera som sökväg", () => {
    // Explorer lägger själv dit dem, och Python skulle leta efter en mapp som
    // heter "..." med citattecken i namnet.
    const p = parseSavePrefs(JSON.stringify({ root: '  "D:\\Saves"  ' }));
    assert.equal(p.root, "D:\\Saves");
  });

  it("nollar sökvägar som inte är användbara strängar", () => {
    const p = parseSavePrefs(JSON.stringify({ root: 42, path: "   ", live: true }));
    assert.equal(p.root, "");
    assert.equal(p.path, "");
    // Live utan vald fil är giltigt: då gäller senast sparade världen i mappen.
    assert.equal(p.live, true);
  });

  it("kräver exakt true för live och ett känt intervall", () => {
    assert.equal(parseSavePrefs(JSON.stringify({ live: "ja" })).live, false);
    assert.equal(parseSavePrefs(JSON.stringify({ live: 1 })).live, false);
    assert.equal(parseSavePrefs(JSON.stringify({ every: 3 })).every, 30);
    assert.equal(parseSavePrefs(JSON.stringify({ every: "10" })).every, 30);
    assert.equal(parseSavePrefs(JSON.stringify({ every: 60 })).every, 60);
  });

  it("delar inte objekt mellan två tomma uppsättningar", () => {
    const a = emptySavePrefs();
    a.root = "X";
    assert.equal(emptySavePrefs().root, "");
  });
});
