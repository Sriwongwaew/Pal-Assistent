import { ranchItemsOf, WORK_TYPES } from "./constants";
import { isObtainable } from "./partnerSkills";
import type { AppData, ElementType, ScoredPal, Species, WorkType } from "./types";

export function workScore(data: AppData, p: ScoredPal, t: WorkType): number {
  const sp = data.species[p.s] as Species;
  const rank = sp.ws[t] ?? 0;
  return rank ? rank * (1 + p.fxCraft) + (sp.noct ? 0.35 : 0) : 0;
}

/** Partyts platser – spelet har fem, och Rollernas mätare räknar mot samma tal. */
export const ATTACK_TEAM_SIZE = 5;

/** Attack-team med elementspridning, en per art. */
export function pickAttackTeam(data: AppData, pals: ScoredPal[]): ScoredPal[] {
  const sorted = [...pals].sort((a, b) => b.combat - a.combat);
  const team: ScoredPal[] = [];
  const elements = new Set<string>();
  for (const [idx, p] of sorted.entries()) {
    const el = data.species[p.s]?.elements[0] ?? "Normal";
    if (team.length < ATTACK_TEAM_SIZE && (!elements.has(el) || idx < 2)
      && !team.some((t) => t.s === p.s)) {
      team.push(p);
      elements.add(el);
    }
    if (team.length >= ATTACK_TEAM_SIZE) break;
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
  /** true = varan är en grupp ("Seeds"), inte ett item-id. Se `RanchDrop`. */
  group: boolean;
  producers: RanchProducer[];
}

/**
 * "Behöver du Flame Organ – ställ den här i ranchen."
 *
 * Grupperar ranch-arterna på **varan**, inte på nivån, eftersom det är varan
 * man är ute efter; nivån avgör bara vem av producenterna som är snabbast.
 * Arter som saknas i `RANCH_DROPS` hamnar i en egen grupp med `item: null` –
 * de visas som "vara okänd" i stället för att gissas fram.
 *
 * **Urvalet är tabellen unionen arbetsnivån, inte arbetsnivån ensam.** Lamball
 * producerar Wool enligt sin egen partnerskill men har `ws: {}` i datasetet, så
 * ett rent `MonsterFarm > 0` hade tappat den – och en art med nivå men utan rad
 * ska fortfarande synas som lucka. Se `RANCH_DROPS`.
 */
export function ranchGuide(data: AppData, ownedSpecies: ReadonlySet<number>): RanchEntry[] {
  const groups = new Map<string, { group: boolean; producers: RanchProducer[] }>();
  const push = (key: string, group: boolean, producer: RanchProducer) => {
    const at = groups.get(key);
    if (at) at.producers.push(producer);
    else groups.set(key, { group, producers: [producer] });
  };

  data.species.forEach((sp, s) => {
    const level = sp.ws.MonsterFarm ?? 0;
    const rows = ranchItemsOf(sp.name);
    if (level <= 0 && rows.length === 0) return;
    const producer: RanchProducer = { s, level, owned: ownedSpecies.has(s) };
    if (rows.length === 0) push("", false, producer);
    else for (const row of rows) push(row.item, row.group === true, producer);
  });

  const name = (p: RanchProducer) => data.species[p.s]?.name ?? "";
  const byUse = (a: RanchProducer, b: RanchProducer) =>
    Number(b.owned) - Number(a.owned) || b.level - a.level || name(a).localeCompare(name(b), "sv");

  return [...groups]
    .map(([key, g]) => ({ item: key || null, group: g.group, producers: [...g.producers].sort(byUse) }))
    .sort((a, b) =>
      // Okända varor sist: de är en lucka i tabellen, inte ett råd.
      Number(a.item === null) - Number(b.item === null)
      // Sedan det du kan sätta igång med i dag.
      || Number(b.producers.some((p) => p.owned)) - Number(a.producers.some((p) => p.owned))
      || (a.item ?? "").localeCompare(b.item ?? "", "sv"));
}

/** Topp-arter globalt efter attack-scaling. Slutbossar (Astralym) utesluts –
 *  de går inte att skaffa och toppade listan med ett omöjligt "FÅNGA". */
export function topGlobalAttackers(data: AppData, count = 14): number[] {
  return [...data.species.keys()]
    .filter((s) => isObtainable(data.species[s]?.code ?? ""))
    .sort((a, b) => (data.species[b]?.sc[1] ?? 0) - (data.species[a]?.sc[1] ?? 0))
    .slice(0, count);
}

/** Sökpanelens tre frågor. Arbete har redan sin egen väg (syssla → artförslag
 *  i planeraren), så den upprepas inte här. */
export type FinderPurpose = "attack" | "tanky" | "mount";

/**
 * "Jag vill ha en <element>-pal som är bra på <syfte>" – bästa arterna,
 * oavsett om du äger dem. Rankningen är grov med flit: scalings ur datasetet,
 * inte partner-skills (de finns inte i någon data, se Domain gotchas), så
 * raden är en startpunkt för fånga/avla – inte en tier-lista.
 *
 * Platshållar-arterna (deck ≤ 0, "Unidentified Pal") filtreras på namn i
 * stället för deck: Lamball har också deck 0, och den är en riktig pal.
 */
export function findSpeciesFor(
  data: AppData,
  purpose: FinderPurpose,
  element: ElementType | null,
  count = 8,
): number[] {
  const value = (s: number): number => {
    const sp = data.species[s];
    if (!sp) return 0;
    if (purpose === "attack") return sp.sc[1];
    if (purpose === "tanky") return sp.sc[0] + sp.sc[2];
    return sp.spr;
  };
  return [...data.species.keys()]
    .filter((s) => {
      const sp = data.species[s];
      if (!sp || sp.name.startsWith("Unidentified")) return false;
      /* Slutbossar (Astralym, sc 200) går inte att skaffa – att rekommendera
         dem med "FÅNGA" var att lova det omöjliga (Kens fynd). */
      if (!isObtainable(sp.code)) return false;
      if (element && !sp.elements.includes(element)) return false;
      // Riddjur utan sprintfart är inga riddjur.
      return purpose !== "mount" || sp.spr > 0;
    })
    .sort((a, b) => value(b) - value(a))
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
