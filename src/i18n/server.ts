/* Översättaren för kod som kör på servern: API-rutterna och `src/server`.
 *
 * Rutternas felmeddelanden hamnar rakt i gränssnittet – `SaveImport` ritar
 * `body.error` i sin varningsruta och `UpdateBanner` visar `failed` – så de
 * måste följa språkvalet precis som allt annat. Här finns ingen React-context
 * att fråga, men språket ligger redan i samma cookie som `layout.tsx` läser
 * före första målningen, så rutterna kan läsa den på egen hand.
 *
 * Cookien är det enda vi går på. `Accept-Language` vore en gissning om vad
 * webbläsaren vill ha, inte vad användaren valt i appen, och de två kan skilja
 * sig åt – då hade felrutan stått på ett annat språk än sidan runt omkring.
 */

import { cookies } from "next/headers";
import { makeTranslator, type Translator } from "./index";
import { LOCALE_KEY, normalizeLocale } from "./config";

/** Översättaren för det språk användaren valt i appen. */
export async function serverT(): Promise<Translator> {
  const store = await cookies();
  return makeTranslator(normalizeLocale(store.get(LOCALE_KEY)?.value));
}
