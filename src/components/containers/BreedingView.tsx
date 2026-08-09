"use client";

/* Smart: breeding-planeraren – mål, bas, önskade passiver → plan med odds. */
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePalData } from "@/context/PalDataContext";
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
import { implantAdvice } from "@/lib/implants";
import type { AppData, BreedTree, ScoredPal, WorkType } from "@/lib/types";
import { AltRouteBlock } from "@/components/ui/AltRouteBlock";
import { OddsBadge, OkBox, SpeciesMini, StepCard, WarnBox } from "@/components/ui/BreedBits";
import { BreedSetupPanel } from "@/components/ui/BreedSetup";
import { GoalCard } from "@/components/ui/GoalCard";
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
      Oddsen ovan är chansen att ungen får <b>minst</b> de önskade passiverna.{" "}
      {noRoom ? (
        <>
          Med fyra önskade finns ingen ledig plats kvar, så där är <b>exakt</b> samma
          sak som <b>minst</b> – blir det fyra rätt kan inget skräp följa med.
        </>
      ) : (
        <>
          Vill du ha <b>exakt</b> dem och inget mer är sista steget{" "}
          <b>{oddsText(exact)} per ägg</b> ({eggsText(exact)}), eftersom spelet slumpar in
          minst en extra passiv i {Math.round(RANDOM_EXTRA_ODDS * 100)} % av alla ägg –
          oberoende av hur ren poolen är. Det går alltså inte att avla bort, bara att
          kläcka förbi.
        </>
      )}
    </div>
  );
}

