/* Dumb byggstenar för breeding-vyerna: mini-chips, stegkort, odds-badge. */
import type { ReactNode } from "react";
import type { Species } from "@/lib/types";
import { SpeciesIcon } from "./PalBits";

export function SpeciesMini({ sp, badge, badgeClass }: { sp: Species; badge?: string; badgeClass?: "o" | "q" }) {
  return (
    <span className="mini">
      <SpeciesIcon sp={sp} size={26} radius={7} />
      {sp.name}
      {badge && <span className={badgeClass ?? "o"}>{badge}</span>}
    </span>
  );
}

export function OddsBadge({ odds, eggs }: { odds: string; eggs: string }) {
  return <span className="oddbadge">🥚 {odds} / ägg · {eggs}</span>;
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
