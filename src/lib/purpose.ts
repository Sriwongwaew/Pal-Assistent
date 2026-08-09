/* Vad ska palen användas till – och vilka passiver följer av det?
   Rekommendationerna räknas ur `PassiveDef.fx` i stället för att listas för
   hand, så nya passiver i datasetet kommer med automatiskt. Negativa
   sidoeffekter (Musclehead −50 % arbete) straffar av sig själva eftersom
   fx-värdena redan är negativa. */
import type { FreeSolveResult } from "./breeding";
import { isReachable } from "./breeding";
import { FISHING_PALS } from "./constants";
import type { AppData, ElementType, PassiveDef, Species, WorkType } from "./types";

export type FxKey = "atk" | "craft" | "move" | "hp" | "ele" | "def";
export type PurposeId = "attack" | "tank" | "work" | "mount" | "fishing";

export interface Purpose {
  id: PurposeId;
  label: string;
  /** Kort förklaring under chippet. */
  hint: string;
  /** Vikt per fx-nyckel. Tomt objekt = styrs av `fixed` i stället. */
  weights: Partial<Record<FxKey, number>>;
  /** Passiver som inte syns i fx alls (fiskestorlek), listade för hand. */
  fixed?: string[];
}

/** Attack-vikterna speglar `scorePal`: elementboost räknas som 0,7 attack. */
export const PURPOSES: Purpose[] = [
  {
    id: "attack",
    label: "Strid",
    hint: "Bossar och raider – attack och elementskada",
    weights: { atk: 1, ele: 0.7, def: 0.15, hp: 0.1 },
  },
  {
    id: "tank",
    label: "Tålig",
    hint: "Överlever länge – HP och försvar",
    weights: { hp: 1, def: 1, atk: 0.1 },
  },
  {
    id: "work",
    label: "Bas & arbete",
    hint: "Jobbar snabbt i basen – välj syssla för artförslag",
    weights: { craft: 1, move: 0.1 },
  },
  {
    id: "mount",
    label: "Riddjur",
    hint: "Tar dig fram fort – rörelsehastighet",
    weights: { move: 1, hp: 0.1 },
  },
  {
    id: "fishing",
    label: "Fiske",
    hint: "Större fångster (Palworld 1.0)",
    weights: {},
    // Lunker och Whopper påverkar fiskestorlek och har ingen fx i datasetet.
    fixed: ["Nushi", "MiniNushi"],
  },
];

/** Datasetets elementnamn i passiv-id:n skiljer sig från `ElementType`. */
const ELEMENT_TOKEN: Record<ElementType, string> = {
  Water: "Aqua", Electricity: "Thunder", Fire: "Fire", Leaf: "Leaf",
  Ice: "Ice", Earth: "Earth", Dark: "Dark", Dragon: "Dragon", Normal: "Normal",
};

const elementBoostToken = (id: string): string | undefined =>
  /^ElementBoost_(\w+?)_\d+_PAL$/.exec(id)?.[1];

/** Passiver som höjer skadan för ett visst element (Ice Emperor, Lord of the Underworld…). */
export const isElementBoost = (id: string): boolean => elementBoostToken(id) !== undefined;

/**
 * Passiver som bara sitter på rustning/accessoarer – de kan aldrig ärvas.
 * `pal`-flaggan i datasetet går inte att lita på (Legend, Lunker och
 * Immortality är alla flaggade `pal: false`), så vi går på id-mönstret.
 * Suffixet `_PAL` vinner alltid: `ElementResist_Fire_1_PAL` är Suntan Lover
 * och sitter på pals.
 */
export const isEquipmentOnly = (id: string): boolean =>
  !/_PAL$/.test(id) && /(_Armor$|Otomo_Only_Equip|^ElementResist_|_ACC_up_?\d)/.test(id);

/** Artens elementtokens som passiv-id:n använder (Aqua, Thunder, …). */
export function elementTokens(species: Species | null): Set<string> {
  return new Set<string>(
    (species?.elements.length ? species.elements : (["Normal"] as ElementType[]))
      .map((e) => ELEMENT_TOKEN[e]),
  );
}

