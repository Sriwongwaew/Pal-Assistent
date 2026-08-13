"use client";

/* Smart: Rollerna – rekommendationerna och gamla "Bäst för…" sammanslagna
 * (Kens val aug 2026: förslag 5 "Rollhubbarna" + Vaktrummets instrumentband,
 * och i samma runda hans rättning: rollerna som FLIKAR, inte en lång sida).
 *
 * Sidan delas på ROLL, inte på lässätt. Fem flikar, EN synlig i taget:
 *
 *   01 Boxen    – kondenseringskön, expeditioner, slakt, spara-listan
 *   02 Strid    – attack-laget, BIS-luckor, själar, nästa strid, pal-sökaren
 *   03 Basen    – basgänget, utplaceringar, ranchen, basförsvaret
 *   04 Riddjur  – snabbaste riddjuren, uthållighet, fisket
 *   05 Spelaren – pals vars partnerskill buffar DIG
 *
 * Varje flik bär både vad du ska göra (vänster, numrerat och framräknat ur
 * boxen) och vad som är bäst (höger, referensen). Man kommer aldrig hit med
 * frågan "vad ska jag göra i dag" – man kommer med "vad ska jag göra med
 * basen", och då är flikens fem rader värda mer än en perfekt sorterad lista
 * om allt. Indexkorten är instrumentbandet OCH flikraden: alla rollers
 * nyckeltal syns alltid, kortraden klistrar sig under toppraden.
 *
 * Fliken väljs med URL-hashen (#rh-box … #rh-player). Det är inte en
 * detalj: Översikten och Hitta djuplänkar med samma ankare som när rollerna
 * var band på en sida, och bakåtknappen går till förra fliken. Innehållet
 * BYTS (villkorad rendering), inte göms – fem fullrenderade roller var det
 * som gjorde sidan lång och tung.
 *
 * Tom box är ett riktigt tillstånd: Gör-kolumnerna blir hämta-uppgifter och
 * en lugn rad, referenskolumnerna fungerar utan box (globala listor).
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import type { MessageKey } from "@/i18n";
import { useSelectedPal } from "@/context/SelectedPalContext";
import { BREEDING_PREFS_KEY, parseBreedingPrefs } from "@/lib/breedingPrefs";
import { planBookings, type Booking } from "@/lib/bookings";
import { buildUseIndex, planCondense, summarizeCondense } from "@/lib/condense";
import { fittingGold, isPerfectIv, perfectIvCount } from "@/lib/scoring";
import { EXPEDITION_SITES, idleSquad } from "@/lib/expedition";
import { soulAdvice, type SoulAdvice, type SoulStat } from "@/lib/souls";
import { BUTCHER_ROWS } from "@/lib/recoData";
import {
  ATTACK_TEAM_SIZE, BASE_WORK_TYPES, findSpeciesFor, pickAttackTeam, pickBaseCrew, ranchGuide,
  topGlobalAttackers, topGlobalWorkers, workScore, type FinderPurpose,
} from "@/lib/best";
import { idealLoadout, topWork } from "@/lib/loadout";
import {
  ELEMENT_ICON, ELEMENT_META, FISHING_PALS, PALBOX, PARTY, ranchItemsOf, WORK_META, WORK_TYPES,
  isStored,
} from "@/lib/constants";
import { isReachable } from "@/lib/breeding";
import { ownedImplants } from "@/lib/implants";
import { catchInfo } from "@/lib/worldmap";
import { partnerSkill } from "@/lib/partnerSkills";
import { DEFENSE_META, SUPPORT_META } from "@/lib/partnerMeta";
import { nextFight } from "@/lib/quests";
import type { ElementType, ScoredPal } from "@/lib/types";
import { PassiveList } from "@/components/ui/PassiveRow";
import { GameIcon, ItemIcon, MaskIcon } from "@/components/ui/GameIcon";
import { WorkIcon } from "@/components/ui/WorkIcon";
import { ElementIcons, GenderSymbol, SpeciesIcon, Tag, elementBg } from "@/components/ui/PalBits";
import { elementColor } from "@/components/ui/PalHero";
import { LoadoutCard } from "@/components/ui/Loadout";
import {
  ModCol, ModGrid, Module, RhSub, RoleDash, RoleGauge, RoleHead, Task, TeamPortrait,
} from "@/components/ui/RoleBits";
import {
  CondenseRow, KeepConsole, WaitRow, WhyCondense,
  type KeepFamily, type KeepGroup, type RecoModel,
} from "@/components/ui/RecoBits";

/**
 * Spara-grupperna speglar `applyKeepRules`. En pal visas bara i sin första
 * grupp — ordningen här ÄR prioriteringen.
 *
 * `fam` är familjen segmentbandet färgar på: `pv` = passiven är skälet, `iv` =
 * IV är skälet, `st` = palens tillstånd. Den säger alltså *vilken sorts* skäl
 * det är, och det är därför bandet får bära färg alls — nio godtyckliga hues
 * hade sett ut som att de betydde något de inte betyder.
 */
const GROUPS: {
  title: MessageKey; hint: MessageKey; fam: KeepFamily; test: (p: ScoredPal) => boolean;
}[] = [
  { title: "reco.group.rainbow", hint: "reco.group.rainbowWhy", fam: "pv", test: (p) => p.tiers.includes(5) },
  { title: "reco.group.perfectIv", hint: "reco.group.perfectIvWhy", fam: "iv", test: isPerfectIv },
  /* IV-byggsten: EN 100:a i en stat, inte ett högt snitt. Egen grupp för att det
     är ett annat skäl än "hög IV" – planeraren bär in just den statens 100:a. */
  {
    title: "reco.group.ivBlock", hint: "reco.group.ivBlockWhy", fam: "iv",
    test: (p) => perfectIvCount(p) > 0 && perfectIvCount(p) < 3,
  },
  { title: "reco.group.gold", hint: "reco.group.goldWhy", fam: "pv", test: (p) => fittingGold(p) >= 2 },
  { title: "reco.group.synergy", hint: "reco.group.synergyWhy", fam: "pv", test: (p) => p.synergy !== null },
  { title: "reco.group.carrier", hint: "reco.group.carrierWhy", fam: "pv", test: (p) => p.cleanCarrier.length > 0 },
  { title: "reco.group.sole", hint: "reco.group.soleWhy", fam: "pv", test: (p) => p.soleCarrier.length > 0 },
  { title: "reco.group.goldIv", hint: "reco.group.goldIvWhy", fam: "iv", test: (p) => fittingGold(p) === 1 && p.ivSum >= 240 },
  { title: "reco.group.highIv", hint: "reco.group.highIvWhy", fam: "iv", test: (p) => p.ivSum >= 270 },
  { title: "reco.group.lucky", hint: "reco.group.luckyWhy", fam: "st", test: (p) => p.lucky },
  { title: "reco.group.condensed", hint: "reco.group.condensedWhy", fam: "st", test: (p) => p.stars > 0 },
  { title: "reco.group.party", hint: "reco.group.partyWhy", fam: "st", test: (p) => p.c === PARTY },
];

/** Hur många körader köinstrumentet visar innan "visa alla". */
const PREVIEW = 8;

/** Elementen i pal-sökaren, i spelets ordning (samma som ELEMENT_META). */
const FINDER_ELEMENTS: ElementType[] = [
  "Fire", "Water", "Leaf", "Electricity", "Ice", "Earth", "Dark", "Dragon", "Normal",
];

const FINDER_PURPOSES: [FinderPurpose, MessageKey][] = [
  ["attack", "purpose.attack"], ["tanky", "purpose.tank"], ["mount", "purpose.mount"],
];

/* Best-in-slot-mallarna ur communityns 1.0-guider (KeenGamer, Palworld Breedr
   m.fl., aug 2026). Namnen är spelets engelska och slås upp mot datasetet vid
   rendering – finns en passiv inte i datan visas den inte, hellre än fel.
   Attackens fjärde plats är elementboosten som väljs efter palens element –
   den är en regel, inte ett namn, och står som egen rad. */
