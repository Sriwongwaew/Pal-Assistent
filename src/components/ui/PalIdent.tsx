/* Dumb: "det är DEN HÄR palen" – allt du behöver för att hitta rätt individ
   bland hundratals i spelet.

   Passiverna visas som spelets egna banners och ALLA fyra står med, även de vi
   inte vill ha. Det är hela poängen: i spelet ser du fyra rutor, och kan du inte
   matcha dem rakt av vet du inte om du håller på med rätt pal. De önskade får en
   bock, resten står som de är – de döljs eller tonas aldrig ned. */
import type { ScoredPal, Species } from "@/lib/types";
import { MaskIcon } from "./GameIcon";
import { DeckNo, ElementIcons, GenderSymbol, SpeciesIcon } from "./PalBits";
import { passiveVisual } from "./PassiveRow";

/** Palboxen visar 30 pals per låda (6 × 5). Stämmer inte det i din version är
 *  det den här siffran som ska ändras – allt annat räknas ut ur den. */
const BOX_SIZE = 30;

export function palLocation(pal: ScoredPal): string {
  if (pal.c !== "Palbox") return `${pal.c} · plats ${pal.slot + 1}`;
  const box = Math.floor(pal.slot / BOX_SIZE) + 1;
  const within = pal.slot % BOX_SIZE;
  const row = Math.floor(within / 6) + 1;
  const col = (within % 6) + 1;
  return `Palbox · låda ${box}, rad ${row} ruta ${col}`;
}

export interface PalIdentProps {
  pal: ScoredPal;
  species: Species;
  /** Passiv-id:n planen vill ha – de får en bock. */
  wanted?: readonly string[];
  /** Namn per passiv-id. */
  nameOf: (id: string) => string;
  tierOf: (id: string) => number;
  /** Rubrik ovanför, t.ex. "Planen tar" eller "Partner i steget". */
  label?: string;
}

export function PalIdent({ pal, species, wanted = [], nameOf, tierOf, label }: PalIdentProps) {
  return (
    <div className="palident">
      {label && <span className="pil">{label}</span>}
      <div className="pibody">
      <div className="piinfo">
      <div className="pihd">
        <SpeciesIcon sp={species} size={34} radius={11} />
        <div className="pin">
          {/* Element och Paldeck-nummer hör hemma just här: kortet finns för att
              man ska hitta rätt individ i spelet, och det börjar med att hitta
              rätt art i Paldecket. */}
          <b>
            {species.name}
            <GenderSymbol g={pal.g} />
            <ElementIcons sp={species} size={14} />
            <DeckNo sp={species} />
          </b>
          <span>Lv {pal.lv} · IV {pal.iv.join("/")}{pal.stars > 0 && ` · ${"★".repeat(pal.stars)}`}</span>
        </div>
      </div>
      <div className="piloc" title="Räknat ur platsen i sparfilen (30 pals per låda)">
        {palLocation(pal)}
      </div>
      </div>
      <div className="pipv">
        {pal.pv.length ? pal.pv.map((id) => {
          const { cls, color, rank } = passiveVisual(tierOf(id));
          const want = wanted.includes(id);
          return (
            <div key={id} className={`prow sm ${cls}`} data-passive={id}>
              <span className="nm">{nameOf(id)}</span>
              {want && <span className="tick" aria-label="en av dem du vill ha">✓</span>}
              <span className="arr">
                <MaskIcon name={`rank_${rank}`} color={color} width={20} height={18} />
              </span>
            </div>
          );
        }) : (
          <div className="prow sm empty"><span className="nm">Inga passiver</span><span className="arr" /></div>
        )}
      </div>
      </div>
    </div>
  );
}
