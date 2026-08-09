/**
 * Kondenseringsråd per art: går det att kondensera *nu*, vad vinner du på det,
 * vem behåller du – och vad är exemplaret du behåller egentligen bra för?
 *
 * Sidan visade förut bara "N dubbletter" och en förloppsmätare. Det svarar inte
 * på frågan man faktiskt ställer sig framför Pal Essence Condenser: ska jag mata
 * den här arten nu, eller vänta? Räkningen är inte uppenbar eftersom
 * stjärnkostnaderna är kumulativa (4 → 16 → 32 → 64): 20 dubbletter räcker till
 * TVÅ stjärnor från noll, men till ingen alls från 2★, där nästa steg ensamt
 * kostar 32. Två arter med "20 dubbletter" är alltså helt olika lägen, och det
 * gick inte att se på den gamla mätaren.
 */
import { workScore } from "./best";
import { FISHING_PALS, WORK_META, WORK_TYPES } from "./constants";
import { condenseReach, displayStats, type DisplayStats } from "./scoring";
import type { AppData, ScoredPal, WorkType } from "./types";

/* ============================================================
   "Bra för…" – vad en pal faktiskt används till
   ============================================================ */

export type UseKind = "work" | "combat" | "mount" | "fishing";

export interface PalUse {
  kind: UseKind;
  /** Sysslan när `kind` är "work" – gränssnittet ritar spelets arbetsikon. */
  work?: WorkType;
  /** Arbetsnivå (1–8) för work, annars placeringen i boxens topplista. */
  level?: number;
  label: string;
  /** Bäst i boxen **och** nivån är hög nog att siffran betyder något. */
  best: boolean;
  /**
   * Bäst i boxen bara för att ingen annan kan – nivån ligger under `WORK_FLOOR`.
   * Skilt från `best` med flit: "bäst i boxen på Mining" om boxens enda gruvpal
   * är en Cattiva på nivå 1 låter som ett skäl att spara henne, och är det inte.
   */
  only: boolean;
  /** Varför siffran inte är hela sanningen (ranchen). */
  caveat?: string;
}

export interface UseIndex {
  /** Pal-id för boxens bästa arbetare per syssla. */
  bestWorker: ReadonlyMap<WorkType, string>;
  /** Pal-id → placering i boxens stridslista (bara toppen). */
  combatRank: ReadonlyMap<string, number>;
  /** Pal-id → placering i boxens riddjurslista (bara toppen). */
  mountRank: ReadonlyMap<string, number>;
  /** Arter med fiske-partnerskill. */
  fishing: ReadonlySet<number>;
}

/** Hur långt ner i topplistorna en placering fortfarande säger något. */
const RANK_DEPTH = 10;
/** Arbetsnivå som räcker för att kalla arten "bra på" en syssla. */
const WORK_FLOOR = 3;

/**
 * Ranchen (`MonsterFarm`) är den enda sysslan där nivån inte avgör värdet.
 * Varje art lägger sin **egen** vara i ranchen – ull, ägg, honung, tyg – och
 * Farming-nivån styr bara takten. Att kröna den med högst siffra till "bäst i
 * boxen" svarar därför på en fråga ingen ställer: det som avgör är om man vill
 * ha just den varan, inte hur snabbt den kommer. Sysslan visas ändå, för att
 * behålla *ett* exemplar av arten är hela poängen med en ranchpal – men aldrig
 * som en topplacering.
 */
const RANCH_CAVEAT = "Ranchen ger artens egen vara – nivån styr bara takten, inte vad som kommer ut.";

/**
 * Räknar en gång per box vad varje pal är bäst på. Att göra det per kort vore
 * O(arter × pals) om och om igen – och "bäst i boxen" går ändå bara att avgöra
 * genom att titta på hela boxen samtidigt.
 */
export function buildUseIndex(data: AppData, pals: readonly ScoredPal[]): UseIndex {
  const bestWorker = new Map<WorkType, string>();
  for (const t of WORK_TYPES) {
    let best: ScoredPal | null = null;
    let top = 0;
    for (const p of pals) {
      const s = workScore(data, p, t);
      if (s > top) { top = s; best = p; }
    }
    if (best) bestWorker.set(t, best.id);
  }

  const ranked = (list: readonly ScoredPal[]) =>
    new Map(list.slice(0, RANK_DEPTH).map((p, i) => [p.id, i + 1] as const));
  const byName = new Map(data.species.map((sp, i) => [sp.name, i] as const));

  return {
    bestWorker,
    combatRank: ranked([...pals].sort((a, b) => b.combat - a.combat)),
    mountRank: ranked(
      [...pals]
        .filter((p) => (data.species[p.s]?.spr ?? 0) > 0)
        .sort((a, b) => b.mount - a.mount),
    ),
    fishing: new Set(
      FISHING_PALS.map(([name]) => byName.get(name)).filter((i): i is number => i !== undefined),
    ),
  };
}

