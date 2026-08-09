/* Dumb byggstenar för breeding-vyerna: mini-chips, stegkort, odds-badge. */
"use client";

import type { ReactNode } from "react";
import { useT } from "@/i18n/LocaleContext";
import type { Species } from "@/lib/types";
import { DeckNo, ElementIcons, SpeciesIcon } from "./PalBits";

/* Element och Paldeck-nummer står på varje art i planen: stegen nämner arter
   man ofta inte äger, och då är nästa steg att slå upp dem i spelets Paldeck.
   Utan dem får man leta på namnet i en lista på tvåhundra. */
export function SpeciesMini({ sp, badge, badgeClass }: { sp: Species; badge?: string; badgeClass?: "o" | "q" }) {
  return (
    <span className="mini">
      <SpeciesIcon sp={sp} size={26} radius={7} />
      {sp.name}
      <ElementIcons sp={sp} size={15} />
      <DeckNo sp={sp} />
      {badge && <span className={badgeClass ?? "o"}>{badge}</span>}
    </span>
  );
}

export function OddsBadge({ odds, eggs }: { odds: string; eggs: string }) {
  const t = useT();
  return <span className="oddbadge">🥚 {t("breed.perEgg", { odds })} · {eggs}</span>;
}

export function StepCard({ num, children, hint }: { num?: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="stepcard">
      <div className="hd">
        {num !== undefined && <span className="stepnum">{num}</span>}
        {children}
      </div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function OkBox({ children }: { children: ReactNode }) {
  return <div className="okbox">{children}</div>;
}

export function WarnBox({ children }: { children: ReactNode }) {
  return <div className="warnbox">{children}</div>;
}
