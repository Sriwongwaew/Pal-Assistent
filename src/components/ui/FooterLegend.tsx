import { PassiveRow } from "./PassiveRow";

export function FooterLegend() {
  return (
    <footer>
      Data läst ur Level.sav · breeding enligt Palworld 1.0 · Ärvnings-odds är uppskattningar (spelets tvåslagsmodell; vikterna är community-testade).
      Passiver visas som i spelet – <b>håll muspekaren över en banner</b> för att se vad den gör:
      <div className="plegend">
        <PassiveRow name="Tier 1–3 (fler pilar = högre)" tier={3} />
        <PassiveRow name="Legendarisk – animerad (Legend, Lucky…)" tier={4} />
        <PassiveRow name="World Tree/rainbow-tier" tier={5} />
        <PassiveRow name="Negativ (Clumsy, Slacker…)" tier={-1} />
      </div>
    </footer>
  );
}
