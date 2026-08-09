/** Genvägar: småsaker att fånga som kortar hela planen rejält.
 *
 * Planen är låst till de pals du redan äger, och det är ofta där kostnaden
 * sitter. Bär den enda Skutlass du har tre skräp-passiver hamnar de i arvspoolen
 * i varje steg den deltar – medan en nyfångad, helt ren Skutlass hade halverat
 * antalet ägg. Att fånga en vanlig art tar minuter; att kläcka bort skillnaden
 * kan ta hundra ägg.
 *
 * Därför letar vi efter förbättringar som (1) går att FÅNGA i stället för att
 * avlas fram, (2) sparar mätbart många ägg, och (3) gäller en art som faktiskt
 * är lätt att hitta. Alla tre villkoren måste hålla – annars är det inte en
 * genväg utan bara ännu ett steg.
 */
import { childrenOf, inheritOdds } from "./breeding";
import type { PassivePlan } from "./passivePlan";
import type { AppData, Species } from "./types";

/** Palworlds rarity går 1–20. Allt upp till och med 5 dyker upp i vilt tillstånd
 *  på de tidiga öarna och räknas som "lätt att hitta". */
const EASY_RARITY = 5;
/** Minsta vinst för att alls nämna en fångst. */
const MIN_SAVED_EGGS = 3;

/**
 * Hur mycket måste en fångst spara för att vara värd besväret?
 *
 * En absolut gräns blir fel åt båda hållen: 7 sparade ägg motiverar inte en jakt
 * på en rarity 8-art, men 40 gör det med marginal. Kravet skalar därför med hur
 * svår arten är att hitta. Siffrorna är en tumregel, inte mätdata – de säger
 * bara "en Chikipi är värd tre ägg, en Eidrolon tio".
 */
const worthHunting = (saved: number, rarity: number) =>
  saved >= MIN_SAVED_EGGS * Math.max(1, rarity / 2);

export interface Shortcut {
  /** Art att fånga. */
  s: number;
  species: Species;
  /** Kön som krävs, null = spelar ingen roll. */
  gender: "M" | "F" | null;
  /** Ungefärligt antal ägg det sparar. */
  saves: number;
  /** Varför – i klartext, för UI:t. */
  why: string;
  /** Lätt att hitta i vilt tillstånd. */
  easy: boolean;
  /** Sorteringsvikt: gör paret möjligt alls > sparar ägg. */
  blocking: boolean;
}

const eggs = (p: number) => (p > 0 ? 1 / p : Infinity);

/**
 * Föreslår pals att fånga i stället för att avla runt. `wanted` är de önskade
 * passiverna; en ren partner är en som inte bär något utöver dem.
 */
export function suggestShortcuts(
  data: AppData,
  plan: PassivePlan,
  ownedSpecies: ReadonlySet<number>,
  target: number | null,
  limit = 3,
): Shortcut[] {
  const out: Shortcut[] = [];
  const k = plan.usable.length;
  if (!k) return out;

  /* Den största vinsten är inte en renare partner i sig, utan att en ren partner
     låser upp en KORTARE kedja. Planen väljer redan bort korta vägar som går via
     smutsiga partners – den informationen finns i `speciesPhaseShortcut`, och det
     är precis där en fångst betalar sig. */
  const sc = plan.speciesPhaseShortcut;
  const nowEggs = (plan.speciesPhase ?? []).reduce((n, st) => n + eggs(st.odds), 0);
  if (sc?.blockedBy !== null && sc !== null) {
    const sp = data.species[sc.blockedBy];
    const saved = nowEggs - sc.eggsIfClean;
    /* Kravet "lätt att hitta" är inte kosmetiskt. Att jaga en rarity 8-art för
       sju sparade ägg är sämre råd än att bara kläcka – då är det ingen genväg.
       Blockerande fall (steget går inte alls) släpps igenom oavsett, för då är
       fångsten inte valfri. */
    if (sp && worthHunting(saved, sp.rarity)) {
      out.push({
        s: sc.blockedBy, species: sp, gender: null, saves: saved, blocking: false,
        easy: sp.rarity <= EASY_RARITY,
        why: `Det finns en väg på ${sc.steps} steg i stället för ${plan.speciesPhase?.length}, `
          + `men din ${sp.name} släpar med skräp-passiver. En ren gör den korta vägen billigast.`,
      });
    }
  }
  void ownedSpecies; void target; void childrenOf;

  for (const st of plan.speciesPhase ?? []) {
    const sp = data.species[st.with];
    if (!sp) continue;

    // 1. Paret går inte att avla alls – det blockerar planen och väger tyngst.
    if (!st.genderOk && st.partner) {
      const need = st.partner.g === "M" ? "F" : "M";
      out.push({
        s: st.with, species: sp, gender: need, saves: Infinity, blocking: true,
        easy: sp.rarity <= EASY_RARITY,
        why: `Paret kan inte avla – du har bara ${st.partner.g === "M" ? "hanar" : "honor"} av arten.`,
      });
      continue;
    }

    // 2. Partnern släpar med skräp. En ren av samma art krymper poolen.
    if (st.partnerJunk > 0) {
      const clean = inheritOdds(k, st.pool - st.partnerJunk);
      const saved = eggs(st.odds) - eggs(clean);
      if (worthHunting(saved, sp.rarity)) {
        out.push({
          s: st.with, species: sp,
          // Bara första steget har ett låst kön; sedan är linjens kön slumpat.
          gender: st.first && st.partner ? (st.partner.g === "M" ? "M" : "F") : null,
          saves: saved, blocking: false,
          easy: sp.rarity <= EASY_RARITY,
          why: `Din ${sp.name} bär ${st.partnerJunk} passiv${st.partnerJunk > 1 ? "er" : ""} `
            + `du inte vill ha – de hamnar i poolen varje gång.`,
        });
      }
    }
  }

  // Blockerande först, sedan störst besparing. Lättfångade före sällsynta vid
  // ungefär samma vinst – en genväg som kräver en legendar är ingen genväg.
  return out
    .sort((a, b) =>
      Number(b.blocking) - Number(a.blocking)
      || Number(b.easy) - Number(a.easy)
      || b.saves - a.saves)
    .slice(0, limit);
}
