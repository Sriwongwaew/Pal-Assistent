"use client";

/* Dumb: passiv-väljare där varje alternativ är spelets riktiga passiv-banner –
   grå för tier 1, guldtextur för tier 2–3, teal för legendariska, animerad
   regnbåge för World Tree, rött för negativa. Samma `.prow`-stil som resten av
   appen, fast klickbar. */

import { useT } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n";
import { useMemo, useState } from "react";
import { isEquipmentOnly } from "@/lib/purpose";
import type { PassiveDef } from "@/lib/types";
import { MaskIcon } from "./GameIcon";
import { passiveVisual } from "./PassiveRow";

export interface PassivePickerProps {
  passives: Record<string, PassiveDef>;
  /** Antal pals i boxen som bär respektive passiv. */
  counts: ReadonlyMap<string, number>;
  /**
   * Implantat i förrådet (passiv-id → antal), eller null när saven inte lästs av
   * en läsare som kan fältet. Bara **ägda** märks ut, aldrig "finns nog som
   * modul": en markering i rutnätet läses som ett faktum, och wikins modul-lista
   * är bevisat ofullständig. Se implants.ts.
   */
  implants?: Readonly<Record<string, number>> | null;
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}

/** En klickbar passiv-banner. Samma markup som PassiveRow, men som knapp.
 *  `data-passive` ger hover-rutan med vad passiven gör – den räknar också upp
 *  bärarna, så den gamla `title` med samma siffra är borttagen. */
function PassiveOption({
  id, name, tier, carriers, mine, selected, disabled, onClick,
}: {
  id: string; name: string; tier: number; carriers: number;
  /** Implantat i förrådet – 0 döljer märket. */
  mine: number;
  selected: boolean; disabled: boolean; onClick: () => void;
}) {
  const t = useT();
  const { cls, color, rank } = passiveVisual(tier);
  return (
    <button
      type="button"
      className={`prow sm opt ${cls} ${selected ? "on" : ""}`}
      aria-disabled={disabled || undefined}
      onClick={() => { if (!disabled) onClick(); }}
      data-passive={id}
    >
      <span className="nm">{name}</span>
      {/* Märket sitter inne i bannern, precis som bärarsiffran redan gör – båda
          är appens tillägg, inte spelets grafik. Det säger "den här behöver du
          inte avla", vilket är det enda i rutnätet som kan halvera planen.
          aria-label eftersom ⊕ inte betyder något uppläst. */}
      {mine > 0 && (
        <span className="imp" aria-label={t("picker.implantsFor", { n: mine, name })}>
          ⊕{mine > 1 && mine}
        </span>
      )}
      <span className="cnt">{carriers || "–"}</span>
      <span className="arr">
        <MaskIcon name={`rank_${rank}`} color={color} width={20} height={18} />
      </span>
    </button>
  );
}

/** Rubrikerna följer spelets egna nivåer, bästa först. */
/* Rubrikerna är nycklar – även "World Tree", som är samma ord i båda språken.
   Att låta den enda vara en literal hade gjort typen `string` och tystat
   kompilatorn för de andra tre. */
const GROUPS: { title: MessageKey; match: (tier: number) => boolean }[] = [
  { title: "picker.groupWorldTree", match: (r) => r === 5 },
  { title: "picker.groupLegendary", match: (r) => r === 4 },
  { title: "picker.groupCommon", match: (r) => r >= 0 && r <= 3 },
  { title: "picker.groupNegative", match: (r) => r < 0 },
];

export function PassivePicker({
  passives, counts, implants, value, onChange, max = 4,
}: PassivePickerProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = Object.entries(passives)
      .filter(([id]) => !isEquipmentOnly(id))
      .map(([id, def]) => ({
        id, name: def.n, tier: def.r,
        carriers: counts.get(id) ?? 0,
        mine: implants?.[id] ?? 0,
      }))
      // Utan bärare kan planen inte göra något med passiven, så de ligger bakom
      // "Visa alla". World Tree visas alltid – de går ändå bara att ärva vidare.
      // Och äger du ett IMPLANTAT behövs ingen bärare alls: passiven går att
      // sätta in direkt, så den ska aldrig ligga gömd bakom "Visa alla".
      .filter((o) => showAll || o.carriers > 0 || o.mine > 0 || o.tier === 5)
      .filter((o) => !q || o.name.toLowerCase().includes(q))
      // Bokstavsordning inom varje nivå – man letar efter ett namn man redan har i huvudet.
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));

    return GROUPS.map((g) => ({ title: g.title, items: all.filter((o) => g.match(o.tier)) }))
      .filter((g) => g.items.length > 0);
  }, [passives, counts, implants, query, showAll]);

  const total = groups.reduce((sum, g) => sum + g.items.length, 0);

  const full = value.length >= max;

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : full ? value : [...value, id]);

  return (
    <div className="picker">
      <div className="picker-bar">
        <input
          type="text"
          className="grow"
          placeholder={t("picker.searchPassive")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={`fchip ${showAll ? "on" : ""}`}
          onClick={() => setShowAll((v) => !v)}
          title={t("picker.showAllTitle")}
        >
          {t("picker.showAll")}
        </button>
        <span className="meta">
          {t("picker.chosenOf", { n: value.length, max, total })}
        </span>
      </div>

      <div className="picker-grid prows opts">
        {groups.map((g) => (
          <div key={g.title} className="tgroup" style={{ display: "contents" }}>
            <h4 className="tierhd">{t(g.title)}</h4>
            {g.items.map((o) => (
              <PassiveOption
                key={o.id}
                id={o.id}
                name={o.name}
                tier={o.tier}
                carriers={o.carriers}
                mine={o.mine}
                selected={value.includes(o.id)}
                disabled={full && !value.includes(o.id)}
                onClick={() => toggle(o.id)}
              />
            ))}
          </div>
        ))}
        {total === 0 && (
          <div className="meta pad">
            {showAll
              ? t("picker.noPassive")
              : t("picker.noCarrierMatch")}
          </div>
        )}
      </div>
    </div>
  );
}
