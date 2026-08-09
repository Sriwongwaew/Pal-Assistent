/* Vad ska palen användas till – och vilka passiver följer av det?
   Rekommendationerna räknas ur `PassiveDef.fx` i stället för att listas för
   hand, så nya passiver i datasetet kommer med automatiskt. Negativa
   sidoeffekter (Musclehead −50 % arbete) straffar av sig själva eftersom
   fx-värdena redan är negativa. */
import { translate, type MessageKey, type Vars } from "../i18n";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";
import type { FreeSolveResult } from "./breeding";
import { isReachable } from "./breeding";
import { FISHING_PALS } from "./constants";
import { describeEffects, type FxKey } from "./passiveText";
import type { AppData, ElementType, PassiveDef, Species, WorkType } from "./types";

export type { FxKey };
export type PurposeId = "attack" | "tank" | "work" | "mount" | "fishing";

export interface Purpose {
  id: PurposeId;
  /** Nyckel, inte text: `src/lib` har ingen översättare (se types.ts). */
  label: MessageKey;
  /** Kort förklaring under chippet. */
  hint: MessageKey;
  /** Vikt per fx-nyckel. Tomt objekt = styrs av `fixed` i stället. */
  weights: Partial<Record<FxKey, number>>;
  /** Passiver som inte syns i fx alls (fiskestorlek), listade för hand. */
  fixed?: string[];
}

