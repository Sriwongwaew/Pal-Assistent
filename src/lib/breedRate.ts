/**
 * Avelstakten: vad som faktiskt gör äggen snabbare – och vad du redan har av det.
 *
 * Resten av appen räknar planer i *ägg* ("~545 ägg"), vilket är rätt enhet för
 * att jämföra två vägar men säger ingenting om hur lång kvällen blir. Ett ägg
 * tar 300 sekunder i grunduppställning och 86 med full, alltså **3,5× skillnad
 * på exakt samma plan**. Den faktorn är värd mer än de flesta omvägar planeraren
 * räknar fram, så den hör hemma bredvid äggsiffran.
 *
 * Modellen är additiv och uppmätt i spelet, inte gissad:
 *
 * | uppställning                        | takt  | uppmätt |
 * |-------------------------------------|-------|---------|
 * | inget                               | 1,0×  | 300 s   |
 * | 4★ Braloha i basen                  | 1,5×  | 201 s   |
 * | en förälder med Philanthropist      | 2,0×  | 150 s   |
 * | båda föräldrarna                    | 3,0×  | 100 s   |
 * | båda + 4★ Braloha                   | 3,5×  |  85 s   |
 *
 * 300/1,5 = 200, 300/3,5 = 85,7 – mätvärdena följer `tid = 300 / takt` med
 * marginal som ryms i en stoppursavläsning. Därför räknar vi takten i stället
 * för att lista påståenden.
 *
 * **Takten har två axlar, och de hålls åtskilda med flit** – de har olika
 * ursprung och tål olika hårda påståenden:
 *
 * 1. **Timern** (`eggSpeed`): hur ofta farmen lägger ett ägg. Tabellen ovan,
 *    uppmätt med stoppur. Tak 3,5×.
 * 2. **Upplockningen** (`pickupFactor`): hur många ägg du får ur ett lagt ägg.
 *    Grintale i partyt ger ett extra i 50 % av fallen, alltså 1,5 i snitt.
 *    Det är wikins effekttext, inte en mätning – men det extra ägget är en
 *    egen passivdragning ur samma par, alltså ett ägg i precis den mening
 *    planerarens siffror räknar. Därför får axlarna multipliceras.
 *
 * `rate = timer × upplockning`, och `tid = 300 / rate`. Det absoluta taket är
 * alltså 5,25× ≈ 57 s per ägg.
 *
 * **Men det taket ska man inte sikta på, och det är den viktigaste raden i den
 * här filen.** Philanthropist måste sitta på just de två pals man parar, alltså
 * i *arvspoolen* – och där är den skräp. `philanthropistVerdict` räknar bytet:
 * med fyra önskade passiver sänker den sista stegets odds 10 % → 2 % (5× fler
 * ägg) mot 3× snabbare takt, alltså **netto en förlust**. Med tre önskade eller
 * färre vinner den, och jagar man bara IV är den gratis (IV ärvs oberoende av
 * passiver). Det är hela skälet till att `CAP_FREE` finns bredvid `CAP_RATE`:
 * planens äggsiffror är räknade med *rena* föräldrar, så att översätta dem med
 * ett tak som förutsätter skräp i poolen vore att blanda två världar.
 *
 * Fyra saker modellen medvetet **inte** gör:
 *
 * 1. **Insomnia räknas inte in i takten.** Att paret inte pausar på natten är
 *    upptid, inte hastighet, och hur stor natten är beror på var i dygnet man
 *    står. Den är med som en rad – effekten är verklig – men utan en siffra vi
 *    inte har mätt. En påhittad procent här hade sett precis lika trovärdig ut
 *    som de fyra ovan. Den kostar dessutom exakt samma pool-plats som
 *    Philanthropist, så den delar dess varning.
 * 2. **Philanthropist räknas aldrig som "har".** Passiven måste sitta på just
 *    de två pals man parar; 23 bärare i boxen är råmaterial, inte en bonus.
 *    Att räkna in dem hade gjort att appen lovade en takt användaren inte har.
 * 3. **Dynamoff räknas inte in i takten.** Electro-Massage Incubation kortar
 *    *kläckningen*, inte farmens timer. Kläckare går parallellt och deras
 *    grundtid är en världsinställning, så en procent av ett okänt tal hade inte
 *    gått att lägga till 300 s. Raden finns, siffran står som den är.
 * 4. **Arbetshastighet gör ingenting.** Artisan, Work Slave, Serious, Lucky,
 *    Statue of Power och kondensering av *föräldrarna* påverkar hantverk och
 *    insamling – aldrig avelstimern. Bara Braloha-exemplaret självt tjänar på
 *    att kondenseras, och då för sin partnerskill.
 */
