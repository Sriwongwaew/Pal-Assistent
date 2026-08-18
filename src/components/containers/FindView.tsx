"use client";

/* Smart: Hitta – Hjältebandet (designrundan aug 2026, valt av Ken ur fem
   upplägg på samma kartotek-idé: sök en gång → bläddra träffarna → detaljen
   svarar direkt, utan sidbyten).

   Formen är Boxens och Översiktens: ett hero-band överst bär den valda
   träffen (tonat av elementfärgen via --elc), sökfältet med kategorichips
   under, och träffarna som en brickremsa längst ner. ↑/↓ byter träff, Tab
   byter kategori, Enter öppnar primärlänken – heron uppdateras för varje
   tryck utan att layouten hoppar. Två lärdomar från tidigare rundor bor kvar
   här: kategorierna står alltid i SAMMA ordning med träffräknare (Kens
   rättning "känns väldigt slumpmässigt"), och vänstermeny-upplägget från
   designrunda 1 underkändes – räknarna är chips vid sökfältet.

   **Auditen aug 2026 (Kens fråga: "vad har vi missat?") byggde ut sidan.**
   Utgångspunkten var ranchen – 16 av 28 arter saknade vara – men luckan var
   generell: repot bar data som inte gick att fråga efter. Fyra saker ändrades
   i grunden, och ingen av dem är kosmetisk:

   1. **Varan är EN kategori, inte fem.** `find.items` slår ihop pal-drops,
      ranchen, brytningen, expeditionerna, handlarpriserna och raidbytet till
      ett svar per vara (`itemIndex`). Ranchvarorna var tidigare en egen
      kategori, vilket betydde att "Wool" gav två chips med olika räknare –
      samma "listor i listor" som Rollerna underkändes för. Ranchen är en
      KÄLLA till en vara, inte en egen fråga.
   2. **Räknarna räknar det som FINNS**, inte det vi råkar visa. Förr skars
      träffarna till 12 innan `counts` räknades, så chipet sa "12" när
      åttio matchade – en sökning på "Schematic 4" ljög rakt ut. Nu bär
      `hits` hela mängden, chipet visar den, och `limit` + "visa fler" styr
      vad som ritas.
   3. **Partnerskills syns.** 298 arter har spelets egen skill-text i repot och
      bara Rollerna läste den; artheron visar den nu, och `find.skills` gör den
      sökbar ("night vision", "mount", "Gold Coin").
   4. **Kartan går att fråga.** `placeIndex` gör snabbresor, dungeons, läger,
      malmnoder och fruktträd sökbara – "var bryter jag svavel?" hade inget
      svar fast 83 noder låg i `worldmap.json`.

   Kategorierna är frågorna folk faktiskt ställer: arter, element, varor,
   passiver, partnerskills, schematics, platser, expeditioner, raider, fiske –
   plus **avelskombon**, som bara dyker upp när frågan verkligen ÄR ett par
   ("Anubis x Lamball"). Ett chip som alltid står där med noll träffar är
   klutter; ett som bara finns när det har ett svar är en genväg.

   Svaren är personliga – Finds trumfkort mot paldb/wikin: ÄGD/AVLAS/FÅNGA ur
   boxen, ✓ på alfabossar och raider ur saven, bärare och implantat, din bästa
   motpal, om expeditionen är upplåst och om boxen räcker till den.
   Drops- och schematics-tabellerna är extraherade/kurerade 1.0-data
   (findData.ts) – handlarnas sortiment är det som fortfarande saknas. */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n";
import { planAllBookings, type Booking } from "@/lib/bookings";
import { childrenOf, isReachable } from "@/lib/breeding";
import { allPrefs, BREEDING_PREFS_KEY, parseBreedingBook } from "@/lib/breedingPrefs";
import { buildUseIndex, condenseGain, planCondense } from "@/lib/condense";
import { idleSquad } from "@/lib/expedition";
import { ownedImplants } from "@/lib/implants";
import {
  schematicsMatching, LEGENDARY_SCHEMATICS, type Schematic,
} from "@/lib/findData";
import {
  expedMatching, hasSource, itemIndex, itemsMatching, parentPairsOf, parseCombo,
  placeGaps, placeIndex, placesMatching, raidsMatching, ruinSchematics, schemWhere,
  skillIndex, skillsMatching,
  type ItemEntry, type Place, type SkillRow,
} from "@/lib/findIndex";
import { partnerSkill } from "@/lib/partnerSkills";
import { RAIDS, type RaidInfo } from "@/lib/questsData";
import type { ExpeditionSite } from "@/lib/expedition";
import { catchInfo, foundSets, igCoord, TREE_MAP, WORLD_MAP, type GameMapId } from "@/lib/worldmap";
import {
  ELEMENT_GAME_NAME, ELEMENT_ICON, FISHING_PALS, ranchItemsOf,
  WORK_META, WORK_TYPES,
} from "@/lib/constants";
import { WEAK_TO } from "@/lib/quests";
import { passiveText, tierLabel } from "@/lib/passiveText";
import type { ElementType, PassiveDef, ScoredPal, Species, WorkType } from "@/lib/types";
import { itemIconSlug, schematicIconSlug } from "@/lib/itemIcons";
import { hasItemInfo } from "@/lib/itemInfo";
import { GameIcon, ItemIcon } from "@/components/ui/GameIcon";
import { WorkIcon } from "@/components/ui/WorkIcon";
import { ElementIcons, Section, SpeciesIcon, Tag } from "@/components/ui/PalBits";
import { palLocation } from "@/components/ui/PalIdent";
import { PassiveRow } from "@/components/ui/PassiveRow";
import { elementColor } from "@/components/ui/PalHero";
import {
  ComboHero, ExpedHero, Fact, ItemHero, PlaceHero, RaidHero, SkillHero, SpeciesCondense,
} from "@/components/ui/FindBits";

/** Kategorierna i sidans fasta ordning – första med träffar blir vald.
 *  `combos` står först med flit: har frågan tolkats som ett par är paret
 *  svaret, och då ska heron visa det utan att man byter chip.
 *
 *  **Element är INGEN kategori** (Kens beslut aug 2026: "det känns inte som vi
 *  får value av detta"). Nio brickor som säger Fire/Water/Grass är en meny över
 *  något man kan utantill efter en vecka – varje annan kategori bär ett tal per
 *  rad. Elementen är fortfarande sökbara: art-sökningen matchar både datasetets
 *  namn (Leaf/Earth) och spelets (Grass/Ground), så "fire" ger arterna direkt,
 *  och styrka/svaghet plus bästa egna motpal står i ARTENS hero där frågan
 *  faktiskt ställs. Bygg inte tillbaka den som egen kategori. */
type FindCat =
  | "combos" | "species" | "items" | "passives" | "skills"
  | "schem" | "places" | "exped" | "raids" | "fishing";
const CATS: [FindCat, MessageKey][] = [
  ["combos", "find.combos"],
  ["species", "find.species"],
  ["items", "find.items"],
  ["passives", "find.passives"],
  ["skills", "find.skills"],
  ["schem", "find.schem"],
  ["places", "find.places"],
  ["exped", "find.exped"],
  ["raids", "find.raids"],
  ["fishing", "find.fishing"],
];

