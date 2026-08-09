"use client";

/* Smart: uppdateringsnotisen.
 *
 * Syns bara i den installerade appen (servern svarar `enabled: false` när
 * PA_REPO inte bakats in) och bara när GitHub faktiskt har en nyare version.
 * Går kollen inte att göra tiger den – att appen inte når nätet är inget
 * användaren behöver få veta i ett verktyg som annars fungerar offline.
 *
 * Själva nedladdningen sker på servern, som verifierar SHA-256 mot utgåvan
 * innan något körs. Klienten skickar bara "kör igång" – den får aldrig peka ut
 * vad som ska hämtas. */

import { useCallback, useEffect, useState } from "react";
import {
  notesToBlocks,
  parseUpdatePrefs,
  serializeUpdatePrefs,
  shouldCheck,
  shouldShow,
  UPDATE_PREFS_KEY,
  type UpdateCheck,
  type UpdatePrefs,
} from "@/lib/update";

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

export function UpdateBanner() {
  const [check, setCheck] = useState<UpdateCheck | null>(null);
  const [prefs, setPrefs] = useState<UpdatePrefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [openNotes, setOpenNotes] = useState(false);

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
        const next = { ...stored, lastCheck: Date.now() };
        localStorage.setItem(UPDATE_PREFS_KEY, serializeUpdatePrefs(next));
        setPrefs(next);
      })
      .catch(() => {
        /* Offline är ett normaltillstånd här, inte ett fel att visa. */
      });

    return () => {
      alive = false;
    };
  }, []);

  const later = useCallback(() => {
    if (!prefs || !check?.latest) return;
    const next = { ...prefs, skipped: check.latest };
    localStorage.setItem(UPDATE_PREFS_KEY, serializeUpdatePrefs(next));
    setPrefs(next);
  }, [prefs, check]);

  const install = useCallback(async () => {
    setBusy(true);
    setFailed(null);
    try {
      const response = await fetch("/api/update/install", { method: "POST" });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!result.ok) {
        setFailed(result.error ?? "Uppdateringen misslyckades.");
        setBusy(false);
        return;
      }
      // Servern avslutar sig själv strax efter det här svaret, och installern
      // startar appen igen. Fönstret stängs alltså under oss – med flit.
      setRestarting(true);
    } catch {
      setFailed("Tappade kontakten med servern under uppdateringen.");
      setBusy(false);
    }
  }, []);

  if (!prefs || !shouldShow(check, prefs)) return null;

  if (restarting) {
    return (
      <div className="updbar">
        <span className="updtxt">
          <b>Uppdaterar till {check?.latest}.</b> Appen stängs och öppnas igen av sig själv.
        </span>
      </div>
    );
  }

  // Noteringarna kommer ur CHANGELOG.md via utgåvan. De visas här inne i stället
  // för att skicka iväg användaren till GitHub – appen kör i ett eget fönster,
  // och en extern webbläsare mitt i ett flöde är en onödig omväg.
  const blocks = check?.notes ? notesToBlocks(check.notes) : [];

  return (
    <div className="updbar">
      <div className="updhead">
        <span className="updtxt">
          <b>Version {check?.latest} finns.</b> Du kör {check?.current}
          {check?.size ? ` · ${megabytes(check.size)} att hämta` : ""}
          {failed ? <span className="warn-inline"> · {failed}</span> : null}
        </span>
        {blocks.length > 0 && (
          <button
            type="button"
            className="updlink"
            aria-expanded={openNotes}
            onClick={() => setOpenNotes((open) => !open)}
          >
            {openNotes ? "Dölj" : "Vad är nytt?"}
          </button>
        )}
        <button type="button" className="ghost sm" onClick={later} disabled={busy}>
          Senare
        </button>
        <button type="button" className="ghost sm updgo" onClick={install} disabled={busy}>
          {busy ? "Hämtar…" : "Uppdatera"}
        </button>
      </div>

      {openNotes && blocks.length > 0 && (
        <div className="updnotes">
          {blocks.map((block, i) =>
            block.kind === "punkt" ? (
              <div key={i} className="updnote">
                <span className="dot" />
                {block.text}
              </div>
            ) : block.kind === "rubrik" ? (
              <b key={i}>{block.text}</b>
            ) : (
              <p key={i}>{block.text}</p>
            ),
          )}
          {check?.page && (
            <a className="updlink" href={check.page} target="_blank" rel="noreferrer">
              Hela utgåvan på GitHub
            </a>
          )}
        </div>
      )}
    </div>
  );
}
