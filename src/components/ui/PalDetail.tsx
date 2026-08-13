"use client";

/* Dumb: Base Info-panel – 1:1-replika av spelets layout.
   PalDetailBody används både i modal och i Boxens högerpanel.

   Etiketterna i själva replikan (LEVEL, NEXT, SAN, Attack, Current Task, Food,
   Paldeck …) står kvar på spelets engelska och är alltså inte nycklar: panelen
   är en avbild av spelets ruta, precis som art- och passivnamnen. Det
   PalAssistent säger med egen röst under den – IV-raden, spara-flaggan,
   skälen – är översatt. */
/* eslint-disable @next/next/no-img-element */
import { ELEMENT_ICON, ELEMENT_META, WORK_META, WORK_TYPES } from "@/lib/constants";
import { partnerSkill } from "@/lib/partnerSkills";
import type { DisplayStats } from "@/lib/scoring";
import type { AppData, ScoredPal, Species } from "@/lib/types";
import { useT } from "@/i18n/LocaleContext";
import { formatNumber } from "@/i18n";
import { PassiveRow } from "./PassiveRow";
import { GameIcon, MaskIcon } from "./GameIcon";
import { StatIcon, WorkIcon } from "./WorkIcon";

export interface PalDetailBodyProps {
  pal: ScoredPal;
  species: Species;
  data: AppData;
  stats: DisplayStats;
}

function Delta({ d }: { d: number }) {
  if (d > 0) return <span className="pd-up">▲</span>;
  if (d < 0) return <span className="pd-dn">▼</span>;
  return null;
}

/** Ljusblå själs-låga som i spelet (souls-förstärkning). */
function SoulIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden>
      <path
        d="M8 .8c.7 2.4-.5 3.7-2 5.3C4.6 7.7 3.4 9.2 3.4 11.4a4.6 4.6 0 0 0 9.2 0c0-1.5-.6-2.6-1.3-3.6-.4.8-.8 1.3-1.5 1.7.5-2.6-.2-6-1.8-8.7z"
        fill="#5fd8f0"
      />
      <path d="M8 6.5c.4 1.5-.3 2.3-1.2 3.3-.8 1-1.5 1.9-1.5 3.2a2.7 2.7 0 0 0 5.4 0c0-.9-.3-1.6-.8-2.2-.2.5-.5.8-.9 1 .3-1.6-.1-3.6-1-5.3z" fill="#c9f3fb" />
    </svg>
  );
}

