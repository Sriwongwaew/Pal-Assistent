"use client";

/* Smart: boxen i Habitat-form – vald pal i ett hero-band överst, hela boxen
   som habitat-brickor under. Sök/filter/sortering ovanför. Base Info (spelets
   1:1-replika) ligger kvar och nås via knappen i heron eller genom att klicka
   på en bricka på smal skärm. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePalData } from "@/context/PalDataContext";
import { BREEDING_PREFS_KEY, parseBreedingPrefs } from "@/lib/breedingPrefs";
import { buildPassivePlan, planRoles, type PlanRole } from "@/lib/passivePlan";
import { useSelectedPal } from "@/context/SelectedPalContext";
import { useT } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n";
import {
  matchesPassives, meetsIvMins, palHaystack, palMatches, searchTerms, type PassiveMode,
} from "@/lib/palSearch";
import { BOX_SORTS, boxComparator, type BoxSort } from "@/lib/boxSort";
import { perfectIvCount } from "@/lib/scoring";
import { IV_LABELS } from "@/lib/ivPlan";
import type { ScoredPal } from "@/lib/types";
import { GameIcon } from "@/components/ui/GameIcon";
import { PalHero, elementColor } from "@/components/ui/PalHero";
import { palLocation } from "@/components/ui/PalIdent";
import { PassiveFilterBody } from "@/components/ui/PassiveFilter";
import { PassiveRow } from "@/components/ui/PassiveRow";

type Filter = "spara" | "kond" | "rainbow" | "guld" | "perf" | "alpha" | "plan";

const FILTERS: [Filter, MessageKey][] = [
  ["spara", "box.filter.keep"], ["kond", "box.filter.condense"],
  ["rainbow", "box.filter.rainbow"], ["guld", "box.filter.gold"], ["perf", "box.filter.perfect"],
  ["alpha", "box.filter.alpha"],
  ["plan", "box.filter.plan"],
];

/* Filtren är kombinerbara och OCH:as ihop – "guldpassiv + perfekt IV" är en
   rimlig fråga, och med ett filter i taget gick den inte att ställa. "Alla" är
   därför inte längre ett eget filter utan tomma mängden: en knapp som nollar. */
const PREDICATES: Record<Filter, (p: ScoredPal) => boolean> = {
  spara: (p) => p.keep,
  kond: (p) => !p.keep,
  rainbow: (p) => p.tiers.includes(5),
  guld: (p) => p.tiers.includes(4),
  // Minst EN 100:a, inte tre – se perfectIvCount. Ordningen nedan lyfter 3 före 1.
  perf: (p) => perfectIvCount(p) > 0,
  alpha: (p) => p.boss || p.lucky,
  /* Planen kan inte avgoras av palen ensam – den beror pa avelsvalen. Filtret
     tillampas darfor separat nedan, dar rollkartan finns. Raden star kvar sa
     tabellen fortsatter tacka varje Filter (typen kraver det). */
  plan: () => true,
};

/* Etiketten per sortering. Ordningen ligger i `BOX_SORTS` (lib) så jämförarna
   och menyn inte kan glida isär. */
const SORT_LABEL: Record<BoxSort, MessageKey> = {
  score: "box.sort.score", iv: "box.sort.iv", combat: "box.sort.combat",
  lvl: "box.sort.level", stars: "box.sort.stars", art: "box.sort.species",
  starsLow: "box.sort.starsLow", ivFloor: "box.sort.ivFloor",
  pv: "box.sort.pv", slot: "box.sort.slot",
};

/* Stegen är de man faktiskt frågar efter: "över 90" är avelströskeln, 100 är
   byggstenen till perfectPlan. Finare steg hade bara gjort listan lång. */
const IV_STEPS = [0, 70, 80, 90, 100] as const;
type IvMins = [number, number, number];

const PAGE = 120;

/* Gränssnittsikoner (inte spelets) ritas som SVG: `GameIcon`/`MaskIcon` är för
   Pocketpairs egna filer, och en lupp hör inte dit. `currentColor` gör att de
   ärver kontrollens ton i alla sju paletterna utan en enda hårdkodad färg. */
