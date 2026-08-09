"use client";

import { LIVE_INTERVALS, type LiveInterval } from "@/lib/savePrefs";
import type { SaveCandidate } from "@/lib/saveImport";

/** Klockslag ur en unix-tidsstämpel – "sparad 14:07". */
function clock(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function megabytes(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

export interface SaveFolderProps {
  /** Sökvägen i fältet (kan vara halvskriven – containern äger den). */
  root: string;
  onRoot: (value: string) => void;
  /** Spelets egen mapp, visas som platshållare när fältet är tomt. */
  defaultRoot: string;
  onScan: () => void;
  scanning: boolean;
  /** Hittade världar. `scanned` skiljer "inget hittat" från "har inte sökt". */
  saves: SaveCandidate[];
  scanned: boolean;
  scanError: string | null;
  /** Vald Level.sav; tom sträng = "den senast sparade i mappen". */
  selected: string;
  onSelect: (path: string) => void;
  live: boolean;
  onLive: (value: boolean) => void;
  every: LiveInterval;
  onEvery: (value: LiveInterval) => void;
  /** Vad live-läget faktiskt bevakar just nu, om något. */
  watching: string;
  onClose: () => void;
}

/** Panelen bakom "Mapp": var saven ligger och om den ska läsas om av sig själv. */
export function SaveFolder({
  root, onRoot, defaultRoot, onScan, scanning, saves, scanned, scanError,
  selected, onSelect, live, onLive, every, onEvery, watching, onClose,
}: SaveFolderProps) {
  return (
    <div className="savefolder">
      <div className="sfhead">
        <b>Var ligger saven?</b>
        <button className="sfclose" onClick={onClose} aria-label="Stäng">×</button>
      </div>

      <p className="meta">
        Lämna tomt för spelets egen mapp. Peka annars ut mappen – en dedikerad
        server, en molnmapp eller en kopia. Både mappen och en Level.sav funkar.
      </p>

      <div className="sfrow">
        <input
          type="text"
          value={root}
          placeholder={defaultRoot || "%LOCALAPPDATA%\\Pal\\Saved\\SaveGames"}
          spellCheck={false}
          onChange={(e) => onRoot(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onScan(); }}
        />
        <button className="ghost" onClick={onScan} disabled={scanning}>
          {scanning ? "Söker…" : "Sök"}
        </button>
      </div>

      {scanError && <div className="warnbox">{scanError}</div>}

      {scanned && saves.length === 0 && !scanError && (
        <div className="warnbox">Hittade ingen Level.sav i den mappen.</div>
      )}

      {saves.length > 0 && (
        <div className="sflist">
          <button
            className={`sfsave${selected === "" ? " on" : ""}`}
            onClick={() => onSelect("")}
          >
            <b>Senast sparade världen</b>
            <span className="meta">Följer med automatiskt om du byter värld</span>
          </button>
          {saves.map((s) => (
            <button
              key={s.path}
              className={`sfsave${selected === s.path ? " on" : ""}`}
              onClick={() => onSelect(s.path)}
              title={s.path}
            >
              <b>{s.world}</b>
              <span className="meta">
                {s.account} · {s.players} spelare · {megabytes(s.size)} · sparad {clock(s.modified)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="sflive">
        <label className="sftoggle">
          <input type="checkbox" checked={live} onChange={(e) => onLive(e.target.checked)} />
          <span><b>Live</b> – läs om av sig själv när spelet sparat</span>
        </label>
        <div className="seg">
          {LIVE_INTERVALS.map((n) => (
            <button
              key={n}
              onClick={() => onEvery(n)}
              aria-pressed={every === n}
              disabled={!live}
            >
              {n} s
            </button>
          ))}
        </div>
      </div>

      {live && (
        <p className="meta">
          {watching
            ? <>Bevakar <code>{watching}</code></>
            : "Letar upp saven…"}
        </p>
      )}
    </div>
  );
}
