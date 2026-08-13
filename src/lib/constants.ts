import type { MessageKey } from "../i18n";
import type { ElementType, WorkType } from "./types";

/** Poängvikter per passiv-tier. */
export const TIER_WEIGHTS: Record<number, number> = {
  5: 40, 4: 25, 3: 12, 2: 6, 1: 2, 0: 0, [-1]: -8, [-2]: -12, [-3]: -16,
};

/**
 * Antal pals som krävs per kondenserings-stjärna (1★–4★). Kumulativt, inte en
 * total: 4 för första stjärnan, sedan 8 TILL för den andra, och så vidare.
 *
 * Siffrorna är Palworld 1.0. Här stod tidigare 4/16/32/64 = 116, som var
 * kostnaden **före** 1.0 — patchen sänkte full kondensering till 48 pals, och
 * den gamla arrayen fick sidan att kräva mer än dubbelt så många dubbletter som
 * spelet faktiskt gör. Följden var värre än ett fel tal: "Nästan där" räknade
 * bort arter som redan var framme, och rekommendationerna sköt upp
 * kondenseringar man kunde gjort direkt.
 *
 * Fördelningen är inte publicerad av Pocketpair. 4/8/12/24 kommer från
 * [palworld.wiki.gg](https://palworld.wiki.gg/wiki/Pal_Essence_Condenser) och
 * stöds av community-guiderna, och den summerar till exakt de 48 som är den
 * kända totalen — det är därför den duger, inte för att en enskild sida säger
 * det. Samma källa som avelsoddsen och passiveffekterna vilar på.
 *
 * Facit står ändå i spelets egen Condenser-ruta, som visar exakt vad nästa rang
 * kostar i den patch man kör. Ändras det här är det den enda raden som behöver
 * röras — allt på rekommendationssidan räknas ur arrayen — men uppdatera
 * `tests/condense.test.ts` i samma veva: det har handräknat facit mot just de
 * här värdena, och en felräknad tröskel ser precis lika trovärdig ut som en rätt.
 */
export const STAR_COST = [4, 8, 12, 24] as const;

/**
 * Behållarnamnen `tools/palsave.py` sätter på varje pal (`OwnedPal.c`).
 *
 * Allt annat är basläger: "Bas/övrigt N", numrerade på GUID. Predikaten nedan
 * finns för att den skillnaden inte ska skrivas som strängjämförelser utspridda
 * i koden — `c !== "Palbox" && c !== "Party"` betydde "står i en bas" ända tills
 * den globala palboxen tillkom, och då började samma rad påstå att en pal i ett
 * världsöverskridande lager var utplacerad i basen.
 */
export const PALBOX = "Palbox";
export const PARTY = "Party";
/**
 * Den globala palboxen (Dimensional Pal Storage) – spelarens egen `_dps.sav`,
 * delad mellan världar. Pals här finns inte i världen alls: de kan varken jobba
 * i en bas, gå på expedition eller para sig förrän man hämtat ut dem.
 */
export const GLOBAL_BOX = "Global palbox";

/** Ligger i förvaring (Palbox, party eller globala boxen) – alltså inte i en bas. */
export const isStored = (c: string): boolean =>
  c === PALBOX || c === PARTY || c === GLOBAL_BOX;

/** Står utplacerad i ett basläger, där basens partnerskills och arbete gäller. */
export const atBase = (c: string): boolean => !isStored(c);

export const ELEMENT_META: Record<ElementType, { color: string; emoji: string }> = {
  Fire: { color: "#ff6b4a", emoji: "🔥" },
  Water: { color: "#4aa8ff", emoji: "💧" },
  Leaf: { color: "#5ad06b", emoji: "🍃" },
  Electricity: { color: "#ffd93b", emoji: "⚡" },
  Ice: { color: "#7be0f0", emoji: "❄️" },
  Earth: { color: "#c98e5a", emoji: "🪨" },
  Dark: { color: "#b06bf0", emoji: "🌙" },
  Dragon: { color: "#8f7bff", emoji: "🐉" },
  Normal: { color: "#b9c2d0", emoji: "⭐" },
};

