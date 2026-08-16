/* Dumb: Hittas nya heron – varan, platsen, partnerskillen, expeditionen,
   raiden och avelskombon.

   De ligger här och inte i containern av samma skäl som RoleBits/RecoBits gör
   det: `FindView` äger frågan, urvalet och alla uppslag mot boxen, de här ritar
   bara det den räckt över. Art-chips kommer därför in som färdiga noder – det
   är containern som vet vad som är ägt, vad som går att avla fram och vad ett
   klick ska söka på.

   Formen är hjältebandets (`.fhero`): porträtt/ikon, namn med taggar, faktarader
   och länkar till nästa steg. Nytt här är `.fsrc` – en KÄLLRAD per plats varan
   kommer ifrån, för det var hela poängen med att slå ihop kategorierna: "var får
   jag Flame Organ?" ska svaras en gång, inte i sex chips med sex räknare. */
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useT } from "@/i18n/LocaleContext";
import { formatNumber, type MessageKey } from "@/i18n";
import { ORE_ITEM, type ItemEntry, type Place } from "@/lib/findIndex";
import { itemIconSlug } from "@/lib/itemIcons";
import { soulCost } from "@/lib/souls";
import { igCoord } from "@/lib/worldmap";
import { ELEMENT_GAME_NAME, ELEMENT_ICON, ELEMENT_META } from "@/lib/constants";
import type { ExpeditionSite } from "@/lib/expedition";
import type { RaidInfo } from "@/lib/questsData";
import type { CondenseGain, CondensePlan } from "@/lib/condense";
import { GameIcon, ItemIcon } from "./GameIcon";
import { GainStats, StarLeds, WarnNotes } from "./RecoBits";
import { Tag } from "./PalBits";

/**
 * Faktarad i heron: etikett i kapitäler, värdet under. Delas av alla heron.
 *
 * `wide` ger raden HELA bredden i `.ffacts`-flexen, och det är inte kosmetik:
 * en fakta med en chiplista (arterna som släpper en vara, föräldraparen,
 * koordinaterna) konkurrerar annars om bredden med sina grannar och pressas
 * till en enda smal kolumn – 38 arter blev 38 rader på 150 px. Allt som
 * innehåller `.dpals` eller en mening ska vara `wide`.
 */
export function Fact({ k, wide, stack, children }: {
  k: ReactNode;
  wide?: boolean;
  /** Staplar värdets delar under varandra i stället för på en rad. Behövs när
   *  en fakta har BÅDE en etikett och en mening (skillnamn + beskrivning):
   *  `.fsrc` bär `max-width: 62ch` för läsbarheten, och ett tak klamrar
   *  flex-basis – raden "får plats" bredvid fetstilen i stället för under. */
  stack?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`ffact${wide ? " wide" : ""}${stack ? " stack" : ""}`}>
      <div className="k">{k}</div>
      <div className="v">{children}</div>
    </div>
  );
}

/** Statordningen i IV-frukterna är HP/Attack/Defense – spelets ord. */
const FRUIT_STAT = ["HP", "Attack", "Defense"] as const;

/* ============================================================
   Varan – alla kända källor på ett ställe
   ============================================================ */

