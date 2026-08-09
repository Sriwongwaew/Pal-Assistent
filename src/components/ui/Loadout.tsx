/* Dumb: "så här ska den här palen se ut". Fyra bannerplatser för rollen –
   ifyllda när palen redan bär passiven, nedtonade när den saknas – plus det
   skräp den släpar med sig och en genväg till en avelsplan som fyller luckorna. */
"use client";

import { useT } from "@/i18n/LocaleContext";
import type { Loadout } from "@/lib/loadout";
import type { Species } from "@/lib/types";
import { MaskIcon } from "./GameIcon";
import { SpeciesIcon } from "./PalBits";
import { PassiveNames, passiveVisual } from "./PassiveRow";

export interface LoadoutCardProps {
  species: Species;
  name: string;
  /** Rad under namnet: roll, level, arbetsnivå… */
  sub: string;
  loadout: Loadout;
  /** Öppnar breeding-planeraren med art och saknade passiver ifyllda. */
  onPlan?: () => void;
}

export function LoadoutCard({ species, name, sub, loadout, onPlan }: LoadoutCardProps) {
  const t = useT();
  const missing = loadout.slots.filter((s) => !s.owned);
  return (
    <div className={`loadout ${loadout.perfect ? "done" : ""}`}>
      <div className="lhd">
        <SpeciesIcon sp={species} size={38} radius={12} />
        <div className="ln">
          <b>{name}</b>
          <span>{sub}</span>
        </div>
        <span className={`lscore ${loadout.perfect ? "ok" : missing.length > 2 ? "bad" : ""}`}>
          {loadout.score}/{loadout.slots.length}
        </span>
      </div>

      <div className="lslots">
        {loadout.slots.map((s) => {
          const { cls, color, rank } = passiveVisual(s.tier);
          /* Ingen `title` här: `why` är samma fx-rad som hover-rutan redan visar,
             och två tooltips på samma banner slåss om ytan. */
          return (
            <div key={s.id} className={`prow sm ${cls} ${s.owned ? "" : "gap"}`} data-passive={s.id}>
              <span className="nm">{s.name}</span>
              {s.owned
                ? <span className="tick" aria-label={t("loadout.has")}>✓</span>
                : <span className="cnt">{s.carriers}</span>}
              <span className="arr">
                <MaskIcon name={`rank_${rank}`} color={color} width={20} height={18} />
              </span>
            </div>
          );
        })}
        {!loadout.slots.length && (
          <div className="prow sm empty"><span className="nm">{t("loadout.noneForRole")}</span><span className="arr" /></div>
        )}
      </div>

      {loadout.overSubscribed && (
        <div className="lnote">{t("loadout.overSubscribed", { n: loadout.slots.length })}</div>
      )}

      {loadout.alternates.length > 0 && (
        <div className="lalt">
          {t("loadout.alsoCarries")} <b><PassiveNames items={loadout.alternates} /></b>
          {t("loadout.alsoCarriesTail")}
        </div>
      )}

      {loadout.junk.length > 0 && (
        <div className="ljunk">
          {t("loadout.junk")} <b><PassiveNames items={loadout.junk} /></b>
          {t("loadout.junkTail")}
        </div>
      )}

      {onPlan && missing.length > 0 && (
        <button type="button" className="ghost lplan" onClick={onPlan}>
          {t.plural("loadout.planMissing", missing.length)}
        </button>
      )}
      {loadout.perfect && <div className="ldone">{t("loadout.perfect")}</div>}
    </div>
  );
}
