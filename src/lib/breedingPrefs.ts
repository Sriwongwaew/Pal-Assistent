/** Sparade val i avelsplaneraren.
 *
 * Planeraren är det enda stället i appen där man klickar ihop något som tar tid
 * – mål-art, syfte, syssla och upp till fyra passiver. Att tappa allt bara för
 * att man gick till Boxen och tittade på en pal är den enklaste tänkbara
 * irritationen, så valen skrivs som JSON under `pa-breeding` i localStorage.
 *
 * Allt som läses tillbaka valideras mot den **aktuella** datan: art-index pekar
 * rakt in i `data.species` och passiv-id:n in i `data.passives`, och båda kan ha
 * flyttat sig sedan förra gången (en ny Palworld-patch → ny `pal-data.json` →
 * nya index). Ett gammalt index skulle annars slå igenom som
 * `data.species[target]!` = undefined och krascha hela sidan i stället för att
 * bara vara ett bortglömt val. Samma sak för handredigerad localStorage.
 */
import { WORK_TYPES } from "./constants";
import { PURPOSES, type PurposeId } from "./purpose";
import type { IvGoal } from "./breeding";
import type { AppData, WorkType } from "./types";

/** Nyckeln i localStorage – samma `pa-`-prefix som temavalen. */
export const BREEDING_PREFS_KEY = "pa-breeding";

/** Spelet ger en pal högst fyra passiver, så väljaren stannar där. */
export const MAX_WANTED = 4;

export interface BreedingPrefs {
  /** Art-index i `data.species`, eller null. */
  target: number | null;
  base: number | null;
  /** Passiv-id:n, högst `MAX_WANTED`, utan dubbletter. */
  wanted: string[];
  ivGoal: IvGoal;
  purpose: PurposeId | null;
  /** Bara meningsfull när `purpose === "work"`. */
  work: WorkType | null;
  /**
   * Ska planen räkna med att du opererar in de passiver du har implantat för?
   *
   * Påslaget lyfts de ur det planen **avlar** – de hamnar aldrig i arvspoolen, så
   * oddsen blir de för en mindre pool. Målbilden visar dem fortfarande: målet är
   * oförändrat, det är bara vägen dit som är kortare.
   *
   * Standard **på**: äger du implantatet är att avla in passiven strikt sämre –
   * fler ägg för samma resultat. Men valet finns, för man kanske vill spara
   * implantatet till en annan pal.
   */
  useImplants: boolean;
  /**
   * Vald artkedja i fas 2, som **artkoder** – inte index.
   *
   * Tomt = "ta den planeraren rekommenderar". Är den satt låser den fas 2 till
   * just den rutten, så länge den fortfarande är en av de likvärdiga vägarna.
   *
   * Koder och inte index av samma skäl som `breedRate.ts` slår upp sina arter på
   * `code`: index pekar rakt in i `data.species` och flyttar sig när den statiska
   * halvan görs om. Ett index vore dessutom *tyst* fel här – kedjan skulle inte
   * krascha, den skulle bara vara en annan kedja än den man valde.
   */
  chain: string[];
}

/** Ny tom uppsättning. Funktion, inte konstant, så ingen kan råka dela `wanted`. */
export function emptyBreedingPrefs(): BreedingPrefs {
  return {
    target: null, base: null, wanted: [], ivGoal: "fast",
    purpose: null, work: null, useImplants: true, chain: [],
  };
}

/** Art-index bara om det pekar på en art som finns i den här bundlen. */
function speciesIdx(v: unknown, data: AppData): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < data.species.length
    ? v
    : null;
}

/**
 * Tolkar det som ligger i localStorage. Trasig JSON, fel typer och försvunna
 * arter/passiver ger tomma val i stället för fel – ett sparat val är aldrig
 * viktigare än att sidan går att öppna.
 */
export function parseBreedingPrefs(raw: string | null, data: AppData): BreedingPrefs {
  const o = asObject(raw);
  if (!o) return emptyBreedingPrefs();
  /* Den nya formen är en BOK med flikar. Att svara med den aktiva ledens val i
     stället för tomma är hela skälet att de fem andra läsarna (Boxen,
     Översikten, GoalWatch, Rollerna, Hitta) kunde lämnas orörda. */
  if (Array.isArray(o.tabs)) return activePrefs(parseBook(o, data));
  return parseFlatPrefs(o, data);
}

/** JSON → objekt, eller null för allt som inte är ett objekt. */
function asObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
}