export function ItemHero({ entry, slug, summary, dropChips, ranchChips, links }: {
  entry: ItemEntry;
  slug: string | null;
  /** "Släpps av 38 arter — 29 i din box" – står som underrubrik, inte i en
   *  fakta: den sammanfattar chiplistan under och hör ihop med namnet. */
  summary: ReactNode;
  dropChips: ReactNode;
  ranchChips: ReactNode;
  links: ReactNode;
}) {
  const t = useT();
  /* Själsschemat räknas ur souls.ts i stället för att skrivas i katalogen:
     samma tal som Statue of Power-rådgivaren använder, så de kan inte glida
     isär. Rank 1–10 är den billiga halvan, 11–20 kostar bara jättesjälar. */
  const toTen = soulCost(0, 10);
  const toTwenty = soulCost(10, 20);

  return (
    <div className="fhero">
      {slug && <div className="fpor"><ItemIcon slug={slug} size={72} /></div>}
      <div className="fbody">
        <div className="fname">
          <span data-item={entry.item}>{entry.item}</span>
          <Tag kind="info">{t("find.items")}</Tag>
          {entry.use?.kind === "fruit" && <Tag kind="lucky">{t("find.use.fruitTag")}</Tag>}
          {/* "Seeds"/"Buried items" är VÅRA samlingsord för en speltext som
              inte räknar upp varorna – det får inte läsas som ett item-namn. */}
          {entry.ranch.some((r) => r.group) && <Tag kind="cond">{t("best.ranch.group")}</Tag>}
        </div>
        {summary && <div className="fsub">{summary}</div>}
        <div className="ffacts">
          {/* Källorna först som hela rader – de är listor, inte etiketter. */}
          {entry.ranch.length > 0 && (
            <Fact k={t("find.src.ranch")} wide>{ranchChips}</Fact>
          )}
          {entry.drops.length > 0 && (
            <Fact k={t("find.hero.droppedBy")} wide>{dropChips}</Fact>
          )}
          {entry.mine && (
            <Fact k={t("find.src.mine")}>
              <span className="fws">
                {t("find.src.mineBody", { n: entry.mine.nodes })}
              </span>
              <Link className="fchip" href="/map">{t("find.linkMap")}</Link>
            </Fact>
          )}
          {entry.exped.length > 0 && (
            <Fact k={t("find.src.exped")} wide>
              <span className="fsrc">{entry.exped.join(" · ")}</span>
            </Fact>
          )}
          {entry.raids.length > 0 && (
            <Fact k={t("find.src.raid")} wide>
              <span className="fsrc">{entry.raids.join(" · ")}</span>
            </Fact>
          )}
          {entry.prices.length > 0 && (
            <Fact k={t("find.src.vendor")}>
              <span className="fsrc">{entry.prices.join(" / ")}</span>
            </Fact>
          )}
          {entry.material && (
            <Fact k={t("find.src.material")} wide><span className="fsrc">{entry.material}</span></Fact>
          )}
          {entry.use?.kind === "fruit" && (
            <Fact k={t("find.hero.does")} wide>
              {t("find.use.fruit", {
                stat: FRUIT_STAT[entry.use.stat] ?? "", step: entry.use.step, cap: entry.use.cap,
              })}
            </Fact>
          )}
          {entry.use?.kind === "soul" && (
            <Fact k={t("find.hero.does")} wide>
              {t("find.use.soul", {
                s: toTen.s, m: toTen.m, l: toTen.l, g: toTwenty.g,
              })}
            </Fact>
          )}
        </div>
        <div className="hint">{t("find.itemsNote")}</div>
      </div>
      {links}
    </div>
  );
}

/* ============================================================
   Platsen – kartans lager som ett svar
   ============================================================ */

/** Hur många koordinater som skrivs ut innan resten blir "+N till". */
const MAX_SPOTS = 8;

