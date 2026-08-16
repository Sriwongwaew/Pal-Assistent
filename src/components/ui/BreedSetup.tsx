/* Dumb: uppställningen som gör äggen snabbare – bas, föräldrar, party.
 *
 * Öppnas som MODAL från Verktygs-panelen på /breeding (Kens rättning aug 2026:
 * den gamla hopfällda details-panelen, CSS-lyft till ruta, blev en hoptryckt
 * remsa). Komponenten renderar modalens kropp med en statisk huvudrad
 * (`.bshd`) som bär samma värde som förr ("1,4× · 217 s") – stängningen äger
 * modalen. Takten står dessutom alltid i Verktygs-knappen, så innehållet här
 * kostar ingenting förrän man ber om det.
 *
 * **Ordningen är gratis först, kostsamt sist, och det är inte kosmetik.**
 * Bas → party är pals man bara ställer på rätt plats: takten stiger och
 * ingenting annat händer. Passiverna (Philanthropist, Insomnia) ligger sist,
 * streckade och med sitt netto uträknat, eftersom de måste sitta på just de två
 * man parar – alltså i arvspoolen. Låg de kvar mitt i listan lästes de som
 * nästa punkt att beta av, och vid fyra önskade passiver är det direkt felaktigt
 * råd: `philanthropistVerdict` säger 0,5× netto. Flytta dem inte tillbaka upp,
 * och lägg dem inte i "N kvar". */
import { useT } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n";
import { useRichT } from "@/i18n/rich";
import type { CSSProperties, ReactNode } from "react";
import type { BreedSetup, PartnerPal, PoolVerdict } from "@/lib/breedRate";
import {
  CAP_FREE, CAP_RATE, alphaChance, bralohaBonus, dynamoffCut, eggSeconds,
  eggTimeText, grintaleExtra, philanthropistVerdict, speedText,
} from "@/lib/breedRate";
import type { CakeAdvice, CakePlan } from "@/lib/cake";
import { itemIconSlug } from "@/lib/itemIcons";
import type { Species } from "@/lib/types";
import { ItemIcon } from "./GameIcon";
import { elementColor } from "./PalHero";
import { PassiveRow } from "./PassiveRow";
import { DeckNo, ElementIcons, SpeciesIcon, Stars, Tag } from "./PalBits";

const pct = (n: number) => `${Math.round(n * 100)} %`;

/** Raden för en pal vars partnerskill gör jobbet. Elementets färg tonar raden
 *  som allt annat i Habitat – tonen kommer från arten, aldrig hårdkodad. */
function PalRow({
  sp, row, where, skill, effect, next, onPick, offRate,
}: {
  sp: Species | null;
  row: PartnerPal;
  where: MessageKey;
  skill: string;
  effect: string;
  next: ReactNode;
  onPick?: () => void;
  /** Effekten är verklig men ligger utanför takten – siffran tappar accenten
   *  så den inte läses som en del av multiplikatorn högst upp. */
  offRate?: boolean;
}) {
  const t = useT();
  if (!sp) return null;
  const body = (
    <>
      <SpeciesIcon sp={sp} size={34} radius={9} />
      <span className="nm">
        {sp.name}
        <ElementIcons sp={sp} size={15} />
        <DeckNo sp={sp} />
      </span>
      {row.owned > 0
        ? <Tag kind="keep">{t("setup.ownedN", { n: row.owned })}</Tag>
        : <Tag kind="cond">{t("best.own.catch")}</Tag>}
      {row.owned > 0 && (row.placed
        ? <Tag kind="info">{t(where)} ✓</Tag>
        : <Tag kind="cond">{t("setup.moveTo", { where: t(where).toLowerCase() })}</Tag>)}
      <Stars count={row.stars} />
      <span className={offRate ? "eff off" : "eff"}>{effect}</span>
    </>
  );
  return (
    <div className="bsrow" style={{ "--elc": elementColor(sp) } as CSSProperties}>
      {onPick
        ? <button type="button" className="bshit" onClick={onPick} title={t("setup.planSpecies", { name: sp.name })}>{body}</button>
        : <span className="bshit">{body}</span>}
      <div className="hint"><b>{skill}</b> · {next}</div>
    </div>
  );
}

