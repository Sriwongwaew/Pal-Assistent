/** Vem får prata med den lokala servern?
 *
 * Att servern binder `127.0.0.1` stoppar *nätverket*, inte *webbläsaren*. Varje
 * sida användaren har öppen kan skicka förfrågningar till loopback, och två
 * angrepp följer av det:
 *
 * 1. **CSRF.** `POST /api/update/install` tar varken body eller egna huvuden och
 *    är därmed en "simple request" – ingen preflight, alltså inget som stoppar
 *    den. En godtycklig sida kunde be appen ladda ner installern, döda sig själv
 *    och installera. Samma sak för `/api/save/import`, vars body läses som text
 *    och JSON-tolkas i efterhand: `Content-Type: text/plain` slipper preflighten.
 * 2. **DNS-rebinding.** En domän som byter till 127.0.0.1 efter första
 *    laddningen räknas som *samma ursprung* av webbläsaren, och då går svaren
 *    att läsa. `/api/save/scan?root=C:\Users` blir en filbläddrare och
 *    `/data/pal-data.json` är hela boxen plus spelarnamnet.
 *
 * Två huvuden räcker mot båda, och det är hela poängen med dem: **de sätts av
 * webbläsaren och kan inte förfalskas från JavaScript.**
 *
 * - `Host` måste vara loopback. Vid rebinding skickar webbläsaren fortfarande
 *   angriparens domännamn, så kontrollen biter även när IP:t pekar hit.
 * - `Origin` måste, när det finns, vara vårt eget. Webbläsaren sätter det på all
 *   cross-origin POST – även `mode: "no-cors"`, där svaret annars är osynligt
 *   men *effekten* inträffar.
 *
 * Funktionen är ren och tar emot huvudena som strängar; `src/middleware.ts` är
 * bara omslaget som plockar ut dem ur förfrågan.
 */

/** Värdnamn en lokal server får svara på. IPv6 står med hakparenteser. */
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** Huvudena beslutet vilar på, precis som de står i förfrågan. */
export interface RequestOrigin {
  /** `Host`, t.ex. `127.0.0.1:3123`. */
  host: string | null;
  /** `Origin`, t.ex. `http://127.0.0.1:3123`. Saknas vid vanlig navigering. */
  origin: string | null;
  /** `Sec-Fetch-Site`, t.ex. `same-origin`, `cross-site`, `none`. */
  site: string | null;
}

/**
 * Utfallet. Något annat än `ok` ska besvaras med 403.
 *
 * Skälet är med i svaret därför att de tre betyder helt olika saker när något
 * ändå går fel: `host` är rebinding eller en felkonfigurerad proxy, `origin` är
 * en annan sida som försöker, `site` är en inbäddning. En enda `false` hade
 * gjort felsökningen till gissning.
 */
export type LocalVerdict = "ok" | "host" | "origin" | "site";

/**
 * Värdnamnet utan port.
 *
 * IPv6 skrivs `[::1]:3123`, alltså kan man inte bara dela på första kolon –
 * hakparenteserna måste tas först, annars blir `[` värdnamnet och varje
 * IPv6-anrop avvisas.
 */
export function bareHost(host: string): string | null {
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end === -1 ? null : trimmed.slice(0, end + 1);
  }
  const colon = trimmed.indexOf(":");
  return colon === -1 ? trimmed : trimmed.slice(0, colon);
}

/** Är värden loopback, alltså den här datorn? */
export function isLoopbackHost(host: string | null): boolean {
  if (!host) return false;
  const bare = bareHost(host);
  return bare !== null && LOOPBACK.has(bare);
}

/**
 * Får förfrågan besvaras?
 *
 * Ordningen är medveten: värden först, för den gäller *alla* förfrågningar och
 * är den som stoppar rebinding. `Origin` prövas bara när det finns – vanlig
 * navigering och appens egna GET-anrop skickar inget – och `null` (sandlådad
 * iframe, vissa omdirigeringar) är aldrig vårt eget ursprung.
 */
export function checkLocalRequest(req: RequestOrigin): LocalVerdict {
  if (!isLoopbackHost(req.host)) return "host";

  if (req.origin) {
    let parsed: URL;
    try {
      parsed = new URL(req.origin);
    } catch {
      // `Origin: null` och annat som inte är en URL är inte vårt.
      return "origin";
    }
    if (parsed.host.toLowerCase() !== req.host!.trim().toLowerCase()) return "origin";
  }

  // Bältet till hängslena: fångar cross-site GET, som `Origin` inte täcker.
  // Bara `cross-site` avvisas – `none` är användarens egen navigering och
  // `same-site` kan vara appen på en annan port under utveckling.
  if (req.site && req.site.trim().toLowerCase() === "cross-site") return "site";

  return "ok";
}
