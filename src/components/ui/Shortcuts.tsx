/* Dumb: kompakt ruta med "fånga det här i stället" – medvetet kort, den ska
   inte äta höjd från planen den kommenterar. */
import type { Shortcut } from "@/lib/shortcuts";
import { SpeciesIcon } from "./PalBits";

export function Shortcuts({ items }: { items: Shortcut[] }) {
  if (!items.length) return null;
  return (
    <div className="shortcuts">
      <span className="sck">Genväg</span>
      {items.map((s, i) => (
        <div key={`${s.s}-${i}`} className={`scrow ${s.blocking ? "block" : ""}`}>
          <SpeciesIcon sp={s.species} size={26} radius={8} />
          <div className="scmain">
            <b>
              Fånga en {s.gender === "M" ? "hane" : s.gender === "F" ? "hona" : ""} {s.species.name}
              {" "}utan passiver
            </b>
            <span>{s.why} {s.easy ? "Vanlig art – finns i vilt tillstånd." : "Sällsynt, men vinsten är värd jakten."}</span>
          </div>
          <span className="scwin">
            {s.blocking
              ? "krävs"
              : `−${Math.round(s.saves)} ägg`}
          </span>
        </div>
      ))}
      <span className="scfoot">
        En vild pal utan passiver håller arvspoolen liten. Det tar minuter att fånga –
        att kläcka bort skillnaden tar betydligt längre.
      </span>
    </div>
  );
}
