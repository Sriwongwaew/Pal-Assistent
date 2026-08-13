/* Vad en vara ÄR: spelets egen beskrivning plus dess siffror.
 *
 * `data/itemInfo.json` är GENERERAD av `tools/build-item-info.mjs` ur
 * pyPalworldAPI:s `items`-tabell (speldata v1.0.1, datamined) – samma dump som
 * drops-tabellen kommer ur. Skriv aldrig i JSON-filen för hand; kör om skriptet
 * när drops, ranchtabellen, malmen, IV-frukterna eller schematics fått nya namn.
 *
 * Texten är Pocketpairs egen och **översätts aldrig**, precis som artnamn,
 * passivnamn och ranch-varor: den ska gå att känna igen i spelets egen meny.
 * Etiketterna runt siffrorna är däremot gränssnitt och bor i katalogen.
 *
 * Två saker som gränssnittet MÅSTE respektera, för de är hela skillnaden mellan
 * en siffra och en halvsanning:
 *
 * 1. **`base` betyder att siffrorna är basvariantens.** Varje vapen har exakt en
 *    rad i källan (`AssaultRifle_Default1`), medan en "Schematic 4" bygger
 *    `_Default5`. De högre varianternas värden finns inte i någon datamined
 *    källa vi har – `gear`-tabellen har per-raritet men täcker bara 20 av 85
 *    namn och saknar attack helt. Att skala fram dem själv vore en gissning av
 *    exakt den sort som resten av appen vägrar göra, så siffran visas som
 *    basvariantens och förbehållet står i rutan. Ta inte bort det: en spelare
 *    som läser 320 attack på en legendarisk ritning tror att den är svagare än
 *    den är, och väljer bort den.
 * 2. **`blueprint` betyder att vi bara har ritningens text**, inte vapnets.
 *    Gäller Flamethrower, vars vapenrad inte finns i källan (den är en
 *    fiendevariant, `FireCult_FlameThrower`). Rutan säger det i stället för att
 *    låta ritningstexten se ut som en vapenbeskrivning.
 */

import raw from "./data/itemInfo.json";

/** Spelets egen varutyp. Styr vilka siffror som är meningsfulla att visa. */
export type ItemKind =
  | "Weapon" | "SpecialWeapon" | "Armor" | "Accessory" | "Glider"
  | "Material" | "Consume" | "Food" | "Ammo" | "Blueprint" | "Essential";

export interface ItemInfo {
  /** Varutyp, spelets ord. */
  t: ItemKind;
  /** Spelets egen beskrivning. Tom sträng förekommer inte i utdatan. */
  d: string;
  /** Attack (vapen). */
  atk?: number;
  /** Magasinstorlek (skjutvapen). */
  mag?: number;
  /** Fysiskt försvar (rustning). */
  def?: number;
  /** HP-bonus (rustning). */
  hp?: number;
  /** Sköldvärde (rustning). */
  shield?: number;
  /** Hållbarhet. */
  dur?: number;
  /** Vikt. */
  w?: number;
  /** Guldvärde hos handlare. */
  g?: number;
  /** true = siffrorna är BASVARIANTENS, inte den legendariska. Se filens huvud. */
  base?: boolean;
  /** true = texten är ritningens, inte vapnets. Se filens huvud. */
  blueprint?: boolean;
}

const INFO = raw as Record<string, ItemInfo>;

/**
 * Vad vet vi om varan? `null` = ingenting, och då ska ingen ruta visas alls.
 *
 * Namnet är spelets engelska visningsnamn. Ett namn med " Schematic N" kapas
 * först: det man vill veta är vad *vapnet* gör, inte vad pappret är – samma
 * uppslag som `schematicIconSlug` gör för bilden.
 */
export function itemInfo(name: string): ItemInfo | null {
  return INFO[name] ?? INFO[name.replace(/ Schematic( \d+)?$/, "")] ?? null;
}

/** Har varan någon känd beskrivning? Billig koll innan ett hover-attribut sätts. */
export const hasItemInfo = (name: string): boolean => itemInfo(name) !== null;
