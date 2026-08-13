"use client";

/* Dumb: "vad ska den användas till?" – syftet väljs som brickor, aldrig ur en
   dropdown, och de rekommenderade passiverna visas som spelets riktiga banners
   så man ser tier och pilar direkt. */
import { useT } from "@/i18n/LocaleContext";
import { WORK_META, WORK_TYPES } from "@/lib/constants";
import type { PassiveRec, Purpose, PurposeId, SpeciesRec } from "@/lib/purpose";
import { PURPOSES } from "@/lib/purpose";
import { catchInfo } from "@/lib/worldmap";
import type { Species, WorkType } from "@/lib/types";
import { MaskIcon } from "./GameIcon";
import { passiveVisual } from "./PassiveRow";
import { WorkIcon } from "./WorkIcon";
import { DeckNo, ElementIcons, SpeciesIcon, Tag } from "./PalBits";

export interface PurposePickerProps {
  value: PurposeId | null;
  onChange: (id: PurposeId | null) => void;
  /** Vald syssla när syftet är "Bas & arbete". */
  work: WorkType | null;
  onWorkChange: (t: WorkType | null) => void;
  /** Arter som är bäst på den valda sysslan. */
  speciesRecs: SpeciesRec[];
  /** Slår upp arten för porträttet i artlistan. */
  speciesOf: (s: number) => Species;
  /** Sätter arten som mål-pal. */
  onPickTarget: (s: number) => void;
  currentTarget: number | null;
  /** Rekommendationer för valt syfte – bärare i boxen finns. */
  picks: PassiveRec[];
  /** Ännu bättre passiver som ingen i boxen bär. */
  missing: PassiveRec[];
  /** Redan valda passiv-id:n, så knapparna visar rätt läge. */
  chosen: string[];
  onToggle: (id: string) => void;
  onUseAll: () => void;
  /** Namn på målarten – rekommendationen är elementanpassad när den finns. */
  targetName?: string;
  full: boolean;
}

/** ÄGD / AVLAS ×n / FÅNGA – korta former, annars trycks artnamnet bort (designregel 6).
 *  FÅNGA preciseras när källan är känd: en legendar utan vild spawn står som
 *  alfaboss med nivå, en raid-art som raid-ägg (Kens fynd: rakt "FÅNGA" på en
 *  legendar lovar en spawn som inte finns). */
function ReachTag({ reach, code }: { reach: SpeciesRec["reach"]; code: string }) {
  const t = useT();
  if (reach.kind === "owned") return <Tag kind="keep">{t("purpose.reachOwned")}</Tag>;
  if (reach.kind === "catch") {
    const how = catchInfo(code);
    if (how?.kind === "raid") return <Tag kind="cond">{t("best.own.catchRaid")}</Tag>;
    if (how?.kind === "alpha") return <Tag kind="cond">{t("best.own.catchAlpha", { lv: how.lv })}</Tag>;
    return <Tag kind="cond">{t("purpose.reachCatch")}</Tag>;
  }
  return <Tag kind="lucky">{t("purpose.reachBreed", { n: reach.pairings })}</Tag>;
}

function RecRow({ rec, chosen, disabled, onClick }: {
  rec: PassiveRec; chosen: boolean; disabled: boolean; onClick: () => void;
}) {
  const { cls, color, rank } = passiveVisual(rec.tier);
  return (
    <button
      type="button"
      className={`prow sm opt ${cls} ${chosen ? "on" : ""}`}
      /* aria-disabled, inte disabled: raderna under "saknas i boxen" är alltid
         avstängda, och en disabled knapp går inte att hovra – då hade man aldrig
         fått veta vad de bättre passiverna faktiskt gör. */
      aria-disabled={disabled || undefined}
      onClick={() => { if (!disabled) onClick(); }}
      data-passive={rec.id}
    >
      <span className="nm">{rec.name}</span>
      <span className="cnt">{rec.carriers}</span>
      <span className="arr">
        <MaskIcon name={`rank_${rank}`} color={color} width={20} height={18} />
      </span>
    </button>
  );
}

