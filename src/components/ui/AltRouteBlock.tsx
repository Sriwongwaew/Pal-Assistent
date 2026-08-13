"use client";

/* Dumb: "du kan också göra såhär" – en alternativ väg till målet, indragen
   under huvudplanen.

   Den ersätter aldrig planen. Poängen är att man ska kunna se att det man
   *just* har fått fram öppnade en genväg, utan att tappa den plan man redan
   följer: rubriken säger hur mycket den sparar, texten säger vilka två pals som
   gjorde den möjlig, och stegen står under i samma form som planens egna.

   Två slags vägar ritas här, och **föräldrarna kan vara av olika art**: när
   parets unge är målarten görs hela planen i ett steg (se `directPair.ts`).
   Därför tar varje förälder sin egen art – förut ritades båda med
   hopsamlingsartens porträtt, vilket bara var sant för par av samma art. */

import { useT } from "@/i18n/LocaleContext";
import type { AltRoute } from "@/lib/altRoutes";
import type { ScoredPal, Species } from "@/lib/types";
import { OddsBadge, SpeciesMini } from "./BreedBits";
import { elementColor } from "./PalHero";
import { GenderSymbol } from "./PalBits";
import { PassiveChips } from "./PassiveRow";

export interface AltRouteBlockProps {
  routes: AltRoute[];
  speciesOf: (i: number) => Species;
  nameOf: (id: string) => string;
  tierOf: (id: string) => number;
  /** Målarten, för texten "därifrån är det N steg till …". */
  target: number;
  /** Planens totala äggkostnad, att jämföra mot. */
  planEggs: number;
  oddsText: (p: number) => string;
  eggsText: (p: number) => string;
}

/** En förälder i hopsamlingssteget – art, kön, IV och vad den bidrar med. */
function Parent({ pal, sp, nameOf, tierOf, wanted }: {
  pal: ScoredPal; sp: Species; nameOf: (id: string) => string;
  tierOf: (id: string) => number; wanted: readonly string[];
}) {
  const t = useT();
  return (
    <div className="altpal">
      <SpeciesMini sp={sp} />
      <span className="altmeta">
        <GenderSymbol g={pal.g} /> {t("pal.lv", { n: pal.lv })} · IV {pal.iv.join("/")}
      </span>
      <PassiveChips
        ids={pal.pv.filter((id) => wanted.includes(id))}
        nameOf={nameOf}
        tierOf={tierOf}
      />
    </div>
  );
}

export function AltRouteBlock({
  routes, speciesOf, nameOf, tierOf, target, planEggs, oddsText, eggsText,
}: AltRouteBlockProps) {
  const t = useT();
  if (!routes.length) return null;

  return (
    <div className="altwrap">
      {routes.map((r) => {
        const sp = speciesOf(r.species);
        const wanted = [...new Set([...r.a.pv, ...r.b.pv])].filter((id) => !r.poolJunk.includes(id));
        /* Olika art hos föräldrarna = unge på målarten, alltså ett enda steg.
           Nyckeln måste bära individerna: flera sådana vägar landar på samma
           art och `r.species` räcker då inte som identitet. */
        const cross = r.a.s !== r.b.s;
        return (
          <div
            key={`${r.species}-${r.a.id}-${r.b.id}`}
            className="altroute"
            style={{ ["--elc" as string]: elementColor(sp) }}
          >
            <div className="althd">
              <span className="altlbl">{t("alt.label")}</span>
              <span className="altsave">{t("alt.saves", { n: Math.round(r.saves) })}</span>
              <span className="altsum">
                {t("alt.versus", { eggs: Math.ceil(r.totalEggs), plan: Math.ceil(planEggs) })}
              </span>
            </div>

            <div className="altwhy">
              {cross
                ? t("alt.whyCross", {
                  a: speciesOf(r.a.s).name, b: speciesOf(r.b.s).name,
                  name: sp.name, n: wanted.length,
                })
                : t("alt.why", { name: sp.name, n: wanted.length })}
              {r.cleanAssembly
                ? t("alt.whyClean")
                : t("alt.whyJunk", { names: r.poolJunk.map(nameOf).join(", ") })}
              {/* Korsartade par landar alltid på målet – då säger en tredje
                  mening samma sak en gång till. */}
              {!cross && (r.chain.length > 0
                ? t("alt.whyChain", { n: r.chain.length, target: speciesOf(target).name })
                : t("alt.whyTarget", { name: sp.name }))}
            </div>

            <div className="altpair">
              <Parent pal={r.a} sp={speciesOf(r.a.s)} nameOf={nameOf} tierOf={tierOf} wanted={wanted} />
              <span className="altplus">＋</span>
              <Parent pal={r.b} sp={speciesOf(r.b.s)} nameOf={nameOf} tierOf={tierOf} wanted={wanted} />
            </div>

            <ol className="altsteps">
              <li>
                <SpeciesMini sp={sp} badge={t("alt.assembly")} badgeClass="q" />→
                <span className="meta">{t("alt.withAll", { name: sp.name, n: wanted.length })}</span>
                <OddsBadge odds={oddsText(r.odds)} eggs={eggsText(r.odds)} />
                {r.cleanAssembly && <span className="altclean">{t("alt.cleanPool")}</span>}
              </li>
              {r.chain.map((st, i) => (
                <li key={i}>
                  <SpeciesMini sp={speciesOf(st.from)} badge={i === 0 ? t("breed.yourLine") : t("breed.stepN", { n: i })} badgeClass="q" />＋
                  <SpeciesMini sp={speciesOf(st.with)} badge={t("best.own.owned")} />→
                  <SpeciesMini sp={speciesOf(st.to)} />
                  <OddsBadge odds={oddsText(st.odds)} eggs={eggsText(st.odds)} />
                  {st.partner && st.pool > wanted.length && (
                    <span className="altjunk">
                      {t("alt.poolFromPartner", { n: st.pool - wanted.length })}
                    </span>
                  )}
                </li>
              ))}
            </ol>

            <div className="hint">
              {t("alt.foot")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