/**
 * Hur mycket en passiv bidrar till ett syfte. En elementboost för fel element är
 * värdelös (0); utan valt mål vet vi inte vilket element det gäller, så den får
 * halva vikten.
 */
export function purposeScore(
  def: PassiveDef,
  id: string,
  purpose: Purpose,
  tokens: ReadonlySet<string>,
  hasTarget: boolean,
): number {
  const token = elementBoostToken(id);
  const factor = token === undefined ? 1 : tokens.has(token) ? 1 : hasTarget ? 0 : 0.5;
  if (factor === 0) return 0;
  return (Object.entries(purpose.weights) as [FxKey, number][])
    .reduce((sum, [k, w]) => sum + (def.fx?.[k] ?? 0) * w, 0) * factor;
}

/**
 * Minsta bidrag för att en passiv ska räknas som att den "drar åt samma håll" –
 * motsvarar +10 % på syftets huvudstat. Utan tröskeln räknas Burly Body
 * (+20 % försvar, vikt 0,15 i Strid) som en attackpassiv, och då får nästan
 * varje pal en "färdig uppsättning".
 */
const MIN_FIT = 10;

/** Så många passiver åt samma håll gör palen till en färdig stam. */
export const SYNERGY_MIN = 3;

/**
 * Trösklar för vad en art *kan* användas till. Siffrorna är ungefär 90:e
 * percentilen i Palworld 1.0-datasetet (304 arter) och skiljer "kan slåss om
 * den måste" från "är en stridspal". Det är hela poängen: Gildra har attack 120,
 * HP+försvar 210 och sprint 720 men Handiwork 5 – alltså arbetare och ingenting
 * annat, och då gör en Lunker (elementskada + försvar) ingen nytta på den.
 *
 * Justera dem tillsammans med `speciesRoles`, och kom ihåg att de är
 * dataset-beroende: höjer en framtida patch alla scalings blir de för slappa.
 */
const ROLE_FLOOR = { work: 3, attack: 125, tank: 235, mount: 1200 } as const;

const FISHING_NAMES = new Set(FISHING_PALS.map(([name]) => name));

/** Rollerna arten faktiskt kan fylla. Tom lista = arten har ingen tydlig roll. */
export function speciesRoles(species: Species): PurposeId[] {
  const roles: PurposeId[] = [];
  if (Math.max(0, ...Object.values(species.ws)) >= ROLE_FLOOR.work) roles.push("work");
  if (species.sc[1] >= ROLE_FLOOR.attack) roles.push("attack");
  if (species.sc[0] + species.sc[2] >= ROLE_FLOOR.tank) roles.push("tank");
  if (species.spr >= ROLE_FLOOR.mount) roles.push("mount");
  if (FISHING_NAMES.has(species.name)) roles.push("fishing");
  return roles;
}

/** Har passiven några effekter datasetet faktiskt beskriver? */
const hasEffects = (def: PassiveDef): boolean =>
  def.fx !== undefined && Object.values(def.fx).some((v) => v !== 0);

/**
 * Gör passiven någon nytta på just den här arten?
 *
 * Svaret är med flit försiktigt – vi säger nej bara när det går att **visa**:
 *
 * 1. En passiv utan `fx` (Heart of the Immovable King, Lightfooted, arbetsrang-
 *    passiverna) har effekter datasetet inte beskriver. Den kan vi inte döma,
 *    och att kalla den värdelös vore att slänga bort riktiga toppassiver.
 * 2. En art utan tydlig roll (Lamball: ingen arbetslämplighet, låga scalings)
 *    går inte att jämföra mot – då duger vilken passiv som helst som avelsstam.
 *
 * Kvar blir fallet som faktiskt går att avgöra: Lunker ger elementskada och
 * försvar, Gildra är arbetare, alltså nej.
 */