/** Hur många brickor som ritas innan "visa fler". Träffräknaren visar alltid
 *  hela mängden – taket styr ritningen, aldrig sanningen. */
const PAGE = 24;

export function FindView() {
  const { data, pals, ownedSpecies, bestOf, freeSolve } = usePalData();
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  /* Valet är kategori + index i den kategorins träffar. null = första
     kategorin med träffar – det som håller heron levande i alla lägen. */
  const [pick, setPick] = useState<{ cat: FindCat; idx: number } | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const stripRef = useRef<HTMLDivElement | null>(null);

  const q = query.trim().toLowerCase();

  /* ---- Uppslag som inte beror på sökningen ---- */
  const passiveCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pals) for (const id of p.pv) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [pals]);
  const spIdxByName = useMemo(
    () => new Map(data.species.map((sp, i) => [sp.name, i] as const)),
    [data],
  );
  const spIdxByCode = useMemo(
    () => new Map(data.species.map((sp, i) => [sp.code.toLowerCase(), i] as const)),
    [data],
  );
  /* Alfaboss-spawns per artkod – artheron visar var arten står som boss,
     och saven svarar på om den redan är nedlagd. BÅDA kartorna: sex av
     Världsträdets sju alfor finns ingen annanstans, och stod utan plats här
     så länge bara huvudkartan lästes. Kartan följer med spawnen – en koordinat
     utan karta pekar ut fel ställe när det finns två. */
  const alphasByCode = useMemo(() => {
    const m = new Map<string, (typeof WORLD_MAP.alphas[number] & { map: GameMapId })[]>();
    const all = [
      ...WORLD_MAP.alphas.map((a) => ({ ...a, map: "main" as const })),
      ...TREE_MAP.alphas.map((a) => ({ ...a, map: "tree" as const })),
    ];
    for (const a of all) {
      const k = a.sp.toLowerCase();
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return m;
  }, []);
  const found = useMemo(() => foundSets(data.progress), [data.progress]);

  /* Kondenseringsrådet per art (aug 2026). SAMMA modell som Rollernas kö kör –
     `planCondense` räknar en plan per ägd art och kön visar bara toppen av den.
     Bokningarna läses ur planerarens sparade val precis som i RecoView – alla
     flikar, inte bara den framme – och i en effekt eftersom localStorage inte
     finns på servern: utan dem kan Hitta föreslå att man matar bort en pal den
     egna avelsplanen står och väntar på. */
  const useIndex = useMemo(() => buildUseIndex(data, pals), [data, pals]);
  const [booked, setBooked] = useState<ReadonlyMap<string, Booking>>(new Map());
  useEffect(() => {
    const book = parseBreedingBook(window.localStorage.getItem(BREEDING_PREFS_KEY), data);
    setBooked(planAllBookings(data, pals, ownedSpecies, allPrefs(book)));
  }, [data, pals, ownedSpecies]);
  const condensePlans = useMemo(
    () => new Map(planCondense(data, pals, bestOf, { booked, useIndex }).map((p) => [p.s, p] as const)),
    [data, pals, bestOf, booked, useIndex],
  );
  /** Artens kondenseringsläge: planen om den finns, annars skälet att den inte gör det. */
  const condenseFor = (i: number) => {
    const plan = condensePlans.get(i) ?? null;
    const all = pals.filter((p) => p.s === i);
    return {
      plan,
      gain: plan ? condenseGain(data, plan) : null,
      kept: all.filter((p) => p.keep).length,
      booked: all.filter((p) => !p.keep && booked.has(p.id)).length,
    };
  };
  const implants = ownedImplants(data) ?? {};
  /* Katalogerna byggs en gång: de läser bara tabeller i repot. */
  const allItems = useMemo(() => itemIndex().filter(hasSource), []);
  const allPlaces = useMemo(() => placeIndex(), []);
  const gaps = useMemo(() => placeGaps(), []);
  const allSkills = useMemo(() => skillIndex(data), [data]);
  /* Kurerade + härledda schematics. Ruinernas rader kommer ur kartdatat och är
     inte skrivna för hand – se `ruinSchematics`. Utan dem saknades 71 rader,
     alla legendariska tillbehör, för att deras blueprint heter "… Schematic"
     utan sifferändelse och den förra granskningen sökte på "Schematic 4". */
  const allSchem = useMemo(
    () => [...LEGENDARY_SCHEMATICS, ...ruinSchematics()],
    [],
  );
  /** Vad arten släpper – varuindexet vänt åt andra hållet. */
  const dropsBySpecies = useMemo(() => {
    const m = new Map<string, { item: string; q: string | null }[]>();
    for (const e of allItems) for (const p of e.drops)
      m.set(p.n, [...(m.get(p.n) ?? []), { item: e.item, q: p.q }]);
    return m;
  }, [allItems]);
  const schemBySpecies = useMemo(() => {
    const m = new Map<string, Schematic[]>();
    for (const s of LEGENDARY_SCHEMATICS) m.set(s.source, [...(m.get(s.source) ?? []), s]);
    return m;
  }, []);
  const fishingByName = useMemo(() => new Map(FISHING_PALS.map(([n, d]) => [n, d] as const)), []);
  /** Boxens starkaste per element (strid) – "din bästa motpal". */
  const bestByElement = useMemo(() => {
    const m = new Map<ElementType, ScoredPal>();
    for (const p of pals) {
      const sp = data.species[p.s];
      if (!sp) continue;
      for (const el of sp.elements) {
        const cur = m.get(el);
        if (!cur || p.combat > cur.combat) m.set(el, p);
      }
    }
    return m;
  }, [pals, data]);
  /* Expeditionsheron svarar på "räcker min box?" – samma ≈FP som Rollerna. */
  const squad = useMemo(() => (pals.length > 0 ? idleSquad(data, pals) : null), [data, pals]);

  /* ---- Träffarna per kategori. Hela mängden, aldrig skuren: räknarna på
     chipsen läser längden, och ett tak här hade fått dem att ljuga. ---- */
  const hits = useMemo(() => {
    const passivesByTier = () => Object.entries(data.passives)
      .filter(([, def]) => def.r >= 4)
      .sort((a, b) => b[1].r - a[1].r || a[1].n.localeCompare(b[1].n));

    /* Tomt fält är inte en tom sida (Kens modell "sök + översikt"):
       varorna, de legendariska passiverna, partnerskills,
       schematics, platserna, expeditionerna, raiderna och fisket är
       bläddringsbara – arterna är trehundra och kräver en fråga. */
    if (!q) {
      return {
        combos: [] as { a: number; b: number }[],
        species: [] as { sp: Species; i: number; work?: readonly [WorkType, number] }[],
        items: allItems,
        passives: passivesByTier(),
        skills: allSkills,
        schem: allSchem,
        places: allPlaces,
        exped: expedMatching(""),
        raids: RAIDS,
        fishing: FISHING_PALS,
      };
    }
    /* Arterna rankas på relevans i stället för datasetordning: exakt namn →
       namnbörjan → namndel → element → syssla. "Mining" är paldb:s mest
       använda flöde (Kens rättning: pal-sökningen behövde fler vägar in) –
       sysselträffar sorteras på arbetsnivå, bäst först, och brickan visar
       nivån i stället för Paldeck-numret. */
    const workHit = WORK_TYPES.find((w) =>
      (WORK_META[w]?.label ?? "").toLowerCase().includes(q));
    const scored: { sp: Species; i: number; rel: number; work?: readonly [WorkType, number] }[] = [];
    data.species.forEach((sp, i) => {
      if (sp.name.startsWith("Unidentified")) return;
      const name = sp.name.toLowerCase();
      if (name === q || (sp.deck > 0 && String(sp.deck) === q)) { scored.push({ sp, i, rel: 0 }); return; }
      if (name.startsWith(q)) { scored.push({ sp, i, rel: 1 }); return; }
      if (name.includes(q)) { scored.push({ sp, i, rel: 2 }); return; }
      /* Både datasetets elementnamn (Leaf/Earth/…) och spelets
         (Grass/Ground/…) – man söker på det spelet visar. */
      if (sp.elements.some((e) =>
        e.toLowerCase().includes(q) || ELEMENT_GAME_NAME[e].toLowerCase().includes(q))) {
        scored.push({ sp, i, rel: 3 });
        return;
      }
      const lv = workHit ? sp.ws[workHit] ?? 0 : 0;
      if (workHit && lv > 0) scored.push({ sp, i, rel: 4, work: [workHit, lv] as const });
    });
    scored.sort((a, b) =>
      a.rel - b.rel
      || (b.work?.[1] ?? 0) - (a.work?.[1] ?? 0)
      || a.sp.name.localeCompare(b.sp.name));

    const combo = parseCombo(data, query.trim());
    return {
      combos: combo ? [combo] : [],
      species: scored,
      items: itemsMatching(allItems, q),
      /* Passiverna söks på namn OCH på vad de gör: "attack", "work speed" och
         "stamina" gav förr noll träffar fast beskrivningen står i repot
         (`passiveText`) och effekten i `fx`. Namnträffar först. */
      passives: Object.entries(data.passives)
        .map(([id, def]) => {
          const name = def.n.toLowerCase().includes(q);
          const body = !name && (passiveText(id, def, t.locale).text ?? "").toLowerCase().includes(q);
          return { id, def, rel: name ? 0 : 1, hit: name || body };
        })
        .filter((r) => r.hit)
        .sort((a, b) => a.rel - b.rel || b.def.r - a.def.r || a.def.n.localeCompare(b.def.n))
        .map((r) => [r.id, r.def] as [string, PassiveDef]),
      skills: skillsMatching(allSkills, q),
      schem: schematicsMatching(allSchem, q),
      places: placesMatching(allPlaces, q),
      exped: expedMatching(q),
      raids: raidsMatching(q),
      fishing: FISHING_PALS
        .filter(([name]) => name.toLowerCase().includes(q) || "fishing".includes(q) || "fiske".includes(q)),
    };
  }, [q, query, data, allItems, allPlaces, allSkills, allSchem, t.locale]);

  const counts: Record<FindCat, number> = {
    combos: hits.combos.length,
    species: hits.species.length,
    items: hits.items.length,
    passives: hits.passives.length,
    skills: hits.skills.length,
    schem: hits.schem.length,
    places: hits.places.length,
    exped: hits.exped.length,
    raids: hits.raids.length,
    fishing: hits.fishing.length,
  };
  const availableCats = CATS.map(([c]) => c).filter((c) => counts[c] > 0);

  /* Sparade val är alltid gamla: en ny sökning gör indexet meningslöst. */
  const setQueryAndReset = (v: string) => { setQuery(v); setPick(null); };

  const activeCat: FindCat | null =
    pick && counts[pick.cat] > 0 ? pick.cat : (availableCats[0] ?? null);
  const activeIdx =
    pick && activeCat === pick.cat && activeCat ? Math.min(pick.idx, counts[activeCat] - 1) : 0;
  const total = activeCat ? counts[activeCat] : 0;

  /* Taket nollas när frågan eller kategorin byts – annars ligger ett uppfällt
     "visa fler" kvar och nästa sökning ser ut att ha hundra träffar. */
  useEffect(() => { setLimit(PAGE); }, [q, activeCat]);
  /* ↑/↓ ska kunna gå genom ALLA träffar, inte bara de ritade: navigerar man
     förbi taket fälls nästa sida upp av sig själv. */
  useEffect(() => {
    if (activeIdx >= limit) setLimit(Math.ceil((activeIdx + 1) / PAGE) * PAGE);
  }, [activeIdx, limit]);

  /* Svaret ligger OVANFÖR sökpanelen, och brickorna nedanför den. Klickar man
     en bricka när sidan rullat ner ändras alltså en yta som ligger utanför bild
     – för användaren "händer ingenting" (Kens rättning aug 2026, elementbrickan
     Ice). Undantaget från regeln nedan är därför just det här: när användaren
     VALT något ska valets svar synas.
     `nearest` gör ingenting när heron redan är i bild, så den rycker inte i
     sidan medan man bläddrar; `pick` är null tills man faktiskt väljer, så
     första renderingen och varje ny sökning rullar aldrig. */
  useEffect(() => {
    if (!pick) return;
    document.querySelector(".fhero")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pick]);

  /* Den valda brickan ska synas – remsans egen scrollLeft, aldrig sidans
     (samma läxa som PalPicker: rulla aldrig hela sidan åt användaren). */
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const tile = strip.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    if (!tile) return;
    const c = strip.getBoundingClientRect();
    const r = tile.getBoundingClientRect();
    if (r.left < c.left) strip.scrollLeft += r.left - c.left - 8;
    else if (r.right > c.right) strip.scrollLeft += r.right - c.right + 8;
    /* Passiv-rutnätet rullar i höjdled i stället för sidled. */
    if (r.top < c.top) strip.scrollTop += r.top - c.top - 8;
    else if (r.bottom > c.bottom) strip.scrollTop += r.bottom - c.bottom + 8;
  }, [activeCat, activeIdx, q]);

  /* "FÅNGA" ensamt lovade en vild spawn som inte finns för legendarer och
     raid-arter – taggen säger HUR (alfaboss/raid-ägg), se catchInfo. */
  const ownStatus = (i: number) => {
    if (ownedSpecies.has(i)) return <Tag kind="keep">{t("best.own.owned")}</Tag>;
    if (!isReachable(freeSolve.cost, i)) {
      const how = catchInfo(data.species[i]!.code);
      if (how?.kind === "raid") return <Tag kind="cond">{t("best.own.catchRaid")}</Tag>;
      if (how?.kind === "alpha") return <Tag kind="cond">{t("best.own.catchAlpha", { lv: how.lv })}</Tag>;
      return <Tag kind="cond">{t("best.own.catch")}</Tag>;
    }
    return <Tag kind="lucky">{t("best.own.breedShort", { n: freeSolve.cost[i] ?? 0 })}</Tag>;
  };

  /** Chip-lista av arter: ägda bockas, klick ställer frågan om arten.
      `u` = lägre proveniens (utfyllnadskällan/boss-skalade mängder) – ritas ≈. */
  const speciesChips = (names: { n: string; q?: string | null; u?: boolean }[]) => (
    <span className="dpals">
      {names.map((p) => {
        const i = spIdxByName.get(p.n);
        const owned = i !== undefined && ownedSpecies.has(i);
        const sp = i !== undefined ? data.species[i] : undefined;
        return (
          <button
            key={p.n}
            type="button"
            className={`fchip fsp ${owned ? "on" : ""}`}
            onClick={() => setQueryAndReset(p.n)}
          >
            {sp && <SpeciesIcon sp={sp} size={18} radius={9} />}
            {owned ? "✓ " : ""}{p.u ? "≈ " : ""}{p.n}{p.q ? ` ${p.q}` : ""}
          </button>
        );
      })}
    </span>
  );

  /** Källtaggen per schematic – chansen/priset står i taggen. */
  const schemTag = (s: Schematic) => {
    const key = s.kind === "tower" ? "find.schemTower"
      : s.kind === "alpha" ? "find.schemAlpha"
      : s.kind === "raid" ? "find.schemRaid"
      : s.kind === "vendor" ? "find.schemVendor"
      : s.kind === "ruin" ? "find.schemRuin"
      : "find.schemChest";
    const kindTag: Record<Schematic["kind"], "info" | "lucky" | "cond"> =
      { tower: "info", alpha: "lucky", raid: "cond", vendor: "info", chest: "info", ruin: "lucky" };
    return (
      <>
        <Tag kind={kindTag[s.kind]}>{t(key)}{s.rate ? ` · ${s.rate}` : ""}</Tag>
        {!s.sure && <Tag kind="cond">{t("find.schemUnsure")}</Tag>}
      </>
    );
  };

  /** Primärlänken per kategori – det Enter öppnar. */
  const primaryHref = (): string | null => {
    if (!activeCat) return null;
    switch (activeCat) {
      case "species": {
        const h = hits.species[activeIdx];
        return h ? `/breeding?target=${h.i}` : null;
      }
      case "fishing": {
        const h = hits.fishing[activeIdx];
        const i = h ? spIdxByName.get(h[0]) : undefined;
        return i !== undefined ? `/breeding?target=${i}` : null;
      }
      case "skills": {
        const h = hits.skills[activeIdx];
        return h ? `/breeding?target=${h.s}` : null;
      }
      case "combos": {
        const h = hits.combos[activeIdx];
        if (!h) return null;
        const child = childrenOf(data, h.a, h.b)[0];
        return child ? `/breeding?target=${child.c}` : null;
      }
      case "passives": {
        const h = hits.passives[activeIdx];
        return h ? `/breeding?wanted=${h[0]}` : null;
      }
      case "places": return "/map";
      case "exped": return "/recommendations#rh-box";
      case "raids": return "/quests";
      case "schem": return hits.schem[activeIdx]?.kind === "alpha" ? "/map" : "/quests";
      case "items": return null;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeCat) return;
    const n = counts[activeCat];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      /* ↑/↓ i stället för ←/→: pilarna i sidled flyttar textmarkören, och
         ett sökfält där markören inte går att flytta känns trasigt. */
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setPick({ cat: activeCat, idx: (activeIdx + step + n) % n });
    } else if (e.key === "Tab" && availableCats.length > 1) {
      e.preventDefault();
      const at = availableCats.indexOf(activeCat);
      const step = e.shiftKey ? -1 : 1;
      const next = availableCats[(at + step + availableCats.length) % availableCats.length]!;
      setPick({ cat: next, idx: 0 });
    } else if (e.key === "Enter") {
      const href = primaryHref();
      if (href) router.push(href);
    } else if (e.key === "Escape") {
      setQueryAndReset("");
    }
  };

  /* ============ Heron per kategori ============ */

  const heroSpecies = (sp: Species, i: number) => {
    const alpha = (alphasByCode.get(sp.code.toLowerCase()) ?? [])[0];
    const drops = dropsBySpecies.get(sp.name) ?? [];
    const schems = schemBySpecies.get(sp.name) ?? [];
    const ranch = ranchItemsOf(sp.name);
    const fishDesc = fishingByName.get(sp.name);
    const ps = partnerSkill(sp.code);
    const work = WORK_TYPES.map((w) => [w, sp.ws[w] ?? 0] as const)
      .filter(([, lv]) => lv > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const weak = [...new Set((sp.elements.length ? sp.elements : ["Normal" as const]).map((e) => WEAK_TO[e]))];
    /* Bästa egna motpalen över artens alla svagheter – starkast vinner. */
    const counter = weak
      .map((e) => bestByElement.get(e))
      .filter((p): p is ScoredPal => !!p)
      .sort((a, b) => b.combat - a.combat)[0];
    const counterSp = counter ? data.species[counter.s] : undefined;
    const ownCount = pals.reduce((n, p) => n + (p.s === i ? 1 : 0), 0);
    const condense = condenseFor(i);
    /* "Vilka blir X?" – frågan man ställer sig framför en art man inte äger.
       Sveper hela partabellen, ägda par först (se parentPairsOf). */
    const parents = parentPairsOf(data, i, ownedSpecies, 6);
    return (
      <div className="fhero" style={{ "--elc": elementColor(sp) } as CSSProperties}>
        <div className="fpor"><SpeciesIcon sp={sp} size={92} radius={20} /></div>
        <div className="fbody">
          <div className="fname">
            {sp.name}
            <ElementIcons sp={sp} size={19} />
            {sp.deck > 0 && <span className="meta">No.{sp.deck}</span>}
            {ownStatus(i)}
          </div>
          {/* Paldeck-texten låg i datan men ritades bara i detaljmodalen. Den
              är spelets egen och står kvar på engelska, som artnamnen. */}
          {sp.desc && <div className="fsub fdesc">{sp.desc}</div>}
          <div className="ffacts">
            <Fact k={t("find.hero.get")} wide>
              {ownCount > 0 && <span>{t.plural("find.hero.inBox", ownCount)}</span>}
              {alpha && (
                <span>
                  {t("find.alphaAt", {
                    lv: alpha.lv,
                    coord: igCoord(alpha.x, alpha.y)
                      + (alpha.map === "tree" ? `, ${t("map.name.tree")}` : ""),
                  })}{" "}
                  {found?.spawners.has(alpha.spawner)
                    ? <b className="fdone">{t("find.hero.alphaDone")}</b>
                    : <b className="ftodo">{t("find.hero.alphaTodo")}</b>}
                </span>
              )}
              {ownCount === 0 && isReachable(freeSolve.cost, i)
                && <span>{t("best.own.breedShort", { n: freeSolve.cost[i] ?? 0 })}</span>}
              {ownCount === 0 && !alpha && !isReachable(freeSolve.cost, i)
                && <span>{catchInfo(sp.code)?.kind === "raid" ? t("best.own.catchRaid") : t("best.own.catch")}</span>}
            </Fact>
            {/* Partnerskillen är svaret på "vad är den här palen bra för?", och
                den fanns i repot för 298 arter utan att Hitta läste den. */}
            {ps && (
              <Fact k={t("find.skills")} wide stack>
                <b className="fschem">{ps.skill}</b>
                <span className="fsrc">{ps.desc}</span>
              </Fact>
            )}
            {drops.length > 0 && (
              <Fact k={t("find.drops")} wide>
                {drops.slice(0, 4).map((d) => (
                  <button
                    key={d.item} type="button" className="fchip fsp" data-item={d.item}
                    onClick={() => setQueryAndReset(d.item)}
                  >
                    <ItemIcon slug={itemIconSlug(d.item)} size={18} />
                    {d.item}{d.q ? ` ${d.q}` : ""}
                  </button>
                ))}
              </Fact>
            )}
            {/* Flera varor per art är normalt (Shroomer, Dumud Gild) – en enda
                rad hade tappat den andra tyst. */}
            {ranch.length > 0 && (
              <Fact k={t("find.src.ranch")} wide>
                {ranch.map((r) => (
                  <button
                    key={r.item} type="button" className="fchip fsp" data-item={r.item}
                    onClick={() => setQueryAndReset(r.item)}
                  >
                    <ItemIcon slug={itemIconSlug(r.item)} size={18} />
                    {r.item}{r.side ? " ≈" : ""}
                  </button>
                ))}
              </Fact>
            )}
            {fishDesc && <Fact k={t("find.fishing")}>{t(fishDesc)}</Fact>}
            {work.length > 0 && (
              <Fact k={t("find.hero.work")}>
                {work.map(([w, lv]) => (
                  <span key={w} className="fws">
                    <WorkIcon type={w} size={16} /> {WORK_META[w]?.label} <b className="num">{lv}</b>
                  </span>
                ))}
              </Fact>
            )}
            {schems.map((s) => (
              <Fact key={`${s.name}|${s.source}`} k={t("find.schem")}>
                <span className="fschem" data-item={s.name}>{s.name}</span>
                {schemTag(s)}
              </Fact>
            ))}
            <Fact k={t("find.hero.weak")} wide>
              {weak.map((e) => (
                <span key={e} className="fws">
                  <GameIcon name={ELEMENT_ICON[e]} size={17} /> {ELEMENT_GAME_NAME[e]}
                </span>
              ))}
              {counterSp && (
                <span className="fws">
                  — {t("find.hero.yourBest")}{" "}
                  <button type="button" className="fchip fsp on" onClick={() => setQueryAndReset(counterSp.name)}>
                    <SpeciesIcon sp={counterSp} size={18} radius={9} />{counterSp.name}
                  </button>
                </span>
              )}
            </Fact>
            {/* Artens egna siffror låg i bundlen och ritades ingenstans: utan
                dem gick "snabbaste riddjuret" och "vem äter minst" inte att
                fråga. Scalings är artens, inte en individs – därför ≈. */}
            <Fact k={t("find.hero.body")} wide>
              <span className="fstat num">{t("find.hero.scaling", {
                hp: sp.sc[0], atk: sp.sc[1], def: sp.sc[2],
              })}</span>
              <span className="fstat num">{t("find.hero.sprint", { n: sp.spr })}</span>
              <span className="fstat num">{t("find.hero.food", { food: sp.food, stom: sp.stom })}</span>
              <span className="fstat num">{t("find.hero.gender", {
                m: Math.round(sp.gp * 100), f: Math.round((1 - sp.gp) * 100),
              })}</span>
              {sp.noct && <Tag kind="info">{t("find.hero.noct")}</Tag>}
            </Fact>
            {parents.total > 0 && (
              <Fact k={t("find.hero.parents", { n: parents.total })} wide>
                {parents.pairs.map((pair) => {
                  const a = data.species[pair.a];
                  const b = data.species[pair.b];
                  if (!a || !b) return null;
                  return (
                    <span key={`${pair.a}|${pair.b}`} className={`fpair${pair.owned ? " on" : ""}`}>
                      <SpeciesIcon sp={a} size={17} radius={8} />
                      {a.name} × {b.name}
                      <SpeciesIcon sp={b} size={17} radius={8} />
                    </span>
                  );
                })}
              </Fact>
            )}
          </div>
          {/* Kondenseringsrådet för just den här arten. Bara när man äger den –
              frågan "vilken av mina ska matas" finns inte annars. */}
          {ownCount > 0 && (
            <SpeciesCondense
              plan={condense.plan}
              gain={condense.gain}
              owned={ownCount}
              kept={condense.kept}
              booked={condense.booked}
              keeper={condense.plan && (
                <span className="fckeep" data-pal={condense.plan.keeper.id}>
                  <SpeciesIcon sp={sp} size={22} radius={7} tip={false} />
                  <b>{condense.plan.keeper.nick || sp.name}</b>
                  <span className="num">
                    {t("pal.lv", { n: condense.plan.keeper.lv })} · {condense.plan.keeper.iv.join("/")}
                  </span>
                  <span className="meta">{t.msg(palLocation(condense.plan.keeper))}</span>
                </span>
              )}
            />
          )}
        </div>
        <div className="flinks">
          <Link className="fchip" href={`/breeding?target=${i}`}>{t("find.linkBreed")}</Link>
          {alpha && <Link className="fchip" href="/map">{t("find.linkMap")}</Link>}
          {ownedSpecies.has(i) && <Link className="fchip" href="/box">{t("find.linkBox")}</Link>}
        </div>
      </div>
    );
  };

  /** Varuheron: alla kända källor på ett ställe. Ranchen är en KÄLLA här,
   *  inte en egen kategori – "Wool" ska ge ett svar, inte två chips. */
  const heroItem = (e: ItemEntry) => {
    const ownedN = e.drops.filter((p) => {
      const i = spIdxByName.get(p.n);
      return i !== undefined && ownedSpecies.has(i);
    }).length;
    return (
      <ItemHero
        entry={e}
        slug={itemIconSlug(e.item)}
        summary={e.drops.length > 0
          ? t("find.hero.dropSummary", { n: e.drops.length, owned: ownedN })
          : null}
        dropChips={speciesChips(e.drops)}
        ranchChips={speciesChips(e.ranch.map((r) => ({ n: r.sp, q: r.side ? "≈" : null })))}
        links={
          e.ranch.length > 0
            ? (
              <div className="flinks">
                <Link className="fchip" href="/recommendations#rh-base">{t("find.linkRanch")}</Link>
              </div>
            )
            : null
        }
      />
    );
  };

  const heroPassive = (id: string, def: PassiveDef) => {
    const { text } = passiveText(id, def, t.locale);
    /* Renaste bärarna först – varje extra passiv späder ut arvspoolen,
       så det är dem man vill para med (samma logik som compareParents). */
    const carrierNames = [...new Set(
      pals.filter((p) => p.pv.includes(id))
        .sort((a, b) => a.pv.length - b.pv.length)
        .map((p) => data.species[p.s]?.name)
        .filter((n): n is string => !!n),
    )].slice(0, 4);
    return (
      <div className="fhero">
        <div className="fbody">
          <div className="fname fpass">
            <PassiveRow id={id} name={def.n} tier={def.r} />
            <Tag kind="info">{t.msg(tierLabel(def.r))}</Tag>
            {implants[id] && <Tag kind="keep">{t("find.implantOwned")}</Tag>}
          </div>
          <div className="ffacts">
            {text && <Fact k={t("find.hero.does")} wide>{text}</Fact>}
            <Fact k={t("find.passives")} wide>
              {t("find.carriers", { n: passiveCounts.get(id) ?? 0 })}
              {carrierNames.length > 0 && speciesChips(carrierNames.map((n) => ({ n })))}
            </Fact>
            {/* Ett implantat gör sista avelssteget 3× billigare – att äga det
                är därför ett svar i sig, inte en detalj (se implants.ts). */}
            {implants[id] && <Fact k={t("find.implant")} wide>{t("find.implantBody")}</Fact>}
          </div>
        </div>
        <div className="flinks">
          <Link className="fchip" href={`/breeding?wanted=${id}`}>{t("find.linkWant")}</Link>
        </div>
      </div>
    );
  };

  /** Hur man faktiskt farmar den här sortens källa. En rad per sort, för
   *  "Snow enemy camp" sa inte vad man skulle GÖRA (Kens fynd aug 2026). */
  const howToFarm = (s: Schematic): MessageKey => {
    /* Vissa källor listar FLERA vägar in ("Astral Mountain camps / coastal
       bases"). Vi pekar ut den vi kan, men rådet måste säga att det finns fler
       – annars ser koordinaterna ut som hela svaret. Testet går på vår EGEN
       kurerade prosa, inte på speltext, så " / " är en säker markering. */
    if (s.source.includes(" / ")) return "find.how.mixed";
    if (s.kind === "alpha") return "find.how.alpha";
    if (s.kind === "tower") return "find.how.tower";
    if (s.kind === "raid") return "find.how.raid";
    if (s.kind === "vendor") return "find.how.vendor";
    if (s.kind === "ruin") return "find.how.ruin";
    switch (s.spot?.at) {
      case "camp": return "find.how.camp";
      case "oilrig": return "find.how.oilrig";
      case "map": return "find.how.map";
      case "dungeon": return "find.how.dungeon";
      default: return "find.how.chest";
    }
  };

  const heroSchem = (s: Schematic) => {
    const i = spIdxByName.get(s.source);
    const sp = i !== undefined ? data.species[i] : undefined;
    /* Prosan blir en plats: "Snow enemy camp" → tre koordinater i Astral
       Mountains. null = källan går inte att peka ut (vandrande handlare, en
       raidboss man kallar vid sitt eget altare). */
    const where = schemWhere(s.spot);
    /* Alfaraderna bär sin koordinat i tabellen, men ett par saknar den. Finns
       arten som alfa i kartdatat är svaret redan i repot – slå upp det i stället
       för att visa en tom rad (och samma uppslag täcker nya rader automatiskt). */
    const alphaAt = s.kind === "alpha" && !s.coord && sp ? catchInfo(sp.code) : null;
    const coord = s.coord ?? (alphaAt?.kind === "alpha" ? [alphaAt.x, alphaAt.y] as const : null);
    return (
      <div className="fhero" style={sp ? { "--elc": elementColor(sp) } as CSSProperties : undefined}>
        {sp && <div className="fpor"><SpeciesIcon sp={sp} size={92} radius={20} /></div>}
        <div className="fbody">
          <div className="fname">
            <ItemIcon slug={schematicIconSlug(s.name)} size={26} />
            <span data-item={s.name}>{s.name}</span>
            {schemTag(s)}
          </div>
          <div className="ffacts">
            <Fact k={t("find.hero.source")} wide>
              {sp ? speciesChips([{ n: s.source }]) : s.source}
              <span className="meta">
                {s.lv !== undefined && <>Lv ≈{s.lv}</>}
                {coord && <> · {igCoord(coord[0], coord[1])}
                  {alphaAt?.kind === "alpha" && alphaAt.map === "tree" && <>, {t("map.name.tree")}</>}</>}
              </span>
            </Fact>
            {/* Regionen är spelets eget namn med nivåspann – det som gör en
                källa begriplig är att man ser vilket område man ska till. */}
            {where && where.regions.length > 0 && (
              <Fact k={t("find.where.region")} wide>
                {where.regions.map((r) => (
                  <span key={r.name} className="fws">
                    {r.name}
                    {r.lo !== null && (
                      <span className="meta num">
                        {r.hi !== null && r.hi !== r.lo ? ` Lv ${r.lo}–${r.hi}` : ` Lv ${r.lo}`}
                      </span>
                    )}
                  </span>
                ))}
              </Fact>
            )}
            {where && where.spots.length > 0 && (
              <Fact k={t.plural("find.where.spots", where.total)} wide>
                {where.spots.map((p) => (
                  <span key={`${p.x},${p.y}`} className="fcoord num">{igCoord(p.x, p.y)}</span>
                ))}
                {where.total > where.spots.length
                  && <span className="meta">{t("find.place.more", { n: where.total - where.spots.length })}</span>}
              </Fact>
            )}
            <Fact k={t("find.where.how")} wide>
              <span className="fsrc">{t(howToFarm(s))}</span>
            </Fact>
          </div>
          <div className="hint">{t("find.schemNote")}</div>
        </div>
        {/* Kartlänken när det FINNS något att titta på där: alfabossen, eller en
            källa vi kunde peka ut. Annars är den en återvändsgränd. */}
        {(coord !== null || (where && where.spots.length > 0)) && (
          <div className="flinks">
            <Link className="fchip" href="/map">{t("find.linkMap")}</Link>
          </div>
        )}
      </div>
    );
  };

  /** Platsheron. Bara lager med per-instans-flagga i saven får en hittat-status
   *  – läger och dungeons har ingen, och en gissad avbockning är precis det
   *  kartan redan vägrar göra. */
  const heroPlace = (p: Place) => {
    let foundN: number | null = null;
    if (found && p.kind === "travel") foundN = p.guids.filter((g) => found.travels.has(g.toUpperCase())).length;
    if (found && p.kind === "tower" && p.flag) foundN = found.towers.has(p.flag) ? 1 : 0;
    return <PlaceHero place={p} found={foundN} />;
  };

  const heroSkill = (row: SkillRow) => {
    const sp = data.species[row.s];
    if (!sp) return null;
    return (
      <SkillHero
        skill={row.skill}
        desc={row.desc}
        tags={row.tags}
        portrait={<SpeciesIcon sp={sp} size={92} radius={20} />}
        name={<b className="fschem">{sp.name}</b>}
        deck={sp.deck > 0 ? <span className="meta"> No.{sp.deck}</span> : null}
        links={
          <div className="flinks">
            <Link className="fchip" href={`/breeding?target=${row.s}`}>{t("find.linkBreed")}</Link>
            {ownedSpecies.has(row.s) && <Link className="fchip" href="/box">{t("find.linkBox")}</Link>}
          </div>
        }
      />
    );
  };

  const heroExped = (site: ExpeditionSite) => {
    const progress = data.progress;
    let unlocked: boolean | null = null;
    if (progress) {
      unlocked = site.hard
        ? (progress.towerClears?.[`${site.flag}_Hard`] ?? 0) > 0
        : progress.towers.includes(site.flag);
    }
    return <ExpedHero site={site} unlocked={unlocked} squadFp={squad?.fp ?? null} />;
  };

  const heroRaid = (raid: RaidInfo) => {
    const i = raid.code ? spIdxByCode.get(raid.code.toLowerCase()) : undefined;
    const sp = i !== undefined ? data.species[i] : undefined;
    return (
      <RaidHero
        raid={raid}
        portrait={sp ? <SpeciesIcon sp={sp} size={92} radius={20} /> : null}
        cleared={data.progress ? (data.progress.raids[raid.key] ?? 0) : null}
        links={
          <div className="flinks">
            <Link className="fchip" href="/quests">{t("find.raid.link")}</Link>
            {i !== undefined && <Link className="fchip" href={`/breeding?target=${i}`}>{t("find.linkBreed")}</Link>}
          </div>
        }
      />
    );
  };

  /** Kombo-heron: "vad blir A × B?" Könsstyrda unika kombos ger flera utfall,
   *  och `childrenOf` bär spelets egen könsnot per rad. */
  const heroCombo = (a: number, b: number) => {
    const spA = data.species[a];
    const spB = data.species[b];
    if (!spA || !spB) return null;
    const kids = childrenOf(data, a, b);
    return (
      <ComboHero
        parents={
          <>
            <SpeciesIcon sp={spA} size={30} radius={12} />
            {spA.name}
            <span className="fx">×</span>
            <SpeciesIcon sp={spB} size={30} radius={12} />
            {spB.name}
          </>
        }
        results={kids.map((kid) => {
          const child = data.species[kid.c];
          if (!child) return null;
          return (
            <button
              key={`${kid.c}|${kid.note ?? ""}`} type="button" className="fchip fsp on"
              onClick={() => setQueryAndReset(child.name)}
            >
              <SpeciesIcon sp={child} size={20} radius={10} />
              {child.name}
              {kid.note && <span className="meta"> {kid.note}</span>}
            </button>
          );
        }).filter((n): n is React.JSX.Element => n !== null)}
        links={
          kids[0] !== undefined
            ? (
              <div className="flinks">
                <Link className="fchip" href={`/breeding?target=${kids[0].c}`}>{t("find.linkBreed")}</Link>
              </div>
            )
            : null
        }
      />
    );
  };

  const hero = () => {
    if (!activeCat) return null;
    switch (activeCat) {
      case "combos": {
        const h = hits.combos[activeIdx];
        return h ? heroCombo(h.a, h.b) : null;
      }
      case "species": {
        const h = hits.species[activeIdx];
        return h ? heroSpecies(h.sp, h.i) : null;
      }
      case "items": {
        const e = hits.items[activeIdx];
        return e ? heroItem(e) : null;
      }
      case "passives": {
        const h = hits.passives[activeIdx];
        return h ? heroPassive(h[0], h[1]) : null;
      }
      case "skills": {
        const h = hits.skills[activeIdx];
        return h ? heroSkill(h) : null;
      }
      case "schem": {
        const s = hits.schem[activeIdx];
        return s ? heroSchem(s) : null;
      }
      case "places": {
        const p = hits.places[activeIdx];
        return p ? heroPlace(p) : null;
      }
      case "exped": {
        const s = hits.exped[activeIdx];
        return s ? heroExped(s) : null;
      }
      case "raids": {
        const r = hits.raids[activeIdx];
        return r ? heroRaid(r) : null;
      }
      case "fishing": {
        /* Fiskeheron ÄR artheron – fiskeraden ligger där som fakta. */
        const h = hits.fishing[activeIdx];
        const i = h ? spIdxByName.get(h[0]) : undefined;
        const sp = i !== undefined ? data.species[i] : undefined;
        return sp && i !== undefined ? heroSpecies(sp, i) : null;
      }
    }
  };

  /* ============ Brickremsan per kategori ============ */

  const speciesTile = (sp: Species, idx: number, subtitle?: string) => (
    <button
      key={sp.name + idx} type="button" data-idx={idx}
      className={`ftile${idx === activeIdx ? " sel" : ""}`}
      style={{ "--elc": elementColor(sp) } as CSSProperties}
      onClick={() => activeCat && setPick({ cat: activeCat, idx })}
    >
      <span className="circ"><SpeciesIcon sp={sp} size={54} radius={14} /></span>
      <span className="nm">{sp.name}</span>
      <span className="sub">{subtitle ?? (sp.deck > 0 ? `No.${sp.deck}` : " ")}</span>
    </button>
  );
  /* Item-brickan bär spelets riktiga item-ikon (Kens rättning: textbrickorna
     var bara text). slug null = ingen bild, aldrig en gissad. */
  const itemTile = (
    key: string, idx: number, slug: string | null, title: string, subtitle: string,
    /* Varunamnet för hover-rutan – brickans titel är kapad ("Assault Rifle" ur
       "Assault Rifle Schematic 4"), så uppslaget behöver det riktiga namnet.
       `hasItemInfo` först: ett attribut utan känd beskrivning ger en död hover. */
    hover?: string,
  ) => (
    <button
      key={key} type="button" data-idx={idx}
      data-item={hover && hasItemInfo(hover) ? hover : undefined}
      className={`ftile${idx === activeIdx ? " sel" : ""}`}
      onClick={() => activeCat && setPick({ cat: activeCat, idx })}
    >
      <span className="circ">{slug ? <ItemIcon slug={slug} size={46} /> : <span className="fb">?</span>}</span>
      <span className="nm">{title}</span>
      <span className="sub">{subtitle}</span>
    </button>
  );
  /** Textbricka för det som inte har någon ikon i spelet (platser, sajter). */
  const textTile = (key: string, idx: number, glyph: ReactNode, title: string, subtitle: string) => (
    <button
      key={key} type="button" data-idx={idx}
      className={`ftile ftext${idx === activeIdx ? " sel" : ""}`}
      onClick={() => activeCat && setPick({ cat: activeCat, idx })}
    >
      <span className="circ">{glyph}</span>
      <span className="nm">{title}</span>
      <span className="sub">{subtitle}</span>
    </button>
  );

  /** Antalet källor en vara har – brickans undertext svarar "vet vi något?" */
  const itemSub = (e: ItemEntry): string => {
    if (e.drops.length > 0) return t("find.tile.droppers", { n: e.drops.length });
    if (e.ranch.length > 0) return t("find.tile.layers", { n: e.ranch.length });
    if (e.mine) return t("find.tile.mined");
    if (e.prices.length > 0) return t("find.tile.bought");
    if (e.exped.length > 0) return t("find.tile.exped", { n: e.exped.length });
    return t("find.tile.raid");
  };

  const strip = () => {
    if (!activeCat) return null;
    switch (activeCat) {
      /* Komboträffen är EN – den behöver ingen remsa att välja i. */
      case "combos": return null;
      case "species": return (
        <div className="fstrip" ref={stripRef}>
          {hits.species.slice(0, limit).map(({ sp, work }, idx) =>
            speciesTile(sp, idx, work ? `${WORK_META[work[0]]?.label} ${work[1]}` : undefined))}
        </div>
      );
      case "items": return (
        <div className="fstrip" ref={stripRef}>
          {hits.items.slice(0, limit).map((e, idx) =>
            itemTile(e.item, idx, itemIconSlug(e.item), e.item, itemSub(e), e.item))}
        </div>
      );
      /* Passiver väljs på riktiga banners – hela färgskalan ska synas. */
      case "passives": return (
        <div className="fprows" ref={stripRef}>
          {hits.passives.slice(0, limit).map(([id, def], idx) => (
            <button
              key={id} type="button" data-idx={idx}
              className={`fpbtn${idx === activeIdx ? " sel" : ""}`}
              onClick={() => setPick({ cat: "passives", idx })}
            >
              <PassiveRow id={id} name={def.n} tier={def.r} />
            </button>
          ))}
        </div>
      );
      case "skills": return (
        <div className="fstrip" ref={stripRef}>
          {hits.skills.slice(0, limit).map((row, idx) => {
            const sp = data.species[row.s];
            return sp
              ? speciesTile(sp, idx, row.skill)
              : textTile(row.code, idx, <span className="fb">?</span>, row.species, row.skill);
          })}
        </div>
      );
      case "schem": return (
        <div className="fstrip" ref={stripRef}>
          {hits.schem.slice(0, limit).map((s, idx) =>
            itemTile(`${s.name}|${s.source}`, idx, schematicIconSlug(s.name),
              s.name.replace(/ Schematic( \d+)?$/, ""), s.source, s.name))}
        </div>
      );
      case "places": return (
        <div className="fstrip" ref={stripRef}>
          {hits.places.slice(0, limit).map((p, idx) => {
            const sub = t.plural("find.place.count", p.spots.length);
            return p.ore
              ? itemTile(`${p.kind}|${p.name}`, idx, itemIconSlug(p.name), p.name, sub, p.name)
              : textTile(`${p.kind}|${p.name}`, idx,
                <span className="fpkind sm">{t(PLACE_TILE[p.kind])}</span>, p.name, sub);
          })}
        </div>
      );
      case "exped": return (
        <div className="fstrip" ref={stripRef}>
          {hits.exped.slice(0, limit).map((s, idx) =>
            textTile(s.name, idx,
              s.need
                ? <GameIcon name={ELEMENT_ICON[s.need.el]} size={34} />
                : <span className="fpkind sm">{t("find.exped.anyEl")}</span>,
              s.name, t("find.exped.minutes", { n: s.minutes })))}
        </div>
      );
      case "raids": return (
        <div className="fstrip" ref={stripRef}>
          {hits.raids.slice(0, limit).map((r, idx) => {
            const i = r.code ? spIdxByCode.get(r.code.toLowerCase()) : undefined;
            const sp = i !== undefined ? data.species[i] : undefined;
            return sp
              ? speciesTile(sp, idx, `Lv ${r.lv}`)
              : textTile(r.key, idx, <span className="fb">!</span>, r.name, `Lv ${r.lv}`);
          })}
        </div>
      );
      case "fishing": return (
        <div className="fstrip" ref={stripRef}>
          {hits.fishing.slice(0, limit).map(([name], idx) => {
            const i = spIdxByName.get(name);
            const sp = i !== undefined ? data.species[i] : undefined;
            return sp ? speciesTile(sp, idx) : itemTile(name, idx, null, name, " ");
          })}
        </div>
      );
    }
  };

  return (
    <>
      {availableCats.length > 0 ? hero() : (
        <div className="fhero">
          <div className="fbody">
            <div className="fname">{t("find.nothingTitle")}</div>
            <div className="fsub">{t("find.nothing")}</div>
          </div>
        </div>
      )}

      <Section title={t("find.sectionTitle")} sub={t("find.sub")}>
        <div className="controls">
          <input
            type="text"
            className="grow"
            placeholder={t("find.placeholder")}
            value={query}
            onChange={(e) => setQueryAndReset(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
          />
        </div>
        {/* Vanliga frågor som chips – ett klick fyller sökfältet. Två av dem är
            nya vägar in som auditen öppnade: en malmvara och ett par. */}
        <div className="controls">
          <span className="meta">{t("find.examples")}</span>
          {["Flame Organ", "Sulfur", "Life Fruit", "Legend", "Mining", "Anubis x Lamball", "134"].map((ex) => (
            <button key={ex} type="button" className="fchip" onClick={() => setQueryAndReset(ex)}>
              {ex}
            </button>
          ))}
        </div>

        {/* Kategorichipsen bär räknarna i fast ordning – de säger var
            träffarna finns utan att rita alla listor (vänstermenyn ur
            designrunda 1 underkändes; sektionsröran ur v1 likaså).
            Räknaren är HELA mängden: förr skars träffarna först och chipet
            sa "12" när åttio matchade. */}
        {availableCats.length > 0 && (
          <div className="fcats">
            {CATS.filter(([c]) => counts[c] > 0).map(([c, key]) => (
              <button
                key={c} type="button"
                className={`fchip${c === activeCat ? " on" : ""}`}
                aria-pressed={c === activeCat}
                onClick={() => setPick({ cat: c, idx: 0 })}
              >
                {t(key)}<b className="num">{counts[c]}</b>
              </button>
            ))}
          </div>
        )}

        {strip()}
        {/* Taket ska aldrig se ut som ett slut. Knappen säger hur många som
            ligger kvar, så en trunkerad lista inte läses som hela svaret. */}
        {total > limit && (
          <button type="button" className="fchip fmore" onClick={() => setLimit(limit + PAGE)}>
            {t("find.more", { n: total - limit })}
          </button>
        )}
        {/* Reglerna som inte är en artlista (Ancient Parts = alla alfor,
            Polymer craftas) hör till varufrågan, inte en enskild vara. */}
        {activeCat === "items" && <div className="hint">{t("find.dropsRules")}</div>}
        {/* Kartans bortfall redovisas: 33 dungeon-markörer saknar namn i källan
            och lägrens namn är interna id:n, alltså EN grupp. Ett tyst bortfall
            ser ut som full täckning, och då tror man att sökningen är trasig. */}
        {activeCat === "places" && (
          <div className="hint">
            {t("find.place.gaps", { dungeons: gaps.dungeonsUnnamed, camps: gaps.campsCollapsed })}
          </div>
        )}
        {availableCats.length > 0 && <div className="fkbd">{t("find.kbd")}</div>}
      </Section>

      <div className="hint">{t("find.dataNote")}</div>
    </>
  );
}

/** Kort typord på platsbrickan – ikonlösa lager bär sitt ord i stället. */
const PLACE_TILE: Record<Place["kind"], MessageKey> = {
  tower: "find.place.towerShort",
  travel: "find.place.travelShort",
  dungeon: "find.place.dungeonShort",
  camp: "find.place.campShort",
  ore: "find.place.oreShort",
  fruit: "find.place.fruitShort",
};