/** Spelets engelska namn och ordning (som i Work Suitability-panelen). */
export const WORK_META: Partial<Record<WorkType, { label: string; emoji: string; color: string }>> = {
  EmitFlame: { label: "Kindling", emoji: "🔥", color: "#ff7a45" },
  Watering: { label: "Watering", emoji: "💧", color: "#4aa8ff" },
  Seeding: { label: "Planting", emoji: "🌱", color: "#5ad06b" },
  GenerateElectricity: { label: "Generating Electricity", emoji: "⚡", color: "#ffd93b" },
  Handcraft: { label: "Handiwork", emoji: "🔨", color: "#e8edf4" },
  Collection: { label: "Gathering", emoji: "🧺", color: "#5ad06b" },
  Deforest: { label: "Lumbering", emoji: "🪓", color: "#d8a05a" },
  Mining: { label: "Mining", emoji: "⛏️", color: "#c9d2dd" },
  ProductMedicine: { label: "Medicine Production", emoji: "💊", color: "#b98ef0" },
  Cool: { label: "Cooling", emoji: "❄️", color: "#7be0f0" },
  Transport: { label: "Transporting", emoji: "📦", color: "#d8b98a" },
  MonsterFarm: { label: "Farming", emoji: "🐄", color: "#e8edf4" },
};

export const WORK_TYPES = Object.keys(WORK_META) as WorkType[];

/** Filnamn i /public/icons för spelets riktiga ikoner. */
export const WORK_ICON: Partial<Record<WorkType, string>> = {
  EmitFlame: "kindling", Watering: "watering", Seeding: "planting",
  GenerateElectricity: "generating", Handcraft: "handiwork", Collection: "gathering",
  Deforest: "deforesting", Mining: "mining", ProductMedicine: "production",
  Cool: "cooling", Transport: "transporting", MonsterFarm: "farming",
};

export const ELEMENT_ICON: Record<ElementType, string> = {
  Fire: "fire", Water: "water", Leaf: "grass", Electricity: "electric",
  Ice: "ice", Earth: "ground", Dark: "dark", Dragon: "dragon", Normal: "neutral",
};

/* Spelets egna elementnamn – datasetets interna namn (Leaf, Earth, Electricity,
   Normal) är INTE de ord spelet visar, och det är spelets ord man söker på.
   Engelska som artnamn och passiver: de ska matcha menyerna utan översättning. */
export const ELEMENT_GAME_NAME: Record<ElementType, string> = {
  Fire: "Fire", Water: "Water", Leaf: "Grass", Electricity: "Electric",
  Ice: "Ice", Earth: "Ground", Dark: "Dark", Dragon: "Dragon", Normal: "Neutral",
};

export interface RanchDrop {
  /** Artens visningsnamn, exakt som datasetet skriver det. */
  sp: string;
  /** Varan som spelet skriver den – eller en gruppbeteckning, se `group`. */
  item: string;
  /**
   * true = raden är en **grupp**, inte ett item-id: Vaelets speltext säger
   * "various seeds" och Vixys "items from the ground" utan att räkna upp dem.
   * Gränssnittet får därför inte rita en item-ikon eller låta det se ut som en
   * bestämd vara – gruppen är hela sanningen vi har.
   */
  group?: boolean;
  /** true = bivara med uttalat liten chans (Dumud Gilds Gold Coin). */
  side?: boolean;
}

/**
 * Vad varje art lägger i **ranchen**.
 *
 * **Källan är spelets egen partnerskill-text**, inte en guide och inte en
 * gissning: varje ranch-art har en skill vars beskrivning namnger varan
 * ordagrant ("Sometimes drops Ice Organ when assigned to Ranch"). Texten ligger
 * redan i repot – `src/lib/data/partnerSkills.json`, skrapad ur paldb och
 * omnycklad till `Species.code` – så tabellen nedan är den texten läst av en
 * människa, art för art. Metoden är validerad baklänges: de tolv rader som
 * stod här innan stämmer alla exakt med sin skill-text.
 *
 * Det är därför tabellen ändå står här och inte tolkas ur texten i körningen:
 * prosan är engelsk speltext som patchas, och en regex som glider ger en
 * påhittad vara – exakt det den här filen finns för att förhindra. Regenereras
 * `partnerSkills.json` är det värt att läsa om de nya raderna för hand.
 *
 * Varunamnen står på engelska som i spelet, av samma skäl som passiver och
 * arter gör det – man ska kunna matcha mot menyn utan att översätta.
 *
 * Två fällor tabellen är byggd runt:
 *
 * 1. **Listan får INTE drivas av `ws.MonsterFarm`.** Lamball har `ws: {}` i
 *    datasetet men en skill som säger att den lägger Wool i ranchen – alltså
 *    hade No.001, allas första ranchpal, saknats i all evighet. Arten hör hit
 *    om texten säger att den producerar något, oavsett vad arbetsnivån påstår.
 * 2. **En art kan lägga flera varor**, så tabellen är rader och inte en karta:
 *    Shroomer ger Mushroom *eller* Cavern Mushroom, Dumud Gild har Gold Coin
 *    som bivara. `new Map(RANCH_DROPS)` hade tappat den ena tyst – använd
 *    `ranchItemsOf`.
 *
 * **Gissa aldrig hit.** En art utan rad hamnar i "vara okänd" i gränssnittet,
 * vilket är ärligt; en påhittad vara ser precis lika trovärdig ut som en riktig
 * och skickar någon till ranchen med fel pal.
 */
