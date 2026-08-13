/* Kurerade partnerskill-uppställningar för Bäst för… (aug 2026).
 *
 * HANDKURERAT ur 1.0-daterade metakällor (game8:s stödlista 2026-08-05 m.fl.,
 * korslagda) – radernas MOTIVERING är partnerskillens egen speltext, som
 * renderas ur partnerSkills-tabellen; här ligger bara urvalet. Procent i
 * kombo-raden är communityuppmätta (märks ≈). */

export interface MetaRow {
  /** Artkod i datasetet. */
  code: string;
  /** i18n-nyckelsuffix när raden behöver en EGEN förklaring utöver
   *  partnerskillens text (bf.meta.<note>). */
  note?: string;
}

/* Koderna är datasetets INTERNA (SharkKid = Gobfin, IceHorse = Frostallion …),
 * aldrig visningsnamnen: raderna slås upp mot `Species.code`, och ett
 * visningsnamn faller tyst bort ur listan – så stod 10 av 16 rader skrivna
 * som namn och sidan visade en tredjedel av metan utan att något såg trasigt
 * ut (hittat 2026-08-11). `tests/partnerMeta.test.ts` håller varje kod mot
 * datasetet så nästa felskrivning stoppar bygget i stället. */

/** Bäst för SPELAREN: pals vars partnerskill buffar dig, inte sig själva. */
export const SUPPORT_META: MetaRow[] = [
  { code: "MonochromeQueen" }, // Solenne
  { code: "SharkKid", note: "gobfin" }, // Gobfin
  { code: "ThunderDragonMan" }, // Orserk – kulstacken
  { code: "ScorpionMan_Electric" }, // Prixter Lux
  { code: "WhiteDeer_Dark" }, // Celesdir Noct
  { code: "WhiteShieldDragon" }, // Silvegis
  { code: "DarkMechaDragon" }, // Xenolord – vapenpals partnerskador
  { code: "IceHorse", note: "convert" }, // Frostallion
  { code: "IceHorse_Dark", note: "convert" }, // Frostallion Noct
  { code: "Anubis", note: "convert" },
  { code: "MoonQueen", note: "convert" }, // Selyne – förstärker Neutral/Dark
];

/** Basförsvar (1.0:s vågräder): Panthalus partnerskill ÄR luftvärn. */
export const DEFENSE_META: MetaRow[] = [
  { code: "KingWhale" }, // Panthalus
  { code: "Anubis" },
  { code: "LazyDragon_Electric" }, // Relaxaurus Lux
  { code: "RedArmorBird" }, // Ragnahawk
  { code: "BlackGriffon" }, // Shadowbeak
  { code: "Umihebi_Fire" }, // Jormuntide Ignis
];
