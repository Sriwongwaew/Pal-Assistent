import { RANCH_DROPS, WORK_TYPES } from "./constants";
import type { AppData, ScoredPal, Species, WorkType } from "./types";

export function workScore(data: AppData, p: ScoredPal, t: WorkType): number {
  const sp = data.species[p.s] as Species;
  const rank = sp.ws[t] ?? 0;
  return rank ? rank * (1 + p.fxCraft) + (sp.noct ? 0.35 : 0) : 0;
}

/** Topp-5 attack-team med elementspridning. */
export function pickAttackTeam(data: AppData, pals: ScoredPal[]): ScoredPal[] {
  const sorted = [...pals].sort((a, b) => b.combat - a.combat);
  const team: ScoredPal[] = [];
  const elements = new Set<string>();
  for (const [idx, p] of sorted.entries()) {
    const el = data.species[p.s]?.elements[0] ?? "Normal";
    if (team.length < 5 && (!elements.has(el) || idx < 2) && !team.some((t) => t.s === p.s)) {
      team.push(p);
      elements.add(el);
    }
    if (team.length >= 5) break;
  }
  return team;
}

/**
 * Sysslorna ett basgäng ska täcka – alla utom ranchen.
 *
 * Ranchen hör inte hemma i ett "minsta gäng som täcker allt": varje ranch-art
 * lägger sin **egen** vara och `MonsterFarm`-nivån styr bara takten. Räknades
 * den med tog den en plats i laget åt den med högst siffra (Dumud Gild, nivå 4)
 * som om ranchen vore en syssla man vill ha täckt — men vad den lägger avgör
 * om man vill ha den alls. Ranchen får därför en egen lista, `ranchGuide`.
 */
export const BASE_WORK_TYPES = WORK_TYPES.filter((t) => t !== "MonsterFarm");

/** Minsta gäng som täcker alla arbetstyper med högsta nivåer (greedy). */
export function pickBaseCrew(data: AppData, pals: ScoredPal[], bestOf: Map<number, ScoredPal>): ScoredPal[] {
  const types = BASE_WORK_TYPES.filter((t) =>
    pals.some((p) => (data.species[p.s]?.ws[t] ?? 0) > 0),
  );
  const candidates = [...new Set([...bestOf.values()])];
  const cover = new Map<WorkType, number>();
  const crew: ScoredPal[] = [];
  while (crew.length < 8) {
    let best: ScoredPal | null = null;
    let bestGain = 0.2;
    for (const p of candidates) {
      if (crew.includes(p)) continue;
      let gain = 0;
      for (const t of types) {
        const s = workScore(data, p, t);
        const cur = cover.get(t) ?? 0;
        if (s > cur) gain += s - cur;
      }
      if (gain > bestGain) { bestGain = gain; best = p; }
    }
    if (!best) break;
    crew.push(best);
    for (const t of types) {
      const s = workScore(data, best, t);
      if (s > (cover.get(t) ?? 0)) cover.set(t, s);
    }
  }
  return pruneRedundant(data, crew, types);
}

/**
 * Greedy tittar aldrig tillbaka. Whalaska (Watering 5 + Cool 6) var lagets bästa
 * val när laget var tomt, men efter att Neptilius (Watering 7) och Frostallion
 * (Cool 7) kommit in toppar den ingenting alls – och sitter ändå kvar och ser ut
 * som ett råd. Laget lovar "minsta gäng", så den som inte längre är bäst på en
 * enda syssla ska bort.
 *
 * Bakifrån och med `kept` som referens hela vägen: två pals med *samma* toppnivå
 * skulle annars båda kunna se sig som ersättliga och tas bort tillsammans, och
 * då tappar laget täckningen. Efter att den första tagits bort blir den andra
 * ensam om nivån och räknas som nödvändig.
 */
function pruneRedundant(data: AppData, crew: ScoredPal[], types: WorkType[]): ScoredPal[] {
  const kept = [...crew];
  for (let i = kept.length - 1; i >= 0; i--) {
    const p = kept[i]!;
    const others = kept.filter((q) => q !== p);
    const tops = types.some((t) => {
      const s = workScore(data, p, t);
      return s > 0 && others.every((q) => workScore(data, q, t) < s);
    });
    if (!tops) kept.splice(i, 1);
  }
  return kept;
}

/* ============================================================
   Ranchen – vem lägger vad
   ============================================================ */

export interface RanchProducer {
  /** Artindex. */
  s: number;
  /** `MonsterFarm`-nivån = takten, inte värdet. */
  level: number;
  owned: boolean;
}

export interface RanchEntry {
  /** Varan, som den heter i spelet – null när tabellen inte har arten. */
  item: string | null;
  producers: RanchProducer[];
}

/**
 * "Behöver du Flame Organ – ställ den här i ranchen."
 *
 * Grupperar ranch-arterna på **varan**, inte på nivån, eftersom det är varan
 * man är ute efter; nivån avgör bara vem av producenterna som är snabbast.
 * Arter som saknas i `RANCH_DROPS` hamnar i en egen grupp med `item: null` –
 * de visas som "vara okänd" i stället för att gissas fram.
 */
export function ranchGuide(data: AppData, ownedSpecies: ReadonlySet<number>): RanchEntry[] {
  const item = new Map(RANCH_DROPS);
  const groups = new Map<string, RanchProducer[]>();

  data.species.forEach((sp, s) => {
    const level = sp.ws.MonsterFarm ?? 0;
    if (level <= 0) return;
    const key = item.get(sp.name) ?? "";
    const producer: RanchProducer = { s, level, owned: ownedSpecies.has(s) };
    const list = groups.get(key);
    if (list) list.push(producer);
    else groups.set(key, [producer]);
  });

  const name = (p: RanchProducer) => data.species[p.s]?.name ?? "";
  const byUse = (a: RanchProducer, b: RanchProducer) =>
    Number(b.owned) - Number(a.owned) || b.level - a.level || name(a).localeCompare(name(b), "sv");

  return [...groups]
    .map(([key, producers]) => ({ item: key || null, producers: [...producers].sort(byUse) }))
    .sort((a, b) =>
      // Okända varor sist: de är en lucka i tabellen, inte ett råd.
      Number(a.item === null) - Number(b.item === null)
      // Sedan det du kan sätta igång med i dag.
      || Number(b.producers.some((p) => p.owned)) - Number(a.producers.some((p) => p.owned))
      || (a.item ?? "").localeCompare(b.item ?? "", "sv"));
}

/** Topp-arter globalt efter attack-scaling. */
export function topGlobalAttackers(data: AppData, count = 14): number[] {
  return [...data.species.keys()]
    .sort((a, b) => (data.species[b]?.sc[1] ?? 0) - (data.species[a]?.sc[1] ?? 0))
    .slice(0, count);
}

/** Topp-3-arter globalt per arbetstyp. */
export function topGlobalWorkers(data: AppData): [WorkType, number[]][] {
  return BASE_WORK_TYPES
    .map((t): [WorkType, number[]] => [
      t,
      [...data.species.keys()]
        .filter((s) => (data.species[s]?.ws[t] ?? 0) > 0)
        .sort((a, b) => (data.species[b]?.ws[t] ?? 0) - (data.species[a]?.ws[t] ?? 0))
        .slice(0, 3),
    ])
    .filter(([, list]) => list.length > 0);
}
