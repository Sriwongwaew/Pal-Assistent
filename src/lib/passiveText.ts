/* Vad passiven **faktiskt** gör – i klartext, på svenska.
 *
 * Varför en handskriven tabell i ett projekt som annars härleder allt ur datan:
 * `PassiveDef.fx` är inte en beskrivning, det är de fem siffror poängsättningen
 * behöver. Två tredjedelar av passiverna har inga fx alls (Lightfooted,
 * Philanthropist, Insomnia, Heart of the Immovable King …), och för flera av dem
 * som har det är fx *ofullständig*: Serenity sänker laddningstiden 30 % men bär
 * bara `atk: 10`, Lunker är `ele: 40` där spelet säger 20 % vatten + 20 % is, och
 * Lucky saknar sitt försvar. Att skriva en tooltip ur fx hade alltså inte svarat
 * på frågan – den hade i bästa fall upprepat det banderollen redan visar.
 *
 * Texterna är därför spelets egna beskrivningar, översatta. Källa är samma
 * uppströms-dataset som resten av den statiska halvan (`palworld-save-pal`,
 * `data/json/l10n/en/passive_skills.json`). `npm run passive-text` hämtar det
 * igen och säger vilka id:n som saknar svensk text eller inte finns kvar – kör
 * det när den statiska halvan regenereras, annars upptäcks en ny passiv först
 * när någon hovrar över den och får "ingen beskrivning".
 *
 * Ligger i src/lib och inte i pal-data.json med flit: den statiska halvan
 * genereras utanför repot, och allt man lägger i den försvinner nästa gång den
 * regenereras. */
import { msg, type Msg } from "../i18n";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";
import type { PassiveDef } from "./types";
import { PASSIVE_TEXT_EN } from "./passiveTextEn";

/** World Tree-passiverna delar sista meningen – den är lång och står tre gånger. */
const WT = "World Tree-resurser försvinner inte när du kommer nära";

/** De två vampyrpassiverna har exakt samma beskrivning i spelet. */
const VAMP = "Suger i sig en del av skadan den gör som HP · sover inte på natten utan jobbar vidare";

/**
 * Passiv-id → vad den gör. Nyckeln är samma id som i `AppData.passives`.
 *
 * Procenten är spelets egna. Där spelets text saknar en siffra står ingen –
 * hitta inte på en: en påhittad procent ser precis lika trovärdig ut som en
 * riktig, och den här texten är det enda stället användaren får veta vad
 * passiven gör.
 */
