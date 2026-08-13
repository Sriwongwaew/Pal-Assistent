"use client";

/* Smart: Kartan – spelets RIKTIGA karta med datamine-koordinater.
 *
 * Bilden är spelets egen kartrendering (8192², Palworld 1.0) och varje markör
 * bär spelets egna koordinater – se src/lib/worldmap.ts för proveniensen.
 * Hittat-status kommer ur savens instans-id:n (AppData.progress): effigies
 * och snabbresor prickas av på GUID, alfabossar på spawner-id, tornen på
 * flaggnamn. Lager utan save-koppling (läger, dungeons) visar savens RÄKNARE
 * i chipen men markerar aldrig enskilda som tagna – hellre en lucka än en
 * gissning.
 *
 * Pan/zoom görs imperativt (ref + style.transform), inte via state: en
 * musdragning är hundra händelser i sekunden och ~1000 markörer ska inte
 * diffas om för varje pixel. React-state äger bara lager/val/tooltip.
 * Markörerna motskalas med --iz så de är lika stora på alla zoomnivåer. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n";
import { WORLD_MAP, foundSets, igCoord, mapPct } from "@/lib/worldmap";
import { LEGENDARY_SCHEMATICS } from "@/lib/findData";
import { QUEST_BOSSES } from "@/lib/quests";
import { Section, SpeciesIcon, Tag } from "@/components/ui/PalBits";

const LAYERS_KEY = "pa-map-layers";

interface Marker {
  x: number;
  y: number;
  /** Namn/etikett för tooltipen – spelets ord. */
  name: string;
  sub?: string;
  /** true/false = savens svar; undefined = lagret saknar save-koppling. */
  found?: boolean;
  /** Artindex för porträtt i tooltipen (alfabossar). */
  species?: number;
  lv?: number | null;
}

interface Layer {
  id: string;
  label: MessageKey;
  icon: string;
  markers: Marker[];
  /** Antal hittade enligt saven, eller null när kopplingen saknas. */
  found: number | null;
  defaultOn: boolean;
}

/** Bildens naturliga storlek. Lagret STÅR i den här storleken och zoomas med
 *  skalor ≤ 1 – webbläsaren samplar då alltid den fulla 8192-källan och kartan
 *  är skarp på varje zoomnivå. Den första varianten lät lagret vara
 *  containerstort och skalade UPP det: rastret togs i ~900 px och GPU:n drog
 *  isär det, suddigt precis när man ville läsa (Kens fynd). */
const NATIVE = 8192;

function readLayers(fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(LAYERS_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) return parsed;
  } catch { /* privat läge */ }
  return fallback;
}