import { translate, type MessageKey, type Vars } from "../i18n";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";
import { inheritOdds } from "./breeding";
import { condenseReach } from "./scoring";
import type { AppData, ScoredPal } from "./types";

/** Sekunder per ägg utan någon uppställning alls. */
export const BASE_EGG_SECONDS = 300;

/** Philanthropist – dubblar takten, en gång per förälder som bär den. */
export const PHILANTHROPIST = "Test_PalEgg_HatchingSpeed_Up";
/** Nocturnal i datasetet, "Insomnia" i spelets gränssnitt. */
export const NOCTURNAL = "Nocturnal";
const PARENT_BONUS = 1;
/** Båda föräldrarna kan bära den, men inte fler än så. */
const MAX_PARENTS = 2;

/* Arter slås upp på `code`, aldrig på index eller namn: index flyttar med varje
   patch (samma fälla som breedingPrefs.ts är byggd runt) och namnen är
   lokaliserade. Koderna är savens egna och har inte ändrats. */
const BRALOHA_CODE = "Plesiosaur";
const BRONCHERRY_CODE = "SakuraSaurus";
const BRONCHERRY_AQUA_CODE = "SakuraSaurus_Water";
const GRINTALE_CODE = "NaughtyCat";
const DYNAMOFF_CODE = "ThunderFluffyBird";

/** Balmy Weather, per stjärna 0★–4★. Stackar inte med fler Braloha. */
const BRALOHA_BONUS = [0.2, 0.26, 0.32, 0.38, 0.5] as const;
/** Love's First Blossom: chans att ett upplockat ägg blir alpha-ägg. */
const BRONCHERRY_ALPHA = [0.35, 0.37, 0.39, 0.41, 0.45] as const;
/** Purity's Full Bloom – samma sak, men bättre hela vägen. */
const BRONCHERRY_AQUA_ALPHA = [0.45, 0.47, 0.49, 0.51, 0.55] as const;
/**
 * Glaring Cat's Eye: "picking up a Pal Egg has a 50% chance of receiving one
 * extra. (Does not stack)". **Platt, ingen stjärnskalning** – och det är
 * kontrollerat, inte antaget: wikin skriver ett intervall i effekttexten när en
 * partnerskill skalar (Broncherry Aqua står som "(45~55)%" och har en egen
 * rangtabell "Egg Upgrade Chance"), medan Grintale står som en ensam 50 % och
 * bara har en rangtabell för neutral skada. Guider som påstår 75 % vid 4★ har
 * alltså läst damage-tabellen. Ändra inte utan att kolla effekttexten igen.
 */
const GRINTALE_EXTRA = 0.5;
/** Electro-Massage Incubation, per stjärna 0★–4★: kortare *kläckning*, inte
 *  kortare timer. Ligger därför utanför takten – se filhuvudet, punkt 3. */
const DYNAMOFF_INCUBATION = [0.2, 0.22, 0.26, 0.32, 0.4] as const;

const at = (table: readonly number[], stars: number): number =>
  table[Math.max(0, Math.min(table.length - 1, stars))] ?? 0;

/** Timern: hur ofta farmen lägger ett ägg, som multiplikator av grundtakten. */
export function eggSpeed(philanthropists: number, bralohaStars: number | null): number {
  const parents = Math.max(0, Math.min(MAX_PARENTS, philanthropists));
  return 1 + PARENT_BONUS * parents + (bralohaStars === null ? 0 : at(BRALOHA_BONUS, bralohaStars));
}