const SearchIcon = () => (
  <svg className="ic" viewBox="0 0 16 16" aria-hidden fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" />
  </svg>
);
const FilterIcon = () => (
  <svg className="ic" viewBox="0 0 16 16" aria-hidden fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3.5h12L9.5 8.6v4.2l-3 1.7V8.6z" />
  </svg>
);
const SortIcon = () => (
  <svg className="ic" viewBox="0 0 16 16" aria-hidden fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 3v10M4 13l-2-2.2M4 13l2-2.2M12 13V3M12 3l-2 2.2M12 3l2 2.2" />
  </svg>
);

export function BoxView() {
  const { data, pals, ownedSpecies } = usePalData();
  const { select } = useSelectedPal();
  const t = useT();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<readonly Filter[]>([]);
  const [chosenPv, setChosenPv] = useState<readonly string[]>([]);
  const [pvMode, setPvMode] = useState<PassiveMode>("all");
  const [ivMins, setIvMins] = useState<IvMins>([0, 0, 0]);
  const [sort, setSort] = useState<BoxSort>("score");
  const [asc, setAsc] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [selId, setSelId] = useState<string | null>(null);

  /* ---- Vilka pals hör till avelsplanen? ----
     Kens förslag aug 2026: "får vi en pal som är en del av breeding-chainen
     kanske vi borde ha en guldig border för att markera vilket steg det är".
     Planen bor i Breeding, men den pal man just kläckt tittar man på HÄR, och
     att hålla en fyrastegsled i huvudet medan man bläddrar bland sexhundra
     brickor är precis vad appen ska slippa en ifrån.

     Valen läses ur samma localStorage-nyckel som planeraren sparar dem i, och
     valideras mot dagens data av `parseBreedingPrefs` – ett artindex ur en
     äldre bundle pekar annars rakt in i `data.species` (se breedingPrefs.ts).
     Utan sparade val blir kartan tom och ingen bricka får en kant. */
  const [prefsRaw, setPrefsRaw] = useState<string | null>(null);
  useEffect(() => {
    try { setPrefsRaw(localStorage.getItem(BREEDING_PREFS_KEY)); } catch { /* privat läge */ }
  }, []);
  const planRolesById = useMemo(() => {
    if (prefsRaw === null) return new Map<string, PlanRole>();
    const prefs = parseBreedingPrefs(prefsRaw, data);
    if (prefs.target === null || prefs.wanted.length === 0) return new Map<string, PlanRole>();
    const plan = buildPassivePlan(
      data, pals, ownedSpecies, prefs.wanted, prefs.target,
      { ivGoal: prefs.ivGoal }, prefs.chain, null,
    );
    return planRoles(plan);
  }, [prefsRaw, data, pals, ownedSpecies]);

  /* ETT filterfäste i stället för sju chips + fyra selects i kontrollraden
     (Kens rättning aug 2026: "filterna ser väldigt röriga ut"). Panelen bär
     allt; raden bär sök, sortering och de AKTIVA valen som chips. */
  const [fltOpen, setFltOpen] = useState(false);
  const fltRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!fltOpen) return;
    const close = (e: MouseEvent) => {
      if (fltRef.current && !fltRef.current.contains(e.target as Node)) setFltOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setFltOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [fltOpen]);

  /** Antal bärare per passiv – filtermenyn visar siffran på varje banner. */
  const passiveCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pals) for (const id of p.pv) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [pals]);

  const rows = useMemo(() => {
    const terms = searchTerms(query);
    let out = terms.length
      ? pals.filter((p) => palMatches(palHaystack(data, p), terms))
      : pals;
    for (const f of active) out = out.filter(PREDICATES[f]);
    // "I planen" behover rollkartan och kan inte bo i PREDICATES.
    if (active.includes("plan")) out = out.filter((p) => planRolesById.has(p.id));
    if (chosenPv.length) out = out.filter((p) => matchesPassives(p.pv, chosenPv, pvMode));
    if (ivMins.some((m) => m > 0)) out = out.filter((p) => meetsIvMins(p.iv, ivMins));

    const chosen = boxComparator(sort, data, t.locale);
    /* Riktningen vänds på jämförelsen och inte genom att vända listan efteråt:
       en `reverse()` kastar också om alla lika-fall, så två pals med samma
       poäng skulle byta plats varje gång man klickar. */
    const dir = (a: ScoredPal, b: ScoredPal) => (asc ? -chosen(a, b) : chosen(a, b));

    /* Med perfekt-IV-filtret på är antalet 100:or det man faktiskt sorterar
       efter – tre före två före en – och den valda sorteringen avgör inom varje
       grupp. Utan det drunknar 3/3-palsen bland alla som har en enda 100:a. */
    if (active.includes("perf")) {
      return [...out].sort((a, b) => perfectIvCount(b) - perfectIvCount(a) || dir(a, b));
    }
    return [...out].sort(dir);
  }, [pals, data, query, active, chosenPv, pvMode, ivMins, sort, asc, planRolesById, t.locale]);

  const selected = useMemo(
    () => rows.find((p) => p.id === selId) ?? rows[0] ?? null,
    [rows, selId],
  );

  // Nollställ markering när filtret gör att den valda försvinner
  useEffect(() => {
    if (selId && !rows.some((p) => p.id === selId)) setSelId(null);
  }, [rows, selId]);

  const pick = (p: ScoredPal) => {
    setSelId(p.id);
    // på smala skärmar: öppna modalen istället (högerpanelen är dold)
    if (typeof window !== "undefined" && window.innerWidth < 980) select(p);
  };

  /* Hur många val filterknappen bär – siffran är knappens hela innehåll när
     panelen är stängd, så den måste räkna allt som påverkar listan. */
  const fltCount = active.length + chosenPv.length + ivMins.filter((m) => m > 0).length;

  return (
    <>
      {/* Verktygsraden (omgjord aug 2026, Kens dom "ser väldigt meh ut"): tre
          KONTROLLER i stället för fem lösa piller. Sökfältet bär sin lupp och
          sin nollställare inuti fältet, filtret sin tratt och sin räknare som
          bricka, och sorteringen är ETT reglage där riktningen delar ram med
          väljaren – den låg förut som en ensam ↓-cirkel utan synlig koppling
          till vad den vände. Ingen platta bakom raden: Ken tog bort dem i
          Rollerna, och samma regel gäller här. */}
      <div className="controls boxctl">
        <div className={`ctlfield${query ? " has" : ""}`}>
          <SearchIcon />
          <input
            type="text"
            placeholder={t("box.search")}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
          />
          {query && (
            <button
              type="button"
              className="clr"
              onClick={() => { setQuery(""); setLimit(PAGE); }}
              aria-label={t("box.search.clear")}
            >
              ✕
            </button>
          )}
        </div>
        <div className="fltwrap" ref={fltRef}>
          <button
            type="button"
            className={`ctlbtn fltbtn ${fltCount > 0 ? "on" : ""}`}
            aria-expanded={fltOpen}
            onClick={() => setFltOpen((v) => !v)}
          >
            <FilterIcon />
            {t("box.flt.button")}
            {fltCount > 0 && <b className="cbadge num">{fltCount}</b>}
            <span className="cv" aria-hidden>▾</span>
          </button>
          {fltOpen && (
            <div className="fltpanel">
              <div className="flthd">
                <span className="flgrp">{t("box.flt.quick")}</span>
                {fltCount > 0 && (
                  <button
                    type="button"
                    className="ghost sm"
                    onClick={() => { setActive([]); setChosenPv([]); setIvMins([0, 0, 0]); setLimit(PAGE); }}
                  >
                    {t("box.flt.reset")}
                  </button>
                )}
              </div>
              <div className="fltchips">
                {FILTERS.map(([id, key]) => (
                  <button
                    key={id}
                    type="button"
                    className={`fchip ${active.includes(id) ? "on" : ""}`}
                    aria-pressed={active.includes(id)}
                    onClick={() => {
                      setActive((cur) => cur.includes(id) ? cur.filter((f) => f !== id) : [...cur, id]);
                      setLimit(PAGE);
                    }}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
              <span className="flgrp">{t("box.flt.iv")}</span>
              {/* IV-trösklarna är select och inte fritext: stegen är få och
                  kända, och en siffra man kan stava fel till är sämre än fyra
                  man kan peka på. Etiketterna är spelets statnamn – översätts
                  inte. */}
              <div className="fltiv">
                {/* Egen chevron som i sorteringen: systemets pil var det enda i
                    panelen som inte följde temat. */}
                {IV_LABELS.map((label, i) => (
                  <span key={label} className={(ivMins[i] ?? 0) > 0 ? "ivsel on" : "ivsel"}>
                    <select
                      className="ivmin"
                      value={ivMins[i] ?? 0}
                      aria-label={t("box.iv.aria", { stat: label })}
                      onChange={(e) => {
                        const next = [...ivMins] as IvMins;
                        next[i] = Number(e.target.value);
                        setIvMins(next);
                        setLimit(PAGE);
                      }}
                    >
                      {IV_STEPS.map((n) => (
                        <option key={n} value={n}>
                          {n === 0 ? t("box.iv.off", { stat: label }) : `${label} ≥ ${n}`}
                        </option>
                      ))}
                    </select>
                    <span className="cv" aria-hidden>▾</span>
                  </span>
                ))}
              </div>
              <span className="flgrp">{t("box.flt.passives")}</span>
              <PassiveFilterBody
                passives={data.passives}
                counts={passiveCounts}
                value={chosenPv}
                mode={pvMode}
                onToggle={(id) => {
                  setChosenPv((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
                  setLimit(PAGE);
                }}
                onMode={setPvMode}
                onClear={() => { setChosenPv([]); setLimit(PAGE); }}
              />
            </div>
          )}
        </div>
        {/* Väljare + riktning i EN ram. Riktningen är fortfarande en knapp och
            inte två poster per sortering – annars blir listan tjugo rader lång
            och man får leta efter den man redan har – men nu syns det vad den
            hör ihop med. */}
        <div className="ctlsort">
          <SortIcon />
          {/* Chevronen hör till VÄLJAREN och inte till ramen: väljaren är
              innehållsbred ("Score" är kort, "Stars ↓, level ↑" långt), så en
              chevron fäst i ramens kant hamnade svävande mitt i reglaget. */}
          <span className="sel">
            <select
              value={sort}
              aria-label={t("box.sort.label")}
              onChange={(e) => setSort(e.target.value as BoxSort)}
            >
              {BOX_SORTS.map((id) => (
                <option key={id} value={id}>{t(SORT_LABEL[id])}</option>
              ))}
            </select>
            <span className="cv" aria-hidden>▾</span>
          </span>
          <button
            type="button"
            className="dir"
            onClick={() => setAsc((v) => !v)}
            aria-label={t(asc ? "box.sort.asc" : "box.sort.desc")}
            title={t(asc ? "box.sort.asc" : "box.sort.desc")}
          >
            {asc ? "↑" : "↓"}
          </button>
        </div>
        <span className="ctlhits">{t.plural("box.hits", rows.length)}</span>
      </div>

      {/* De AKTIVA valen som rad under kontrollerna: snabbfilter och IV-trösklar
          som chips med kryss, passiverna som banners – samma idiom som
          planerarens "valda"-rad. Utan raden syns ett aktivt filter bara som en
          siffra i en stängd panel, och listan ser ut att ha tappat pals utan
          orsak. */}
      {fltCount > 0 && (
        <div className="prows chosen pvactive">
          {active.map((id) => (
            <button
              key={id}
              type="button"
              className="fchip on"
              onClick={() => { setActive((cur) => cur.filter((f) => f !== id)); setLimit(PAGE); }}
            >
              {t(FILTERS.find(([f]) => f === id)![1])} ✕
            </button>
          ))}
          {IV_LABELS.map((label, i) => (ivMins[i] ?? 0) > 0 && (
            <button
              key={label}
              type="button"
              className="fchip on"
              onClick={() => {
                const next = [...ivMins] as IvMins;
                next[i] = 0;
                setIvMins(next);
                setLimit(PAGE);
              }}
            >
              {label} ≥ {ivMins[i]} ✕
            </button>
          ))}
          {chosenPv.map((id) => (
            <PassiveRow
              key={id}
              id={id}
              name={data.passives[id]?.n ?? id}
              tier={data.passives[id]?.r ?? 0}
              suffix={
                <button
                  type="button"
                  className="rm"
                  aria-label={t("breed.remove")}
                  onClick={() => setChosenPv((cur) => cur.filter((x) => x !== id))}
                >
                  ✕
                </button>
              }
            />
          ))}
          {chosenPv.length > 0 && (
            <span className="meta">
              {t(pvMode === "all" ? "box.pv.activeAll" : "box.pv.activeAny")}
            </span>
          )}
        </div>
      )}

      {/* Heron säger var palen STÅR, inte bara i vilken behållare (Kens fråga
          aug 2026: "visar vi inte placeringen?"). Uträkningen fanns redan – den
          satt bara i avelsplanens bärarkort, alltså på den sida där man behöver
          den minst: där vet man redan vilken individ man menar, medan Boxen är
          stället man kommer till för att HITTA den bland åttahundra. Samma
          `palLocation`, så låda/rad/ruta aldrig kan säga olika saker på två
          sidor, och `title` bär förbehållet att det är uträknat ur platsen i
          saven. */}
      {selected ? (
        <PalHero
          pal={selected}
          species={data.species[selected.s]!}
          data={data}
          sub={(
            <>
              <span title={t("ident.slotTitle")}>{t.msg(palLocation(selected))}</span>
              {" · "}
              {selected.reasons.map(t.msg).join(" · ") || t("pal.noKeepFlag")}
            </>
          )}
          onOpen={() => select(selected)}
        />
      ) : (
        <div className="panel"><div className="meta">{t("box.noMatch")}</div></div>
      )}

      <div className="boxwrap">
        <div className="boxleft">
          <div className="palgrid">
            {rows.slice(0, limit).map((p) => {
              const sp = data.species[p.s]!;
              const isSel = selected?.id === p.id;
              /* Banners på brickan (artefaktens brickor): filtrerade passiver
                 först, sedan bästa nivån – man ska se det man sökte på. */
              const shownPv = [...p.pv]
                .sort((a, b) =>
                  (chosenPv.includes(b) ? 1 : 0) - (chosenPv.includes(a) ? 1 : 0)
                  || (data.passives[b]?.r ?? 0) - (data.passives[a]?.r ?? 0))
                .slice(0, 2);
              const role = planRolesById.get(p.id) ?? null;
              return (
                <button
                  key={p.id}
                  className={`pcell ${isSel ? "sel" : ""}${role ? " inplan" : ""}`}
                  style={{ "--elc": elementColor(sp) } as CSSProperties}
                  onClick={() => pick(p)}
                  /* Hover-rutan ersätter `title`: den säger allt den gjorde och
                     dessutom passiver, stjärnor, plats i lådan och varför palen
                     sparas. Webbläsarens egen ruta hade legat ovanpå. */
                  data-pal={p.id}
                >
                  <span className="circ">
                    {sp.icon
                      ? <img src={sp.icon} alt={sp.name} />
                      : <span className="fb">{sp.name[0]}</span>}
                    {p.boss && <span className="mk alpha" title={t("pal.alpha")}><GameIcon name="alpha" size={13} /></span>}
                    {p.lucky && <span className="mk lucky" title={t("pal.lucky")}><GameIcon name="lucky" size={12} /></span>}
                    {p.stars > 0 && <span className="mk stars">{p.stars}★</span>}
                    {/* Guldkanten säger ATT palen ingår; brickan säger VAD den
                        gör där. Utan den andra halvan vet man bara att den är
                        med, inte om man ska para den nu eller spara den. */}
                    {role && (
                      <span className="mk plan" title={t("box.plan.title")}>
                        {role.step === null ? t("box.plan.carrier") : t("box.plan.step", { n: role.step })}
                      </span>
                    )}
                  </span>
                  <span className="nm">{p.nick || sp.name}</span>
                  <span className="lv">{t("pal.lv", { n: p.lv })} · {p.iv.join("/")}</span>
                  {shownPv.length > 0 && (
                    <span className="pvz">
                      {shownPv.map((id) => (
                        <PassiveRow
                          key={id}
                          id={id}
                          name={data.passives[id]?.n ?? id}
                          tier={data.passives[id]?.r ?? 0}
                        />
                      ))}
                      {p.pv.length > 2 && (
                        <span className="pvmore">+{p.pv.length - 2}</span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {rows.length > limit && (
            <div className="boxmore">
              <button className="ghost" onClick={() => setLimit((l) => l + 180)}>
                {t("box.more", { n: rows.length - limit })}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