export function MapView() {
  const { data, pals } = usePalData();
  const t = useT();

  const found = useMemo(() => foundSets(data.progress), [data.progress]);
  const spByCode = useMemo(
    () => new Map(data.species.map((sp, i) => [sp.code.toLowerCase(), i] as const)),
    [data],
  );
  /** Alfabossens legendariska schematic, uppslagen på artnamnet. */
  const schematicBySource = useMemo(
    () => new Map(LEGENDARY_SCHEMATICS.filter((s) => s.kind === "alpha").map((s) => [s.source, s.name] as const)),
    [],
  );

  const layers = useMemo<Layer[]>(() => {
    const effigies = WORLD_MAP.relics.filter((r) => r.t === "effigy");
    const others = WORLD_MAP.relics.filter((r) => r.t === "relic");
    const count = (rows: { found?: boolean }[]) =>
      found ? rows.filter((r) => r.found).length : null;

    const towers: Marker[] = WORLD_MAP.towers.map((m) => {
      const boss = QUEST_BOSSES.find((b) => b.flag === m.flag);
      return {
        x: m.x, y: m.y, name: m.name,
        sub: boss ? `${boss.name} · Lv ≈${boss.level}` : undefined,
        found: found ? found.towers.has(m.flag) : undefined,
      };
    });
    const travels: Marker[] = WORLD_MAP.travels.map((m) => ({
      x: m.x, y: m.y, name: m.name,
      found: found ? found.travels.has(m.g) : undefined,
    }));
    const eff: Marker[] = effigies.map((m) => ({
      x: m.x, y: m.y, name: "Lifmunk Effigy",
      found: found ? found.relics.has(m.g) : undefined,
    }));
    const rel: Marker[] = others.map((m) => ({
      x: m.x, y: m.y, name: t("map.relicName"),
      found: found ? found.relics.has(m.g) : undefined,
    }));
    const alphas: Marker[] = WORLD_MAP.alphas.map((m) => {
      const si = spByCode.get(m.sp.toLowerCase());
      const spName = si !== undefined ? data.species[si]!.name : m.sp;
      const schematic = schematicBySource.get(spName);
      return {
        x: m.x, y: m.y, name: spName, lv: m.lv, species: si,
        sub: schematic ? t("map.dropsSchematic", { name: schematic }) : undefined,
        found: found ? found.spawners.has(m.spawner) : undefined,
      };
    });
    /* Lägren har inget namn i källan – bara fraktionen och en regionstoken.
       Fraktionen ÄR användbar ("Syndicate Hunter"-lägret ser annorlunda ut än
       ninjornas), regionstoken är en intern nyckel och ritas aldrig. */
    const camps: Marker[] = WORLD_MAP.camps.map((m) => ({
      x: m.x, y: m.y, name: m.faction ?? t("map.campName"),
    }));
    const dungeons: Marker[] = WORLD_MAP.dungeons.map((m) => ({ x: m.x, y: m.y, name: m.name, lv: m.lv }));
    const fruits: Marker[] = WORLD_MAP.fruits.map((m) => ({ x: m.x, y: m.y, name: t("map.fruitName") }));
    const ores: Marker[] = WORLD_MAP.ores.map((m) => ({
      x: m.x, y: m.y,
      name: m.t === "ore" ? "Ore" : m.t === "coal" ? "Coal" : m.t === "sulfur" ? "Sulfur" : "Pure Quartz",
    }));
    /* Tre lager som Hitta redan pekar på: utan dem landar "→ På kartan" från en
       kist-schematic på en karta som inte visar kistan. */
    const oilrigs: Marker[] = WORLD_MAP.oilrigs.map((m) => ({
      x: m.x, y: m.y, name: t("map.oilrigName"), sub: t("map.oilrigSub"),
    }));
    const treasures: Marker[] = WORLD_MAP.treasures.map((m) => ({
      x: m.x, y: m.y, name: t("map.treasureName"),
    }));
    /* Ruinerna bär VAD de ger, inte bara att de finns – det är hela skälet att
       lagret är värt något: 106 fasta platser med en bestämd schematic var. */
    const ruins: Marker[] = WORLD_MAP.ruins.map((m) => ({
      x: m.x, y: m.y, name: m.gives.replace(/ Schematic( \d+)?$/, ""), sub: t("map.ruinSub"),
    }));
    /* Regionerna är spelets egna namn med nivåspann – det som gör "Snow enemy
       camp" begripligt är att man ser vilket område man ska till. */
    const regions: Marker[] = WORLD_MAP.regions.map((m) => ({
      x: m.x, y: m.y, name: m.name,
      lv: m.lo ?? undefined,
      sub: m.lo !== null && m.hi !== null && m.hi !== m.lo ? `Lv ${m.lo}–${m.hi}` : undefined,
    }));

    return [
      { id: "towers", label: "map.l.towers", icon: "tower", markers: towers, found: count(towers), defaultOn: true },
      { id: "travels", label: "map.l.travels", icon: "travel", markers: travels, found: count(travels), defaultOn: true },
      { id: "effigies", label: "map.l.effigies", icon: "effigy", markers: eff, found: count(eff), defaultOn: true },
      { id: "alphas", label: "map.l.alphas", icon: "alpha", markers: alphas, found: count(alphas), defaultOn: true },
      { id: "camps", label: "map.l.camps", icon: "camp", markers: camps, found: null, defaultOn: true },
      { id: "dungeons", label: "map.l.dungeons", icon: "dungeon", markers: dungeons, found: null, defaultOn: false },
      { id: "relics", label: "map.l.relics", icon: "effigy", markers: rel, found: count(rel), defaultOn: false },
      { id: "fruits", label: "map.l.fruits", icon: "", markers: fruits, found: null, defaultOn: false },
      { id: "ores", label: "map.l.ores", icon: "ore", markers: ores, found: null, defaultOn: false },
      { id: "oilrigs", label: "map.l.oilrigs", icon: "", markers: oilrigs, found: null, defaultOn: false },
      { id: "treasures", label: "map.l.treasures", icon: "", markers: treasures, found: null, defaultOn: false },
      { id: "ruins", label: "map.l.ruins", icon: "", markers: ruins, found: null, defaultOn: false },
      { id: "regions", label: "map.l.regions", icon: "", markers: regions, found: null, defaultOn: false },
    ];
  }, [data, t, found, spByCode, schematicBySource]);

  /* Lagervalet överlever sidbyten; valideras mot dagens lager-id:n. */
  const [active, setActive] = useState<ReadonlySet<string>>(
    () => new Set(layers.filter((l) => l.defaultOn).map((l) => l.id)),
  );
  useEffect(() => {
    const ids = new Set(layers.map((l) => l.id));
    setActive(new Set(readLayers(layers.filter((l) => l.defaultOn).map((l) => l.id))
      .filter((id) => ids.has(id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggleLayer = (id: string) => {
    setActive((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(LAYERS_KEY, JSON.stringify([...next])); } catch { /* privat läge */ }
      return next;
    });
  };

  const [onlyMissing, setOnlyMissing] = useState(false);
  const [picked, setPicked] = useState<{ layer: Layer; m: Marker } | null>(null);

  /* --------- pan/zoom, imperativt --------- */
  const frameRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  /** s är ABSOLUT skala mot 8192-lagret: minsta = hela kartan i ramen,
   *  största = 1.0 (en bildpixel per skärmpixel – mer finns inte att visa). */
  const view = useRef({ s: 0, px: 0, py: 0 });

  const fitScale = () => {
    const frame = frameRef.current;
    return frame ? frame.clientWidth / NATIVE : 0.1;
  };

  const apply = () => {
    const el = worldRef.current;
    if (!el) return;
    const { s, px, py } = view.current;
    el.style.transform = `translate(${px}px, ${py}px) scale(${s})`;
    /* Markörerna motskalas – men inte helt: exponenten 0,2 låter dem växa
       försiktigt med zoomen (Kens önskan: "lite större, inte gigantiska").
       Vid full zoom är de ~1,5× utgångsstorleken i stället för konstanta. */
    el.style.setProperty("--iz", String((1 / s) * Math.pow(s / fitScale(), 0.2)));
  };

  /** Håller bilden inom ramen – man ska inte kunna dra bort hela kartan. */
  const clampView = () => {
    const frame = frameRef.current;
    if (!frame) return;
    const w = frame.clientWidth;
    const h = frame.clientHeight;
    const v = view.current;
    v.s = Math.min(1, Math.max(fitScale(), v.s));
    v.px = Math.min(0, Math.max(w - NATIVE * v.s, v.px));
    v.py = Math.min(0, Math.max(h - NATIVE * v.s, v.py));
  };

  const zoomAt = (factor: number, cx: number, cy: number) => {
    const v = view.current;
    const s2 = Math.min(1, Math.max(fitScale(), v.s * factor));
    if (s2 === v.s) return;
    v.px = cx - ((cx - v.px) * s2) / v.s;
    v.py = cy - ((cy - v.py) * s2) / v.s;
    v.s = s2;
    clampView();
    apply();
  };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = frame.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - rect.left, e.clientY - rect.top);
    };
    /* preventDefault kräver passive:false – annars scrollar sidan i stället. */
    frame.addEventListener("wheel", onWheel, { passive: false });

    let drag: { x: number; y: number } | null = null;
    let moved = false;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY };
      moved = false;
      frame.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      drag = { x: e.clientX, y: e.clientY };
      view.current.px += dx;
      view.current.py += dy;
      clampView();
      apply();
    };
    const up = (e: PointerEvent) => {
      drag = null;
      /* Ett klick som var en dragning ska inte öppna en markör. */
      if (moved) e.stopPropagation();
    };
    frame.addEventListener("pointerdown", down);
    frame.addEventListener("pointermove", move);
    frame.addEventListener("pointerup", up);
    /* Startläget sätts först nu – fitScale kräver utmätt layout. */
    view.current = { s: fitScale(), px: 0, py: 0 };
    apply();
    /* Ändrad ramstorlek (fönster/brytpunkt) flyttar minsta skalan. */
    const ro = new ResizeObserver(() => { clampView(); apply(); });
    ro.observe(frame);
    return () => {
      ro.disconnect();
      frame.removeEventListener("wheel", onWheel);
      frame.removeEventListener("pointerdown", down);
      frame.removeEventListener("pointermove", move);
      frame.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomCenter = (factor: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    zoomAt(factor, frame.clientWidth / 2, frame.clientHeight / 2);
  };
  const resetView = () => {
    view.current = { s: fitScale(), px: 0, py: 0 };
    apply();
  };

  const ownedCounters = picked?.m.species !== undefined
    ? pals.filter((p) => p.s === picked.m.species).length
    : 0;

  return (
    <>
      <Section title={t("map.title")} sub={t("map.sub")}>
        {/* Lagerchips: toggle + hittat-räknare i ett. Räknaren finns bara när
            saven har svaret – läger/dungeons visar totalen utan påstående. */}
        <div className="wchips">
          {layers.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`wchip ${active.has(l.id) ? "on" : ""}`}
              aria-pressed={active.has(l.id)}
              onClick={() => toggleLayer(l.id)}
            >
              {l.icon
                ? <img src={`/icons/map/${l.icon}.webp`} alt="" width={15} height={15} />
                : <span className="wdot" aria-hidden />}
              {t(l.label)}
              <b className="num">
                {l.found !== null ? `${l.found}/${l.markers.length}` : l.markers.length}
              </b>
            </button>
          ))}
          <label className="wonly">
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
              disabled={!found}
            />
            {t("map.onlyMissing")}
          </label>
        </div>

        {!found && <div className="hint">{t("map.noProgress")}</div>}

        <div className="wmapwrap">
          <div className="wmap" ref={frameRef}>
            <div className="wlayer" ref={worldRef}>
              <img className="wimg" src="/img/worldmap.webp" alt={t("map.alt")} draggable={false} />
              {layers.filter((l) => active.has(l.id)).map((l) =>
                l.markers.map((m, i) => {
                  if (onlyMissing && m.found) return null;
                  const { left, top } = mapPct(m.x, m.y);
                  const sel = picked?.m === m;
                  return (
                    <button
                      key={`${l.id}${i}`}
                      type="button"
                      className={`wmk ${l.id} ${m.found ? "hit" : ""} ${sel ? "sel" : ""}`}
                      style={{ left: `${left}%`, top: `${top}%` } as CSSProperties}
                      onClick={() => setPicked(sel ? null : { layer: l, m })}
                      aria-label={m.name}
                    >
                      {l.icon
                        ? <img src={`/icons/map/${l.icon}.webp`} alt="" draggable={false} />
                        : <span className="wdot" aria-hidden />}
                    </button>
                  );
                }))}
            </div>
            <div className="wzoom">
              <button type="button" className="ghost sm" onClick={() => zoomCenter(1.4)} aria-label={t("map.zoomIn")}>＋</button>
              <button type="button" className="ghost sm" onClick={() => zoomCenter(0.7)} aria-label={t("map.zoomOut")}>−</button>
              <button type="button" className="ghost sm" onClick={resetView} aria-label={t("map.zoomReset")}>⌂</button>
            </div>

            {picked && (
              <div className="wtip">
                <button type="button" className="pmclose" onClick={() => setPicked(null)} aria-label={t("modal.close")}>✕</button>
                <div className="wtiphd">
                  {picked.m.species !== undefined && (
                    <SpeciesIcon sp={data.species[picked.m.species]!} size={34} radius={9} />
                  )}
                  <b>{picked.m.name}</b>
                  {picked.m.lv != null && <span className="meta">Lv {picked.m.lv}</span>}
                </div>
                <div className="meta num">{igCoord(picked.m.x, picked.m.y)}</div>
                {picked.m.sub && <div className="meta">{picked.m.sub}</div>}
                {picked.m.found !== undefined && (
                  picked.m.found
                    ? <Tag kind="keep">{t("map.foundTag")}</Tag>
                    : <Tag kind="cond">{t("map.notFoundTag")}</Tag>
                )}
                {picked.layer.id === "towers" && (
                  <Link className="fchip" href="/quests">{t("map.toQuests")}</Link>
                )}
                {picked.m.species !== undefined && (
                  <div className="meta">
                    {ownedCounters > 0
                      ? t("map.ownSpecies", { n: ownedCounters })
                      : t("map.ownNone")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="hint">{t("map.dataNote")}</div>
      </Section>

      {found && (
        <Section title={t("map.tallyTitle")} sub={t("map.tallySub")}>
          <div className="mapfound">
            <div className="mtally"><span className="k">{t("map.tally.camps")}</span><span className="v num">{data.progress!.counts.camps}</span></div>
            <div className="mtally"><span className="k">{t("map.tally.dungeons")}</span><span className="v num">{data.progress!.counts.dungeons + data.progress!.counts.fixedDungeons}</span></div>
            <div className="mtally"><span className="k">{t("map.tally.oilrigs")}</span><span className="v num">{data.progress!.counts.oilrigs}</span></div>
            <div className="mtally"><span className="k">{t("map.tally.predators")}</span><span className="v num">{data.progress!.counts.predators}</span></div>
            <div className="mtally"><span className="k">{t("map.tally.treasure")}</span><span className="v num">{data.progress!.counts.treasure}</span></div>
            <div className="mtally"><span className="k">{t("map.tally.relicHeld")}</span><span className="v num">{data.progress!.relicHeld}</span></div>
          </div>
          <div className="hint">{t("map.tallyNote")}</div>
        </Section>
      )}
    </>
  );
}
