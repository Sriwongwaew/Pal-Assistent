"use client";

/* Hover över vilken passiv-banner som helst → vad den faktiskt gör.
 *
 * En enda värd i layouten i stället för en tooltip per komponent. Banners ritas
 * på ett dussin ställen (boxen, planeraren, väljarna, målbilden, bärarkorten,
 * Bäst för…) och flera av dem är `<button>` eller ligger i knappar – att trä en
 * tooltip genom alla hade betytt ny prop-kedja i varenda container. I stället
 * lyssnar värden på hela dokumentet och plockar upp `data-passive="<id>"`:
 * en ny plats där en passiv visas behöver bara attributet, och en `title` som
 * hade konkurrerat med den här rutan kan tas bort.
 *
 * Tre saker som avgör hur den ser ut:
 *
 * 1. **Portal till <body> med `position: fixed`.** Väljarnas rutnät scrollar och
 *    har `overflow`, och Base Info ligger i en modal – en absolut positionerad
 *    ruta inuti dem hade klippts av på båda ställena.
 * 2. **Två renderingar.** Rutans höjd avgör om den får plats under bannern, och
 *    höjden beror på texten. Den ritas därför osynlig först, mäts, och placeras
 *    sedan – utan `.on` är den genomskinlig, så det syns inte.
 * 3. **Touch hoppas över.** `pointerover` kommer direkt före klicket på en
 *    pekskärm, så en tapp på en väljarknapp hade blinkat fram rutan i samma
 *    ögonblick som valet gjordes. Tangentbord får den däremot via `focusin`. */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePalData } from "@/context/PalDataContext";
import { canImplant } from "@/lib/implants";
import { passiveText, tierLabel } from "@/lib/passiveText";
import { isEquipmentOnly } from "@/lib/purpose";

/** Kort fördröjning så rutan inte blinkar förbi när man sveper över ett rutnät. */
const OPEN_DELAY = 90;
/** Avstånd till bannern, och minsta marginal mot fönsterkanten. */
const GAP = 10;
const EDGE = 8;

/**
 * Nivåns färg i rutan – temats token, INTE bannerns `passiveVisual().color`.
 *
 * Bannerns färger är gjorda för dess egen svarta botten (#0e1013) och byter
 * aldrig med temat: World Tree är vit och tier 1 nästan vit. På rutans ljusa
 * yta blev "WORLD TREE" osynligt. Tokens finns i båda temana och håller
 * färgkoden ändå – lila för World Tree, teal för legendarisk, guld för 2–3.
 */
function tierToken(tier: number): string {
  if (tier >= 5) return "var(--violet)";
  if (tier === 4) return "var(--cyan)";
  if (tier >= 2) return "var(--gold)";
  if (tier <= -1) return "var(--red)";
  return "var(--muted)";
}

interface Anchor {
  id: string;
  /** Extra rad från platsen bannern står på (`data-passive-note`). */
  note: string | null;
  rect: DOMRect;
}

export function PassiveTipHost() {
  const { data, pals } = usePalData();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  /** Vilken banner rutan redan gäller – annars startas timern om när muspekaren
   *  går från bannerns text till dess pil, och rutan hoppar till. */
  const current = useRef<Element | null>(null);
  const timer = useRef<number | null>(null);

  const carriers = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of pals) for (const id of p.pv) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [pals]);

  const hide = useCallback(() => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    current.current = null;
    setAnchor(null);
    setPos(null);
  }, []);

  useEffect(() => {
    const show = (el: HTMLElement) => {
      const id = el.dataset.passive;
      if (!id) return;
      current.current = el;
      setAnchor({ id, note: el.dataset.passiveNote ?? null, rect: el.getBoundingClientRect() });
      setPos(null);
    };

    const anchorOf = (target: EventTarget | null): HTMLElement | null =>
      target instanceof Element
        ? (target.closest("[data-passive]") as HTMLElement | null)
        : null;

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = anchorOf(e.target);
      if (el === current.current) return;
      if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
      if (!el) { hide(); return; }
      current.current = el;
      timer.current = window.setTimeout(() => show(el), OPEN_DELAY);
    };

    const onFocus = (e: FocusEvent) => {
      const el = anchorOf(e.target);
      if (el) show(el); else hide();
    };

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKey);
    // Capture: bannern kan ligga i ett rutnät som scrollar för sig självt, och
    // scroll bubblar inte. Rutan är fast positionerad och skulle annars bli kvar
    // och peka på tomma luften.
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    // Lämnar pekaren fönstret kommer ingen `pointerover` som stänger rutan, och
    // den blir hängande över sidan tills man kommer tillbaka och rör på sig.
    document.documentElement.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      document.documentElement.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [hide]);

  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!anchor || !tip || pos) return;
    const box = tip.getBoundingClientRect();
    const r = anchor.rect;
    let top = r.bottom + GAP;
    if (top + box.height > window.innerHeight - EDGE) top = r.top - GAP - box.height;
    top = Math.max(EDGE, top);
    const left = Math.max(
      EDGE,
      Math.min(r.left + r.width / 2 - box.width / 2, window.innerWidth - EDGE - box.width),
    );
    setPos({ left, top });
  }, [anchor, pos]);

  if (!anchor || typeof document === "undefined") return null;

  const def = data.passives[anchor.id];
  const tier = def?.r ?? 0;
  const { text, fromGame } = passiveText(anchor.id, def);
  const owned = carriers.get(anchor.id) ?? 0;

  return createPortal(
    <div
      ref={tipRef}
      className={`ptip ${pos ? "on" : ""}`}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0 }}
      role="tooltip"
    >
      <div className="pthd">
        <b>{def?.n ?? anchor.id}</b>
        <span className="pttier" style={{ color: tierToken(tier) }}>
          {tierLabel(tier)}
        </span>
      </div>
      <div className="ptbody">
        {text ?? "Datasetet beskriver ingen effekt för den här passiven."}
      </div>
      {anchor.note && <div className="ptnote">{anchor.note}</div>}
      <div className="ptmeta">
        {owned > 0 ? `${owned} i boxen bär den` : "Ingen i boxen bär den"}
        {/* Står direkt efter bärarräkningen med flit: "ingen i boxen bär den ·
            går att operera in" är hela beslutet i en rad. Utan den måste man
            gissa, och gissningen "det ordnar bordet sen" är fel för allt på
            legendarisk nivå – inget av det finns som implantat. */}
        {canImplant(anchor.id) && " · går att operera in (Pal Surgery Table)"}
        {isEquipmentOnly(anchor.id) && " · sitter på utrustning, kan inte ärvas"}
        {/* Härledd text är ofullständig (se passiveText.ts) – säg det hellre än
            att låta den se ut som spelets egen. */}
        {!fromGame && text && " · härlett ur poängdatan"}
      </div>
    </div>,
    document.body,
  );
}
