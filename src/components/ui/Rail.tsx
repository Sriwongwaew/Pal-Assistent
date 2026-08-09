"use client";

/* Dumb: Habitat's vertical navigation. The active page is marked with an
   accent-coloured dot and a soft plate — not with the game's cyan underline. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n";
import { ThemeControls } from "./ThemeControls";
import { UpdateCheck } from "./UpdateCheck";

/** The donation link, baked in at build time (PA_DONATE). Empty = not shown. */
const DONATE = process.env.PA_DONATE ?? "";

const TABS: [string, MessageKey][] = [
  ["/", "nav.overview"],
  ["/box", "nav.box"],
  ["/breeding", "nav.breeding"],
  ["/recommendations", "nav.recommendations"],
  ["/best-for", "nav.bestFor"],
];

export function Rail() {
  const pathname = usePathname();
  const { data, pals, ownedSpecies } = usePalData();
  const t = useT();

  return (
    <nav className="rail" aria-label={t("nav.aria")}>
      <div className="brand">Pal<em>A</em></div>
      {TABS.map(([href, key]) => (
        <Link key={href} href={href} className={`ri ${pathname === href ? "on" : ""}`}
          aria-current={pathname === href ? "page" : undefined}>
          <i className="d" />
          {t(key)}
        </Link>
      ))}
      <div className="railfoot">
        <ThemeControls />
        <div className="who">
          <span className="k">{t("nav.player")}</span>
          {/* Empty string before the first import — an empty <b> reads as a
              rendering fault rather than as a state. */}
          <b>{data.player || t("nav.noSave")}</b>
          <span className="sm">
            {t.plural("header.pals", pals.length)} · {t.plural("header.species", ownedSpecies.size)}
          </span>
        </div>
        {/* Sits with the other shell controls rather than down in the footer:
            checking for a new version is something you do to the app, not
            something you read about it. Renders nothing in a build from source
            (see UpdateCheck). */}
        <UpdateCheck />
        {/* Baked in at build time. Empty in a build from source, and then the
            link does not exist at all — nobody should end up asking for money
            in someone else's name. */}
        {DONATE && (
          <a className="donate" href={DONATE} target="_blank" rel="noreferrer">
            {t("nav.donate")}
          </a>
        )}
      </div>
    </nav>
  );
}
