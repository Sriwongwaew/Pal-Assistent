"use client";

/* Manuellt läge: "jag *vill* använda dessa två – vad kostar det?"
 *
 * Resten av planeraren väljer bärare själv och minimerar antalet. Här pekar man
 * ut paret, och frågan är bara om det går och hur många ägg. Två användningar:
 * ett par man redan har i boxen, och ett par man *planerar* – en pal man ska
 * fånga eller avla, byggd för hand som art + passiver.
 *
 * Formen: två platser, men **en editor**. Att rita två art-rutnät med 300 celler
 * på samma sida vore både tungt och rörigt, så platserna är sammanfattningar och
 * den man klickar på fälls ut i editorn under. `slot` är alltså vilken plats som
 * redigeras, inte vilken som är vald.
 *
 * "Ur boxen" fyller alla tre fälten (art, passiver, kön) från ett riktigt
 * exemplar. Det är genvägen som gör läget användbart i praktiken – att knappa in
 * fyra passiver för en pal man redan äger är inget någon gör två gånger.
 */
import { useMemo, useState } from "react";
import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import type { ManualParent } from "@/lib/manualPair";
import type { ScoredPal, Species } from "@/lib/types";
import { DeckNo, ElementIcons, GenderSymbol, SpeciesIcon, Tag } from "./PalBits";
import { PalPicker } from "./PalPicker";
import { PassivePicker } from "./PassivePicker";
import { PassiveRow } from "./PassiveRow";
import type { PassiveDef } from "@/lib/types";

export interface ManualPairPanelProps {
  species: Species[];
  owned: ReadonlySet<number>;
  passives: Record<string, PassiveDef>;
  /** Hela boxen – "Ur boxen" plockar ur den. */
  pals: readonly ScoredPal[];
  /** Bärarantal per passiv, till väljaren. */
  counts: ReadonlyMap<string, number>;
  implants: Readonly<Record<string, number>> | null;
  a: ManualParent | null;
  b: ManualParent | null;
  onChange: (slot: 0 | 1, parent: ManualParent | null) => void;
  /** Planen ritas av containern – panelen äger bara valet. */
  children?: React.ReactNode;
}

const empty = (): ManualParent => ({ s: -1, pv: [], g: "?", label: null });

/** Sammanfattningen av en plats: det man ser när editorn är stängd. */
function SlotCard({
  n, parent, species, passives, active, onEdit, onClear,
}: {
  n: 0 | 1;
  parent: ManualParent | null;
  species: Species[];
  passives: Record<string, PassiveDef>;
  active: boolean;
  onEdit: () => void;
  onClear: () => void;
}) {
  const t = useT();
  const sp = parent && parent.s >= 0 ? species[parent.s] : undefined;
  return (
    <div className={`mslot ${active ? "on" : ""}`}>
      <div className="mshd">
        <span className="k">{t("manual.parent", { n: n + 1 })}</span>
        {parent?.label && <Tag kind="keep">{t("manual.fromBox")}</Tag>}
        {parent && (
          <button type="button" className="ghost sm" onClick={onClear}>{t("manual.clear")}</button>
        )}
        <button type="button" className="ghost sm" onClick={onEdit}>
          {active ? t("pal.close") : parent ? t("manual.change") : t("manual.pick")}
        </button>
      </div>
      {sp ? (
        <>
          <div className="msident">
            <SpeciesIcon sp={sp} size={34} radius={9} />
            <span className="nm">
              {parent?.label || sp.name}
              <ElementIcons sp={sp} size={15} />
              <DeckNo sp={sp} />
            </span>
            <GenderSymbol g={parent!.g} />
          </div>
          {parent!.pv.length > 0 ? (
            <div className="prows">
              {parent!.pv.map((id) => (
                <PassiveRow
                  key={id}
                  id={id}
                  name={passives[id]?.n ?? id}
                  tier={passives[id]?.r ?? 0}
                />
              ))}
            </div>
          ) : (
            <div className="hint">{t("manual.noPassives")}</div>
          )}
        </>
      ) : (
        <div className="hint">{t("manual.noneChosen")}</div>
      )}
    </div>
  );
}

