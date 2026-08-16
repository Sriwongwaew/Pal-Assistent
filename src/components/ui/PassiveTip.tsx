"use client";

/* Hover över en passiv-banner, en vara, EN ART eller EN INDIVID → vad den är.
 *
 * En enda värd i layouten i stället för en tooltip per komponent. Banners ritas
 * på ett dussin ställen (boxen, planeraren, väljarna, målbilden, bärarkorten,
 * Bäst för…) och flera av dem är `<button>` eller ligger i knappar – att trä en
 * tooltip genom alla hade betytt ny prop-kedja i varenda container. I stället
 * lyssnar värden på hela dokumentet och plockar upp `data-passive="<id>"`:
 * en ny plats där en passiv visas behöver bara attributet, och en `title` som
 * hade konkurrerat med den här rutan kan tas bort.
 *
 * **Varor gick in i samma värd aug 2026** (Kens fråga: "kan vi hovra så man ser
 * vad det faktiska itemet gör?") via `data-item="<engelskt namn>"`. Två hostar
 * med var sitt dokumentlyssnare hade kunnat visa två rutor samtidigt, och
 * positioneringen nedan – portal, tvåstegsmätning, touch-undantaget,
 * scroll i capture-läge – är för subtil att ha i två exemplar. Anchorn bär
 * därför en `kind` och bara innehållet skiljer sig.
 *
 * **Arter och individer kom in aug 2026** (Kens fråga: "hovra över pals i t.ex.
 * breeding för att se information om dom"). Två sorter, för det är två frågor:
 *
 * - `data-species="<kod>"` → **arten**: arbetsnivåer, scalings, partnerskill och
 *   hur man får tag på den. Det är den frågan avelsplanen väcker, eftersom varje
 *   steg nämner arter man inte äger ännu. `SpeciesIcon` sätter attributet SJÄLV,
 *   så varje ställe i appen som ritar ett artporträtt fick rutan på köpet.
 * - `data-pal="<id>"` → **individen**: IV, passiver, stjärnor och var i lådan den
 *   står. Det är frågan Boxens brickor väcker.
 *
 * Arten slås upp på **kod, inte index**. Index i `data.species` flyttar sig när
 * den statiska halvan regenereras – samma fälla `breedingPrefs.ts` är byggd runt
 * – och ett attribut i DOM:en är precis lika långlivat som ett sparat val.
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
import { useT } from "@/i18n/LocaleContext";
import { formatNumber, msg, type Msg } from "@/i18n";
import { isReachable } from "@/lib/breeding";
import { WORK_META, WORK_TYPES } from "@/lib/constants";
import { isKnownModule } from "@/lib/implants";
import { itemInfo, type ItemKind } from "@/lib/itemInfo";
import { partnerSkill, isObtainable } from "@/lib/partnerSkills";
import { passiveText, tierLabel } from "@/lib/passiveText";
import { isEquipmentOnly } from "@/lib/purpose";
import type { ScoredPal, Species } from "@/lib/types";
import { catchInfo } from "@/lib/worldmap";
import { MaskIcon } from "./GameIcon";
import { DeckNo, ElementIcons, GenderSymbol, SpeciesIcon } from "./PalBits";
import { palLocation } from "./PalIdent";
import { passiveVisual } from "./PassiveRow";
import { WorkIcon } from "./WorkIcon";

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

/** Varutypen i ord. Spelets egna kategorier, en nyckel var. */
function itemKindLabel(kind: ItemKind): Msg {
  switch (kind) {
    case "Weapon": case "SpecialWeapon": return msg("itip.kind.weapon");
    case "Armor": return msg("itip.kind.armor");
    case "Accessory": return msg("itip.kind.accessory");
    case "Glider": return msg("itip.kind.glider");
    case "Material": return msg("itip.kind.material");
    case "Consume": return msg("itip.kind.consume");
    case "Food": return msg("itip.kind.food");
    case "Ammo": return msg("itip.kind.ammo");
    case "Blueprint": return msg("itip.kind.blueprint");
    default: return msg("itip.kind.other");
  }
}

interface Anchor {
  /** Vilken sorts ruta. */
  kind: "passive" | "item" | "species" | "pal";
  /** Passiv-id, varans engelska namn, artens kod eller palens instans-id. */
  id: string;
  /** Extra rad från platsen bannern står på (`data-passive-note`). */
  note: string | null;
  rect: DOMRect;
}

