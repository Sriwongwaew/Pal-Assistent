/* Sökningen över boxen.
 *
 * Ligger i `src/lib` och inte i vyn av två skäl: den ska gå att testa, och den
 * ska gå att dela. Art-väljaren i planeraren sökte redan på element och
 * Paldeck-nummer medan boxen bara sökte artnamn, smeknamn och passiver — appen
 * lärde alltså ut en sökning i en vy och bröt den i nästa. "fire" gav noll
 * träffar i boxen, och det ser ut som att man inte äger några eldpals.
 *
 * Två val som styr resten av filen:
 *
 * 1. **Termerna är OCH, inte ELLER.** "fire mining" är eldpalsen som kan bryta,
 *    inte allt som är endera. Det är den enda tolkningen där sökrutan smalnar av
 *    när man skriver mer, vilket är vad man förväntar sig av en sökruta.
 * 2. **Bara sysslor arten faktiskt har.** `Species.ws` innehåller bara nivåer
 *    över noll, men slog man upp hela `WORK_TYPES` skulle "mining" matcha varenda
 *    pal i boxen — ett filter som släpper igenom allt är värre än inget filter,
 *    för det ser ut att fungera.
 *
 * Spelets egna ord matchas på engelska (element, arbetstyper, art- och
 * passivnamn), precis som de renderas — se i18n-avsnittet i CLAUDE.md. */
import { WORK_META, WORK_TYPES } from "./constants";
import type { AppData, OwnedPal } from "./types";

/** Allt som går att söka på för en pal. Texten är redan gemener. */
export interface Haystack {
  text: string[];
  /** Paldeck-numret, eller 0 när arten saknar ett (se `DeckNo` i PalBits). */
  deck: number;
}

/** Sökordet delas på blanksteg. Tomt fält ger inga termer, alltså inget filter. */
export function searchTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Fälten en pal går att hitta på. */
export function palHaystack(data: AppData, p: OwnedPal): Haystack {
  const sp = data.species[p.s];
  if (!sp) return { text: [], deck: 0 };

  const text = [sp.name, sp.code, p.nick, ...sp.elements];
  for (const id of p.pv) {
    const n = data.passives[id]?.n;
    if (n) text.push(n);
  }
  for (const wt of WORK_TYPES) {
    if ((sp.ws[wt] ?? 0) > 0) text.push(WORK_META[wt]!.label);
  }

  return { text: text.filter(Boolean).map((s) => s.toLowerCase()), deck: sp.deck };
}

/**
 * Matchar palen alla termer?
 *
 * Numret jämförs exakt och resten som delsträng: "134" ska vara Paldeck 134 och
 * inte varenda pal på level 134, medan "fire" ska hitta både Fire och Firewyrm.
 * Samma regel som art-väljaren i planeraren använder.
 */
export function palMatches(hay: Haystack, terms: readonly string[]): boolean {
  return terms.every((term) =>
    (hay.deck > 0 && String(hay.deck) === term)
    || hay.text.some((s) => s.includes(term)));
}

/** ALLA valda = "bär hela uppsättningen", NÅGON = "bär minst en av dem". */
export type PassiveMode = "all" | "any";

/**
 * Bär palen de valda passiverna?
 *
 * Tomt val är inget filter alls – samma regel som sökrutan. Grundläget är ALLA:
 * väljer man Legend + Swift letar man efter en pal som bär **uppsättningen**
 * (en avelsförälder), inte efter två högar att slå ihop i huvudet. NÅGON finns
 * för den motsatta frågan – "vilka bär över huvud taget något av det här?" –
 * som är den man ställer när man städar.
 */
export function matchesPassives(
  pv: readonly string[],
  chosen: readonly string[],
  mode: PassiveMode,
): boolean {
  if (!chosen.length) return true;
  return mode === "all"
    ? chosen.every((id) => pv.includes(id))
    : chosen.some((id) => pv.includes(id));
}

/**
 * Klarar palens IV trösklarna? 0 betyder "inget krav" för den staten, så
 * standardläget [0, 0, 0] släpper igenom allt i stället för att filtrera tyst.
 * Ordningen är spelets: HP, Attack, Defense – samma som `OwnedPal.iv`.
 */
export function meetsIvMins(
  iv: readonly number[],
  mins: readonly [number, number, number],
): boolean {
  return mins.every((min, i) => min <= 0 || (iv[i] ?? 0) >= min);
}