export const PASSIVE_TEXT: Record<string, string> = {
  Alien: "Attack +10 % · tar 15 % mindre eld- och elskada",
  Attack_ACC_up4: "Attack +20 %",
  Attack_ACC_up4_Armor: "Attack +12 %",
  Attack_ACC_up4_Otomo_Only_Equip: "Palens attack +16 %",
  AutoHPRegeneRate_Passive: "Spelarens automatiska HP-återhämtning +5 %",
  CoolTimeReduction_Down_1: "Laddningstiden på aktiva färdigheter blir 15 % längre",
  CoolTimeReduction_Up_1: "Laddningstiden på aktiva färdigheter −30 % · attack +10 %",
  CoolTimeReduction_Up_2: "Laddningstiden på aktiva färdigheter −15 %",
  // Spelets egen text anger 0,0 % på båda effekterna – siffrorna saknas i källan.
  CoolTimeReduction_Up_3: "Kortare laddningstid på aktiva färdigheter och högre attack (spelets text saknar siffror)",
  CraftSpeed_down1: "Arbetshastighet −10 %",
  CraftSpeed_down2: "Arbetshastighet −30 %",
  CraftSpeed_up1: "Arbetshastighet +20 %",
  CraftSpeed_up2: "Arbetshastighet +50 %",
  CraftSpeed_up3: "Arbetshastighet +75 %",
  Defense_ACC_up4_Otomo_Only_Equip: "Palens försvar +20 %",
  Deffence_down1: "Försvar −10 %",
  Deffence_down2: "Försvar −20 %",
  Deffence_up1: "Försvar +10 %",
  Deffence_up2: "Försvar +20 % · kan inte avbrytas av träffar",
  Deffence_up2_2: "Försvar +20 % · kan inte knuffas omkull",
  Deffence_up3: "Försvar +30 % · kan varken avbrytas av träffar eller knuffas omkull",

  ElementBoost_Aqua_1_PAL: "Vattenskada +10 %",
  ElementBoost_Aqua_2_PAL: "Vattenskada +30 %",
  ElementBoost_Dark_1_PAL: "Mörkerskada +10 %",
  ElementBoost_Dark_2_PAL: "Mörkerskada +30 %",
  ElementBoost_Dark_4_Otomo_Only_Equip: "Palens mörkerskada +20 %",
  ElementBoost_Dragon_1_PAL: "Drakskada +10 %",
  ElementBoost_Dragon_2_PAL: "Drakskada +30 %",
  ElementBoost_Dragon_4_Otomo_Only_Equip: "Palens drakskada +20 %",
  ElementBoost_Earth_1_PAL: "Jordskada +10 %",
  ElementBoost_Earth_2_PAL: "Jordskada +30 %",
  ElementBoost_Earth_4_Otomo_Only_Equip: "Palens jordskada +20 %",
  ElementBoost_Electricity_4_Otomo_Only_Equip: "Palens elskada +20 %",
  ElementBoost_Fire_1_PAL: "Eldskada +10 %",
  ElementBoost_Fire_2_PAL: "Eldskada +30 %",
  ElementBoost_Fire_4_Otomo_Only_Equip: "Palens eldskada +20 %",
  ElementBoost_Ice_1_PAL: "Isskada +10 %",
  ElementBoost_Ice_2_PAL: "Isskada +30 %",
  ElementBoost_Ice_4_Otomo_Only_Equip: "Palens isskada +20 %",
  ElementBoost_Leaf_1_PAL: "Grässkada +10 %",
  ElementBoost_Leaf_2_PAL: "Grässkada +30 %",
  ElementBoost_Leaf_4_Otomo_Only_Equip: "Palens grässkada +20 %",
  ElementBoost_Normal_1_PAL: "Normalskada +10 %",
  ElementBoost_Normal_2_PAL: "Normalskada +30 %",
  ElementBoost_Normal_4_Otomo_Only_Equip: "Palens normalskada +20 %",
  ElementBoost_Thunder_1_PAL: "Elskada +10 %",
  ElementBoost_Water_4_Otomo_Only_Equip: "Palens vattenskada +20 %",

  ElementResist_Aqua_1_PAL: "Tar 10 % mindre vattenskada",
  ElementResist_Aqua_4: "Tar 35 % mindre vattenskada",
  ElementResist_Dark_1_PAL: "Tar 10 % mindre mörkerskada",
  ElementResist_Dark_4: "Tar 35 % mindre mörkerskada",
  ElementResist_Dragon_1_PAL: "Tar 10 % mindre drakskada",
  ElementResist_Dragon_4: "Tar 35 % mindre drakskada",
  ElementResist_Earth_1_PAL: "Tar 10 % mindre jordskada",
  ElementResist_Earth_4: "Tar 35 % mindre jordskada",
  ElementResist_Fire_1_PAL: "Tar 10 % mindre eldskada",
  ElementResist_Fire_4: "Tar 35 % mindre eldskada",
  ElementResist_Ice_1_PAL: "Tar 10 % mindre isskada",
  ElementResist_Ice_4: "Tar 35 % mindre isskada",
  ElementResist_Leaf_1_PAL: "Tar 10 % mindre grässkada",
  ElementResist_Leaf_4: "Tar 35 % mindre grässkada",
  ElementResist_Normal_1_PAL: "Tar 10 % mindre normalskada",
  ElementResist_Normal_4: "Tar 35 % mindre normalskada",
  ElementResist_Thunder_1_PAL: "Tar 10 % mindre elskada",
  ElementResist_Thunder_4: "Tar 35 % mindre elskada",

  EternalFlame: "Eldskada +30 % · elskada +30 %",
  FriendshipPoint_Increase_EquipSkill: "Förtroendet hos pals i partyt +50 %",
  HP_ACC_up4: "Max HP +25 %",
  Invader: "Mörkerskada +30 % · drakskada +30 %",
  Legend: "Attack +20 % · försvar +20 % · rörelsehastighet +20 %",
  MaxInventoryWeight_up_Equip_1: "Bärkapacitet +50 %",
  MaxInventoryWeight_up_Equip_2: "Bärkapacitet +100 %",
  MaxInventoryWeight_up_Equip_3: "Bärkapacitet +200 %",
  MaxInventoryWeight_up_Equip_4: "Bärkapacitet +300 %",
  MiniNushi: "Vattenskada +5 % · isskada +5 % · försvar +5 %",
  MoveSpeed_up_1: "Rörelsehastighet +10 %",
  MoveSpeed_up_2: "Rörelsehastighet +20 %",
  MoveSpeed_up_3: "Rörelsehastighet +30 %",
  MutationPal_Babysitter: "I basen: äggproduktion +30 % och kläckning +30 % för pals på avelsfarmen",
  MutationPal_ExplosionResist: "Immun mot explosionsskada",
  MutationPal_Immortal: "Livsstöld +5 % · palens automatiska HP-återhämtning +100 % · attack +15 %",
  MutationPal_Mutant: "Palens och spelarens automatiska HP-återhämtning +50 % · försvar +25 % · immun mot gift- och brännskada",
  NightOwl: "Nattdjur – slöar och sover bort stora delar av dagen",
  Nocturnal: "Sover inte, utan jobbar vidare även på natten",
  NonKilling: "Pacifist – slår aldrig ner målet under 1 HP",
  Noukin: "Attack +30 % · arbetshastighet −50 %",
  Nushi: "Vattenskada +20 % · isskada +20 % · försvar +20 %",
  OctaviaArmorVampire: VAMP,

  PAL_ALLAttack_down1: "Attack −10 %",
  PAL_ALLAttack_down2: "Attack −20 %",
  PAL_ALLAttack_up1: "Attack +10 %",
  PAL_ALLAttack_up2: "Attack +20 %",
  PAL_ALLAttack_up3: "Attack +30 % · försvar +5 %",
  PAL_CorporateSlave: "Arbetshastighet +30 % · attack −30 %",
  PAL_FullStomach_Down_1: "Blir hungrig 10 % långsammare",
  PAL_FullStomach_Down_2: "Blir hungrig 15 % långsammare",
  PAL_FullStomach_Down_3: "Blir hungrig 20 % långsammare",
  PAL_FullStomach_Up_1: "Blir hungrig 10 % snabbare",
  PAL_FullStomach_Up_2: "Blir hungrig 15 % snabbare",
  PAL_Sanity_Down_1: "SAN sjunker 10 % långsammare",
  PAL_Sanity_Down_2: "SAN sjunker 15 % långsammare",
  PAL_Sanity_Down_3: "SAN sjunker 20 % långsammare",
  PAL_Sanity_Up_1: "SAN sjunker 10 % snabbare",
  PAL_Sanity_Up_2: "SAN sjunker 15 % snabbare",
  PAL_SpiritualInst: "Arbetshastighet −10 % · försvar −10 %",
  PAL_conceited: "Arbetshastighet +10 % · försvar −10 %",
  PAL_masochist: "Försvar +15 % · attack −15 %",
  PAL_oraora: "Attack +10 % · försvar −10 %",
  PAL_rude: "Attack +15 % · arbetshastighet −10 %",
  PAL_sadist: "Attack +15 % · försvar −15 %",

  PlayerSP_DecreaseRate_Passive: "Spelarens uthållighet förbrukas 5 % långsammare",
  Rare: "Attack +15 % · försvar +15 % · arbetshastighet +20 %",
  ReloadSpeedUp_Passive: "Spelarens omladdning 4 % snabbare",
  RideJumpCount_Increase1: "Ett extra hopp i luften när du rider på den",
  RideJumpCount_Increase2: "Två extra hopp i luften när du rider på den",
  SalePrice_Down_1: "Föremål säljs för 10 % mindre",
  SalePrice_Up_1: "Föremål säljs för 5 % mer",
  SalePrice_Up_2: "Föremål säljs för 3 % mer",
  Salvation: "Normalskada +30 % · grässkada +30 %",
  SelfDeathAddItemDrop_up_2: "Släpper 50 % fler föremål när den besegras",
  SelfDeathAddItemDrop_up_3: "Släpper 100 % fler föremål när den besegras",
  Stamina_Down_1: "Max uthållighet −25 % · gäller bara pals du kan rida på",
  Stamina_Up_1: "Max uthållighet +50 % · gäller bara pals du kan rida på",
  Stamina_Up_2: "Max uthållighet +25 % · gäller bara pals du kan rida på",
  Stamina_Up_3: "Max uthållighet +75 % · gäller bara pals du kan rida på",
  StonDrop_Boost_5: "Kraftigt ökad mängd sten och malm när den bryter",
  SwimSpeed_up_1: "Rörelsehastighet i vatten +30 %",
  SwimSpeed_up_2: "Rörelsehastighet i vatten +40 %",
  SwimSpeed_up_3: "Rörelsehastighet i vatten +50 %",
  Test_PalEgg_HatchingSpeed_Up: "På avelsfarmen: avelshastigheten +100 %",

  // Trainer*-passiverna buffar DIG, inte palen – det är hela poängen med raden.
  TrainerATK_UP_1: "Spelarens attack +10 % · buffar dig, inte palen",
  TrainerDEF_UP_1: "Spelarens försvar +10 % · buffar dig, inte palen",
  TrainerLogging_up1: "Din egen hugghastighet +25 % · buffar dig, inte palen",
  TrainerMining_up1: "Din egen brytningstakt +25 % · buffar dig, inte palen",
  TrainerWorkSpeed_UP_1: "Din egen arbetshastighet +25 % · buffar dig, inte palen",

  Vampire: VAMP,
  Witch: "Mörkerskada +30 % · isskada +30 %",
  WoodDrop_Boost_5: "Kraftigt ökad mängd trä när den hugger",
  WorkSpeed_ACC_up4: "Arbetshastighet +25 %",
  WorkSuitabilityAddRank_MonsterFarm_1: "Arbetsnivån för Farming +1",
  WorkSuitabilityAddRank_MonsterFarm_2: "Arbetsnivån för Farming +2",

  WorldTree_ATK: `Attack +50 % · försvar −30 % · ${WT}`,
  WorldTree_ATK_DEF: `Attack +40 % · försvar +20 % · max HP −50 % · ${WT}`,
  WorldTree_CraftSpeed: `Arbetshastighet +90 % · SAN sjunker 15 % snabbare · ${WT}`,
  WorldTree_DEF: `Försvar +50 % · attack −30 % · ${WT}`,
  WorldTree_FullStomach: `Blir hungrig 50 % långsammare · HP −20 % · ${WT}`,
  WorldTree_MoveSpeed: `Rörelsehastighet +50 % · blir hungrig 15 % snabbare · ${WT}`,
  WorldTree_Sanity: `SAN sjunker 50 % långsammare · arbetshastighet −20 % · ${WT}`,

  YakushimaDagameBoost_Magic_Equip: "Skada med Yakushimas magivapen +20 %",
  YakushimaDagameBoost_Melee_Equip: "Skada med Yakushimas närstridsvapen +20 %",
  YakushimaDagameBoost_Ranged_Equip: "Skada med Yakushimas avståndsvapen +20 %",
  YakushimaDagameBoost_Summon_Equip: "Skada med Yakushimas frammaningsvapen +20 %",
  YakushimaProtection_Equip: "Försvar +30 % på Yakushima",
  defense_ACC_up4: "Försvar +25 %",
};

