/* Etiketterna i save-väljaren.
 *
 * Bakgrunden: `world` och `account` är mappnamn, alltså GUID:er
 * ("0D0E75DA43…", "76561198005745786"). Har man flera konton eller flera
 * världar på samma dator går raderna inte att skilja åt, och då hjälper det
 * inte att man *får* välja. Namnen kommer ur världens `LevelMeta.sav`, som inte
 * alltid finns – en lös kopierad `Level.sav` har ingen. Reglerna här avgör vad
 * som visas när den saknas, och när namnet inte räcker som identitet.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasAmbiguousLabels, saveLabel, type SaveCandidate } from "../src/lib/saveImport";

const save = (over: Partial<SaveCandidate> = {}): SaveCandidate => ({
  path: "C:\\saves\\A\\Level.sav",
  world: "0D0E75DA434FD5E5C35941B02B23FAB2",
  account: "76561198005745786",
  size: 1_900_000,
  modified: 1_786_240_554,
  players: 1,
  ...over,
});

describe("saveLabel", () => {
  it("visar världens namn när det finns", () => {
    assert.equal(saveLabel(save({ worldName: "Phuket Island" })), "Phuket Island");
  });

  it("faller tillbaka på mappens GUID utan LevelMeta.sav", () => {
    assert.equal(saveLabel(save()), "0D0E75DA434FD5E5C35941B02B23FAB2");
  });

  it("ett tomt eller blankt namn räknas som inget namn", () => {
    // Spelet hindrar inte tomma namn, och en rad utan rubrik är oklickbar i praktiken.
    assert.equal(saveLabel(save({ worldName: "   " })), "0D0E75DA434FD5E5C35941B02B23FAB2");
    assert.equal(saveLabel(save({ worldName: "" })), "0D0E75DA434FD5E5C35941B02B23FAB2");
  });

  it("trimmar bort blanksteg runt namnet", () => {
    assert.equal(saveLabel(save({ worldName: "  Phuket Island  " })), "Phuket Island");
  });
});

describe("hasAmbiguousLabels", () => {
  it("två världar med olika namn går att skilja åt", () => {
    assert.equal(
      hasAmbiguousLabels([
        save({ worldName: "Phuket Island", host: "KenZI" }),
        save({ worldName: "Andra världen", host: "KenZI", path: "B" }),
      ]),
      false,
    );
  });

  it("samma världsnamn men olika värd räcker – det är ju två personer", () => {
    assert.equal(
      hasAmbiguousLabels([
        save({ worldName: "Phuket Island", host: "KenZI" }),
        save({ worldName: "Phuket Island", host: "Berra", path: "B" }),
      ]),
      false,
    );
  });

  it("samma namn OCH samma värd går inte att skilja åt", () => {
    // Precis vad en kopierad save ger: identisk LevelMeta, annan mapp.
    assert.equal(
      hasAmbiguousLabels([
        save({ worldName: "Phuket Island", host: "KenZI" }),
        save({ worldName: "Phuket Island", host: "KenZI", path: "B" }),
      ]),
      true,
    );
  });

  it("två världar helt utan LevelMeta har olika GUID och är därmed unika", () => {
    assert.equal(
      hasAmbiguousLabels([save({ world: "AAA" }), save({ world: "BBB", path: "B" })]),
      false,
    );
  });

  it("skiftläge gör inte två identiska namn olika", () => {
    assert.equal(
      hasAmbiguousLabels([
        save({ worldName: "Phuket Island", host: "KenZI" }),
        save({ worldName: "PHUKET ISLAND", host: "kenzi", path: "B" }),
      ]),
      true,
    );
  });

  it("en ensam värld är aldrig tvetydig", () => {
    assert.equal(hasAmbiguousLabels([save()]), false);
    assert.equal(hasAmbiguousLabels([]), false);
  });
});