export function PlaceHero({ place, found }: {
  place: Place;
  /** Hittade av gruppens instanser ur saven, eller null när saven inte vet. */
  found: number | null;
}) {
  const t = useT();
  const kindKey: Record<Place["kind"], MessageKey> = {
    tower: "find.place.tower", travel: "find.place.travel", dungeon: "find.place.dungeon",
    camp: "find.place.camp", ore: "find.place.ore", fruit: "find.place.fruit",
  };
  const shown = place.spots.slice(0, MAX_SPOTS);
  const rest = place.spots.length - shown.length;

  return (
    <div className="fhero">
      <div className="fpor fel">
        {/* Malmen får varans egen ikon, slagen upp precis som överallt annars –
            en slug byggd för hand är samma gissning som en påhittad vara.
            Övriga lager har ingen belagd bild och bär sitt typord i stället. */}
        {place.ore
          ? <ItemIcon slug={itemIconSlug(ORE_ITEM[place.ore])} size={54} />
          : <span className="fpkind">{t(kindKey[place.kind])}</span>}
      </div>
      <div className="fbody">
        <div className="fname">
          {place.name}
          <Tag kind="info">{t(kindKey[place.kind])}</Tag>
          {place.lv && (
            <span className="meta">
              {place.lv.min === place.lv.max
                ? `Lv ${place.lv.min}`
                : `Lv ${place.lv.min}–${place.lv.max}`}
            </span>
          )}
        </div>
        <div className="fsub">{t.plural("find.place.count", place.spots.length)}</div>
        <div className="ffacts">
          <Fact k={t("find.place.where")} wide>
            {shown.map((s) => (
              <span key={`${s.x},${s.y}`} className="fcoord num">{igCoord(s.x, s.y)}</span>
            ))}
            {rest > 0 && <span className="meta">{t("find.place.more", { n: rest })}</span>}
          </Fact>
          {/* Bara lager med per-instans-flagga i saven får en status. Läger och
              dungeons har ingen, och att gissa av-bockning är precis vad kartan
              redan vägrar göra. */}
          {found !== null && (
            <Fact k={t("find.place.found")}>
              <b className={found >= place.spots.length ? "fdone" : "ftodo"}>
                {t("find.place.foundBody", { n: found, total: place.spots.length })}
              </b>
            </Fact>
          )}
        </div>
        <div className="hint">{t("find.place.note")}</div>
      </div>
      <div className="flinks">
        <Link className="fchip" href="/map">{t("find.linkMap")}</Link>
      </div>
    </div>
  );
}

/* ============================================================
   Partnerskillen – 298 arter som bara Rollerna kunde läsa
   ============================================================ */

export function SkillHero({ skill, desc, tags, portrait, name, deck, links }: {
  skill: string;
  desc: string;
  tags: string[];
  portrait: ReactNode;
  name: ReactNode;
  deck: ReactNode;
  links: ReactNode;
}) {
  const t = useT();
  /* Taggarna är `partnerSkills.json`:s grova kategorisering ur triggerfrasen.
     En tagg vi inte har ord för ritas inte alls – hellre tyst än en rå kod. */
  const tagKey: Record<string, MessageKey> = {
    mount: "find.skill.mount", party: "find.skill.party", base: "find.skill.base",
    ranch: "find.skill.ranch", active: "find.skill.active",
  };
  return (
    <div className="fhero">
      <div className="fpor">{portrait}</div>
      <div className="fbody">
        <div className="fname">
          {skill}
          {tags.map((tag) => {
            const key = tagKey[tag];
            return key ? <Tag key={tag} kind="info">{t(key)}</Tag> : null;
          })}
        </div>
        <div className="fsub">{name}{deck}</div>
        <div className="ffacts">
          <Fact k={t("find.hero.does")} wide>{desc}</Fact>
        </div>
        {/* Intervallen i texten är nivå 1–5 på skillen, inte en osäkerhet. */}
        <div className="hint">{t("find.skill.note")}</div>
      </div>
      {links}
    </div>
  );
}

/* ============================================================
   Expeditionen – belöningarna som ingen droptabell har
   ============================================================ */

