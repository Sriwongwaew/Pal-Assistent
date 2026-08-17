"use client";

/* Smart-ish: bandet under sidrubriken som säger "du har fått den".
 *
 * Det bor i layouten och inte i avelsvyn med flit: live-läget läser om saven
 * medan man spelar, och då står man oftast på Översikten eller Boxen – inte på
 * planeraren. Målbilden kommer ur samma `pa-breeding` som planeraren sparar, så
 * beskedet följer med överallt.
 *
 * Vad som är UI-logik här och vad som bor i lib: matchningen, fruktmatten och
 * vad som räknas som "nytt" ligger i `goalWatch.ts` och `ivFruits.ts`. Det som
 * är kvar här är läsningen ur localStorage (som måste ske i en effekt, annars
 * skiljer sig serverns HTML från klientens) och att skriva tillbaka vad vi sett.
 */

import { useEffect, useMemo, useState } from "react";
import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import { BREEDING_PREFS_KEY, parseBreedingPrefs } from "@/lib/breedingPrefs";
import {
  markSeen, parseSeen, SEEN_KEY, serializeSeen, watchGoal, type SeenState,
} from "@/lib/goalWatch";
import { FRUIT_NAMES } from "@/lib/ivFruits";
import { IV_LABELS } from "@/lib/ivPlan";
import { palLocation } from "./PalIdent";
import { DeckNo, ElementIcons, SpeciesIcon } from "./PalBits";
import { PassiveChips } from "./PassiveRow";
import { elementColor } from "./PalHero";

export function GoalWatch() {
  const { data, pals } = usePalData();
  const t = useT();
  const rich = useRichT();
  const [seen, setSeen] = useState<SeenState | null>(null);

  // Läs en gång, efter montering: localStorage finns inte på servern.
  useEffect(() => {
    setSeen(parseSeen(window.localStorage.getItem(SEEN_KEY)));
  }, []);

  /** Målbilden ur planerarens sparade val, validerad mot den aktuella datan. */
  const prefs = useMemo(() => {
    if (typeof window === "undefined") return null;
    return parseBreedingPrefs(window.localStorage.getItem(BREEDING_PREFS_KEY), data);
  }, [data]);

  /* Vilka pals är nya sedan förra inläsningen? Räknas ur det tillstånd som lästes
     vid montering – inte ur det vi skriver tillbaka nedan, annars vore listan
     alltid tom. */
  const watch = useMemo(() => {
    if (!seen || !prefs) return { hits: [], more: 0 };
    if (!seen.seeded) return { hits: [], more: 0 };
    const known = new Set(seen.ids);
    const fresh = new Set(pals.filter((p) => !known.has(p.id)).map((p) => p.id));
    return watchGoal(
      pals, fresh, prefs.target, prefs.wanted, prefs.ivGoal, new Set(seen.dismissed),
    );
  }, [seen, prefs, pals]);

  /* Skriv tillbaka: allt vi ser nu är sett. Sker efter att `watch` räknats ut
     ovan (samma render), så beskedet hinner visas innan palen blir "gammal" –
     och står kvar till man byter sida eller klickar bort det. */
  useEffect(() => {
    if (!seen || !pals.length) return;
    const next = markSeen(seen, pals);
    if (next.ids.length === seen.ids.length && seen.seeded) return;
    window.localStorage.setItem(SEEN_KEY, serializeSeen(next));
  }, [seen, pals]);

  const dismiss = (id: string) => {
    setSeen((s) => {
      const cur = s ?? parseSeen(null);
      const next: SeenState = {
        ...cur, seeded: true, dismissed: [...cur.dismissed, id],
      };
      window.localStorage.setItem(SEEN_KEY, serializeSeen(next));
      return next;
    });
  };

  if (!watch.hits.length) return null;
  const sp = (i: number) => data.species[i]!;
  const pName = (id: string) => data.passives[id]?.n ?? id;
  const pTier = (id: string) => data.passives[id]?.r ?? 0;

  return (
    <div className="gwrap">
      {watch.hits.map(({ pal, fruits, fruitTotal, done }) => (
        <div
          key={pal.id}
          className={`gwatch${done ? " done" : ""}`}
          style={{ ["--elc" as string]: elementColor(sp(pal.s)) }}
        >
          <span className="gicon"><SpeciesIcon sp={sp(pal.s)} size={44} radius={22} /></span>
          <div className="gbody">
            <div className="ghd">
              <b>{done ? t("watch.got") : t("watch.nearly")}</b>{" "}
              {sp(pal.s).name} {pal.g === "M" ? "♂" : "♀"}
              <span className="meta">
                <DeckNo sp={sp(pal.s)} /> · <ElementIcons sp={sp(pal.s)} size={14} /> ·
                IV <b className="num">{pal.iv.join("/")}</b> · {t.msg(palLocation(pal))}
              </span>
            </div>
            {pal.pv.length > 0 && (
              <PassiveChips ids={pal.pv} nameOf={pName} tierOf={pTier} />
            )}
            <div className="gsay">
              {done
                ? <>
                  {t("watch.doneBody")}
                  {/* Är IV-målet "snabbt" är palen klar – men saknar den 100:or
                      är frukterna ändå det billigaste sättet att göra den
                      perfekt, och det ska stå här och inte bara i planen. */}
                  {fruitTotal > 0 && " "}
                  {fruitTotal > 0 && rich("watch.doneFruits", {
                    n: <b className="num">{fruitTotal}</b>,
                    list: (
                      <b>
                        {fruits
                          .map((f) => `${f.count}× ${FRUIT_NAMES[f.stat] ?? IV_LABELS[f.stat]}`)
                          .join(", ")}
                      </b>
                    ),
                  })}
                </>
                /* Frukterna är hela beskedet i "nästan"-fallet: 2× Power Fruit
                   är en handling, "62 % av målet" är det inte. */
                : rich("watch.fruitBody", {
                  n: <b className="num">{fruitTotal}</b>,
                  list: (
                    <b>
                      {fruits
                        .map((f) => `${f.count}× ${FRUIT_NAMES[f.stat] ?? IV_LABELS[f.stat]}`)
                        .join(", ")}
                    </b>
                  ),
                })}
            </div>
          </div>
          <button
            type="button"
            className="gclose"
            onClick={() => dismiss(pal.id)}
            aria-label={t("watch.dismiss")}
          >
            ✕
          </button>
        </div>
      ))}
      {watch.more > 0 && (
        <div className="gmore">{t("watch.more", { n: watch.more })}</div>
      )}
    </div>
  );
}
