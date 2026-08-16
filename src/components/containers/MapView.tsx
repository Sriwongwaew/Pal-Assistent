"use client";

/* Smart: Kartan – spelets RIKTIGA kartor med datamine-koordinater.
 *
 * TVÅ KARTOR, inte ett lager till: Världsträdet är en egen spelkarta med en
 * egen rendering och en egen bildram, så dess punkter kan inte ritas på
 * huvudkartans bild (se src/lib/worldmap.ts). Växlingen byter därför BÅDE bild,
 * lageruppsättning och projektion, och nollställer vyn – en behållen pan hade
 * landat utanför den nya bilden. Trädets bild hämtas först när kartan väljs.
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
import { MAP_IMAGE, TREE_MAP, WORLD_MAP, foundSets, igCoord, mapPct, type GameMapId } from "@/lib/worldmap";
import { LEGENDARY_SCHEMATICS } from "@/lib/findData";
import { QUEST_BOSSES } from "@/lib/quests";
import { Section, SpeciesIcon, Tag } from "@/components/ui/PalBits";

const LAYERS_KEY = "pa-map-layers";
const MAP_IDS: GameMapId[] = ["main", "tree"];

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

/* Lagervalet sparas PER KARTA. Kartorna delar flera lager-id (travels,
   effigies …) men trädet har egna (eggs, fishing), och med en gemensam lista
   hade trädets egna sett avstängda ut första gången man öppnade det – de fanns
   ju inte i den sparade mängden. Den gamla platta listan läses fortfarande in
   som huvudkartans val, så ingen får sina lager nollställda av uppdateringen. */
function readLayers(map: GameMapId, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(LAYERS_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return map === "main" && parsed.every((x) => typeof x === "string") ? parsed as string[] : fallback;
    }
    if (parsed && typeof parsed === "object") {
      const got = (parsed as Record<string, unknown>)[map];
      if (Array.isArray(got) && got.every((x) => typeof x === "string")) return got as string[];
    }
  } catch { /* privat läge */ }
  return fallback;
}

