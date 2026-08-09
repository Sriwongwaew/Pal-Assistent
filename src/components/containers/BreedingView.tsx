"use client";

/* Smart: breeding-planeraren – mål, bas, önskade passiver → plan med odds. */
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import {
  bestParentPair, buildTree, childrenOf, eggsText, exactOdds, isReachable,
  oddsText, pairQuality, RANDOM_EXTRA_ODDS, solveChain,
} from "@/lib/breeding";
import type { IvGoal, ParentPrefs } from "@/lib/breeding";
import { buildPassivePlan } from "@/lib/passivePlan";
import type { PassivePlan } from "@/lib/passivePlan";
import { suggestShortcuts } from "@/lib/shortcuts";
import {
  IV_LABELS, ivEggsText, ivOddsText, planPerfectIv,
} from "@/lib/ivPlan";
import {
  describeState, findIvDonors, planPerfectLine, type PlanParent,
} from "@/lib/perfectPlan";
import { PURPOSES, recommendPassives, recommendWorkSpecies, type PurposeId } from "@/lib/purpose";
import {
  BREEDING_PREFS_KEY, emptyBreedingPrefs, hasBreedingPrefs, MAX_WANTED,
  parseBreedingPrefs, serializeBreedingPrefs, type BreedingPrefs,
} from "@/lib/breedingPrefs";
import { planBreedSetup, spanText, CAP_FREE, eggSeconds } from "@/lib/breedRate";
import { implantAdvice, ownedImplants, ownsImplant } from "@/lib/implants";
import type { AppData, BreedTree, ScoredPal, WorkType } from "@/lib/types";
import { AltRouteBlock } from "@/components/ui/AltRouteBlock";
import { OddsBadge, OkBox, SpeciesMini, StepCard, WarnBox } from "@/components/ui/BreedBits";
import { BreedSetupPanel } from "@/components/ui/BreedSetup";
import { GoalCard } from "@/components/ui/GoalCard";
import { ImplantStash } from "@/components/ui/ImplantStash";
import { ManualPairPanel } from "@/components/ui/ManualPairPanel";
import { planManualPair, type ManualParent } from "@/lib/manualPair";
import { PalPicker } from "@/components/ui/PalPicker";
import { PassivePicker } from "@/components/ui/PassivePicker";
import { PurposePicker } from "@/components/ui/PurposePicker";
import { PassiveChips, PassiveNames, PassiveRow } from "@/components/ui/PassiveRow";
import { DeckNo, ElementIcons, Section, SpeciesIcon, Tag } from "@/components/ui/PalBits";
import { PalIdent } from "@/components/ui/PalIdent";
import { Shortcuts } from "@/components/ui/Shortcuts";

const palShort = (p: ScoredPal, name: string) =>
  `${name} ${p.g === "M" ? "♂" : p.g === "F" ? "♀" : ""} · Lv ${p.lv} · IV ${p.iv.join("/")}`;

/* localStorage-anropen bor här och inte i `lib/` – där är allt rent och
   testbart. Tolkningen (som kan gå fel) ligger kvar i lib. try/catch för att
   privat läge kastar på både läsning och skrivning, precis som i ThemeControls. */
function readPrefs(data: AppData): BreedingPrefs {
  try {
    return parseBreedingPrefs(localStorage.getItem(BREEDING_PREFS_KEY), data);
  } catch {
    return emptyBreedingPrefs();
  }
}

function writePrefs(prefs: BreedingPrefs): void {
  try {
    if (hasBreedingPrefs(prefs)) {
      localStorage.setItem(BREEDING_PREFS_KEY, serializeBreedingPrefs(prefs));
    } else {
      // Inget valt = inget att komma ihåg; låt inte en tom post ligga kvar.
      localStorage.removeItem(BREEDING_PREFS_KEY);
    }
  } catch { /* privat läge – strunt samma */ }
}

/**
 * Planens odds är "minst de önskade". Frågan man faktiskt ställer sig vid
 * kläckaren är "exakt de önskade", och den är alltid lägre: spelet slår ett
 * andra tärningsslag som lägger till helt slumpade passiver i 35 % av alla ägg.
 * Utan den här noten ser skillnaden ut som otur i stället för som en regel.
 */
function ExactNote({ plan }: { plan: PassivePlan }) {
  const t = useT();
  const rich = useRichT();
  const steps = plan.speciesPhase;
  const last = steps && steps.length > 0 ? steps[steps.length - 1]! : null;
  if (!last) return null;
  const k = plan.usable.length;
  if (k === 0) return null;

  const exact = exactOdds(k, last.pool);
  // Med fyra önskade finns ingen ledig plats kvar, så inget kan läggas till.
  const noRoom = k >= 4;

  return (
    <div className="hint">
      {rich("exact.lead", { least: <b>{t("exact.least")}</b> })}{" "}
      {noRoom
        ? rich("exact.noRoom", {
          exact: <b>{t("exact.exact")}</b>, least: <b>{t("exact.least")}</b>,
        })
        : rich("exact.tradeoff", {
          exact: <b>{t("exact.exact")}</b>,
          odds: <b>{t("breed.perEgg", { odds: oddsText(exact) })}</b>,
          eggs: eggsText(exact, t.locale),
          pct: Math.round(RANDOM_EXTRA_ODDS * 100),
        })}
    </div>
  );
}