/** En enda leds val, ur den platta formen. */
function parseFlatPrefs(o: Record<string, unknown>, data: AppData): BreedingPrefs {
  const out = emptyBreedingPrefs();
  out.target = speciesIdx(o.target, data);
  out.base = speciesIdx(o.base, data);

  if (Array.isArray(o.wanted)) {
    const seen = new Set<string>();
    for (const id of o.wanted) {
      // Dubbletter skulle ge två banners med samma React-nyckel och dessutom
      // räknas två gånger i arvspoolen.
      if (typeof id !== "string" || seen.has(id) || !(id in data.passives)) continue;
      seen.add(id);
      out.wanted.push(id);
      if (out.wanted.length === MAX_WANTED) break;
    }
  }

  /* Kedjan valideras bara som "koder som finns i den här bundlen". Att den
     fortfarande är en gångbar väg avgörs av planeraren, som jämför mot de
     alternativ den räknar fram – boxen kan ha ändrats sedan valet gjordes, och
     då ska det tysta falla tillbaka på rekommendationen. */
  if (Array.isArray(o.chain)) {
    const codes = new Set(data.species.map((s) => s.code));
    const picked = o.chain.filter((c): c is string => typeof c === "string" && codes.has(c));
    if (picked.length === o.chain.length) out.chain = picked;
  }

  out.ivGoal = o.ivGoal === "perfect" || o.ivGoal === "near" ? o.ivGoal : "fast";
  /* Bara ett uttryckligt `false` stänger av det. En sparad uppsättning från före
     flaggan fanns saknar fältet, och då är standarden (på) rätt – annars hade
     alla gamla sessioner tystat rådet utan att någon bett om det. */
  out.useImplants = o.useImplants !== false;
  out.purpose = PURPOSES.some((p) => p.id === o.purpose) ? (o.purpose as PurposeId) : null;
  // Sysslan hänger på syftet: väljaren nollar den så fort man lämnar "Bas & arbete".
  out.work = out.purpose === "work" && WORK_TYPES.includes(o.work as WorkType)
    ? (o.work as WorkType)
    : null;

  return out;
}

export function serializeBreedingPrefs(prefs: BreedingPrefs): string {
  return JSON.stringify(prefs);
}

/** Finns det något att rensa? Styr om "Rensa allt" är klickbar. */
export function hasBreedingPrefs(prefs: BreedingPrefs): boolean {
  return prefs.target !== null || prefs.base !== null || prefs.wanted.length > 0
    || prefs.purpose !== null || prefs.ivGoal !== "fast" || !prefs.useImplants;
}

/* ---------------------------------------------------------------------------
 * Flikar – flera leder igång samtidigt (Kens begäran aug 2026)
 *
 * En avelsled är inte en session utan ett projekt: man håller på med en
 * arbetspal i basen, en riddjursled och en stridsled parallellt, och den enda
 * tidigare vägen mellan dem var att bygga om valen för hand varje gång. Boken
 * är därför en LISTA av samma `BreedingPrefs` som förut, plus vilken som är
 * framme.
 *
 * Tre saker som är valda, inte råkade så:
 *
 * 1. **`parseBreedingPrefs` betyder fortfarande "den aktiva ledens val".** Fem
 *    andra ställen läser samma nyckel (Boxens guldkant, Översiktens rad,
 *    `GoalWatch`, Rollernas och Hittas bokningar), och de frågar alla efter
 *    *en* målbild. Att låta den funktionen byta betydelse hade ändrat alla fem
 *    tyst; nu tar de som vill se ALLA leder `parseBreedingBook` i stället.
 * 2. **Gamla sparade val är en bok med en flik.** Posten i localStorage skrevs
 *    som ett platt objekt före det här, och den formen läses vidare utan att
 *    någon märker det – annars hade uppdateringen slängt den led man höll på
 *    med.
 * 3. **Id:t är härlett, aldrig slumpat.** Det är bara en React-nyckel, men en
 *    slumpad nyckel gör två identiska sparade böcker olika och därmed omöjliga
 *    att jämföra i ett test.
 * -------------------------------------------------------------------------*/

/** Så många parallella leder får finnas. Fler får ändå inte plats i flikraden. */
export const MAX_TABS = 6;

export interface BreedingTab {
  /** Stabil React-nyckel. Har ingen betydelse för planen. */
  id: string;
  prefs: BreedingPrefs;
}

export interface BreedingBook {
  /** Alltid minst en flik – "inga leder" är samma sak som en tom led. */
  tabs: BreedingTab[];
  /** Index i `tabs`, alltid giltigt. */
  active: number;
}