/** Vad palen är bra för, starkaste skälet först. */
export function palUses(data: AppData, p: ScoredPal, idx: UseIndex, limit = 4): PalUse[] {
  const sp = data.species[p.s];
  if (!sp) return [];

  const work = WORK_TYPES
    .filter((t) => t !== "MonsterFarm")
    .map((t) => ({ t, level: sp.ws[t] ?? 0 }))
    .filter((w) => w.level > 0)
    .sort((a, b) => b.level - a.level);

  const uses: PalUse[] = work
    // En låg arbetsnivå säger inget – utom när ingen annan i boxen gör det bättre.
    .filter((w) => w.level >= WORK_FLOOR || idx.bestWorker.get(w.t) === p.id)
    .map((w) => {
      const top = idx.bestWorker.get(w.t) === p.id;
      return {
        kind: "work" as const,
        work: w.t,
        level: w.level,
        label: WORK_META[w.t]?.label ?? w.t,
        best: top && w.level >= WORK_FLOOR,
        only: top && w.level < WORK_FLOOR,
      };
    });

  const combat = idx.combatRank.get(p.id);
  if (combat !== undefined) {
    uses.push({ kind: "combat", level: combat, label: `Strid #${combat}`, best: combat === 1, only: false });
  }
  const mount = idx.mountRank.get(p.id);
  if (mount !== undefined) {
    uses.push({ kind: "mount", level: mount, label: `Riddjur #${mount}`, best: mount === 1, only: false });
  }
  const ranch = sp.ws.MonsterFarm ?? 0;
  if (ranch > 0) {
    uses.push({
      kind: "work", work: "MonsterFarm", level: ranch,
      label: WORK_META.MonsterFarm?.label ?? "Farming",
      best: false, only: false, caveat: RANCH_CAVEAT,
    });
  }
  if (idx.fishing.has(p.s)) {
    uses.push({ kind: "fishing", label: "Fiskehjälpare", best: false, only: false });
  }

  // Utan något att visa ser kortet ut som ett fel. Artens bästa syssla oavsett
  // nivå säger åtminstone vad den *kan*.
  if (!uses.length && work[0]) {
    uses.push({
      kind: "work", work: work[0].t, level: work[0].level,
      label: WORK_META[work[0].t]?.label ?? work[0].t, best: false, only: false,
    });
  }

  // "Bäst i boxen" får aldrig kapas bort av `limit`, och "enda i boxen" ska
  // ligga före resten – sorten är stabil, så inbördes ordning inom varje
  // grupp står kvar.
  const weight = (u: PalUse) => (u.best ? 2 : u.only ? 1 : 0);
  return [...uses].sort((a, b) => weight(b) - weight(a)).slice(0, limit);
}

/* ============================================================
   Kondenseringsplan per art
   ============================================================ */

export type CondenseVerdict = "now" | "soon" | "hold" | "max";

export type CondenseNoteKind = "passive" | "iv" | "better" | "last";

export interface CondenseNote {
  kind: CondenseNoteKind;
  text: string;
}

export interface CondensePlan {
  /** Artindex. */
  s: number;
  /** Exemplaret allt matas till. */
  keeper: ScoredPal;
  /** Exemplar som spara-reglerna inte plockade upp. */
  fodder: ScoredPal[];
  verdict: CondenseVerdict;
  fromStars: number;
  /** Stjärnor man når med dubbletterna man redan har. */
  reach: number;
  /** Antal att mata nu. Lika många platser frigörs i boxen. */
  feed: number;
  /** Dubbletter som blir kvar efteråt. */
  leftover: number;
  /** Så många till behövs för stjärnan efter `reach`. 0 när `reach` är 4★. */
  missing: number;
  /** Kostnaden för den stjärnan. 0 vid 4★. */
  nextCost: number;
  notes: CondenseNote[];
}

/** Hur nära nästa stjärna man ska vara för att räknas som "nästan där". */
const soonLimit = (nextCost: number) => Math.max(2, Math.round(nextCost / 4));

/** Skillnad i IV-summa som gör det värt att peka på ett annat exemplar. */
const IV_GAP = 30;

const VERDICT_ORDER: Record<CondenseVerdict, number> = { now: 0, soon: 1, hold: 2, max: 3 };

/**
 * En plan per art med dubbletter, sorterad så det som går att göra just nu
 * ligger först och ger mest (stjärnor före frigjorda platser).
 */