export function BreedingView() {
  const { data, pals, ownedSpecies, bestOf, freeSolve } = usePalData();
  const t = useT();
  const rich = useRichT();
  const params = useSearchParams();
  const router = useRouter();
  const initialTarget = useMemo(() => {
    const raw = params.get("target");
    const idx = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isInteger(idx) && idx >= 0 && idx < data.species.length ? idx : null;
  }, [params, data]);

  /** `?wanted=id,id` – "Bäst för…" skickar hit de passiver en pal saknar. */
  const initialWanted = useMemo(() => {
    const raw = params.get("wanted");
    if (!raw) return [];
    return raw.split(",").filter((id) => id in data.passives).slice(0, MAX_WANTED);
  }, [params, data]);

  /* Sparade val läses **en gång**, vid montering. Vyn renderas aldrig på
     servern (PalDataProvider visar "Laddar boxen…" tills fetchen är klar i
     webbläsaren), så det finns ingen server-rendering att avvika från och
     localStorage går att läsa rakt av i initieraren.
     Djuplänken vinner över det sparade: kommer man hit via "Bäst för…" är det
     den palen och de passiverna man menar, inte förra sessionens. */
  const [saved] = useState(() => readPrefs(data));

  const [target, setTarget] = useState<number | null>(initialTarget ?? saved.target);
  const [base, setBase] = useState<number | null>(saved.base);
  const [wanted, setWanted] = useState<string[]>(
    initialWanted.length ? initialWanted : saved.wanted,
  );
  const [ivGoal, setIvGoal] = useState<IvGoal>(saved.ivGoal);
  /** Vad palen ska användas till – styr vilka passiver som föreslås. */
  const [purpose, setPurpose] = useState<PurposeId | null>(saved.purpose);
  /** Syssla inom "Bas & arbete" – ger dessutom artförslag. */
  const [work, setWork] = useState<WorkType | null>(saved.work);

  /** …och skrivs tillbaka så fort något ändras. */
  const [useImplants, setUseImplants] = useState<boolean>(saved.useImplants);
  /* Manuellt läge sparas INTE i `pa-breeding`. Det är en fråga man ställer
     ("vad kostar just de här två?"), inte ett mål man arbetar mot över flera
     sessioner – och en sparad förälder skulle dessutom peka på ett pal-id som kan
     ha matats bort, alltså samma valideringsproblem som art-index. */
  const [manualA, setManualA] = useState<ManualParent | null>(null);
  const [manualB, setManualB] = useState<ManualParent | null>(null);

  const current = useMemo<BreedingPrefs>(
    () => ({ target, base, wanted, ivGoal, purpose, work, useImplants }),
    [target, base, wanted, ivGoal, purpose, work, useImplants],
  );

  /**
   * Vad planen ska **avla** – inte vad du vill ha.
   *
   * En passiv du opererar in hamnar aldrig i arvspoolen, så den ska inte ligga
   * där när oddsen räknas. Målbilden och väljaren visar fortfarande hela `wanted`:
   * målet är oförändrat, det är bara vägen dit som är kortare. Utan den här
   * skillnaden sa rutan "planen krymper från 4 till 3" medan planen under
   * fortsatte räkna fyra – rådet var sant men verkningslöst.
   */
  const planWanted = useMemo(
    () => (useImplants ? wanted.filter((id) => !ownsImplant(data, id)) : wanted),
    [useImplants, wanted, data],
  );
  /** Lyfta ur planen, alltså de som ska opereras in i stället. */
  const skipped = useMemo(
    () => wanted.filter((id) => !planWanted.includes(id)),
    [wanted, planWanted],
  );
  useEffect(() => { writePrefs(current); }, [current]);

  const clearAll = () => {
    setTarget(null);
    setBase(null);
    setWanted([]);
    setIvGoal("fast");
    setPurpose(null);
    setWork(null);
    // Utan det här ligger `?target=…` kvar i adressfältet och sätter tillbaka
    // målet nästa gång vyn monteras – rensningen skulle se ut att ångra sig.
    if (params.toString()) router.replace("/breeding", { scroll: false });
  };

  /* Föräldrar väljs alltid renast först; IV-målet avgör bara vid lika renhet.
     `planWanted`, inte `wanted`: en passiv som ska opereras in är skräp i poolen
     som alla andra, så en förälder som bär den ska inte belönas för det. */
  const prefs = useMemo<ParentPrefs>(
    () => ({ ivGoal, wanted: new Set(planWanted) }),
    [ivGoal, planWanted],
  );

  const uniqueChildren = useMemo(() => new Set(data.uniques.map((u) => u[2])), [data]);
  /** Antal pals i boxen per passiv – visas på varje banner i väljaren. */
  const passiveCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pals) for (const id of p.pv) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [pals]);

  const plan = useMemo(
    () => (planWanted.length
      ? buildPassivePlan(data, pals, ownedSpecies, planWanted, target, prefs)
      : null),
    [data, pals, ownedSpecies, planWanted, target, prefs],
  );

  /** Förslagen räknas ur passivernas effekter och anpassas efter målets element. */
  const rec = useMemo(() => {
    const def = PURPOSES.find((p) => p.id === purpose);
    if (!def) return { picks: [], missing: [] };
    return recommendPassives(data, passiveCounts, {
      purpose: def,
      target: target !== null ? data.species[target]! : null,
      work,
      locale: t.locale,
    });
  }, [data, passiveCounts, purpose, target, work, t.locale]);

  /** Vilken art ska man avla fram för den valda sysslan? */
  const speciesRecs = useMemo(
    () => (work ? recommendWorkSpecies(data, work, freeSolve, ownedSpecies) : []),
    [data, work, freeSolve, ownedSpecies],
  );

  const togglePassive = (id: string) =>
    setWanted((w) => (
      w.includes(id) ? w.filter((x) => x !== id) : w.length >= MAX_WANTED ? w : [...w, id]
    ));

  const sp = (i: number) => data.species[i]!;
  /** Bärarna planen faktiskt använder, en post per individ. */
  const carrierCards = useMemo(() => {
    if (!plan) return [];
    const byPal = new Map<string, { pal: ScoredPal; gives: string[] }>();
    for (const c of plan.carrierInfo) {
      if (!c.chosen) continue;
      const g = byPal.get(c.chosen.id) ?? { pal: c.chosen, gives: [] };
      g.gives.push(c.passiveId);
      byPal.set(c.chosen.id, g);
    }
    return [...byPal.values()].sort((a, b) => b.gives.length - a.gives.length);
  }, [plan]);

  const pName = (id: string) => data.passives[id]?.n ?? id;
  const pTier = (id: string) => data.passives[id]?.r ?? 0;
  /** Passiver som banners i stället för uppräkning i löptext. */
  const Chips = ({ ids, label }: { ids: readonly string[]; label?: React.ReactNode }) => (
    <PassiveChips ids={ids} nameOf={pName} tierOf={pTier} label={label} />
  );
  /** "Det är DEN HÄR palen" – hela passivlistan, så den går att matcha i spelet. */
  const Ident = ({ pal, label }: { pal: ScoredPal; label?: string }) => (
    <PalIdent pal={pal} species={sp(pal.s)} wanted={wanted}
      nameOf={pName} tierOf={pTier} label={label} />
  );

  /**
   * Pal Surgery Table: den billigaste optimeringen i hela planeraren, och den
   * enda som inte handlar om vem man parar med. En önskad passiv som opereras in
   * i efterhand ligger aldrig i arvspoolen, och `inheritOdds` är brutalt konvex
   * där – 4 önskade är 10 % per ägg, 3 är 30 %.
   *
   * Rutan ligger FÖRE stegen, eftersom den ändrar vad man planerar för och inte
   * bara hur man läser planen. Den bygger på `wanted`, inte på `plan.usable`:
   * en operabel passiv behöver ingen bärare i boxen alls, så den ska nämnas även
   * när planen säger att den saknas.
   *
   * Den säger också ifrån när INGET går att operera in. Det är inte brus – utan
   * beskedet är antagandet "det ordnar jag med bordet sen" gratis att göra, och
   * fel: allt med rank 4 måste avlas.
   */
  /**
   * Vad det manuella paret ger. Räknas på `planWanted`, inte `wanted`: en passiv
   * du opererar in efteråt ska inte behöva finnas i paret.
   */
  const ManualResult = () => {
    if (!manualA || !manualB || manualA.s < 0 || manualB.s < 0) return null;
    /* `rich` och `t` kommer ur closuren – delvyerna definieras om vid varje
       render, så en egen hook här hade brutit hook-ordningen. */
    const p = planManualPair(data, manualA, manualB, planWanted);
    const spName = (i: number) => sp(i).name;

    if (p.blocks.length > 0) {
      return (
        <WarnBox>
          {p.blocks.map((b, i) => (
            <div key={i}>
              {b.kind === "noChild" && (
                <>
                  <b>{t("manres.noChild")}</b>{" "}
                  {t("manres.noChildBody", { a: spName(manualA.s), b: spName(manualB.s) })}
                </>
              )}
              {b.kind === "sameGender" && (
                <>
                  <b>{t(b.g === "M" ? "manres.bothMale" : "manres.bothFemale")}</b>{" "}
                  {rich("manres.sameGenderBody", { unknown: <i>{t("manual.unknownGender")}</i> })}
                </>
              )}
              {b.kind === "missing" && (
                <>
                  <b>{t("manres.missing")}</b>{" "}
                  <Chips ids={b.ids} label={t("manres.neitherCarries")} />
                  {rich("manres.missingBody", { inherit: <b>{t("manres.inherit")}</b> })}
                </>
              )}
            </div>
          ))}
        </WarnBox>
      );
    }

    return (
      <>
        <OkBox>
          <b>
            {spName(manualA.s)} × {spName(manualB.s)}
            {p.child !== null && <> → {spName(p.child)}</>}
          </b>{" "}
          {" "}{rich("manres.gives", {
            n: planWanted.length,
            eggs: <b>≈{Math.round(p.eggs)} {t("manres.eggsWord")}</b>,
          })} · {eggTime(p.eggs)}
          <div className="hint">
            {rich("manres.pool", { n: <b>{p.pool.length}</b> })}
            {p.junk.length > 0 && rich("manres.poolJunk", { n: <b>{p.junk.length}</b> })}.
            {p.direct && p.steps.length > 1 && (
              <>
                {" "}{rich("manres.direct", {
                  pct: <b>{Math.round(1 / p.direct.odds * 100) / 100} %</b>,
                  eggs: Math.round(p.direct.eggs),
                })}
              </>
            )}
            {p.steps.length === 1 && <> {t("manres.oneStep")}</>}
          </div>
        </OkBox>
        {p.steps.map((s, i) => (
          <StepCard
            key={i}
            num={i + 1}
            hint={
              <>
                {rich("manres.stepHint", {
                  pool: <b>{s.pool.length}</b>, eggs: Math.round(s.stepEggs),
                })}
                {s.genderEggs > 0 && t("manres.stepGender", { n: Math.round(s.genderEggs) })}
                {i < p.steps.length - 1
                  ? <> · {rich("manres.stepClean", { clean: <b>{t("manres.cleanWord")}</b> })}</>
                  : <> · {t("manres.stepLast")}</>}
              </>
            }
          >
            <Chips
              ids={s.gives}
              label={s.fromA === null
                ? t("manres.fromPair")
                : t("manres.fromSteps", { a: s.fromA + 1, b: (s.fromB ?? 0) + 1 })}
            />
            <OddsBadge odds={oddsText(s.odds)} eggs={eggsText(s.odds, t.locale)} />
          </StepCard>
        ))}
      </>
    );
  };

  const ImplantBox = () => {
    /* En enda vald passiv räknas också, och är det starkaste fallet av alla:
       äger du implantatet behöver du inte avla någonting. Gränsen låg först på
       två, vilket tystade just det. */
    if (!wanted.length) return null;
    const a = implantAdvice(wanted, ownedImplants(data));
    if (!a.owned.length && !a.available.length) return null;

    const times = (n: number) => `${n.toFixed(1).replace(".", ",")}×`;
    const left = wanted.length - a.owned.length;
    /* Ett konkret namn slår "en av dem": rådet ska gå att följa utan att man
       räknar om det till sin egen situation. Ägt går före modul – det är det man
       kan göra i dag. */
    const example = a.owned[0] ?? a.available[0];
    const exampleName = example ? pName(example) : "";

    return (
      <div className="okbox">
        {/* Kryssrutan styr PLANEN, inte texten. Utan den var rådet sant men
            verkningslöst: rutan sa "planen krymper till 3" medan stegen under
            fortsatte räkna fyra passiver i poolen. Av-läget finns för att man
            kanske vill spara implantatet till en annan pal. */}
        {a.owned.length > 0 && (
          <label className="impuse">
            <input
              type="checkbox"
              checked={useImplants}
              onChange={(e) => setUseImplants(e.target.checked)}
            />
            <span>
              <b>{t("imp.use")}</b>{" "}
              {t.plural("imp.useBody", a.owned.length)}
              {skipped.length > 0
                && t("imp.useCount", { n: planWanted.length, total: wanted.length })}
            </span>
          </label>
        )}
        <b>
          {t("imp.notPerfect")}
          {a.owned.length > 0 && t.plural("imp.youHaveFor", a.owned.length)}.
        </b>{" "}
        {a.owned.length > 0 && <Chips ids={a.owned} label={t("imp.inStash")} />}
        {a.available.length > 0 && (
          <Chips
            ids={a.available}
            label={a.owned.length > 0 ? t("imp.moduleNotOwned") : t("imp.moduleExists")}
          />
        )}
        {a.unknown.length > 0 && <Chips ids={a.unknown} label={t("imp.mustBreed")} />}
        {/* De tre fallen man faktiskt står i när ungen kläckts, på var sin rad.
            Rådet löd tidigare bara "avla färre", och stod som ett stycke – men
            det man behöver veta står vid kläckaren och är en fråga i taget: är
            den här ungen färdig, eller ska jag avla vidare? */}
        <div className="hint impcases">
          <div>
            <b>{t("imp.caseMissing", { name: exampleName })}</b>{" "}
            {rich("imp.caseMissingBody", {
              ok: <b>{t("imp.doneAnyway")}</b>, finished: <b>{t("imp.finished")}</b>,
            })}
          </div>
          <div>
            <b>{t("imp.caseJunk")}</b>{" "}
            {rich("imp.caseJunkBody", { pct: <b>35 %</b> })}
          </div>
          <div>
            <b>{t("imp.casePartial")}</b>{" "}
            <b>{t("imp.casePartialKeep")}</b>{t("imp.casePartialBody")}
          </div>
          {a.owned.length > 0 && (
            <div>
              <b>{t("imp.counted")}</b>{" "}
              {t(useImplants ? "imp.countedOn" : "imp.countedOff")}{" "}
              {rich("imp.countedBody", {
                left, total: wanted.length,
                from: <b>{Math.round(a.oddsAll * 100)} %</b>,
                to: <b>{Math.round(a.oddsOwned * 100)} %</b>,
                saving: <b>{t("imp.fewerEggs", { factor: times(a.saving) })}</b>,
              })}
              {a.savingBest > a.saving + 0.05 && (
                <>
                  {" "}{t.plural("imp.alsoModules", a.available.length)}{" "}
                  <b>{t("imp.fewerEggs", { factor: times(a.savingBest) })}</b>{" "}
                  ({t("breed.perEgg", { odds: `${Math.round(a.oddsBest * 100)} %` })}).
                </>
              )}
            </div>
          )}
          <div className="fine">
            {rich("imp.fine", { possible: <i>{t("imp.possible")}</i> })}
          </div>
        </div>
      </div>
    );
  };

  /* ---- tunga beräkningar ligger HÄR, inte i delvyerna ----
     Delvyerna nedan definieras om vid varje render, så React ser en ny
     komponenttyp och monterar om dem – all useMemo där inne är därför död och
     räknades om vid varje tangenttryck. `directCombos` ensam är 215² artpar med
     en sortering som skannar hela boxen. Uppmätt: 33 ms per tangenttryck före,
     och det är den enda anledningen till att de här hooksen bor i toppen. */
  const mine = useMemo(
    () => (target === null ? [] : pals.filter((p) => p.s === target)),
    [pals, target],
  );
  const iv = useMemo(
    () => (target === null ? null : planPerfectIv(mine)),
    [mine, target],
  );
  const perfect = useMemo(
    () => (target === null || ivGoal !== "perfect" ? null : planPerfectLine(mine, wanted)),
    [mine, wanted, target, ivGoal],
  );
  /** Har någon i boxen redan hela målbilden? Då är planen nedan onödig. */
  const goalDone = useMemo(() => {
    if (target === null || (!wanted.length && ivGoal !== "perfect")) return null;
    const hit = mine.find((p) => wanted.every((w) => p.pv.includes(w))
      && (ivGoal !== "perfect" || p.iv.every((v) => v >= 100)));
    return hit ? palShort(hit, data.species[hit.s]!.name) : null;
  }, [mine, wanted, ivGoal, target, data]);
  const donors = useMemo(
    () => (target !== null && iv && iv.gaps.length ? findIvDonors(data, pals, target, iv.gaps) : []),
    [iv, target, data, pals],
  );
  const directCombos = useMemo(() => {
    if (target === null) return [];
    const own = [...ownedSpecies];
    const out: [number, number, string | undefined][] = [];
    for (let x = 0; x < own.length; x++) {
      for (let y = x; y < own.length; y++) {
        for (const ch of childrenOf(data, own[x]!, own[y]!)) {
          if (ch.c === target) out.push([own[x]!, own[y]!, ch.note]);
        }
      }
    }
    // Rangordna kombos som föräldraparen rangordnas: renhet, sedan IV-målet.
    const rank = ([a, b]: [number, number, string | undefined]) => {
      const q = bestParentPair(pals, bestOf, a, b, prefs);
      const k = pairQuality(q.pa, q.pb, prefs);
      return { broken: q.warn ? 1 : 0, ...k };
    };
    return out.sort((p, q) => {
      const x = rank(p);
      const y = rank(q);
      return x.broken - y.broken || x.junk - y.junk || y.iv - x.iv || y.score - x.score;
    });
  }, [target, ownedSpecies, data, pals, bestOf, prefs]);
  const chain = useMemo(
    () => (target !== null && base !== null && base !== target
      ? solveChain(data, ownedSpecies, base, target, 10)
      : null),
    [base, target, data, ownedSpecies],
  );
  const tree = useMemo<BreedTree | null>(() => {
    if (target === null || base !== null) return null;
    if (!isReachable(freeSolve.cost, target) || freeSolve.cost[target] === 0) return null;
    return buildTree(target, freeSolve.from, ownedSpecies);
  }, [base, target, freeSolve, ownedSpecies]);

  /* Avelstakten hänger inte på planen – den gäller varje ägg oavsett mål – men
     den är det som översätter "~545 ägg" till en kväll eller en vecka. */
  const setup = useMemo(() => planBreedSetup(data, pals), [data, pals]);
  /* Ägg → tid, i den takt boxen faktiskt har och i den den skulle kunna ha.
     Jämförelsetaket är CAP_FREE, inte spelets absoluta: `eggs` är räknat med
     RENA föräldrar, och det absoluta taket förutsätter Philanthropist på båda,
     alltså en skräp-passiv i arvspoolen. Att gånga en ren äggsiffra med en
     smutsig takt hade lovat en kväll ingen kan få. */
  const eggTime = (eggs: number) => (
    <>
      ≈{spanText(eggs * setup.seconds)}
      {setup.rate < CAP_FREE && (
        <span className="bsdim"> · ≈{spanText(eggs * eggSeconds(CAP_FREE))} med maxad avelsbas</span>
      )}
    </>
  );

  return (
    <>
      <div className="planhd">
        <span className="meta">
          {t("breed.savedHint")}
        </span>
        <button
          type="button"
          className="ghost sm"
          onClick={clearAll}
          disabled={!hasBreedingPrefs(current)}
        >
          {t("breed.clearAll")}
        </button>
      </div>

      {/* Förrådet ligger HÖGST UPP, inte inne i väljaren. Rutan under
          passiv-väljaren visas bara när en av de önskade passiverna råkar vara
          operabel – har man inte valt just den finns informationen ingenstans,
          och frågan "vad har jag för implantat?" gick inte att besvara i appen.
          Den här panelen är den platsen, och den syns oavsett vad man valt. */}
      <ImplantStash
        implants={data.implants ?? null}
        passives={data.passives}
        chosen={wanted}
        full={wanted.length >= MAX_WANTED}
        onPick={togglePassive}
      />

      <ManualPairPanel
        species={data.species}
        owned={ownedSpecies}
        passives={data.passives}
        pals={pals}
        counts={passiveCounts}
        implants={data.implants ?? null}
        a={manualA}
        b={manualB}
        onChange={(slot, parent) => (slot === 0 ? setManualA(parent) : setManualB(parent))}
      >
        {planWanted.length === 0 ? (
          <div className="hint">{t("breed.pickWantedFirst")}</div>
        ) : (
          <ManualResult />
        )}
      </ManualPairPanel>

      <BreedSetupPanel
        setup={setup}
        wanted={wanted.length}
        speciesOf={sp}
        passiveName={pName}
        passiveTier={pTier}
        onPickTarget={setTarget}
      />

      <div className="pickrow">
        <div className="pickcol">
          <Section
            title={<>{t("breed.targetTitle")} {target !== null && <span className="picked">{sp(target).name}</span>}</>}
            sub={t("breed.targetSub")}
          >
            <PalPicker
              species={data.species}
              owned={ownedSpecies}
              value={target}
              onChange={setTarget}
            />
            <details className="baseblock">
              <summary>
                {t("breed.baseFrom")} <b>{base === null ? t("breed.freeMode") : sp(base).name}</b>
              </summary>
              <div className="sub" style={{ margin: "8px 0 6px" }}>
                {t("breed.baseHint")}
              </div>
              <PalPicker
                species={data.species}
                owned={ownedSpecies}
                value={base}
                onChange={setBase}
                ownedOnly
                noneLabel={t("breed.freeModeCap")}
              />
            </details>

            <div className="ivgoal">
              <span className="meta">{t("breed.ivGoalLabel")}</span>
              <button
                type="button"
                className={`fchip ${ivGoal === "fast" ? "on" : ""}`}
                onClick={() => setIvGoal("fast")}
              >
                {t("breed.ivFast")}
              </button>
              <button
                type="button"
                className={`fchip ${ivGoal === "perfect" ? "on" : ""}`}
                onClick={() => setIvGoal("perfect")}
              >
                {t("breed.ivPerfect")}
              </button>
            </div>
            <div className="hint">
              {t(ivGoal === "fast" ? "breed.ivFastHint" : "breed.ivPerfectHint")}
              {wanted.length > 0 && t("breed.passivesFirst")}
            </div>
          </Section>

          {/* Planen nedan är steg och odds – den visar aldrig hur resultatet ser
              ut. Målbilden gör det, och fyller samtidigt tomrummet som uppstår
              när passiv-väljaren till höger är dubbelt så hög. */}
          <Section
            title={t("breed.goalTitle")}
            sub={t("breed.goalSub")}
          >
            <GoalCard
              species={target !== null ? sp(target) : null}
              wanted={wanted.map((id) => ({ id, name: pName(id), tier: pTier(id) }))}
              slots={MAX_WANTED}
              ivGoal={ivGoal}
              owned={mine.length}
              done={goalDone}
              work={work}
            />
          </Section>
        </div>

        <Section
          title={<>{t("breed.wantedTitle")} <span className="picked">{wanted.length}/{MAX_WANTED}</span></>}
          sub={t("breed.wantedSub")}
        >
          <PurposePicker
            value={purpose}
            onChange={(id) => { setPurpose(id); if (id !== "work") setWork(null); }}
            work={work}
            onWorkChange={setWork}
            speciesRecs={speciesRecs}
            speciesOf={sp}
            onPickTarget={setTarget}
            currentTarget={target}
            picks={rec.picks}
            missing={rec.missing}
            chosen={wanted}
            onToggle={togglePassive}
            onUseAll={() => setWanted(rec.picks.slice(0, MAX_WANTED).map((r) => r.id))}
            targetName={target !== null ? sp(target).name : undefined}
            full={wanted.length >= MAX_WANTED}
          />
          <div className="prows chosen">
            {wanted.length ? (
              wanted.map((id) => (
                <PassiveRow
                  key={id}
                  id={id}
                  name={data.passives[id]?.n ?? id}
                  tier={data.passives[id]?.r ?? 0}
                  suffix={
                    <button
                      type="button"
                      className="rm"
                      /* aria-label, inte title: bannern har redan hover-rutan med
                         vad passiven gör, och två tooltips krockar. */
                      aria-label={t("breed.remove")}
                      onClick={() => setWanted((w) => w.filter((x) => x !== id))}
                    >
                      ✕
                    </button>
                  }
                />
              ))
            ) : (
              <div className="prow sm empty">
                <span className="nm">{t("breed.noneChosen")}</span>
                <span className="arr" />
              </div>
            )}
          </div>
          {/* Rådet sitter direkt under de VALDA passiverna och ovanför rutnätet.
              Det har flyttats två gånger, och båda gångerna av samma skäl: det
              gick inte att se. Först låg det i plan-sektionen, nedanför
              bärarkorten – alltså efter att man bestämt sig. Sedan under
              `PassivePicker`, vilket ser rätt ut i koden men lägger det under ett
              1 500 px högt rutnät med egen scroll, alltså utanför skärmen.
              Ovanför rutnätet är det enda stället som är både vid valet och i
              synfältet. Flytta det inte ner igen. */}
          <ImplantBox />
          <PassivePicker
            passives={data.passives}
            counts={passiveCounts}
            implants={data.implants ?? null}
            value={wanted}
            onChange={setWanted}
          />
        </Section>
      </div>

      {ivGoal === "perfect" && target !== null && iv && perfect && (
        <IvPlanSection target={target} mine={mine} iv={iv} perfect={perfect} donors={donors} />
      )}
      {plan && <PassivePlanSection plan={plan} target={target} />}
      {target !== null && (
        <SpeciesPathSection target={target} base={base} uniqueChildren={uniqueChildren}
          directCombos={directCombos} chain={chain} tree={tree} />
      )}
      {target === null && !wanted.length && (
        <div className="panel meta">
          {rich("breed.emptyState", {
            target: <b>Anubis</b>,
            passives: <b>Legend, Musclehead, Vanguard</b>,
          })}
        </div>
      )}
    </>
  );

  /* -------- delvyer (behåller tillgång till context via closure) -------- */

  /** Vägen till 100/100/100 för målarten. Varje stat ärvs var för sig, så
   *  100:orna går att samla ihop över flera generationer. */
  function IvPlanSection({ target, mine, iv, perfect, donors }: {
    target: number;
    mine: ScoredPal[];
    iv: NonNullable<ReturnType<typeof planPerfectIv>>;
    perfect: NonNullable<ReturnType<typeof planPerfectLine>>;
    donors: ReturnType<typeof findIvDonors>;
  }) {
    const name = sp(target).name;
    const pname = (id: string) => data.passives[id]?.n ?? id;
    const stateText = (ivMask: number, pvMask: number) =>
      describeState(ivMask, pvMask, wanted, pname);

    /** Förälder i ett steg. IV står med: annars går två steg med samma art inte
     *  att skilja åt, och man vet inte vilken individ som menas. */
    const PlanParentChip = ({ p }: { p: PlanParent }) =>
      p.pal ? (
        <span className="mini" title={palShort(p.pal, sp(p.pal.s).name)}>
          <SpeciesIcon sp={sp(p.pal.s)} size={22} radius={7} />
          {sp(p.pal.s).name}
          <ElementIcons sp={sp(p.pal.s)} size={14} />
          <DeckNo sp={sp(p.pal.s)} />
          <span className="q">{p.pal.g === "M" ? "♂" : "♀"}</span>
          <span className="o">{p.pal.iv.join("/")}</span>
          {p.junk > 0 && <span className="jk">{t("iv.junk", { n: p.junk })}</span>}
        </span>
      ) : (
        <span className="mini step">resultat ur steg {p.fromStep}</span>
      );

    if (!mine.length) {
      return (
        <Section title={`Perfekt IV · ${name}`}>
          <WarnBox>
            {t("iv.ownNone", { name })}
          </WarnBox>
        </Section>
      );
    }

    return (
      <Section
        title={`Perfekt IV · ${name}`}
        sub={t("iv.sub")}
      >
        {iv.missingGender && (
          <WarnBox>
            {t("iv.oneGender", { name })}
          </WarnBox>
        )}

        <div className="ivcov">
          {IV_LABELS.map((label, i) => {
            const list = iv.carriers[i] ?? [];
            const top = list[0];
            return (
              <div key={label} className={`ivcard ${list.length ? "ok" : "gap"}`}>
                <div className="k">{label}</div>
                {top ? (
                  <>
                    <div className="v">{list.length} med 100</div>
                    <div className="hint">
                      {t("iv.best", {
                        name: sp(top.s).name,
                        g: top.g === "M" ? "♂" : "♀",
                        iv: top.iv.join("/"),
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="v">ingen med 100</div>
                    <div className="hint bad">{t("iv.mustReroll")}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {iv.gaps.length > 0 && (
          <WarnBox>
            {rich("iv.gapLead", {
              name,
              stats: <b>{iv.gaps.map((i) => IV_LABELS[i]).join(", ")}</b>,
            })}
            {donors.some((d) => d.pals.length > 0) && (
              <>
                {" "}{rich("iv.donorLead", { and: <b>{t("iv.and")}</b>, name })}
                <div className="donors">
                  {donors.filter((d) => d.pals.length).map((d) => (
                    <div key={d.stat} className="donor">
                      <span className="k">{IV_LABELS[d.stat]}</span>
                      {d.pals.map((p) => (
                        <span key={p.id} className="mini">
                          <SpeciesIcon sp={sp(p.s)} size={22} radius={7} />
                          {sp(p.s).name}
                          <ElementIcons sp={sp(p.s)} size={14} />
                          <DeckNo sp={sp(p.s)} />
                          <span className="q">{p.g === "M" ? "♂" : "♀"}</span>
                          <span className="o">{p.pv.length ? `${p.pv.length} passiver` : "ren"}</span>
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </WarnBox>
        )}

        {perfect.alreadyDone && (
          <OkBox>
            Du har redan en {name} med 100/100/100
            {wanted.length > 0 && t("iv.andWanted")} –{" "}
            {palShort(perfect.alreadyDone, name)}. {t("iv.noMoreBreeding")}
          </OkBox>
        )}

        {perfect.missingPassives.length > 0 && (
          <WarnBox>
            {t("iv.noneCarries", { name })}{" "}
            <b>
              <PassiveNames
                items={perfect.missingPassives.map((id) => ({ id, name: pname(id) }))}
              />
            </b>.
            {t("iv.mustImport")}
          </WarnBox>
        )}

        {!perfect.alreadyDone && perfect.possible && (
          <>
            <h3 className="phase">{t("iv.shortestPath", { n: perfect.steps.length })}</h3>
            <div className="sub">
              {t("iv.pathHint")}
            </div>
            {perfect.steps.map((st) => (
              <StepCard
                key={st.n}
                num={st.n}
                hint={
                  <>
                    {rich("iv.keepChild", { state: <b>{stateText(st.ivMask, st.pvMask)}</b> })}{" "}
                    IV {ivOddsText(st.ivOdds)}
                    {st.pvOdds < 1 && <> × passiver {ivOddsText(st.pvOdds)} (pool {st.pool})</>}
                    {" = "}{ivOddsText(st.odds)}.
                    {st.genderEggs > 0 && (
                      <> {t("iv.ofWhichGender", { n: Math.ceil(st.genderEggs) })}</>
                    )}
                    {st.sharesClutchWith.length > 0 && (
                      <> {rich("iv.sharedClutch", {
                        steps: <b>{st.sharesClutchWith.join(", ")}</b>,
                      })}</>
                    )}
                  </>
                }
              >
                <PlanParentChip p={st.a} />＋<PlanParentChip p={st.b} />→
                <span className="meta">{stateText(st.ivMask, st.pvMask)}</span>
                <span className="oddbadge">
                  🥚 {t("breed.perEgg", { odds: ivOddsText(st.odds) })} · {ivEggsText(st.odds, t.locale)}
                </span>
              </StepCard>
            ))}

            <div className="ivsum">
              <div className="col">
                <span className="k">Etappvis</span>
                <b>{ivEggsText(1 / perfect.totalEggs)}</b>
                <span className="hint">
                  {t("iv.totalOver", { n: perfect.steps.length })} · {eggTime(perfect.totalEggs)}
                </span>
              </div>
              {perfect.direct && (
                <>
                  <div className="col dim">
                    <span className="k">{t("iv.directOneStep")}</span>
                    <b>{ivEggsText(perfect.direct.odds, t.locale)}</b>
                    <span className="hint">
                      {t("iv.bestPairNow")}
                    </span>
                  </div>
                  <div className="col win">
                    <span className="k">Vinst</span>
                    <b>
                      {perfect.direct.eggs > perfect.totalEggs
                        ? `${Math.round(perfect.direct.eggs / perfect.totalEggs)}× billigare`
                        : "ingen"}
                    </b>
                    <span className="hint">{t("iv.stagewise")}</span>
                  </div>
                </>
              )}
            </div>
            <div className="hint">
              {rich("iv.foot", {
                gender: <b>{t("iv.footGender")}</b>, clutch: <b>{t("iv.footClutch")}</b>,
              })}
            </div>
          </>
        )}

        {!perfect.alreadyDone && !perfect.possible && !perfect.missingGender && (
          <WarnBox>
            {t("iv.noPath")}
            {" "}{name} – skaffa fler och kolla deras IV.
          </WarnBox>
        )}

        {wanted.length > 0 && perfect.possible && !perfect.alreadyDone && (
          <div className="hint">
            {rich("iv.separate", { apart: <b>{t("iv.separateEmph")}</b> })}
          </div>
        )}
      </Section>
    );
  }

  function PassivePlanSection({ plan, target }: { plan: NonNullable<ReturnType<typeof buildPassivePlan>>; target: number | null }) {
    return (
      <Section
        title={t("pp.title")}
        sub={t("pp.sub")}
      >
        {/* Ett kort per BÄRARE, inte per passiv. Täcker en och samma pal alla
            önskade – vilket är det bästa utfallet – blev det tidigare tre
            identiska kort bredvid varandra. */}
        <div className="cargrid">
          {carrierCards.map(({ pal, gives }) => {
            const junk = pal.pv.filter((x) => !wanted.includes(x));
            return (
              <div key={pal.id} className="stepcard" style={{ margin: 0 }}>
                <Ident pal={pal} label={gives.length === wanted.length
                  ? t("pp.givesAll", { n: wanted.length })
                  : t("pp.givesSome", { n: gives.length, total: wanted.length })} />
                <div className="hint">
                  {/* Bannerna ovan visar redan vilka som är önskade (bock) och
                      vilka som är skräp – att räkna upp dem igen vore samma sak
                      en tredje gång. Här står bara det bannerna inte kan säga. */}
                  {gives.length > 1 && <>{t("pp.savesSteps", { n: gives.length - 1 })} </>}
                  {junk.length > 0 && <>{t("pp.unmarkedJunk")} </>}
                  {t("pp.alternatives")} {gives.map((id) => {
                    const info = plan.carrierInfo.find((c) => c.passiveId === id);
                    return `${pName(id)} ${info?.carriers.length ?? 0}`;
                  }).join(" · ")}.
                </div>
              </div>
            );
          })}
          {plan.carrierInfo.filter((c) => !c.chosen).map((c) => (
            <div key={c.passiveId} className="stepcard" style={{ margin: 0 }}>
              <PassiveRow id={c.passiveId} name={pName(c.passiveId)} tier={pTier(c.passiveId)} />
              <div className="hint bad" style={{ marginTop: 7 }}>
                {t("pp.nobodyHasIt")}
              </div>
            </div>
          ))}
        </div>

        <Shortcuts items={suggestShortcuts(data, plan, ownedSpecies, target)} />

        <div className="okbox">
          <b>{t("pp.keepClean")}</b>{" "}
          {rich("pp.keepCleanBody", {
            combined: <i>{t("pp.combined")}</i>,
            only: <i>{t("pp.only")}</i>,
            n: plan.usable.length || wanted.length,
          })}
          {plan.usable.length >= 3 && (
            <> {t("pp.threePlus", { n: plan.usable.length })}</>
          )}
        </div>

        {!plan.usable.length ? (
          <WarnBox>{t("pp.noneInBox")}</WarnBox>
        ) : (
          <>
            {plan.start && !plan.mergeSteps.length && (
              <OkBox>
                {rich("pp.allOnOne", {
                  pal: <b>{palShort(plan.start, sp(plan.start.s).name)}</b>,
                })}
              </OkBox>
            )}
            {plan.mergeSteps.length > 0 && (
              <>
                <h3 className="phase">{t("pp.phase1", { n: plan.carriersUsed.length })}</h3>
                {/* Varför ordningen ser ut som den gör. Utan förklaringen ser den
                    godtycklig ut, och det är precis den som gör planen billig.
                    Två fall, och rutan får bara påstå det som stämmer för just
                    den här planen. */}
                {plan.mergeSteps.some((st) => !st.a.pal && !st.b.pal) && (
                  <OkBox>
                    <b>{t("pp.pairwise")}</b>{" "}
                    {rich("pp.pairwiseBody", {
                      n: plan.usable.length, two: <i>{t("pp.twoWord")}</i>,
                    })}
                  </OkBox>
                )}
                {plan.mergeDetour && (
                  <OkBox>
                    <b>{t("pp.orderWhole")}</b>{" "}
                    {/* Två fall: den andra ordningen är billigare i fas 1, eller
                        kostar lika mycket men landar i en annan art. Att skriva
                        "~15 ägg i stället för ~15" i det andra fallet är brus. */}
                    {plan.mergeDetour.cheapestEggs < plan.mergeEggs - 0.5 ? (
                      <>
                        En annan ihopslagning hade kostat{" "}
                        {t("pp.detourA", { cheap: Math.ceil(plan.mergeDetour.cheapestEggs) })}{" "}
                        <b>~{Math.ceil(plan.mergeEggs)}</b>, men den landar i en art som ligger
                        {t("pp.detourAEnd", { target: target !== null ? sp(target).name : t("pp.theTarget") })}
                      </>
                    ) : (
                      <>
                        {t("pp.detourB", { target: target !== null ? sp(target).name : t("pp.theTarget") })}
                      </>
                    )}{" "}
                    {rich("pp.detourSaves", {
                      eggs: <b>{t("eggs.approx", { n: Math.round(plan.mergeDetour.saves) })}</b>,
                    })}
                  </OkBox>
                )}
                {plan.mergeSteps.map((st) => {
                  const parents = [st.a, st.b];
                  const owned = parents.filter((p) => p.pal);
                  const clash = !st.genderOk && st.a.pal && st.b.pal;
                  return (
                    <StepCard
                      key={st.n} num={st.n}
                      hint={
                        st.possible
                          ? <>
                              {clash && (
                                <span className="warn-inline">
                                  ⚠ {t(st.a.pal!.g === "M" ? "pp.bothMale" : "pp.bothFemale")}{" "}
                                </span>
                              )}
                              {t("pp.hatchUntil")}
                              {st.genderEggs > 0 && (
                                <> {t("pp.needsGender", { n: Math.ceil(st.genderEggs) })}</>
                              )}
                              <Chips ids={st.haveAfter} label={t("pp.stepGoal")} />
                              {owned.map((p) => (
                                <Ident key={p.pal!.id} pal={p.pal!} label={t("pp.carrierInStep")} />
                              ))}
                            </>
                          : <span className="warn-inline">⚠ Detta par kan inte avla (legendarer avlar bara med sin egen art). Flytta passiven via en mellanpal:
                              {t("pp.impossiblePair", { name: sp(st.a.species).name })}</span>
                      }
                    >
                      <SpeciesMini
                        sp={sp(st.a.species)}
                        badge={st.a.pal ? t("pp.carrier") : t("breed.stepN", { n: st.a.fromStep ?? 0 })}
                        badgeClass={st.a.pal ? "o" : "q"}
                      />＋
                      <SpeciesMini
                        sp={sp(st.b.species)}
                        badge={st.b.pal ? t("pp.carrier") : t("breed.stepN", { n: st.b.fromStep ?? 0 })}
                        badgeClass={st.b.pal ? "o" : "q"}
                      />→
                      {st.possible ? <SpeciesMini sp={sp(st.childSpecies)} /> : <span className="warn-inline">✕ inget barn</span>}
                      <OddsBadge odds={oddsText(st.odds)} eggs={eggsText(st.odds)} />
                    </StepCard>
                  );
                })}
              </>
            )}
            {target !== null && plan.lineSpecies === target && (
              <OkBox>Passiv-linjen landar redan i {sp(target).name} – klart efter fas 1!</OkBox>
            )}
            {plan.speciesPhaseFailed && target !== null && (
              <WarnBox>
                {t("pp.noChain", {
                  from: plan.lineSpecies !== null ? sp(plan.lineSpecies).name : "?",
                  to: sp(target).name,
                })}
              </WarnBox>
            )}
            {/* Tillägg, inte ersättning: planen står kvar precis som den är.
                Den ligger mellan faserna med flit – alternativet byter ut hela
                planen, inte ett steg, så det ska läsas *innan* man ger sig in i
                artkedjan. Sist på sidan, efter totalen, kom det fram först när
                man redan bestämt sig. */}
            {target !== null && (
              <AltRouteBlock
                routes={plan.alternatives}
                speciesOf={sp}
                nameOf={pName}
                tierOf={pTier}
                target={target}
                planEggs={plan.expectedEggs}
                oddsText={oddsText}
                eggsText={eggsText}
              />
            )}
            {plan.speciesPhase && target !== null && (
              <>
                <h3 className="phase">Fas 2 · Byt art till {sp(target).name} – med passiverna kvar</h3>
                {plan.speciesPhaseShortcut && (
                  <OkBox>
                    <b>{t("pp.longerOnPurpose")}</b>{" "}
                    {rich("pp.longerBody", {
                      short: plan.speciesPhaseShortcut.steps,
                      shortEggs: <b>{t("eggs.approx", { n: Math.ceil(plan.speciesPhaseShortcut.eggs) })}</b>,
                      long: plan.speciesPhase.length,
                      longEggs: <b>{t("eggs.approx", {
                        n: Math.ceil(plan.speciesPhase.reduce((n, st) => n + (st.odds > 0 ? 1 / st.odds : 0), 0)),
                      })}</b>,
                    })}
                  </OkBox>
                )}
                {plan.speciesPhase.map((st, i) => (
                  <StepCard
                    key={i} num={i + 1}
                    hint={
                      <>
                        {!st.genderOk && st.partner && (
                          <div className="warn-inline">
                            ⚠ {t("pp.partnerSameGender")}
                            en {st.partner.g === "M" ? "hona" : "hane"} av samma art.
                          </div>
                        )}
                        {st.partner
                          ? <Ident pal={st.partner} label="Partner i steget" />
                          : <>{t("sp.partner")} ?</>}
                        {st.note ? `${st.note} · ` : ""}
                        <Chips ids={plan.usable} label={t("pp.childKeeps")} />
                      </>
                    }
                  >
                    <SpeciesMini sp={sp(st.from)} badge={i === 0 ? "DIN LINJE" : `STEG ${i}`} badgeClass="q" />＋
                    <SpeciesMini sp={sp(st.with)} badge={t("best.own.owned")} />→
                    <SpeciesMini sp={sp(st.to)} />
                    {uniqueChildren.has(st.to) && <Tag kind="lucky">UNIK KOMBO</Tag>}
                    <OddsBadge odds={oddsText(st.odds)} eggs={eggsText(st.odds)} />
                  </StepCard>
                ))}
              </>
            )}
            {plan.expectedEggs > 0 && (
              <OkBox>
                <b>{t("pp.total", { n: Math.ceil(plan.expectedEggs) })}</b>{" "}
                {t("pp.totalExpected")}{" "}
                {eggTime(plan.expectedEggs)}. {t("pp.totalTip")}
              </OkBox>
            )}
            <ExactNote plan={plan} />
          </>
        )}
      </Section>
    );
  }

  function SpeciesPathSection({ target, base, uniqueChildren, directCombos, chain, tree }: {
    target: number; base: number | null; uniqueChildren: ReadonlySet<number>;
    directCombos: [number, number, string | undefined][];
    chain: ReturnType<typeof solveChain>;
    tree: BreedTree | null;
  }) {

    return (
      <Section title={t("sp.title", { name: sp(target).name })}>
        {ownedSpecies.has(target) && bestOf.get(target) && (
          <OkBox>
            {t("sp.alreadyOwn", { name: sp(target).name })}{" "}
            {palShort(bestOf.get(target)!, sp(target).name)} ({bestOf.get(target)!.c})
          </OkBox>
        )}

        {directCombos.length > 0 && (
          <>
            <div className="sub" style={{ marginTop: 6 }}>
              {t("sp.directCombos", { n: directCombos.length })}
              {directCombos.length > 8 ? t("sp.showingEight") : ""}:
            </div>
            {directCombos.slice(0, 8).map(([a, b, note], i) => {
              const q = bestParentPair(pals, bestOf, a, b, prefs);
              return (
                <StepCard key={i}
                  hint={<>{t("sp.parents")} {palShort(q.pa, sp(q.pa.s).name)} + {palShort(q.pb, sp(q.pb.s).name)}{q.warn && <span className="warn-inline"> · {t.msg(q.warn)}</span>}</>}
                >
                  <SpeciesMini sp={sp(a)} badge={t("best.own.owned")} />＋
                  <SpeciesMini sp={sp(b)} badge={t("best.own.owned")} />→
                  <SpeciesMini sp={sp(target)} />
                  {uniqueChildren.has(target) && <Tag kind="lucky">UNIK KOMBO</Tag>}
                  {note && <span className="meta">({note})</span>}
                </StepCard>
              );
            })}
          </>
        )}

        {base !== null ? (
          <>
            <h3 className="phase">Kedja med {sp(base).name} som bas</h3>
            {base === target && <OkBox>{t("sp.baseIsTarget")}</OkBox>}
            {base !== target && !chain && <WarnBox>{t("sp.noChainIn10")}</WarnBox>}
            {chain?.map((st, k) => (
              <StepCard key={k} num={k + 1}
                hint={k === 0
                  ? (() => { const q = bestParentPair(pals, bestOf, st.from, st.with, prefs); return <>{t("sp.parents")} {palShort(q.pa, sp(q.pa.s).name)} + {palShort(q.pb, sp(q.pb.s).name)}{q.warn ? ` · ${t.msg(q.warn)}` : ""}</>; })()
                  : <>{t("sp.partner")} {bestOf.get(st.with) ? palShort(bestOf.get(st.with)!, sp(st.with).name) : "?"} {t("sp.genderRandom")}</>}
              >
                <SpeciesMini sp={sp(st.from)} badge={k === 0 ? "BAS" : `STEG ${k}`} badgeClass="q" />＋
                <SpeciesMini sp={sp(st.with)} badge={t("best.own.owned")} />→
                <SpeciesMini sp={sp(st.to)} />
                {uniqueChildren.has(st.to) && <Tag kind="lucky">UNIK KOMBO</Tag>}
              </StepCard>
            ))}
          </>
        ) : (
          <>
            <h3 className="phase">{t("sp.shortestFree")}</h3>
            {!isReachable(freeSolve.cost, target) && (
              <WarnBox>
                {t("sp.unreachable", { name: sp(target).name })}
              </WarnBox>
            )}
            {freeSolve.cost[target] === 0 && <OkBox>{t("sp.ownedNoBreeding")}</OkBox>}
            {tree && (
              <>
                <OkBox>Minsta antal parningar: <b>{freeSolve.cost[target]}</b></OkBox>
                <TreeNode node={tree} />
              </>
            )}
          </>
        )}
      </Section>
    );
  }

  function TreeNode({ node }: { node: BreedTree }) {
    if (node.owned) {
      const b = bestOf.get(node.s);
      return (
        <StepCard>
          <SpeciesMini sp={sp(node.s)} badge={t("best.own.owned")} />
          <span className="meta">{b ? palShort(b, sp(node.s).name) : ""}</span>
        </StepCard>
      );
    }
    return (
      <div className="stepcard treecard">
        <div className="hd">
          <SpeciesMini sp={sp(node.s)} />
          <span className="meta">← avlas av:</span>
          {uniqueChildren.has(node.s) && <Tag kind="lucky">UNIK KOMBO</Tag>}
          {node.note && <span className="meta">({node.note})</span>}
        </div>
        <div className="tree">
          <TreeNode node={node.a} />
          <TreeNode node={node.b} />
        </div>
      </div>
    );
  }
}
