"use client";

/* Uppdateringens tillstånd, delat mellan bandet högst upp och knappen i foten.
 *
 * Två platser frågar samma sak, och de får inte kunna säga olika: trycker man
 * "Sök efter uppdatering" längst ner ska bandet dyka upp i samma ögonblick,
 * inte vid nästa omstart. Därför bor kollen här och inte i någon av dem.
 *
 * De två vägarna in är olika med flit:
 *
 * - **Automatiskt** – högst en gång per dygn, och tiger om allt utom en ny
 *   version. Att appen är offline är ett normaltillstånd i ett verktyg som
 *   annars fungerar helt utan nätet, inte något att visa rött för.
 * - **Manuellt** – på begäran, hoppar över dygnsspärren, tar bort ett tidigare
 *   "senare" och svarar även när svaret är dåligt. Någon har ställt en fråga
 *   och ska få veta hur det gick.
 *
 * Precis som de andra sparade valen är localStorage gammal data när den läses;
 * allt trasigt blir tomma val i stället för fel (se `parseUpdatePrefs`).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  checkOutcome,
  parseUpdatePrefs,
  serializeUpdatePrefs,
  shouldCheck,
  shouldShow,
  UPDATE_PREFS_KEY,
  type CheckOutcome,
  type UpdateCheck,
  type UpdatePrefs,
} from "@/lib/update";

interface UpdateValue {
  check: UpdateCheck | null;
  /** Ska bandet synas? */
  visible: boolean;
  /** En koll som användaren startat pågår. */
  checking: boolean;
  /** Utfallet av den senaste manuella kollen. Null tills någon tryckt. */
  outcome: CheckOutcome | null;
  /** Stiger varje gång en manuell koll hittat en nyare version. Bandet lyssnar
      på den för att rulla fram sig – annars ser en lyckad sökning i foten ut
      som att ingenting hände. */
  revealed: number;
  refresh: () => void;
  dismiss: () => void;
}

const UpdateContext = createContext<UpdateValue | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [check, setCheck] = useState<UpdateCheck | null>(null);
  const [prefs, setPrefs] = useState<UpdatePrefs | null>(null);
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [revealed, setRevealed] = useState(0);

  const store = useCallback((next: UpdatePrefs) => {
    localStorage.setItem(UPDATE_PREFS_KEY, serializeUpdatePrefs(next));
    setPrefs(next);
  }, []);

  useEffect(() => {
    const stored = parseUpdatePrefs(localStorage.getItem(UPDATE_PREFS_KEY));
    setPrefs(stored);

    if (!shouldCheck(stored, Date.now())) return;

    let alive = true;
    fetch("/api/update/check", { cache: "no-store" })
      .then((r) => r.json() as Promise<UpdateCheck>)
      .then((result) => {
        if (!alive) return;
        setCheck(result);
        // Tidsstämpeln skrivs även när kollen misslyckades: annars försöker vi
        // igen vid varje start så länge nätet är nere.
        store({ ...stored, lastCheck: Date.now() });
      })
      .catch(() => {
        /* Offline är ett normaltillstånd här, inte ett fel att visa. */
      });

    return () => {
      alive = false;
    };
  }, [store]);

  const refresh = useCallback(async () => {
    setChecking(true);
    setOutcome(null);
    try {
      const response = await fetch("/api/update/check?manual=1", { cache: "no-store" });
      const result = (await response.json()) as UpdateCheck;
      const landed = checkOutcome(result);
      setCheck(result);
      setOutcome(landed);
      // Ett "senare" gäller tills man frågar igen. Annars vore knappen tyst för
      // just den som en gång tryckt bort den version den skulle hitta.
      store({ lastCheck: Date.now(), skipped: "" });
      if (landed === "newer") setRevealed((n) => n + 1);
    } catch {
      // Till skillnad från kollen ovan syns det här: den som klickat väntar
      // på ett svar, och "ingenting hände" är inget svar.
      setOutcome("failed");
    } finally {
      setChecking(false);
    }
  }, [store]);

  const dismiss = useCallback(() => {
    if (!prefs || !check?.latest) return;
    store({ ...prefs, skipped: check.latest });
  }, [prefs, check, store]);

  const value = useMemo<UpdateValue>(
    () => ({
      check,
      visible: prefs !== null && shouldShow(check, prefs),
      checking,
      outcome,
      revealed,
      refresh,
      dismiss,
    }),
    [check, prefs, checking, outcome, revealed, refresh, dismiss],
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdate(): UpdateValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error("useUpdate måste användas inom UpdateProvider");
  return ctx;
}
