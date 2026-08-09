"use client";

import { LIVE_INTERVALS, type LiveInterval } from "@/lib/savePrefs";
import { hasAmbiguousLabels, saveLabel, type SaveCandidate } from "@/lib/saveImport";

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
  const ambiguous = hasAmbiguousLabels(saves);
  /* Antal spelare i den värld man faktiskt läser. Utan ett val är det den
     senast sparade, alltså listans första – samma val som live gör. */
  const active = selected ? saves.find((s) => s.path === selected) : saves[0];
  const multiPlayer = active && active.players > 1 ? active.players : 0;
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
              <b>{saveLabel(s)}</b>
              <span className="meta">
                {/* Värdens namn först: det är det som skiljer två konton på
                    samma dator åt. Saknas LevelMeta.sav faller vi tillbaka på
                    kontots GUID – sämre, men bättre än ingenting. */}
                {s.host ? (
                  <>
                    {s.host}
                    {s.hostLevel ? ` · Lv ${s.hostLevel}` : ""}
                    {s.day ? ` · dag ${s.day}` : ""}
                  </>
                ) : (
                  <>konto {s.account}</>
                )}
                {s.players > 1 && ` · ${s.players} spelare`}
                {" · "}{megabytes(s.size)} · sparad {clock(s.modified)}
              </span>
              {/* Bara när namnen inte räcker: två världar får heta likadant, och
                  en kopierad save har alltid samma namn som originalet. */}
              {ambiguous && <span className="sfpath">{s.path}</span>}
            </button>
          ))}
        </div>
      )}

      {/* "Senast sparade" är ett rörligt mål. Med en enda värld spelar det ingen
          roll, men delar två personer datorn hoppar valet mellan deras världar
          allt eftersom de spelar – och då läses fel box in. */}
      {saves.length > 1 && selected === "" && (
        <div className="warnbox">
          Hittade {saves.length} världar. <b>Senast sparade världen</b> byter till den
          som sparats sist – spelar någon annan på datorn läses deras box in i stället.
          Välj en värld i listan så ligger valet fast.
        </div>
      )}

      {/* Att välja *värld* går; att välja *spelare inom* en värld gör det inte.
          Saven namnger containrar utifrån den första spelarfilen, så i en co-op-värld
          blir det värdens Palbox och de andras hamnar som "Bas/övrigt". Säg det
          rakt ut i stället för att låta det se ut som en bugg i boxen. */}
      {/* `> 0`, inte bara `multiPlayer &&`: JSX ritar ut en nolla, till skillnad
          från false. Utan jämförelsen stod det en lös "0" i panelen. */}
      {multiPlayer > 0 && (
        <div className="warnbox">
          Den valda världen har {multiPlayer} spelare. Appen läser <b>en</b> av dem –
          den vars spelarfil ligger först – så dennes Palbox blir &quot;Palbox&quot; och
          övrigas boxar hamnar under &quot;Bas/övrigt&quot;. Att välja spelare går inte än.
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