export const RANCH_DROPS: RanchDrop[] = [
  { sp: "Beegarde", item: "Honey" },
  { sp: "Caprity", item: "Red Berries" },
  { sp: "Caprity Noct", item: "Venom Gland" },
  { sp: "Cawgnito", item: "Bone" },
  { sp: "Chikipi", item: "Egg" },
  { sp: "Cremis", item: "Wool" },
  { sp: "Depresso", item: "Venom Gland" },
  { sp: "Dumud", item: "High Quality Pal Oil" },
  { sp: "Dumud Gild", item: "High Quality Pal Oil" },
  { sp: "Dumud Gild", item: "Gold Coin", side: true },
  { sp: "Flambelle", item: "Flame Organ" },
  { sp: "Foxcicle", item: "Ice Organ" },
  { sp: "Kelpsea", item: "Aquatic Pal Fluids" },
  { sp: "Kelpsea Ignis", item: "Flame Organ" },
  { sp: "Lamball", item: "Wool" },
  { sp: "Mau", item: "Gold Coin" },
  { sp: "Mau Cryst", item: "Ice Organ" },
  { sp: "Melpaca", item: "Wool" },
  { sp: "Mozzarina", item: "Milk" },
  { sp: "Rooby", item: "Flame Organ" },
  { sp: "Shroomer", item: "Mushroom" },
  { sp: "Shroomer", item: "Cavern Mushroom" },
  { sp: "Sibelyx", item: "High Quality Cloth" },
  { sp: "Sibelyx Primo", item: "High Quality Cloth" },
  { sp: "Sootseer", item: "Bone" },
  { sp: "Sparkit", item: "Electric Organ" },
  { sp: "Surfent", item: "Leather" },
  /* Vixy grävde tidigare upp "Pal Sphere" här. Speltexten säger "items from
     the ground" utan att räkna upp dem, alltså en grupp – att namnge en enda
     vara var mer precision än källan bär. */
  { sp: "Vixy", item: "Buried items", group: true },
  { sp: "Vaelet", item: "Seeds", group: true },
  { sp: "Woolipop", item: "Cotton Candy" },
  { sp: "Woolipop Terra", item: "Caramel Cotton Candy" },
];

/** Varorna en art lägger i ranchen. Tom lista = tabellen saknar arten. */
export function ranchItemsOf(speciesName: string): RanchDrop[] {
  return RANCH_DROPS.filter((r) => r.sp === speciesName);
}

/** Alla ranch-arter, som en mängd av artnamn – inklusive de `ws.MonsterFarm`
 *  inte känner till (Lamball). Ranchlistor ska utgå från den här, inte nivån. */
export const RANCH_SPECIES: ReadonlySet<string> = new Set(RANCH_DROPS.map((r) => r.sp));

/** Fiske-hjälpar enligt Palworld 1.0-guider: [speciesName, beskrivning]. */
/* Effekten är en nyckel, inte text: `src/lib` har ingen översättare (se types.ts).
   Artnamnen är spelets egna och slås upp mot datasetet, så de står kvar. */
export const FISHING_PALS: [string, MessageKey][] = [
  ["Gloopie", "fish.gloopie"],
  ["Whalaska", "fish.whalaska"],
  ["Whalaska Ignis", "fish.whalaskaIgnis"],
  ["Solmora", "fish.solmora"],
  ["Solmora Lux", "fish.solmoraLux"],
  ["Jelliette", "fish.jelliette"],
  ["Jellroy", "fish.jellroy"],
];

export const rarityClass = (rarity: number): "leg" | "epic" | "rare" | "com" =>
  rarity >= 10 ? "leg" : rarity >= 8 ? "epic" : rarity >= 5 ? "rare" : "com";

export const rarityColor = (rarity: number): string =>
  rarity >= 10 ? "var(--r-leg)" : rarity >= 8 ? "var(--r-epic)" : rarity >= 5 ? "var(--r-rare)" : "var(--r-com)";