/** Upplockningen: ägg per lagt ägg. Grintale ger ett extra i 50 % av fallen. */
export const pickupFactor = (grintaleInParty: boolean): number =>
  grintaleInParty ? 1 + GRINTALE_EXTRA : 1;

/** Ägg per tidsenhet: timern × upplockningen. Det är den här siffran planens
 *  äggräkning ska divideras med, inte timern ensam. */
export const eggRate = (speed: number, pickup: number): number => speed * pickup;

/** Sekunder per ägg vid en given takt. */
export const eggSeconds = (speed: number): number => BASE_EGG_SECONDS / speed;

/** Timerns tak: båda föräldrarna med Philanthropist + en 4★ Braloha. */
export const CAP_SPEED = eggSpeed(MAX_PARENTS, 4);
/** Spelets absoluta tak, Philanthropist inräknad: 3,5 × 1,5 = 5,25×. */
export const CAP_RATE = eggRate(CAP_SPEED, pickupFactor(true));
/**
 * Taket som **inte rör arvspoolen**: 4★ Braloha + Grintale, 1,5 × 1,5 = 2,25×.
 *
 * Det är det tak man ska sikta på, och det tak planens äggsiffror får
 * översättas med. `CAP_RATE` förutsätter Philanthropist på båda föräldrarna,
 * alltså en skräp-passiv i poolen – men äggsiffrorna är räknade med *rena*
 * föräldrar. Att gånga dem med 5,25× vore att lova en kväll som förutsätter
 * odds planen inte räknat med.
 */
export const CAP_FREE = eggRate(eggSpeed(0, 4), pickupFactor(true));

/* ============================================================
   Vad boxen har
   ============================================================ */

/** Behållarna heter Palbox, Party och "Bas/övrigt N" (tools/palsave.py). En
 *  partnerskill som gäller "i basen" kräver att palen står i en av basarna –
 *  en Braloha i Palboxen gör ingenting. */
const inBase = (c: string) => c !== "Palbox" && c !== "Party";
const inParty = (c: string) => c === "Party";

export interface PartnerPal {
  /** Art-index, eller null om arten saknas i datasetet (äldre bundle). */
  s: number | null;
  owned: number;
  /** Står minst ett exemplar där skillen gäller? */
  placed: boolean;
  /** Stjärnor på det bäst kondenserade exemplaret. */
  stars: number;
  /** Stjärnor man når genom att mata dubbletterna. */
  reach: number;
}

export interface PassiveStock {
  id: string;
  /** Antal pals i boxen som bär passiven – råmaterial att avla in den ur. */
  carriers: number;
}

export interface BreedSetup {
  braloha: PartnerPal;
  dynamoff: PartnerPal;
  grintale: PartnerPal;
  broncherry: PartnerPal;
  broncherryAqua: PartnerPal;
  philanthropist: PassiveStock;
  nocturnal: PassiveStock;
  /** Timern du har just nu – bara det som faktiskt står utplacerat. */
  speed: number;
  /** Ägg per upplockning just nu (1 eller 1,5). */
  pickup: number;
  /** speed × pickup, alltså ägg per tidsenhet. */
  rate: number;
  seconds: number;
  /** Vad Bralohas kondensering ensam skulle ge, om det är mer än nu. */
  reachRate: number;
  /** Antal punkter i uppställningen som inte är i mål. */
  todo: number;
}

function partnerPal(
  data: AppData,
  pals: readonly ScoredPal[],
  code: string,
  where: (c: string) => boolean,
): PartnerPal {
  const s = data.species.findIndex((sp) => sp.code === code);
  if (s < 0) return { s: null, owned: 0, placed: false, stars: 0, reach: 0 };
  const mine = pals.filter((p) => p.s === s);
  /* Det bäst kondenserade exemplaret bär skillen starkast, så det är det man
     vill ha utplacerat – och det som resten ska matas in i. */
  const stars = mine.reduce((n, p) => Math.max(n, p.stars), 0);
  return {
    s,
    owned: mine.length,
    placed: mine.some((p) => where(p.c)),
    stars,
    // Alla utom det man behåller är matarpals.
    reach: condenseReach(stars, Math.max(0, mine.length - 1)).reach,
  };
}