/** Elementen värden reagerar på. Ett attribut per sort, samma lyssnare. */
const ANCHOR_SELECTOR = "[data-passive],[data-item],[data-species],[data-pal]";

/**
 * Artens ruta: vad DEN HÄR arten är, inte vad ditt exemplar är.
 *
 * Innehållet är valt efter vad avelsplanen inte svarar på. Stegen säger
 * "para Digtoise med Beakon" om två arter man kanske aldrig sett, och då är
 * frågorna: har jag den, vad kan den jobba med, vad gör dess partnerskill, och
 * hur får jag tag på en? Paldeck-texten står med flit INTE här – den är ett
 * stycke prosa och hör hemma i Hittas hero, där det finns plats.
 */
function SpeciesTip({ sp, index }: { sp: Species; index: number }) {
  const t = useT();
  const { pals, bestOf, freeSolve } = usePalData();
  const owned = pals.filter((p) => p.s === index);
  const best = bestOf.get(index);
  const ps = partnerSkill(sp.code);
  /* Arbetsnivåerna sorterade, högst först. `ws` bär bara nivåer > 0, så en art
     utan rad har ingen arbetslämplighet alls – det är information, inte en lucka. */
  const work = WORK_TYPES
    .map((w) => [w, sp.ws[w] ?? 0] as const)
    .filter(([, lv]) => lv > 0)
    .sort((a, b) => b[1] - a[1]);
  /* "Hur får jag tag på den?" i samma ordning som resten av appen svarar:
     äger du den är det svaret, annars avel om den går att avla, annars fångst –
     och `catchInfo` säger HUR (alfaboss med nivå, eller raid-ägg). */
  const steps = freeSolve.cost[index] ?? Infinity;
  const how = owned.length === 0 ? catchInfo(sp.code) : null;

  return (
    <>
      <div className="pthd sthd">
        <SpeciesIcon sp={sp} size={34} radius={11} />
        <b>{sp.name}</b>
        <ElementIcons sp={sp} size={15} />
        <DeckNo sp={sp} />
      </div>
      <div className="stget">
        {owned.length > 0
          ? <>
            <b>{t.plural("stip.owned", owned.length)}</b>
            {best && <span className="num">{t("stip.best", { iv: best.iv.join("/") })}</span>}
          </>
          : !isObtainable(sp.code) ? <b>{t("stip.unobtainable")}</b>
            : how?.kind === "raid" ? <b>{t("best.own.catchRaid")}</b>
              : how?.kind === "alpha" ? <b>{t("best.own.catchAlpha", { lv: how.lv })}</b>
                : isReachable(freeSolve.cost, index) ? <b>{t("best.own.breedShort", { n: steps })}</b>
                  : <b>{t("best.own.catch")}</b>}
      </div>
      {/* Scalings är artens tak, inte ditt exemplars stats – etiketten säger det. */}
      <div className="stsc num">
        <span>HP <b>{sp.sc[0]}</b></span>
        <span>ATK <b>{sp.sc[1]}</b></span>
        <span>DEF <b>{sp.sc[2]}</b></span>
        {sp.spr > 0 && <span>{t("stip.sprint")} <b>{sp.spr}</b></span>}
      </div>
      {work.length > 0 && (
        <div className="stwork">
          {work.map(([w, lv]) => (
            <span key={w} title={WORK_META[w]?.label ?? w}>
              <WorkIcon type={w} size={15} />
              <b className="num">{lv}</b>
            </span>
          ))}
        </div>
      )}
      {/* Partnerskillen är spelets egen text och översätts aldrig – den är ofta
          hela skälet att en art är bra, och den finns ingen annanstans i planen. */}
      {ps && (
        <div className="stskill">
          <b>{ps.skill}</b>
          <span>{ps.desc}</span>
        </div>
      )}
    </>
  );
}

/**
 * Individens ruta: vilken av mina är det här?
 *
 * Brickan i Boxen visar namn, level och IV; det den inte visar är passiverna i
 * sin helhet, stjärnorna, VAR i lådan palen står – och om appen tänkt spara den
 * och varför. Just det sista är värt en ruta: `reasons` finns i modellen och
 * ritades bara i Rollernas spara-band.
 */
