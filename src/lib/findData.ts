/* Hitta-sidans uppslagsdata: vem släpper vad, och var schematics kommer ifrån.
 *
 * Källäge (efterforskat på nytt aug 2026, Palworld 1.0):
 *
 * DROPS – `data/drops.json` GENERERAS av `tools/build-drops.mjs` ur två
 * datamined källor: stolenvw/pyPalworldAPI (speldata v1.0.1, per-art
 * Drops-tabeller nycklade på våra artkoder) med beliarance/palworld-kb
 * (game_version 1.0) som utfyllnad för de ~22 arter primärkällan saknar.
 * Rader ur utfyllnaden och boss-skalade rader bär `u` och ritas med ≈.
 * Validerad mot paldb.cc v1.0.2:s "Dropped by"-tabeller (Flame Organ:
 * exakt samma 38 arter och mängder). Skriv aldrig i JSON-filen för hand.
 *
 * SCHEMATICS – handkurerad och korslagd ur 1.0-uppdaterade källor
 * (Steam-guiden "All 121 Legendary Schematics Database 1.0", KeenGamer,
 * thepalprofessor, allthings.how, games.gg, Game8, paldb.cc för att belägga
 * att items finns). Wikin och flera "1.0-märkta" sajter (pindrop, xmodhub)
 * bär fortfarande pre-1.0-mappningen – 1.0 stuvade om bossarnas drops, så
 * "rätta" aldrig tabellen mot dem. Rader där 1.0-källorna är oense eller
 * ensamma är märkta `sure: false` och visas som osäkra i gränssnittet.
 * Droppchanser är communityuppmätta/dataminade och märks ≈.
 *
 * Tre saker som medvetet INTE står här:
 * - Polymer: ingen pal släpper den (craftas ur High Quality Pal Oil).
 * - Ancient Civilization Parts / Precious-familjen: regeln är "alla
 *   alfabossar", inte en artlista – regeln står i gränssnittstexten.
 * - Hatt-kosmetikan (Monarch's Crown m.fl.): köps som Schematic 1 hos
 *   vandrande handlare och uppgraderas deterministiskt vid ritbordet –
 *   det är ingen drop och hör inte hemma i en farmtabell.
 */

import raw from "./data/drops.json";

export interface DropPal {
  /** Artens visningsnamn, exakt som spelet skriver det. */
  n: string;
  /** Mängd/chans ("x2–3", "@50%", "x1–3 @50%") – null = 1 st, 100 %. */
  q: string | null;
  /** Lägre proveniens: utfyllnadskällan eller boss-skalade mängder. Ritas ≈. */
  u?: boolean;
}

export interface MaterialDrop {
  item: string;
  pals: DropPal[];
}

export const MATERIAL_DROPS = raw as MaterialDrop[];

/** Sök i drops-tabellen: träff på item-namnet eller på en art som släpper. */
export function dropsMatching(q: string): MaterialDrop[] {
  const needle = q.toLowerCase();
  return MATERIAL_DROPS.filter((d) =>
    d.item.toLowerCase().includes(needle)
    || d.pals.some((p) => p.n.toLowerCase().includes(needle)));
}

/**
 * Var källan FAKTISKT ligger, som ett uppslag i kartdatat.
 *
 * Finns för att `source` är prosa: "Snow enemy camp" sa inte var lägren är, och
 * en spelare som läser det får ingenting att gå på (Kens fynd aug 2026). Fältet
 * är **handkurerat och explicit** i stället för utläst ur texten – en regex mot
 * prosa som glider pekar ut fel plats, och en fel koordinat är värre än ingen.
 *
 * - `camp` matchar `MapCamp.region` (token, inte namn: "Snow1" plus
 *   "SeaBase_Snow_1" när båda avses). Flera regioner per rad är tillåtet.
 * - `oilrig` matchar den nivå som står i `MapRegion.name` via `lo`.
 * - `map` = skattkartornas platser; rariteten sitter på kartan man hittar, inte
 *   på platsen, så den kan inte pekas ut.
 * - `dungeon` matchar `MapDungeon.name` exakt.
 * - `tower` matchar `MapTower.flag` – tornen står still och har en koordinat,
 *   så en hard mode-schematic ska inte behöva en omväg via Uppdrag.
 * - `region` matchar `MapRegion.id` för det som ligger på en namngiven plats
 *   (arenan är en byggnad med en adress, till skillnad från handlarna).
 * - `ruin` matchar `MapRuin.gives` – ruinen ÄR platsen, och den ger sin
 *   schematic garanterat. Sätts inte för hand: raderna härleds ur kartdatat
 *   (`ruinSchematics`), så uppslaget är alltid sitt eget ursprung.
 */
