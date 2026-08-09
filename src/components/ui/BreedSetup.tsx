/* Dumb: uppställningen som gör äggen snabbare – bas, föräldrar, party.
 *
 * Sektionen är hopfälld som standard och rubriken bär hela värdet ("1,2× ·
 * 3 kvar"), så den kostar en rad tills man vill ha den. Det är avsiktligt:
 * innehållet är samma varje gång man läser det, till skillnad från planen
 * under, och en permanent utfälld guide hade tagit plats från det man kom hit
 * för att göra.
 *
 * Men hopfälld som standard betyder att greppet måste syntas: rubriken är
 * därför en egen list med ram, botten, en chevron i accentfärg och ordet
 * VISA/DÖLJ (`.bsetup > summary` i globals.css). Banta inte tillbaka den till
 * en pil i --muted – då finns hela avelsbasen inte för den som inte råkar
 * klicka.
 *
 * **Ordningen är gratis först, kostsamt sist, och det är inte kosmetik.**
 * Bas → party är pals man bara ställer på rätt plats: takten stiger och
 * ingenting annat händer. Passiverna (Philanthropist, Insomnia) ligger sist,
 * streckade och med sitt netto uträknat, eftersom de måste sitta på just de två
 * man parar – alltså i arvspoolen. Låg de kvar mitt i listan lästes de som
 * nästa punkt att beta av, och vid fyra önskade passiver är det direkt felaktigt
 * råd: `philanthropistVerdict` säger 0,5× netto. Flytta dem inte tillbaka upp,
 * och lägg dem inte i "N kvar". */
