"use client";

/* Smart: "Bäst för…" – team-förslag och globala rekommendationer med breeding-länkar. */
import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePalData } from "@/context/PalDataContext";
import { pickAttackTeam, pickBaseCrew, topGlobalAttackers, topGlobalWorkers, workScore } from "@/lib/best";
import { idealLoadout, topWork } from "@/lib/loadout";
import type { PurposeId } from "@/lib/purpose";
import { FISHING_PALS, WORK_META, WORK_TYPES } from "@/lib/constants";
import { isReachable } from "@/lib/breeding";
import type { ScoredPal } from "@/lib/types";
import { PassiveList } from "@/components/ui/PassiveRow";
import { MaskIcon } from "@/components/ui/GameIcon";
import { WorkIcon } from "@/components/ui/WorkIcon";
import { ElementIcons, GenderSymbol, Section, SpeciesIcon, Tag, elementBg } from "@/components/ui/PalBits";
import { LoadoutCard } from "@/components/ui/Loadout";

export function BestView() {
  const { data, pals, ownedSpecies, bestOf, freeSolve } = usePalData();
  const router = useRouter();
  const gotoBreeding = (s: number, wanted: string[] = []) =>
    router.push(`/breeding?target=${s}${wanted.length ? `&wanted=${wanted.join(",")}` : ""}`);

  /** Antal bärare per passiv – rekommendationerna vill veta vad som går att ärva. */
  const passiveCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pals) for (const id of p.pv) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [pals]);

  /** "Så här ska den se ut" för en pal i en given roll. */
  const LoadoutGrid = ({ team, purpose, label }: {
    team: ScoredPal[]; purpose: PurposeId; label: (p: ScoredPal) => string;
  }) => (
    <div className="loadouts">
      {team.map((p) => {
        const species = sp(p.s);
        const work = purpose === "work" ? topWork(species, WORK_TYPES) : null;
        const lo = idealLoadout(data, passiveCounts, p, species, purpose, work);
        const missing = lo.slots.filter((s) => !s.owned).map((s) => s.id);
        return (
          <LoadoutCard
            key={p.id}
            species={species}
            name={species.name}
            sub={label(p)}
            loadout={lo}
            onPlan={() => gotoBreeding(p.s, missing)}
          />
        );
      })}
    </div>
  );

  const attackers = useMemo(() => [...pals].sort((a, b) => b.combat - a.combat), [pals]);
  const team = useMemo(() => pickAttackTeam(data, pals), [data, pals]);
  const crew = useMemo(() => pickBaseCrew(data, pals, bestOf), [data, pals, bestOf]);
  const globalAttackers = useMemo(() => topGlobalAttackers(data), [data]);
  const globalWorkers = useMemo(() => topGlobalWorkers(data), [data]);
  const mounts = useMemo(
    () => [...new Set([...bestOf.values()])]
      .filter((p) => (data.species[p.s]?.spr ?? 0) > 0)
      .sort((a, b) => b.mount - a.mount)
      .slice(0, 6),
    [data, bestOf],
  );
  const fishing = useMemo(() => {
    const byName = new Map(data.species.map((s, i) => [s.name, i] as const));
    return FISHING_PALS
      .map(([name, desc]) => ({ name, desc, idx: byName.get(name) }))
      .filter((f): f is { name: string; desc: string; idx: number } => f.idx !== undefined);
  }, [data]);

  const sp = (i: number) => data.species[i]!;
  /** `compact` används i de smala arbetskorten, där namnet annars trunkeras bort. */
  const ownStatus = (s: number, compact = false) => {
    if (ownedSpecies.has(s)) return <Tag kind="keep">ÄGD</Tag>;
    const c = freeSolve.cost[s] ?? Infinity;
    if (!isReachable(freeSolve.cost, s)) {
      return <Tag kind="cond">{compact ? "FÅNGA" : "MÅSTE FÅNGAS"}</Tag>;
    }
    return (
      <Tag kind="lucky">
        {compact ? `AVLAS ×${c}` : <>KAN AVLAS · {c} parning{c > 1 ? "ar" : ""}</>}
      </Tag>
    );
  };

  const TeamPortrait = ({ p, why, rank }: { p: ScoredPal; why: ReactNode; rank?: number }) => (
    <div className="tp">
      {/* Utanför .por: den har overflow:hidden för att maska bilden rund. */}
      {rank !== undefined && <span className={`rank pin r${Math.min(rank, 4)}`}>{rank}</span>}
      <div className="por">
        <div className="bgel" style={{ background: elementBg(sp(p.s)) }} />
        {sp(p.s).icon && <SpeciesIcon sp={sp(p.s)} size={58} radius={13} />}
      </div>
      <div className="nm">{sp(p.s).name}</div>
      <div className="why">{why}</div>
    </div>
  );

  const crewWhy = (p: ScoredPal) => {
    const s = sp(p.s);
    const top = WORK_TYPES
      .filter((t) => (s.ws[t] ?? 0) > 0)
      .sort((a, b) => (s.ws[b] ?? 0) - (s.ws[a] ?? 0))
      .slice(0, 2);
    return (
      <>
        {top.map((t) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
            <WorkIcon type={t} size={12} />{s.ws[t]}
          </span>
        ))}
        {s.noct ? " 🌙" : ""}
      </>
    );
  };

  const passiveItems = (p: ScoredPal) =>
    p.pv.map((id) => ({ id, name: data.passives[id]?.n ?? id, tier: data.passives[id]?.r ?? 0 }));

  return (
    <>
      <Section title={<><MaskIcon name="attack" color="#e6edf4" width={16} height={16} /> Attack-team (boss/raid)</>}
        sub="Topp 5 ur din box efter stridsstyrka (art-scaling × ATK-IV × attack-passiver), med elementspridning.">
        <div className="teamcard"><div className="trow">
          {team.map((p) => (
            <TeamPortrait key={p.id} p={p} why={`${sp(p.s).elements[0] ?? "Normal"} · styrka ${p.combat}`} />
          ))}
        </div></div>
        <h3 className="phase">Så här ska de se ut</h3>
        <div className="sub">
          Fyra passiver per pal, anpassade efter artens element. Ifylld banner = den har den
          redan. Klicka för en avelsplan som fyller luckorna.
        </div>
        <LoadoutGrid team={team} purpose="attack" label={(p) => `Strid · styrka ${p.combat}`} />
        <details className="dgroup">
          <summary>Topp 15 attackers du äger <span className="n">(alla element)</span></summary>
          {attackers.slice(0, 15).map((p) => (
            <div key={p.id} className="rrow">
              <SpeciesIcon sp={sp(p.s)} size={38} radius={10} />
              <span className="nm">{sp(p.s).name} <GenderSymbol g={p.g} /></span>
              <ElementIcons sp={sp(p.s)} />
              <span className="ivt">Styrka {p.combat} · ATK-IV {p.iv[1]} · Lv {p.lv}{p.stars > 0 ? ` · ${"★".repeat(p.stars)}` : ""}</span>
              <div className="grow"><PassiveList items={passiveItems(p)} /></div>
            </div>
          ))}
        </details>
        <details className="dgroup" open>
          <summary>Bästa attackers i spelet – även de du inte äger <span className="n">(klicka för breeding-plan)</span></summary>
          {globalAttackers.map((s, i) => {
            const top = sp(globalAttackers[0] ?? s).sc[1] || 1;
            return (
              <button key={s} className="rrow rowbtn" onClick={() => gotoBreeding(s)} title="Klicka för breeding-plan">
                <span className={`rank r${Math.min(i + 1, 4)}`}>{i + 1}</span>
                <span className="ava" style={{ background: elementBg(sp(s)) }}>
                  <SpeciesIcon sp={sp(s)} size={38} radius={19} />
                </span>
                <span className="nm">{sp(s).name}</span>
                <span className="els"><ElementIcons sp={sp(s)} /></span>
                <span className="statbar" title={`ATK-scaling ${sp(s).sc[1]}`}>
                  <i style={{ width: `${Math.round((sp(s).sc[1] / top) * 100)}%` }} />
                </span>
                <span className="ivt">{sp(s).sc[1]} ATK · {sp(s).sc[0]} HP</span>
                {ownStatus(s)}
                <span className="meta arrow-end">→</span>
              </button>
            );
          })}
        </details>
        <div className="hint">
          Vill du bygga den ultimata attackern? Klicka på en pal ovan och välj passiver som{" "}
          <b>Legend + Musclehead + Vanguard + elementboost</b>.
        </div>
      </Section>

      <Section title={<><MaskIcon name="work_speed" color="#e6edf4" width={16} height={16} /> Bas-dreamteam</>}
        sub="Minsta gäng ur din box som täcker alla arbetstyper med högsta nivåer (🌙 = jobbar även natt).">
        <div className="teamcard"><div className="trow">
          {crew.map((p) => <TeamPortrait key={p.id} p={p} why={crewWhy(p)} />)}
        </div></div>
        <h3 className="phase">Så här ska de se ut</h3>
        <div className="sub">
          Arbetshastighet är allt som räknas i basen – utom på Farming, där Farmhand och
          Ranch Master höjer själva arbetsrangen.
        </div>
        <LoadoutGrid team={crew} purpose="work" label={(p) => {
          const t = topWork(sp(p.s), WORK_TYPES);
          return t ? `${WORK_META[t]!.label} nivå ${sp(p.s).ws[t]}` : "Bas & arbete";
        }} />
        <details className="dgroup">
          <summary>Bästa arbetare per syssla – ur din box</summary>
          <div className="wgrid">
            {WORK_TYPES.map((t) => {
              const best = [...pals]
                .filter((p) => (sp(p.s).ws[t] ?? 0) > 0)
                .sort((a, b) => workScore(data, b, t) - workScore(data, a, t))
                .slice(0, 3);
              if (!best.length) return null;
              return (
                <div key={t} className="wcard">
                  <div className="wt"><span className="em"><WorkIcon type={t} size={17} /></span>{WORK_META[t]!.label}</div>
                  {best.map((p, i) => (
                    <div key={p.id} className="wrow">
                      <span className={`rank sm r${Math.min(i + 1, 4)}`}>{i + 1}</span>
                      <span className="ava sm" style={{ background: elementBg(sp(p.s)) }}>
                        <SpeciesIcon sp={sp(p.s)} size={28} radius={14} />
                      </span>
                      <span className="nm">{sp(p.s).name}{sp(p.s).noct ? " 🌙" : ""}</span>
                      {p.fxCraft > 0 && <span className="spd">+{Math.round(p.fxCraft * 100)}%</span>}
                      <span className="lvl">{sp(p.s).ws[t]}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </details>
        <details className="dgroup">
          <summary>Bästa arbetare i spelet – även de du inte äger <span className="n">(klicka för breeding-plan)</span></summary>
          <div className="wgrid">
            {globalWorkers.map(([t, list]) => (
              <div key={t} className="wcard">
                <div className="wt"><span className="em"><WorkIcon type={t} size={17} /></span>{WORK_META[t]!.label}</div>
                {list.map((s, i) => (
                  <button key={s} className="wrow rowbtn" onClick={() => gotoBreeding(s)}>
                    <span className={`rank sm r${Math.min(i + 1, 4)}`}>{i + 1}</span>
                    <span className="ava sm" style={{ background: elementBg(sp(s)) }}>
                      <SpeciesIcon sp={sp(s)} size={28} radius={14} />
                    </span>
                    <span className="nm">{sp(s).name}{sp(s).noct ? " 🌙" : ""}</span>
                    <span className="lvl">{sp(s).ws[t]}</span>
                    {ownStatus(s, true)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </details>
      </Section>

      <Section title="🎣 Fiske-hjälpar" sub="Pals med partner-skills som förbättrar fisket (Palworld 1.0).">
        {fishing.map(({ name, desc, idx }) => {
          const owned = ownedSpecies.has(idx);
          const b = bestOf.get(idx);
          return (
            <button key={idx} className="rrow rowbtn" onClick={() => gotoBreeding(idx)}>
              <SpeciesIcon sp={sp(idx)} size={38} radius={10} />
              <span className="nm">{name}</span>
              <span className="ivt grow">{desc}</span>
              {owned && b
                ? <><Tag kind="keep">ÄGD</Tag><span className="meta">Lv {b.lv} · IV {b.iv.join("/")}</span></>
                : ownStatus(idx)}
            </button>
          );
        })}
      </Section>

      <Section title="🐎 Snabbaste riddjuren" sub="Sprint-fart × Swift/Runner-passiver, bästa exemplar per art.">
        <div className="teamcard"><div className="trow">
          {mounts.map((p, i) => (
            <TeamPortrait
              key={p.id}
              p={p}
              rank={i + 1}
              why={
                <>
                  <span className="statbar tiny">
                    <i style={{ width: `${Math.round((p.mount / (mounts[0]?.mount || 1)) * 100)}%` }} />
                  </span>
                  sprint {p.mount}
                </>
              }
            />
          ))}
        </div></div>
        <h3 className="phase">Så här ska de se ut</h3>
        <div className="sub">Rörelsepassiver – de enda som faktiskt påverkar sprintfarten.</div>
        <LoadoutGrid team={mounts} purpose="mount" label={(p) => `Riddjur · sprint ${p.mount}`} />
      </Section>
    </>
  );
}