export function ManualPairPanel({
  species, owned, passives, pals, counts, implants, a, b, onChange, children,
}: ManualPairPanelProps) {
  const t = useT();
  const rich = useRichT();
  const [slot, setSlot] = useState<0 | 1 | null>(null);
  const [boxQuery, setBoxQuery] = useState("");

  const editing = slot === null ? null : (slot === 0 ? a : b) ?? empty();

  /* Boxlistan filtreras på art- och smeknamn. Renast först: en förälder med
     mindre skräp är alltid en bättre förälder, så den ska ligga överst i listan
     man väljer ur – samma regel som `compareParents`. */
  const boxRows = useMemo(() => {
    const q = boxQuery.trim().toLowerCase();
    return pals
      .map((p) => ({ p, sp: species[p.s] }))
      .filter(({ p, sp }) => !q
        || (sp?.name.toLowerCase().includes(q) ?? false)
        || p.nick.toLowerCase().includes(q))
      .sort((x, y) => x.p.pv.length - y.p.pv.length || y.p.ivSum - x.p.ivSum)
      .slice(0, 40);
  }, [pals, species, boxQuery]);

  const set = (patch: Partial<ManualParent>) => {
    if (slot === null) return;
    onChange(slot, { ...(editing ?? empty()), ...patch });
  };

  return (
    /* Modalkropp, inte details: öppnas från Verktygs-panelen och stängs av
       modalen (Kens rättning aug 2026 — CSS-lyfta details blev en trång remsa). */
    <section className="bsetup asmodal mpair">
      <div className="bshd">
        <span className="ttl">{t("manual.title")}</span>
        <span className="num">{[a, b].filter(Boolean).length}/2</span>
        <span className="meta">{t("manual.subtitle")}</span>
        {a && b ? <Tag kind="keep">{t("manual.pairChosen")}</Tag> : <Tag kind="cond">{t("manual.pickTwo")}</Tag>}
      </div>

      <div className="hint">
        {rich("manual.intro", { you: <b>{t("manual.introYou")}</b>, plan: <i>{t("manual.introPlan")}</i> })}
      </div>

      <div className="mslots">
        <SlotCard
          n={0} parent={a} species={species} passives={passives} active={slot === 0}
          onEdit={() => setSlot(slot === 0 ? null : 0)}
          onClear={() => onChange(0, null)}
        />
        <SlotCard
          n={1} parent={b} species={species} passives={passives} active={slot === 1}
          onEdit={() => setSlot(slot === 1 ? null : 1)}
          onClear={() => onChange(1, null)}
        />
      </div>

      {slot !== null && editing && (
        <div className="meditor">
          <div className="bsgrp">{t("manual.parentFromBox", { n: slot + 1 })}</div>
          <input
            type="text"
            placeholder={t("manual.searchBox")}
            value={boxQuery}
            onChange={(e) => setBoxQuery(e.target.value)}
          />
          <div className="mboxlist">
            {boxRows.map(({ p, sp }) => (
              <button
                key={p.id}
                type="button"
                className="mboxrow"
                onClick={() => onChange(slot, {
                  s: p.s, pv: [...p.pv], g: p.g,
                  label: p.nick || sp?.name || null,
                  // Id:t följer med: en förälder ur boxen är en riktig individ
                  // och kan därför driva hela passivplanen, se `mustUse`.
                  id: p.id,
                })}
              >
                {sp && <SpeciesIcon sp={sp} size={26} radius={7} />}
                <span className="nm">{p.nick || sp?.name || "?"}</span>
                <GenderSymbol g={p.g} />
                <span className="mini">{t("pal.lv", { n: p.lv })}</span>
                {/* Antalet passiver är det som avgör om palen är en bra förälder,
                    så det är den siffran som ska stå här – inte poängen. */}
                <span className="mini">{t("manual.passiveCount", { n: p.pv.length })}</span>
              </button>
            ))}
            {boxRows.length === 0 && <div className="meta pad">{t("manual.noPal")}</div>}
          </div>

          <div className="bsgrp">{t("manual.orBuild")}</div>
          <div className="mgender">
            <span className="k">{t("manual.gender")}</span>
            {(["M", "F", "?"] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={`fchip ${editing.g === g ? "on" : ""}`}
                onClick={() => set({ g, label: null, id: undefined })}
              >
                {g === "M" ? t("manual.male") : g === "F" ? t("manual.female") : t("manual.unknownGender")}
              </button>
            ))}
          </div>
          <PalPicker
            species={species}
            owned={owned}
            value={editing.s >= 0 ? editing.s : null}
            onChange={(i) => set({ s: i ?? -1, label: null, id: undefined })}
          />
          <div className="bsgrp">{t("manual.carriedPassives")}</div>
          <PassivePicker
            passives={passives}
            counts={counts}
            implants={implants}
            value={editing.pv}
            onChange={(ids) => set({ pv: ids, label: null, id: undefined })}
          />
        </div>
      )}

      {children}
    </section>
  );
}
