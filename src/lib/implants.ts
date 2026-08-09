/**
 * Pal Surgery Table: vilka passiver du kan sätta in i efterhand.
 *
 * Varför det här är den billigaste optimeringen i hela planeraren: en önskad
 * passiv du *inte* behöver avla in försvinner ur arvspoolen, och kostnaden är
 * konvex i poolens storlek. Fyra önskade ur en ren pool är 10 % per ägg, tre är
 * 30 % – att operera in den fjärde gör alltså planen **~3× billigare**, och två
 * opererade gör den 6× billigare. Det är mer än någon omväg `mergeTree` eller
 * `solveChainCheapest` kan hitta.
 *
 * Operationen görs på den **färdiga** palen, efter avlingen. Det är hela poängen:
 * en implanterad passiv är en riktig passiv och skulle hamna i poolen som alla
 * andra om den satt på en förälder. Sätter man den sist kommer den aldrig i
 * vägen för ett enda ägg.
 *
 * ## Två källor, och bara en av dem är sanning
 *
 * **Saven vet.** Implantaten ligger som items med id
 * `PalPassiveSkillChange_Consumable_<passiv-id>` – suffixet *är* passivens id, så
 * inget uppslag behövs. `tools/palsave.py` läser dem ur `ItemContainerSaveData`
 * och lägger dem i `AppData.implants`. Det är exakt data om just din värld.
 *
 * **Wikin gissar.** [Implant](https://palworld.wiki.gg/wiki/Implant) listar 26
 * "Implant: X"-moduler, alla på rank ≤ 3, och guider drar slutsatsen att
 * "rainbow-nivån är utesluten". **Den slutsatsen är fel**, och det är mätt, inte
 * misstänkt: Kens save innehåller
 * `PalPassiveSkillChange_Consumable_MoveSpeed_up_3` (Swift, rank 4) och
 * `…_PAL_FullStomach_Down_3` (Mastery of Fasting, rank 4). Wikins lista är alltså
 * *en* familj av items, inte hela mängden.
 *
 * Därför den här ansvarsfördelningen, och ändra den inte:
 *
 * 1. **Att du äger ett implantat är ett påstående appen får göra** – det står i
 *    saven. `ownedImplants` / `ownsImplant`.
 * 2. **Att en passiv går att skaffa som implantat får appen bara antyda**, för
 *    wikins lista är bevisat ofullständig. `KNOWN_MODULES` / `isKnownModule`.
 * 3. **Att en passiv INTE går att operera in får appen aldrig påstå.** Det var
 *    det första försöket här, byggt på wikins lista, och det hade sagt "Swift
 *    måste avlas" till någon som har implantatet i förrådet. Ett negativt
 *    påstående om en ofullständig lista är alltid fel.
 */
import { inheritOdds } from "./breeding";
import type { AppData } from "./types";

/** Prefixet på implantat-itemet. Resten av id:t är passivens id. */
export const IMPLANT_ITEM_PREFIX = "PalPassiveSkillChange_Consumable_";

/** Item-id:t för implantatet som ger en passiv. */
export const implantItemId = (passive: string): string => IMPLANT_ITEM_PREFIX + passive;

/** Passiven ett implantat-item ger, eller null om id:t inte är ett implantat. */
export function passiveOfImplantItem(itemId: string): string | null {
  if (!itemId.startsWith(IMPLANT_ITEM_PREFIX)) return null;
  const passive = itemId.slice(IMPLANT_ITEM_PREFIX.length);
  return passive || null;
}

/**
 * De 26 modulerna wikin listar, som passiv-id (spelnamnet i kommentaren).
 *
 * Används **bara** för att antyda att något går att skaffa – aldrig för att säga
 * att något inte går. Listan är ordagrann ur wikin och bevisat ofullständig; se
 * filhuvudet. Att den ändå finns är för att den täcker precis de billiga
 * arbetspassiverna man oftast jagar (Serious, Work Slave, Artisan är alla tre
 * moduler), och det är värt att veta innan man planerar fyra avlade passiver.
 */
