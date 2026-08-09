"use client";

/* Smart: kopplar vald pal till detaljvyn. */
import { useEffect } from "react";
import { usePalData } from "@/context/PalDataContext";
import { useSelectedPal } from "@/context/SelectedPalContext";
import { displayStats } from "@/lib/scoring";
import { PalDetail } from "@/components/ui/PalDetail";

export function PalDetailHost() {
  const { data } = usePalData();
  const { selected, close } = useSelectedPal();

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, close]);

  if (!selected) return null;
  return (
    <PalDetail
      pal={selected}
      species={data.species[selected.s]!}
      data={data}
      stats={displayStats(data, selected)}
      onClose={close}
    />
  );
}
