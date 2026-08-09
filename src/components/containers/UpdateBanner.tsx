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

import { useUpdate } from "@/context/UpdateContext";
import { useT } from "@/i18n/LocaleContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { notesToBlocks } from "@/lib/update";

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

export function UpdateBanner() {
  const t = useT();
  /* Kollen och "senare" bor i UpdateProvider, för knappen i foten frågar samma
     sak. Bandet äger bara installationen. */
  const { check, visible, revealed, dismiss } = useUpdate();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [openNotes, setOpenNotes] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  /* Knappen som får bandet att dyka upp sitter i foten, flera skärmhöjder bort.
     Utan det här ser en lyckad sökning ut som att ingenting hände. Samma
     resonemang som art-rutnätet i PalPicker: ett resultat måste också synas. */
  useEffect(() => {
    if (!revealed || !box.current) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.current.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }, [revealed]);

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
      setFailed(t("update.lostContact"));
      setBusy(false);
    }
  }, [t]);

  if (!visible) return null;

  if (restarting) {
    return (
      <div className="updbar">
        <span className="updtxt">
          <b>{t("update.installing", { version: check?.latest ?? "" })}</b>
          {t("update.installingBody")}
        </span>
      </div>
    );
  }

  // Noteringarna kommer ur CHANGELOG.md via utgåvan. De visas här inne i stället
  // för att skicka iväg användaren till GitHub – appen kör i ett eget fönster,
  // och en extern webbläsare mitt i ett flöde är en onödig omväg.
  const blocks = check?.notes ? notesToBlocks(check.notes) : [];

  return (
    <div className="updbar" ref={box}>
      <div className="updhead">
        <span className="updtxt">
          <b>{t("update.available", { version: check?.latest ?? "" })}</b>
          {t("update.availableBody", { current: check?.current ?? "" })}
          {check?.size ? t("update.size", { size: megabytes(check.size) }) : ""}
          {failed ? <span className="warn-inline"> · {failed}</span> : null}
        </span>
        {blocks.length > 0 && (
          <button
            type="button"
            className="updlink"
            aria-expanded={openNotes}
            onClick={() => setOpenNotes((open) => !open)}
          >
            {openNotes ? t("update.hide") : t("update.whatsNew")}
          </button>
        )}
        <button type="button" className="ghost sm" onClick={dismiss} disabled={busy}>
          {t("update.later")}
        </button>
        <button type="button" className="ghost sm updgo" onClick={install} disabled={busy}>
          {busy ? t("update.downloading") : t("update.update")}
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
              {t("update.release")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
