"use client";

import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";

export function HeaderMeta() {
  const { data, pals, ownedSpecies } = usePalData();
  const t = useT();

  // Before the first import, player and exported are empty strings. Printed
  // raw the row reads "v2 · 's world · 0 pals · 0 species ·" — a possessive
  // without a name and a dangling separator. Build the row from the parts that
  // exist instead, so it holds for both an empty and a full box.
  const parts = [
    "v2",
    data.player ? t("header.world", { name: data.player }) : null,
    t.plural("header.pals", pals.length),
    t.plural("header.species", ownedSpecies.size),
    data.exported || null,
  ].filter((part): part is string => Boolean(part));

  return <div className="meta">{parts.join(" · ")}</div>;
}
