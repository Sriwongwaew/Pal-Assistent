/* Message lookup. No React in here — the same `translate` is used by the
   server component that renders <html lang> and by the client provider. */

import { DEFAULT_LOCALE, type Locale } from "./config";
import { en, type Catalogue, type MessageKey, type Messages } from "./messages/en";
import { sv } from "./messages/sv";

export type { Catalogue, MessageKey, Messages };

/* Every catalogue is imported statically rather than lazily. The whole set is
   a few hundred short strings, the app runs from a local disk, and a lazy
   import would mean either a loading state or a flash of English on every
   navigation — a worse trade than the bytes. */
const CATALOGUES: Record<Locale, Catalogue> = {
  en,
  sv,
  "zh-Hans": {},
  ja: {},
  de: {},
  fr: {},
  es: {},
  "pt-BR": {},
};

/* A variable may itself be a message. `src/lib` composes sentences out of parts
   it has no translator for — "3 passives for Combat" is one key for the count
   and another for the purpose — and a nested `Msg` is how the inner part gets
   translated in the same pass as the outer one. */
export type Vars = Record<string, string | number | Msg>;

/** A message chosen in `src/lib`, where there is no translator to call.
    Pure logic decides *what* to say; the component decides how to say it. */
export interface Msg {
  key: MessageKey;
  vars?: Vars;
}

function isMsg(value: string | number | Msg): value is Msg {
  return typeof value === "object" && value !== null && "key" in value;
}

export function msg(key: MessageKey, vars?: Vars): Msg {
  return vars ? { key, vars } : { key };
}

/** Bases of the `.one`/`.other` pairs, so `t.plural` only accepts a key that
    actually has both forms. */
export type PluralKey = MessageKey extends infer K
  ? K extends `${infer Base}.one`
    ? Base
    : never
  : never;

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}

function interpolate(template: string, vars: Vars | undefined, locale: Locale): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = vars[name];
    if (value === undefined) return whole; // visible, but never a crash
    if (typeof value === "number") return formatNumber(value, locale);
    return isMsg(value) ? translate(locale, value.key, value.vars) : value;
  });
}

/** Looks the key up in the active catalogue, then English, then gives back the
    key itself. The last step should be unreachable — `MessageKey` is derived
    from the English catalogue — but a raw key on screen beats an empty box. */
export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const template = CATALOGUES[locale]?.[key] ?? en[key] ?? key;
  return interpolate(template, vars, locale);
}

export function translatePlural(
  locale: Locale,
  key: PluralKey,
  count: number,
  vars?: Vars,
): string {
  /* English and Swedish both split at exactly one; the languages added later
     (zh-Hans, ja) have no plural agreement at all and simply repeat the same
     string in both slots. Should a language with a richer plural system be
     added, this is the one place that needs Intl.PluralRules. */
  const form = count === 1 ? `${key}.one` : `${key}.other`;
  return translate(locale, form as MessageKey, { n: count, ...vars });
}

/** The translator handed to components. Callable, with `.plural` for counts. */
export interface Translator {
  (key: MessageKey, vars?: Vars): string;
  plural(key: PluralKey, count: number, vars?: Vars): string;
  /** Renders a `Msg` produced by `src/lib`. */
  msg(m: Msg): string;
  locale: Locale;
}

export function makeTranslator(locale: Locale): Translator {
  const t = ((key: MessageKey, vars?: Vars) => translate(locale, key, vars)) as Translator;
  t.plural = (key, count, vars) => translatePlural(locale, key, count, vars);
  t.msg = (m) => translate(locale, m.key, m.vars);
  t.locale = locale;
  return t;
}

export const defaultTranslator = makeTranslator(DEFAULT_LOCALE);