function PalTip({ pal, sp }: { pal: ScoredPal; sp: Species }) {
  const t = useT();
  const { data } = usePalData();
  return (
    <>
      <div className="pthd sthd">
        <SpeciesIcon sp={sp} size={34} radius={11} />
        <b>{pal.nick || sp.name}</b>
        <GenderSymbol g={pal.g} />
        {pal.stars > 0 && <span className="ptstars">{"★".repeat(pal.stars)}</span>}
      </div>
      <div className="stget">
        <b>{t("pal.lv", { n: pal.lv })}</b>
        <span className="num">IV {pal.iv.join("/")}</span>
        {pal.boss && <span className="ptflag">ALPHA</span>}
        {pal.lucky && <span className="ptflag">LUCKY</span>}
      </div>
      <div className="ptpv">
        {pal.pv.length ? pal.pv.map((id) => {
          const { cls, color, rank } = passiveVisual(data.passives[id]?.r ?? 0);
          return (
            <div key={id} className={`prow sm ${cls}`}>
              <span className="nm">{data.passives[id]?.n ?? id}</span>
              <span className="arr">
                <MaskIcon name={`rank_${rank}`} color={color} width={20} height={18} />
              </span>
            </div>
          );
        }) : <div className="prow sm empty"><span className="nm">{t("pal.noPassives")}</span><span className="arr" /></div>}
      </div>
      <div className="ptloc">{t.msg(palLocation(pal))}</div>
      {/* Varför appen sparar den. Utan skälet ser en spara-markering ut som en
          gissning, och då litar man inte på matningslistan heller. */}
      <div className="ptmeta">
        {pal.keep
          ? t("ptip.keeps", { why: pal.reasons.map((r) => t.msg(r)).join(" · ") })
          : t("ptip.fodder")}
      </div>
    </>
  );
}