export type SchemSpot =
  | { at: "camp"; regions: string[] }
  | { at: "oilrig"; lv: number }
  | { at: "map" }
  | { at: "dungeon"; name: string }
  | { at: "tower"; flag: string }
  | { at: "region"; id: string }
  | { at: "ruin"; gives: string };

export interface Schematic {
  /** Spelets namn ("Rocket Launcher Schematic 4", "Terra Blade Schematic"). */
  name: string;
  /** Vem/vad som släpper: alfabossens art, tornparet, kistan eller handlaren. */
  source: string;
  kind: "alpha" | "tower" | "chest" | "raid" | "vendor" | "ruin";
  /** Bossens nivå (≈) där det finns en boss. */
  lv?: number;
  /** Chans eller pris när den avviker från kindens standard (≈3 %/≈10 %). */
  rate?: string;
  /** Spelkoordinat för alfabossen – tornen har egna kort på Uppdrag. */
  coord?: [number, number];
  /** Var källan ligger i kartdatat. Utelämnas när platsen inte går att peka ut
   *  (arenan, handlarna, "supply drops", "coastal bases"). */
  spot?: SchemSpot;
  /** false = 1.0-källorna är oense eller ensamma; visas som osäker. */
  sure: boolean;
}

export const LEGENDARY_SCHEMATICS: Schematic[] = [
  /* Vapen – alfabossar, ≈3 % per nedlägg (fångst + slakt = två rullar).
     De fyra oense raderna (Musket, Handgun, Double-Barreled, SMG) står på
     Steam-databasens/Game8:s bud; KeenGamer/allthings.how säger Quivern,
     Beakon, Vaelet respektive "bara oljeriggen". */
  { name: "Assault Rifle Schematic 4", source: "Blazamut", kind: "alpha", lv: 52, coord: [-737, -332], sure: true },
  { name: "Pump-Action Shotgun Schematic 4", source: "Suzaku", kind: "alpha", lv: 45, coord: [326, 483], sure: true },
  { name: "Single-Shot Rifle Schematic 4", source: "Verdash", kind: "alpha", lv: 35, coord: [285, 10], sure: true },
  { name: "Rocket Launcher Schematic 4", source: "Jetragon", kind: "alpha", lv: 70, coord: [-553, -1332], sure: true },
  { name: "Plasma Cannon Schematic 4", source: "Frostallion", kind: "alpha", lv: 60, coord: [-357, 509], sure: true },
  { name: "Overheat Rifle Schematic 4", source: "Frostallion Noct", kind: "alpha", lv: 65, coord: [689, 648], sure: true },
  { name: "Charge Rifle Schematic 4", source: "Neptilius", kind: "alpha", lv: 60, coord: [139, 651], sure: true },
  { name: "Makeshift Handgun Schematic 4", source: "Fenglope", kind: "alpha", lv: 25, coord: [-258, -458], sure: true },
  { name: "Laser Rifle Schematic 4", source: "Lyleen Noct", kind: "alpha", lv: 58, coord: [-628, 304], sure: true },
  { name: "Semi-Auto Rifle Schematic 4", source: "Azurobe", kind: "alpha", lv: 40, coord: [-176, -266], sure: true },
  { name: "Energy Shotgun Schematic 4", source: "Azurmane", kind: "alpha", lv: 66, coord: [-1131, -1668], sure: true },
  { name: "Musket Schematic 4", source: "Blazehowl", kind: "alpha", lv: 30, coord: [-256, -131], sure: false },
  { name: "Handgun Schematic 4", source: "Vaelet", kind: "alpha", lv: 27, coord: [-19, -265], sure: false },
  { name: "Double-Barreled Shotgun Schematic 4", source: "Elizabee", kind: "alpha", lv: 39, coord: [164, -84], sure: false },
  { name: "SMG Schematic 4", source: "Beakon", kind: "alpha", lv: 37, coord: [95, 23], sure: false },
  { name: "Laser Gatling Gun Schematic 4", source: "Warsect", kind: "alpha", lv: 64, sure: false },

  // Rustning – alfabossar.
  { name: "Cloth Outfit Schematic 4", source: "Chillet", kind: "alpha", lv: 11, coord: [172, -418], sure: true },
  { name: "Feathered Hair Band Schematic 4", source: "Penking", kind: "alpha", lv: 15, coord: [114, -352], sure: true },
  { name: "Metal Helm Schematic 4", source: "Bushi", kind: "alpha", lv: 25, coord: [-203, -346], sure: true },
  { name: "Metal Armor Schematic 4", source: "Kingpaca", kind: "alpha", lv: 23, coord: [50, -460], sure: true },
  { name: "Heat Resistant Refined Metal Armor Schematic 4", source: "Astegon", kind: "alpha", lv: 55, coord: [-689, -110], sure: true },
  { name: "Cold Resistant Refined Metal Armor Schematic 4", source: "Menasting", kind: "alpha", lv: 44, coord: [350, 537], sure: false },
  { name: "Hexolite Helmet Schematic 4", source: "Necromus", kind: "alpha", lv: 60, coord: [440, 679], sure: true },
  { name: "Lightweight Hexolite Armor Schematic 4", source: "Paladius", kind: "alpha", lv: 60, coord: [440, 679], sure: true },

  /* Hard mode-torn – ≈10 %. Cold-Resistant Ancient Armor är 1.0-källornas
     stora tvist: Steam-databasen säger Victor & Shadowbeak, allthings.how
     säger Marcus & Faleris (KeenGamer: 5 % vardera för båda varianterna där)
     – båda buden står med, ingen som sanning. */
  { name: "Beam Scatter Schematic 4", source: "Zoe & Grizzbolt (Hard)", kind: "tower", lv: 72, spot: { at: "tower", flag: "GrassBoss" }, sure: true },
  { name: "Drone Launcher Schematic 4", source: "Lily & Lyleen (Hard)", kind: "tower", lv: 74, spot: { at: "tower", flag: "ForestBoss" }, sure: true },
  { name: "Heat-Resistant Ancient Armor Schematic 4", source: "Axel & Orserk (Hard)", kind: "tower", lv: 76, spot: { at: "tower", flag: "ElectricBoss" }, sure: true },
  { name: "Heat-Resistant Ancient Armor Schematic 4", source: "Marcus & Faleris (Hard)", kind: "tower", lv: 78, rate: "≈5 %", spot: { at: "tower", flag: "DesertBoss" }, sure: false },
  { name: "Cold-Resistant Ancient Armor Schematic 4", source: "Victor & Shadowbeak (Hard)", kind: "tower", lv: 80, spot: { at: "tower", flag: "SnowBoss" }, sure: false },
  { name: "Cold-Resistant Ancient Armor Schematic 4", source: "Marcus & Faleris (Hard)", kind: "tower", lv: 78, rate: "≈5 %", spot: { at: "tower", flag: "DesertBoss" }, sure: false },
  { name: "Plasma Rifle Schematic 4", source: "Saya & Selyne (Hard)", kind: "tower", lv: 80, spot: { at: "tower", flag: "SakurajimaBoss" }, sure: true },
  { name: "Beam Launcher Schematic 4", source: "Auri & Shaolong (Hard)", kind: "tower", lv: 80, spot: { at: "tower", flag: "SorajimaBoss" }, sure: true },
  { name: "Lightweight Ancient Armor Schematic 4", source: "Bjorn & Bastigor (Hard)", kind: "tower", lv: 80, spot: { at: "tower", flag: "VikingBoss" }, sure: true },

  /* Sunreach/Astral Mountain-vapnen (nya i 1.0) – INGEN boss släpper dem:
     skattkartor (Legendary), fiendeläger-belöningar och röda kistor. Alla
     1.0-källor eniga om att de är kist-/kartbundna. */
  { name: "Combat SMG Schematic 4", source: "Treasure Map (Legendary)", kind: "chest", rate: "≈0,3 %", spot: { at: "map" }, sure: true },
  { name: "Prototype Shotgun Schematic 4", source: "Treasure Map (Legendary)", kind: "chest", rate: "≈0,3 %", spot: { at: "map" }, sure: true },
  { name: "Mechanical Bow Schematic 4", source: "Treasure Map (Legendary)", kind: "chest", rate: "≈0,3 %", spot: { at: "map" }, sure: true },
  { name: "Tactical Grenade Launcher Schematic 4", source: "Astral Mountain enemy camp", kind: "chest", rate: "≈0,7 %", spot: { at: "camp", regions: ["Snow1"] }, sure: true },
  { name: "Heavy Assault Rifle Schematic 4", source: "Astral Mountain enemy camp", kind: "chest", rate: "≈0,7 %", spot: { at: "camp", regions: ["Snow1"] }, sure: true },
  { name: "Laser Sword Schematic 4", source: "Astral Mountain camps / Treasure Maps / red chests", kind: "chest", rate: "≈0,1–0,7 %", spot: { at: "camp", regions: ["Snow1"] }, sure: true },
  { name: "Ancient Helm Schematic 4", source: "Treasure Map (Legendary) / supply drops / fishing", kind: "chest", rate: "≈0,3 %", spot: { at: "map" }, sure: true },
  { name: "Ancient Armor Schematic 4", source: "Treasure Map (Legendary) / supply drops / relics", kind: "chest", rate: "≈0,3 %", spot: { at: "map" }, sure: true },

  // Oljeriggarnas guldkistor.
  { name: "Crossbow Schematic 4", source: "Oil rig Lv30 – Greater Chest", kind: "chest", rate: "≈2 %", spot: { at: "oilrig", lv: 30 }, sure: true },
  { name: "Old Revolver Schematic 4", source: "Oil rig Lv60 – Greater Chest", kind: "chest", rate: "≈1,5 %", spot: { at: "oilrig", lv: 60 }, sure: true },
  { name: "Flamethrower Schematic 4", source: "Oil rig Lv60 – Greater Chest", kind: "chest", rate: "≈1,5 %", spot: { at: "oilrig", lv: 60 }, sure: false },
  { name: "Grenade Launcher Schematic 4", source: "Oil rig Lv60 – Greater Chest", kind: "chest", rate: "≈1,5 %", spot: { at: "oilrig", lv: 60 }, sure: false },
  { name: "Guided Missile Launcher Schematic 4", source: "Oil rig Lv60 – Greater Chest", kind: "chest", rate: "≈1,5 %", spot: { at: "oilrig", lv: 60 }, sure: false },
  { name: "Multi Guided Missile Launcher Schematic 4", source: "Oil rig Lv60 – Greater Chest", kind: "chest", rate: "≈1,3 %", spot: { at: "oilrig", lv: 60 }, sure: false },
  { name: "Gatling Gun Schematic 4", source: "Oil rig Lv60 – Greater Chest", kind: "chest", rate: "≈1,5 %", spot: { at: "oilrig", lv: 60 }, sure: false },
  { name: "Advanced Bow Schematic 4", source: "Oil rig Lv60 – Greater Chest", kind: "chest", rate: "≈1,3 %", spot: { at: "oilrig", lv: 60 }, sure: false },

  // Tides of Terraria: Moon Lord-raiden + dungeonens låsta röda kistor.
  { name: "Terra Blade Schematic", source: "[Master] Moon Lord raid", kind: "raid", lv: 65, rate: "≈25 %", sure: true },
  { name: "Terraprisma Schematic", source: "[Master] Moon Lord raid", kind: "raid", lv: 65, rate: "≈25 %", sure: true },
  { name: "Vortex Beater Schematic", source: "[Master] Moon Lord raid", kind: "raid", lv: 65, rate: "≈25 %", sure: true },
  { name: "Nightglow Schematic", source: "[Master] Moon Lord raid", kind: "raid", lv: 65, rate: "≈25 %", sure: true },
  { name: "Excalibur Schematic 4", source: "Tides of Terraria dungeon – locked red chest", kind: "chest", rate: "≈0,01 %", spot: { at: "dungeon", name: "Cherry Blossom Cave" }, sure: false },
  { name: "Hallowed Mask Schematic 4", source: "Tides of Terraria dungeon – locked red chest", kind: "chest", rate: "≈0,01 %", spot: { at: "dungeon", name: "Cherry Blossom Cave" }, sure: false },
  { name: "Hallowed Headgear Schematic 4", source: "Tides of Terraria dungeon – locked red chest", kind: "chest", rate: "≈0,01 %", spot: { at: "dungeon", name: "Cherry Blossom Cave" }, sure: false },
  { name: "Hallowed Helmet Schematic 4", source: "Tides of Terraria dungeon – locked red chest", kind: "chest", rate: "≈0,01 %", spot: { at: "dungeon", name: "Cherry Blossom Cave" }, sure: false },
  { name: "Hallowed Hood Schematic 4", source: "Tides of Terraria dungeon – locked red chest", kind: "chest", rate: "≈0,01 %", spot: { at: "dungeon", name: "Cherry Blossom Cave" }, sure: false },
  { name: "Hallowed Plate Mail Schematic 4", source: "Tides of Terraria dungeon – locked red chest", kind: "chest", rate: "≈0,01 %", spot: { at: "dungeon", name: "Cherry Blossom Cave" }, sure: false },

  // Arenan och handlarna – fasta priser, ingen tur inblandad.
  { name: "Meteor Launcher Schematic 4", source: "Arena – first Platinum-tier win", kind: "vendor", rate: "100 % första gången", spot: { at: "region", id: "REGION_Arena" }, sure: true },
  { name: "Marksman Revolver Schematic 4", source: "Arena Shop", kind: "vendor", rate: "1300 Battle Tickets", spot: { at: "region", id: "REGION_Arena" }, sure: true },
  { name: "Core Eject Shotgun Schematic 4", source: "Arena Shop", kind: "vendor", rate: "1300 Battle Tickets", spot: { at: "region", id: "REGION_Arena" }, sure: true },
  { name: "V1 Armor Schematic 4", source: "Arena Shop", kind: "vendor", rate: "1000 Battle Tickets", spot: { at: "region", id: "REGION_Arena" }, sure: false },
  { name: "V2 Armor Schematic 4", source: "Arena Shop", kind: "vendor", rate: "1000 Battle Tickets", spot: { at: "region", id: "REGION_Arena" }, sure: false },
  { name: "Lily's Spear Schematic 4", source: "Medal Merchant", kind: "vendor", rate: "Dog Coins", sure: false },
  { name: "Enhanced Lily's Spear Schematic 4", source: "Medal Merchant", kind: "vendor", rate: "Dog Coins", sure: false },
  { name: "Charge Rifle Schematic 4", source: "Arena Shop", kind: "vendor", rate: "1500 Battle Tickets", spot: { at: "region", id: "REGION_Arena" }, sure: false },
  { name: "Energy Shotgun Schematic 4", source: "Arena Shop", kind: "vendor", rate: "1500 Battle Tickets", spot: { at: "region", id: "REGION_Arena" }, sure: false },

  /* Kist-/kartbundna klassiker – flera av dem satt på bossar FÖRE 1.0
     (Pal Metal Helm på Frostallion, Old Bow på Kingpaca …), vilket är
     precis det gamla guider fortfarande påstår. Enkälls-rader är märkta. */
  { name: "Old Bow Schematic 4", source: "Treasure Map (Common)", kind: "chest", rate: "≈0,8 %", spot: { at: "map" }, sure: false },
  { name: "Sword Schematic 4", source: "Treasure Map (Common)", kind: "chest", rate: "≈0,3 %", spot: { at: "map" }, sure: false },
  { name: "Katana Schematic 4", source: "Treasure Map (Uncommon)", kind: "chest", rate: "≈1 %", spot: { at: "map" }, sure: false },
  { name: "Beam Sword Schematic 4", source: "Treasure Map (Legendary)", kind: "chest", rate: "≈0,6 %", spot: { at: "map" }, sure: false },
  { name: "Compound Bow Schematic 4", source: "Treasure Map (Rare)", kind: "chest", rate: "≈1,7 %", spot: { at: "map" }, sure: false },
  { name: "Metal Bat Schematic 4", source: "Desert enemy camp", kind: "chest", rate: "≈0,5 %", spot: { at: "camp", regions: ["Desert1"] }, sure: true },
  { name: "Advanced Fishing Rod (Depresso) Schematic 4", source: "Snow enemy camp", kind: "chest", rate: "100 %", spot: { at: "camp", regions: ["Snow1"] }, sure: false },
  { name: "Pelt Armor Schematic 4", source: "Treasure Map (Common)", kind: "chest", rate: "≈0,5 %", spot: { at: "map" }, sure: false },
  { name: "Refined Metal Helm Schematic 4", source: "Treasure Map (Uncommon)", kind: "chest", rate: "≈1 %", spot: { at: "map" }, sure: false },
  { name: "Refined Metal Armor Schematic 4", source: "Treasure Map (Uncommon)", kind: "chest", rate: "≈1 %", spot: { at: "map" }, sure: false },
  { name: "Pal Metal Helm Schematic 4", source: "Treasure Map (Rare)", kind: "chest", rate: "≈1,7 %", spot: { at: "map" }, sure: false },
  { name: "Pal Metal Armor Schematic 4", source: "Treasure Map (Rare)", kind: "chest", rate: "≈1,7 %", spot: { at: "map" }, sure: false },
  { name: "Heat Resistant Pal Metal Armor Schematic 4", source: "Treasure Map (Rare)", kind: "chest", rate: "≈1,7 %", spot: { at: "map" }, sure: false },
  { name: "Cold Resistant Pal Metal Armor Schematic 4", source: "Treasure Map (Rare)", kind: "chest", rate: "≈1,7 %", spot: { at: "map" }, sure: false },
  { name: "Hexolite Armor Schematic 4", source: "Astral Mountain camps / coastal bases", kind: "chest", rate: "≈2 %", spot: { at: "camp", regions: ["Snow1"] }, sure: false },
  { name: "Heat Resistant Hexolite Armor Schematic 4", source: "Astral Mountain camps / coastal bases", kind: "chest", rate: "≈1 %", spot: { at: "camp", regions: ["Snow1"] }, sure: false },
  { name: "Cold Resistant Hexolite Armor Schematic 4", source: "Astral Mountain camps / coastal bases", kind: "chest", rate: "≈1 %", spot: { at: "camp", regions: ["Snow1"] }, sure: false },
  { name: "Plasteel Armor Schematic 4", source: "Sakurajima camps / coastal bases", kind: "chest", rate: "≈2 %", spot: { at: "camp", regions: ["Sakurajima1"] }, sure: false },
  { name: "Plasteel Helmet Schematic 4", source: "Sakurajima camps / coastal bases", kind: "chest", rate: "≈1,4 %", spot: { at: "camp", regions: ["Sakurajima1"] }, sure: false },
  { name: "Tropical Outfit Schematic 4", source: "Treasure Map (Common)", kind: "chest", rate: "≈0,8 %", spot: { at: "map" }, sure: false },
  { name: "Tundra Outfit Schematic 4", source: "Treasure Map (Common)", kind: "chest", rate: "≈0,8 %", spot: { at: "map" }, sure: false },
];

/**
 * Sök bland schematics: träff på namnet eller källan.
 *
 * Tar listan som argument eftersom den inte längre bara är den kurerade
 * tabellen: ruinernas rader HÄRLEDS ur kartdatat (`ruinSchematics`) och läggs
 * ihop med den här. Utan det saknades 71 legendariska tillbehör – hela
 * ring-, talisman- och batongfamiljen (Kens fynd aug 2026).
 */
export function schematicsMatching(all: readonly Schematic[], q: string): Schematic[] {
  const needle = q.toLowerCase();
  return all.filter((s) =>
    s.name.toLowerCase().includes(needle) || s.source.toLowerCase().includes(needle));
}
