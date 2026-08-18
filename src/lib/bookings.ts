/** Vilka individer är **bokade** av den aktiva avelsplanen?
 *
 * Appen hade två halvor som inte visste om varandra. Planeraren pekade ut pals
 * du ska använda – bärare, kedjepartners, IV-donatorer – och Rollerna listade
 * samma individer som kondensmat. Mätt mot Kens box (aug 2026, helhetsutredningen):
 * **sex av elva** pals planen behövde låg i matlistorna, och en av dem i en kö med
 * domen *"nu"*. En av dem, `Skutlass 31/100/11`, stod som **steg 1 i planen på
 * skärmen**.
 *
 * Det är inte ett tunt råd, det är två råd som utesluter varandra – och det enda
 * felet i appen som kan förstöra något oåterkalleligt: en bortmatad pal kommer
 * inte tillbaka.
 *
 * Den här filen är därför inte en ny regel utan **en översättning**: den bygger om
 * samma planer gränssnittet visar och returnerar vilka pal-id de rör, med rollen
 * de har. Kondenseringen läser den och lämnar dem i fred; spara-listan visar dem
 * som en egen grupp med skälet skrivet.
 *
 * Tre saker att inte ändra tillbaka:
 *
 * 1. **Rollen följer med, inte bara id:t.** "Bokad" utan skäl är en spärr man
 *    misstänker; *"planen använder den som IV-donator i steg 1"* är ett skäl man
 *    accepterar. Samma disciplin som resten av appen: aldrig bara *vad*, alltid
 *    *varför*.
 * 2. **Målbilden kommer ur de sparade valen** (`pa-breeding`), samma källa som
 *    planeraren och `goalWatch` läser. Inget mål = inga bokningar, och då beter
 *    sig kondenseringen exakt som förut.
 * 3. **Bokningen sparar inget till disk.** Den räknas om ur boxen varje gång,
 *    för planen ändras när saven ändras. En sparad lista hade blivit fel i tysthet.
 */

import { buildPassivePlan } from "./passivePlan";
import { planIvImports } from "./ivImport";
import { ivTargetOf } from "./ivPlan";
import { planPerfectLine } from "./perfectPlan";
import type { BreedingPrefs } from "./breedingPrefs";
import type { AppData, ScoredPal } from "./types";

/** Vad planen använder individen till. Ordnad efter hur illa det vore att mata den. */
export type BookingRole =
  /** Bär en önskad passiv som planen hämtar ur just den. */
  | "carrier"
  /** Bär en 100:a som planen bär in i målarten. */
  | "donor"
  /** Förälder i ett IV-steg inne i målarten. */
  | "parent"
  /** Partner i ett artsteg – passivplanens fas 2 eller en importkedja. */
  | "partner";

export interface Booking {
  role: BookingRole;
  /** 1-baserat steg i den led gränssnittet visar, när det går att peka ut. */
  step?: number;
}

/** Så illa vore det att mata palen – högst vinner när flera roller krockar. */
const WEIGHT: Record<BookingRole, number> = { carrier: 4, donor: 3, parent: 2, partner: 1 };

/**
 * Individer den aktiva planen räknar med, per pal-id.
 *
 * `prefs` är de sparade valen; utan målart returneras en tom karta. Funktionen
 * bygger om båda planerna (passiv + perfekt IV inklusive importer) eftersom det
 * är exakt de individerna gränssnittet lovar att man ska använda.
 */
export function planBookings(
  data: AppData,
  pals: ScoredPal[],
  ownedSpecies: ReadonlySet<number>,
  prefs: Pick<BreedingPrefs, "target" | "wanted" | "ivGoal">,
): Map<string, Booking> {
  const out = new Map<string, Booking>();
  const { target } = prefs;
  if (target === null) return out;

  const add = (pal: ScoredPal | null | undefined, role: BookingRole, step?: number) => {
    if (!pal) return;
    const cur = out.get(pal.id);
    // Flera roller kan peka på samma individ: behåll den tyngsta.
    if (cur && WEIGHT[cur.role] >= WEIGHT[role]) return;
    out.set(pal.id, { role, step });
  };

  if (prefs.wanted.length) {
    const plan = buildPassivePlan(data, pals, ownedSpecies, prefs.wanted, target);
    for (const p of plan.carriersUsed) add(p, "carrier");
    plan.speciesPhase?.forEach((st, i) => add(st.partner, "partner", i + 1));
  }

  /* IV-leden bokar sina egna: importdonatorer och deras partners, och de ägda
     exemplar som står som föräldrar i etappstegen. Bara i tröskellägena – i
     "snabbt" läge finns ingen IV-led att boka för. */
  const ivTarget = ivTargetOf(prefs.ivGoal);
  if (ivTarget > 0) {
    const mine = pals.filter((p) => p.s === target);
    const imports = planIvImports(
      data, pals, ownedSpecies, target, [0, 1, 2], prefs.wanted, ivTarget,
    );
    const perfect = planPerfectLine(mine, prefs.wanted, imports, ivTarget);
    let row = 0;
    for (const im of perfect.imports) {
      add(im.donor, "donor", row + 1);
      im.steps.forEach((st) => { row++; add(st.partner, "partner", row); });
    }
    perfect.steps.forEach((st, i) => {
      for (const side of [st.a, st.b]) add(side.pal, "parent", row + i + 1);
    });
  }

  return out;
}

/**
 * Samma sak, men över **alla** leder man har öppna (flikarna, aug 2026).
 *
 * Bokningen finns för att kondenseringen inte ska föreslå att man matar bort en
 * pal planen väntar på, och den logiken hade blivit tunnare i samma sekund som
 * flera leder gick att ha igång: pals som en led i bakgrunden behöver hade
 * legat i matlistan precis som före `bookings.ts` fanns. Rollen som väger
 * tyngst vinner, samma regel som inom en enskild plan.
 *
 * Leder utan mål kostar ingenting – `planBookings` går ur direkt – så priset är
 * de leder man faktiskt börjat på.
 */
export function planAllBookings(
  data: AppData,
  pals: ScoredPal[],
  ownedSpecies: ReadonlySet<number>,
  all: readonly Pick<BreedingPrefs, "target" | "wanted" | "ivGoal">[],
): Map<string, Booking> {
  const out = new Map<string, Booking>();
  for (const prefs of all) {
    for (const [id, b] of planBookings(data, pals, ownedSpecies, prefs)) {
      const cur = out.get(id);
      if (cur && WEIGHT[cur.role] >= WEIGHT[b.role]) continue;
      out.set(id, b);
    }
  }
  return out;
}