export type FxKey = "atk" | "craft" | "move" | "hp" | "ele" | "def";

/* Fx-radens etiketter kan inte gå via katalogen som resten av gränssnittet:
   raden byggs ihop av flera delar här i `src/lib`, där det inte finns någon
   översättare att fråga (se types.ts). Tabellen är därför per språk, precis som
   passivtexterna ovanför – och faller tillbaka på engelska av samma skäl. */
const FX_LABEL: Partial<Record<Locale, Record<FxKey, string>>> = {
  en: {
    atk: "Attack", craft: "Work speed", move: "Movement",
    hp: "HP", ele: "Element damage", def: "Defence",
  },
  sv: {
    atk: "Attack", craft: "Arbetshastighet", move: "Rörelse",
    hp: "HP", ele: "Elementskada", def: "Försvar",
  },
};

/** Spelets egen text per språk. Engelskan är genererad ur uppströms-l10n,
    svenskan handöversatt – och allt annat läser engelskan, som katalogen. */
const GAME_TEXT: Partial<Record<Locale, Record<string, string>>> = {
  en: PASSIVE_TEXT_EN,
  sv: PASSIVE_TEXT,
};

/**
 * "Attack +20 % · Arbetshastighet −50 %" ur poängsättningens egna siffror.
 *
 * Reservlösningen när en ny passiv dykt upp i datasetet men ingen text hunnit
 * skrivas: den är ofullständig (se filhuvudet) men aldrig fel, och den säger i
 * alla fall åt vilket håll passiven drar. Delas med `recommendPassives`, som
 * visar samma rad som motivering.
 */
