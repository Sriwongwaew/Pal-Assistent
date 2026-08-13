"use client";

/* Dumb: Habitats topprad. Tre zoner — märket | flikarna | spelaren + kugghjulet —
   där flikarna står i MITTEN (Kens rättning aug 2026: raden var vänsterklumpad
   och "väldigt tråkig" på en bred skärm). Varje flik bär en riktig spelikon:
   Pal Sphere för Boxen, ägget för Breeding, kartans egna kompassglyfer för
   Uppdrag/Kartan, spelets rank-pil för Rekommendationerna. Vita glyfer tonas
   med currentColor (MaskIcon) så de följer temat; färgsatta original ritas
   som de är. Aktiv sida markeras med accentplattan – pricken ersattes av
   ikonen. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n";
import { GameIcon, ItemIcon, MaskIcon } from "./GameIcon";
import { ThemeControls } from "./ThemeControls";
import { UpdateCheck } from "./UpdateCheck";

/** The donation link, baked in at build time (PA_DONATE). Empty = not shown. */
const DONATE = process.env.PA_DONATE ?? "";

/* Hitta har ingen spelglyf – ett förstoringsglas i currentColor är den enda
   ritade ikonen i raden, samma viktkänsla som maskglyferna. */
const FindGlyph = () => (
  <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden>
    <circle cx="6.6" cy="6.6" r="4.4" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="10.3" y1="10.3" x2="14.1" y2="14.1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const TABS: { href: string; key: MessageKey; icon: ReactNode }[] = [
  { href: "/", key: "nav.overview", icon: <GameIcon name="lucky" size={15} /> },
  { href: "/box", key: "nav.box", icon: <ItemIcon slug="pal-sphere" size={16} /> },
  { href: "/breeding", key: "nav.breeding", icon: <ItemIcon slug="egg" size={16} /> },
  { href: "/recommendations", key: "nav.recommendations", icon: <MaskIcon name="rank_1" color="currentColor" width={15} height={14} /> },
  { href: "/quests", key: "nav.quests", icon: <GameIcon name="map/tower" size={16} /> },
  { href: "/map", key: "nav.map", icon: <GameIcon name="map/travel" size={16} /> },
  { href: "/find", key: "nav.find", icon: <FindGlyph /> },
];

export function Rail() {
  const pathname = usePathname();
  const { data, pals, ownedSpecies } = usePalData();
  const t = useT();

  return (
    <nav className="rail" aria-label={t("nav.aria")}>
      <div className="rzone rl">
        {/* Ett enda textelement för ordbilden – flex-gapen mellan lösa
            textnoder gjorde märket till "Pal A". */}
        <div className="brand"><ItemIcon slug="pal-sphere" size={21} /><span>Pal<em>A</em></span></div>
      </div>
      <div className="rzone rc">
        {TABS.map(({ href, key, icon }) => (
          <Link key={href} href={href} className={`ri ${pathname === href ? "on" : ""}`}
            aria-current={pathname === href ? "page" : undefined}>
            <span className="ric">{icon}</span>
            {t(key)}
          </Link>
        ))}
      </div>
      <div className="rzone rr railfoot">
        <div className="who">
          <span className="k">{t("nav.player")}</span>
          {/* Empty string before the first import — an empty <b> reads as a
              rendering fault rather than as a state. */}
          <b>{data.player || t("nav.noSave")}</b>
          <span className="sm">
            {t.plural("header.pals", pals.length)} · {t.plural("header.species", ownedSpecies.size)}
          </span>
        </div>
        {/* Everything that CONFIGURES the app lives behind the gear — the top
            bar itself only navigates. Ken's call: the full theme/language/
            update cluster made the bar look messy. */}
        <details className="navmore">
          <summary aria-label={t("nav.settings")} title={t("nav.settings")}>⚙</summary>
          <div className="navpanel">
            <ThemeControls />
            {/* Checking for a new version is something you do to the app —
                it stays with the other controls. Renders nothing in a build
                from source (see UpdateCheck). */}
            <UpdateCheck />
            {/* Baked in at build time. Empty in a build from source, and then
                the link does not exist at all — nobody should end up asking
                for money in someone else's name. */}
            {DONATE && (
              <a className="donate" href={DONATE} target="_blank" rel="noreferrer">
                {t("nav.donate")}
              </a>
            )}
          </div>
        </details>
      </div>
    </nav>
  );
}