export function passiveFitsSpecies(def: PassiveDef, id: string, species: Species): boolean {
  const roles = speciesRoles(species);
  if (roles.length === 0 || !hasEffects(def)) return true;
  const tokens = elementTokens(species);
  return PURPOSES.some((p) => roles.includes(p.id) && (
    p.fixed
      ? p.fixed.includes(id)
      : purposeScore(def, id, p, tokens, true) >= MIN_FIT
  ));
}

export interface PassiveSynergy {
  purpose: Purpose;
  /** Passiv-id:n som drar åt samma håll. */
  ids: string[];
}

/**
 * Passiverna på palen som drar åt samma håll, för det syfte där flest gör det.
 *
 * Finns för att tier-reglerna missar precis den pal man helst vill behålla:
 * Artisan + Work Slave + Remarkable Craftsmanship är en färdig arbetsstam, men
 * bara EN av dem är guldtier (Artisan är 3, Work Slave är 1). Utan den här
 * regeln föreslogs den som matarpal.
 */
export function passiveSynergy(
  data: AppData,
  ids: readonly string[],
  species: Species | null,
): PassiveSynergy | null {
  const tokens = elementTokens(species);
  const roles = species ? speciesRoles(species) : [];
  let best: PassiveSynergy | null = null;
  for (const purpose of PURPOSES) {
    // Fiske poängsätts inte ur fx alls – där finns inget "drar åt samma håll".
    if (purpose.fixed) continue;
    // Tre arbetspassiver på en pal som inte kan arbeta är ingen uppsättning.
    if (roles.length > 0 && !roles.includes(purpose.id)) continue;
    const fit = ids.filter((id) => {
      const def = data.passives[id];
      return def !== undefined && def.r >= 0 && !isEquipmentOnly(id)
        && purposeScore(def, id, purpose, tokens, species !== null) >= MIN_FIT;
    });
    if (fit.length > (best?.ids.length ?? 0)) best = { purpose, ids: fit };
  }
  return best !== null && best.ids.length >= SYNERGY_MIN ? best : null;
}

const FX_LABEL: Record<FxKey, string> = {
  atk: "Attack", craft: "Arbetshastighet", move: "Rörelse",
  hp: "HP", ele: "Elementskada", def: "Försvar",
};

