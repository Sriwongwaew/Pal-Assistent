"use client";

/* Dumb: Habitats vertikala navigation. Aktiv sida markeras med
   accentfärgad punkt och mjuk platta – inte med spelets cyan-understreck. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePalData } from "@/context/PalDataContext";
import { ThemeControls } from "./ThemeControls";

/** Donationslänken, inbakad vid bygget (PA_DONATE). Tom = visas inte. */
const DONATE = process.env.PA_DONATE ?? "";

const TABS: [string, string][] = [
  ["/", "Översikt"],
  ["/box", "Boxen"],
  ["/breeding", "Breeding"],
  ["/rekommendationer", "Rekommendationer"],
  ["/bast-for", "Bäst för…"],
];

export function Rail() {
  const pathname = usePathname();
  const { data, pals, ownedSpecies } = usePalData();

  return (
    <nav className="rail" aria-label="Huvudnavigation">
      <div className="brand">Pal<em>A</em></div>
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} className={`ri ${pathname === href ? "on" : ""}`}
          aria-current={pathname === href ? "page" : undefined}>
          <i className="d" />
          {label}
        </Link>
      ))}
      <div className="railfoot">
        <ThemeControls />
        <div className="who">
          <span className="k">Spelare</span>
          {/* Tom sträng före första inläsningen – då blir <b> en tom rad som ser
              ut som ett renderingsfel i stället för ett tillstånd. */}
          <b>{data.player || "Ingen save inläst"}</b>
          <span className="sm">{pals.length} pals · {ownedSpecies.size} arter</span>
        </div>
        {/* Bakas in vid bygget. Tom i ett bygge från källkoden, och då finns
            länken inte alls – ingen ska råka be om pengar i någon annans namn. */}
        {DONATE && (
          <a className="donate" href={DONATE} target="_blank" rel="noreferrer">
            ♥ Stöd projektet
          </a>
        )}
      </div>
    </nav>
  );
}
