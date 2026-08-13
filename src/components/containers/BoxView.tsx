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
import { perfectIvCount } from "@/lib/scoring";
import { IV_LABELS } from "@/lib/ivPlan";
import type { ScoredPal } from "@/lib/types";
import { GameIcon } from "@/components/ui/GameIcon";
import { PalHero, elementColor } from "@/components/ui/PalHero";
import { PassiveFilterBody } from "@/components/ui/PassiveFilter";
import { PassiveRow } from "@/components/ui/PassiveRow";

type Filter = "spara" | "kond" | "rainbow" | "guld" | "perf" | "alpha" | "plan";
type Sort = "score" | "iv" | "combat" | "lvl" | "stars" | "art";

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

const SORTS: [Sort, MessageKey][] = [
  ["score", "box.sort.score"], ["iv", "box.sort.iv"], ["combat", "box.sort.combat"],
  ["lvl", "box.sort.level"], ["stars", "box.sort.stars"], ["art", "box.sort.species"],
];

/* Stegen är de man faktiskt frågar efter: "över 90" är avelströskeln, 100 är
   byggstenen till perfectPlan. Finare steg hade bara gjort listan lång. */
const IV_STEPS = [0, 70, 80, 90, 100] as const;
type IvMins = [number, number, number];

const PAGE = 120;

export function BoxView() {
  const { data, pals, ownedSpecies } = usePalData();
  const { select } = useSelectedPal();
  const t = useT();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<readonly Filter[]>([]);
  const [chosenPv, setChosenPv] = useState<readonly string[]>([]);
  const [pvMode, setPvMode] = useState<PassiveMode>("all");
  const [ivMins, setIvMins] = useState<IvMins>([0, 0, 0]);
  const [sort, setSort] = useState<Sort>("score");
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

    const comparators: Record<Sort, (a: ScoredPal, b: ScoredPal) => number> = {
      score: (a, b) => b.score - a.score,
      iv: (a, b) => b.ivSum - a.ivSum,
      combat: (a, b) => b.combat - a.combat,
      lvl: (a, b) => b.lv - a.lv,
      /* Kondenseringsstjärnorna. Lika många stjärnor bryts på poäng och inte på
         inläsningsordningen: fyra 0★-pals av samma art ska ligga i samma ordning
         som annars, annars ser listan slumpad ut inom varje stjärngrupp. */
      stars: (a, b) => b.stars - a.stars || b.score - a.score,
      // Artnamnen är spelets egna (engelska), men sorteringen ska ändå följa
      // läsarens språk – annars hamnar Ä och Ö fel för den som läser svenska.
      art: (a, b) =>
        data.species[a.s]!.name.localeCompare(data.species[b.s]!.name, t.locale) || b.score - a.score,
    };
    const chosen = comparators[sort];
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
      <div className="controls">
        <input
          type="text"
          placeholder={t("box.search")}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
        />
        <div className="fltwrap" ref={fltRef}>
          <button
            type="button"
            className={`fchip fltbtn ${fltCount > 0 ? "on" : ""}`}
            aria-expanded={fltOpen}
            onClick={() => setFltOpen((v) => !v)}
          >
            ⚲ {fltCount > 0 ? t("box.flt.buttonN", { n: fltCount }) : t("box.flt.button")} ▾
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
                {IV_LABELS.map((label, i) => (
                  <select
                    key={label}
                    className={(ivMins[i] ?? 0) > 0 ? "ivmin on" : "ivmin"}
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
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          {SORTS.map(([id, key]) => (
            <option key={id} value={id}>{t(key)}</option>
          ))}
        </select>
        {/* Riktningen är egen knapp och inte två poster per sortering: annars
            blir listan tio rader lång och man får leta efter den man redan har. */}
        <button
          className="fchip dir"
          onClick={() => setAsc((v) => !v)}
          aria-label={t(asc ? "box.sort.asc" : "box.sort.desc")}
          title={t(asc ? "box.sort.asc" : "box.sort.desc")}
        >
          {asc ? "↑" : "↓"}
        </button>
        <span className="meta">{t.plural("box.hits", rows.length)}</span>
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

      {selected ? (
        <PalHero
          pal={selected}
          species={data.species[selected.s]!}
          data={data}
          sub={<>{selected.c} · {selected.reasons.map(t.msg).join(" · ") || t("pal.noKeepFlag")}</>}
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
                  title={t("pal.cellTitle", { name: sp.name, lv: p.lv, iv: p.iv.join("/") })}
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
