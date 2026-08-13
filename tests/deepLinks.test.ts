/* Djuplänkarna mellan sidorna, mot de ankare som faktiskt finns.
 *
 * Rollerna väljer flik på URL-hashen (`#rh-box … #rh-player`), och en hash som
 * inte står i `TAB_BY_HASH` faller tyst tillbaka på första fliken. Det ser inte
 * trasigt ut – man landar bara på Boxen när man bad om Strid – och det hände på
 * riktigt: elementheron fick `#rh-combat` skrivet ur minnet, medan fliken heter
 * `#rh-fight` (aug 2026).
 *
 * Testet läser hasharna ur komponentkällan i stället för att lista dem här: en
 * lista som skrivs för hand är precis det som glider isär från koden. Samma
 * skäl som `partnerMeta.test.ts` läser artkoderna ur den skeppade datan.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const read = (...p: string[]) => readFileSync(path.join(process.cwd(), ...p), "utf8");

/** Ankarna Rollerna faktiskt känner igen, ur `TAB_BY_HASH`. */
function knownHashes(): Set<string> {
  const src = read("src", "components", "containers", "RecoView.tsx");
  const block = /TAB_BY_HASH:\s*Record<[^>]*>\s*=\s*\{([\s\S]*?)\};/.exec(src);
  assert.ok(block, "TAB_BY_HASH hittades inte – har RecoView bytt form?");
  const hashes = [...block[1]!.matchAll(/"([\w-]+)":/g)].map((m) => m[1]!);
  assert.ok(hashes.length >= 5, `bara ${hashes.length} flikankare hittades`);
  return new Set(hashes);
}

/** Alla `/recommendations#…`-länkar i en komponentfil. */
function linksIn(...file: string[]): string[] {
  const src = read(...file);
  return [...src.matchAll(/\/recommendations#([\w-]+)/g)].map((m) => m[1]!);
}

const FILES = [
  ["src", "components", "containers", "FindView.tsx"],
  ["src", "components", "ui", "FindBits.tsx"],
  ["src", "components", "containers", "OverviewView.tsx"],
];

describe("djuplänkar till Rollerna", () => {
  it("varje hash som länkas finns som flik", () => {
    const known = knownHashes();
    let checked = 0;
    for (const file of FILES) {
      for (const hash of linksIn(...file)) {
        checked++;
        assert.ok(
          known.has(hash),
          `${file.at(-1)}: #${hash} är ingen flik. Finns: ${[...known].join(", ")}`,
        );
      }
    }
    assert.ok(checked > 0, "inga djuplänkar hittades – har de tagits bort?");
  });

  it("stridsfliken heter rh-fight, inte rh-combat", () => {
    /* Regressionen som motiverar testet. `combat` är ordet i gränssnittet men
       `fight` är nyckeln i koden, och de går inte att gissa fram ur varandra. */
    const known = knownHashes();
    assert.ok(known.has("rh-fight"));
    assert.ok(!known.has("rh-combat"));
  });
});
