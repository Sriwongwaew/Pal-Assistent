"use client";

/* Dumb: passiv-väljare där varje alternativ är spelets riktiga passiv-banner –
   grå för tier 1, guldtextur för tier 2–3, teal för legendariska, animerad
   regnbåge för World Tree, rött för negativa. Samma `.prow`-stil som resten av
   appen, fast klickbar. */

import { useMemo, useState } from "react";
import { isEquipmentOnly } from "@/lib/purpose";
import type { PassiveDef } from "@/lib/types";
import { MaskIcon } from "./GameIcon";
import { passiveVisual } from "./PassiveRow";

export interface PassivePickerProps {
  passives: Record<string, PassiveDef>;
  /** Antal pals i boxen som bär respektive passiv. */
  counts: ReadonlyMap<string, number>;
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}

/** En klickbar passiv-banner. Samma markup som PassiveRow, men som knapp. */
function PassiveOption({
  name, tier, carriers, selected, disabled, onClick,
}: {
  name: string; tier: number; carriers: number;
  selected: boolean; disabled: boolean; onClick: () => void;
}) {
  const { cls, color, rank } = passiveVisual(tier);
  return (
    <button
      type="button"
      className={`prow sm opt ${cls} ${selected ? "on" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={carriers ? `${carriers} i boxen bär ${name}` : `Ingen i boxen har ${name}`}
    >
      <span className="nm">{name}</span>
      <span className="cnt">{carriers || "–"}</span>
      <span className="arr">
        <MaskIcon name={`rank_${rank}`} color={color} width={20} height={18} />
      </span>
    </button>
  );
}

/** Rubrikerna följer spelets egna nivåer, bästa först. */
const GROUPS: { title: string; match: (tier: number) => boolean }[] = [
  { title: "World Tree", match: (t) => t === 5 },
  { title: "Legendariska", match: (t) => t === 4 },
  { title: "Vanliga", match: (t) => t >= 0 && t <= 3 },
  { title: "Negativa", match: (t) => t < 0 },
];

export function PassivePicker({
  passives, counts, value, onChange, max = 4,
}: PassivePickerProps) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = Object.entries(passives)
      .filter(([id]) => !isEquipmentOnly(id))
      .map(([id, def]) => ({ id, name: def.n, tier: def.r, carriers: counts.get(id) ?? 0 }))
      // Utan bärare kan planen inte göra något med passiven, så de ligger bakom
      // "Visa alla". World Tree visas alltid – de går ändå bara att ärva vidare.
      .filter((o) => showAll || o.carriers > 0 || o.tier === 5)
      .filter((o) => !q || o.name.toLowerCase().includes(q))
      // Bokstavsordning inom varje nivå – man letar efter ett namn man redan har i huvudet.
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));

    return GROUPS.map((g) => ({ title: g.title, items: all.filter((o) => g.match(o.tier)) }))
      .filter((g) => g.items.length > 0);
  }, [passives, counts, query, showAll]);

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
          placeholder="Sök passiv…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={`fchip ${showAll ? "on" : ""}`}
          onClick={() => setShowAll((v) => !v)}
          title="Ta även med passiver som ingen i boxen bär"
        >
          Visa alla
        </button>
        <span className="meta">
          {value.length}/{max} valda · {total} att välja på
        </span>
      </div>

      <div className="picker-grid prows opts">
        {groups.map((g) => (
          <div key={g.title} className="tgroup" style={{ display: "contents" }}>
            <h4 className="tierhd">{g.title}</h4>
            {g.items.map((o) => (
              <PassiveOption
                key={o.id}
                name={o.name}
                tier={o.tier}
                carriers={o.carriers}
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
              ? "Ingen passiv matchar sökningen."
              : "Ingen bärare i boxen matchar – slå på ”Visa alla” för att se resten."}
          </div>
        )}
      </div>
    </div>
  );
}
