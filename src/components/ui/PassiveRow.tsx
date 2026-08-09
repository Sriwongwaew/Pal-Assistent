import type { ReactNode } from "react";
import { MaskIcon } from "./GameIcon";

/* Dumb: passiv-banner i Palworlds in-game-stil, med spelets riktiga pil-ikoner (rank_N). */

export interface PassiveRowProps {
  name: string;
  /** Tier: 1 = grå (spelets vanligaste), 2–3 guld, 4 = legendarisk, 5 = world
   *  tree/rainbow, negativ = dålig. */
  tier: number;
  suffix?: ReactNode;
}

/**
 * Tier → bannerns klass, pilfärg och vilken rank-ikon spelet använder.
 *
 * Tier 1 är **grå**, inte gul: spelet ger bara rank 2–3 den gula bannern
 * (Brave, Nimble, Serious … är silvergrå i Pal-menyn). Färgen är hela poängen
 * med banners – ser en tier 1 ut som en tier 3 går den inte att matcha mot
 * spelet, och en pal ser bättre ut än den är.
 */
export function passiveVisual(tier: number) {
  const neg = tier < 0;
  return {
    cls: tier === 5 ? "t5" : tier === 4 ? "t4" : neg ? "neg" : tier === 1 ? "t1" : "",
    color: tier === 5 ? "#ffffff"
      : tier === 4 ? "#6ff5de"
      : neg ? "#ff5257"
      : tier === 1 ? "#e3e9f2"
      : "#ffd83d",
    rank: tier === 0 ? 1 : Math.max(-3, Math.min(5, tier)),
  };
}

/* Banners renderas som <span> (CSS ger dem display:flex/grid ändå). Det är
   ingen kosmetisk detalj: rader som ska gå att klicka på blir <button>, och en
   <div> inuti en knapp är ogiltig HTML. */
export function PassiveRow({ name, tier, suffix }: PassiveRowProps) {
  const { cls, color, rank } = passiveVisual(tier);
  return (
    <span className={`prow sm ${cls}`}>
      <span className="nm">{name}</span>
      {suffix}
      <span className="arr">
        <MaskIcon name={`rank_${rank}`} color={color} width={20} height={18} />
      </span>
    </span>
  );
}

/**
 * Kompakt rad av passiv-banners för löptext ("Barnet ska behålla …").
 *
 * En uppräkning som "Remarkable Craftsmanship + Artisan + Work Slave" tvingar
 * läsaren att översätta namn till det den ser i spelet. Banners är samma bild
 * som i Pal-menyn, så tier och färg går att matcha direkt.
 */
export function PassiveChips({
  ids, nameOf, tierOf, label,
}: {
  ids: readonly string[];
  nameOf: (id: string) => string;
  tierOf: (id: string) => number;
  label?: ReactNode;
}) {
  if (!ids.length) return null;
  return (
    <div className="pchips">
      {label && <span className="pcl">{label}</span>}
      <div className="pcrow">
        {ids.map((id) => (
          <PassiveRow key={id} name={nameOf(id)} tier={tierOf(id)} />
        ))}
      </div>
    </div>
  );
}

export function PassiveList({ items }: { items: { id: string; name: string; tier: number }[] }) {
  return (
    <span className="prows">
      {items.length ? (
        items.map((p) => <PassiveRow key={p.id} name={p.name} tier={p.tier} />)
      ) : (
        <span className="prow sm empty"><span className="nm">Inga passiver</span><span className="arr" /></span>
      )}
    </span>
  );
}