/** Första lediga `led-N`. Ren funktion så samma bok alltid ger samma id:n. */
function freeId(used: ReadonlySet<string>): string {
  for (let n = 1; ; n++) {
    const id = `led-${n}`;
    if (!used.has(id)) return id;
  }
}

/** En bok med en tom led. */
export function emptyBreedingBook(): BreedingBook {
  return { tabs: [{ id: "led-1", prefs: emptyBreedingPrefs() }], active: 0 };
}

/** Den framme liggande ledens val. */
export function activePrefs(book: BreedingBook): BreedingPrefs {
  return book.tabs[book.active]!.prefs;
}

/** Alla leders val – för den som bokar pals och måste se dem allihop. */
export function allPrefs(book: BreedingBook): BreedingPrefs[] {
  return book.tabs.map((t) => t.prefs);
}

/** Byter ut den aktiva ledens val. */
export function setActivePrefs(book: BreedingBook, prefs: BreedingPrefs): BreedingBook {
  return {
    ...book,
    tabs: book.tabs.map((t, i) => (i === book.active ? { ...t, prefs } : t)),
  };
}

/** Ny tom led sist, och framme. Full bok returneras oförändrad. */
export function addBreedingTab(book: BreedingBook): BreedingBook {
  if (book.tabs.length >= MAX_TABS) return book;
  const id = freeId(new Set(book.tabs.map((t) => t.id)));
  return {
    tabs: [...book.tabs, { id, prefs: emptyBreedingPrefs() }],
    active: book.tabs.length,
  };
}

/**
 * Stänger en led.
 *
 * Sista fliken går inte att stänga bort – den töms i stället. En bok utan
 * flikar hade betytt "ingen planerare", och det är inte ett läge sidan har.
 */
export function closeBreedingTab(book: BreedingBook, i: number): BreedingBook {
  if (i < 0 || i >= book.tabs.length) return book;
  if (book.tabs.length === 1) {
    return { tabs: [{ id: book.tabs[0]!.id, prefs: emptyBreedingPrefs() }], active: 0 };
  }
  const tabs = book.tabs.filter((_, j) => j !== i);
  /* Stänger man en flik till vänster om den aktiva ska samma led ligga kvar
     framme – annars hoppar sidan till en granne man inte bad om. */
  const active = book.active > i ? book.active - 1
    : Math.min(book.active, tabs.length - 1);
  return { tabs, active };
}

/** Tolkar hela boken. Allt trasigt blir en tom led, aldrig ett fel. */
export function parseBreedingBook(raw: string | null, data: AppData): BreedingBook {
  const o = asObject(raw);
  return o ? parseBook(o, data) : emptyBreedingBook();
}

function parseBook(o: Record<string, unknown>, data: AppData): BreedingBook {
  /* Den platta formen är förflikarnas post. Den ska läsas som förut och bli
     bokens enda led – uppdateringen får inte kosta någon sin pågående plan. */
  if (!Array.isArray(o.tabs)) {
    return { tabs: [{ id: "led-1", prefs: parseFlatPrefs(o, data) }], active: 0 };
  }

  const tabs: BreedingTab[] = [];
  const used = new Set<string>();
  for (const entry of o.tabs) {
    if (tabs.length >= MAX_TABS) break;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    /* Valen går genom exakt samma validering som förut – art-index och
       passiv-id:n kan ha flyttat sig sedan förra bundlen. `parseFlatPrefs` och
       inte `parseBreedingPrefs`: en led är alltid platt, och att gå via den
       yttre hade gjort en handredigerad `{prefs:{tabs:[…]}}` till en rekursion. */
    const p = e.prefs;
    const prefs = p && typeof p === "object" && !Array.isArray(p)
      ? parseFlatPrefs(p as Record<string, unknown>, data)
      : emptyBreedingPrefs();
    const id = typeof e.id === "string" && e.id && !used.has(e.id) ? e.id : freeId(used);
    used.add(id);
    tabs.push({ id, prefs });
  }
  if (!tabs.length) return emptyBreedingBook();

  const active = typeof o.active === "number" && Number.isInteger(o.active)
    && o.active >= 0 && o.active < tabs.length
    ? o.active
    : 0;
  return { tabs, active };
}

export function serializeBreedingBook(book: BreedingBook): string {
  return JSON.stringify(book);
}

/**
 * Finns det något att rensa? Flera leder räknas i sig – "Rensa allt" tar bort
 * dem också, och en knapp som ser död ut när fem flikar står öppna är fel.
 */
export function hasBreedingBook(book: BreedingBook): boolean {
  return book.tabs.length > 1 || book.tabs.some((t) => hasBreedingPrefs(t.prefs));
}
