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
import { msg, type Msg } from "../i18n";
import { workScore } from "./best";
import { FISHING_PALS, WORK_META, WORK_TYPES } from "./constants";
import { condenseReach, displayStats, fodderValue, type DisplayStats } from "./scoring";
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
  label: Msg;
  /** Bäst i boxen **och** nivån är hög nog att siffran betyder något. */
  best: boolean;
  /**
   * Bäst i boxen bara för att ingen annan kan – nivån ligger under `WORK_FLOOR`.
   * Skilt från `best` med flit: "bäst i boxen på Mining" om boxens enda gruvpal
   * är en Cattiva på nivå 1 låter som ett skäl att spara henne, och är det inte.
   */
  only: boolean;
  /** Varför siffran inte är hela sanningen (ranchen). */
  caveat?: Msg;
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
const RANCH_CAVEAT = msg("use.ranchCaveat");

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
        label: msg("use.raw", { text: WORK_META[w.t]?.label ?? w.t }),
        best: top && w.level >= WORK_FLOOR,
        only: top && w.level < WORK_FLOOR,
      };
    });

  const combat = idx.combatRank.get(p.id);
  if (combat !== undefined) {
    uses.push({ kind: "combat", level: combat, label: msg("use.combat", { n: combat }), best: combat === 1, only: false });
  }
  const mount = idx.mountRank.get(p.id);
  if (mount !== undefined) {
    uses.push({ kind: "mount", level: mount, label: msg("use.mount", { n: mount }), best: mount === 1, only: false });
  }
  const ranch = sp.ws.MonsterFarm ?? 0;
  if (ranch > 0) {
    uses.push({
      kind: "work", work: "MonsterFarm", level: ranch,
      label: msg("use.raw", { text: WORK_META.MonsterFarm?.label ?? "Farming" }),
      best: false, only: false, caveat: RANCH_CAVEAT,
    });
  }
  if (idx.fishing.has(p.s)) {
    uses.push({ kind: "fishing", label: msg("use.fishing"), best: false, only: false });
  }

  // Utan något att visa ser kortet ut som ett fel. Artens bästa syssla oavsett
  // nivå säger åtminstone vad den *kan*.
  if (!uses.length && work[0]) {
    uses.push({
      kind: "work", work: work[0].t, level: work[0].level,
      label: msg("use.raw", { text: WORK_META[work[0].t]?.label ?? work[0].t }), best: false, only: false,
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

export type CondenseNoteKind = "passive" | "iv" | "better" | "last" | "booked";

export interface CondenseNote {
  kind: CondenseNoteKind;
  text: Msg;
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
  /**
   * Vad kondenseringen är VÄRD, inte bara om den går att göra.
   *
   * Kön rankade förut på dom → stjärnvinst → antal matade, alltså ren
   * genomförbarhet: en Souffline utan en enda användning i boxen hamnade före
   * arter Ken faktiskt sätter i basen (helhetsutredningen aug 2026). Prioriteten
   * väger in vad arten används till (`palUses`, som redan fanns men bara ritades)
   * och vad stjärnorna ger i riktiga stats, mot vad de kostar i pals.
   * Noll = arten har ingen roll i boxen; stjärnorna gör ingenting för dig.
   */
  priority: number;
  /** Varför prioriteten ser ut som den gör – gränssnittet ska kunna säga det. */
  why: Msg[];
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
/**
 * Vad kondenseringen är värd: roll × stjärnvinst ÷ vad den kostar i pals.
 *
 * Ingen av delarna är ny data – `palUses` fanns men ritades bara, och
 * `condenseGain` räknade redan stats. Det som saknades var att låta dem avgöra
 * ordningen. Skalan är avsiktligt grov: det här är en prioritering mellan arter,
 * inte en prognos.
 */
function valueOf(
  data: AppData,
  keeper: ScoredPal,
  starGain: number,
  feed: number,
  useIndex?: UseIndex,
): { priority: number; why: Msg[] } {
  const why: Msg[] = [];
  if (starGain <= 0) return { priority: 0, why };

  const uses = useIndex ? palUses(data, keeper, useIndex) : [];
  /* "Bäst i boxen" väger tyngst, sedan en riktig roll (topplista eller en syssla
     arten faktiskt är bra på), sedan ranchen – den är värd att behålla EN av,
     men stjärnor gör inget för vad den lägger. */
  const best = uses.some((u) => u.best);
  const real = uses.some(
    (u) => u.best || u.only || u.kind === "combat" || u.kind === "mount"
      || (u.kind === "work" && u.work !== "MonsterFarm" && (u.level ?? 0) >= WORK_FLOOR),
  );
  const roleWeight = best ? 3 : real ? 2 : uses.length ? 0.5 : 0;
  if (best) why.push(msg("condense.whyBest"));
  else if (real) why.push(msg("condense.whyRole"));
  else why.push(msg("condense.whyNoRole"));

  /* Vad stjärnorna ger i riktiga stats. Ett stort hopp på en pal du använder är
     hela poängen; samma hopp på en pal du aldrig tar med är ingenting. */
  const before = displayStats(data, keeper);
  const after = displayStats(data, { ...keeper, stars: keeper.stars + starGain, rk: keeper.stars + starGain + 1 });
  const gain = (after.hp - before.hp) + (after.atk - before.atk) * 3 + (after.def - before.def) * 2;
  // Priset i pals: tolv matade för en stjärna är dyrare än fyra.
  const priority = Math.round((roleWeight * gain * starGain) / Math.max(1, feed) * 10) / 10;
  if (starGain > 1) why.push(msg("condense.whyStars", { n: starGain }));
  return { priority, why };
}

export interface CondenseOpts {
  /** Individer den aktiva avelsplanen räknar med (`planBookings`). */
  booked?: ReadonlyMap<string, unknown>;
  /** Boxens topplistor, för att veta om arten används till något alls. */
  useIndex?: UseIndex;
}

export function planCondense(
  data: AppData,
  pals: readonly ScoredPal[],
  bestOf: ReadonlyMap<number, ScoredPal>,
  opts: CondenseOpts = {},
): CondensePlan[] {
  const bySpecies = new Map<number, ScoredPal[]>();
  for (const p of pals) {
    const list = bySpecies.get(p.s);
    if (list) list.push(p);
    else bySpecies.set(p.s, [p]);
  }

  const plans: CondensePlan[] = [];
  for (const [s, all] of bySpecies) {
    // Keeperen är artens bästa exemplar (`bestOfSpecies` i `scoring.ts` – den
    // rankar på passform och IV, inte på `score`).
    const keeper = bestOf.get(s);
    /* Bokade individer är inte mat. Planen på avelssidan pekar ut just dem, och
       att föreslå att man matar bort steg 1 i sin egen plan är det enda felet i
       appen som inte går att ångra (helhetsutredningen aug 2026). */
    const booked = all.filter((p) => !p.keep && opts.booked?.has(p.id));
    const fodder = all.filter((p) => !p.keep && !opts.booked?.has(p.id));
    if (!keeper || !fodder.length) continue;

    /* 1.0-regeln: en stjärnad dubblett bär sitt uppätna värde med sig (1★ = 5
       offer). Räkningen görs i VÄRDE; feed/leftover förblir antal PALS, och
       matningen tar högst värde först – bankat värde ska inte stå kvar i boxen. */
    const totalValue = fodder.reduce((a, p) => a + fodderValue(p.stars), 0);
    const { reach, left: leftValue, nextCost } = condenseReach(keeper.stars, totalValue);
    const missing = nextCost > 0 ? nextCost - leftValue : 0;
    const byValue = [...fodder].sort((a, b) => b.stars - a.stars);
    let need = totalValue - leftValue;
    let feed = 0;
    for (const p of byValue) {
      if (need <= 0) break;
      need -= fodderValue(p.stars);
      feed++;
    }
    const leftover = fodder.length - feed;
    const verdict: CondenseVerdict =
      reach > keeper.stars ? "now"
        : nextCost === 0 ? "max"
          : missing <= soonLimit(nextCost) ? "soon"
            : "hold";

    const notes = notesFor(all, fodder, keeper, feed, leftover);
    if (booked.length) {
      notes.push({ kind: "booked", text: msg("condense.noteBooked", { n: booked.length }) });
    }
    const { priority, why } = valueOf(data, keeper, reach - keeper.stars, feed, opts.useIndex);
    plans.push({
      s, keeper, fodder, verdict, fromStars: keeper.stars, reach,
      feed, leftover, missing, nextCost, priority, why, notes,
    });
  }

  /* Domen först – "nu" är det man kan göra i dag – men INOM domen sorteras det
     på värde och inte på stjärnvinst. En art utan roll i boxen kan ha två
     stjärnor att hämta och ändå vara det sämsta man kan lägga essens på. */
  return plans.sort((a, b) =>
    VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict]
    || b.priority - a.priority
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
      text: msg("condense.noteGold", { n: gold }),
    });
  }

  const donors = fodder.filter((p) => p.iv.some((v) => v >= 100)).length;
  if (donors > 0) {
    notes.push({
      kind: "iv",
      text: msg("condense.noteIv", { n: donors }),
    });
  }

  const bestIv = all.reduce((a, b) => (b.ivSum > a.ivSum ? b : a), keeper);
  if (bestIv !== keeper && bestIv.ivSum - keeper.ivSum >= IV_GAP) {
    notes.push({
      kind: "better",
      text: msg("condense.noteBetter", { best: bestIv.iv.join("/"), keeper: keeper.iv.join("/") }),
    });
  }

  if (feed > 0 && leftover === 0 && all.filter((p) => p.keep).length <= 1) {
    notes.push({
      kind: "last",
      text: msg("condense.noteLast"),
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
