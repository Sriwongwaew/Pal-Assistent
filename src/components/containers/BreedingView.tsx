"use client";

/* Smart: breeding-planeraren – mål, bas, önskade passiver → plan med odds. */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import {
  bestParentPair, buildTree, childrenOf, compareParents, eggsText, exactOdds, isReachable,
  oddsText, pairQuality, RANDOM_EXTRA_ODDS, solveChain,
} from "@/lib/breeding";
import type { IvGoal, ParentPrefs } from "@/lib/breeding";
import { buildPassivePlan } from "@/lib/passivePlan";
import type { PassivePlan } from "@/lib/passivePlan";
import { suggestShortcuts } from "@/lib/shortcuts";
import { NEAR_IV } from "@/lib/ivFruits";
import { planIvImports, type IvImport } from "@/lib/ivImport";
import {
  IV_LABELS, IV_RANDOM, ivEggsText, ivOddsText, ivTargetOf, planPerfectIv,
} from "@/lib/ivPlan";
import {
  findIvDonors, planPerfectLine, type PerfectPlan, type PlanParent,
} from "@/lib/perfectPlan";
import { PURPOSES, recommendPassives, recommendWorkSpecies, type PurposeId } from "@/lib/purpose";
import {
  BREEDING_PREFS_KEY, emptyBreedingPrefs, hasBreedingPrefs, MAX_WANTED,
  parseBreedingPrefs, serializeBreedingPrefs, type BreedingPrefs,
} from "@/lib/breedingPrefs";
import { planBreedSetup, spanText, CAP_FREE, CAP_RATE, eggSeconds } from "@/lib/breedRate";
import { implantAdvice, ownedImplants, ownsImplant } from "@/lib/implants";
import type { AppData, BreedTree, ScoredPal, Species, WorkType } from "@/lib/types";
import { AltRouteBlock } from "@/components/ui/AltRouteBlock";
import { OddsBadge, OkBox, SpeciesMini, StepCard, WarnBox } from "@/components/ui/BreedBits";
import { BreedRoute, type RouteRow } from "@/components/ui/BreedRoute";
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
import { elementColor } from "@/components/ui/PalHero";
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
  /* Vald artkedja som artkoder. Tomt = ta planerarens rekommendation. Sparas
     med resten, så den överlever ett besök på Boxen – men den validerar sig
     själv mot planens alternativ vid varje omräkning, se `chainPinned`. */
  const [pinnedChain, setPinnedChain] = useState<string[]>(saved.chain);
  /* Manuellt läge sparas INTE i `pa-breeding`. Det är en fråga man ställer
     ("vad kostar just de här två?"), inte ett mål man arbetar mot över flera
     sessioner – och en sparad förälder skulle dessutom peka på ett pal-id som kan
     ha matats bort, alltså samma valideringsproblem som art-index. */
  const [manualA, setManualA] = useState<ManualParent | null>(null);
  const [manualB, setManualB] = useState<ManualParent | null>(null);

  /* Väljarna OCH verktygen är MODALER: porträttet byter art, passivplatserna
     byter passiver (Kens modell), och Verktygs-panelens tre knappar öppnar
     förrådet/manuellt läge/avelsbasen i samma ruta. En och samma state –
     bara en modal i taget är rätt även för ögat. Startläget öppnar
     artväljaren när mål saknas – då är den det första man behöver. */
  const [picker, setPicker] = useState<
    null | "target" | "passives" | "implants" | "manual" | "setup"
  >(() => ((initialTarget ?? saved.target) === null ? "target" : null));
  /* Escape stänger, precis som Base Info-modalen. */
  useEffect(() => {
    if (!picker) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPicker(null); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [picker]);

  const current = useMemo<BreedingPrefs>(
    () => ({ target, base, wanted, ivGoal, purpose, work, useImplants, chain: pinnedChain }),
    [target, base, wanted, ivGoal, purpose, work, useImplants, pinnedChain],
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

  /* EN vald förälder ur boxen styr hela planen: den är då given och covern
     fyller på runt den (Kens modell aug 2026 – "genom det ska den kunna ta fram
     hela passivplanen"). Två valda är fortfarande manuellt lägets egen fråga
     ("vad kostar just de här två?"), och en handbyggd förälder finns inte i
     boxen och kan därför inte vara en bärare planen rör. */
  const forcedPal = useMemo(() => {
    const one = manualA && manualB ? null : (manualA ?? manualB);
    if (!one || one.s < 0) return null;
    // Vald som en rad ur boxen: då vet vi exakt vilket exemplar.
    if (one.id) return pals.find((p) => p.id === one.id) ?? null;
    /* Vald i ART-rutnätet i stället. Skillnaden mellan "rad ur boxlistan" och
       "art ur rutnätet" är vår, inte användarens – båda betyder "använd den
       här palen" (Kens fynd aug 2026: valde Aegidron i rutnätet och planen rörde
       sig inte). Vi löser därför upp den mot boxen: samma art, bär minst de
       passiver som skrivits in, och bästa föräldern av dem enligt IV-målet.
       Finns arten inte i boxen alls är den genuint påhittad, och då står det. */
    const match = pals
      .filter((p) => p.s === one.s && one.pv.every((id) => p.pv.includes(id)))
      .sort((a, b) => compareParents(a, b, prefs));
    return match[0] ?? null;
  }, [manualA, manualB, pals, prefs]);

  const plan = useMemo(
    () => (planWanted.length
      ? buildPassivePlan(
        data, pals, ownedSpecies, planWanted, target, prefs, pinnedChain, forcedPal,
      )
      : null),
    [data, pals, ownedSpecies, planWanted, target, prefs, pinnedChain, forcedPal],
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
  /**
   * Bärarna en plan faktiskt använder, en post per individ.
   *
   * Tar planen som argument och läser den inte ur omgivningen: sektionen ritar
   * `routeAnyway` när målet redan är uppnått, och en uppslagning mot den *andra*
   * planens bärare gav tomma "Alternativ i boxen:" och stämplade bärarna som
   * partners.
   */
  const carriersOf = (p: PassivePlan) => {
    const byPal = new Map<string, { pal: ScoredPal; gives: string[] }>();
    for (const c of p.carrierInfo) {
      if (!c.chosen) continue;
      const g = byPal.get(c.chosen.id) ?? { pal: c.chosen, gives: [] };
      g.gives.push(c.passiveId);
      byPal.set(c.chosen.id, g);
    }
    return [...byPal.values()].sort((a, b) => b.gives.length - a.gives.length);
  };

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
    const filledA = manualA && manualA.s >= 0 ? manualA : null;
    const filledB = manualB && manualB.s >= 0 ? manualB : null;

    /* Bara EN vald: appen väljer partnern SJÄLV och visar hela planen direkt.
       Att i stället lista kandidater och vänta på ett klick gjorde användaren
       till mellanhand i sitt eget verktyg – man har redan sagt vad man vill
       använda, och resten är räknearbete (Kens rättning aug 2026).
       Alternativen ligger kvar under planen: man SKA kunna byta partner, man
       ska bara inte behöva. */
    if (!filledA !== !filledB) {
      /* `forcedPal` är samma uppslag som planen använder – står det något annat
         här än vad planen gör ljuger en av dem. Är den null finns arten inte i
         boxen (eller inget exemplar bär det som skrivits in), och då är parfrågan
         det enda vi kan svara på. */
      if (!forcedPal) return <div className="hint">{t("manual.handBuiltNeedsPair")}</div>;
      const covers = planWanted.filter((id) => forcedPal.pv.includes(id));
      const name = forcedPal.nick || sp(forcedPal.s).name;
      return (
        <div className="hint">
          {covers.length > 0
            ? t("manual.drivesPlan", { name, n: covers.length })
            : t("manual.drivesPlanNoCover", { name })}
        </div>
      );
    }

    const a = filledA;
    const b = filledB;
    if (!a || !b) return null;

    /* `rich` och `t` kommer ur closuren – delvyerna definieras om vid varje
       render, så en egen hook här hade brutit hook-ordningen. */
    const p = planManualPair(data, a, b, planWanted);
    const spName = (i: number) => sp(i).name;

    if (p.blocks.length > 0) {
      return (
        <WarnBox>
          {/* `blk`, inte `b` – den yttre `b` är den andra FÖRÄLDERN, och en
              skuggning här gav "Property 's' does not exist" i stället för
              artnamnet. */}
          {p.blocks.map((blk, i) => (
            <div key={i}>
              {blk.kind === "noChild" && (
                <>
                  <b>{t("manres.noChild")}</b>{" "}
                  {t("manres.noChildBody", { a: spName(a.s), b: spName(b.s) })}
                </>
              )}
              {blk.kind === "sameGender" && (
                <>
                  <b>{t(blk.g === "M" ? "manres.bothMale" : "manres.bothFemale")}</b>{" "}
                  {rich("manres.sameGenderBody", { unknown: <i>{t("manual.unknownGender")}</i> })}
                </>
              )}
              {blk.kind === "missing" && (
                <>
                  <b>{t("manres.missing")}</b>{" "}
                  <Chips ids={blk.ids} label={t("manres.neitherCarries")} />
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
            {spName(a.s)} × {spName(b.s)}
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
  /** IV-tröskeln läget siktar på: 100 (perfekt), 90 (nära) eller 0 (snabbt). */
  const ivTarget = ivTargetOf(ivGoal);
  const iv = useMemo(
    () => (target === null ? null : planPerfectIv(mine, ivTarget || 100)),
    [mine, target, ivTarget],
  );
  /**
   * Vägar att BÄRA IN en 100:a arten saknar, ur en annan art.
   *
   * Räknas före planen och skickas in i den: utan dem kan en saknad stat bara
   * komma ur 40 %-omslumpningen (~253 ägg), och det var i praktiken hela
   * kostnaden i en perfekt plan. Se `ivImport.ts`.
   */
  const ivImports = useMemo(
    () => (target === null
      ? []
      /* ALLA tre statarna, inte bara luckorna: en enda smutsig 100-bärare i arten
         kan vara en dyrare förälder än en ren importerad. Sökningen tar bara
         importen när den blir billigare, så listan kan inte göra planen sämre. */
      : planIvImports(data, pals, ownedSpecies, target, [0, 1, 2], wanted, ivTarget || 100)),
    [data, pals, ownedSpecies, target, wanted, ivTarget],
  );
  const perfect = useMemo(
    () => (target === null || ivGoal === "fast"
      ? null
      : planPerfectLine(mine, wanted, ivImports, ivTarget)),
    [mine, wanted, target, ivGoal, ivImports, ivTarget],
  );
  /** Har någon i boxen redan hela målbilden? Då är planen nedan onödig. */
  const goalDone = useMemo(() => {
    if (target === null || (!wanted.length && ivGoal === "fast")) return null;
    const hit = mine.find((p) => wanted.every((w) => p.pv.includes(w))
      && p.iv.every((v) => v >= ivTarget));
    return hit ? palShort(hit, data.species[hit.s]!.name) : null;
  }, [mine, wanted, ivGoal, ivTarget, target, data]);
  /**
   * "Så här hade du avlat fram en" – vägen även när du redan har palen.
   *
   * Bär en pal i boxen alla önskade passiver OCH är målarten kostar planen noll
   * ägg, och då fanns ingen plan att titta på: hela leden försvann och sidan sa
   * bara "klart". Men vägen dit är fortfarande det man kom hit för att se
   * (Kens rättning aug 2026: *"jag hade velat att den visat pathen ändå"*) — man
   * vill avla en till, kolla att uppställningen stämmer, eller bara se hur långt
   * det var.
   *
   * Planen byggs därför om i läget `breedAnother`: den färdiga palen är då inte
   * ett svar i sig utan en **förälder**. Första försöket lämnade i stället ut
   * den helt, och det var fel — planen föreslog en omväg via två andra arter
   * fast Ken hade två färdiga Helzephyr Lux att para med varandra. Att sätta ihop
   * det man redan har är både lika många ägg och det man förväntar sig.
   */
  /**
   * Räcker den perfekta leden som HELA planen?
   *
   * Då göms passivplanen: `planPerfectLine` planerar passiverna och 100:orna i
   * samma steg, och två numreringar för samma pal var precis det som gjorde sidan
   * rörig. Villkoren är att planen finns, är komplett (ingen önskad passiv saknas
   * i arten) och att målet inte redan är uppnått – i alla andra fall gör
   * passivplanen något den perfekta inte kan.
   */
  const mergedRoute = !!perfect && perfect.possible && !perfect.alreadyDone
    && !perfect.missingPassives.length;

  const routeAnyway = useMemo(() => {
    if (!plan || target === null || !planWanted.length) return null;
    const done = plan.usable.length > 0 && plan.expectedEggs <= 0
      && !plan.speciesPhaseFailed && plan.lineSpecies === target;
    if (!done) return null;
    const have = pals.find(
      (p) => p.s === target && plan.usable.every((id) => p.pv.includes(id)),
    );
    if (!have) return null;
    const alt = buildPassivePlan(
      data, pals, ownedSpecies, planWanted, target, prefs, pinnedChain, forcedPal,
      { breedAnother: true },
    );
    // Går det inte att para fram en till alls är "klart" hela svaret.
    if (!alt.mergeSteps.length && !alt.speciesPhase?.length) return null;
    return { plan: alt, have: palShort(have, data.species[have.s]!.name) };
  }, [plan, pals, ownedSpecies, data, planWanted, target, prefs, pinnedChain, forcedPal]);
  const donors = useMemo(
    () => (target !== null && iv && iv.gaps.length
      ? findIvDonors(data, pals, target, iv.gaps, ivTarget || 100)
      : []),
    [iv, target, data, pals, ivTarget],
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
        <span className="bsdim"> · ≈{spanText(eggs * eggSeconds(CAP_FREE))} {t("bh.maxRate")}</span>
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

      {/* Artefaktens topp (designrundan aug 2026): målbild | förväntat | verktyg.
          Målbilden bodde tidigare långt ner i vänsterkolumnen – här är den det
          första man ser, med ledens totalsumma bredvid. Panelen räknar bara om
          det planen redan vet; all matematik bor kvar i lib. */}
      <div className="bhead">
        <GoalCard
          species={target !== null ? sp(target) : null}
          wanted={wanted.map((id) => ({ id, name: pName(id), tier: pTier(id) }))}
          slots={MAX_WANTED}
          ivGoal={ivGoal}
          owned={mine.length}
          done={goalDone}
          work={work}
          onPickSpecies={() => setPicker("target")}
          onPickPassives={() => setPicker("passives")}
        />
        <div className="bhcard">
          <div className="bhk">{t("bh.expected")}</div>
          {plan && plan.usable.length > 0 && plan.expectedEggs > 0 ? (
            <>
              <div className="bhbig">≈{Math.ceil(plan.expectedEggs)} <span>{t("manres.eggsWord")}</span></div>
              <div className="bhtime">{eggTime(plan.expectedEggs)}</div>
              {/* Fasstapeln: EN mätare som visar var äggen tar vägen, med
                  legendrader under – siffror i marginalen såg tomt ut. */}
              {plan.mergeSteps.length > 0 && plan.speciesPhase && plan.expectedEggs > 0 && (
                <>
                  <span className="bhsplit" aria-hidden>
                    <i className="p1" style={{ width: `${Math.round((plan.mergeEggs / plan.expectedEggs) * 100)}%` }} />
                    <i className="p2" style={{ width: `${100 - Math.round((plan.mergeEggs / plan.expectedEggs) * 100)}%` }} />
                  </span>
                  <div className="bhrow"><span><i className="bhdot p1" />{t("bh.phase1")}</span><b className="num">≈{Math.ceil(plan.mergeEggs)}</b></div>
                  <div className="bhrow"><span><i className="bhdot p2" />{t("bh.phase2")}</span><b className="num">≈{Math.max(0, Math.ceil(plan.expectedEggs - plan.mergeEggs))}</b></div>
                </>
              )}
              {(() => {
                const last = plan.speciesPhase?.[plan.speciesPhase.length - 1];
                if (!last || plan.usable.length === 0) return null;
                const exact = exactOdds(plan.usable.length, last.pool);
                return exact > 0 && (
                  <div className="bhrow bhx"><span>{t("bh.exact")}</span><b className="num">≈{Math.ceil(1 / exact)}</b></div>
                );
              })()}
            </>
          ) : plan && plan.usable.length > 0 && !plan.speciesPhaseFailed &&
              (target === null || plan.lineSpecies === target) ? (
            /* **Noll ägg är ett RESULTAT, inte ett tomt läge.** Rutan föll
               tidigare tillbaka på "välj mål och passiver" så fort planen
               kostade noll – alltså en uppmaning att göra precis det man just
               gjort, på en sida där allt annat sa "klart". Det inträffar när en
               pal i boxen redan bär alla önskade passiver OCH är målarten, och
               det är den vanligaste vägen dit: man har nyss avlat fram den.
               Villkoren är därför de tre som gör noll sant – något att bära,
               ingen olöst artkedja, och linjen faktiskt i målarten. */
            <>
              <div className="bhbig">✓ <span>{t("bh.doneWord")}</span></div>
              <div className="bhtime">{t("bh.done")}</div>
              {/* Vägen dit finns kvar under – och då ska dess pris stå här, så
                  rutan och planen inte säger olika saker om samma led. */}
              {routeAnyway && (
                <div className="bhrow bhx">
                  <span>{t("bh.again")}</span>
                  <b className="num">≈{Math.ceil(routeAnyway.plan.expectedEggs)}</b>
                </div>
              )}
            </>
          ) : plan?.speciesPhaseFailed ? (
            // Här finns det verkligen ingen väg – då ska det stå, inte gömmas.
            <div className="hint">{t("bh.noRoute")}</div>
          ) : wanted.length > 0 && plan && plan.usable.length === 0 ? (
            <div className="hint">{t("bh.noCarriers")}</div>
          ) : (
            <div className="hint">{t("bh.none")}</div>
          )}
        </div>
        <div className="bhcard">
          <div className="bhk">{t("bh.tools")}</div>
          {/* Tre verktygsknappar som öppnar modalerna + förrådet som banners
              och takten som mätare – panelen ska bära information, inte luft. */}
          {data.implants != null && (
            <button type="button" className="bhtoolbtn" onClick={() => setPicker("implants")}>
              <span className="k">⊕ {t("implant.title")}</span>
              <span className="v num">{Object.keys(ownedImplants(data) ?? {}).length}</span>
            </button>
          )}
          <div className="bhimps">
            {Object.keys(ownedImplants(data) ?? {}).slice(0, 2).map((id) => (
              <PassiveRow key={id} id={id} name={pName(id)} tier={pTier(id)} />
            ))}
          </div>
          <button type="button" className="bhtoolbtn" onClick={() => setPicker("manual")}>
            <span className="k">⚖ {t("manual.title")}</span>
            <span className="v">{t("bh.open")}</span>
          </button>
          <button type="button" className="bhtoolbtn" onClick={() => setPicker("setup")}>
            <span className="k">⏱ {t("setup.title")}</span>
            <span className="v num">{setup.rate.toFixed(1).replace(".", ",")}× · {Math.round(setup.seconds)} s</span>
          </button>
          <span className="statbar bhmeter" title={t("bh.meterTitle")}>
            <i style={{ width: `${Math.round((setup.rate / CAP_RATE) * 100)}%` }} />
          </span>
        </div>
      </div>

      {/* Väljarna och verktygen delar en modal: porträttet i målbilden öppnar
          artväljaren, passivplatserna passivväljaren, Verktygs-knapparna sina
          paneler. Planen äger sidan. */}
      {picker && (
      <div className="pamodal" role="dialog" aria-modal="true">
        <div className="pmback" onClick={() => setPicker(null)} />
        <div className="pmbox">
        <button type="button" className="pmclose" onClick={() => setPicker(null)}
          aria-label={t("modal.close")}>✕</button>
        {picker === "target" && (
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
              {/* Tredje läget (Kens begäran aug 2026): 90+ i varje stat, alltså
                  INOM EN FRUKT från perfekt. Det finns för att "perfekt" ska få
                  fortsätta betyda 100/100/100 avlat hela vägen – en omslumpad
                  stat når 90 elva gånger oftare än 100. */}
              <button
                type="button"
                className={`fchip ${ivGoal === "near" ? "on" : ""}`}
                onClick={() => setIvGoal("near")}
              >
                {t("breed.ivNear", { v: NEAR_IV })}
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
              {t(ivGoal === "fast" ? "breed.ivFastHint"
                : ivGoal === "near" ? "breed.ivNearHint" : "breed.ivPerfectHint",
              { v: NEAR_IV, fruits: 3 })}
              {wanted.length > 0 && t("breed.passivesFirst")}
            </div>
          </Section>

        </div>
        )}

        {picker === "passives" && (
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
        )}

        {picker === "implants" && (
          <ImplantStash
            implants={data.implants ?? null}
            passives={data.passives}
            chosen={wanted}
            full={wanted.length >= MAX_WANTED}
            onPick={togglePassive}
          />
        )}

        {picker === "manual" && (
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
        )}

        {picker === "setup" && (
          <BreedSetupPanel
            setup={setup}
            wanted={wanted.length}
            speciesOf={sp}
            passiveName={pName}
            passiveTier={pTier}
            onPickTarget={(s) => { setTarget(s); setPicker(null); }}
          />
        )}
        </div>
      </div>
      )}

      {ivGoal !== "fast" && target !== null && iv && perfect && (
        <IvPlanSection
          target={target} mine={mine} iv={iv} perfect={perfect}
          donors={donors} imports={ivImports}
        />
      )}
      {/* Är målet redan uppnått ritas vägen dit ändå (`routeAnyway`) – men den
          måste säga varför den inte kostar noll, annars ser den ut att motsäga
          "klart" i rutan överst.
          **Och den göms när den perfekta leden redan gör dess jobb** (Kens design
          "En led"): med IV-målet perfekt planerar `planPerfectLine` passiverna
          OCH 100:orna i samma steg, och då var det här en andra numrering för
          samma pal. Villkoret är att den planen är komplett – saknas en önskad
          passiv i arten (`missingPassives`) kan bara passivplanen hämta in den,
          och då ska den stå kvar. */}
      {plan && !mergedRoute && (
        <PassivePlanSection
          plan={routeAnyway?.plan ?? plan}
          target={target}
          haveOne={routeAnyway?.have ?? null}
        />
      )}
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
  function IvPlanSection({ target, mine, iv, perfect, donors, imports }: {
    target: number;
    mine: ScoredPal[];
    iv: NonNullable<ReturnType<typeof planPerfectIv>>;
    perfect: NonNullable<ReturnType<typeof planPerfectLine>>;
    donors: ReturnType<typeof findIvDonors>;
    /** Vägar att bära in en 100:a arten saknar – se `ivImport.ts`. */
    imports: IvImport[];
  }) {
    const name = sp(target).name;
    const pname = (id: string) => data.passives[id]?.n ?? id;
    /**
     * Tillståndets IV-del för sig, och passiverna som **id:n**.
     *
     * Passiver ritas som banners överallt annars i appen, och gjorde det inte
     * här: stegen skrev "Demon God + Musclehead + Legend" som löptext mitt i
     * IV-texten (Kens fynd: *"vi verkar inte visa passiva som kommer över
     * här?"*). Samma passiv ska se likadan ut i hela appen – tier-färgen ÄR
     * informationen.
     */
    const ivText = (ivMask: number) => {
      const parts = [0, 1, 2].filter((i) => ivMask & (1 << i)).map((i) => IV_LABELS[i]);
      /* Tröskeln skrivs ut som den är: "100" i perfekt läge, "90+" i nära – en
         plan som säger 100 men siktar på 90 vore en lögn i varje steg. */
      const lvl = ivTarget >= 100 ? "100" : `${ivTarget}+`;
      return parts.length ? `${parts.join(" + ")} ${lvl}` : t("iv.noHundreds");
    };
    const pvIds = (pvMask: number) => wanted.filter((_, i) => (pvMask >> i) & 1);
    /** Billigaste importvägen som bär en viss stat. Listan är sorterad. */
    const importFor = (stat: number) => imports.find((im) => im.stats.includes(stat as never));
    /** Hur många pals i HELA boxen som har 100 i staten, utanför målarten. */
    const outsideCount = (stat: number) =>
      pals.filter((p) => p.s !== target && (p.iv[stat] ?? 0) >= 100).length;
    /* Luckor som INTE går att bära in utifrån – bara de ska varnas om i rött.
       Resten har ett svar, och det står i importleden. */
    const stuck = iv.gaps.filter((i) => !importFor(i));

    /** En importvägs kedja i klartext: donator → mellanled → målarten. */
    const ImportPath = ({ im }: { im: IvImport }) => (
      <span className="ivpath">
        <SpeciesMini sp={sp(im.donor.s)} />
        {im.steps.map((st) => (
          <span key={st.to} className="ivarrow">→ <SpeciesMini sp={sp(st.to)} /></span>
        ))}
      </span>
    );
    /** Statarna en import bär, som spelets egna ord: "Attack + Defense". */
    const importStats = (im: IvImport) => im.stats.map((i) => IV_LABELS[i] ?? "?").join(" + ");

    /* ---- EN LED: importen och etapperna i SAMMA numrering ----
       Kens design (aug 2026, förslag "En led"). Förut var det tre rubriker med
       tre numreringar för en enda pal: "Do this first" för importen, "Shortest
       path" för etapperna och en egen "Passive plan" under. Importen är inte ett
       ärende före planen – den ÄR planens första steg, och varje artsteg i den är
       en riktig parning man gör. Därför plattas importkedjorna ut till egna rader
       och etapperna fortsätter numreringen. `fromStep`/`imported` i planen pekar
       på etapp- respektive importindex, så de måste räknas om till radnummer –
       annars säger korten "steg 2" om en rad som heter 4. */
    type RouteItem =
      | { kind: "imp"; im: IvImport; si: number }
      | { kind: "step"; st: PerfectPlan["steps"][number] };
    const items: RouteItem[] = [];
    /** Import → radnumret där den är FÄRDIG (individen finns i handen). */
    const importRow = new Map<IvImport, number>();
    for (const im of perfect.imports) {
      im.steps.forEach((_, si) => items.push({ kind: "imp", im, si }));
      importRow.set(im, items.length);
    }
    const stepOffset = items.length;
    for (const st of perfect.steps) items.push({ kind: "step", st });
    /** Etappstegets 1-baserade nummer → radnummer i den sammanslagna leden. */
    const rowOf = (planStep: number) => stepOffset + planStep;
    /** Importens IV skriven som en ägd pals: 100 där den bär, streck där den inte vet. */
    const importIv = (im: IvImport) =>
      [0, 1, 2].map((i) => (im.stats.includes(i as never) ? "100" : "–")).join("/");

    /**
     * Donatorns huvudkort – första radens ena förälder när planen börjar med en
     * import. Samma anatomi som de andra huvudkorten, plus var palen står: de
     * bästa IV-palsen ligger ofta i det globala lagret, och då måste man veta det.
     */
    const donorHeadBody = (im: IvImport) => (
      <>
        <div className="brhwho">
          <span className="brhp"><SpeciesIcon sp={sp(im.donor.s)} size={40} radius={20} /></span>
          <div>
            <div className="nm">
              {sp(im.donor.s).name} {im.donor.g === "M" ? "♂" : "♀"}
            </div>
            <div className="meta">
              {t("iv.donorRole")} · <DeckNo sp={sp(im.donor.s)} /> · IV{" "}
              {im.donor.iv.join("/")}
              {im.donorJunk === 0 && <> · {t("brc.clean")}</>} · {im.donor.c}
            </div>
          </div>
        </div>
        {im.donor.pv.length > 0 && (
          <div className="brhpv">
            {im.donor.pv.map((id) => (
              <span key={id} className={wanted.includes(id) ? "" : "jk"}>
                <PassiveRow id={id} name={pname(id)} tier={pTier(id)} />
              </span>
            ))}
          </div>
        )}
        <div className="hint">
          {rich("iv.headBrings", { state: <b>{importStats(im)} 100</b> })}{" "}
          <ImportPath im={im} />
        </div>
      </>
    );

    /** Partnerns huvudkort: den ägda pal första importsteget paras med. */
    const partnerHeadBody = (pal: ScoredPal, childName: string) => (
      <>
        <div className="brhwho">
          <span className="brhp"><SpeciesIcon sp={sp(pal.s)} size={40} radius={20} /></span>
          <div>
            <div className="nm">{sp(pal.s).name} {pal.g === "M" ? "♂" : "♀"}</div>
            <div className="meta">
              {t("brc.partnerRole")} · <DeckNo sp={sp(pal.s)} /> · IV {pal.iv.join("/")}
              {pal.pv.length === 0 && <> · {t("brc.clean")}</>} · {pal.c}
            </div>
          </div>
        </div>
        {pal.pv.length > 0 && (
          <div className="brhpv">
            {pal.pv.map((id) => (
              <span key={id} className={wanted.includes(id) ? "" : "jk"}>
                <PassiveRow id={id} name={pname(id)} tier={pTier(id)} />
              </span>
            ))}
          </div>
        )}
        <div className="hint">{t("iv.partnerBrings", { name: childName })}</div>
      </>
    );

    /**
     * Ledens huvudkort: föräldrarna som STARTAR linjen.
     *
     * Samma anatomi som passivplanens bärarkort – 40 px porträtt, namn med kön,
     * metarad, passivbanners, och vad föräldern bidrar med. Första försöket var
     * en bricka på en rad plus en liten metatext, och då blev korten "små jämfört
     * med artefakten" (Kens rättning). Leden ska se likadan ut i båda planerna:
     * det är samma sorts kort på samma sorts led.
     */
    const ivHeadBody = (p: PlanParent) => {
      const species = sp(p.pal?.s ?? target);
      const junkOf = (pal: ScoredPal) => pal.pv.filter((id) => !wanted.includes(id)).length;
      return (
        <>
          <div className="brhwho">
            <span className="brhp"><SpeciesIcon sp={species} size={40} radius={20} /></span>
            <div>
              <div className="nm">
                {species.name}{" "}
                {p.pal ? (p.pal.g === "M" ? "♂" : "♀") : t("iv.eitherGender")}
              </div>
              <div className="meta">
                {p.imported ? t("iv.importRole") : t("iv.parentRole")} ·{" "}
                <DeckNo sp={species} /> · IV{" "}
                {p.pal ? p.pal.iv.join("/") : importIv(p.imported!)}
                {p.pal
                  ? <>{junkOf(p.pal) === 0 && <> · {t("brc.clean")}</>} · {p.pal.c}</>
                  : <> · {t("brc.clean")}</>}
              </div>
            </div>
          </div>
          {/* Vad den bär: banners för en ägd pal (skräp gråas), och för en
              importerad står vägen i klartext – den har inga passiver än. */}
          {p.pal && p.pal.pv.length > 0 && (
            <div className="brhpv">
              {p.pal.pv.map((id) => (
                <span key={id} className={wanted.includes(id) ? "" : "jk"}>
                  <PassiveRow id={id} name={pname(id)} tier={pTier(id)} />
                </span>
              ))}
            </div>
          )}
          <div className="hint">
            {/* IV-delen i text, passiverna som banners ovanför. */}
            {rich("iv.headBrings", { state: <b>{ivText(p.ivMask)}</b> })}
            {p.imported && (
              <> {t("iv.headImported", {
                name: sp(p.imported.donor.s).name,
                iv: p.imported.donor.iv.join("/"),
                n: p.imported.steps.length,
                eggs: Math.ceil(p.imported.eggs),
                where: p.imported.donor.c,
              })}</>
            )}
          </div>
        </>
      );
    };

    /** Förälder i ett steg. IV står med: annars går två steg med samma art inte
     *  att skilja åt, och man vet inte vilken individ som menas. */
    const PlanParentChip = ({ p }: { p: PlanParent }) =>
      p.imported ? (
        /* Importerad byggsten: inte en pal du äger, utan en du avlar fram först.
           Brickan har **samma anatomi som en vanlig förälder** – porträtt, art,
           element, Paldeck-nummer, kön, IV – för den ÄR en förälder i planen
           (Kens rättning ×2: först låg hela artkedjan inuti brickan, sedan
           saknade den allt en förälder brukar visa). Det som skiljer är att
           könet inte är bestämt än och att IV bara är känd i statarna den bär:
           "–/100/–". Varifrån den kommer står som en kort svans; hela kedjan
           bor i "bär in"-blocket överst. */
        <span className="mini imp" title={sp(p.imported.donor.s).name}>
          <SpeciesIcon sp={sp(target)} size={22} radius={7} />
          {sp(target).name}
          <ElementIcons sp={sp(target)} size={14} />
          <DeckNo sp={sp(target)} />
          <span className="q">{t("iv.eitherGender")}</span>
          <span className="o">{importIv(p.imported)}</span>
          <span className="k">{t("iv.importChip", { stat: importStats(p.imported) })}</span>
          {/* Importen är numrerade steg i samma led nu, så brickan pekar på
              RADEN den blev färdig i – inte på "ur Skutlass, 2 steg". */}
          <span className="via">
            {t("iv.fromStep", { n: importRow.get(p.imported) ?? 0 })}
          </span>
        </span>
      ) : p.pal ? (
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
        <span className="mini step">{t("iv.fromStep", { n: rowOf(p.fromStep ?? 0) })}</span>
      );

    if (!mine.length) {
      return (
        <Section title={t("iv.sectionTitle", { name })}>
          <WarnBox>
            {t("iv.ownNone", { name })}
          </WarnBox>
        </Section>
      );
    }

    return (
      <Section
        title={t("iv.sectionTitle", { name })}
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
                    <div className="v">{ivTarget >= 100
                      ? t("iv.withHundred", { n: list.length })
                      : t("iv.withNear", { n: list.length, v: ivTarget })}</div>
                    <div className="hint">
                      {t("iv.best", {
                        name: sp(top.s).name,
                        g: top.g === "M" ? "♂" : "♀",
                        iv: top.iv.join("/"),
                      })}
                    </div>
                    {/* Andra arters 100:or räknas också, och de gjorde det inte
                        förut: en enda smutsig 100-bärare i arten är en dyr
                        förälder, och då kan en ren utifrån vara billigare även om
                        arten "har" staten (Kens fynd: hans defense-pals i basen). */}
                    {importFor(i) && (
                      <div className="hint">
                        {t("iv.alsoOutside", {
                          n: outsideCount(i),
                          steps: importFor(i)!.steps.length,
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="v">{ivTarget >= 100
                      ? t("iv.noneWithHundred")
                      : t("iv.noneWithNear", { v: ivTarget })}</div>
                    {/* Går 100:an att bära in utifrån är omslumpningen inte längre
                        svaret, och då får rutan inte stå kvar och säga att den är
                        det – 6,6 ägg mot 253 är skillnaden. */}
                    {importFor(i) ? (
                      <div className="hint">
                        {t("iv.canImport", {
                          n: importFor(i)!.steps.length,
                          eggs: Math.ceil(importFor(i)!.eggs),
                        })}
                      </div>
                    ) : (
                      <div className="hint bad">{t("iv.mustReroll", {
                          pct: ivOddsText(IV_RANDOM * (101 - ivTarget) / 101),
                        })}</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {stuck.length > 0 && (
          <WarnBox>
            {rich("iv.gapLead", {
              name,
              stats: <b>{stuck.map((i) => IV_LABELS[i]).join(", ")}</b>,
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
            {t("iv.alreadyPerfect", { name })}
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
            <h3 className="phase">
              {ivTarget >= 100
                ? t("iv.routeTitle", { n: items.length, name })
                : t("iv.routeTitleNear", { n: items.length, name, v: ivTarget })}
            </h3>
            <div className="sub">
              {t("iv.pathHint")}
              {perfect.imports.length > 0 && <> {t("iv.routeImportLead", { n: stepOffset })}</>}
            </div>
            {/* Fasen står som CHIP i stegets huvud, inte som egen rubrik – det är
                det som låter numreringen löpa 1 → N genom hela planen. Färgen
                säger vad steget uträttar. */}
            <div className="phlegend">
              {perfect.imports.length > 0 && <span className="ph imp">{t("iv.phImport")}</span>}
              <span className="ph iv">{t("iv.phIv")}</span>
              {wanted.length > 0 && <span className="ph pv">{t("iv.phPassives")}</span>}
              <span className="ph goalph">{t("route.goal")}</span>
            </div>
            <BreedRoute
              /* Huvudena är FÖRSTA radens föräldrar, vilken sorts rad det än är:
                 med import är det donatorn + partnern, annars etapp 1:s par. */
              heads={(() => {
                const first = items[0];
                if (first?.kind === "imp") {
                  const st = first.im.steps[0]!;
                  return [
                    {
                      species: sp(first.im.donor.s),
                      rows: [0],
                      card: donorHeadBody(first.im),
                    },
                    ...(st.partner
                      ? [{
                        species: sp(st.partner.s),
                        rows: [0],
                        card: partnerHeadBody(st.partner, sp(st.to).name),
                      }]
                      : []),
                  ];
                }
                return [first?.kind === "step" ? first.st.a : null, first?.kind === "step" ? first.st.b : null]
                  .filter((p): p is PlanParent => !!p && (!!p.pal || !!p.imported))
                  .map((p) => ({ species: sp(p.pal?.s ?? target), rows: [0], card: ivHeadBody(p) }));
              })()}
              rows={items.map((item, i): RouteRow => {
                const n = i + 1;
                const last = i === items.length - 1;
                if (item.kind === "imp") {
                  /* Ett artsteg i en import: en riktig parning, med linjen (eller
                     donatorn i första steget) plus en ägd partner. */
                  const { im, si } = item;
                  const st = im.steps[si]!;
                  return {
                    species: sp(st.to),
                    label: t("route.childStep", { n }),
                    kind: "mid",
                    card: (
                      <div className="brstep">
                        <div className="klbl">
                          <span className="stepnum">{n}</span>
                          <span className="ph imp">{t("iv.phImport")}</span>
                          {t("iv.importRow", { stat: importStats(im), name: sp(st.to).name })}
                          <span className="oddbadge">
                            🥚 {t("breed.perEgg", { odds: ivOddsText(st.odds) })} ·{" "}
                            {t("eggs.approx", { n: Math.ceil(st.eggs) })}
                          </span>
                        </div>
                        <div className="brcarry">
                          <span className="klbl2">{t("iv.childMustHave")}</span>
                          {im.stats.map((s) => (
                            <span key={s} className="ivchip">
                              {IV_LABELS[s]} <span className="n">100</span>
                            </span>
                          ))}
                        </div>
                        {/* Första radens föräldrar står som kort över leden. */}
                        {i > 0 && (
                          <div className="brparents">
                            {si === 0
                              ? <PlanParentChip p={{
                                pal: im.donor, ivMask: 0, pvMask: 0, junk: im.donorJunk,
                              }} />
                              /* FÖRRA raden, inte den här: linjen kommer ur
                                 steget innan. Ett `n` här hade fått steget att
                                 peka på sig självt. */
                              : <span className="mini step">{t("iv.fromStep", { n: n - 1 })}</span>}
                            ＋
                            {st.partner
                              ? <PlanParentChip p={{
                                pal: st.partner, ivMask: 0, pvMask: 0, junk: 0,
                              }} />
                              : <span className="mini">{sp(st.with).name}</span>}
                          </div>
                        )}
                        <div className="hint">
                          {si === 0
                            ? <>
                              {rich("iv.importWhy", {
                                stat: <b>{importStats(im)}</b>,
                                name,
                                reroll: <b>{t("iv.importReroll")}</b>,
                              })}
                              {im.donorJunk > 0 && <> {t("iv.importJunk", { n: im.donorJunk })}</>}
                              {!im.genderOk && <> {t("iv.importGender")}</>}
                            </>
                            : t("iv.importKeep", {
                              stat: importStats(im), name: sp(st.to).name,
                            })}
                        </div>
                      </div>
                    ),
                  };
                }
                const st = item.st;
                /* Vad steget uträttar avgör chipets färg: kommer en ny passiv in
                   är det passivsteget, annars är det 100:orna som samlas. */
                const newPv = pvIds(st.pvMask).length
                  > Math.max(pvIds(st.a.pvMask).length, pvIds(st.b.pvMask).length);
                return {
                  species: sp(target),
                  label: last ? t("route.goal") : t("route.childStep", { n }),
                  kind: last ? "goal" : "mid",
                  card: (
                    <div className="brstep">
                      <div className="klbl">
                        <span className="stepnum">{n}</span>
                        <span className={`ph ${last ? "goalph" : newPv ? "pv" : "iv"}`}>
                          {last ? t("route.goal") : newPv ? t("iv.phPassives") : t("iv.phIv")}
                        </span>
                        {ivText(st.ivMask)}
                        <span className="oddbadge">
                          🥚 {t("breed.perEgg", { odds: ivOddsText(st.odds) })} ·{" "}
                          {ivEggsText(st.odds, t.locale)}
                        </span>
                      </div>
                      {/* Passiverna ungen ska ha – som banners, precis som i
                          passivplanen och överallt annars. */}
                      {pvIds(st.pvMask).length > 0 && (
                        <div className="brcarry">
                          <span className="klbl2">{t("brc.carry")}</span>
                          <Chips ids={pvIds(st.pvMask)} />
                        </div>
                      )}
                      {i > 0 && (
                        <div className="brparents">
                          <PlanParentChip p={st.a} />＋<PlanParentChip p={st.b} />
                        </div>
                      )}
                      <div className="hint">
                        {/* Bara IV-delen i texten: passiverna står som banners ovanför,
                            och att räkna upp dem en gång till är bara mer text. */}
                        {rich("iv.keepChild", { state: <b>{ivText(st.ivMask)}</b> })}{" "}
                        IV {ivOddsText(st.ivOdds)}
                        {st.pvOdds < 1 && (
                          <> × {t("iv.passivesWord")} {ivOddsText(st.pvOdds)} ({t("brc.pool", { n: st.pool })})</>
                        )}
                        {" = "}{ivOddsText(st.odds)}.
                        {st.genderEggs > 0 && (
                          <> {t("iv.ofWhichGender", { n: Math.ceil(st.genderEggs) })}</>
                        )}
                        {st.sharesClutchWith.length > 0 && (
                          <> {rich("iv.sharedClutch", {
                            steps: <b>{st.sharesClutchWith.map(rowOf).join(", ")}</b>,
                          })}</>
                        )}
                      </div>
                    </div>
                  ),
                };
              })}
            />

            <div className="ivsum">
              <div className="col">
                <span className="k">{t("iv.stagesWord")}</span>
                <b>{ivEggsText(1 / perfect.totalEggs)}</b>
                <span className="hint">
                  {t("iv.totalOver", { n: items.length })} · {eggTime(perfect.totalEggs)}
                </span>
              </div>
              {/* Fruktsvansen: i nära läge slutar leden på 90+, och de sista tio
                  poängen per stat tas med en frukt. Utan den här kolumnen ser
                  planen billigare ut än den är. */}
              {ivTarget < 100 && (
                <div className="col">
                  <span className="k">{t("iv.thenFruits")}</span>
                  <b>{t("iv.fruitCount", { n: 3 * Math.ceil((100 - ivTarget) / 10) })}</b>
                  <span className="hint">{t("iv.thenFruitsHint")}</span>
                </div>
              )}
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
                    <span className="k">{t("iv.winWord")}</span>
                    <b>
                      {perfect.direct.eggs > perfect.totalEggs
                        ? t("iv.cheaperBy", {
                          n: Math.round(perfect.direct.eggs / perfect.totalEggs),
                        })
                        : t("iv.noGain")}
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
            {t("iv.noPath")} {t("iv.noPathGetMore", { name })}
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

  function PassivePlanSection({ plan, target, haveOne }: {
    plan: NonNullable<ReturnType<typeof buildPassivePlan>>;
    target: number | null;
    /** Satt när planen är "så här avlar du en till" – palen du redan har. */
    haveOne: string | null;
  }) {
    /* Kortinnehållet för pals som står på leden. Bärare/partner som paras in
       i ett senare steg får sitt kort VID steget (RouteRow.join) – överst står
       bara linjens start, annars läses parningen fel (Kens rättning). */
    const carrierBody = (pal: ScoredPal, gives: string[]) => (
      <>
        <div className="brhwho">
          <span className="brhp"><SpeciesIcon sp={sp(pal.s)} size={40} radius={20} /></span>
          <div>
            <div className="nm">{sp(pal.s).name} {pal.g === "M" ? "♂" : "♀"}</div>
            <div className="meta">
              {t("pp.carrier")} · <DeckNo sp={sp(pal.s)} /> · IV {pal.iv.join("/")}
              {pal.pv.length === gives.length && <> · {t("brc.clean")}</>}
            </div>
          </div>
        </div>
        <div className="brhpv">
          {pal.pv.map((id) => (
            <span key={id} className={wanted.includes(id) ? "" : "jk"}>
              <PassiveRow id={id} name={pName(id)} tier={pTier(id)} />
            </span>
          ))}
        </div>
        <div className="hint">
          {gives.length > 1 && <>{t("pp.savesSteps", { n: gives.length - 1 })} </>}
          {t("pp.alternatives")} {gives.map((id) => {
            const info = plan.carrierInfo.find((c) => c.passiveId === id);
            return `${pName(id)} ${info?.carriers.length ?? 0}`;
          }).join(" · ")}.
        </div>
      </>
    );
    const partnerBody = (pal: ScoredPal) => (
      <>
        <div className="brhwho">
          <span className="brhp"><SpeciesIcon sp={sp(pal.s)} size={40} radius={20} /></span>
          <div>
            <div className="nm">{sp(pal.s).name} {pal.g === "M" ? "♂" : "♀"}</div>
            <div className="meta">
              {t("brc.partnerRole")} · <DeckNo sp={sp(pal.s)} /> · IV {pal.iv.join("/")}
              {pal.pv.length === 0 && <> · {t("brc.clean")}</>}
              {" · "}{pal.c}
            </div>
          </div>
        </div>
        {pal.pv.length > 0 && (
          <div className="brhpv">
            {pal.pv.map((id) => (
              <span key={id} className={wanted.includes(id) ? "" : "jk"}>
                <PassiveRow id={id} name={pName(id)} tier={pTier(id)} />
              </span>
            ))}
          </div>
        )}
      </>
    );
    /* Föräldrarna som brickor INUTI stegkortet – artefaktens `.parentrow`.
       Steg 2 och framåt visar båda föräldrarna så här i stället för att lyfta
       partnern till ett eget kort på leden med gren och knutpunkt: parningen
       hör hemma i steget den beskriver, och ryggraden blir en enda obruten
       linje igen (Kens val aug 2026 efter jämförelse med artefakten – ersätter
       knutpunkts-modellen).
       Första stegets föräldrar står fortfarande ÖVERST som par: de startar
       linjen och har ingen unge ovanför sig att stå bredvid. */
    const parentChip = (
      key: string, species: Species, name: ReactNode, note: ReactNode, brings: readonly string[] = [],
    ) => (
      <div
        key={key}
        className="brparent"
        style={{ "--elc": elementColor(species) } as React.CSSProperties}
      >
        <span className="brpp"><SpeciesIcon sp={species} size={28} radius={14} /></span>
        <div className="brpi">
          <div className="nm">{name}</div>
          <div className="iv">{note}</div>
        </div>
        {brings.length > 0 && <Chips ids={brings} />}
      </div>
    );

    /** En ägd pal som förälder: art, kön, roll och var den står. */
    const ownedParentChip = (key: string, pal: ScoredPal, role: string, brings: readonly string[]) =>
      parentChip(
        key,
        sp(pal.s),
        <>
          {sp(pal.s).name} {pal.g === "M" ? "♂" : "♀"}
          <span className="klbl2">{role}{pal.pv.length === 0 ? ` · ${t("brc.clean")}` : ""}</span>
        </>,
        <>IV {pal.iv.join("/")} · {pal.c}</>,
        brings,
      );

    const carrierCards = carriersOf(plan);
    const carrierOf = (id: string) => carrierCards.find((c) => c.pal.id === id);
    const firstMerge = plan.mergeSteps[0];

    /* Fas 2:s början. Hoppas fas 1 över (alla önskade passiver satt redan på en
       pal) äger artkedjan linjens start – och då ska FÖRSTA STEGETS BÅDA
       föräldrar stå överst som ett par, precis som skissens Beakon ＋ Sibelyx.
       Det är samma regel fas 1 redan följer (`join: i > 0`): överst står bara
       första stegets föräldrar, senare steg får sin partner vid steget.
       Fas 2 följde den inte, så startpalen stod ensam överst medan steg 1:s
       partner låg som anslutande sidokort — fast båda är föräldrar till samma
       unge (Kens fynd aug 2026).
       Fortsätter linjen uppifrån (fas 1 finns) är den andra föräldern ingen
       pal utan linjen själv, och då finns inget par att ställa upp: partnern
       hör hemma vid sitt steg som förut. */
    const lineHead = plan.mergeSteps.length ? null : plan.start ?? null;
    const headPartner = lineHead ? plan.speciesPhase?.[0]?.partner ?? null : null;

    return (
      <Section
        title={t("pp.title")}
        sub={t("pp.sub")}
      >
        {/* Du har redan en – planen under är vägen till nästa. Rutan står först
            av allt: annars läser man en plan med äggsiffror direkt efter "klart"
            och tror att något räknat fel. */}
        {haveOne && (
          <OkBox>
            {rich("pp.haveOneRoute", { pal: <b>{haveOne}</b> })}
          </OkBox>
        )}
        {/* Planen är låst till en pal man valt i manuellt läge. Står överst i
            planen och inte i modalen: modalen är stängd när man läser planen,
            och en plan som ser onödigt dyr ut måste kunna förklara sig själv. */}
        {plan.forced && (
          <OkBox>
            {plan.forcedCovers > 0
              ? t("pp.forced", { name: plan.forced.nick || sp(plan.forced.s).name })
              : t("pp.forcedNoCover", { name: plan.forced.nick || sp(plan.forced.s).name })}
          </OkBox>
        )}
        {/* Bärarkorten bor PÅ leden (BreedRoute heads) sedan artefaktjämförelsen
            – här ligger bara passiver som saknar bärare kvar som varningar. */}
        {plan.carrierInfo.some((c) => !c.chosen) && (
          <div className="cargrid">
            {plan.carrierInfo.filter((c) => !c.chosen).map((c) => (
              <div key={c.passiveId} className="stepcard" style={{ margin: 0 }}>
                <PassiveRow id={c.passiveId} name={pName(c.passiveId)} tier={pTier(c.passiveId)} />
                <div className="hint bad" style={{ marginTop: 7 }}>
                  {t("pp.nobodyHasIt")}
                </div>
              </div>
            ))}
          </div>
        )}

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
                {/* Bärare = pals som bidrar med en önskad passiv. Partnern i ett
                    "avla en till"-par gör inte det och ska inte räknas. */}
                <h3 className="phase">{t.plural("pp.phase1", carrierCards.length, { n: carrierCards.length })}</h3>
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
                {/* Leden i artefaktens form: bärarkorten ÄR startpunkterna
                    (heads) och grenarna rinner från dem ner i första ungen.
                    Stegkorten är kompakta: etikett → "kläck tills ungen bär" →
                    pillerrad. Landar fas 1 redan i målarten avslutas linjen
                    med målringen här. */}
                <BreedRoute
                  /* Huvudena är FÖRSTA STEGETS FÖRÄLDRAR, inte "bärarkorten som
                     råkar vara med i steg 1". Skillnaden syns så fort en förälder
                     inte bär någon önskad passiv – en pal man låst planen till i
                     manuellt läge, till exempel. Den är då ingen bärare och finns
                     inte i `carrierCards`, så den försvann ur paret trots att
                     steget under nämner den vid namn (Kens fynd aug 2026). */
                  heads={[firstMerge?.a, firstMerge?.b]
                    .map((p) => p?.pal ?? null)
                    .filter((p): p is ScoredPal => !!p)
                    .map((pal) => ({
                      species: sp(pal.s),
                      rows: [0],
                      /* Bär föräldern ingen av de önskade passiverna är den
                         PARTNER, inte bärare: en pal man låst planen till i
                         manuellt läge, eller den andra föräldern när den ena
                         redan bär allt ("avla en till"). Bärarkortet skulle
                         annars kalla den CARRIER och skriva ut ett tomt
                         "Alternativ i boxen:". */
                      card: carrierOf(pal.id)?.gives.length
                        ? carrierBody(pal, carrierOf(pal.id)!.gives)
                        : partnerBody(pal),
                    }))}
                  rows={plan.mergeSteps.map((st, i): RouteRow => {
                    const clash = !st.genderOk && st.a.pal && st.b.pal;
                    const last = i === plan.mergeSteps.length - 1;
                    /* Rollmärkta namn: "Lunaris (bärare) ＋ steg 1-ungen →
                       Lunaris (ny unge)" – utan rollerna såg det ut som att
                       Lunaris parades med sig själv när partabellen råkar ge
                       en unge av samma art som bäraren. */
                    const nameOfParent = (p: typeof st.a) =>
                      p.pal
                        /* Samma predikat som korten och som chipsen i senare steg
                           (`carrierOf`): bärare är den planen HÄMTAR en önskad
                           passiv ur. Bär den andra föräldern samma passiv men
                           behövs inte för den är den partner – annars stod det
                           "(carrier) ＋ (carrier)" över ett kort märkt PARTNER. */
                        ? `${sp(p.species).name} (${t(carrierOf(p.pal.id)?.gives.length ? "brc.carrierWord" : "brc.partnerWord")})`
                        : t("brc.stepChild", { n: p.fromStep ?? 0 });
                    const childSameAsParent = st.possible
                      && (st.childSpecies === st.a.species || st.childSpecies === st.b.species);
                    const childName = !st.possible ? "—"
                      : childSameAsParent
                        ? `${sp(st.childSpecies).name} (${t("brc.newPal")})`
                        : sp(st.childSpecies).name;
                    /* Vad varje förälder tar med sig in i linjen står numera på
                       dess egen bricka (`p.gives`), så ingen separat rad
                       behövs för "vilken passiv avlas vi in?". */
                    return {
                      species: sp(st.possible ? st.childSpecies : st.a.species),
                      label: st.possible ? t("route.childStep", { n: st.n }) : t("route.blocked"),
                      kind: last && target !== null && plan.lineSpecies === target ? "goal" : "mid",
                      card: (
                        <div className="brstep">
                          <div className="klbl">
                            <span className="stepnum">{st.n}</span>
                            {t("brc.lead", {
                              phase: 1,
                              a: nameOfParent(st.a),
                              b: nameOfParent(st.b),
                              child: childName,
                            })}
                          </div>
                          {st.possible ? (
                            <>
                              {/* Steg 2+ visar båda föräldrarna här; steg 1:s
                                  föräldrar är ledens huvuden längst upp. */}
                              {i > 0 && (
                                <div className="brparents">
                                  {[st.a, st.b].map((p, k) => (p.pal
                                    ? ownedParentChip(
                                      `p${k}`, p.pal,
                                      carrierOf(p.pal.id) ? t("brc.carrierWord") : t("brc.partnerRole"),
                                      p.gives,
                                    )
                                    /* Ungen ur ett tidigare steg är ingen ägd
                                       pal: den får text i stället för banners,
                                       precis som artefaktens "bär alla fyra".
                                       Banners hör till de ägda föräldrarna. */
                                    : parentChip(
                                      `p${k}`, sp(p.species),
                                      t("brc.stepChild", { n: p.fromStep ?? 0 }),
                                      t("brc.carriesAll", { n: p.gives.length }),
                                    )))}
                                </div>
                              )}
                              <div className="brcarry">
                                <span className="klbl2">{t("brc.carry")}</span>
                                <Chips ids={st.haveAfter} />
                              </div>
                              <div className="brpills">
                                <OddsBadge odds={oddsText(st.odds)} eggs={eggsText(st.odds)} />
                                <span className="bpill">{t("brc.pool", { n: st.pool })}</span>
                                {st.genderEggs > 0
                                  ? <span className="bpill">{t("brc.genderCost", { n: Math.ceil(st.genderEggs) })}</span>
                                  : <span className="bpill">{t("brc.genderFree")}</span>}
                                {childSameAsParent && (
                                  <span className="bpill">{t("brc.sameSpecies")}</span>
                                )}
                              </div>
                              {clash && (
                                <div className="hint bad">
                                  ⚠ {t(st.a.pal!.g === "M" ? "pp.bothMale" : "pp.bothFemale")}
                                </div>
                              )}
                              <div className="hint">{t("pp.hatchUntil")}</div>
                            </>
                          ) : (
                            <div className="hint bad">
                              ⚠ {t("pp.cantBreedLead")}{" "}
                              {t("pp.impossiblePair", { name: sp(st.a.species).name })}
                            </div>
                          )}
                        </div>
                      ),
                    };
                  })}
                />
              </>
            )}
            {target !== null && plan.lineSpecies === target && (
              <OkBox>{t("pp.landsInTarget", { name: sp(target).name })}</OkBox>
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
            {/* Likvärdiga vägar: samma antal steg, och du får välja. Visas bara
                när det FINNS något att välja mellan – en ensam väg är inget val,
                och en rad som säger "1 alternativ" är bara mer text.
                Priset står på varje knapp: alla är lika långa, men inte
                nödvändigtvis lika dyra, och det ska synas innan man låser. */}
            {/* Hopfälld som standard: sex vägar är sex rader, och man byter
                kedja sällan. Sammanfattningen visar därför den väg som FAKTISKT
                används – man ska kunna se vilken det blev utan att fälla ut. */}
            {plan.chainOptions.length > 1 && target !== null && (
              <details className="chainpick">
                <summary className="cphd">
                  <span className="k">{t("chain.title", { n: plan.chainOptions.length })}</span>
                  <span className="cpnow">
                    {(plan.chainOptions.find(
                      (o) => plan.chainPinned && o.codes.join(" ") === pinnedChain.join(" "),
                    ) ?? plan.chainOptions[0]!).steps.map((st) => (
                      <SpeciesMini key={st.to} sp={sp(st.to)} />
                    ))}
                  </span>
                  {plan.chainPinned && <span className="cptag">{t("chain.pickedTag")}</span>}
                </summary>
                {/* Knappen bor i kroppen, inte i summary: en knapp inuti en
                    summary är både ogiltig HTML och omöjlig att klicka utan att
                    panelen fälls ihop. */}
                {plan.chainPinned && (
                  <button type="button" className="ghost sm cpauto" onClick={() => setPinnedChain([])}>
                    {t("chain.auto")}
                  </button>
                )}
                <div className="cprow">
                  {plan.chainOptions.map((o, i) => {
                    const picked = plan.chainPinned
                      ? o.codes.join(" ") === pinnedChain.join(" ")
                      : i === 0;
                    return (
                      <button
                        key={o.codes.join(" ")}
                        type="button"
                        className={`cpopt${picked ? " on" : ""}`}
                        aria-pressed={picked}
                        onClick={() => setPinnedChain(picked && plan.chainPinned ? [] : o.codes)}
                      >
                        <span className="cpway">
                          {o.steps.map((st) => (
                            <SpeciesMini key={st.to} sp={sp(st.to)} />
                          ))}
                        </span>
                        <span className="cpeggs">
                          {eggsText(1 / o.eggs)}
                          {i === 0 && <em>{t("chain.cheapest")}</em>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </details>
            )}
            {plan.speciesPhase && target !== null && (
              <>
                <h3 className="phase">{t("pp.phase2", { name: sp(target).name })}</h3>
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
                {/* Artkedjan som led, i artefaktens kompakta form. Partnerna
                    står som kort på leden med gren till sina steg – linjen
                    själv är din linje från fas 1. Sista raden får målringen.
                    När fas 1 HOPPAS ÖVER (alla passiver på en pal) börjar
                    linjen här – då är startpalen ledens huvud, annars pekade
                    strecket uppåt på ingenting och "DIN LINJE + partner" hade
                    inget kort (Kens fynd aug 2026). */}
                <BreedRoute
                  heads={lineHead ? [
                    {
                      species: sp(lineHead.s),
                      rows: [0],
                      card: carrierBody(lineHead, plan.usable),
                    },
                    // Andra föräldern till samma unge – paret, inte ett sidokort.
                    ...(headPartner ? [{
                      species: sp(headPartner.s),
                      rows: [0],
                      card: partnerBody(headPartner),
                    }] : []),
                  ] : []}
                  rows={plan.speciesPhase.map((st, i): RouteRow => ({
                  species: sp(st.to),
                  label: i === plan.speciesPhase!.length - 1
                    ? t("route.goal")
                    : t("route.childStep", { n: i + 1 }),
                  kind: i === plan.speciesPhase!.length - 1 ? "goal" : "mid",
                  card: (
                    <div className="brstep">
                      <div className="klbl">
                        <span className="stepnum">{i + 1}</span>
                        {t("brc.lead", {
                          phase: 2,
                          a: i === 0 ? t("pp.yourLine") : t("brc.stepChild", { n: i }),
                          b: `${sp(st.with).name} (${t("brc.partnerWord")})`,
                          child: st.to === st.with
                            ? `${sp(st.to).name} (${t("brc.newPal")})`
                            : sp(st.to).name,
                        })}
                        {uniqueChildren.has(st.to) && <Tag kind="lucky">{t("breed.uniqueCombo")}</Tag>}
                      </div>
                      {/* Båda föräldrarna som brickor – utom i steg 1 när
                          linjen börjar här, då de är ledens huvuden. */}
                      {!(i === 0 && headPartner) && (
                        <div className="brparents">
                          {parentChip(
                            "line", sp(i === 0 ? (lineHead ? lineHead.s : st.from) : plan.speciesPhase![i - 1]!.to),
                            i === 0 ? t("pp.yourLine") : t("brc.stepChild", { n: i }),
                            t("brc.carriesAll", { n: plan.usable.length }),
                          )}
                          {st.partner
                            && ownedParentChip("partner", st.partner, t("brc.partnerRole"), [])}
                        </div>
                      )}
                      {!st.partner && <div className="hint">{t("sp.partner")} ?</div>}
                      {!st.genderOk && st.partner && (
                        <div className="hint bad">
                          ⚠ {t(st.partner.g === "M" ? "brc.needFemale" : "brc.needMale")}
                        </div>
                      )}
                      <div className="brcarry">
                        <span className="klbl2">{t("brc.keeps")}</span>
                        <Chips ids={plan.usable} />
                      </div>
                      <div className="brpills">
                        <OddsBadge odds={oddsText(st.odds)} eggs={eggsText(st.odds)} />
                        <span className="bpill">
                          {st.partnerJunk > 0
                            ? t("brc.poolJunk", { n: st.pool, j: st.partnerJunk })
                            : t("brc.poolClean", { n: st.pool })}
                        </span>
                        {st.to === st.with && (
                          <span className="bpill">{t("brc.sameSpecies")}</span>
                        )}
                        {st.note && <span className="bpill">{st.note}</span>}
                      </div>
                    </div>
                  ),
                }))} />
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
                  {uniqueChildren.has(target) && <Tag kind="lucky">{t("breed.uniqueCombo")}</Tag>}
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
                {uniqueChildren.has(st.to) && <Tag kind="lucky">{t("breed.uniqueCombo")}</Tag>}
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
          {uniqueChildren.has(node.s) && <Tag kind="lucky">{t("breed.uniqueCombo")}</Tag>}
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