export function describeEffects(fx: PassiveDef["fx"], locale: Locale = DEFAULT_LOCALE): string {
  if (!fx) return "";
  const labels = FX_LABEL[locale] ?? FX_LABEL[DEFAULT_LOCALE]!;
  return (Object.keys(labels) as FxKey[])
    .map((k) => [k, fx[k] ?? 0] as const)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${labels[k]} ${v > 0 ? "+" : "−"}${Math.abs(v)} %`)
    .join(" · ");
}

export interface PassiveText {
  /** Vad passiven gör. Null när varken text eller fx säger något. */
  text: string | null;
  /** Sant när texten är spelets egen, inte härledd ur fx. */
  fromGame: boolean;
}

/** Beskrivningen av en passiv: spelets text först, fx-raden som reserv. */
export function passiveText(
  id: string,
  def?: PassiveDef,
  locale: Locale = DEFAULT_LOCALE,
): PassiveText {
  const game = (GAME_TEXT[locale] ?? {})[id] ?? PASSIVE_TEXT_EN[id];
  if (game) return { text: game, fromGame: true };
  const derived = describeEffects(def?.fx, locale);
  return { text: derived || null, fromGame: false };
}

/** Nivån i ord – samma indelning som bannerns färg (`passiveVisual`). */
export function tierLabel(tier: number): Msg {
  if (tier >= 5) return msg("tier.worldTree");
  if (tier === 4) return msg("tier.legendary");
  if (tier >= 1) return msg("tier.numbered", { n: tier });
  if (tier <= -1) return msg("tier.negative");
  return msg("tier.unknown");
}