export function planCondense(
  data: AppData,
  pals: readonly ScoredPal[],
  bestOf: ReadonlyMap<number, ScoredPal>,
): CondensePlan[] {
  const bySpecies = new Map<number, ScoredPal[]>();
  for (const p of pals) {
    const list = bySpecies.get(p.s);
    if (list) list.push(p);
    else bySpecies.set(p.s, [p]);
  }

  const plans: CondensePlan[] = [];
  for (const [s, all] of bySpecies) {
    const keeper = bestOf.get(s);
    const fodder = all.filter((p) => !p.keep);
    if (!keeper || !fodder.length) continue;

    const { reach, left, nextCost } = condenseReach(keeper.stars, fodder.length);
    const missing = nextCost > 0 ? nextCost - left : 0;
    const feed = fodder.length - left;
    const verdict: CondenseVerdict =
      reach > keeper.stars ? "now"
        : nextCost === 0 ? "max"
          : missing <= soonLimit(nextCost) ? "soon"
            : "hold";

    plans.push({
      s, keeper, fodder, verdict, fromStars: keeper.stars, reach,
      feed, leftover: left, missing, nextCost,
      notes: notesFor(all, fodder, keeper, feed, left),
    });
  }

  return plans.sort((a, b) =>
    VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict]
    || (b.reach - b.fromStars) - (a.reach - a.fromStars)
    || b.feed - a.feed
    || a.missing - b.missing
    || b.fodder.length - a.fodder.length);
}

/**
 * Sakerna som gör att man ångrar sig efteråt. Spara-reglerna släpper igenom
 * exemplar som ändå är värda en titt: en ensam guldpassiv utan hög IV, eller en
 * enda 100:a i en stat – den senare är byggsten i `planPerfectLine`, inte mat.
 */
function notesFor(
  all: readonly ScoredPal[],
  fodder: readonly ScoredPal[],
  keeper: ScoredPal,
  feed: number,
  leftover: number,
): CondenseNote[] {
  const notes: CondenseNote[] = [];

  /* Texterna är korta med flit: de upprepas på varje kort, och tre stycken
     brödtext per art dränker själva åtgärden. */
  const gold = fodder.filter((p) => p.tiers.some((t) => t >= 4)).length;
  if (gold > 0) {
    notes.push({
      kind: "passive",
      text: `${gold} bär en guld- eller rainbow-passiv – passiver går bara att ärva, aldrig slumpa fram.`,
    });
  }

  const donors = fodder.filter((p) => p.iv.some((v) => v >= 100)).length;
  if (donors > 0) {
    notes.push({
      kind: "iv",
      text: `${donors} har en 100:a i en stat – byggstenar i en 100/100/100-linje, inte bara mat.`,
    });
  }

  const bestIv = all.reduce((a, b) => (b.ivSum > a.ivSum ? b : a), keeper);
  if (bestIv !== keeper && bestIv.ivSum - keeper.ivSum >= IV_GAP) {
    notes.push({
      kind: "better",
      text: `Bästa IV i arten är ${bestIv.iv.join("/")}, inte ${keeper.iv.join("/")} – kondensera på den du tänker använda.`,
    });
  }

  if (feed > 0 && leftover === 0 && all.filter((p) => p.keep).length <= 1) {
    notes.push({
      kind: "last",
      text: "Sista exemplaret blir ensamt kvar – arten går då inte att para med sig själv.",
    });
  }

  return notes;
}

export interface CondenseSummary {
  /** Arter som går att kondensera direkt. */
  species: number;
  /** Pals som kan matas nu – lika många platser frigörs. */
  feed: number;
  /** Stjärnor som kommer ut av det. */
  stars: number;
}

/** Vad kondenseringen faktiskt ger – i stats, inte i stjärnor. */
export interface CondenseGain {
  /** Stjärnor man hoppar (0 om ingenting går att göra nu). */
  stars: number;
  /** ≈ +5 % HP/attack/försvar per stjärna. */
  pct: number;
  /** Frigjorda boxplatser = antalet matade. */
  slots: number;
  before: DisplayStats;
  after: DisplayStats;
}

/**
 * "Varför ska jag kondensera?" går inte att svara på med en stjärna: +2★ säger
 * ingenting om man inte vet vad en stjärna gör. Samma pal före och efter, med
 * spelets egna stat-formler, gör vinsten konkret – och visar när den är för
 * liten för att vara värd de exemplar man matar bort.
 */
export function condenseGain(data: AppData, plan: CondensePlan): CondenseGain {
  const stars = plan.reach - plan.fromStars;
  return {
    stars,
    pct: stars * 5,
    slots: plan.feed,
    before: displayStats(data, plan.keeper),
    // `displayStats` läser `stars`, inte `rk` – båda sätts så kopian är ett
    // giltigt ScoredPal och inte ett halvt tillstånd.
    after: displayStats(data, { ...plan.keeper, stars: plan.reach, rk: plan.reach + 1 }),
  };
}

export function summarizeCondense(plans: readonly CondensePlan[]): CondenseSummary {
  const now = plans.filter((p) => p.verdict === "now");
  return {
    species: now.length,
    feed: now.reduce((a, p) => a + p.feed, 0),
    stars: now.reduce((a, p) => a + (p.reach - p.fromStars), 0),
  };
}
