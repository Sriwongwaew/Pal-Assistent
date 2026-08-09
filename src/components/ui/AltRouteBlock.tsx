/* Dumb: "du kan också göra såhär" – en alternativ väg till målet, indragen
   under huvudplanen.

   Den ersätter aldrig planen. Poängen är att man ska kunna se att det man
   *just* har fått fram öppnade en genväg, utan att tappa den plan man redan
   följer: rubriken säger hur mycket den sparar, texten säger vilka två pals som
   gjorde den möjlig, och stegen står under i samma form som planens egna. */

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
  return (
    <div className="altpal">
      <SpeciesMini sp={sp} />
      <span className="altmeta">
        <GenderSymbol g={pal.g} /> Lv {pal.lv} · IV {pal.iv.join("/")}
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
  if (!routes.length) return null;

  return (
    <div className="altwrap">
      {routes.map((r) => {
        const sp = speciesOf(r.species);
        const wanted = [...new Set([...r.a.pv, ...r.b.pv])].filter((id) => !r.poolJunk.includes(id));
        return (
          <div
            key={r.species}
            className="altroute"
            style={{ ["--elc" as string]: elementColor(sp) }}
          >
            <div className="althd">
              <span className="altlbl">Du kan också göra såhär</span>
              <span className="altsave">~{Math.round(r.saves)} ägg snabbare</span>
              <span className="altsum">
                {Math.ceil(r.totalEggs)} ägg mot planens {Math.ceil(planEggs)}
              </span>
            </div>

            <div className="altwhy">
              Du har nu två <b>{sp.name}</b> som tillsammans bär precis de önskade passiverna.
              Parar du dem med <i>varandra</i> samlas alla {wanted.length} på en {sp.name} direkt
              {r.cleanAssembly
                ? " – och eftersom ingen av dem släpar med något annat kan ungen inte få skräp."
                : ` – men ${r.poolJunk.map(nameOf).join(" och ")} följer med in i arvspoolen.`}
              {r.chain.length > 0
                ? ` Därifrån är det ${r.chain.length} steg till ${speciesOf(target).name}.`
                : ` ${sp.name} är redan målarten.`}
            </div>

            <div className="altpair">
              <Parent pal={r.a} sp={sp} nameOf={nameOf} tierOf={tierOf} wanted={wanted} />
              <span className="altplus">＋</span>
              <Parent pal={r.b} sp={sp} nameOf={nameOf} tierOf={tierOf} wanted={wanted} />
            </div>

            <ol className="altsteps">
              <li>
                <SpeciesMini sp={sp} badge="HOPSAMLING" badgeClass="q" />→
                <span className="meta">{sp.name} med alla {wanted.length}</span>
                <OddsBadge odds={oddsText(r.odds)} eggs={eggsText(r.odds)} />
                {r.cleanAssembly && <span className="altclean">ren pool</span>}
              </li>
              {r.chain.map((st, i) => (
                <li key={i}>
                  <SpeciesMini sp={speciesOf(st.from)} badge={i === 0 ? "DIN LINJE" : `STEG ${i}`} badgeClass="q" />＋
                  <SpeciesMini sp={speciesOf(st.with)} badge="ÄGD" />→
                  <SpeciesMini sp={speciesOf(st.to)} />
                  <OddsBadge odds={oddsText(st.odds)} eggs={eggsText(st.odds)} />
                  {st.partner && st.pool > wanted.length && (
                    <span className="altjunk">
                      +{st.pool - wanted.length} i poolen från partnern
                    </span>
                  )}
                </li>
              ))}
            </ol>

            <div className="hint">
              Uppskattningar utan mutationer, samma modell som planen ovan – jämförbara med
              varandra, men inte exakta. Vill du följa den här vägen i stället: byt inget i
              väljarna, den utgår från pals du redan äger.
            </div>
          </div>
        );
      })}
    </div>
  );
}