const BIS_TEMPLATES: Record<"attack" | "mount" | "work", {
  role: MessageKey; note: MessageKey; names: string[]; elementSlot?: boolean;
}> = {
  attack: { role: "bis.attack", note: "bis.attackNote", names: ["Legend", "Musclehead", "Ferocious"], elementSlot: true },
  mount: { role: "bis.mount", note: "bis.mountNote", names: ["Dimensional Leap", "Swift", "Runner", "Legend"] },
  work: { role: "bis.work", note: "bis.workNote", names: ["Remarkable Craftsmanship", "Artisan", "Serious", "Work Slave"] },
};

/** Rollbandens toner: elementfärgen som informationsbärare, ett element per roll. */
const BAND = {
  box: ELEMENT_META.Normal!.color,
  fight: ELEMENT_META.Fire!.color,
  base: ELEMENT_META.Earth!.color,
  mount: ELEMENT_META.Dragon!.color,
  player: ELEMENT_META.Dark!.color,
};

/** Flik ⇆ hash. Ankarna är samma som när rollerna var band på en sida –
 *  Översiktens och Hittas djuplänkar (#rh-base …) ska fortsätta landa rätt. */
type RoleTab = keyof typeof BAND;
const TAB_BY_HASH: Record<string, RoleTab> = {
  "rh-box": "box", "rh-fight": "fight", "rh-base": "base",
  "rh-mount": "mount", "rh-player": "player",
};

/** Formationens storlekstrappa: störst först, som artefaktens uppställning. */
const FORM_SIZES = [88, 74, 66, 60, 56];