export const KNOWN_MODULES: readonly string[] = [
  "SwimSpeed_up_2", //                Ace Swimmer
  "CraftSpeed_up2", //                 Artisan
  "PAL_ALLAttack_up1", //              Brave
  "Deffence_up2", //                   Burly Body
  "PAL_FullStomach_Down_1", //         Dainty Eater
  "PAL_FullStomach_Down_2", //         Diet Lover
  "PAL_ALLAttack_up2", //              Ferocious
  "SalePrice_Up_2", //                 Fine Furs
  "Stamina_Up_2", //                   Fit as a Fiddle
  "Deffence_up1", //                   Hard Skin
  "CoolTimeReduction_Up_2", //         Impatient
  "Stamina_Up_1", //                   Infinite Stamina
  "Nocturnal", //                      Insomnia
  "TrainerLogging_up1", //             Logging Foreman
  "NonKilling", //                     Mercy Hit
  "TrainerMining_up1", //              Mine Foreman
  "Noukin", //                         Musclehead
  "MoveSpeed_up_1", //                 Nimble
  "Test_PalEgg_HatchingSpeed_Up", //   Philanthropist
  "PAL_Sanity_Down_1", //              Positive Thinker
  "MoveSpeed_up_2", //                 Runner
  "CoolTimeReduction_Up_1", //         Serenity
  "CraftSpeed_up1", //                 Serious
  "SwimSpeed_up_1", //                 Sleek Stroke
  "PAL_CorporateSlave", //             Work Slave
  "PAL_Sanity_Down_2", //              Workaholic
];

const MODULE_SET: ReadonlySet<string> = new Set(KNOWN_MODULES);

/** Finns passiven bland modulerna wikin listar? Ett "ja" – aldrig ett "nej". */
export const isKnownModule = (id: string): boolean => MODULE_SET.has(id);

/**
 * Implantaten i din värld, eller `null` när saven inte lästs av en läsare som
 * kan fältet.
 *
 * Skillnaden mellan `null` och `{}` är hela poängen: det första betyder "vi vet
 * inte", det andra "vi läste, du äger inga". Gränssnittet ska tiga i det första
 * fallet, inte påstå ett tomt förråd.
 */
export const ownedImplants = (data: AppData): Record<string, number> | null =>
  data.implants ?? null;

/** Äger du ett implantat för passiven? `false` även när vi inte vet. */
export const ownsImplant = (data: AppData, id: string): boolean =>
  (data.implants?.[id] ?? 0) > 0;

export interface ImplantAdvice {
  /** Önskade du **äger** ett implantat för – kan hoppas över redan i dag. */
  owned: string[];
  /** Önskade som finns som modul enligt wikin, men som du inte äger. */
  available: string[];
  /** Önskade vi inte vet något om – planera på att avla dem. */
  unknown: string[];
  /** Sista stegets odds om alla önskade avlas fram. */
  oddsAll: number;
  /** …om de du äger implantat för hoppas över. */
  oddsOwned: number;
  /** …om även modulerna skaffas. */
  oddsBest: number;
  /** oddsOwned / oddsAll – hur många gånger färre ägg med det du har i dag. */
  saving: number;
  /** oddsBest / oddsAll – taket om du skaffar resten också. */
  savingBest: number;
}

/**
 * Vad man vinner på att avla färre passiver och operera in resten.
 *
 * Oddsen är sista stegets: en ren pool av exakt de önskade. Att lyfta ut en
 * passiv krymper poolen med ett, och `inheritOdds` är brutalt konvex där –
 * 4 → 3 önskade är 10 % → 30 %.
 *
 * Vinsten räknas som kvoten mellan oddsen, alltså förhållandet mellan förväntat
 * antal ägg för det steget. Hela planen krymper inte exakt lika mycket (tidigare
 * steg har mindre pooler), men sista steget dominerar kostnaden, så kvoten är
 * den ärliga storleksordningen – och den är alltid en **under**skattning av
 * vinsten, eftersom även mellanstegen blir renare.
 *
 * `owned` skiljs från `available` för att de är olika sorters påstående: det
 * första är läst ur saven, det andra är wikins lista. Rutan i gränssnittet måste
 * kunna säga "du har den här" utan att blanda in "den här finns nog".
 */
export function implantAdvice(
  wanted: readonly string[],
  implants: Readonly<Record<string, number>> | null,
): ImplantAdvice {
  const owned = wanted.filter((id) => (implants?.[id] ?? 0) > 0);
  const available = wanted.filter((id) => !owned.includes(id) && isKnownModule(id));
  const unknown = wanted.filter((id) => !owned.includes(id) && !available.includes(id));

  const oddsAll = inheritOdds(wanted.length, wanted.length);
  const bredOwned = wanted.length - owned.length;
  const bredBest = unknown.length;
  const oddsOwned = inheritOdds(bredOwned, bredOwned);
  const oddsBest = inheritOdds(bredBest, bredBest);

  return {
    owned,
    available,
    unknown,
    oddsAll,
    oddsOwned,
    oddsBest,
    saving: oddsAll > 0 ? oddsOwned / oddsAll : 1,
    savingBest: oddsAll > 0 ? oddsBest / oddsAll : 1,
  };
}