const stock = (pals: readonly ScoredPal[], id: string): PassiveStock => ({
  id,
  carriers: pals.reduce((n, p) => n + (p.pv.includes(id) ? 1 : 0), 0),
});

/** Läser boxen och svarar på hur snabbt den avlar i dag. */
export function planBreedSetup(data: AppData, pals: readonly ScoredPal[]): BreedSetup {
  const braloha = partnerPal(data, pals, BRALOHA_CODE, inBase);
  const dynamoff = partnerPal(data, pals, DYNAMOFF_CODE, inBase);
  const grintale = partnerPal(data, pals, GRINTALE_CODE, inParty);
  const broncherry = partnerPal(data, pals, BRONCHERRY_CODE, inParty);
  const broncherryAqua = partnerPal(data, pals, BRONCHERRY_AQUA_CODE, inParty);
  const philanthropist = stock(pals, PHILANTHROPIST);
  const nocturnal = stock(pals, NOCTURNAL);

  const speed = eggSpeed(0, braloha.placed ? braloha.stars : null);
  const pickup = pickupFactor(grintale.placed);
  const rate = eggRate(speed, pickup);
  const reachRate = eggRate(eggSpeed(0, braloha.owned > 0 ? braloha.reach : null), pickup);

  /* "Kvar att fixa" ska vara det man ser i rubriken utan att fälla ut, så den
     räknar punkter man kan göra något åt – inte procentenheter. Braloha räknas
     som två saker (stå i basen, vara färdigkondenserad) eftersom de åtgärdas
     var för sig. Aqua är strikt bättre än vanlig Broncherry, så när den är på
     plats är partyt klart.

     Philanthropist och Insomnia räknas INTE, och det är hela poängen med
     `philanthropistVerdict`: de sitter i arvspoolen och är en förlust vid fyra
     önskade passiver. En punkt i "N kvar" läses som "det här ska du fixa", och
     det vore fel råd i just det läge planeraren oftast står i.

     En art som inte finns i datasetet (äldre bundle) räknas inte heller – dess
     rad ritas inte ut, och en osynlig punkt går inte att beta av. */
  const missing = (row: PartnerPal) => row.s !== null && !row.placed;
  let todo = 0;
  if (missing(braloha)) todo++;
  if (braloha.reach > braloha.stars) todo++;
  if (missing(grintale)) todo++;
  if (missing(dynamoff)) todo++;
  if (broncherryAqua.s !== null && !broncherryAqua.placed && !broncherry.placed) todo++;

  return {
    braloha, dynamoff, grintale, broncherry, broncherryAqua, philanthropist, nocturnal,
    speed, pickup, rate, seconds: eggSeconds(rate), reachRate, todo,
  };
}

/* ============================================================
   Vad en takt-passiv kostar i arvspoolen
   ============================================================ */

export interface PoolVerdict {
  /** Antal önskade passiver planen siktar på (0–4). */
  wanted: number;
  /** Oddsen för sista steget med ren pool … */
  cleanOdds: number;
  /** … och med passiven i poolen. */
  dirtyOdds: number;
  /** Hur många gånger fler ägg steget kostar. */
  eggFactor: number;
  /** Hur många gånger snabbare takten blir, mätt från din nuvarande Braloha. */
  speedFactor: number;
  /** speedFactor / eggFactor. >1 = värt det, <1 = förlust. */
  net: number;
}

