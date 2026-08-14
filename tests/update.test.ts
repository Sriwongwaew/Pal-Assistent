/* Uppdateringsnotisens läge.
 *
 * Två saker som går sönder tyst: en trasig tidsstämpel som stänger av kollen i
 * flera år, och ett "senare" som råkar gälla för evigt så att nästa version
 * aldrig annonseras. Båda ser ut som ingenting när de händer. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHECK_INTERVAL_MS, checkOutcome, emptyUpdatePrefs, isTrustedAssetUrl, notesToBlocks,
  parseUpdatePrefs, serializeUpdatePrefs, shouldCheck, shouldShow, trustedRepos,
  updateScript, UPDATE_INSTALLER_NAME,
  type UpdateCheck, type UpdatePrefs,
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

describe("checkOutcome", () => {
  it("skiljer 'du kör den senaste' från 'kunde inte fråga'", () => {
    // Hela poängen med knappen: ett misslyckat anrop får aldrig se ut som ett
    // friskintyg. Båda har newer: false, och bara den ena vet något.
    assert.equal(checkOutcome(check({ newer: false })), "latest");
    assert.equal(
      checkOutcome(check({ newer: false, error: "Kunde inte nå GitHub." })),
      "failed",
    );
  });

  it("svarar 'newer' bara när det finns något att hämta", () => {
    assert.equal(checkOutcome(check()), "newer");
  });

  it("ett svar utan version är inget svar", () => {
    // Rutten utelämnar `latest` när uppslaget kastade. Att kalla det "latest"
    // vore att påstå något om en version vi aldrig fick veta.
    assert.equal(checkOutcome(check({ latest: undefined, newer: false })), "failed");
  });

  it("är avstängd i bygget från källkoden och utan svar alls", () => {
    assert.equal(checkOutcome(check({ enabled: false })), "off");
    assert.equal(checkOutcome(null), "off");
  });
});

describe("notesToBlocks", () => {
  it("delar upp rubriker, punkter och stycken", () => {
    const blocks = notesToBlocks(
      "## Nytt\n\n- Avelsplanen räknar delade kullar\n- Snabbare boxvy\n\nTack för rapporterna!",
    );
    assert.deepEqual(blocks, [
      { kind: "rubrik", text: "Nytt" },
      { kind: "punkt", text: "Avelsplanen räknar delade kullar" },
      { kind: "punkt", text: "Snabbare boxvy" },
      { kind: "text", text: "Tack för rapporterna!" },
    ]);
  });

  it("skalar bort markdown-markörer i stället för att visa dem", () => {
    // "**Boxen** – snabbare" ska bli "Boxen – snabbare", inte behålla stjärnorna.
    const blocks = notesToBlocks("- **Boxen** – nu med `filter` och _sortering_");
    assert.deepEqual(blocks, [
      { kind: "punkt", text: "Boxen – nu med filter och sortering" },
    ]);
  });

  it("behåller länktexten men släpper adressen", () => {
    const blocks = notesToBlocks("- Se [guiden](https://example.com/lang/url) för mer");
    assert.deepEqual(blocks, [{ kind: "punkt", text: "Se guiden för mer" }]);
  });

  it("tål tomt och bara blanksteg", () => {
    assert.deepEqual(notesToBlocks(""), []);
    assert.deepEqual(notesToBlocks("\n\n   \n"), []);
    // En rad som bara är markörer får inte bli en tom punkt.
    assert.deepEqual(notesToBlocks("- **`_`**"), []);
  });

  it("gör okänd markdown till vanlig text i stället för att tappa den", () => {
    const blocks = notesToBlocks("| kolumn | värde |\n> citat");
    assert.deepEqual(blocks, [
      { kind: "text", text: "| kolumn | värde |" },
      { kind: "text", text: "> citat" },
    ]);
  });
});

/* Spärren som avgör vad som får laddas ner och köras. Facit är skrivet som de
 * adresser en angripare skulle försöka med: alla utom den första pekar bort
 * från våra egna utgåvor, och en av dem passerade den gamla strängjämförelsen. */