export function BreedingView() {
  const { data, pals, ownedSpecies, bestOf, freeSolve } = usePalData();
  const params = useSearchParams();
  const router = useRouter();
  const initialTarget = useMemo(() => {
    const t = params.get("target");
    const idx = t ? Number.parseInt(t, 10) : Number.NaN;
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
  const current = useMemo<BreedingPrefs>(
    () => ({ target, base, wanted, ivGoal, purpose, work }),
    [target, base, wanted, ivGoal, purpose, work],
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

  /** Föräldrar väljs alltid renast först; IV-målet avgör bara vid lika renhet. */
  const prefs = useMemo<ParentPrefs>(
    () => ({ ivGoal, wanted: new Set(wanted) }),
    [ivGoal, wanted],
  );

  const uniqueChildren = useMemo(() => new Set(data.uniques.map((u) => u[2])), [data]);
  /** Antal pals i boxen per passiv – visas på varje banner i väljaren. */
  const passiveCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pals) for (const id of p.pv) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [pals]);

  const plan = useMemo(
    () => (wanted.length ? buildPassivePlan(data, pals, ownedSpecies, wanted, target, prefs) : null),
    [data, pals, ownedSpecies, wanted, target, prefs],
  );

  /** Förslagen räknas ur passivernas effekter och anpassas efter målets element. */
  const rec = useMemo(() => {
    const def = PURPOSES.find((p) => p.id === purpose);
    if (!def) return { picks: [], missing: [] };
    return recommendPassives(data, passiveCounts, {
      purpose: def,
      target: target !== null ? data.species[target]! : null,
      work,
    });
  }, [data, passiveCounts, purpose, target, work]);

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
  const ImplantBox = () => {
    if (wanted.length < 2) return null;
    const a = implantAdvice(wanted);

    if (!a.implantable.length) {
      return (
        <div className="okbox">
          <b>Inget av det här kan opereras in.</b> Pal Surgery Table har inga implantat för
          de {wanted.length} du valt – allt på legendarisk nivå måste avlas eller fångas.
          Planen nedan är alltså hela vägen.
        </div>
      );
    }

    const left = a.bred.length;
    return (
      <div className="okbox">
        <b>
          {left === 0
            ? "Du behöver inte avla någon av dem."
            : `Avla ${left}, operera in ${a.implantable.length === 1 ? "den sista" : "resten"}.`}
        </b>{" "}
        <Chips ids={a.implantable} label="finns som implantat:" />{" "}
        {left > 0 && <Chips ids={a.bred} label="måste avlas:" />}
        <div className="hint">
          Sätt {a.implantable.length === 1 ? "den" : "dem"} med <b>Pal Surgery Table</b> på den{" "}
          <b>färdiga</b> palen, efter avlingen – då hamnar {a.implantable.length === 1 ? "den" : "de"}{" "}
          aldrig i arvspoolen. Planen krymper från {wanted.length} till {left} önskade:
          sista steget går <b>{Math.round(a.oddsAll * 100)} %</b> →{" "}
          <b>{Math.round(a.oddsBred * 100)} %</b> per ägg, alltså{" "}
          <b>~{a.saving.toFixed(1).replace(".", ",")}× färre ägg</b>.{" "}
          {left > 0 && <>Och platsen du opererar i är oftast redan upptagen av en slumpad
            passiv – 35 % av alla ägg får en – så du ersätter skräp, inte något du vill ha.{" "}</>}
          Bordet kräver teknologinivå 38 och varje ingrepp kostar guld, så rutan svarar på
          om det <i>går</i> – inte på om guldet är värt det.
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
          Valen sparas – du kan gå till Boxen och tillbaka utan att tappa planen.
        </span>
        <button
          type="button"
          className="ghost sm"
          onClick={clearAll}
          disabled={!hasBreedingPrefs(current)}
        >
          Rensa allt
        </button>
      </div>

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
            title={<>Mål-pal {target !== null && <span className="picked">{sp(target).name}</span>}</>}
            sub="Vilken art vill du få fram? Arter du redan äger ligger först."
          >
            <PalPicker
              species={data.species}
              owned={ownedSpecies}
              value={target}
              onChange={setTarget}
            />
            <details className="baseblock">
              <summary>
                Bas att utgå från: <b>{base === null ? "fritt läge" : sp(base).name}</b>
              </summary>
              <div className="sub" style={{ margin: "8px 0 6px" }}>
                Välj en art du äger om kedjan ska starta där. I fritt läge letar appen
                den kortaste vägen från hela boxen.
              </div>
              <PalPicker
                species={data.species}
                owned={ownedSpecies}
                value={base}
                onChange={setBase}
                ownedOnly
                noneLabel="Fritt läge"
              />
            </details>

            <div className="ivgoal">
              <span className="meta">IV-mål:</span>
              <button
                type="button"
                className={`fchip ${ivGoal === "fast" ? "on" : ""}`}
                onClick={() => setIvGoal("fast")}
              >
                Snabb optimal
              </button>
              <button
                type="button"
                className={`fchip ${ivGoal === "perfect" ? "on" : ""}`}
                onClick={() => setIvGoal("perfect")}
              >
                Perfekt 100/100/100
              </button>
            </div>
            <div className="hint">
              {ivGoal === "fast"
                ? "Väljer föräldrarna med bäst IV-snitt bland dem du äger – bra resultat direkt."
                : "Väljer föräldrar efter sin svagaste stat, så alla tre kan nå 100. Räkna med fler kläckningar."}
              {wanted.length > 0 && " Passiverna går alltid först: renast möjliga förälder vinner före IV."}
            </div>
          </Section>

          {/* Planen nedan är steg och odds – den visar aldrig hur resultatet ser
              ut. Målbilden gör det, och fyller samtidigt tomrummet som uppstår
              när passiv-väljaren till höger är dubbelt så hög. */}
          <Section
            title="Målbild"
            sub="Så ser palen ut när planen är klar – arten du valt med precis de här passiverna."
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
          title={<>Önskade passiver <span className="picked">{wanted.length}/{MAX_WANTED}</span></>}
          sub="Välj vad palen ska användas till så föreslår appen passiver – eller klicka fram dem själv. Siffran är antal bärare i boxen."
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
                      aria-label="Ta bort"
                      onClick={() => setWanted((w) => w.filter((x) => x !== id))}
                    >
                      ✕
                    </button>
                  }
                />
              ))
            ) : (
              <div className="prow sm empty">
                <span className="nm">Inga valda – t.ex. Legend, Musclehead, Swift</span>
                <span className="arr" />
              </div>
            )}
          </div>
          <PassivePicker
            passives={data.passives}
            counts={passiveCounts}
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
          Välj en mål-pal och/eller önskade passiver ovan. Exempel: mål <b>Anubis</b> + passiver{" "}
          <b>Legend, Musclehead, Vanguard</b> → komplett plan med odds per steg.
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
          {p.junk > 0 && <span className="jk">+{p.junk} skräp</span>}
        </span>
      ) : (
        <span className="mini step">resultat ur steg {p.fromStep}</span>
      );

    if (!mine.length) {
      return (
        <Section title={`Perfekt IV · ${name}`}>
          <WarnBox>
            Du äger ingen {name} än, så det finns inget att avla med. Följ art-vägen nedan
            först – sikta redan där på föräldrar med höga IV, för barnet ärver deras statar.
          </WarnBox>
        </Section>
      );
    }

    return (
      <Section
        title={`Perfekt IV · ${name}`}
        sub="Varje stat ärvs för sig: 30 % från pappan, 30 % från mamman, 40 % helt omslumpat. Därför går 100:orna att samla ihop – siffrorna är uppskattningar."
      >
        {iv.missingGender && (
          <WarnBox>
            Du har bara ett kön av {name}. Skaffa en till av motsatt kön – utan ♂+♀ går
            det inte att avla vidare på arten.
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
                      bäst: {sp(top.s).name} {top.g === "M" ? "♂" : "♀"} · IV {top.iv.join("/")}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="v">ingen med 100</div>
                    <div className="hint bad">måste slumpas fram (≈1 % per ägg)</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {iv.gaps.length > 0 && (
          <WarnBox>
            Ingen av dina {name} har 100 i{" "}
            <b>{iv.gaps.map((i) => IV_LABELS[i]).join(" och ")}</b>. Den staten kan bara komma
            ur 40 %-omslumpningen – ungefär ett ägg på hundra – vilket är det som gör planen
            nedan dyr.
            {donors.some((d) => d.pals.length > 0) && (
              <>
                {" "}Genväg: para in en 100:a utifrån. De här arterna bär den <b>och</b> parar
                tillbaka till {name}, så linjen behåller sin art:
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
            {wanted.length > 0 && " och alla önskade passiver"} –{" "}
            {palShort(perfect.alreadyDone, name)}. Inget mer avlande behövs.
          </OkBox>
        )}

        {perfect.missingPassives.length > 0 && (
          <WarnBox>
            Ingen av dina {name} bär{" "}
            <b>
              <PassiveNames
                items={perfect.missingPassives.map((id) => ({ id, name: pname(id) }))}
              />
            </b>.
            Den måste hämtas in från en annan art först – se passiv-planen nedan. Planen här
            räknar bara på det som faktiskt går att ärva inom arten.
          </WarnBox>
        )}

        {!perfect.alreadyDone && perfect.possible && (
          <>
            <h3 className="phase">Kortaste vägen · {perfect.steps.length} steg</h3>
            <div className="sub">
              Varje steg parar ihop två individer och du behåller ungen som fick allt i
              rutan. Ordningen är uträknad: att slå ihop två rena bärare först och väva in
              passiverna sent är nästan alltid billigare än att utgå från en pal som redan
              har mycket – varje extra passiv en förälder bär hamnar i arvspoolen.
            </div>
            {perfect.steps.map((st) => (
              <StepCard
                key={st.n}
                num={st.n}
                hint={
                  <>
                    Behåll ungen med <b>{stateText(st.ivMask, st.pvMask)}</b>. Odds:{" "}
                    IV {ivOddsText(st.ivOdds)}
                    {st.pvOdds < 1 && <> × passiver {ivOddsText(st.pvOdds)} (pool {st.pool})</>}
                    {" = "}{ivOddsText(st.odds)}.
                    {st.genderEggs > 0 && (
                      <> Varav ~{Math.ceil(st.genderEggs)} ägg för att träffa rätt kön.</>
                    )}
                    {st.sharesClutchWith.length > 0 && (
                      <> Samma föräldrapar som steg{" "}
                        <b>{st.sharesClutchWith.join(" och ")}</b> – en kull ger båda ungarna,
                        så kostnaden är delad.</>
                    )}
                  </>
                }
              >
                <PlanParentChip p={st.a} />＋<PlanParentChip p={st.b} />→
                <span className="meta">{stateText(st.ivMask, st.pvMask)}</span>
                <span className="oddbadge">
                  🥚 {ivOddsText(st.odds)} / ägg · {ivEggsText(st.odds)}
                </span>
              </StepCard>
            ))}

            <div className="ivsum">
              <div className="col">
                <span className="k">Etappvis</span>
                <b>{ivEggsText(1 / perfect.totalEggs)}</b>
                <span className="hint">
                  totalt över {perfect.steps.length} steg · {eggTime(perfect.totalEggs)}
                </span>
              </div>
              {perfect.direct && (
                <>
                  <div className="col dim">
                    <span className="k">Direkt i ett steg</span>
                    <b>{ivEggsText(perfect.direct.odds)}</b>
                    <span className="hint">
                      bästa paret du kan sätta ihop just nu
                    </span>
                  </div>
                  <div className="col win">
                    <span className="k">Vinst</span>
                    <b>
                      {perfect.direct.eggs > perfect.totalEggs
                        ? `${Math.round(perfect.direct.eggs / perfect.totalEggs)}× billigare`
                        : "ingen"}
                    </b>
                    <span className="hint">att gå etappvis</span>
                  </div>
                </>
              )}
            </div>
            <div className="hint">
              Uppskattningar. <b>Kön räknas in</b>: en unge ur ett tidigare steg
              som måste ha ett bestämt kön kostar i snitt dubbelt, eftersom könet är slumpat.
              Steg som delar föräldrapar hämtar dessutom sina ungar ur <b>samma kull</b> och
              räknas därför bara en gång.
            </div>
          </>
        )}

        {!perfect.alreadyDone && !perfect.possible && !perfect.missingGender && (
          <WarnBox>
            Ingen väg hittades inom arten. Det beror nästan alltid på att du bara äger en
            {" "}{name} – skaffa fler och kolla deras IV.
          </WarnBox>
        )}

        {wanted.length > 0 && perfect.possible && !perfect.alreadyDone && (
          <div className="hint">
            IV och passiver rullas <b>var för sig</b> – en unge med rätt passiver kan ha uselt
            IV och tvärtom. Planen ovan tar hänsyn till båda samtidigt och lägger in passiverna
            i det steg där de kostar minst, i stället för att alltid ta dem först.
          </div>
        )}
      </Section>
    );
  }

  function PassivePlanSection({ plan, target }: { plan: NonNullable<ReturnType<typeof buildPassivePlan>>; target: number | null }) {
    return (
      <Section
        title="Passiv-plan"
        sub="Så samlar du ihop passiverna innan (eller medan) du byter art. Odds = chansen att barnet ärver alla önskade i steget – extra passiver kan följa med, se noten under planen."
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
                  ? `Ger alla ${wanted.length} önskade`
                  : `Ger ${gives.length} av ${wanted.length} önskade`} />
                <div className="hint">
                  {/* Bannerna ovan visar redan vilka som är önskade (bock) och
                      vilka som är skräp – att räkna upp dem igen vore samma sak
                      en tredje gång. Här står bara det bannerna inte kan säga. */}
                  {gives.length > 1 && <>Sparar {gives.length - 1} bärarsteg. </>}
                  {junk.length > 0 && <>Det omarkerade följer med in i arvspoolen och sänker oddsen. </>}
                  Alternativ i boxen: {gives.map((id) => {
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
                Ingen i boxen har denna – kan inte planeras (endast slumpmutation vid kläckning).
              </div>
            </div>
          ))}
        </div>

        <Shortcuts items={suggestShortcuts(data, plan, ownedSpecies, target)} />

        <div className="okbox">
          <b>Håll linjen ren.</b> Barnet ärver ur föräldrarnas <i>samlade</i> passiv-pool, så
          varje extra passiv en förälder bär konkurrerar med dem du vill ha. Vill du ha en pal
          med <i>enbart</i> {plan.usable.length || wanted.length} passiver, välj alltid en
          förälder som bär så få andra som möjligt – helst en som bara har den önskade.
          {plan.usable.length >= 3 && (
            <>
              {" "}Med {plan.usable.length} önskade räcker en enda skräp-passiv för att mångdubbla
              antalet ägg, så en „sämre” pal utan skräp slår nästan alltid en stark med extra passiver.
            </>
          )}
        </div>

        <ImplantBox />

        {!plan.usable.length ? (
          <WarnBox>Ingen av de önskade passiverna finns i boxen ännu.</WarnBox>
        ) : (
          <>
            {plan.start && !plan.mergeSteps.length && (
              <OkBox>
                Alla valda passiver finns redan på <b>{palShort(plan.start, sp(plan.start.s).name)}</b> – gå direkt till art-fasen nedan.
              </OkBox>
            )}
            {plan.mergeSteps.length > 0 && (
              <>
                <h3 className="phase">Fas 1 · Samla passiverna ({plan.carriersUsed.length} bärare)</h3>
                {/* Varför ordningen ser ut som den gör. Utan förklaringen ser den
                    godtycklig ut, och det är precis den som gör planen billig.
                    Två fall, och rutan får bara påstå det som stämmer för just
                    den här planen. */}
                {plan.mergeSteps.some((st) => !st.a.pal && !st.b.pal) && (
                  <OkBox>
                    <b>Para ihop två och två.</b> Sista steget kostar lika mycket hur du än
                    kommer dit – poolen är ändå dina {plan.usable.length} önskade. Skillnaden
                    ligger i vägen fram: bygger du en förälder med tre passiver först
                    (~3 ägg) blir det dyrare än att bygga <i>två</i> föräldrar med två
                    passiver var (~2 ägg styck). Därför slår planen ihop bärarna parvis och
                    möts på mitten.
                  </OkBox>
                )}
                {plan.mergeDetour && (
                  <OkBox>
                    <b>Ordningen är vald på hela planen, inte på fas 1.</b>{" "}
                    {/* Två fall: den andra ordningen är billigare i fas 1, eller
                        kostar lika mycket men landar i en annan art. Att skriva
                        "~15 ägg i stället för ~15" i det andra fallet är brus. */}
                    {plan.mergeDetour.cheapestEggs < plan.mergeEggs - 0.5 ? (
                      <>
                        En annan ihopslagning hade kostat{" "}
                        <b>~{Math.ceil(plan.mergeDetour.cheapestEggs)} ägg</b> här i stället för{" "}
                        <b>~{Math.ceil(plan.mergeEggs)}</b>, men den landar i en art som ligger
                        längre från {target !== null ? sp(target).name : "målet"}.
                      </>
                    ) : (
                      <>
                        Bärarna går att para ihop på flera sätt som kostar lika mycket här, men
                        de landar i olika arter – den här hamnar närmast{" "}
                        {target !== null ? sp(target).name : "målet"}.
                      </>
                    )}{" "}
                    Vägen nedan sparar <b>~{Math.round(plan.mergeDetour.saves)} ägg</b> totalt,
                    eftersom artkedjan efteråt blir kortare.
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
                                  ⚠ Båda är {st.a.pal!.g === "M" ? "hanar" : "honor"} – paret kan inte avla.
                                  Skaffa en av motsatt kön, eller använd en annan bärare.{" "}
                                </span>
                              )}
                              Kläck tills du får en unge med precis det här – helst utan skräp.
                              {st.genderEggs > 0 && (
                                <> Ungen behöver dessutom ett bestämt kön här, vilket i snitt
                                  kostar ~{Math.ceil(st.genderEggs)} ägg extra.</>
                              )}
                              <Chips ids={st.haveAfter} label="Mål i steget: barn med" />
                              {owned.map((p) => (
                                <Ident key={p.pal!.id} pal={p.pal!} label="Bärare i steget" />
                              ))}
                            </>
                          : <span className="warn-inline">⚠ Detta par kan inte avla (legendarer avlar bara med sin egen art). Flytta passiven via en mellanpal:
                              para {sp(st.a.species).name} med sin egen art och använd avkomman, eller välj en annan bärare av passiven.</span>
                      }
                    >
                      <SpeciesMini
                        sp={sp(st.a.species)}
                        badge={st.a.pal ? "BÄRARE" : `STEG ${st.a.fromStep}`}
                        badgeClass={st.a.pal ? "o" : "q"}
                      />＋
                      <SpeciesMini
                        sp={sp(st.b.species)}
                        badge={st.b.pal ? "BÄRARE" : `STEG ${st.b.fromStep}`}
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
                Hittade ingen kedja från {plan.lineSpecies !== null ? sp(plan.lineSpecies).name : "?"} till {sp(target).name} med dina ägda pals som partners – prova fritt läge nedan.
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
                    <b>Längre väg med flit.</b> Det finns en kedja på bara{" "}
                    {plan.speciesPhaseShortcut.steps} steg, men den går via en partner som släpar
                    med skräp-passiver och kostar <b>~{Math.ceil(plan.speciesPhaseShortcut.eggs)} ägg</b>.
                    Vägen nedan tar {plan.speciesPhase.length} steg och{" "}
                    <b>~{Math.ceil(plan.speciesPhase.reduce((n, st) => n + (st.odds > 0 ? 1 / st.odds : 0), 0))} ägg</b> –
                    ett steg till med rena partners är nästan alltid billigare än ett kort med en smutsig.
                  </OkBox>
                )}
                {plan.speciesPhase.map((st, i) => (
                  <StepCard
                    key={i} num={i + 1}
                    hint={
                      <>
                        {!st.genderOk && st.partner && (
                          <div className="warn-inline">
                            ⚠ Partnern har samma kön som linjen – paret kan inte avla. Byt till
                            en {st.partner.g === "M" ? "hona" : "hane"} av samma art.
                          </div>
                        )}
                        {st.partner
                          ? <Ident pal={st.partner} label="Partner i steget" />
                          : <>Partner: ?</>}
                        {st.note ? `${st.note} · ` : ""}
                        <Chips ids={plan.usable} label="Barnet ska behålla" />
                      </>
                    }
                  >
                    <SpeciesMini sp={sp(st.from)} badge={i === 0 ? "DIN LINJE" : `STEG ${i}`} badgeClass="q" />＋
                    <SpeciesMini sp={sp(st.with)} badge="ÄGD" />→
                    <SpeciesMini sp={sp(st.to)} />
                    {uniqueChildren.has(st.to) && <Tag kind="lucky">UNIK KOMBO</Tag>}
                    <OddsBadge odds={oddsText(st.odds)} eggs={eggsText(st.odds)} />
                  </StepCard>
                ))}
              </>
            )}
            {plan.expectedEggs > 0 && (
              <OkBox>
                <b>Totalt: ~{Math.ceil(plan.expectedEggs)} ägg</b> förväntat för hela planen,{" "}
                {eggTime(plan.expectedEggs)}. Tips: håll skräp-passiver borta ur linjen –
                varje extra passiv i poolen sänker oddsen.
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
      <Section title={`Art-väg till ${sp(target).name}`}>
        {ownedSpecies.has(target) && bestOf.get(target) && (
          <OkBox>
            Du äger redan {sp(target).name} – bästa exemplar:{" "}
            {palShort(bestOf.get(target)!, sp(target).name)} ({bestOf.get(target)!.c})
          </OkBox>
        )}

        {directCombos.length > 0 && (
          <>
            <div className="sub" style={{ marginTop: 6 }}>
              {directCombos.length} direkta kombos med pals du äger{directCombos.length > 8 ? " – visar 8 bästa" : ""}:
            </div>
            {directCombos.slice(0, 8).map(([a, b, note], i) => {
              const q = bestParentPair(pals, bestOf, a, b, prefs);
              return (
                <StepCard key={i}
                  hint={<>Föräldrar: {palShort(q.pa, sp(q.pa.s).name)} + {palShort(q.pb, sp(q.pb.s).name)}{q.warn && <span className="warn-inline"> · {q.warn}</span>}</>}
                >
                  <SpeciesMini sp={sp(a)} badge="ÄGD" />＋
                  <SpeciesMini sp={sp(b)} badge="ÄGD" />→
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
            {base === target && <OkBox>Basen är redan målet.</OkBox>}
            {base !== target && !chain && <WarnBox>Ingen kedja hittad inom 10 steg – prova fritt läge.</WarnBox>}
            {chain?.map((st, k) => (
              <StepCard key={k} num={k + 1}
                hint={k === 0
                  ? (() => { const q = bestParentPair(pals, bestOf, st.from, st.with, prefs); return <>Föräldrar: {palShort(q.pa, sp(q.pa.s).name)} + {palShort(q.pb, sp(q.pb.s).name)}{q.warn ? ` · ${q.warn}` : ""}</>; })()
                  : <>Partner: {bestOf.get(st.with) ? palShort(bestOf.get(st.with)!, sp(st.with).name) : "?"} (barnets kön är slumpat – kläck tills du får motsatt kön mot partnern)</>}
              >
                <SpeciesMini sp={sp(st.from)} badge={k === 0 ? "BAS" : `STEG ${k}`} badgeClass="q" />＋
                <SpeciesMini sp={sp(st.with)} badge="ÄGD" />→
                <SpeciesMini sp={sp(st.to)} />
                {uniqueChildren.has(st.to) && <Tag kind="lucky">UNIK KOMBO</Tag>}
              </StepCard>
            ))}
          </>
        ) : (
          <>
            <h3 className="phase">Kortaste väg (fritt läge)</h3>
            {!isReachable(freeSolve.cost, target) && (
              <WarnBox>
                {sp(target).name} kan inte nås via breeding från din box – vissa pals (legendarer m.fl.)
                kan bara fås av två av samma art. Fånga en först.
              </WarnBox>
            )}
            {freeSolve.cost[target] === 0 && <OkBox>Ägs redan – ingen breeding behövs för själva arten.</OkBox>}
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
          <SpeciesMini sp={sp(node.s)} badge="ÄGD" />
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