/**
 * Är Philanthropist på båda föräldrarna värt det, med de passiver planen siktar
 * på? Passiven måste sitta på just de två man parar, alltså i arvspoolen, och
 * varje skräp-passiv där sänker oddsen. Bytet är därför takt mot ägg:
 *
 * | önskade | rena odds | med passiven | fler ägg | netto (3★ Braloha) |
 * |---------|-----------|--------------|----------|--------------------|
 * | 0       | 100 %     | 100 %        | 1,0×     | 2,4×               |
 * | 1       | 100 %     | 80 %         | 1,25×    | 2,0×               |
 * | 2       | 60 %      | 40 %         | 1,5×     | 1,6×               |
 * | 3       | 30 %      | 15 %         | 2,0×     | 1,2×               |
 * | 4       | 10 %      | 2 %          | 5,0×     | **0,5×**           |
 *
 * Alltså: vinst upp till tre önskade, **förlust vid fyra** – och gratis när man
 * bara jagar IV, eftersom IV ärvs oberoende av passiver.
 *
 * `speedFactor` är *marginell*, inte 3,0×: har du redan en 3★ Braloha går du
 * från 1,38× till 3,38×, alltså 2,45× – inte tre gånger. Upplockningsaxeln
 * (Grintale) faller bort i kvoten eftersom den gäller lika i båda leden.
 *
 * Jämförelsen gäller **sista steget**, där hela den önskade uppsättningen ska
 * landa och poolen är precis de önskade. Mellansteg har mindre pooler och är
 * alltså billigare – men passiven ärvs också nedåt, vilket planens antagande om
 * rena ungar inte modellerar. Siffran är därför om något för snäll mot
 * Philanthropist, inte för hård.
 */
export function philanthropistVerdict(wanted: number, bralohaStars: number | null): PoolVerdict {
  const k = Math.max(0, Math.min(4, Math.trunc(wanted)));
  const cleanOdds = inheritOdds(k, k);
  const dirtyOdds = inheritOdds(k, k + 1);
  const eggFactor = dirtyOdds > 0 ? cleanOdds / dirtyOdds : Infinity;
  const speedFactor = eggSpeed(MAX_PARENTS, bralohaStars) / eggSpeed(0, bralohaStars);
  return { wanted: k, cleanOdds, dirtyOdds, eggFactor, speedFactor, net: speedFactor / eggFactor };
}

/** Hur mycket kortare kläckningen blir med Dynamoff i basen. */
export const dynamoffCut = (row: PartnerPal, stars = row.stars): number =>
  at(DYNAMOFF_INCUBATION, stars);

/** Grintales extra-ägg-chans. Platt – ingen stjärnskalning, se konstanten. */
export const grintaleExtra = (): number => GRINTALE_EXTRA;

/** Alpha-chans för ett upplockat ägg vid de stjärnor arten har. */
export const alphaChance = (row: PartnerPal, aqua: boolean, stars = row.stars): number =>
  at(aqua ? BRONCHERRY_AQUA_ALPHA : BRONCHERRY_ALPHA, stars);

/** Braloha-bonusen vid ett givet antal stjärnor. */
export const bralohaBonus = (stars: number): number => at(BRALOHA_BONUS, stars);

/* ============================================================
   Formatering
   ============================================================ */

const sv = (n: number, dec: number) => n.toFixed(dec).replace(".", ",");

/** Takten som "2,0×". */
export const speedText = (speed: number): string => `${sv(speed, 1)}×`;

/** Tiden för ett ägg: "86 s", "4 min 10 s", "5 min". */
export function eggTimeText(seconds: number, locale: Locale = DEFAULT_LOCALE): string {
  const say = (key: MessageKey, vars: Vars) => translate(locale, key, vars);
  const s = Math.round(seconds);
  if (s < 90) return say("time.seconds", { n: s });
  const rest = s % 60;
  return rest
    ? say("time.minutesSeconds", { m: Math.floor(s / 60), s: rest })
    : say("time.minutes", { n: Math.floor(s / 60) });
}

/**
 * Hur lång tid en hel plan tar. Grovheten är med flit: "≈2 d 4 h" är lika
 * användbart som "52,3 h" och lovar mindre precision än ett estimat med
 * ±hundratals ägg i osäkerhet förtjänar.
 */
export function spanText(seconds: number, locale: Locale = DEFAULT_LOCALE): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "–";
  const say = (key: MessageKey, vars: Vars) => translate(locale, key, vars);
  const min = seconds / 60;
  if (min < 90) return say("time.minutes", { n: Math.round(min) });
  const h = min / 60;
  if (h < 36) return say("time.hours", { n: sv(h, 1) });
  const d = Math.floor(h / 24);
  const rest = Math.round(h - d * 24);
  return rest ? say("time.daysHours", { d, h: rest }) : say("time.days", { n: d });
}
