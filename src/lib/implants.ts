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
 * Två saker som gör att listan är en **lista** och inte en regel:
 *
 * 1. **Regeln "låg rank ⇒ går att operera in" håller inte.** Den prövades mot
 *    datasetet: av de 86 passiver som kan sitta på en pal har 47 rank ≤ 3 utan
 *    att finnas som implantat (alla element-boostarna, Healing Coach, Farmhand,
 *    Vanguard, nästan alla negativa …). Listan är alltså kurerad av spelet, inte
 *    härledbar, och måste stå som id:n. En ny passiv i datasetet blir därför
 *    **inte** operabel automatiskt – det är avsiktligt, och `implants.test.ts`
 *    vaktar att inget id ruttnar.
 * 2. **Det som däremot håller perfekt: ingenting med rank ≥ 4 går att operera in.**
 *    0 av 60 i hela tabellen (53 på rank 4, 7 på rank 5). Demon God, Diamond Body,
 *    Swift, Lucky, Remarkable Craftsmanship, Eternal Engine och varje World Tree
 *    måste fortfarande avlas eller fångas. Det är också vad guiderna menar när de
 *    säger att "rainbow-nivån är utesluten". Invarianten testas mot datasetet, så
 *    en framtida patch som öppnar upp den syns som ett rött test.
 *
 * Källa: [Implant](https://palworld.wiki.gg/wiki/Implant) (26 implantat, listade
 * nedan i wikins ordning), korsläst mot guidernas kortare listor. Bordet kräver
 * teknologinivå 38 och varje ingrepp kostar guld, så tabellen svarar på *om* det
 * går – inte på om det är värt guldet.
 *
 * Namnen i kommentarerna är spelets, id:na datasetets. De skiljer sig: wikins
 * "Implant: Insomnia" ger passiven som heter `Nocturnal` i datasetet.
 */
import { inheritOdds } from "./breeding";

/** De 26 implantaten, som passiv-id. Ordagrant ur wikins lista. */
export const IMPLANTS: readonly string[] = [
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

const IMPLANT_SET: ReadonlySet<string> = new Set(IMPLANTS);

/** Går passiven att sätta in med Pal Surgery Table i efterhand? */
export const canImplant = (id: string): boolean => IMPLANT_SET.has(id);

export interface ImplantAdvice {
  /** Önskade passiver som går att operera in efter avlingen. */
  implantable: string[];
  /** Önskade passiver som måste avlas – de finns inte som implantat. */
  bred: string[];
  /** Oddsen för sista steget om alla önskade avlas fram. */
  oddsAll: number;
  /** …och om bara `bred` avlas och resten opereras in. */
  oddsBred: number;
  /** Hur många gånger färre ägg planen kostar. 1 = ingen vinst. */
  saving: number;
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
 */
export function implantAdvice(wanted: readonly string[]): ImplantAdvice {
  const implantable = wanted.filter(canImplant);
  const bred = wanted.filter((id) => !canImplant(id));
  const oddsAll = inheritOdds(wanted.length, wanted.length);
  const oddsBred = inheritOdds(bred.length, bred.length);
  return {
    implantable,
    bred,
    oddsAll,
    oddsBred,
    saving: oddsAll > 0 ? oddsBred / oddsAll : 1,
  };
}