import type { CSSProperties, ReactNode } from "react";
import type { BreedSetup, PartnerPal, PoolVerdict } from "@/lib/breedRate";
import {
  CAP_FREE, CAP_RATE, alphaChance, bralohaBonus, dynamoffCut, eggSeconds, eggSpeed,
  eggTimeText, grintaleExtra, philanthropistVerdict, speedText,
} from "@/lib/breedRate";
import type { Species } from "@/lib/types";
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
  where: string;
  skill: string;
  effect: string;
  next: ReactNode;
  onPick?: () => void;
  /** Effekten är verklig men ligger utanför takten – siffran tappar accenten
   *  så den inte läses som en del av multiplikatorn högst upp. */
  offRate?: boolean;
}) {
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
        ? <Tag kind="keep">ÄGD ×{row.owned}</Tag>
        : <Tag kind="cond">FÅNGA</Tag>}
      {row.owned > 0 && (row.placed
        ? <Tag kind="info">{where} ✓</Tag>
        : <Tag kind="cond">flytta {where.toLowerCase()}</Tag>)}
      <Stars count={row.stars} />
      <span className={offRate ? "eff off" : "eff"}>{effect}</span>
    </>
  );
  return (
    <div className="bsrow" style={{ "--elc": elementColor(sp) } as CSSProperties}>
      {onPick
        ? <button type="button" className="bshit" onClick={onPick} title={`Planera ${sp.name}`}>{body}</button>
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
  const net = <b>{speedText(v.net)}</b>;
  // "dina 1 önskade passiver" är inte svenska, och raden syns vid varje val.
  const yours = v.wanted === 1 ? "din enda önskade passiv" : `dina ${v.wanted} önskade passiver`;
  if (v.wanted === 0) {
    return (
      <>
        Du har inga önskade passiver, så ingenting av den hamnar i vägen:{" "}
        netto {net}. Jagar du bara <b>IV</b> är den alltså gratis – IV ärvs
        oberoende av passiver.
      </>
    );
  }
  const trade = <>
    {" "}Sista steget går <b>{pct(v.cleanOdds)}</b> → <b>{pct(v.dirtyOdds)}</b> per ägg, alltså{" "}
    <b>{speedText(v.eggFactor)} fler ägg</b>, mot <b>{speedText(v.speedFactor)} snabbare</b> takt.
  </>;
  return v.net < 1
    ? <>
        <b>Lönar sig inte med {yours}.</b> Den sitter på de två du
        parar, alltså i arvspoolen, och där är den skräp.{trade} Netto {net} – låt den vara.
        Den lönar sig vid <b>tre önskade eller färre</b>, och är gratis i ren IV-jakt.
      </>
    : <>
        <b>Lönar sig med {yours}:</b> netto {net}.{trade}{" "}
        Vid <b>fyra</b> önskade vänder det till en förlust – poolen blir för trång.
      </>;
}

export function BreedSetupPanel({
  setup, wanted, speciesOf, passiveName, passiveTier, onPickTarget,
}: {
  setup: BreedSetup;
  /** Antal önskade passiver planen siktar på – avgör Philanthropists värde. */
  wanted: number;
  speciesOf: (i: number) => Species;
  passiveName: (id: string) => string;
  passiveTier: (id: string) => number;
  onPickTarget?: (s: number) => void;
}) {
  const { braloha, dynamoff, grintale, broncherry, broncherryAqua, philanthropist, nocturnal } = setup;
  const verdict = philanthropistVerdict(wanted, braloha.placed ? braloha.stars : null);
  const spOf = (row: PartnerPal) => (row.s === null ? null : speciesOf(row.s));
  const pick = (row: PartnerPal) =>
    onPickTarget && row.s !== null ? () => onPickTarget(row.s as number) : undefined;

  /* Vad kondenseringen är värd, i den enhet raden handlar om. Att säga "2★"
     räcker inte – poängen är procenten, och den är inte linjär i stjärnor. */
  const bralohaNext = braloha.owned === 0
    ? <>Ger <b>{pct(bralohaBonus(0))}</b> direkt, <b>{pct(bralohaBonus(4))}</b> vid 4★.</>
    : braloha.reach > braloha.stars
      ? <>
          Nu <b>{pct(bralohaBonus(braloha.stars))}</b> – dina {braloha.owned - 1} dubbletter räcker
          till <b>{braloha.reach}★</b> och <b>{pct(bralohaBonus(braloha.reach))}</b>.
        </>
      : <>Ger <b>{pct(bralohaBonus(braloha.stars))}</b>{braloha.stars < 4 && <> · {pct(bralohaBonus(4))} vid 4★</>}.</>;

  return (
    <details className="bsetup">
      <summary>
        <span className="ttl">Avelsbas</span>
        <span className="num">{speedText(setup.rate)}</span>
        <span className="meta">≈{eggTimeText(setup.seconds)} per ägg</span>
        {setup.todo > 0
          ? <Tag kind="cond">{setup.todo} kvar</Tag>
          : <Tag kind="keep">full uppställning</Tag>}
      </summary>

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
          Taket <b>utan att röra oddsen</b> är <b>{speedText(CAP_FREE)}</b> =
          ≈{eggTimeText(eggSeconds(CAP_FREE))} per ägg: en 4★ Braloha i basen och Grintale
          i partyt. Philanthropist på båda föräldrarna tar det till{" "}
          {speedText(CAP_RATE)} (≈{eggTimeText(eggSeconds(CAP_RATE))}) men lägger sig i
          arvspoolen – se längst ner.
        </div>
      </div>

      <div className="bsgrp">I basen</div>
      <PalRow
        sp={spOf(braloha)} row={braloha} where="I BASEN" skill="Balmy Weather"
        effect={braloha.placed ? `+${pct(bralohaBonus(braloha.stars))}` : "—"}
        next={bralohaNext} onPick={pick(braloha)}
      />
      <PalRow
        sp={spOf(dynamoff)} row={dynamoff} where="I BASEN" skill="Electro-Massage Incubation"
        effect={dynamoff.placed ? `−${pct(dynamoffCut(dynamoff))}` : "—"} offRate
        next={<>Kortar <b>kläckningen</b> i inkubatorn, inte farmens timer – därför ligger den
          utanför takten ovan. <b>−{pct(dynamoffCut(dynamoff, 0))}</b> direkt,{" "}
          <b>−{pct(dynamoffCut(dynamoff, 4))}</b> vid 4★. Störst nytta ihop med Grintale:
          fler ägg är bara fler ägg om kläckarna hinner med.</>}
        onPick={pick(dynamoff)}
      />

      <div className="bsgrp">I partyt</div>
      <PalRow
        sp={spOf(grintale)} row={grintale} where="I PARTYT" skill="Glaring Cat's Eye"
        effect={grintale.placed ? speedText(1 + grintaleExtra()) : "—"}
        next={<>Varje upplockat ägg har <b>{pct(grintaleExtra())}</b> chans att ge ett extra,
          alltså <b>{speedText(1 + grintaleExtra())} fler ägg</b> ur samma par. Det extra ägget
          är en <b>egen passivdragning</b>, så det räknas fullt ut i planens siffror. Platt –
          ingen stjärnskalning – och stackar inte med fler Grintale.</>}
        onPick={pick(grintale)}
      />
      <PalRow
        sp={spOf(broncherryAqua)} row={broncherryAqua} where="I PARTYT" skill="Purity's Full Bloom"
        effect={pct(alphaChance(broncherryAqua, true))}
        next={<>Chans att ett upplockat ägg blir <b>alpha-ägg</b>: {pct(alphaChance(broncherryAqua, true))} →{" "}
          <b>{pct(alphaChance(broncherryAqua, true, 4))}</b> vid 4★.</>}
        onPick={pick(broncherryAqua)}
      />
      <PalRow
        sp={spOf(broncherry)} row={broncherry} where="I PARTYT" skill="Love's First Blossom"
        effect={pct(alphaChance(broncherry, false))}
        next={<>Samma sak, svagare: {pct(alphaChance(broncherry, false))} →{" "}
          <b>{pct(alphaChance(broncherry, false, 4))}</b> vid 4★. Ingendera stackar med sig själv.</>}
        onPick={pick(broncherry)}
      />

      {/* Passiverna ligger SIST och dämpade, och det är den viktigaste
          ordningsfrågan i panelen. Allt ovanför är gratis: ställ en pal på rätt
          plats och takten stiger. De två här nedan måste sitta på just de två
          man parar, alltså i arvspoolen – de köper takt med odds. Låg de kvar i
          mitten lästes de som nästa punkt att beta av, och vid fyra önskade
          passiver är det ett felaktigt råd (se PoolNote). */}
      <div className="bsgrp">Passiver på de två du parar – köper takt med odds</div>
      <div className="hint bslead">
        De två här sitter på <b>de två du lägger i avelsboxen</b>, alltså föräldrarna i
        planens steg – inte på Braloha eller någon i partyt. Och eftersom allt en förälder
        bär hamnar i <b>arvspoolen</b>, är de de enda i panelen som <b>kostar något</b>.
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
            ? <>Du har <b>{philanthropist.carriers}</b> bärare i boxen om du ändå vill.</>
            : <>Ingen bärare i boxen – den måste fångas eller avlas fram först.</>}
        </div>
      </div>
      <div className="bsrow pv bsopt">
        <PassiveRow id={nocturnal.id} name={passiveName(nocturnal.id)} tier={passiveTier(nocturnal.id)} />
        {/* Dämpad med flit: Insomnia har ingen uppmätt siffra, och en etikett i
            samma accent som de riktiga procenten hade fått den att se ut som en. */}
        <span className="eff txt">nattpass</span>
        <div className="hint">
          Paret pausar inte när det blir natt. Effekten är upptid, inte takt, så den
          ligger inte i siffran ovan – men den är verklig, och störst om du sover när spelet
          gör det. Den <b>kostar samma pool-plats som Philanthropist</b> och delar därför
          dess räkning: värd det när du siktar på få passiver, inte när du siktar på fyra.{" "}
          {nocturnal.carriers > 0 && <>Du har <b>{nocturnal.carriers}</b> bärare.</>}
        </div>
      </div>

      {/* Den enda rena texten i sektionen, och den som sparar mest tid: allt
          nedan ser ut som det borde hjälpa och gör det inte. */}
      <div className="bswarn">
        <b>Påverkar inte avelstiden:</b> Artisan, Work Slave, Serious och Lucky,
        Statue of Power, matbuffar – och att kondensera <i>föräldrarna</i>. De snabbar
        upp hantverk och insamling. Enda kondenseringen som gör skillnad är Bralohas egen.
      </div>
    </details>
  );
}
