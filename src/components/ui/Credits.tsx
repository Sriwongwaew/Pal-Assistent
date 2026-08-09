"use client";

/* Dumb: licensraden, länken till källkoden och tacket till dem som stöttar.
 *
 * Källkodslänken är inte dekoration. AGPL § 13 säger att den som kör en
 * *modifierad* version som nättjänst måste erbjuda sina användare källkoden,
 * och en länk i gränssnittet är det enklaste sättet att faktiskt uppfylla det.
 * Den pekar på PA_REPO, alltså på det repo bygget kom ifrån — forkar någon
 * projektet och sätter sitt eget PA_REPO hamnar länken rätt hos dem, vilket
 * är precis vad paragrafen vill. */
import supporters from "@/../data/supporters.json";
import { useT } from "@/i18n/LocaleContext";

/** Bakas in vid bygget, samma variabel som uppdateringskollen använder. */
const REPO = process.env.PA_REPO ?? "";
/** Versionen står här och ingen annanstans i gränssnittet. Den som ska
    rapportera ett fel behöver kunna läsa upp den. */
const VERSION = process.env.PA_VERSION ?? "";
/** Ko-fi-adressen, samma variabel som stödlänken i skenan. */
const DONATE = process.env.PA_DONATE ?? "";

interface Tier {
  tier: string;
  names: string[];
}

/** `_readme` i JSON-filen är instruktioner till människan, inte data. */
const TIERS: Tier[] = (supporters.tiers as Tier[]).filter((t) => t.names.length > 0);

export function Credits() {
  const t = useT();
  const year = 2026;

  return (
    <div className="credits">
      <p className="crlic">
        {VERSION ? `PalAssistent ${VERSION}` : "PalAssistent"} © {year} Kensiwat Sriwongwaew ·{" "}
        <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noreferrer">
          AGPL-3.0
        </a>
        {REPO && (
          <>
            {" · "}
            <a href={`https://github.com/${REPO}`} target="_blank" rel="noreferrer">
              {t("credits.source")}
            </a>
          </>
        )}
      </p>

      {TIERS.length > 0 && (
        <div className="crthanks">
          <span className="crk">{t("credits.thanks")}</span>
          {TIERS.map((tier) => (
            <p key={tier.tier} className="crtier">
              <b>{tier.tier}</b>
              <span>{tier.names.join(" · ")}</span>
            </p>
          ))}
        </div>
      )}

      {/* Bara när bygget faktiskt har en adress – ingen ska råka be om pengar
          i någon annans namn från en fork. */}
      {DONATE && (
        <p className="crsupport">
          <a className="crkofi" href={DONATE} target="_blank" rel="noreferrer">
            {t("credits.support")}
          </a>
          <span className="crhint">{t("credits.supportHint")}</span>
        </p>
      )}
    </div>
  );
}