/** Takt mot ägg, i klartext. Raden är hela skälet till att Philanthropist ligger
 *  sist i panelen i stället för högst upp: den är en vinst i takt och en förlust
 *  i odds, och vilken som väger tyngst avgörs av hur många passiver planen
 *  siktar på – inte av något användaren kan gissa. */
function PoolNote({ v }: { v: PoolVerdict }) {
  const t = useT();
  const rich = useRichT();
  const net = <b>{speedText(v.net)}</b>;
  // "dina 1 önskade passiver" är inte svenska, och raden syns vid varje val.
  const yours = v.wanted === 1 ? t("setup.yourOne") : t("setup.yourMany", { n: v.wanted });
  if (v.wanted === 0) {
    return <>{rich("setup.poolNone", { net, iv: <b>IV</b> })}</>;
  }
  const trade = <>
    {" "}{rich("setup.poolTrade", {
      clean: <b>{pct(v.cleanOdds)}</b>,
      dirty: <b>{pct(v.dirtyOdds)}</b>,
      eggs: <b>{t("setup.moreEggs", { factor: speedText(v.eggFactor) })}</b>,
      speed: <b>{t("setup.fasterRate", { factor: speedText(v.speedFactor) })}</b>,
    })}
  </>;
  return v.net < 1
    ? <>
        <b>{t("setup.poolNotWorth", { yours })}</b>{" "}
        {t("setup.poolNotWorthBody")}{trade}{" "}
        {rich("setup.poolNotWorthTail", { net, three: <b>{t("setup.threeOrFewer")}</b> })}
      </>
    : <>
        <b>{t("setup.poolWorth", { yours })}</b>{" "}
        {rich("setup.poolWorthNet", { net })}{trade}{" "}
        {rich("setup.poolWorthTail", { four: <b>{t("setup.four")}</b> })}
      </>;
}

/**
 * Tårtan: vad planens ägg kostar i material, och vem som lägger det.
 *
 * Panelen har alltid svarat på hur FORT äggen kommer. Det här är den andra
 * halvan av samma tal – ett ägg kostar en tårta, så en plan på 239 ägg är 239
 * tårtor. Den ligger sist och med egen rubrik: allt ovanför handlar om takt,
 * det här om inköpslista, och att blanda dem hade gjort båda otydliga.
 *
 * Tre saker som är valda:
 *
 * 1. **Flour hänger under sin egen rad som "= N Wheat"**, aldrig som en egen
 *    ingrediens. Man behöver en kvarn, inte en till åker, och slås Wheat ihop
 *    med resten försvinner den skillnaden.
 * 2. **Ranch-arten står med det du äger OCH hur många som står i en bas.**
 *    Tre Mozzarina i Palboxen producerar ingenting; skillnaden är hela rådet.
 * 3. **"En tårta per ägg" är communityns siffra** – spelets text säger bara att
 *    tårta krävs. Därför ≈, och därför står förbehållet i foten.
 */
