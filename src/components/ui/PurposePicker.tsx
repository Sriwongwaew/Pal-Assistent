"use client";

/* Dumb: "vad ska den användas till?" – syftet väljs som brickor, aldrig ur en
   dropdown, och de rekommenderade passiverna visas som spelets riktiga banners
   så man ser tier och pilar direkt. */
import { WORK_META, WORK_TYPES } from "@/lib/constants";
import type { PassiveRec, Purpose, PurposeId, SpeciesRec } from "@/lib/purpose";
import { PURPOSES } from "@/lib/purpose";
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

/** ÄGD / AVLAS ×n / FÅNGA – korta former, annars trycks artnamnet bort (designregel 6). */
function ReachTag({ reach }: { reach: SpeciesRec["reach"] }) {
  if (reach.kind === "owned") return <Tag kind="keep">ÄGD</Tag>;
  if (reach.kind === "catch") return <Tag kind="cond">FÅNGA</Tag>;
  return <Tag kind="lucky">AVLAS ×{reach.pairings}</Tag>;
}

function RecRow({ rec, chosen, disabled, onClick }: {
  rec: PassiveRec; chosen: boolean; disabled: boolean; onClick: () => void;
}) {
  const { cls, color, rank } = passiveVisual(rec.tier);
  return (
    <button
      type="button"
      className={`prow sm opt ${cls} ${chosen ? "on" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={`${rec.why || rec.name} · ${rec.carriers} i boxen bär den`}
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
  const active: Purpose | undefined = PURPOSES.find((p) => p.id === value);
  const allChosen = picks.length > 0 && picks.every((r) => chosen.includes(r.id));
  const workLabel = work ? WORK_META[work]!.label : null;

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
            <b>{p.label}</b>
            <span>{p.hint}</span>
          </button>
        ))}
      </div>

      {value === "work" && (
        <div className="workrow" role="group" aria-label="Syssla">
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
          <b>{speciesOf(currentTarget).name}</b> kan inte {workLabel!.toLowerCase()} alls
          (arbetsnivå 0). Passivförslagen nedan höjer bara arbetshastigheten – de gör ingen
          nytta på en art som saknar sysslan. Välj en art ur listan i stället.
        </div>
      )}

      {value === "work" && work && (
        <div className="recbox">
          <div className="rechd">
            <span className="k">Bäst art för {workLabel!.toLowerCase()}</span>
          </div>
          <div className="recwhy">
            Sorterat på arbetsnivå först – en nivå högre slår alltid en billigare väg.
            Klicka för att sätta arten som mål.
          </div>
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
                <ReachTag reach={r.reach} />
              </button>
            ))}
          </div>
        </div>
      )}

      {active && (
        <div className="recbox">
          <div className="rechd">
            <span className="k">
              Rekommenderat för {workLabel ? workLabel.toLowerCase() : active.label.toLowerCase()}
            </span>
            {picks.length > 0 && (
              <button type="button" className="fchip" onClick={onUseAll} disabled={allChosen}>
                {allChosen ? "Redan valda" : `Använd dessa ${picks.length}`}
              </button>
            )}
          </div>
          {/* Elementboostar räknas bara in för strid – på arbete/riddjur gör de ingen nytta. */}
          {targetName && active.id === "attack" && (
            <div className="recwhy">
              Anpassat efter elementet hos {targetName} – boostar för fel element faller bort.
            </div>
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
                  <li key={r.id}><b>{r.name}</b> – {r.why} · {r.carriers} i boxen</li>
                ))}
              </ul>
            </>
          ) : (
            <div className="hint">
              Ingen i boxen bär en passiv som passar det här syftet. Fånga eller avla fram en bärare
              först – planen kan bara ärva vidare det som redan finns.
            </div>
          )}

          {missing.length > 0 && (
            <div className="recmiss">
              <span className="k">Ännu bättre, men saknas i boxen</span>
              <div className="prows">
                {missing.map((r) => (
                  <div key={r.id} className="missrow" title={r.why}>
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
