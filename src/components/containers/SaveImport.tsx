"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";
import type { Translator } from "@/i18n";
import { SaveFolder } from "@/components/ui/SaveFolder";
import {
  SAVE_PREFS_KEY, emptySavePrefs, parseSavePrefs, serializeSavePrefs,
  type LiveInterval, type SavePrefs,
} from "@/lib/savePrefs";
import type { SaveCandidate } from "@/lib/saveImport";

interface ImportOk {
  ok: true;
  player: string;
  exported: string;
  total: number;
  added: number;
  removed: number;
  world: string;
  containers: string[];
  skipped: Record<string, number>;
  savePath: string;
  modified: number;
}

interface ScanOk {
  ok: true;
  saves: SaveCandidate[];
  root: string;
  exists: boolean;
  isDefault: boolean;
}

interface StatusOk {
  ok: true;
  modified: number;
  size: number;
}

interface Failed {
  ok: false;
  error: string;
}

/**
 * Så här många misslyckade live-försök i rad innan live stängs av.
 *
 * Utan taket skulle en borttagen mapp (eller ett saknat Python) betyda ett nytt
 * försök var tionde sekund i all evighet, med samma felruta varje gång. Spelet
 * hinner däremot skriva färdigt sina 27 MB långt inom ett par försök, så
 * enstaka fel ("verkar halvskriven") ska bara leda till ett nytt försök.
 */
const LIVE_MAX_FAILS = 5;

/** Hur länge ett uppslag av "senast sparade världen" får återanvändas. */
const RESOLVE_TTL_MS = 60_000;

/**
 * Felrutan visar `error` rakt av, så varje meddelande måste vara en hel mening.
 * Prefixade vyn i stället blev det "Kunde inte läsa saven: Live avstängt …".
 */
const cause = (t: Translator, message: string) => t("save.failed", { message });

/**
 * Läser Level.sav direkt ur spelets mapp – ingen kopiering, inget filval.
 *
 * "Mapp" öppnar var saven ska letas (för dedikerad server, molnmapp eller en
 * kopia) och live-läget, som kollar savens tidsstämpel med jämna mellanrum och
 * läser om boxen så fort spelet sparat något nytt.
 */