describe("isTrustedAssetUrl", () => {
  const REPO = "Sriwongwaew/PalCompanion";
  const asset = `https://github.com/${REPO}/releases/download/v2.2.1/PalCompanion-Setup.exe`;

  it("godtar en riktig utgåvefil ur vårt repo", () => {
    assert.equal(isTrustedAssetUrl(asset, REPO), true);
  });

  it("är avstängd utan repo – ett bygge från källkoden ska aldrig installera", () => {
    assert.equal(isTrustedAssetUrl(asset, ""), false);
  });

  it("normaliserar bort .. innan den jämför", () => {
    // Den här börjar med rätt prefix och släpptes därför igenom av en
    // startsWith – medan fetch normaliserar den till github.com/nagon-annan.
    const traversal =
      `https://github.com/${REPO}/releases/download/../../../nagon-annan/setup.exe`;
    assert.equal(traversal.startsWith(`https://github.com/${REPO}/releases/download/`), true);
    assert.equal(isTrustedAssetUrl(traversal, REPO), false);
  });

  it("låter sig inte luras av användarnamn i adressen", () => {
    // Värden här är ond.se, inte github.com.
    assert.equal(
      isTrustedAssetUrl(`https://github.com@ond.se/${REPO}/releases/download/v1/x.exe`, REPO),
      false,
    );
  });

  it("kräver https och rätt värd", () => {
    assert.equal(isTrustedAssetUrl(asset.replace("https:", "http:"), REPO), false);
    assert.equal(isTrustedAssetUrl(asset.replace("github.com", "githubb.com"), REPO), false);
  });

  it("avvisar ett annat repo med vårt namn som prefix", () => {
    assert.equal(
      isTrustedAssetUrl(`https://github.com/${REPO}-ond/releases/download/v1/x.exe`, REPO),
      false,
    );
  });

  /* Namnbytet är gjort (3.0.0). Övergångsraden som lät en app byggd under det
   * gamla namnet hämta ur det omdöpta repot hörde till DE byggena – de har den
   * redan, och den här bygger med det nya repot i PA_REPO. Kvar ska bara vara
   * "det inbakade repot, och inget annat". */
  it("godtar bara det inbakade repot", () => {
    assert.deepEqual(trustedRepos(REPO), [REPO]);
    assert.equal(isTrustedAssetUrl(asset, REPO), true);
    // Det gamla repot är inte längre en betrodd källa för ett nytt bygge.
    const legacy = "https://github.com/Sriwongwaew/Pal-Assistent"
      + "/releases/download/v2.6.0/PalAssistent-Setup.exe";
    assert.equal(isTrustedAssetUrl(legacy, REPO), false);
  });

  it("låter inte en fork börja hämta binärer från oss", () => {
    // En fork bygger med sitt eget PA_REPO och får sin egen källkodslänk. Att
    // den skulle installera VÅRA utgåvor över sig själv vore precis fel.
    const fork = "NagonAnnan/PalCompanion";
    assert.deepEqual(trustedRepos(fork), [fork]);
    assert.equal(
      isTrustedAssetUrl(
        `https://github.com/${REPO}/releases/download/v3.0.0/PalCompanion-Setup.exe`,
        fork,
      ),
      false,
    );
  });

  it("avvisar det som inte är en URL alls", () => {
    assert.equal(isTrustedAssetUrl("", REPO), false);
    assert.equal(isTrustedAssetUrl("javascript:alert(1)", REPO), false);
  });
});

/* Bytesskriptet.
 *
 * Det körs en gång per uppdatering, på någon annans dator, utan att någon ser
 * det. Går det sönder ser symptomet inte ut som ett fel: appen stängs, ingenting
 * installeras, och nästa start är samma version. Testerna nedan är alltså de
 * enda som säger ifrån innan en utgåva är släppt. */
describe("updateScript", () => {
  const script = updateScript();

  it("använder inte timeout – den avslutar direkt när stdin är omdirigerad", () => {
    // Fällan som gjorde att installern startade medan appen ännu höll filerna:
    // "timeout" kräver en konsol och svarar "Input redirection is not supported".
    assert.equal(/^\s*timeout\b/m.test(script), false);
  });

  it("väntar på att programmet verkligen är borta innan installern körs", () => {
    const wait = script.indexOf("tasklist");
    const install = script.indexOf(UPDATE_INSTALLER_NAME);
    assert.ok(wait > 0, "ingen väntan på processen");
    assert.ok(wait < install, "installern körs före väntan");
    assert.match(script, /if %PA_TRIES% GEQ 60 goto install/);
  });

  it("startar programmet igen efter installationen", () => {
    // Just start-raden, inte första bästa %PA_APP_EXE%: variabeln läses även
    // före installationen, för att få fram namnet att vänta på.
    assert.ok(script.indexOf(UPDATE_INSTALLER_NAME) < script.indexOf('start "" "%PA_APP_EXE%"'));
    assert.match(script, /start "" "%PA_APP_EXE%"/);
  });

  /* Namnbytet: skriptet skrivs av den GAMLA versionen men kör den nya
   * installern, så ingenstans i det får programmets namn stå som en konstant. */
  it("väntar på launcherns eget namn, inte på ett inskrivet", () => {
    assert.match(script, /for %%I in \("%PA_APP_EXE%"\) do set "PA_APP_NAME=%%~nxI"/);
    assert.match(script, /imagename eq %PA_APP_NAME%/);
    // Väntan får inte peka ut ett hårdkodat programnamn alls – det läses ur
    // sökvägen, så skriptet överlever nästa namnbyte också.
    assert.equal(/imagename eq PalAssistent\.exe/.test(script), false);
    assert.equal(/imagename eq PalCompanion\.exe/.test(script), false);
  });

  it("startar programmet igen ur den sökväg launchern gav", () => {
    /* Rename-reserven ("finns inte PA_APP_EXE efteråt, prova PalCompanion")
       hörde till övergångsutgåvan: efter bytet installerar 3.0.x under samma
       namn som den kom ifrån, så sökvägen finns kvar. Kvar ska vara EN start,
       ur variabeln, efter installationen. */
    const install = script.indexOf(UPDATE_INSTALLER_NAME);
    const start = script.indexOf('start "" "%PA_APP_EXE%"');
    assert.ok(start > install, "starten står efter installationen");
    assert.equal(script.split('start "" "%PA_APP_EXE%"').length - 1, 1, "exakt en start");
  });

  it("är helt fritt från sökvägar och från å, ä, ö", () => {
    // En .cmd läses i datorns OEM-teckentabell, inte i UTF-8: ett användarnamn
    // med å i skulle bli en annan sökväg. Allt kommer därför från %~dp0 och en
    // miljövariabel, och texten i sig håller sig inom ASCII.
    assert.equal(/[^\x20-\x7e\r\n]/.test(script), false);
    assert.equal(/[A-Za-z]:\\/.test(script), false);
    assert.match(script, /set "PA_WORK=%~dp0"/);
  });

  it("städar bort sin egen mapp till sist", () => {
    assert.match(script, /\(goto\) 2>nul & rd \/s \/q "%PA_WORK%"/);
  });

  it("kör installern tyst och skriver en logg att felsöka ur", () => {
    assert.match(script, /\/SILENT \/SUPPRESSMSGBOXES \/NORESTART/);
    assert.match(script, /\/LOG="%PA_WORK%\\\.\.\\update\.log"/);
  });
});