export function PassiveTipHost() {
  const { data, pals } = usePalData();
  const t = useT();
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

  /* Uppslag på KOD respektive instans-id, aldrig på index: attributen sitter i
     DOM:en och ska överleva att den statiska halvan regenereras. */
  const speciesByCode = useMemo(
    () => new Map(data.species.map((sp, i) => [sp.code.toLowerCase(), { sp, i }] as const)),
    [data],
  );
  const palById = useMemo(() => new Map(pals.map((p) => [p.id, p] as const)), [pals]);

  const hide = useCallback(() => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    current.current = null;
    setAnchor(null);
    setPos(null);
  }, []);

  useEffect(() => {
    const show = (el: HTMLElement) => {
      /* Ordningen är bestämd och beror inte på attributens ordning i taggen: en
         passiv-banner inne i ett varukort är fortfarande en passiv, och en
         INDIVID vinner över sin art – bär samma element båda är det "vilken av
         mina är det här?" som ställts, inte "vad är en Anubis?". */
      const passive = el.dataset.passive;
      const item = el.dataset.item;
      const pal = el.dataset.pal;
      const species = el.dataset.species;
      const kind = passive ? "passive" : item ? "item" : pal ? "pal" : species ? "species" : null;
      const id = passive ?? item ?? pal ?? species;
      if (!kind || !id) return;
      current.current = el;
      setAnchor({ kind, id, note: el.dataset.passiveNote ?? null, rect: el.getBoundingClientRect() });
      setPos(null);
    };

    const anchorOf = (target: EventTarget | null): HTMLElement | null =>
      target instanceof Element
        ? (target.closest(ANCHOR_SELECTOR) as HTMLElement | null)
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

  /* Arten och individen delar skal med de andra två – bara innehållet skiljer.
     `swide` ger rutan mer bredd: en partnerskill-text är två meningar. */
  if (anchor.kind === "species" || anchor.kind === "pal") {
    const hit = anchor.kind === "pal" ? palById.get(anchor.id) : null;
    const species = anchor.kind === "pal"
      ? (hit ? { sp: data.species[hit.s], i: hit.s } : null)
      : speciesByCode.get(anchor.id.toLowerCase());
    // Okänd kod eller en pal som försvunnit ur boxen: ingen ruta alls. En tom
    // ruta ser ut som en trasig sida; ingen ruta ser ut som ingen ruta.
    if (!species?.sp || (anchor.kind === "pal" && !hit)) return null;
    return createPortal(
      <div
        ref={tipRef}
        className={`ptip swide ${pos ? "on" : ""}`}
        style={{ left: pos?.left ?? 0, top: pos?.top ?? 0 }}
        role="tooltip"
      >
        {hit
          ? <PalTip pal={hit} sp={species.sp} />
          : <SpeciesTip sp={species.sp} index={species.i} />}
      </div>,
      document.body,
    );
  }

  if (anchor.kind === "item") {
    const info = itemInfo(anchor.id);
    // Ingen känd beskrivning = ingen ruta. En tom ruta är värre än ingen.
    if (!info) return null;
    /* Siffrorna i spelets ordning, och bara de som betyder något för sorten –
       generatorn utelämnar fält som inte gäller (ett svärd har inget magasin). */
    const stats: [string, number][] = [];
    if (info.atk !== undefined) stats.push([t("itip.atk"), info.atk]);
    if (info.def !== undefined) stats.push([t("itip.def"), info.def]);
    if (info.hp !== undefined) stats.push([t("itip.hp"), info.hp]);
    if (info.shield !== undefined) stats.push([t("itip.shield"), info.shield]);
    if (info.mag !== undefined) stats.push([t("itip.mag"), info.mag]);
    if (info.dur !== undefined) stats.push([t("itip.dur"), info.dur]);
    if (info.w !== undefined) stats.push([t("itip.weight"), info.w]);
    if (info.g !== undefined) stats.push([t("itip.gold"), info.g]);

    return createPortal(
      <div
        ref={tipRef}
        className={`ptip itip ${pos ? "on" : ""}`}
        style={{ left: pos?.left ?? 0, top: pos?.top ?? 0 }}
        role="tooltip"
      >
        <div className="pthd">
          <b>{anchor.id}</b>
          <span className="pttier">{t.msg(itemKindLabel(info.t))}</span>
        </div>
        <div className="ptbody">{info.d}</div>
        {stats.length > 0 && (
          <div className="itstats">
            {stats.map(([label, value]) => (
              <span key={label}>
                {label} <b className="num">{formatNumber(value, t.locale)}</b>
              </span>
            ))}
          </div>
        )}
        <div className="ptmeta">
          {/* Förbehållen är inte finstilt: en spelare som läser basvariantens
              attack på en legendarisk ritning tror att vapnet är svagare än det
              är och väljer bort det. Se itemInfo.ts. */}
          {info.base && t("itip.base")}
          {info.blueprint && t("itip.blueprint")}
        </div>
      </div>,
      document.body,
    );
  }

  const def = data.passives[anchor.id];
  const tier = def?.r ?? 0;
  const { text, fromGame } = passiveText(anchor.id, def, t.locale);
  const owned = carriers.get(anchor.id) ?? 0;
  /** Implantat i förrådet – 0 betyder också "vi vet inte", och båda ska tiga. */
  const mine = data.implants?.[anchor.id] ?? 0;

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
          {t.msg(tierLabel(tier))}
        </span>
      </div>
      <div className="ptbody">
        {text ?? t("ptip.noEffect")}
      </div>
      {anchor.note && <div className="ptnote">{anchor.note}</div>}
      <div className="ptmeta">
        {owned > 0 ? t.plural("ptip.carriers", owned) : t("ptip.noCarriers")}
        {/* Står direkt efter bärarräkningen med flit: "ingen i boxen bär den ·
            du har 1 implantat" är hela beslutet i en rad.
            Ägandet kommer ur saven och är exakt; modul-listan är wikins och
            bevisat ofullständig, så den formuleras som "finns som" och aldrig som
            ett nej. Se implants.ts. */}
        {mine > 0
          ? t.plural("ptip.implants", mine)
          : isKnownModule(anchor.id) && t("ptip.module")}
        {isEquipmentOnly(anchor.id) && t("ptip.equipment")}
        {/* Härledd text är ofullständig (se passiveText.ts) – säg det hellre än
            att låta den se ut som spelets egen. */}
        {!fromGame && text && t("ptip.derived")}
      </div>
    </div>,
    document.body,
  );
}