export function PurposePicker({
  value, onChange, work, onWorkChange, speciesRecs, speciesOf, onPickTarget, currentTarget,
  picks, missing, chosen, onToggle, onUseAll, targetName, full,
}: PurposePickerProps) {
  const t = useT();
  const active: Purpose | undefined = PURPOSES.find((p) => p.id === value);
  const allChosen = picks.length > 0 && picks.every((r) => chosen.includes(r.id));
  /* Sysslans namn är spelets eget (engelskt) och står mitt i en mening, därför
     gemener – men bara i språk som skriver substantiv med liten bokstav. */
  const workLabel = work ? WORK_META[work]!.label.toLowerCase() : null;

  return (
    <div className="purpose">
      <div className="purposerow">
        {PURPOSES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`pchip ${value === p.id ? "on" : ""}`}
            aria-pressed={value === p.id}
            onClick={() => onChange(value === p.id ? null : p.id)}
          >
            <b>{t(p.label)}</b>
            <span>{t(p.hint)}</span>
          </button>
        ))}
      </div>

      {value === "work" && (
        <div className="workrow" role="group" aria-label={t("purpose.taskAria")}>
          {WORK_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`wchip ${work === t ? "on" : ""}`}
              aria-pressed={work === t}
              title={WORK_META[t]!.label}
              onClick={() => onWorkChange(work === t ? null : t)}
            >
              <WorkIcon type={t} size={17} active={work === t || work === null} />
              <span>{WORK_META[t]!.label}</span>
            </button>
          ))}
        </div>
      )}

      {value === "work" && work && currentTarget !== null
        && (speciesOf(currentTarget).ws[work] ?? 0) === 0 && (
        <div className="warnbox">
          {t("purpose.cantWork", { name: speciesOf(currentTarget).name, work: workLabel! })}
        </div>
      )}

      {value === "work" && work && (
        <div className="recbox">
          <div className="rechd">
            <span className="k">{t("purpose.bestSpecies", { work: workLabel! })}</span>
          </div>
          <div className="recwhy">{t("purpose.bestSpeciesWhy")}</div>
          <div className="specrecs">
            {speciesRecs.map((r) => (
              <button
                key={r.s}
                type="button"
                className={`specrec ${currentTarget === r.s ? "on" : ""}`}
                onClick={() => onPickTarget(r.s)}
              >
                <SpeciesIcon sp={speciesOf(r.s)} size={36} radius={11} />
                <span className="nm">{r.name}{r.noct ? " 🌙" : ""}</span>
                <ElementIcons sp={speciesOf(r.s)} size={14} />
                <DeckNo sp={speciesOf(r.s)} />
                <span className="lvl">{r.level}</span>
                <ReachTag reach={r.reach} code={speciesOf(r.s).code} />
              </button>
            ))}
          </div>
        </div>
      )}

      {active && (
        <div className="recbox">
          <div className="rechd">
            <span className="k">
              {t("purpose.recommendedFor", {
                what: workLabel ?? t(active.label).toLowerCase(),
              })}
            </span>
            {picks.length > 0 && (
              <button type="button" className="fchip" onClick={onUseAll} disabled={allChosen}>
                {allChosen ? t("purpose.alreadyChosen") : t("purpose.useThese", { n: picks.length })}
              </button>
            )}
          </div>
          {/* Elementboostar räknas bara in för strid – på arbete/riddjur gör de ingen nytta. */}
          {targetName && active.id === "attack" && (
            <div className="recwhy">{t("purpose.elementNote", { name: targetName })}</div>
          )}

          {picks.length > 0 ? (
            <>
              <div className="prows">
                {picks.map((r) => (
                  <RecRow
                    key={r.id}
                    rec={r}
                    chosen={chosen.includes(r.id)}
                    disabled={full && !chosen.includes(r.id)}
                    onClick={() => onToggle(r.id)}
                  />
                ))}
              </div>
              <ul className="reclist">
                {picks.map((r) => (
                  <li key={r.id}>
                    <b className="pname" data-passive={r.id}>{r.name}</b> – {r.why} ·{" "}
                    {t("purpose.inBox", { n: r.carriers })}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="hint">{t("purpose.noCarriers")}</div>
          )}

          {missing.length > 0 && (
            <div className="recmiss">
              <span className="k">{t("purpose.better")}</span>
              <div className="prows">
                {missing.map((r) => (
                  <div key={r.id} className="missrow">
                    <RecRow rec={r} chosen={false} disabled onClick={() => undefined} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
