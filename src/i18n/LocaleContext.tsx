"use client";

/* Holds the active language and hands out the translator.

   The initial value comes from the server (which read the cookie), so the
   first paint is already in the right language. A theme flash is a colour for
   one frame; a language flash is every label on the page changing under the
   reader, which is far more jarring — that is why this one is worth a cookie
   rather than the inline-script trick used for the theme. */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import { DEFAULT_LOCALE, htmlLang, LOCALE_KEY, type Locale } from "./config";
import { makeTranslator, translate, type Translator } from "./index";

interface LocaleValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Translator;
}

const Ctx = createContext<LocaleValue | null>(null);

export function LocaleProvider({ initial, children }: { initial: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = htmlLang(next);

    // localStorage for the client, cookie for the server render on next load.
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      /* private mode — the cookie below still carries the choice */
    }
    // A year, on this origin only. No path escape, no third party: the server
    // reads it purely to avoid rendering the wrong language for one frame.
    document.cookie = `${LOCALE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  /* Ett par ord ritas av CSS och inte av React: `.bsetup > summary::after` säger
     VISA/DÖLJ på de hopfällbara panelerna, och ett pseudo-element går inte att
     nå med en `t()`. De skickas därför in som custom properties på <html>, som
     `content: var(--ui-show)` läser. */
  useEffect(() => {
    const style = document.documentElement.style;
    style.setProperty("--ui-show", JSON.stringify(translate(locale, "ui.show")));
    style.setProperty("--ui-hide", JSON.stringify(translate(locale, "ui.hide")));
  }, [locale]);

  const value = useMemo<LocaleValue>(
    () => ({ locale, setLocale, t: makeTranslator(locale) }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleValue {
  const value = useContext(Ctx);
  if (!value) throw new Error("useLocale must be used inside <LocaleProvider>");
  return value;
}

/** The common case: just the translator. */
export function useT(): Translator {
  return useLocale().t;
}

export { DEFAULT_LOCALE };
export type { Locale };
