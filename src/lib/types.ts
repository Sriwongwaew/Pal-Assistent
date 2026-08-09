/** Rådata som exporterats från Level.sav (public/data/pal-data.json). */

/* `Msg` i stället för färdig text: logiken här är ren och har ingen översättare
   att fråga. Den bestämmer *vad* som ska sägas – nyckel plus variabler – och
   komponenten som ritar den bestämmer på vilket språk. Se src/i18n/index.ts. */
import type { MessageKey, Msg } from "../i18n";

export type WorkType =
  | "Handcraft" | "Transport" | "Mining" | "Deforest" | "Watering"
  | "Seeding" | "EmitFlame" | "GenerateElectricity" | "Cool"
  | "Collection" | "ProductMedicine" | "OilExtraction" | "MonsterFarm";

export type ElementType =
  | "Fire" | "Water" | "Leaf" | "Electricity" | "Ice"
  | "Earth" | "Dark" | "Dragon" | "Normal";

export interface Species {
  code: string;
  name: string;
  combi: number | null;
  rarity: number;
  elements: ElementType[];
  /** Sannolikhet att avkomman blir hane. */
  gp: number;
  /** Ikon som data-URL (webp), null om saknas. */
  icon: string | null;
  /** [hp, attack, defense]-scaling för arten. */
  sc: [number, number, number];
  /** Arbetslämplighet, endast nivåer > 0. */
  ws: Partial<Record<WorkType, number>>;
  /** Sprintfart som riddjur. */
  spr: number;
  /** Arbetar på natten. */
  noct: boolean;
  /** Max mage (FullStomach). */
  stom: number;
  /** Matmängd 1–10 (drumsticks i spelet). */
  food: number;
  /** Paldeck-nummer. */
  deck: number;
  /** Paldeck-beskrivning (engelska). */
  desc: string;
}

export interface PassiveEffects {
  atk: number;   // % ShotAttack
  craft: number; // % CraftSpeed
  move: number;  // % MoveSpeed
  hp: number;    // % MaxHP
  ele: number;   // % elementboost (summerad)
  def?: number;  // % Defense
}

export interface PassiveDef {
  /** Visningsnamn (engelska, som i spelet). */
  n: string;
  /** Tier: 1–3 vanliga, 4 legendarisk, 5 world tree/rainbow, negativa = dåliga. */
  r: number;
  /** Kan förekomma på pals – **opålitlig**: Legend, Lunker och Immortality är alla
   *  flaggade `false` trots att de sitter på pals. `PassivePicker` går på id-mönster
   *  i stället för att skilja pal-passiver från rustnings-/accessoarpassiver. */
  pal: boolean;
  fx?: PassiveEffects;
}

export type Gender = "M" | "F" | "?";

export interface OwnedPal {
  id: string;
  /** Index i species-arrayen. */
  s: number;
  g: Gender;
  lv: number;
  /** IV [hp, attack, defense], 0–100. */
  iv: [number, number, number];
  /** Passiv-id:n. */
  pv: string[];
  /** Rank 1 = 0 stjärnor … 5 = 4 stjärnor (kondensering). */
  rk: number;
  souls: [number, number, number, number];
  /** Behållare: Party / Palbox / Bas m.m. */
  c: string;
  slot: number;
  nick: string;
  boss: boolean;
  lucky: boolean;
  /** Total EXP ur saven. */
  xp: number;
  /** Aktuell mage (FullStomach) ur saven, null om okänd. */
  fd: number | null;
  /** SAN ur saven (default 100). */
  sn: number;
}

export interface GenderedCombo {
  a: number; b: number; c: number;
  ga: "Male" | "Female" | null;
  gb: "Male" | "Female" | null;
}

export interface AppData {
  species: Species[];
  /** Platt triangulär tabell: barnindex för varje oordnat föräldrapar, -1 = inget. */
  pair: number[];
  gendered: GenderedCombo[];
  /** [parentA, parentB, child] – unika kombos (för UNIK KOMBO-badge). */
  uniques: [number, number, number][];
  passives: Record<string, PassiveDef>;
  pals: OwnedPal[];
  player: string;
  /**
   * Passiv-id → antal implantat i världens item-behållare (Pal Surgery Table).
   *
   * `undefined` = saven är inläst av en läsare som inte kan fältet, alltså "vi
   * vet inte". Tomt objekt = "vi läste, du äger inga". Slå aldrig ihop de två:
   * det första ska inte visa något, det andra ska.
   *
   * Läses ur savens `ItemContainerSaveData` – se `_implants` i tools/palsave.py.
   * Nollas i paketeringen tillsammans med `pals`/`player`/`exported`.
   */
  implants?: Record<string, number>;
  exported: string;
  /** Kumulativ pal-EXP per level (index = level). */
  palExp: number[];
}

/** Pal berikad med härledda värden (poäng, spara-flaggor m.m.). */
export interface ScoredPal extends OwnedPal {
  ivSum: number;
  tiers: number[];
  pScore: number;
  score: number;
  stars: number;
  fxAtk: number;
  fxCraft: number;
  fxMove: number;
  combat: number;
  mount: number;
  /**
   * Passiver som **bevisligen** inte gör något för just den här arten – en
   * Lunker (elementskada + försvar) på en Gildra (arbetare). Listan är med
   * flit försiktig: passiver utan `fx` i datasetet och arter utan tydlig roll
   * hamnar aldrig här, för då går mismatchen inte att visa. Negativa passiver
   * heller inte – de syns redan på bannern.
   */
  misfit: string[];
  /**
   * Passiver som drar åt samma håll – palen är en **färdig stam** för det
   * syftet. Behövs för att tier-reglerna missar just den palen: Artisan +
   * Work Slave + Remarkable Craftsmanship är en komplett arbetsuppsättning,
   * men bara en av dem är guldtier.
   */
  synergy: { label: MessageKey; names: string[] } | null;
  /**
   * Toppassiver (tier ≥ 4) som palen bär **utan skräp runt sig** och som
   * dessutom **gör nytta på arten** – den bästa sortens avelsförälder, eftersom
   * varje extra passiv späder ut arvspoolen. `scorePal` fyller den med alla
   * kandidater; `applyKeepRules` tömmer den för de exemplar som inte får plats
   * under taket. Efter båda stegen betyder icke-tom alltså "sparas som ren
   * bärare".
   */
  cleanCarrier: { id: string; name: string }[];
  /**
   * Toppassiver palen sparas för trots att de inte passar arten – för att
   * ingen annan sparad pal i boxen bär dem alls. Passiver går bara att ärva,
   * aldrig slumpa fram, så den sista bäraren får inte matas bort.
   * Sätts bara av `applyKeepRules`.
   */
  soleCarrier: { id: string; name: string }[];
  keep: boolean;
  reasons: Msg[];
}

export interface ChildResult {
  c: number;
  note?: string;
}

export interface ChainStep {
  from: number;
  with: number;
  to: number;
  note?: string;
}

export type BreedTree =
  | { s: number; owned: true }
  | { s: number; owned: false; note?: string; a: BreedTree; b: BreedTree };