export function ExpedHero({ site, unlocked, squadFp }: {
  site: ExpeditionSite;
  /** Ur savens towerClears, eller null när saven inte är inläst. */
  unlocked: boolean | null;
  /** Boxens ≈FP bland de lediga, eller null utan save. */
  squadFp: number | null;
}) {
  const t = useT();
  const enough = squadFp !== null && squadFp >= site.fp;
  return (
    <div
      className="fhero"
      /* Elementkravet färgar bandet – samma regel som pals: färgen är
         information. Sajter utan krav får temats accent, inte en påhittad. */
      style={site.need ? { "--elc": ELEMENT_META[site.need.el]?.color } as CSSProperties : undefined}
    >
      <div className="fpor fel">
        {/* Kravets egen spelikon, inte en lånad glyf: expeditionerna har ingen
            egen bild i spelet, men elementet HAR en och är det som avgör om
            laget duger. Utan krav står ordet i stället för en gissad bild. */}
        {site.need
          ? <GameIcon name={ELEMENT_ICON[site.need.el]} size={50} />
          : <span className="fpkind">{t("find.exped.anyEl")}</span>}
      </div>
      <div className="fbody">
        <div className="fname">
          {site.name}
          {site.hard && <Tag kind="cond">{t("find.exped.hard")}</Tag>}
          <span className="meta">{t("find.exped.minutes", { n: site.minutes })}</span>
        </div>
        <div className="ffacts">
          <Fact k={t("find.exped.fp")}>
            <b className="num">≈{formatNumber(site.fp, t.locale)}</b>
            {squadFp !== null && (
              <b className={enough ? "fdone" : "ftodo"}>
                {enough ? t("find.exped.enough", { fp: squadFp }) : t("find.exped.short", { fp: squadFp })}
              </b>
            )}
          </Fact>
          {site.need && (
            <Fact k={t("find.exped.need")}>
              <span className="fws">
                <GameIcon name={ELEMENT_ICON[site.need.el]} size={17} />
                {ELEMENT_GAME_NAME[site.need.el]} <b className="num">×{site.need.n}</b>
              </span>
            </Fact>
          )}
          <Fact k={t("find.exped.rewards")} wide><span className="fsrc">{site.rewards}</span></Fact>
          {unlocked !== null && (
            <Fact k={t("find.exped.unlock")}>
              <b className={unlocked ? "fdone" : "ftodo"}>
                {unlocked ? t("find.exped.open") : t("find.exped.locked")}
              </b>
            </Fact>
          )}
        </div>
        <div className="hint">{t("find.exped.note")}</div>
      </div>
      <div className="flinks">
        <Link className="fchip" href="/recommendations#rh-box">{t("find.exped.link")}</Link>
      </div>
    </div>
  );
}

/* ============================================================
   Raiden
   ============================================================ */

export function RaidHero({ raid, portrait, cleared, links }: {
  raid: RaidInfo;
  portrait: ReactNode;
  /** Antal nedlägg ur saven, eller null när saven inte är inläst. */
  cleared: number | null;
  links: ReactNode;
}) {
  const t = useT();
  return (
    <div className="fhero">
      {portrait && <div className="fpor">{portrait}</div>}
      <div className="fbody">
        <div className="fname">
          {raid.name}
          <span className="meta">Lv {raid.lv}{raid.ultraLv > 0 && ` · Ultra Lv ${raid.ultraLv}`}</span>
          {raid.elements.length === 0 && <Tag kind="cond">{t("find.raid.typeless")}</Tag>}
          {raid.elements.map((e) => (
            <span key={e} className="el"><GameIcon name={ELEMENT_ICON[e]} size={17} /></span>
          ))}
        </div>
        <div className="ffacts">
          <Fact k={t("find.raid.summon")} wide><span className="fsrc">{raid.summon}</span></Fact>
          <Fact k={t("find.raid.drops")} wide><span className="fsrc">{raid.drops}</span></Fact>
          {cleared !== null && (
            <Fact k={t("find.raid.cleared")}>
              <b className={cleared > 0 ? "fdone" : "ftodo"}>
                {cleared > 0 ? t("find.raid.clearedN", { n: cleared }) : t("find.raid.never")}
              </b>
            </Fact>
          )}
        </div>
        <div className="hint">{t("find.raid.note")}</div>
      </div>
      {links}
    </div>
  );
}

/* ============================================================
   Avelskombon – "vad blir A × B?"
   ============================================================ */

export function ComboHero({ parents, results, links }: {
  parents: ReactNode;
  /** Färdiga barn-noder; tom lista = paret kan inte avla. */
  results: ReactNode[];
  links: ReactNode;
}) {
  const t = useT();
  return (
    <div className="fhero">
      <div className="fbody">
        <div className="fname">{parents}</div>
        <div className="ffacts">
          <Fact k={t("find.combo.child")} wide>
            {results.length > 0 ? results : <span className="ftodo">{t("find.combo.none")}</span>}
          </Fact>
        </div>
        {/* En legendar KAN paras med vad som helst – man kan bara inte få en
            legendar ur ägget. Se "Domain gotchas" i CLAUDE.md. */}
        <div className="hint">{t("find.combo.note")}</div>
      </div>
      {links}
    </div>
  );
}