export function SaveImport() {
  const { reload } = usePalData();
  const t = useT();

  const [prefs, setPrefs] = useState<SavePrefs>(emptySavePrefs);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  const [rootField, setRootField] = useState("");
  const [defaultRoot, setDefaultRoot] = useState("");
  const [saves, setSaves] = useState<SaveCandidate[]>([]);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportOk | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Filen live-läget bevakar just nu (kan vara uppslagen, inte vald). */
  const [watching, setWatching] = useState("");

  const busyRef = useRef(false);
  /** Tidsstämpeln på den save vi senast läste in – live jämför mot den. */
  const lastRef = useRef(0);
  const failRef = useRef(0);
  const resolvedAtRef = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Valen laddas i en effekt, inte i initialvärdet: localStorage finns inte på
  // servern och en avvikelse där ger hydreringsfel.
  useEffect(() => {
    const stored = parseSavePrefs(localStorage.getItem(SAVE_PREFS_KEY));
    setPrefs(stored);
    setRootField(stored.root);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(SAVE_PREFS_KEY, serializeSavePrefs(prefs));
  }, [prefs, loaded]);

  const scan = useCallback(async (root: string): Promise<SaveCandidate[]> => {
    const url = root ? `/api/save/scan?root=${encodeURIComponent(root)}` : "/api/save/scan";
    const response = await fetch(url, { cache: "no-store" });
    const body = (await response.json()) as ScanOk | Failed;
    if (!body.ok) throw new Error(body.error);
    // Spelets egen mapp används som platshållare i fältet.
    if (body.isDefault) setDefaultRoot(body.root);
    if (!body.exists) throw new Error(t("save.noFolder", { root: body.root }));
    return body.saves;
  }, [t]);

  const runScan = useCallback(async (root: string) => {
    setScanning(true);
    setScanError(null);
    try {
      setSaves(await scan(root));
    } catch (e: unknown) {
      setSaves([]);
      setScanError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanned(true);
      setScanning(false);
    }
  }, [scan]);

  /**
   * Läser in en save. Returnerar felmeddelandet, eller null när det gick bra –
   * live behöver veta *vad* som gick fel, och `error`-staten är inte satt än i
   * samma varv (setState syns först i nästa rendering).
   */
  const runImport = useCallback(async (path: string, root: string): Promise<string | null> => {
    // Pågår redan en inläsning har ingenting misslyckats; nästa varv tar det.
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/save/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(root ? { root } : {}), ...(path ? { path } : {}) }),
      });
      const body = (await response.json()) as ImportOk | Failed;
      if (!body.ok) {
        setError(cause(t, body.error));
        return body.error;
      }
      lastRef.current = body.modified;
      setWatching(body.savePath);
      setResult(body);
      setError(null);
      reload();
      return null;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(cause(t, message));
      return message;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [reload, t]);

  /**
   * Ett live-varv: leta rätt på saven, kolla dess tidsstämpel och läs bara om
   * den ändrats. Att fråga efter tidsstämpeln är en `stat` – inläsningen packar
   * upp 27 MB, så skillnaden är hela poängen med att kolla först.
   */
  const tick = useCallback(async () => {
    if (busyRef.current) return;

    const miss = (message: string) => {
      failRef.current += 1;
      if (failRef.current < LIVE_MAX_FAILS) {
        setError(cause(t, message));
        return;
      }
      setPrefs((p) => ({ ...p, live: false }));
      setError(t("save.liveOff", { n: LIVE_MAX_FAILS, message }));
    };

    let target = prefs.path;
    if (!target) {
      // "Senast sparade världen" är ett rörligt mål – byter man värld ska live
      // följa med. Uppslaget är billigt men inte gratis, så det görs sällan.
      const stale = Date.now() - resolvedAtRef.current > RESOLVE_TTL_MS;
      if (!watching || stale) {
        try {
          const found = await scan(prefs.root);
          const newest = found[0]?.path;
          if (!newest) throw new Error(t("save.noneToWatch"));
          resolvedAtRef.current = Date.now();
          setWatching(newest);
          target = newest;
        } catch (e: unknown) {
          miss(e instanceof Error ? e.message : String(e));
          return;
        }
      } else {
        target = watching;
      }
    }

    try {
      const response = await fetch(
        `/api/save/status?path=${encodeURIComponent(target)}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as StatusOk | Failed;
      if (!body.ok) throw new Error(body.error);
      if (body.modified === lastRef.current) {
        failRef.current = 0;
        return;
      }
      // Importera exakt den fil vi tittade på, inte "den senaste" igen: annars
      // kan uppslaget hinna peka någon annanstans mellan koll och inläsning.
      const failure = await runImport(target, prefs.root);
      if (failure) miss(failure);
      else failRef.current = 0;
    } catch (e: unknown) {
      miss(e instanceof Error ? e.message : String(e));
    }
  }, [prefs.path, prefs.root, watching, scan, runImport, t]);

  // Slingan startas om bara när live eller intervallet ändras – `tick` byter
  // identitet så fort något av dess beroenden gör det, och att bygga om timern
  // varje gång skulle skjuta upp kollen i all oändlighet.
  const tickRef = useRef(tick);
  useEffect(() => { tickRef.current = tick; }, [tick]);

  useEffect(() => {
    if (!loaded || !prefs.live) return;
    failRef.current = 0;
    // Kolla direkt när live slås på, inte först efter ett helt intervall.
    void tickRef.current();
    const id = setInterval(() => void tickRef.current(), prefs.every * 1000);
    // Webbläsaren strypter timers i dolda flikar, så när man alt-tabbar tillbaka
    // från spelet ska en koll ske på en gång.
    const onVisible = () => { if (!document.hidden) void tickRef.current(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loaded, prefs.live, prefs.every]);

  // Första gången panelen öppnas: sök i mappen som redan är vald, så listan är
  // ifylld utan att man behöver klicka "Sök".
  useEffect(() => {
    if (open && !scanned && !scanning) void runScan(rootField);
  }, [open, scanned, scanning, rootField, runScan]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function manualImport() {
    setError(null);
    setResult(null);
    void runImport(prefs.path, prefs.root);
  }

  function pickRoot() {
    const root = rootField.trim().replace(/^"|"$/g, "").trim();
    // Ny mapp betyder att den gamla filen inte längre är vald eller bevakad.
    setPrefs((p) => ({ ...p, root, path: "" }));
    setWatching("");
    resolvedAtRef.current = 0;
    void runScan(root);
  }

  function pickSave(path: string) {
    setPrefs((p) => ({ ...p, path }));
    setWatching(path);
    resolvedAtRef.current = Date.now();
    // Ny fil = ny värld: nästa live-varv ska läsa in den även om tidsstämpeln
    // råkar vara äldre än den vi läste sist.
    lastRef.current = 0;
  }

  const skippedCount = result
    ? Object.values(result.skipped).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <div className="saveimport" ref={boxRef}>
      <div className="sibar">
        {prefs.live && (
          <span className={`livedot${busy ? " on" : ""}`} title={t("save.liveDot")}>
            <i />{t("save.live")}
          </span>
        )}
        <button className="ghost" onClick={manualImport} disabled={busy}>
          {busy ? t("save.reading") : t("save.read")}
        </button>
        <button
          className={`ghost sfbtn${open ? " on" : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {t("save.folder")}
        </button>
      </div>

      {open && (
        <SaveFolder
          root={rootField}
          onRoot={setRootField}
          defaultRoot={defaultRoot}
          onScan={pickRoot}
          scanning={scanning}
          saves={saves}
          scanned={scanned}
          scanError={scanError}
          selected={prefs.path}
          onSelect={pickSave}
          live={prefs.live}
          onLive={(live) => setPrefs((p) => ({ ...p, live }))}
          every={prefs.every}
          onEvery={(every: LiveInterval) => setPrefs((p) => ({ ...p, every }))}
          watching={prefs.path || watching}
          onClose={() => setOpen(false)}
        />
      )}

      {result && (
        <div className="okbox">
          {t("save.result", {
            total: result.total, player: result.player,
            added: result.added, removed: result.removed, exported: result.exported,
          })}
          {skippedCount > 0 && (
            <span className="meta">{t("save.skipped", { n: skippedCount })}</span>
          )}
        </div>
      )}

      {error && <div className="warnbox">{error}</div>}
    </div>
  );
}
