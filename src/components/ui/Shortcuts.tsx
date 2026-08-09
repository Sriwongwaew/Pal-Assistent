/* Dumb: kompakt ruta med "fånga det här i stället" – medvetet kort, den ska
   inte äta höjd från planen den kommenterar. */
"use client";

import { useT } from "@/i18n/LocaleContext";
import type { Shortcut } from "@/lib/shortcuts";
import { DeckNo, ElementIcons, SpeciesIcon } from "./PalBits";

export function Shortcuts({ items }: { items: Shortcut[] }) {
  const t = useT();
  if (!items.length) return null;
  return (
    <div className="shortcuts">
      <span className="sck">{t("shortcut.title")}</span>
      {items.map((s, i) => (
        <div key={`${s.s}-${i}`} className={`scrow ${s.blocking ? "block" : ""}`}>
          <SpeciesIcon sp={s.species} size={26} radius={8} />
          <div className="scmain">
            <b>
              {s.gender === "M"
                ? t("shortcut.catchMale", { name: s.species.name })
                : s.gender === "F"
                  ? t("shortcut.catchFemale", { name: s.species.name })
                  : t("shortcut.catchAny", { name: s.species.name })}
              {/* Nästa steg efter "fånga en" är att ta reda på VAR – och det
                  börjar med att slå upp arten i Paldecket. */}
              <span className="scid">
                <ElementIcons sp={s.species} size={13} />
                <DeckNo sp={s.species} />
              </span>
            </b>
            <span>{t.msg(s.why)} {s.easy ? t("shortcut.common") : t("shortcut.rare")}</span>
          </div>
          <span className="scwin">
            {s.blocking
              ? t("shortcut.required")
              : t("shortcut.saves", { n: Math.round(s.saves) })}
          </span>
        </div>
      ))}
      <span className="scfoot">{t("shortcut.foot")}</span>
    </div>
  );
}
