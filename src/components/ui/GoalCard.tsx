"use client";

/* Dumb: målbilden i avelsplaneraren – arten du siktar på med precis de passiver
   planen ska ge den. Planen under är en lista med steg och odds; den säger
   aldrig hur *resultatet* ser ut. Kortet gör det: samma porträtt som i Boxen,
   samma banners som i spelets Pal-meny, och tomma platser för de passiver som
   ännu inte är valda (spelet ger högst fyra). */
/* eslint-disable @next/next/no-img-element */
import { useT } from "@/i18n/LocaleContext";
import type { CSSProperties } from "react";
import { ELEMENT_ICON, ELEMENT_META, WORK_META, WORK_TYPES } from "@/lib/constants";
import type { IvGoal } from "@/lib/breeding";
import type { ElementType, Species, WorkType } from "@/lib/types";
import { GameIcon } from "./GameIcon";
import { elementColor } from "./PalHero";
import { PassiveRow } from "./PassiveRow";
import { WorkIcon } from "./WorkIcon";

export interface GoalCardProps {
  /** Målarten, eller null innan man valt en. */
  species: Species | null;
  /** Önskade passiver i vald ordning. */
  wanted: { id: string; name: string; tier: number }[];
  /** Hur många passiver som får plats (spelets tak). */
  slots: number;
  ivGoal: IvGoal;
  /** Antal exemplar av arten i boxen. */
  owned: number;
  /** Kort beskrivning av en ägd pal som redan uppfyller målet, om någon. */
  done?: string | null;
  /** Vald syssla – lyfts fram i arbetsremsan. */
  work?: WorkType | null;
}

const IV_KEYS = ["HP", "ATK", "DEF"] as const;

export function GoalCard({ species, wanted, slots, ivGoal, owned, done, work }: GoalCardProps) {
  const t = useT();
  const els: readonly ElementType[] = species?.elements.length ? species.elements : ["Normal"];
  const workLevels = species
    ? WORK_TYPES.map((w) => [w, species.ws[w] ?? 0] as const).filter(([, lv]) => lv > 0)
    : [];
  const slotsLeft = Math.max(0, slots - wanted.length);

  const status = !species
    ? t("goal.pickSpecies")
    : done
      ? t("goal.done", { pal: done })
      : owned === 0
        ? t("goal.ownNone")
        : t("goal.owned", {
          n: owned,
          rest: wanted.length ? t("goal.noneComplete") : t("goal.pickPassives"),
        });

  return (
    // Elementfärgen bär informationen även här: samma ton som palens bricka i
    // Boxen, så man känner igen arten utan att läsa namnet.
    <div
      className="goalcard"
      style={{ "--elc": species ? elementColor(species) : "var(--line2)" } as CSSProperties}
    >
      <div className="ghead">
        <div className="gpor">
          {species?.icon
            ? <img src={species.icon} alt={species.name} />
            : <span className="q">?</span>}
        </div>
        <div className="gwho">
          <div className="gname">{species ? species.name : t("goal.noSpecies")}</div>
          <div className="chips">
            {species && (
              <>
                {els.map((e) => (
                  <span key={e} className="chip elc"
                    style={{ "--c": ELEMENT_META[e]?.color } as CSSProperties}>
                    <GameIcon name={ELEMENT_ICON[e] ?? "neutral"} size={14} />{e}
                  </span>
                ))}
                {/* Datasetet har 0 för arter utan index (Lamball, platshållarna).
                    "No.0" ser ut som ett riktigt nummer – hellre ingen chip alls. */}
                {species.deck > 0 && <span className="chip">{t("pal.deck", { n: species.deck })}</span>}
              </>
            )}
          </div>
          <div className="ghint">{status}</div>
        </div>
      </div>

      <div className="gsec">
        <span className="gk">{t("goal.passives")}</span>
        <div className="prows">
          {wanted.map((p) => <PassiveRow key={p.id} id={p.id} name={p.name} tier={p.tier} />)}
          {/* Tomma platser, inte en kortare lista: det syns direkt att det
              finns plats kvar, precis som i spelets 2×2-panel. */}
          {Array.from({ length: slotsLeft }, (_, i) => (
            <span key={`slot${i}`} className="prow sm slot">
              <span className="nm">{t("goal.emptySlot")}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="gcols">
        <div className="gsec">
          <span className="gk">{t("goal.ivGoal")}</span>
          {ivGoal === "perfect" ? (
            <div className="gtiles">
              {IV_KEYS.map((k) => (
                <div key={k} className="gtile max">
                  <span className="k">{k}</span><span className="v">100</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ghint">
              <b>{t("breed.ivFast")}</b>{t("goal.ivFastHint")}
            </div>
          )}
        </div>

        {workLevels.length > 0 && (
          <div className="gsec">
            <span className="gk">{t("pal.work")}</span>
            <div className="gwork">
              {workLevels.map(([w, lv]) => (
                <span key={w} className={`wi ${work === w ? "on" : ""}`}
                  title={t("pal.workLv", { name: WORK_META[w]!.label, n: lv })}>
                  <WorkIcon type={w} size={18} />
                  <b>{lv}</b>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
