"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ScoredPal } from "@/lib/types";

interface SelectedPalValue {
  selected: ScoredPal | null;
  select: (p: ScoredPal) => void;
  close: () => void;
}

const SelectedPalContext = createContext<SelectedPalValue | null>(null);

export function SelectedPalProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<ScoredPal | null>(null);
  return (
    <SelectedPalContext.Provider
      value={{ selected, select: setSelected, close: () => setSelected(null) }}
    >
      {children}
    </SelectedPalContext.Provider>
  );
}

export function useSelectedPal(): SelectedPalValue {
  const ctx = useContext(SelectedPalContext);
  if (!ctx) throw new Error("useSelectedPal måste användas inom SelectedPalProvider");
  return ctx;
}
