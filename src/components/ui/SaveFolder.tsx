"use client";

import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import { LIVE_INTERVALS, type LiveInterval } from "@/lib/savePrefs";
import { hasAmbiguousLabels, saveLabel, type SaveCandidate } from "@/lib/saveImport";

/** Klockslag ur en unix-tidsstämpel – "sparad 14:07". */
function clock(seconds: number, locale: string): string {
  return new Date(seconds * 1000).toLocaleString(locale, {
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
  const t = useT();
  const rich = useRichT();
  const ambiguous = hasAmbiguousLabels(saves);
  /* Antal spelare i den värld man faktiskt läser. Utan ett val är det den
     senast sparade, alltså listans första – samma val som live gör. */
  const active = selected ? saves.find((s) => s.path === selected) : saves[0];
  const multiPlayer = active && active.players > 1 ? active.players : 0;
  return (
    <div className="savefolder">
      <div className="sfhead">
        <b>{t("save.whereTitle")}</b>
        <button className="sfclose" onClick={onClose} aria-label={t("pal.close")}>×</button>
      </div>

      <p className="meta">{t("save.folderHint")}</p>

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
          {scanning ? t("save.searching") : t("save.search")}
        </button>
      </div>

      {scanError && <div className="warnbox">{scanError}</div>}

      {scanned && saves.length === 0 && !scanError && (
        <div className="warnbox">{t("save.noneFound")}</div>
      )}

      {saves.length > 0 && (
        <div className="sflist">
          <button
            className={`sfsave${selected === "" ? " on" : ""}`}
            onClick={() => onSelect("")}
          >
            <b>{t("save.latestWorld")}</b>
            <span className="meta">{t("save.latestWorldHint")}</span>
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
                    {s.hostLevel ? ` · ${t("pal.lv", { n: s.hostLevel })}` : ""}
                    {s.day ? ` · ${t("save.day", { n: s.day })}` : ""}
                  </>
                ) : (
                  <>{t("save.account", { id: s.account })}</>
                )}
                {s.players > 1 && ` · ${t("save.players", { n: s.players })}`}
                {" · "}{megabytes(s.size)} · {t("save.savedAt", { time: clock(s.modified, t.locale) })}
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
          {rich("save.found", {
            n: saves.length,
            latest: <b>{t("save.latestWorld")}</b>,
          })}
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
          {rich("save.multiPlayer", {
            n: multiPlayer,
            one: <b>{t("save.multiPlayerOne")}</b>,
          })}
        </div>
      )}

      <div className="sflive">
        <label className="sftoggle">
          <input type="checkbox" checked={live} onChange={(e) => onLive(e.target.checked)} />
          <span><b>{t("save.live")}</b>{t("save.liveHint")}</span>
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
            ? rich("save.watching", { path: <code>{watching}</code> })
            : t("save.locating")}
        </p>
      )}
    </div>
  );
}