/** Attack-vikterna speglar `scorePal`: elementboost räknas som 0,7 attack. */
export const PURPOSES: Purpose[] = [
  {
    id: "attack",
    label: "purpose.attack",
    hint: "purpose.attack.hint",
    weights: { atk: 1, ele: 0.7, def: 0.15, hp: 0.1 },
  },
  {
    id: "tank",
    label: "purpose.tank",
    hint: "purpose.tank.hint",
    weights: { hp: 1, def: 1, atk: 0.1 },
  },
  {
    id: "work",
    label: "purpose.work",
    hint: "purpose.work.hint",
    weights: { craft: 1, move: 0.1 },
  },
  {
    id: "mount",
    label: "purpose.mount",
    hint: "purpose.mount.hint",
    weights: { move: 1, hp: 0.1 },
  },
  {
    id: "fishing",
    label: "purpose.fishing",
    hint: "purpose.fishing.hint",
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

/**
 * Elementboostar vars id INTE följer `ElementBoost_<Element>_<n>_PAL`.
 *
 * Det här var en riktig bugg: eftersom de föll utanför mönstret räknades de som
 * element-**neutrala** och fick full poäng för varenda art. Necromus (Dark) fick
 * Eternal Flame (eld och el) i tre av fyra platser i sin attackuppsättning.
 *
 * Flera boostar två element. Effekterna är kontrollerade mot palworld.wiki.gg
 * (augusti 2026); Lunker är +20 % vatten, +20 % is och +20 % försvar, alltså
 * ingen allmän elementskada trots att datasetets `fx.ele` bara säger 40.
 */
const NAMED_BOOSTS: Record<string, ElementType[]> = {
  EternalFlame: ["Fire", "Electricity"],  // Eternal Flame
  Invader: ["Dark", "Dragon"],            // Invader
  Salvation: ["Normal"],                  // Savior
  Witch: ["Dark"],                        // Siren of the Void
  Nushi: ["Water", "Ice"],                // Lunker
  MiniNushi: ["Water", "Ice"],            // Whopper
};

/** Elementen passiven boostar, eller undefined när den inte är en elementboost. */
function boostTokens(id: string): Set<string> | undefined {
  const named = NAMED_BOOSTS[id];
  if (named) return new Set(named.map((e) => ELEMENT_TOKEN[e]));
  const token = /^ElementBoost_(\w+?)_\d+_PAL$/.exec(id)?.[1];
  return token === undefined ? undefined : new Set([token]);
}

/** Passiver som höjer skadan för ett visst element (Ice Emperor, Lord of the Underworld…). */
export const isElementBoost = (id: string): boolean => boostTokens(id) !== undefined;

const TOKEN_ELEMENT = new Map(
  (Object.entries(ELEMENT_TOKEN) as [ElementType, string][]).map(([e, t]) => [t, e]),
);

/**
 * Elementen boosten gäller, i klartext – bara för beskrivningen. Matchningen går
 * via `boostTokens`: ett okänt element i en framtida patch ska aldrig kunna
 * göra en boost element-neutral igen, och därför slås aldrig den här listan upp
 * för att avgöra om passiven passar.
 */
export function boostElements(id: string): ElementType[] {
  const named = NAMED_BOOSTS[id];
  if (named) return named;
  const token = /^ElementBoost_(\w+?)_\d+_PAL$/.exec(id)?.[1];
  const el = token === undefined ? undefined : TOKEN_ELEMENT.get(token);
  return el ? [el] : [];
}

/**
 * Uthållighetspassiverna: Eternal Engine, Infinite Stamina, Fit as a Fiddle.
 * Suffixet säger inget om styrkan – `Stamina_Up_1` är Infinite Stamina (+50 %)
 * och `Stamina_Up_3` är Eternal Engine (+75 %). Sortera aldrig på id:t.
 */
export const isStamina = (id: string): boolean => /^Stamina_Up_\d+$/.test(id);

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
 * Effekter som datasetet inte beskriver.
 *
 * `PassiveDef.fx` har sex fält: attack, arbete, rörelse, HP, element, försvar.
 * Allt utanför dem — **uthållighet, simfart, hopp i sadeln, SAN-dropp,
 * hungerdropp, nedkylning** — står som noll i datan, och då gav `purposeScore`
 * dem noll poäng och de föll bort ur varje rekommendation. Följden var att
 * Eternal Engine (+75 % uthållighet) inte fanns bland riddjursförslagen alls,
 * trots att den står i praktiskt taget varje community-guide.
 *
 * Procenten är spelets (palworld.wiki.gg och palworld.tools, kontrollerade
 * augusti 2026). **Poängen är vår vikt**, i samma skala som `purposeScore`
 * (≈ procent på syftets huvudstat), och är en bedömning snarare än datamining:
 * +75 % uthållighet är inte värt lika mycket som +75 % fart — uthålligheten tar
 * bara slut långsammare. Vikterna är satta så att topp fyra för riddjur blir
 * Dimensional Leap, Swift, Runner och Legend (samma uppsättning guiderna kallar
 * endgame) med Eternal Engine som femte, uttalade alternativet.
 *
 * Tre saker som medvetet INTE står här:
 * 1. **Tempest Fury** ger 0 % i nuvarande version och går inte att få tag på —
 *    datasetets tomma `fx` är alltså korrekt. Ge den inte poäng.
 * 2. **Healing Coach, Wellness Watcher, Reload Master, Noble** buffar spelaren,
 *    inte palen (spelarens HP-regen, uthållighet, omladdning, säljpris) — samma
 *    familj som `Trainer*`, se PLAYER_BUFF_PREFIX.
 * 3. **Vampiric, Heavily Armored, Babysitter** har verkliga effekter men ingen
 *    siffra jag kunde belägga. Hellre utanför än gissad.
 */
interface Unmodelled {
  /** Spelets effekttext, kort. Visas som `why` i förslagen. Nyckel, inte text. */
  why: MessageKey;
  /** Vår vikt per syfte, i samma skala som `purposeScore`. */
  score: Partial<Record<PurposeId, number>>;
  /** Bara meningsfull för arter med något av de här elementen (simfart). */
  requires?: ElementType[];
}

const UNMODELLED: Record<string, Unmodelled> = {
  // Uthållighet – gäller bara ridbara pals, enligt spelets egen effekttext.
  Stamina_Up_3: { why: "fx.stamina75", score: { mount: 15 } },
  Stamina_Up_1: { why: "fx.stamina50", score: { mount: 10 } },
  Stamina_Up_2: { why: "fx.stamina25", score: { mount: 5 } },
  // Simfart – värdelös på en flygare, så den kräver rätt element.
  SwimSpeed_up_3: { why: "fx.swim50", score: { mount: 25 }, requires: ["Water"] },
  SwimSpeed_up_2: { why: "fx.swim40", score: { mount: 20 }, requires: ["Water"] },
  SwimSpeed_up_1: { why: "fx.swim30", score: { mount: 15 }, requires: ["Water"] },
  // Hopp i sadeln – rörlighet, inte fart.
  RideJumpCount_Increase2: { why: "fx.jump2", score: { mount: 8 } },
  RideJumpCount_Increase1: { why: "fx.jump1", score: { mount: 4 } },
  // SAN och hunger: en arbetare som slipper pauser producerar mer än en snabb
  // som står stilla. Under Serious (+20 % arbete) med flit – guidernas
  // endgame-uppsättning är ren arbetshastighet.
  PAL_Sanity_Down_3: { why: "fx.san20", score: { work: 18 } },
  PAL_Sanity_Down_2: { why: "fx.san15", score: { work: 13 } },
  PAL_FullStomach_Down_3: { why: "fx.hunger20", score: { work: 11 } },
  PAL_FullStomach_Down_2: { why: "fx.hunger15", score: { work: 8 } },
  // Nedkylning läggs OVANPÅ fx: Serenity har redan +10 % attack i datan.
  CoolTimeReduction_Up_1: { why: "fx.cooldown30", score: { attack: 20 } },
  CoolTimeReduction_Up_2: { why: "fx.cooldown15", score: { attack: 10 } },
};

/**
 * Hur mycket en passiv bidrar till ett syfte. En elementboost för fel element är
 * värdelös (0); utan valt mål vet vi inte vilket element det gäller, så den får
 * halva vikten. Effekter datasetet saknar läggs på ur `UNMODELLED`.
 */
export function purposeScore(
  def: PassiveDef,
  id: string,
  purpose: Purpose,
  tokens: ReadonlySet<string>,
  hasTarget: boolean,
): number {
  const boost = boostTokens(id);
  const factor = boost === undefined ? 1
    : [...boost].some((t) => tokens.has(t)) ? 1
      : hasTarget ? 0 : 0.5;
  /* Faktorn gäller BARA elementskadan, inte hela passiven. Lunker är
     "+20 % vatten, +20 % is, +20 % försvar" – försvaret är inte elementbundet,
     så en Lunker på en mörkerpal är fortfarande värd något som tålig. Nollar
     man hela passiven försvinner den delen tyst. */
  const fx = (Object.entries(purpose.weights) as [FxKey, number][])
    .reduce((sum, [k, w]) => sum + (def.fx?.[k] ?? 0) * w * (k === "ele" ? factor : 1), 0);
  return fx + unmodelledScore(id, purpose.id, tokens, hasTarget);
}

/** Bidraget ur `UNMODELLED`, med samma elementregel som elementboostarna. */
function unmodelledScore(
  id: string, purpose: PurposeId, tokens: ReadonlySet<string>, hasTarget: boolean,
): number {
  const extra = UNMODELLED[id];
  const base = extra?.score[purpose] ?? 0;
  if (base === 0 || !extra?.requires) return base;
  const ok = extra.requires.some((e) => tokens.has(ELEMENT_TOKEN[e]));
  return ok ? base : hasTarget ? 0 : base * 0.5;
}

/** Effekttexten för en passiv datasetet inte beskriver, om vi känner till den. */
export const unmodelledWhy = (id: string): MessageKey | undefined => UNMODELLED[id]?.why;

/** Har passiven någon känd effekt alls – i datan eller i vår egen tabell? */
export const hasKnownEffect = (def: PassiveDef, id: string): boolean =>
  (def.fx !== undefined && Object.values(def.fx).some((v) => v !== 0)) || id in UNMODELLED;

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

/**
 * Gör passiven någon nytta på just den här arten?
 *
 * Svaret är med flit försiktigt – vi säger nej bara när det går att **visa**:
 *
 * 1. En passiv vars effekt varken står i `fx` eller i `UNMODELLED` (Vampiric,
 *    Babysitter, arbetsrang-passiverna) kan vi inte döma, och att kalla den
 *    värdelös vore att slänga bort riktiga toppassiver.
 * 2. En art utan tydlig roll (Lamball: ingen arbetslämplighet, låga scalings)
 *    går inte att jämföra mot – då duger vilken passiv som helst som avelsstam.
 *
 * Kvar blir fallet som faktiskt går att avgöra: Lunker ger elementskada och
 * försvar, Gildra är arbetare, alltså nej. Sedan `UNMODELLED` finns gäller det
 * också Eternal Engine på en pal man inte kan rida – spelets egen effekttext
 * säger uttryckligen "bara ridbara".
 */
export function passiveFitsSpecies(def: PassiveDef, id: string, species: Species): boolean {
  const roles = speciesRoles(species);
  if (roles.length === 0 || !hasKnownEffect(def, id)) return true;
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
  /**
   * Hela den poängsatta listan, bäst först, oavsett om du har bärare.
   * `idealLoadout` måste utgå från den: uppsättningen ska visa vad rollen
   * *ska* ha, och Dimensional Leap är rätt svar även den dagen ingen pal i
   * boxen bär den.
   */
  all: PassiveRec[];
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
  /** Språket motiveringstexten skrivs på. Utelämnat = engelska. */
  locale?: Locale;
}

/**
 * Rekommenderade passiver för ett syfte, valfritt anpassat efter målartens
 * element: en isdrake har ingen nytta av Flame Emperor, så boostar för fel
 * element faller bort helt.
 */
export function recommendPassives(
  data: AppData,
  counts: ReadonlyMap<string, number>,
  { purpose, target = null, work = null, limit = 4, locale = DEFAULT_LOCALE }: RecommendOptions,
): Recommendation {
  const targetElements = elementTokens(target);
  /* Motiveringen sätts ihop av flera delar – effekttext, element, arbetsrang –
     så den kan inte lämnas som en `Msg` åt komponenten. Språket följer därför
     med in, precis som i `describeEffects`. */
  const say = (key: MessageKey, vars?: Vars) => translate(locale, key, vars);

  const scored: PassiveRec[] = [];
  for (const [id, def] of Object.entries(data.passives)) {
    if (isEquipmentOnly(id) || def.r < 0) continue;

    let score: number;
    // Datasetets fx först; saknas den helt får vår egen effekttext ta över,
    // annars står en tom rad där effekten borde stå.
    const unmodelled = unmodelledWhy(id);
    let why = describeEffects(def.fx, locale) || (unmodelled ? say(unmodelled) : "");
    // "Elementskada +60 %" säger inte VILKET element – och det är hela skälet
    // till att passiven föreslås just den här arten.
    const boostEls = boostElements(id);
    if (boostEls.length > 0 && why) why = `${why} (${boostEls.join(", ")})`;
    if (purpose.fixed) {
      if (!purpose.fixed.includes(id)) continue;
      score = 100;
      why = say("fx.biggerCatch");
    } else {
      score = purposeScore(def, id, purpose, targetElements, target !== null);
      // En höjd arbetsrang är värd mer än någon procentsats – men bara för rätt syssla.
      if (work && workRankFor(id) === work) {
        score += 60;
        why = say("fx.workRank");
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
  return { picks, missing, all: scored };
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