/** "Attack +20 % · Arbete −50 %" – bara de effekter som faktiskt finns. */
function describe(fx: PassiveDef["fx"]): string {
  if (!fx) return "";
  return (Object.keys(FX_LABEL) as FxKey[])
    .map((k) => [k, fx[k] ?? 0] as const)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${FX_LABEL[k]} ${v > 0 ? "+" : "−"}${Math.abs(v)} %`)
    .join(" · ");
}

export interface PassiveRec {
  id: string;
  name: string;
  tier: number;
  /** Antal pals i boxen som bär passiven. 0 = går inte att avla fram ur boxen. */
  carriers: number;
  score: number;
  why: string;
}

export interface Recommendation {
  /** Bästa passiverna du faktiskt har bärare av. */
  picks: PassiveRec[];
  /** Ännu bättre, men ingen i boxen bär dem – visas som "saknas". */
  missing: PassiveRec[];
}

/**
 * Passiver som höjer arbetsrangen direkt (`WorkSuitabilityAddRank_<WorkType>_<n>`).
 * Just nu finns de bara för MonsterFarm (Farmhand, Ranch Master) – vi läser dem ur
 * id-mönstret i stället för att lista dem, så fler i datasetet kommer med av sig själva.
 */
const workRankFor = (id: string): string | undefined =>
  /^WorkSuitabilityAddRank_(\w+?)_\d+$/.exec(id)?.[1];

/**
 * `Trainer*`-passiverna buffar **spelaren**, inte palen: Mine Foreman höjer din egen
 * brytningstakt, inte palens arbete i basen. De har all-nolla fx och faller bort av sig
 * själva i poängsättningen – listan finns här för att ingen ska "fixa" det åt fel håll.
 */
export const PLAYER_BUFF_PREFIX = /^Trainer/;

export interface RecommendOptions {
  purpose: Purpose;
  /** Målarten – används för elementanpassning vid strid. */
  target?: Species | null;
  /** Vald syssla när syftet är "Bas & arbete". Ger arbetsrang-passiver extra vikt. */
  work?: WorkType | null;
  limit?: number;
}

/**
 * Rekommenderade passiver för ett syfte, valfritt anpassat efter målartens
 * element: en isdrake har ingen nytta av Flame Emperor, så boostar för fel
 * element faller bort helt.
 */
export function recommendPassives(
  data: AppData,
  counts: ReadonlyMap<string, number>,
  { purpose, target = null, work = null, limit = 4 }: RecommendOptions,
): Recommendation {
  const targetElements = elementTokens(target);

  const scored: PassiveRec[] = [];
  for (const [id, def] of Object.entries(data.passives)) {
    if (isEquipmentOnly(id) || def.r < 0) continue;

    let score: number;
    let why = describe(def.fx);
    if (purpose.fixed) {
      if (!purpose.fixed.includes(id)) continue;
      score = 100;
      why = "Större fångst vid fiske";
    } else {
      score = purposeScore(def, id, purpose, targetElements, target !== null);
      // En höjd arbetsrang är värd mer än någon procentsats – men bara för rätt syssla.
      if (work && workRankFor(id) === work) {
        score += 60;
        why = "Höjer arbetsrangen ett steg";
      }
      if (score <= 0) continue;
      // Liten knuff så en högre tier vinner vid lika effekt.
      score += Math.max(0, def.r) * 0.5;
    }

    scored.push({ id, name: def.n, tier: def.r, carriers: counts.get(id) ?? 0, score, why });
  }

  scored.sort((a, b) => b.score - a.score || b.carriers - a.carriers || a.name.localeCompare(b.name, "sv"));
  const picks = scored.filter((r) => r.carriers > 0).slice(0, limit);
  const cutoff = picks[picks.length - 1]?.score ?? 0;
  const missing = scored.filter((r) => r.carriers === 0 && r.score > cutoff).slice(0, 3);
  return { picks, missing };
}

/** Hur du kommer åt arten: redan i boxen, avlas fram på N parningar, eller måste fångas. */
export type Reach =
  | { kind: "owned" }
  | { kind: "breed"; pairings: number }
  | { kind: "catch" };

export interface SpeciesRec {
  s: number;
  name: string;
  /** Arbetsnivå för den valda sysslan (1–8 i spelet). */
  level: number;
  /** Jobbar även på natten. */
  noct: boolean;
  reach: Reach;
}

/**
 * Vilken art ska man avla fram för en viss syssla? Sorterat på arbetsnivå först –
 * en nivå 8 slår alltid en nivå 7 hur billig den senare än är – och därefter på hur
 * lätt arten är att komma åt, så två likvärdiga arter rankas efter antal parningar.
 */
export function recommendWorkSpecies(
  data: AppData,
  work: WorkType,
  freeSolve: FreeSolveResult,
  ownedSpecies: ReadonlySet<number>,
  limit = 6,
): SpeciesRec[] {
  const reachOf = (s: number): Reach => {
    if (ownedSpecies.has(s)) return { kind: "owned" };
    if (!isReachable(freeSolve.cost, s)) return { kind: "catch" };
    return { kind: "breed", pairings: freeSolve.cost[s] ?? 1 };
  };
  const rank = (r: Reach) => (r.kind === "owned" ? 0 : r.kind === "breed" ? r.pairings : 99);

  return data.species
    .map((sp, s) => ({ sp, s, level: sp.ws[work] ?? 0 }))
    .filter((x) => x.level > 0)
    .map((x) => ({ s: x.s, name: x.sp.name, level: x.level, noct: x.sp.noct, reach: reachOf(x.s) }))
    .sort((a, b) =>
      b.level - a.level
      || rank(a.reach) - rank(b.reach)
      || a.name.localeCompare(b.name, "sv"))
    .slice(0, limit);
}