function CakeBill({ plan, advice, baseOdds, speciesOf, onPick }: {
  plan: CakePlan;
  advice: CakeAdvice;
  /** Chansen per ägg SOM DET ÄR, utan tårtans hjälp. null = ingen kläckare än. */
  baseOdds: number | null;
  speciesOf: (i: number) => Species;
  onPick: (cake: string) => void;
}) {
  const t = useT();
  const rich = useRichT();
  return (
    <div className="bscake">
      {/* RÅDET först: vilken tårta planen pekar på, och varför – i spelets egna
          ord, som ligger i hover-rutan på varje namn. Ingen procent: spelet
          säger "more likely" och aldrig hur mycket. */}
      <p className="bscakeadv">
        {rich(`cake.why.${advice.because}` as const, {
          cake: <b className="pick" data-item={advice.pick.cake}>{advice.pick.cake}</b>,
        })}
        {/* "Hur stor chans då?" – det ärliga svaret är utgångsläget, alltså vad
            kläckaren står på UTAN tårtan. Spelet säger bara att tårtan gör talet
            större, aldrig hur mycket, och ingen datamine-källa vi använder bär
            parametern. Ett påhittat procenttal här hade sett precis lika
            trovärdigt ut som planens riktiga odds – och de står bredvid
            varandra på samma sida. */}
        {advice.because === "passives" && baseOdds !== null && (
          <> {rich("cake.oddsNow", {
            odds: <b>{`${Math.round(baseOdds * 1000) / 10} %`}</b>,
          })}</>
        )}
      </p>
      <div className="bscakepick">
        {[advice.pick, ...advice.rest].map((e) => (
          <button
            key={e.cake}
            type="button"
            className={`bscakebtn${e.cake === plan.cake ? " on" : ""}${e.cake === advice.pick.cake ? " rec" : ""}`}
            onClick={() => onPick(e.cake)}
            data-item={e.cake}
          >
            <ItemIcon slug={itemIconSlug(e.cake)} size={20} />
            {e.cake}
            {e.eggs > 1 && <span className="x2">×{e.eggs}</span>}
          </button>
        ))}
      </div>

      <div className="bscakehd">
        <ItemIcon slug={itemIconSlug(plan.cake)} size={30} />
        <b className="num">≈{plan.cakes}</b>
        <span className="nm" data-item={plan.cake}>{plan.cake}</span>
        <span className="meta">
          {plan.perLay > 1
            ? t("cake.forEggsX", { n: Math.ceil(plan.eggs), x: plan.perLay })
            : t("cake.forEggs", { n: Math.ceil(plan.eggs) })}
        </span>
      </div>
      <div className="bscakemats">
        {plan.mats.map((m) => {
          const best = m.ranch[0];
          const sp = best ? speciesOf(best.s) : null;
          return (
            <div key={m.item} className="bscm">
              <ItemIcon slug={itemIconSlug(m.item)} size={20} />
              <span className="nm" data-item={m.item}>{m.item}</span>
              <b className="num">{m.qty}</b>
              {m.from && (
                <span className="sub num" data-item={m.from.item}>
                  = {m.from.qty} {m.from.item}
                </span>
              )}
              {sp && best && (
                <span className={`src${best.owned > 0 ? " has" : ""}`}>
                  <SpeciesIcon sp={sp} size={18} radius={6} />
                  {sp.name}
                  <span className="meta">
                    {best.owned === 0
                      ? t("cake.ownNone")
                      : best.atBase > 0
                        ? t("cake.ownAtBase", { n: best.owned, base: best.atBase })
                        : t("cake.ownStored", { n: best.owned })}
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="hint">{t("cake.note")}</div>
    </div>
  );
}

export function BreedSetupPanel({
  setup, wanted, speciesOf, passiveName, passiveTier, onPickTarget, cake,
  cakeAdvice, cakeBaseOdds = null, onPickCake,
}: {
  setup: BreedSetup;
  /** Antal önskade passiver planen siktar på – avgör Philanthropists värde. */
  wanted: number;
  speciesOf: (i: number) => Species;
  passiveName: (id: string) => string;
  passiveTier: (id: string) => number;
  onPickTarget?: (s: number) => void;
  /** Materialkostnaden för planens ägg. null = ingen plan att räkna på. */
  cake?: CakePlan | null;
  /** Vilken tårta planen pekar på, och alternativen. */
  cakeAdvice?: CakeAdvice | null;
  /** Planens chans per ägg utan tårtans hjälp – rådets enda ärliga tal. */
  cakeBaseOdds?: number | null;
  /** Byter tårta i räkningen. Valet är spelarens – rådet är ett råd. */
  onPickCake?: (cake: string) => void;
}) {
  const t = useT();
  const rich = useRichT();
  const { braloha, dynamoff, grintale, broncherry, broncherryAqua, philanthropist, nocturnal } = setup;
  const verdict = philanthropistVerdict(wanted, braloha.placed ? braloha.stars : null);
  const spOf = (row: PartnerPal) => (row.s === null ? null : speciesOf(row.s));
  const pick = (row: PartnerPal) =>
    onPickTarget && row.s !== null ? () => onPickTarget(row.s as number) : undefined;

  /* Vad kondenseringen är värd, i den enhet raden handlar om. Att säga "2★"
     räcker inte – poängen är procenten, och den är inte linjär i stjärnor. */
  const bralohaNext = braloha.owned === 0
    ? rich("setup.bralohaNone", { now: <b>{pct(bralohaBonus(0))}</b>, max: <b>{pct(bralohaBonus(4))}</b> })
    : braloha.reach > braloha.stars
      ? rich("setup.bralohaReach", {
        now: <b>{pct(bralohaBonus(braloha.stars))}</b>,
        dupes: braloha.owned - 1,
        star: <b>{braloha.reach}★</b>,
        then: <b>{pct(bralohaBonus(braloha.reach))}</b>,
      })
      : <>
        {rich("setup.bralohaNow", { now: <b>{pct(bralohaBonus(braloha.stars))}</b> })}
        {braloha.stars < 4 && t("setup.bralohaAtFour", { max: pct(bralohaBonus(4)) })}
      </>;

  return (
    <section className="bsetup asmodal">
      <div className="bshd">
        <span className="ttl">{t("setup.title")}</span>
        <span className="num">{speedText(setup.rate)}</span>
        <span className="meta">{t("setup.perEgg", { time: eggTimeText(setup.seconds) })}</span>
        {setup.todo > 0
          ? <Tag kind="cond">{t("setup.todo", { n: setup.todo })}</Tag>
          : <Tag kind="keep">{t("setup.full")}</Tag>}
      </div>

      {/* Mätaren står mot CAP_FREE, inte mot spelets absoluta tak. Skälet är
          inte optimism: CAP_RATE förutsätter Philanthropist på båda föräldrarna,
          alltså skräp i arvspoolen, och det är inte ett mål man ska mäta sig mot
          när planen räknat med rena föräldrar. Här är allt gratis. */}
      <div className="bsmeter">
        <div className="bar">
          <i style={{ width: `${Math.min(100, (setup.rate / CAP_FREE) * 100)}%` }} />
          {/* Vad Braloha ensam skulle ge efter kondensering – skuggan visar hur
              nära man är utan att avla in något alls. */}
          {setup.reachRate > setup.rate && (
            <u style={{ width: `${Math.min(100, (setup.reachRate / CAP_FREE) * 100)}%` }} />
          )}
        </div>
        <div className="hint">
          {rich("setup.cap", {
            free: <b>{t("setup.capFree")}</b>,
            rate: <b>{speedText(CAP_FREE)}</b>,
            time: eggTimeText(eggSeconds(CAP_FREE)),
            capRate: speedText(CAP_RATE),
            capTime: eggTimeText(eggSeconds(CAP_RATE)),
          })}
        </div>
      </div>

      <div className="bsgrp">{t("setup.atBase")}</div>
      <PalRow
        sp={spOf(braloha)} row={braloha} where="setup.atBaseTag" skill="Balmy Weather"
        effect={braloha.placed ? `+${pct(bralohaBonus(braloha.stars))}` : "—"}
        next={bralohaNext} onPick={pick(braloha)}
      />
      <PalRow
        sp={spOf(dynamoff)} row={dynamoff} where="setup.atBaseTag" skill="Electro-Massage Incubation"
        effect={dynamoff.placed ? `−${pct(dynamoffCut(dynamoff))}` : "—"} offRate
        next={rich("setup.dynamoff", {
          hatch: <b>{t("setup.hatching")}</b>,
          now: <b>−{pct(dynamoffCut(dynamoff, 0))}</b>,
          max: <b>−{pct(dynamoffCut(dynamoff, 4))}</b>,
        })}
        onPick={pick(dynamoff)}
      />

      <div className="bsgrp">{t("setup.inParty")}</div>
      <PalRow
        sp={spOf(grintale)} row={grintale} where="setup.inPartyTag" skill="Glaring Cat's Eye"
        effect={grintale.placed ? speedText(1 + grintaleExtra()) : "—"}
        next={rich("setup.grintale", {
          chance: <b>{pct(grintaleExtra())}</b>,
          more: <b>{t("setup.moreEggs", { factor: speedText(1 + grintaleExtra()) })}</b>,
          roll: <b>{t("setup.ownRoll")}</b>,
        })}
        onPick={pick(grintale)}
      />
      <PalRow
        sp={spOf(broncherryAqua)} row={broncherryAqua} where="setup.inPartyTag" skill="Purity's Full Bloom"
        effect={pct(alphaChance(broncherryAqua, true))}
        next={rich("setup.broncherryAqua", {
          alpha: <b>{t("setup.alphaEgg")}</b>,
          now: pct(alphaChance(broncherryAqua, true)),
          max: <b>{pct(alphaChance(broncherryAqua, true, 4))}</b>,
        })}
        onPick={pick(broncherryAqua)}
      />
      <PalRow
        sp={spOf(broncherry)} row={broncherry} where="setup.inPartyTag" skill="Love's First Blossom"
        effect={pct(alphaChance(broncherry, false))}
        next={rich("setup.broncherry", {
          now: pct(alphaChance(broncherry, false)),
          max: <b>{pct(alphaChance(broncherry, false, 4))}</b>,
        })}
        onPick={pick(broncherry)}
      />

      {/* Passiverna ligger SIST och dämpade, och det är den viktigaste
          ordningsfrågan i panelen. Allt ovanför är gratis: ställ en pal på rätt
          plats och takten stiger. De två här nedan måste sitta på just de två
          man parar, alltså i arvspoolen – de köper takt med odds. Låg de kvar i
          mitten lästes de som nästa punkt att beta av, och vid fyra önskade
          passiver är det ett felaktigt råd (se PoolNote). */}
      <div className="bsgrp">{t("setup.passivesGroup")}</div>
      <div className="hint bslead">
        {rich("setup.passivesLead", {
          two: <b>{t("setup.theTwo")}</b>,
          pool: <b>{t("setup.pool")}</b>,
          cost: <b>{t("setup.costSomething")}</b>,
        })}
      </div>
      <div className="bsrow pv bsopt">
        <PassiveRow id={philanthropist.id} name={passiveName(philanthropist.id)} tier={passiveTier(philanthropist.id)} />
        {/* Siffran är NETTOT, inte takthöjningen. Här stod först speedFactor,
            och det blev direkt vilseledande: raden visade "2,4×" i accent medan
            texten under sa att den var en förlust. Det stora talet är det ögat
            landar på, så det måste vara det som avgör – och accenten tas bort när
            nettot är under 1, precis som Dynamoffs off-axel-siffra. */}
        <span className={verdict.net < 1 ? "eff off" : "eff"}>{speedText(verdict.net)}</span>
        <div className="hint">
          <PoolNote v={verdict} />{" "}
          {philanthropist.carriers > 0
            ? rich("setup.carriersAnyway", { n: <b>{philanthropist.carriers}</b> })
            : t("setup.noCarrier")}
        </div>
      </div>
      <div className="bsrow pv bsopt">
        <PassiveRow id={nocturnal.id} name={passiveName(nocturnal.id)} tier={passiveTier(nocturnal.id)} />
        {/* Dämpad med flit: Insomnia har ingen uppmätt siffra, och en etikett i
            samma accent som de riktiga procenten hade fått den att se ut som en. */}
        <span className="eff txt">{t("setup.nightShift")}</span>
        <div className="hint">
          {rich("setup.nocturnal", { cost: <b>{t("setup.nocturnalCost")}</b> })}{" "}
          {nocturnal.carriers > 0 && rich("setup.carriers", { n: <b>{nocturnal.carriers}</b> })}
        </div>
      </div>

      {/* Tårtan sist och med egen rubrik: allt ovanför handlar om TAKT, det här
          om vad äggen kostar i material. Två frågor, två avdelningar. */}
      {cake && cakeAdvice && (
        <>
          <div className="bsgrp">{t("cake.group")}</div>
          <CakeBill
            plan={cake}
            advice={cakeAdvice}
            baseOdds={cakeBaseOdds}
            speciesOf={speciesOf}
            onPick={(c) => onPickCake?.(c)}
          />
        </>
      )}

      {/* Den enda rena texten i sektionen, och den som sparar mest tid: allt
          nedan ser ut som det borde hjälpa och gör det inte. */}
      <div className="bswarn">
        <b>{t("setup.noEffectTitle")}</b>{" "}
        {rich("setup.noEffectBody", { parents: <i>{t("setup.parents")}</i> })}
      </div>
    </section>
  );
}
