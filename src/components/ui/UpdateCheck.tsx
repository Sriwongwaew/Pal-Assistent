"use client";

/* Knappen som frågar GitHub på begäran. Sitter i skenan, bland skalets övriga
 * kontroller.
 *
 * Den finns för att den automatiska kollen med flit är trög: en gång per dygn,
 * och tyst när den misslyckas. Det är rätt för en notis man inte bett om, men
 * fel för den som just läst att en ny version finns och vill ha den nu.
 *
 * Svaret står **här vid knappen** och inte bara i bandet högst upp: skenan är
 * synlig hela tiden, bandet bara när det finns en uppdatering. Hittar kollen
 * något rullar bandet dessutom fram sig självt (se `UpdateBanner`).
 *
 * Bygget från källkoden har tom PA_REPO och har ingenting att fråga om; då
 * visas ingen knapp alls, precis som bandet aldrig visas där. */

import { useUpdate } from "@/context/UpdateContext";
import { useT } from "@/i18n/LocaleContext";

/** Samma strömbrytare som bandet och källkodslänken använder. */
const REPO = process.env.PA_REPO ?? "";

export function UpdateCheck() {
  const t = useT();
  const { check, checking, outcome, refresh } = useUpdate();

  if (!REPO) return null;

  /* "Kunde inte fråga" är ett eget svar, aldrig hopslaget med "du kör den
     senaste" – det senare är ett löfte vi inte får ge när GitHub inte svarade.
     Rutten skickar med sitt eget `error` och det är redan översatt (`serverT`
     läser samma cookie som sidan), så vi visar det hellre än vår egen gissning:
     "hittade inga utgåvor" och "är du uppkopplad?" är olika problem, och bara
     det ena går att göra något åt. */
  const answer =
    checking || !outcome
      ? null
      : outcome === "newer"
        ? t("update.foundNewer", { version: check?.latest ?? "" })
        : outcome === "latest"
          ? t("update.upToDate", { version: check?.current ?? "" })
          : outcome === "failed"
            ? (check?.error ?? t("update.checkFailed"))
            : null;

  return (
    <div className="rupd">
      <button type="button" onClick={refresh} disabled={checking}>
        {checking ? t("update.checking") : t("update.check")}
      </button>
      {/* Svaret kommer efter ett anrop, alltså efter att fokus redan flyttat
          vidare – utan aria-live vore det osynligt för en skärmläsare. Rutan
          renderas därför alltid, även tom: en live-region som inte finns kan
          inte annonsera när den fylls. */}
      <span className="rupdmsg" aria-live="polite">
        {answer}
      </span>
    </div>
  );
}
