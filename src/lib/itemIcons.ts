/* Spelets item-ikoner för det Hitta visar: materialdrops, ranchvaror och
 * schematic-vapnen/rustningarna.
 *
 * `data/itemIcons.json` (engelskt visningsnamn → filslug i /icons/items/) är
 * GENERERAD av `tools/build-item-icons.mjs` ur oMaN-Rod/palworld-save-pal –
 * samma källa som artikonerna: `data/json/l10n/en/items.json` ger namn →
 * item-id, `data/json/items.json` ger id → ikonfil, och ikonerna ligger i
 * `ui/src/lib/assets/img/`. Kör om skriptet när drops.json regenererats
 * eller schematics-/ranchtabellerna fått nya namn; skriv aldrig i
 * JSON-filen för hand.
 *
 * Namn som saknar belagd ikon står inte i tabellen och får ingen bild –
 * en gissad ikon ser precis lika trovärdig ut som en riktig, samma regel
 * som RANCH_DROPS ("vara okänd" är ärligt, en påhittad vara är det inte).
 * I skrivande stund (aug 2026) täcks samtliga 184 namn.
 */
import raw from "./data/itemIcons.json";

const ICONS = raw as Record<string, string>;

/** Filslug i /icons/items/ för ett engelskt item-namn, eller null. */
export function itemIconSlug(name: string): string | null {
  return ICONS[name] ?? null;
}

/**
 * Schematic-raderna heter "<vapen> Schematic 4" men bilden är vapnets –
 * det är vapnet man farmar fram, inte ett papper.
 */
export function schematicIconSlug(schematicName: string): string | null {
  return itemIconSlug(schematicName.replace(/ Schematic( \d+)?$/, ""));
}
