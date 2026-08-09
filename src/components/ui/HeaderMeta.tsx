"use client";

import { usePalData } from "@/context/PalDataContext";

export function HeaderMeta() {
  const { data, pals, ownedSpecies } = usePalData();

  // Före första inläsningen är player och exported tomma strängar. Skrivs de ut
  // rakt av blir raden "v2 · s värld · 0 pals · 0 arter ·" – ett genitiv-s utan
  // namn och ett hängande skiljetecken. Bygg raden av de delar som finns i
  // stället, så håller den både tom och fylld box.
  const parts = [
    "v2",
    data.player ? `${data.player}s värld` : null,
    `${pals.length} pals`,
    `${ownedSpecies.size} arter`,
    data.exported || null,
  ].filter((part): part is string => Boolean(part));

  return <div className="meta">{parts.join(" · ")}</div>;
}