export function RecoView() {
  const { data, pals, ownedSpecies, bestOf, freeSolve } = usePalData();
  const { select } = useSelectedPal();
  const t = useT();
  const rich = useRichT();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const gotoBreeding = (s: number, wanted: string[] = []) =>
    router.push(`/breeding?target=${s}${wanted.length ? `&wanted=${wanted.join(",")}` : ""}`);

  /* Fliken bor i URL-hashen. Startvärdet är alltid Boxen – hashen läses
     först i effekten, annars renderar servern en flik och klienten en annan
     (hydreringsfel). Ett flikbyte rullar till toppen: att stå kvar långt ner
     i förra rollens lista är att landa mitt i nästa. */
  const [tab, setTab] = useState<RoleTab>("box");
  useEffect(() => {
    const read = (scroll: boolean) => {
      const next = TAB_BY_HASH[window.location.hash.replace("#", "")];
      if (next) {
        setTab(next);
        if (scroll) window.scrollTo({ top: 0 });
      }
    };
    read(false);
    const onChange = () => read(true);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const sp = (i: number) => data.species[i]!;
  const spIdxByCode = useMemo(
    () => new Map(data.species.map((s, i) => [s.code.toLowerCase(), i] as const)),
    [data],
  );

  /* ---------- Boxen: kondensering, spara, expeditioner, slakt ---------- */

  const useIndex = useMemo(() => buildUseIndex(data, pals), [data, pals]);

  /* Vilka individer den aktiva avelsplanen räknar med. Läses ur samma sparade
     val som planeraren (`pa-breeding`), i en effekt eftersom localStorage inte
     finns på servern. Utan mål blir kartan tom och kön beter sig som förut. */
  const [booked, setBooked] = useState<ReadonlyMap<string, Booking>>(new Map());
  useEffect(() => {
    const prefs = parseBreedingPrefs(window.localStorage.getItem(BREEDING_PREFS_KEY), data);
    setBooked(planBookings(data, pals, ownedSpecies, prefs));
  }, [data, pals, ownedSpecies]);

  const { now, soon, later, summary } = useMemo(() => {
    const plans = planCondense(data, pals, bestOf, { booked, useIndex });
    return {
      now: plans.filter((p) => p.verdict === "now"),
      soon: plans.filter((p) => p.verdict === "soon"),
      later: plans.filter((p) => p.verdict === "hold" || p.verdict === "max"),
      summary: summarizeCondense(plans),
    };
  }, [data, pals, bestOf, booked, useIndex]);

  /* Grupperna i prioritetsordning, och sist "artens bästa (övriga)" som en
     grupp bland de andra. Den var tidigare ett eget hopfällbart block – som
     segment i bandet är den däremot informationen "så här stor del av boxen
     sparas utan något utmärkande skäl", och det är den största gruppen av alla. */
  const keepGroups = useMemo(() => {
    const keeps = pals.filter((p) => p.keep);
    const seen = new Set<string>();
    const groups: KeepGroup[] = [];
    for (const { title, hint, fam, test } of GROUPS) {
      const list = keeps.filter((p) => test(p) && !seen.has(p.id)).sort((a, b) => b.score - a.score);
      list.forEach((p) => seen.add(p.id));
      if (list.length) groups.push({ title, hint, fam, list });
    }
    const rest = keeps.filter((p) => !seen.has(p.id)).sort((a, b) => b.score - a.score);
    if (rest.length) {
      groups.push({
        title: "reco.keep.restTitle", hint: "reco.keep.restWhy", fam: "rest", list: rest,
      });
    }
    return groups;
  }, [pals]);

  const model: RecoModel = {
    data, useIndex, now, soon, later, summary, keepGroups,
    totalPals: pals.length,
    dupeCount: pals.length - pals.filter((p) => p.keep).length,
    select,
  };
  const keepCount = model.totalPals - model.dupeCount;

  /* Expeditionsläget: lediga boxens ≈FP mot varje sajts riktvärde och
     elementräkning. Sajter vars torn inte är nedlagt visas som låsta. */
  const squad = useMemo(() => idleSquad(data, pals), [data, pals]);
  const expeditionRows = useMemo(() => {
    const towers = new Set(data.progress?.towers ?? []);
    const clears = data.progress?.towerClears ?? {};
    return EXPEDITION_SITES.map((site) => ({
      site,
      open: !data.progress
        || (site.hard ? (clears[`${site.flag}_Hard`] ?? 0) > 0 : towers.has(site.flag)),
      fpOk: squad.fp >= site.fp,
      elOk: !site.need || (squad.byElement.get(site.need.el) ?? 0) >= site.need.n,
      elHave: site.need ? squad.byElement.get(site.need.el) ?? 0 : 0,
    })).filter((r) => !r.site.hard || r.open);
  }, [data, squad]);
  /** Bästa sajten som ger full belöning i dag – uppgiften i Gör-kolumnen. */
  const bestSite = useMemo(
    () => [...expeditionRows].reverse().find((r) => r.open && r.fpOk && r.elOk) ?? null,
    [expeditionRows],
  );

  /* Slaktkandidater: bara arter med fler exemplar än spara-reglerna håller. */
  const butcherRows = useMemo(() => {
    const byCode = new Map<string, number>();
    for (const p of pals) {
      if (p.keep) continue;
      const code = data.species[p.s]?.code.toLowerCase();
      if (code) byCode.set(code, (byCode.get(code) ?? 0) + 1);
    }
    return BUTCHER_ROWS
      .map((row) => ({ row, count: byCode.get(row.code.toLowerCase()) ?? 0 }))
      .filter((r) => r.count > 0);
  }, [data, pals]);

  /** Antal bärare per passiv – BIS-luckor och sökaren vill veta vad som går att ärva. */
  const passiveCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pals) for (const id of p.pv) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [pals]);
  const imps = useMemo(() => ownedImplants(data) ?? {}, [data]);

  /* ---------- Lagen: strid, bas, riddjur ---------- */

  const attackers = useMemo(() => [...pals].sort((a, b) => b.combat - a.combat), [pals]);
  const team = useMemo(() => pickAttackTeam(data, pals), [data, pals]);
  const crew = useMemo(() => pickBaseCrew(data, pals, bestOf), [data, pals, bestOf]);
  const globalAttackers = useMemo(() => topGlobalAttackers(data), [data]);
  const globalWorkers = useMemo(() => topGlobalWorkers(data), [data]);
  const ranch = useMemo(() => ranchGuide(data, ownedSpecies), [data, ownedSpecies]);
  const mounts = useMemo(
    () => [...new Set([...bestOf.values()])]
      .filter((p) => (data.species[p.s]?.spr ?? 0) > 0)
      .sort((a, b) => b.mount - a.mount)
      .slice(0, 6),
    [data, bestOf],
  );
  const fishing = useMemo(() => {
    const byName = new Map(data.species.map((s, i) => [s.name, i] as const));
    return FISHING_PALS
      .map(([name, desc]) => ({ name, desc, idx: byName.get(name) }))
      .filter((f): f is { name: string; desc: MessageKey; idx: number } => f.idx !== undefined);
  }, [data]);

  /* BIS-luckorna: rollens ideal-uppsättning mot vad laget redan bär. Uppgiften
     är klickbar rakt in i avelsplaneraren med de saknade som önskade. */
  const fightGaps = useMemo(() => team
    .map((p) => {
      const species = sp(p.s);
      const lo = idealLoadout(data, passiveCounts, p, species, "attack", null, t.locale);
      return { p, species, missing: lo.slots.filter((s) => !s.owned) };
    })
    .filter((g) => g.missing.length > 0), [team, data, passiveCounts, t.locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const mountGaps = useMemo(() => mounts.slice(0, 2)
    .map((p) => {
      const species = sp(p.s);
      const lo = idealLoadout(data, passiveCounts, p, species, "mount", null, t.locale);
      return { p, species, missing: lo.slots.filter((s) => !s.owned) };
    })
    .filter((g) => g.missing.length > 0), [mounts, data, passiveCounts, t.locale]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Själsrådgivaren per roll: rollens stats för rollens nyckelpals. */
  const soulsFight = useMemo(
    () => soulAdvice(attackers.slice(0, 5).map((pal) => ({ pal, stats: [1, 0] as SoulStat[] }))),
    [attackers],
  );
  const soulsWork = useMemo(
    () => soulAdvice([...useIndex.bestWorker.values()]
      .map((id) => pals.find((p) => p.id === id))
      .filter((p): p is ScoredPal => !!p)
      .map((pal) => ({ pal, stats: [3] as SoulStat[] }))),
    [useIndex, pals],
  );
  const soulsMount = useMemo(
    () => soulAdvice(mounts.slice(0, 3).map((pal) => ({ pal, stats: [0] as SoulStat[] }))),
    [mounts],
  );

  /* Basens läge: vilka sysslor gänget täcker och vilka exemplar som ligger i
     förvaring fast de är artens bästa (laget väljer individen, inte platsen).
     Förvaring, inte bara Palboxen: en pal i den globala palboxen är precis lika
     outplacerad, och att bara testa mot "Palbox" hade tyst utelämnat den ur
     uppgiften i stället för att be dig hämta ut den. */
  const crewBoxed = useMemo(() => crew.filter((p) => isStored(p.c)), [crew]);
  const tasksCovered = useMemo(
    () => BASE_WORK_TYPES.filter((w) => crew.some((p) => (sp(p.s).ws[w] ?? 0) > 0)).length,
    [crew], // eslint-disable-line react-hooks/exhaustive-deps
  );
  /** Första arten i kön som också är ranchproducent – "behåll en i ranchen". */
  const ranchKeep = useMemo(() => {
    for (const plan of now) {
      const name = sp(plan.s).name;
      /* Flera varor per art är möjligt (Shroomer, Dumud Gild) – huvudvaran är
         den första raden, bivaror är märkta `side` och duger inte som skäl. */
      const item = ranchItemsOf(name).find((r) => !r.side);
      if (item) return { plan, name, item: item.item };
    }
    return null;
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps
  const defensePick = useMemo(() => {
    for (const { code } of DEFENSE_META) {
      const i = spIdxByCode.get(code.toLowerCase());
      if (i !== undefined && ownedSpecies.has(i)) return { i, species: sp(i) };
    }
    return null;
  }, [spIdxByCode, ownedSpecies]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Spelaren: stödlistan mot boxen + Gobfin-stacken. */
  const supportRows = useMemo(() => SUPPORT_META
    .map(({ code, note }) => {
      const i = spIdxByCode.get(code.toLowerCase());
      return i === undefined ? null : { i, species: sp(i), note, owned: ownedSpecies.has(i) };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null),
  [spIdxByCode, ownedSpecies]); // eslint-disable-line react-hooks/exhaustive-deps
  const supportOwned = supportRows.filter((r) => r.owned).length;
  const gobfin = useMemo(() => {
    const i = spIdxByCode.get("sharkkid"); // Gobfins interna kod
    if (i === undefined) return null;
    const vanguard = Object.entries(data.passives).find(([, def]) => def.n === "Vanguard")?.[0];
    if (!vanguard) return null;
    const owned = pals.filter((p) => p.s === i);
    if (!owned.length) return null;
    return { i, vanguard, total: owned.length, have: owned.filter((p) => p.pv.includes(vanguard)).length };
  }, [spIdxByCode, data, pals]);

  const fight = useMemo(
    () => (data.progress ? nextFight(data.progress) : null),
    [data.progress],
  );

  /* ---------- delade småbitar ---------- */

  /** `compact` används i de smala arbetskorten, där namnet annars trunkeras bort.
      "FÅNGA" ensamt lovade en vild spawn som inte finns för legendarer och
      raid-arter (Kens fynd) – taggen säger HUR: alfaboss med nivå, eller raid-ägg. */
  const ownStatus = (s: number, compact = false) => {
    if (ownedSpecies.has(s)) return <Tag kind="keep">{t("best.own.owned")}</Tag>;
    const c = freeSolve.cost[s] ?? Infinity;
    if (!isReachable(freeSolve.cost, s)) {
      const how = catchInfo(sp(s).code);
      if (how?.kind === "raid") return <Tag kind="cond">{t("best.own.catchRaid")}</Tag>;
      if (how?.kind === "alpha") {
        return <Tag kind="cond">{t("best.own.catchAlpha", { lv: how.lv })}</Tag>;
      }
      return <Tag kind="cond">{compact ? t("best.own.catch") : t("best.own.mustCatch")}</Tag>;
    }
    return (
      <Tag kind="lucky">
        {compact ? t("best.own.breedShort", { n: c }) : t.plural("best.own.breed", c)}
      </Tag>
    );
  };

  /** "Så här ska den se ut" för en pal i en given roll. */
  const LoadoutGrid = ({ team: list, purpose, label }: {
    team: ScoredPal[]; purpose: "attack" | "work" | "mount"; label: (p: ScoredPal) => string;
  }) => (
    <div className="loadouts">
      {list.map((p) => {
        const species = sp(p.s);
        const work = purpose === "work" ? topWork(species, WORK_TYPES) : null;
        const lo = idealLoadout(data, passiveCounts, p, species, purpose, work, t.locale);
        const missing = lo.slots.filter((s) => !s.owned).map((s) => s.id);
        return (
          <LoadoutCard
            key={p.id}
            species={species}
            name={species.name}
            sub={label(p)}
            loadout={lo}
            onPlan={() => gotoBreeding(p.s, missing)}
          />
        );
      })}
    </div>
  );

  /**
   * BiS-mallen: varje plats mot din box – bärare, implantat, saknas.
   *
   * Ingen egen rubrik och ingen egen ram: den bor i en modul som redan heter
   * samma sak (`bis.attack` …), och en ruta i en ruta med rubriken två gånger
   * var precis det dubbelspel omdesignen skulle bli av med. Förbehållet ligger
   * i modulens fot – `BisNote` – där resten av sidans källor står.
   */
  const BisCard = ({ kind }: { kind: keyof typeof BIS_TEMPLATES }) => {
    const { names, elementSlot } = BIS_TEMPLATES[kind];
    const byName = new Map(Object.entries(data.passives).map(([id, def]) => [def.n, id] as const));
    return (
      <div className="biscard">
        {names.map((name) => {
          const id = byName.get(name);
          if (!id) return null;
          const carriers = passiveCounts.get(id) ?? 0;
          const hasImp = (imps[id] ??  0) > 0;
          return (
            <div key={id} className="bisslot">
              <PassiveList items={[{ id, name, tier: data.passives[id]?.r ?? 0 }]} />
              <span className={`bst ${carriers > 0 || hasImp ? "have" : "mis"}`}>
                {hasImp ? t("bis.implant")
                  : carriers > 0 ? t("bis.carriers", { n: carriers })
                  : t("bis.missing")}
              </span>
            </div>
          );
        })}
        {elementSlot && (
          <div className="bisslot"><span className="meta">{t("bis.elementSlot")}</span></div>
        )}
      </div>
    );
  };

  /** Mallens förbehåll – står i modulens fot, inte bland platserna. */
  const BisNote = ({ kind }: { kind: keyof typeof BIS_TEMPLATES }) =>
    <>{t(BIS_TEMPLATES[kind].note)} {t("bis.source")}</>;

  /** Själsraderna: rollens stats, kostnaden till rank 10. Klick = Base Info. */
  const SoulRows = ({ rows, max = 3 }: { rows: SoulAdvice[]; max?: number }) => (
    <div className="qlog">
      {rows.slice(0, max).map(({ pal, stats, to10 }) => {
        const spec = sp(pal.s);
        return (
          <button type="button" key={pal.id} className="qlrow rqsoul" onClick={() => select(pal)}>
            <span className="nm">{spec.name}</span>
            <span className="meta">
              {stats.map((st) => `${["HP", "Attack", "Defense", "Work Speed"][st]} ${pal.souls[st] ?? 0}/10`).join(" · ")}
            </span>
            <span className="meta num">
              → {[to10.s && `${to10.s} S`, to10.m && `${to10.m} M`, to10.l && `${to10.l} L`].filter(Boolean).join(" + ")}
            </span>
          </button>
        );
      })}
    </div>
  );

  const SoulWallet = () => (data.souls
    ? (
      <div className="imp rhwallet">
        <span>S <b className="num">{data.souls.s}</b></span>
        <span>M <b className="num">{data.souls.m}</b></span>
        <span>L <b className="num">{data.souls.l}</b></span>
        <span>G <b className="num">{data.souls.g}</b></span>
      </div>
    )
    : null);

  const passiveItems = (p: ScoredPal) =>
    p.pv.map((id) => ({ id, name: data.passives[id]?.n ?? id, tier: data.passives[id]?.r ?? 0 }));

  /* Ranchen är aldrig skälet till att någon står i basgänget (BASE_WORK_TYPES),
     så den ska inte heller stå som motivering under porträttet. */
  const crewWhy = (p: ScoredPal) => {
    const s = sp(p.s);
    const top = BASE_WORK_TYPES
      .filter((w) => (s.ws[w] ?? 0) > 0)
      .sort((a, b) => (s.ws[b] ?? 0) - (s.ws[a] ?? 0))
      .slice(0, 2);
    return (
      <>
        {top.map((w) => (
          <span key={w} style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
            <WorkIcon type={w} size={12} />{s.ws[w]}
          </span>
        ))}
        {s.noct ? " 🌙" : ""}
        {/* Var exemplaret faktiskt står just nu: laget väljer artens bästa
            individ, och den ligger oftast i boxen fast en sämre redan är
            utplacerad. Utan raden ser förslaget ut som "det är redan klart". */}
        <span className="tpwhere">{p.c === PALBOX ? t("best.crew.inBox") : p.c}</span>
      </>
    );
  };

  /* ---------- pal-sökaren (bor i Strid-bandets referens) ---------- */

  const [findEl, setFindEl] = useState<ElementType | null>(null);
  const [findFor, setFindFor] = useState<FinderPurpose>("attack");
  const found = useMemo(
    () => findSpeciesFor(data, findFor, findEl),
    [data, findFor, findEl],
  );
  /** Siffran raden rankas på – samma formel som i findSpeciesFor. */
  const findVal = (s: number): number => {
    const spec = sp(s);
    return findFor === "attack" ? spec.sc[1]
      : findFor === "tanky" ? spec.sc[0] + spec.sc[2]
      : spec.spr;
  };

  /* ================================================================
     Konsolen – mätarrad, rollens rad, modulnät per flik
     ================================================================ */

  const shown = showAll ? now : now.slice(0, PREVIEW);

  const fishingOwnedCount = fishing.filter((f) => ownedSpecies.has(f.idx)).length;
  const fightRanksLeft = soulsFight.reduce((a, r) => a + r.missing, 0);
  const bisGapsFight = fightGaps.reduce((a, g) => a + g.missing.length, 0);
  const bisGapsMount = mountGaps.reduce((a, g) => a + g.missing.length, 0);
  const ranchGoods = ranch.filter((e) => e.item !== null).length;
  const moreTasks = (bestSite ? 1 : 0) + butcherRows.length;
  const supportMissing = supportRows.length - supportOwned;

  /* Köns kolumnrubriker. LED-remsan och vinstmätaren är mönster utan dem – och
     ett mönster ingen kan läsa av är precis den dekoration omdesignen skulle
     bli av med. Tomma celler håller rutnätet i takt med radernas. */
  const QUEUE_HEAD: (MessageKey | null)[] = [
    null, null, null, "reco.queue.headStars", "reco.queue.headFeed",
    "reco.queue.headGain", null, null, null,
  ];

  return (
    <>
      {/* Mätarraden: rollens huvudsiffra, en andra fakta och en mätare som
          alltid är en RIKTIG andel. Ikonerna är spelets: sfären (boxen),
          attack-glyfen, Handiwork-hammaren, riddjursemojin och HP-hjärtat.
          Korten är samtidigt flikarna – ankare mot #rh-*, som förr. */}
      <RoleDash>
        <RoleGauge href="#rh-box" on={tab === "box"} no="01" name={t("hub.box.title")} color={BAND.box}
          icon={<ItemIcon slug="pal-sphere" size={19} />}
          value={now.length} label={t("reco.stats.species")}
          note={t("hub.note.box", { n: keepCount, feed: summary.feed })}
          fill={model.totalPals > 0 ? summary.feed / model.totalPals : 0}
          meter={t("hub.meter.box", { feed: summary.feed, total: model.totalPals })} />
        <RoleGauge href="#rh-fight" on={tab === "fight"} no="02" name={t("hub.fight.title")} color={BAND.fight}
          icon={<MaskIcon name="attack" color={`color-mix(in srgb, ${BAND.fight} 70%, var(--ink))`} width={18} height={16} />}
          value={team.length} label={t("hub.kpi.team")}
          note={t("hub.note.fight", { n: bisGapsFight, ranks: fightRanksLeft })}
          fill={team.length / ATTACK_TEAM_SIZE}
          meter={t("hub.meter.fight", { n: team.length, total: ATTACK_TEAM_SIZE })} />
        <RoleGauge href="#rh-base" on={tab === "base"} no="03" name={t("hub.base.title")} color={BAND.base}
          icon={<WorkIcon type="Handcraft" size={18} />}
          value={`${tasksCovered}/${BASE_WORK_TYPES.length}`} label={t("hub.kpi.tasks")}
          note={t("hub.note.base", { n: crewBoxed.length, goods: ranchGoods })}
          fill={tasksCovered / BASE_WORK_TYPES.length}
          meter={t("hub.meter.base", { n: tasksCovered, total: BASE_WORK_TYPES.length })} />
        <RoleGauge href="#rh-mount" on={tab === "mount"} no="04" name={t("hub.mount.title")} color={BAND.mount}
          icon={<span className="em" aria-hidden>🐎</span>}
          value={mounts[0]?.mount ?? 0} label={t("hub.kpi.sprint")}
          note={t("hub.note.mount", { n: fishingOwnedCount, total: fishing.length, bis: bisGapsMount })}
          fill={fishing.length > 0 ? fishingOwnedCount / fishing.length : 0}
          meter={t("hub.meter.mount", { n: fishingOwnedCount, total: fishing.length })} />
        <RoleGauge href="#rh-player" on={tab === "player"} no="05" name={t("hub.player.title")} color={BAND.player}
          icon={<MaskIcon name="heart" color={`color-mix(in srgb, ${BAND.player} 70%, var(--ink))`} width={16} height={15} />}
          value={supportMissing} label={t("hub.kpi.missing")}
          note={t("hub.note.player", { n: supportOwned, total: supportRows.length })}
          fill={supportRows.length > 0 ? supportOwned / supportRows.length : 0}
          meter={t("hub.meter.player", { n: supportOwned, total: supportRows.length })} />
      </RoleDash>

      {/* ============ 01 · BOXEN ============ */}
      {tab === "box" && <>
        <RoleHead id="rh-box" no="01" color={BAND.box}
          title={t("hub.box.title")} question={t("hub.box.q")} />
        <ModGrid>
          <ModCol span={7}>
            <Module span={7} flush
              title={t("hub.mod.queue")}
              count={t("hub.mod.queueCount", { n: now.length, stars: summary.stars })}
              foot={<details className="rqwhy">
                <summary>{t("reco.queue.why")}</summary>
                <WhyCondense />
              </details>}>
              {now.length === 0
                ? <div className="okbox">{t("reco.queue.nothing")}</div>
                : <>
                  <div className="cqhead">
                    {QUEUE_HEAD.map((key, i) => <span key={i}>{key ? t(key) : ""}</span>)}
                  </div>
                  {shown.map((plan, i) => <CondenseRow key={plan.s} m={model} plan={plan} n={i + 1} />)}
                  {now.length > PREVIEW && (
                    <button type="button" className="ghost comore" onClick={() => setShowAll((v) => !v)}>
                      {showAll ? t("reco.queue.showFirst", { n: PREVIEW }) : t("reco.queue.showAll", { n: now.length })}
                    </button>
                  )}
                </>}
            </Module>
            <Module span={7} title={t("hub.mod.more")} count={t("hub.mod.tasks", { n: moreTasks })}
              foot={butcherRows.length > 0 ? t("reco.butcher.note") : undefined}>
              {moreTasks === 0 && <div className="hint">{t("hub.nothing")}</div>}
              {bestSite && (
                <Task n={1} title={t("hub.task.expedition", { name: bestSite.site.name })}
                  body={t("hub.task.expeditionBody", {
                    fp: Math.round(squad.fp / 1000), need: Math.round(bestSite.site.fp / 1000), n: squad.size,
                  })}
                  chips={<>
                    <span><b className="num">{bestSite.site.minutes}</b> min</span>
                    <span>{bestSite.site.rewards}</span>
                    <Tag kind="keep">{t("reco.exp.full")}</Tag>
                  </>} />
              )}
              {butcherRows.map(({ row, count }, i) => (
                <Task key={row.code} n={(bestSite ? 2 : 1) + i}
                  title={t("hub.task.butcher", { n: count, name: row.name })}
                  body={t(`reco.butcher.${row.why}`)}
                  chips={<>
                    <span>{row.gives}</span>
                    <span>{t("hub.chip.slots", { n: count })}</span>
                  </>} />
              ))}
            </Module>
          </ModCol>
          <ModCol span={5}>
            <Module span={5} title={t("reco.keep.title")} count={keepCount}
              foot={keepCount > 0 ? t("reco.keep.sub", { n: keepCount }) : undefined}>
              {keepCount === 0
                ? <div className="hint">{t("reco.keep.none")}</div>
                : <KeepConsole m={model} />}
            </Module>
          </ModCol>
          <Module span={12} title={t("reco.wait.title")}
            count={t("hub.mod.species", { n: soon.length })}
            foot={t("reco.wait.sub")}>
            {soon.length === 0 && <div className="hint">{t("reco.wait.none")}</div>}
            <div className="colist">{soon.map((plan) => <WaitRow key={plan.s} m={model} plan={plan} />)}</div>
            {later.length > 0 && (
              <details className="dgroup">
                <summary>
                  {t("reco.wait.farTitle")}{" "}
                  <span className="n">{t("reco.wait.farCount", { n: later.length })}</span>
                  <span className="why">{t("reco.wait.farWhy")}</span>
                </summary>
                <div className="colist" style={{ marginTop: 8 }}>
                  {later.map((plan) => <WaitRow key={plan.s} m={model} plan={plan} />)}
                </div>
              </details>
            )}
          </Module>

          <Module span={12} title={t("hub.mod.exp")}
            count={<>≈{Math.round(squad.fp / 1000)}k FP · {squad.size}</>}
            foot={t("reco.exp.note")}>
            <div className="imp rhwallet">
              <span>{t("reco.exp.fp")} <b className="num">≈{Math.round(squad.fp / 1000)}k</b></span>
              <span>{t("reco.exp.size")} <b className="num">{squad.size}</b></span>
            </div>
            <div className="qlog">
              {expeditionRows.map(({ site, open, fpOk, elOk, elHave }) => (
                <div key={site.name} className={`qlrow ${!open ? "qdone" : ""}`}>
                  <Tag kind={!open ? "cond" : fpOk && elOk ? "keep" : "lucky"}>
                    {!open ? t("reco.exp.locked") : fpOk && elOk ? t("reco.exp.full") : t("reco.exp.partial")}
                  </Tag>
                  <span className="nm">{site.name}{site.hard ? " · HARD" : ""}</span>
                  <span className="meta num">≈{Math.round(site.fp / 1000)}k FP · {site.minutes} min</span>
                  {site.need && (
                    <span className="meta">
                      {site.need.n}× {site.need.el}{elOk ? " ✓" : ` (${elHave})`}
                    </span>
                  )}
                  <span className="meta">{site.rewards}</span>
                </div>
              ))}
            </div>
          </Module>
        </ModGrid>
      </>}

      {/* ============ 02 · STRID ============ */}
      {tab === "fight" && <>
        <RoleHead id="rh-fight" no="02" color={BAND.fight}
          title={t("hub.fight.title")} question={t("hub.fight.q")} />
        <ModGrid>
          <ModCol span={5}>
            <Module span={5} title={t("hub.do")}
              count={t("hub.mod.tasks", { n: fightGaps.slice(0, 3).length + (fight ? 1 : 0) })}>
              {fightGaps.length === 0 && soulsFight.length === 0 && !fight && (
                <div className="hint">{t("hub.nothing")}</div>
              )}
              {fightGaps.slice(0, 3).map((g, i) => {
                const first = g.missing[0]!;
                const hasImp = (imps[first.id] ?? 0) > 0;
                return (
                  <Task key={g.p.id} n={i + 1} color={elementColor(g.species)}
                    title={t(hasImp ? "hub.task.gapImplant" : "hub.task.gap", { name: g.species.name, passive: first.name })}
                    onClick={() => gotoBreeding(g.p.s, g.missing.map((s) => s.id))}
                    chips={<>
                      {g.missing.map((slot) => {
                        const c = passiveCounts.get(slot.id) ?? 0;
                        return (
                          <span key={slot.id}>
                            {slot.name} {(imps[slot.id] ?? 0) > 0 ? "✓" : `×${c}`}
                          </span>
                        );
                      })}
                      {hasImp && <Tag kind="keep">{t("bis.implant")}</Tag>}
                    </>} />
                );
              })}
              {fight && (
                <Task n={fightGaps.slice(0, 3).length + 1} href="/quests"
                  title={t("hub.task.nextFight", { name: fight.name })}
                  chips={<>
                    <span>Lv <b className="num">{fight.level}</b></span>
                    {fight.elements.map((el) => (
                      <span key={el}><GameIcon name={ELEMENT_ICON[el] ?? "neutral"} size={13} /> {el}</span>
                    ))}
                  </>} />
              )}
              {soulsFight.length > 0 && (
                <>
                  <RhSub note={t("reco.souls.sub")}>{t("reco.souls.title")}</RhSub>
                  <SoulWallet />
                  <SoulRows rows={soulsFight} />
                  <div className="hint">{t("reco.souls.note")}</div>
                </>
              )}
            </Module>
            <Module span={5} title={t(BIS_TEMPLATES.attack.role)}
              foot={<><BisNote kind="attack" />{" "}
                {rich("best.attack.ultimate", { passives: <b>{t("best.attack.ultimateList")}</b> })}</>}>
              <BisCard kind="attack" />
            </Module>
          </ModCol>
          <ModCol span={7}>
            <Module span={7} title={t("best.attack.title")} count={team.length}
              foot={t("best.attack.sub")}>
              {/* Formationen: störst först med rankflagga och stapel – inte fem
                  likvärdiga porträtt på rad. */}
              <div className="trow bfform">
                {team.map((p, i) => (
                  <TeamPortrait
                    key={p.id} species={sp(p.s)} rank={i + 1} size={FORM_SIZES[i] ?? 56}
                    why={
                      <>
                        <span className="statbar tiny">
                          <i style={{ width: `${Math.round((p.combat / (team[0]?.combat || 1)) * 100)}%` }} />
                        </span>
                        {t("best.attack.why", { element: sp(p.s).elements[0] ?? "Normal", n: p.combat })}
                      </>
                    }
                  />
                ))}
              </div>
            </Module>
            <Module span={7} title={t("hub.mod.loadouts")} count={team.length}
              foot={t("best.attack.loadoutSub")}>
              <LoadoutGrid team={team} purpose="attack"
                label={(p) => t("best.attack.label", { n: p.combat })} />
            </Module>
          </ModCol>
          <Module span={12} title={t("hub.mod.rank")}>
            <details className="dgroup" open>
              <summary>{t("best.attack.top15")} <span className="n">{t("best.attack.allElements")}</span></summary>
              {attackers.slice(0, 15).map((p) => (
                <div key={p.id} className="rrow">
                  <SpeciesIcon sp={sp(p.s)} size={38} radius={10} />
                  <span className="nm">{sp(p.s).name} <GenderSymbol g={p.g} /></span>
                  <ElementIcons sp={sp(p.s)} />
                  <span className="ivt">
                    {t("best.attack.row", { power: p.combat, iv: p.iv[1], lv: p.lv })}
                    {p.stars > 0 ? ` · ${"★".repeat(p.stars)}` : ""}
                  </span>
                  <div className="grow"><PassiveList items={passiveItems(p)} /></div>
                </div>
              ))}
            </details>
            <details className="dgroup">
              <summary>{t("best.attack.global")} <span className="n">{t("best.attack.clickHint")}</span></summary>
              {globalAttackers.map((s, i) => {
                const top = sp(globalAttackers[0] ?? s).sc[1] || 1;
                return (
                  <button key={s} className="rrow rowbtn" onClick={() => gotoBreeding(s)} title={t("best.planTitle")}>
                    <span className={`rank r${Math.min(i + 1, 4)}`}>{i + 1}</span>
                    <span className="ava" style={{ background: elementBg(sp(s)) }}>
                      <SpeciesIcon sp={sp(s)} size={38} radius={19} />
                    </span>
                    <span className="nm">{sp(s).name}</span>
                    <span className="els"><ElementIcons sp={sp(s)} /></span>
                    <span className="statbar" title={t("best.attack.scaling", { n: sp(s).sc[1] })}>
                      <i style={{ width: `${Math.round((sp(s).sc[1] / top) * 100)}%` }} />
                    </span>
                    <span className="ivt">{t("best.attack.stats", { atk: sp(s).sc[1], hp: sp(s).sc[0] })}</span>
                    {ownStatus(s)}
                    <span className="meta arrow-end">→</span>
                  </button>
                );
              })}
            </details>
          </Module>

          <Module span={12} title={t("best.finder.title")} foot={t("best.finder.foot")}>
            <div className="sub">{t("best.finder.sub")}</div>
            <div className="controls" style={{ marginBottom: 8 }}>
              <button
                type="button"
                className={`fchip ${findEl === null ? "on" : ""}`}
                aria-pressed={findEl === null}
                onClick={() => setFindEl(null)}
              >
                {t("best.finder.anyEl")}
              </button>
              {/* Elementnamnen är spelets egna ord och står kvar på engelska –
                  ikonen är samma som spelets menyer, så den bär igenkänningen. */}
              {FINDER_ELEMENTS.map((el) => (
                <button
                  key={el}
                  type="button"
                  className={`fchip elchip ${findEl === el ? "on" : ""}`}
                  aria-pressed={findEl === el}
                  title={el}
                  onClick={() => setFindEl((cur) => (cur === el ? null : el))}
                >
                  <GameIcon name={ELEMENT_ICON[el] ?? "neutral"} size={16} /> {el}
                </button>
              ))}
            </div>
            <div className="controls">
              {FINDER_PURPOSES.map(([id, key]) => (
                <button
                  key={id}
                  type="button"
                  className={`fchip ${findFor === id ? "on" : ""}`}
                  aria-pressed={findFor === id}
                  onClick={() => setFindFor(id)}
                >
                  {t(key)}
                </button>
              ))}
              <span className="meta">{t("best.finder.workHint")}</span>
            </div>
            {found.map((s, i) => {
              const top = findVal(found[0] ?? s) || 1;
              return (
                <button key={s} className="rrow rowbtn" onClick={() => gotoBreeding(s)} title={t("best.planTitle")}>
                  <span className={`rank r${Math.min(i + 1, 4)}`}>{i + 1}</span>
                  <span className="ava" style={{ background: elementBg(sp(s)) }}>
                    <SpeciesIcon sp={sp(s)} size={38} radius={19} />
                  </span>
                  <span className="nm">{sp(s).name}</span>
                  <span className="els"><ElementIcons sp={sp(s)} /></span>
                  <span className="statbar">
                    <i style={{ width: `${Math.round((findVal(s) / top) * 100)}%` }} />
                  </span>
                  <span className="ivt">
                    {t(findFor === "attack" ? "best.finder.valAttack"
                      : findFor === "tanky" ? "best.finder.valTanky" : "best.finder.valMount",
                    { n: findVal(s) })}
                  </span>
                  {ownStatus(s)}
                  <span className="meta arrow-end">→</span>
                </button>
              );
            })}
          </Module>
        </ModGrid>
      </>}

      {/* ============ 03 · BASEN ============ */}
      {tab === "base" && <>
        <RoleHead id="rh-base" no="03" color={BAND.base}
          title={t("hub.base.title")} question={t("hub.base.q")} />
        <ModGrid>
          <ModCol span={5}>
            <Module span={5} title={t("hub.do")}
              count={t("hub.mod.tasks", {
                n: (crewBoxed.length > 0 ? 1 : 0) + (ranchKeep ? 1 : 0) + (defensePick ? 1 : 0),
              })}>
              {crewBoxed.length === 0 && !ranchKeep && !defensePick && soulsWork.length === 0 && (
                <div className="hint">{t("hub.nothing")}</div>
              )}
              {(() => {
                let n = 0;
                return (
                  <>
                    {crewBoxed.length > 0 && (
                      <Task n={++n} href="/box"
                        title={t("hub.task.deploy", {
                          names: crewBoxed.slice(0, 3).map((p) => sp(p.s).name).join(", ")
                            + (crewBoxed.length > 3 ? ` +${crewBoxed.length - 3}` : ""),
                        })}
                        body={t("hub.task.deployBody")}
                        chips={crewBoxed.slice(0, 3).map((p) => {
                          const w = topWork(sp(p.s), WORK_TYPES);
                          return (
                            <span key={p.id}>
                              {w && <WorkIcon type={w} size={13} />} {sp(p.s).name} <b className="num">{w ? sp(p.s).ws[w] : ""}</b>
                            </span>
                          );
                        })} />
                    )}
                    {ranchKeep && (
                      <Task n={++n} color={elementColor(sp(ranchKeep.plan.s))}
                        title={t("hub.task.ranchKeep", { name: ranchKeep.name })}
                        body={t("hub.task.ranchKeepBody", { name: ranchKeep.name, item: ranchKeep.item })}
                        chips={<><WorkIcon type="MonsterFarm" size={13} /><span>{ranchKeep.item}</span></>} />
                    )}
                    {defensePick && (
                      <Task n={++n} color={elementColor(defensePick.species)}
                        title={t("hub.task.defense", { name: defensePick.species.name })}
                        body={partnerSkill(defensePick.species.code)?.desc ?? t("bf.noSkillData")}
                        chips={<Tag kind="keep">{t("best.own.owned")}</Tag>} />
                    )}
                  </>
                );
              })()}
              {soulsWork.length > 0 && (
                <>
                  <RhSub note={t("reco.souls.sub")}>{t("reco.souls.title")}</RhSub>
                  <SoulRows rows={soulsWork} max={3} />
                </>
              )}
            </Module>
            <Module span={5} title={t(BIS_TEMPLATES.work.role)} foot={<BisNote kind="work" />}>
              <BisCard kind="work" />
            </Module>
            {/* Basförsvar: 1.0:s vågräder mot basen. Panthalus partnerskill ÄR
                luftvärn – resten är communityns val, märkta som råd. */}
            <Module span={5} title={t("bf.defTitle")} foot={t("bf.defNote")}>
              <div className="sub">{t("bf.defSub")}</div>
              {DEFENSE_META.map(({ code }) => {
                const i = spIdxByCode.get(code.toLowerCase());
                if (i === undefined) return null;
                const spec = sp(i);
                const ps = partnerSkill(spec.code);
                return (
                  <div key={code} className="rrow" style={{ "--elc": elementColor(spec) } as CSSProperties}>
                    <SpeciesIcon sp={spec} size={38} radius={10} />
                    <span className="nm">{spec.name}</span>
                    <span className="psdesc">{ps && <b>{ps.skill}</b>}{ps ? " — " : ""}{ps?.desc}</span>
                    {ownStatus(i, true)}
                  </div>
                );
              })}
            </Module>
          </ModCol>
          <ModCol span={7}>
            <Module span={7} title={t("best.crew.title")} count={crew.length}
              foot={t("best.crew.sub")}>
              {/* Basgänget som elementtvättade kort – sysslorna och var exemplaret
                  faktiskt står syns utan hovring. */}
              <div className="bfcrew">
                {crew.map((p) => (
                  <div key={p.id} className="ovcard" style={{ "--elc": elementColor(sp(p.s)) } as CSSProperties}>
                    <SpeciesIcon sp={sp(p.s)} size={44} radius={22} />
                    <span className="txt">
                      <span className="nm">{sp(p.s).name}</span>
                      <span className="v">{crewWhy(p)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Module>
            <Module span={7} title={t("hub.mod.loadouts")} count={crew.length}
              foot={t("best.crew.loadoutSub")}>
              <LoadoutGrid team={crew} purpose="work" label={(p) => {
                const w = topWork(sp(p.s), WORK_TYPES);
                return w
                  ? t("best.crew.label", { work: WORK_META[w]!.label, n: sp(p.s).ws[w] ?? 0 })
                  : t("purpose.work");
              }} />
            </Module>
            <Module span={7} title={t("best.ranch.title")} count={ranchGoods}
              foot={rich("best.ranch.sub", { species: <b>{t("best.ranch.subEmph")}</b> })}>
              <div className="wgrid">
                {ranch.filter((e) => e.item !== null).map((entry) => (
                  <div key={entry.item} className="wcard">
                    <div className="wt">
                      <span className="em"><WorkIcon type="MonsterFarm" size={17} /></span>{entry.item}
                      {/* Grupp, inte item-id: speltexten säger "various seeds" utan
                          att räkna upp dem, och då får kortet inte låta som en vara. */}
                      {entry.group && <Tag kind="cond">{t("best.ranch.group")}</Tag>}
                    </div>
                    {entry.producers.slice(0, 4).map((prod, i) => (
                      <button key={prod.s} className="wrow rowbtn" onClick={() => gotoBreeding(prod.s)}
                        title={prod.owned ? t("best.ranch.place") : t("best.planTitle")}>
                        <span className={`rank sm r${Math.min(i + 1, 4)}`}>{i + 1}</span>
                        <span className="ava sm" style={{ background: elementBg(sp(prod.s)) }}>
                          <SpeciesIcon sp={sp(prod.s)} size={28} radius={14} />
                        </span>
                        <span className="nm">{sp(prod.s).name}</span>
                        <span className="lvl" title={t("best.ranch.levelTitle")}>{prod.level}</span>
                        {ownStatus(prod.s, true)}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {/* Datasetet har inga ranch-varor alls, så tabellen är handkurerad. Att
                  visa luckan är hela poängen: en gissad vara skickar någon till
                  ranchen med fel pal, och det syns först timmar senare. */}
              {ranch.filter((e) => e.item === null).map((entry) => (
                <div key="okand" className="hint ranchgap">
                  <b>{t("best.ranch.unknown", { n: entry.producers.length })}</b>
                  {t("best.ranch.unknownBody", {
                    names: entry.producers.map((prod) => sp(prod.s).name).join(", "),
                  })}
                </div>
              ))}
            </Module>
          </ModCol>
          <Module span={12} title={t("hub.mod.workers")}>
            <details className="dgroup" open>
              <summary>{t("best.crew.own")}</summary>
              <div className="wgrid">
                {BASE_WORK_TYPES.map((w) => {
                  const best = [...pals]
                    .filter((p) => (sp(p.s).ws[w] ?? 0) > 0)
                    .sort((a, b) => workScore(data, b, w) - workScore(data, a, w))
                    .slice(0, 3);
                  if (!best.length) return null;
                  return (
                    <div key={w} className="wcard">
                      <div className="wt"><span className="em"><WorkIcon type={w} size={17} /></span>{WORK_META[w]!.label}</div>
                      {best.map((p, i) => (
                        <div key={p.id} className="wrow">
                          <span className={`rank sm r${Math.min(i + 1, 4)}`}>{i + 1}</span>
                          <span className="ava sm" style={{ background: elementBg(sp(p.s)) }}>
                            <SpeciesIcon sp={sp(p.s)} size={28} radius={14} />
                          </span>
                          <span className="nm">{sp(p.s).name}{sp(p.s).noct ? " 🌙" : ""}</span>
                          {p.fxCraft > 0 && <span className="spd">+{Math.round(p.fxCraft * 100)}%</span>}
                          <span className="lvl">{sp(p.s).ws[w]}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </details>
            <details className="dgroup">
              <summary>{t("best.crew.global")} <span className="n">{t("best.attack.clickHint")}</span></summary>
              <div className="wgrid">
                {globalWorkers.map(([w, list]) => (
                  <div key={w} className="wcard">
                    <div className="wt"><span className="em"><WorkIcon type={w} size={17} /></span>{WORK_META[w]!.label}</div>
                    {list.map((s, i) => (
                      <button key={s} className="wrow rowbtn" onClick={() => gotoBreeding(s)}>
                        <span className={`rank sm r${Math.min(i + 1, 4)}`}>{i + 1}</span>
                        <span className="ava sm" style={{ background: elementBg(sp(s)) }}>
                          <SpeciesIcon sp={sp(s)} size={28} radius={14} />
                        </span>
                        <span className="nm">{sp(s).name}{sp(s).noct ? " 🌙" : ""}</span>
                        <span className="lvl">{sp(s).ws[w]}</span>
                        {ownStatus(s, true)}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </Module>

        </ModGrid>
      </>}

      {/* ============ 04 · RIDDJUR & FISKE ============ */}
      {tab === "mount" && <>
        <RoleHead id="rh-mount" no="04" color={BAND.mount}
          title={t("hub.mount.title")} question={t("hub.mount.q")} />
        <ModGrid>
          <ModCol span={5}>
            <Module span={5} title={t("hub.do")}
              count={t("hub.mod.tasks", { n: mountGaps.length + fishing.filter((f) => !ownedSpecies.has(f.idx)).slice(0, 2).length })}>
              {mountGaps.length === 0 && soulsMount.length === 0
                && fishing.every((f) => ownedSpecies.has(f.idx)) && (
                <div className="hint">{t("hub.nothing")}</div>
              )}
              {(() => {
                let n = 0;
                return (
                  <>
                    {mountGaps.map((g) => {
                      const first = g.missing[0]!;
                      const hasImp = (imps[first.id] ?? 0) > 0;
                      return (
                        <Task key={g.p.id} n={++n} color={elementColor(g.species)}
                          title={t(hasImp ? "hub.task.gapImplant" : "hub.task.gap", { name: g.species.name, passive: first.name })}
                          onClick={() => gotoBreeding(g.p.s, g.missing.map((s) => s.id))}
                          chips={g.missing.map((slot) => {
                            const c = passiveCounts.get(slot.id) ?? 0;
                            return (
                              <span key={slot.id}>
                                {slot.name} {(imps[slot.id] ?? 0) > 0 ? "✓" : `×${c}`}
                              </span>
                            );
                          })} />
                      );
                    })}
                    {fishing.filter((f) => !ownedSpecies.has(f.idx)).slice(0, 2).map((f) => (
                      <Task key={f.idx} n={++n} color={elementColor(sp(f.idx))}
                        title={t("hub.task.get", { name: f.name })}
                        body={t(f.desc)}
                        onClick={() => gotoBreeding(f.idx)}
                        chips={ownStatus(f.idx)} />
                    ))}
                  </>
                );
              })()}
              {soulsMount.length > 0 && (
                <>
                  <RhSub note={t("reco.souls.sub")}>{t("reco.souls.title")}</RhSub>
                  <SoulRows rows={soulsMount} max={2} />
                </>
              )}
            </Module>
            <Module span={5} title={t(BIS_TEMPLATES.mount.role)} foot={<BisNote kind="mount" />}>
              <BisCard kind="mount" />
            </Module>
          </ModCol>
          <ModCol span={7}>
            <Module span={7} title={t("best.mount.title")} count={mounts.length}
              foot={t("best.mount.sub")}>
              {/* Pallplats för topp tre: tvåan till vänster, ettan högst, trean lägst. */}
              <div className="bfpod">
                {[1, 0, 2].map((idx, col) => {
                  const p = mounts[idx];
                  if (!p) return null;
                  return (
                    <div key={p.id} className={`bfst c${col}`}>
                      <TeamPortrait
                        species={sp(p.s)} size={idx === 0 ? 74 : 56}
                        why={t("best.mount.why", { n: p.mount })}
                      />
                      <div className={`bfbase r${Math.min(idx + 1, 4)}`}>{idx + 1}</div>
                    </div>
                  );
                })}
              </div>
              {mounts.length > 3 && (
                <div className="trow">
                  {mounts.slice(3).map((p, i) => (
                    <TeamPortrait
                      key={p.id} species={sp(p.s)} rank={i + 4} size={48}
                      why={t("best.mount.why", { n: p.mount })}
                    />
                  ))}
                </div>
              )}
            </Module>
            <Module span={7} title={t("hub.mod.loadouts")} count={mounts.length}
              foot={t("best.mount.loadoutSub")}>
              <LoadoutGrid team={mounts} purpose="mount"
                label={(p) => t("best.mount.label", { n: p.mount })} />
            </Module>
          </ModCol>
          <Module span={12} title={t("best.fishing.title")}
            count={`${fishingOwnedCount}/${fishing.length}`} foot={t("best.fishing.sub")}>
            {fishing.map(({ name, desc, idx }) => {
              const owned = ownedSpecies.has(idx);
              const b = bestOf.get(idx);
              return (
                <button key={idx} className="rrow rowbtn" onClick={() => gotoBreeding(idx)}>
                  <SpeciesIcon sp={sp(idx)} size={38} radius={10} />
                  <span className="nm">{name}</span>
                  <span className="ivt grow">{t(desc)}</span>
                  {owned && b
                    ? <><Tag kind="keep">{t("best.own.owned")}</Tag><span className="meta">{t("pal.lv", { n: b.lv })} · IV {b.iv.join("/")}</span></>
                    : ownStatus(idx)}
                </button>
              );
            })}
          </Module>
        </ModGrid>
      </>}

      {/* ============ 05 · SPELAREN ============ */}
      {tab === "player" && <>
        <RoleHead id="rh-player" no="05" color={BAND.player}
          title={t("hub.player.title")} question={t("hub.player.q")} />
        <ModGrid>
          <Module span={5} title={t("hub.do")}
            count={t("hub.mod.tasks", {
              n: (gobfin && gobfin.have < gobfin.total ? 1 : 0)
                + supportRows.filter((r) => !r.owned).slice(0, 2).length,
            })}>
            {(!gobfin || gobfin.have >= gobfin.total) && supportRows.every((r) => r.owned) && (
              <div className="hint">{t("hub.nothing")}</div>
            )}
            {(() => {
              let n = 0;
              return (
                <>
                  {gobfin && gobfin.have < gobfin.total && (
                    <Task n={++n} title={t("hub.task.gobfin")}
                      body={t("hub.task.gobfinBody", { have: gobfin.have, n: gobfin.total })}
                      onClick={() => gotoBreeding(gobfin.i, [gobfin.vanguard])}
                      chips={<span><b className="num">{gobfin.have}/{gobfin.total}</b> Vanguard</span>} />
                  )}
                  {supportRows.filter((r) => !r.owned).slice(0, 2).map((r) => {
                    const ps = partnerSkill(r.species.code);
                    return (
                      <Task key={r.i} n={++n} color={elementColor(r.species)}
                        title={t("hub.task.get", { name: r.species.name })}
                        body={ps ? `${ps.skill} — ${ps.desc}` : t("bf.noSkillData")}
                        onClick={() => gotoBreeding(r.i)}
                        chips={ownStatus(r.i)} />
                    );
                  })}
                </>
              );
            })()}
          </Module>

          {/* Bäst för SPELAREN: pals vars partnerskill buffar dig – kategorin
              rankningarna aldrig kunde se förrän partnerskills fanns i datat.
              Motiveringen ÄR spelets egen skilltext. */}
          <Module span={7} title={t("bf.supTitle")}
            count={`${supportOwned}/${supportRows.length}`} foot={t("bf.supNote")}>
            <div className="sub">{t("bf.supSub")}</div>
            {supportRows.map(({ i, species, note }) => {
              const ps = partnerSkill(species.code);
              return (
                <div key={species.code} className="rrow" style={{ "--elc": elementColor(species) } as CSSProperties}>
                  <SpeciesIcon sp={species} size={38} radius={10} />
                  <span className="nm">{species.name}</span>
                  <span className="psdesc">
                    {ps && <b>{ps.skill}</b>}{ps ? " — " : ""}{ps?.desc ?? t("bf.noSkillData")}
                    {note && <> · <i>{t(`bf.meta.${note}` as Parameters<typeof t>[0])}</i></>}
                  </span>
                  {ownStatus(i, true)}
                </div>
              );
            })}
          </Module>
        </ModGrid>
      </>}

      {/* Djuplänken från gamla "Bäst för…" är kvar som omdirigering – den som
          bokmärkt sidan landar här. Sista raden pekar tillbaka till sökningen. */}
      <div className="hint" style={{ marginTop: 14 }}>
        {t("hub.foot")} <Link href="/find">{t("nav.find")} →</Link>
      </div>
    </>
  );
}
