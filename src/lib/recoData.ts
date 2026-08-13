/* Slaktguiden: den tredje kanalen vid sidan av mata/behålla.
 *
 * HANDKURERAD (aug 2026): fångst + slakt = två rullar på samma droptabell,
 * och droppassiver på palen som slaktas (Service-Minded +50 %, Lavish
 * Hospitality +100 %) stackar – det är 1.0:s själsfarm. Sälja är alltid
 * sämst (säljpris = köppris/20). Listorna är communitybelagda; procenten för
 * jättesjäls-trion är brett rapporterad men inte utgivarbekräftad – märks ≈.
 * Artnamn/items är spelets ord. `never` = slakta aldrig (ranchvaran är värdet). */

export interface ButcherRow {
  /** Artkod i datasetet. */
  code: string;
  name: string;
  /** Vad slakten ger, spelets ord. */
  gives: string;
  /** i18n-nyckelsuffix för motiveringen (reco.butcher.<why>). */
  why: "souls" | "soulsTrio" | "alpha" | "diamond";
}

/* Koderna är datasetets INTERNA (DomeArmorDragon = Aegidron …), aldrig
 * visningsnamnen: raderna matchas mot `Species.code`, och en felskriven kod
 * gör raden till en tyst nolla – så var hela jättesjäls-trion död tills
 * 2026-08-11. `tests/partnerMeta.test.ts` håller koderna mot datasetet. */
export const BUTCHER_ROWS: ButcherRow[] = [
  { code: "DomeArmorDragon", name: "Aegidron", gives: "Giant Pal Soul (≈100 %)", why: "soulsTrio" },
  { code: "Mothman", name: "Silvance", gives: "Giant Pal Soul (≈100 %)", why: "soulsTrio" },
  { code: "FlowerPrince", name: "Dandilord", gives: "Giant Pal Soul (≈100 %)", why: "soulsTrio" },
  { code: "Anubis", name: "Anubis", gives: "Large Pal Soul", why: "souls" },
  { code: "Werewolf_Ice", name: "Loupmoon Cryst", gives: "Medium Pal Soul", why: "souls" },
  { code: "JetDragon", name: "Jetragon", gives: "Diamond", why: "diamond" },
];
