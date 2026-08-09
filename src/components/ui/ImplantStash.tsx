"use client";

/* Dumb: förrådet av implantat, som en egen plats på sidan.
 *
 * Varför panelen finns: rådet om Pal Surgery Table låg tidigare bara som en ruta
 * i passiv-väljaren, och den visas **bara** när en av de önskade passiverna råkar
 * vara operabel. Har man inte valt just den passiven finns informationen alltså
 * inte någonstans — och frågan "vad har jag för implantat?" gick inte att
 * besvara i appen alls. Den här panelen är svaret, och den syns oavsett vad man
 * valt.
 *
 * Hopfälld som Avelsbas, av samma skäl: rubriken bär hela värdet ("2 st"), så
 * den kostar en rad tills man vill ha den. Greppet måste därför synas — samma
 * `.bsetup`-stil med chevron och VISA/DÖLJ.
 *
 * Raderna är klickbara och lägger passiven bland de önskade. Det är hela
 * poängen med att förrådet är synligt: se att du har Swift → klicka → planen
 * räknar om sig och rutan under väljaren berättar att du inte behöver avla den.
 */
import { useT } from "@/i18n/LocaleContext";
import type { PassiveDef } from "@/lib/types";
import { MaskIcon } from "./GameIcon";
import { passiveVisual } from "./PassiveRow";
import { Tag } from "./PalBits";

export interface ImplantStashProps {
  /**
   * Passiv-id → antal, eller `null` när saven lästs av en läsare som inte kan
   * fältet. `null` och `{}` är olika saker: det första är "vi vet inte", det
   * andra "du äger inga", och panelen säger olika i de två fallen.
   */
  implants: Readonly<Record<string, number>> | null;
  passives: Record<string, PassiveDef>;
  /** Redan valda önskade passiver – de visas som valda, inte som förslag. */
  chosen: readonly string[];
  /** Fyran är full: raderna går fortfarande att hovra, men inte att lägga till. */
  full: boolean;
  onPick: (id: string) => void;
}

export function ImplantStash({ implants, passives, chosen, full, onPick }: ImplantStashProps) {
  const t = useT();
  /* Vet vi inget säger vi inget – en tom panel som påstår ett tomt förråd är
     sämre än ingen panel. Gäller en bundle inläst före fältet fanns. */
  if (implants === null) return null;

  const rows = Object.entries(implants)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, n, def: passives[id] }))
    .filter((r) => r.def)
    .sort((a, b) => (b.def!.r - a.def!.r) || a.def!.n.localeCompare(b.def!.n, t.locale));

  const total = rows.reduce((sum, r) => sum + r.n, 0);

  return (
    <details className="bsetup impstash">
      <summary>
        <span className="ttl">{t("implant.title")}</span>
        <span className="num">{total}</span>
        <span className="meta">
          {rows.length > 0
            ? t("implant.subtitle")
            : "Pal Surgery Table"}
        </span>
        {rows.length > 0
          ? <Tag kind="keep">{t("implant.inStash")}</Tag>
          : <Tag kind="cond">{t("implant.empty")}</Tag>}
      </summary>

      {rows.length === 0 ? (
        <div className="hint">
          {t("implant.noneBody")}
        </div>
      ) : (
        <>
          <div className="hint">
            {t("implant.rowsBody")}
          </div>
          <div className="prows implist">
            {rows.map((r) => {
              const picked = chosen.includes(r.id);
              const blocked = full && !picked;
              const { cls, color, rank } = passiveVisual(r.def!.r);
              return (
                /* Samma markup som väljarens alternativ: en klickbar banner är en
                   <button>, aldrig en <div> (en div i en knapp är ogiltig HTML,
                   och en span går inte att klicka).
                   aria-disabled, inte disabled: en disabled knapp får inga
                   pekarhändelser i Chrome/Edge, och då går bannern inte att
                   hovra – precis när man vill veta vad passiven gör. Klicket
                   måste därför själv strunta i sig. */
                <button
                  key={r.id}
                  type="button"
                  className={`prow sm opt ${cls} ${picked ? "on" : ""}`}
                  aria-disabled={blocked || undefined}
                  onClick={() => { if (!blocked) onPick(r.id); }}
                  data-passive={r.id}
                >
                  <span className="nm">{r.def!.n}</span>
                  <span className="impn">{picked ? t("implant.picked") : `×${r.n}`}</span>
                  <span className="arr">
                    <MaskIcon name={`rank_${rank}`} color={color} width={20} height={18} />
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </details>
  );
}