function writeLayers(map: GameMapId, ids: string[]) {
  try {
    const raw = localStorage.getItem(LAYERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const base: Record<string, string[]> = Array.isArray(parsed)
      ? { main: parsed as string[] }
      : (parsed && typeof parsed === "object" ? { ...(parsed as Record<string, string[]>) } : {});
    base[map] = ids;
    localStorage.setItem(LAYERS_KEY, JSON.stringify(base));
  } catch { /* privat läge */ }
}

export function MapView() {
  const { data, pals } = usePalData();
  const t = useT();

  const [mapId, setMapId] = useState<GameMapId>("main");
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

  const mainLayers = useMemo<Layer[]>(() => {
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

  /* VÄRLDSTRÄDETS lager. Egen karta, delvis egna sorters platser – och samma
     save-koppling som huvudkartan, för savens GUID:n gäller hela världen.
     Bossarna är fyra, men bara slutbossen går att pricka av: mellanbossarnas
     flaggor finns i saven som WorldTreeMiddleBoss1..3 utan att någon källa
     säger vilken som är vilken, så de bär ingen status alls hellre än en
     gissad. Antalet klarade står på Uppdrag, ur saven. */
  const treeLayers = useMemo<Layer[]>(() => {
    const effigies = TREE_MAP.relics.filter((r) => r.t === "effigy");
    const others = TREE_MAP.relics.filter((r) => r.t === "relic");
    const count = (rows: { found?: boolean }[]) =>
      found ? rows.filter((r) => r.found).length : null;

    const bosses: Marker[] = TREE_MAP.towers.map((m) => ({
      x: m.x, y: m.y, name: m.name,
      sub: m.flag ? undefined : t("map.treeMidBoss"),
      found: m.flag && found ? found.towers.has(m.flag) : undefined,
    }));
    const travels: Marker[] = TREE_MAP.travels.map((m) => ({
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
    const alphas: Marker[] = TREE_MAP.alphas.map((m) => {
      const si = spByCode.get(m.sp.toLowerCase());
      return {
        x: m.x, y: m.y, lv: m.lv, species: si,
        name: si !== undefined ? data.species[si]!.name : m.sp,
        found: found ? found.spawners.has(m.spawner) : undefined,
      };
    });
    const pt = (name: string, sub?: string) => (m: { x: number; y: number }): Marker =>
      ({ x: m.x, y: m.y, name, sub });

    return [
      /* Ingen räknare på bossarna: tre av fyra går inte att pricka av, och
         "0/4" hade påstått att alla fyra följs. Slutbossens status står i
         dess egen ruta, och mellanbossarnas antal på Uppdrag. */
      { id: "towers", label: "map.l.treeBosses", icon: "tower", markers: bosses, found: null, defaultOn: true },
      { id: "travels", label: "map.l.travels", icon: "travel", markers: travels, found: count(travels), defaultOn: true },
      { id: "effigies", label: "map.l.effigies", icon: "effigy", markers: eff, found: count(eff), defaultOn: true },
      { id: "alphas", label: "map.l.alphas", icon: "alpha", markers: alphas, found: count(alphas), defaultOn: true },
      { id: "eggs", label: "map.l.eggs", icon: "", markers: TREE_MAP.eggs.map(pt("World Tree Egg")), found: null, defaultOn: true },
      { id: "chests", label: "map.l.chests", icon: "", markers: TREE_MAP.chests.map(pt(t("map.chestName"))), found: null, defaultOn: true },
      { id: "relics", label: "map.l.relics", icon: "effigy", markers: rel, found: count(rel), defaultOn: false },
      { id: "ores", label: "map.l.paloxite", icon: "ore", markers: TREE_MAP.ores.map(pt("Paloxite")), found: null, defaultOn: false },
      { id: "fishing", label: "map.l.fishing", icon: "", markers: TREE_MAP.fishing.map((m) => ({
        x: m.x, y: m.y, name: m.rare ? t("map.fishingRare") : t("map.fishingName"),
      })), found: null, defaultOn: false },
      { id: "fruits", label: "map.l.fruits", icon: "", markers: TREE_MAP.fruits.map(pt(t("map.fruitName"))), found: null, defaultOn: false },
      { id: "springs", label: "map.l.springs", icon: "", markers: TREE_MAP.springs.map(pt("Teafant Spring")), found: null, defaultOn: false },
      { id: "journals", label: "map.l.journals", icon: "", markers: TREE_MAP.journals.map((m) => ({ x: m.x, y: m.y, name: m.name })), found: null, defaultOn: false },
      { id: "junk", label: "map.l.junk", icon: "", markers: TREE_MAP.junk.map(pt(t("map.junkName"))), found: null, defaultOn: false },
    ];
  }, [data, t, found, spByCode]);

  const layers = mapId === "main" ? mainLayers : treeLayers;

  /* Lagervalet överlever sidbyten; valideras mot dagens lager-id:n. Effekten
     hänger på mapId och läser lagren ur en ref: `layers` byter identitet vid
     varje språk-/dataändring, och som beroende hade den nollställt valet. */
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const [active, setActive] = useState<ReadonlySet<string>>(
    () => new Set(layers.filter((l) => l.defaultOn).map((l) => l.id)),
  );
  useEffect(() => {
    const now = layersRef.current;
    const ids = new Set(now.map((l) => l.id));
    setActive(new Set(readLayers(mapId, now.filter((l) => l.defaultOn).map((l) => l.id))
      .filter((id) => ids.has(id))));
  }, [mapId]);
  const toggleLayer = (id: string) => {
    setActive((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      writeLayers(mapId, [...next]);
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

    /* DRAGNINGEN. Fyra saker här är rättelser av beteenden som fick kartan att
       kännas som något man släpar runt i stället för en yta man panorerar:

       1. Webbläsarens EGEN drag-och-släpp stoppas på `dragstart`, inte på
          pointerdown. Utan den drar man en spökbild av markören medan kartan
          panorerar – just det som ser ut som att man "flyttar en bild".
          Att i stället avbryta pointerdown ligger närmare till hands och är
          fel: Chrome slutar då skicka klicket, och markörerna gick inte längre
          att öppna (uppmätt med riktiga musinmatningar, inte antaget).
          Markeringen tas om hand av `user-select: none` i CSS.
       1b. Pekaren FÅNGAS först när dragningen passerat tröskeln, inte vid
          nedtryckningen. `setPointerCapture` styr om även `click` till
          fångstelementet, så med fångst från första pixeln fick markörknappen
          aldrig sitt klick: rutorna gick inte att öppna alls, och det såg ut
          som att kartan bara ville dras omkring. Fångsten behövs ändå så snart
          man drar – annars tappas dragningen när pekaren lämnar ramen.
       2. Bara primärknappen panorerar. Höger- och mittenklick startade förut
          en dragning som satt kvar tills nästa klick.
       3. `pointercancel` avslutar dragningen. Avbryts pekaren (systemgest,
          fönsterbyte) kom inget `pointerup`, och kartan följde efter musen
          UTAN nedtryckt knapp tills man klickade igen.
       4. Rörelsen mäts från STARTPUNKTEN, inte per händelse. Tröskeln jämförde
          förut varje enskild `pointermove`, så en långsam dragning aldrig
          räknades som rörelse – och klicket öppnade markören man råkade släppa
          över. `stopPropagation` på pointerup hindrar inte heller ett klick;
          det gör en lyssnare i FÅNGSTFAS på click, som ligger nedan. */
    let drag: { x: number; y: number } | null = null;
    let from = { x: 0, y: 0 };
    let moved = false;
    const isControl = (e: PointerEvent) =>
      e.target instanceof Element && e.target.closest(".wzoom, .wtip");
    const noDrag = (e: Event) => e.preventDefault();
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || isControl(e)) return;
      drag = { x: e.clientX, y: e.clientY };
      from = { x: e.clientX, y: e.clientY };
      moved = false;
      frame.classList.add("dragging");
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!moved && Math.abs(e.clientX - from.x) + Math.abs(e.clientY - from.y) > 4) {
        moved = true;
        frame.setPointerCapture(e.pointerId);
      }
      drag = { x: e.clientX, y: e.clientY };
      view.current.px += dx;
      view.current.py += dy;
      clampView();
      apply();
    };
    const end = () => {
      drag = null;
      frame.classList.remove("dragging");
    };
    /* Klicket som avslutade en dragning ska inte öppna markören under fingret.
       Fångstfas + stopPropagation hinner före markörknappens egen hanterare. */
    const clickGuard = (e: MouseEvent) => {
      if (!moved) return;
      moved = false;
      e.stopPropagation();
      e.preventDefault();
    };
    frame.addEventListener("pointerdown", down);
    frame.addEventListener("pointermove", move);
    frame.addEventListener("pointerup", end);
    frame.addEventListener("pointercancel", end);
    frame.addEventListener("click", clickGuard, true);
    frame.addEventListener("dragstart", noDrag);
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
      frame.removeEventListener("pointerup", end);
      frame.removeEventListener("pointercancel", end);
      frame.removeEventListener("click", clickGuard, true);
      frame.removeEventListener("dragstart", noDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Kartbyte nollställer vyn: skalan är densamma men bilderna visar olika
     världar, och en behållen panorering hade landat i trädets tomma hörn. */
  useEffect(() => {
    setPicked(null);
    view.current = { s: fitScale(), px: 0, py: 0 };
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId]);

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
      <Section title={t(mapId === "main" ? "map.title" : "map.name.tree")} sub={t("map.sub")}>
        {/* Kartväljaren. Två spelkartor, inte två lager – därför en egen rad
            ovanför lagerchipen och inte ett chip bland dem. */}
        <div className="wmaps" role="tablist" aria-label={t("map.pickMap")}>
          {MAP_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mapId === id}
              className={`wmapbtn ${mapId === id ? "on" : ""}`}
              onClick={() => setMapId(id)}
            >
              {t(id === "main" ? "map.name.main" : "map.name.tree")}
            </button>
          ))}
        </div>

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
              <img
                className="wimg"
                src={MAP_IMAGE[mapId]}
                alt={t(mapId === "main" ? "map.alt" : "map.altTree")}
                draggable={false}
              />
              {layers.filter((l) => active.has(l.id)).map((l) =>
                l.markers.map((m, i) => {
                  if (onlyMissing && m.found) return null;
                  const { left, top } = mapPct(m.x, m.y, mapId);
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
