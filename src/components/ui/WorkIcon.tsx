/* Dumb: spelets riktiga Work Suitability- och stat-ikoner. */
import { WORK_ICON } from "@/lib/constants";
import type { WorkType } from "@/lib/types";
import { GameIcon, MaskIcon } from "./GameIcon";

/** Arbetsikon: färgad spelikon när aktiv, spelets gråa no_-variant när inaktiv. */
export function WorkIcon({ type, active = true, size = 16 }: { type: WorkType; active?: boolean; size?: number }) {
  const base = WORK_ICON[type];
  if (!base) return null;
  return <GameIcon name={active ? base : `no_${base}`} size={size} />;
}

/** Stats-ikoner (Attack/Defense/Work Speed) – spelets vita glyfer, tonbara. */
export function StatIcon({ kind, color = "#e6edf4" }: { kind: "atk" | "def" | "work"; color?: string }) {
  const name = kind === "atk" ? "attack" : kind === "def" ? "defense" : "work_speed";
  return <MaskIcon name={name} color={color} width={15} height={15} />;
}