/* ============================================================
   Kondensering per art – "vilken av mina ska matas?"
   ============================================================ */

/**
 * Kondenseringsrådet för EN art, i artheron.
 *
 * Rollernas kö rankar arter mot varandra: den svarar "vad ska jag göra
 * härnäst?" och visar bara det som ligger högst upp. Frågan här är den omvända
 * och lika vanlig – *"jag har tolv Lamball, vilken behåller jag?"* (Kens önskan
 * aug 2026) – och den går inte att ställa till en rankning. Samma modell
 * (`planCondense`) svarar på båda, så sidorna kan aldrig säga emot varandra.
 *
 * Tre saker som är valda:
 *
 * 1. **Keeperen är hoverbar** (`data-pal`): "behåll den här" utan att kunna se
 *    vilken av tolv identiska det är vore ett råd man inte kan följa. Rutan ger
 *    IV, passiver och platsen i lådan.
 * 2. **Domen står som chip, inte som färg.** `now` är det enda som är en
 *    uppmaning; `hold` och `max` är svar på frågan lika mycket – "du är klar"
 *    och "du behöver N till" är precis vad man kom för att få veta.
 * 3. **Utan plan står SKÄLET.** `planCondense` hoppar över en art vars alla
 *    exemplar är sparade eller bokade av avelsplanen, och en tom ruta hade sett
 *    ut som att appen inte vet. Den vet – svaret är "ingenting att mata".
 */
export function SpeciesCondense({ plan, gain, keeper, owned, kept, booked }: {
  plan: CondensePlan | null;
  gain: CondenseGain | null;
  /** Färdig nod för exemplaret man behåller – containern äger porträttet. */
  keeper: ReactNode;
  owned: number;
  kept: number;
  booked: number;
}) {
  const t = useT();
  return (
    <div className="fcond">
      <div className="fcondhd">
        <span className="k">{t("reco.queue.title")}</span>
        {plan && <StarLeds from={plan.fromStars} to={plan.reach} />}
        {plan && (
          <span className={`fcv v-${plan.verdict}`}>
            {plan.verdict === "now" ? t("find.cond.now")
              : plan.verdict === "max" ? t("find.cond.max")
                : t("find.cond.need", { n: plan.missing, star: plan.reach + 1 })}
          </span>
        )}
      </div>

      {plan ? (
        <>
          <div className="fcline">
            <span className="rsk">{t("reco.row.youKeep")}</span>
            {keeper}
          </div>
          {plan.feed > 0 && (
            <div className="fcline">
              <span className="rsk">{t("find.cond.feed")}</span>
              <b className="num">{t("find.cond.feedN", { n: plan.feed, of: owned })}</b>
              {gain && <GainStats gain={gain} />}
            </div>
          )}
          {/* Tre olika meningar, aldrig hopklistrade fragment: `reco.row.leftover`
              börjar med " · " för att hänga på vinstraden, och stod den ensam
              blev det "· 3 duplicates left overNothing to feed yet". Och vid 4★
              finns inget "nästa stjärna" – texten sa "0 more for 5★", ett steg
              spelet inte har. */}
          <p className="fcfact">
            {plan.feed > 0 && gain
              ? <>
                {t("reco.row.fact", { pct: gain.pct, slots: plan.feed })}
                {plan.leftover > 0 && t("reco.row.leftover", { n: plan.leftover })}
              </>
              : plan.verdict === "max"
                ? t("find.cond.maxLine", { n: plan.fodder.length })
                : t("find.cond.nothingYet", { n: plan.missing, star: plan.reach + 1 })}
          </p>
          <WarnNotes plan={plan} inline />
        </>
      ) : (
        <p className="fcnone">
          {booked > 0
            ? t("find.cond.allBooked", { n: booked, owned })
            : kept >= owned
              ? t("find.cond.allKept", { n: owned })
              : t("find.cond.noneOwned")}
        </p>
      )}
    </div>
  );
}
