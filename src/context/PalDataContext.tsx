"use client";

import { useT } from "@/i18n/LocaleContext";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import { solveFree, type FreeSolveResult } from "@/lib/breeding";
import { applyKeepRules, bestOfSpecies, scorePal } from "@/lib/scoring";
import type { AppData, ScoredPal } from "@/lib/types";

export interface PalDataValue {
  data: AppData;
  pals: ScoredPal[];
  ownedSpecies: ReadonlySet<number>;
  bestOf: Map<number, ScoredPal>;
  /** Kortaste väg till alla arter från boxen (memoiserad). */
  freeSolve: FreeSolveResult;
  /** Hämtar exporten på nytt – används efter inläsning från save-filen. */
  reload: () => void;
}

const PalDataContext = createContext<PalDataValue | null>(null);

/** Smart provider: hämtar exporten och beräknar all härledd data en gång. */
export function PalDataProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Räknare som både tvingar ny fetch och kringgår webbläsarens cache. */
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => {
    fetch(revision === 0 ? "/data/pal-data.json" : `/data/pal-data.json?v=${revision}`, {
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AppData>;
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [revision]);

  const value = useMemo<PalDataValue | null>(() => {
    if (!data) return null;
    const pals = data.pals.map((p) => scorePal(data, p));
    /* Artens bästa väljs på passform och IV, inte på `score` – se
       `bestOfSpecies`. Det är den pal appen säger att man ska investera i. */
    const bestOf = bestOfSpecies(pals);
    applyKeepRules(data, pals, bestOf);
    const ownedSpecies = new Set(pals.map((p) => p.s));
    const freeSolve = solveFree(data, ownedSpecies);
    return { data, pals, ownedSpecies, bestOf, freeSolve, reload };
  }, [data, reload]);

  // Skenan behöver datan för spelarrutan, så laddning/fel visas i stället för
  // hela skalet. Wrappas i .content så de landar på samma yta som resten.
  if (error) {
    return (
      <div className="content"><div className="wrap">
        <div className="warnbox">{t("api.dataFailed", { error })}</div>
      </div></div>
    );
  }
  if (!value) {
    return (
      <div className="content"><div className="wrap">
        <div className="meta" style={{ padding: 40 }}>{t("api.loadingBox")}</div>
      </div></div>
    );
  }
  return <PalDataContext.Provider value={value}>{children}</PalDataContext.Provider>;
}

export function usePalData(): PalDataValue {
  const ctx = useContext(PalDataContext);
  if (!ctx) throw new Error("usePalData måste användas inom PalDataProvider");
  return ctx;
}