export function PalDetailBody({ pal, species, data, stats }: PalDetailBodyProps) {
  const t = useT();
  const num = (n: number) => formatNumber(n, t.locale);
  const el = species.elements[0] ?? "Normal";
  const elMeta = ELEMENT_META[el];
  // NEXT-exp: kvar till nästa level
  const cur = data.palExp[pal.lv] ?? 0;
  const nxt = data.palExp[pal.lv + 1];
  const hasNext = typeof nxt === "number" && nxt > cur && pal.xp > 0;
  const nextRemain = hasNext ? Math.max(0, nxt - pal.xp) : 0;
  const nextFrac = hasNext ? Math.min(1, Math.max(0, (pal.xp - cur) / (nxt - cur))) : 1;
  const soulsTotal = pal.souls[0] + pal.souls[1] + pal.souls[2] + pal.souls[3];
  const food = pal.fd ?? species.stom;

  return (
    <>
      {/* ===== header: LEVEL + namn + NEXT ===== */}
      <div className="pd-head">
        <div className="pd-lvbox">
          <div className="k">LEVEL</div>
          <div className="v">{pal.lv}</div>
        </div>
        <div className="pd-namebox">
          <div className="pd-namerow">
            <span className="pd-name">{pal.nick || species.name}</span>
            <span className="pd-icons">
              {pal.boss && <GameIcon name="alpha" size={18} />}
              {pal.lucky && <GameIcon name="lucky" size={16} />}
              <GameIcon name={pal.g === "M" ? "male" : "female"} size={16} />
            </span>
          </div>
          <div className="pd-nextrow">
            <span className="nk">NEXT</span>
            <span className="nv">{hasNext ? num(nextRemain) : "MAX"}</span>
            <span className="pd-elbadge" title={el} style={{ borderColor: `${elMeta?.color}88` }}>
              <GameIcon name={ELEMENT_ICON[el] ?? "neutral"} size={17} />
            </span>
          </div>
          <div className="pd-nextbar"><i style={{ width: `${nextFrac * 100}%` }} /></div>
        </div>
      </div>

      <div className="pd-cols">
        {/* ===== vänster: stjärnor + inramat porträtt + souls ===== */}
        <div className="pd-left">
          <div className="pd-stars">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < pal.stars ? "on" : ""}>★</span>
            ))}
          </div>
          <div className="pd-pframe">
            <div className="pd-portrait">
              {species.icon && <img src={species.icon} alt={species.name} />}
            </div>
          </div>
          <div className="pd-soul"><SoulIcon /> <b>+{soulsTotal}</b></div>
        </div>

        {/* ===== höger: kondens, HP, mage, SAN ===== */}
        <div className="pd-right">
          <div className="pd-brow">
            <span className="bic cond">❖</span>
            <div className="btrack pink"><i style={{ width: `${(pal.stars / 4) * 100}%` }} /></div>
            <span className="bval">{pal.stars}</span>
          </div>
          <div className="pd-brow">
            <span className="bic hp"><MaskIcon name="heart" color="#35d07f" width={15} height={14} /></span>
            <div className="btrack green">
              <i style={{ width: "100%" }} />
              <span className="intext">{num(stats.hp)} <em>/{num(stats.hp)}</em></span>
            </div>
          </div>
          <div className="pd-brow">
            <span className="bic food"><MaskIcon name="food" color="#e8a24a" width={15} height={14} /></span>
            <div className="btrack orange">
              <i style={{ width: `${Math.min(100, (food / species.stom) * 100)}%` }} />
              <span className="intext">{Math.round(food)} <em>/{species.stom}</em></span>
            </div>
          </div>
          <div className="pd-sanrow">
            <span>SAN</span>
            <span className="sv"><b>{pal.sn}</b>/100</span>
          </div>

          {/* stats-boxen */}
          <div className="pd-statbox">
            <div className="pd-statrow"><span className="icbox"><StatIcon kind="atk" /></span> Attack <b>{num(stats.atk)}<Delta d={stats.dir.atk} /></b></div>
            <div className="pd-statrow"><span className="icbox"><StatIcon kind="def" /></span> Defense <b>{num(stats.def)}<Delta d={stats.dir.def} /></b></div>
            <div className="pd-statrow"><span className="icbox"><StatIcon kind="work" /></span> Work Speed <b>{stats.work}<Delta d={stats.dir.work} /></b></div>
          </div>
        </div>
      </div>

      {/* ===== arbetsikoner + Current Task + Food ===== */}
      <div className="pd-workstrip">
        <div className="wicons">
          {WORK_TYPES.map((w) => {
            const lvl = species.ws[w] ?? 0;
            return (
              <span key={w} className={`wi ${lvl ? "on" : ""}`}
                title={lvl ? t("pal.workLv", { name: WORK_META[w]!.label, n: lvl }) : WORK_META[w]!.label}>
                <WorkIcon type={w} active={lvl > 0} size={19} />
                {lvl > 0 && <b>{lvl}</b>}
              </span>
            );
          })}
        </div>
        <div className="taskrow">
          <span>Current Task</span>
          <span className="tv">{pal.c === "Palbox" ? "Idle" : pal.c}</span>
        </div>
        <div className="foodrow">
          <span>Food</span>
          <span className="drums">
            {Array.from({ length: 10 }, (_, i) => (
              <MaskIcon key={i} name="food" color={i < species.food ? "#f5a623" : "#3c4753"} width={14} height={13} />
            ))}
          </span>
        </div>
      </div>

      {/* ===== Partner Skill – spelets riktiga skilltext (vendrat ur paldb).
             Ramen visade förut Paldeck-beskrivningen som ersättning; nu finns
             datan, och Paldeck-texten ligger kvar under när den finns. ===== */}
      {(() => {
        const ps = partnerSkill(species.code);
        return ps && (
          <>
            <div className="pd-ptitle">Partner Skill</div>
            <div className="pd-skillrow">
              <span className="sn">{ps.skill}</span>
            </div>
            <div className="pd-descbox">{ps.desc}</div>
          </>
        );
      })()}

      {/* ===== Paldeck (samma inramning som i spelet) ===== */}
      <div className="pd-ptitle">Paldeck</div>
      <div className="pd-skillrow">
        <span className="sn">{species.name}</span>
        <span className="slv">No.<b>{species.deck}</b></span>
      </div>
      {species.desc && <div className="pd-descbox">{species.desc}</div>}

      {/* ===== Passive Skills 2×2 ===== */}
      <div className="pd-ptitle">Passive Skills</div>
      <div className="pd-pgrid">
        {pal.pv.length ? (
          pal.pv.map((id) => (
            <PassiveRow key={id} id={id} name={data.passives[id]?.n ?? id} tier={data.passives[id]?.r ?? 0} />
          ))
        ) : (
          <div className="meta">{t("pal.noPassives")}</div>
        )}
      </div>

      {/* ===== PalAssistent-extra (IV m.m. – finns inte i spelet) ===== */}
      <div className="pd-extra">
        <span className={`pd-iv ${pal.iv[0] >= 100 ? "max" : ""}`}>IV HP <b>{pal.iv[0]}</b></span>
        <span className={`pd-iv ${pal.iv[1] >= 100 ? "max" : ""}`}>IV ATK <b>{pal.iv[1]}</b></span>
        <span className={`pd-iv ${pal.iv[2] >= 100 ? "max" : ""}`}>IV DEF <b>{pal.iv[2]}</b></span>
        <span className="pd-iv">{t("pal.score")} <b>{pal.score}</b></span>
        <span className={`pd-iv ${pal.keep ? "max" : ""}`}><b>{pal.keep ? t("pal.keep") : t("pal.condense")}</b></span>
      </div>
      {pal.reasons.length > 0 && (
        <div className="pd-reasons">{pal.reasons.map(t.msg).join(" · ")}</div>
      )}
    </>
  );
}

export interface PalDetailProps extends PalDetailBodyProps {
  onClose: () => void;
}

export function PalDetail({ onClose, ...body }: PalDetailProps) {
  const t = useT();
  return (
    <div className="pd-overlay" onClick={onClose} role="dialog" aria-modal>
      <div className="pd gpanel" onClick={(e) => e.stopPropagation()}>
        <button className="pd-close" onClick={onClose} aria-label={t("pal.close")}>✕</button>
        <PalDetailBody {...body} />
      </div>
    </div>
  );
}
