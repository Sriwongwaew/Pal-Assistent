"use client";

/* Smart: "Bäst för…" – team-förslag och globala rekommendationer med breeding-länkar. */
import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePalData } from "@/context/PalDataContext";
import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import type { MessageKey } from "@/i18n";
import {
  BASE_WORK_TYPES, pickAttackTeam, pickBaseCrew, ranchGuide,
  topGlobalAttackers, topGlobalWorkers, workScore,
} from "@/lib/best";
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
  const t = useT();
  const rich = useRichT();
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
        const lo = idealLoadout(data, passiveCounts, p, species, purpose, work, t.locale);
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
  const ranch = useMemo(() => ranchGuide(data, ownedSpecies), [data, ownedSpecies]);
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
      .filter((f): f is { name: string; desc: MessageKey; idx: number } => f.idx !== undefined);
  }, [data]);

  const sp = (i: number) => data.species[i]!;
  /** `compact` används i de smala arbetskorten, där namnet annars trunkeras bort. */
  const ownStatus = (s: number, compact = false) => {
    if (ownedSpecies.has(s)) return <Tag kind="keep">{t("best.own.owned")}</Tag>;
    const c = freeSolve.cost[s] ?? Infinity;
    if (!isReachable(freeSolve.cost, s)) {
      return <Tag kind="cond">{compact ? t("best.own.catch") : t("best.own.mustCatch")}</Tag>;
    }
    return (
      <Tag kind="lucky">
        {compact ? t("best.own.breedShort", { n: c }) : t.plural("best.own.breed", c)}
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

  /* Ranchen är aldrig skälet till att någon står i basgänget (se `BASE_WORK_TYPES`),
     så den ska inte heller stå som motivering under porträttet. */
  const crewWhy = (p: ScoredPal) => {
    const s = sp(p.s);
    const top = BASE_WORK_TYPES
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
        {/* Var exemplaret faktiskt står just nu: laget väljer artens bästa
            individ, och den ligger oftast i boxen även när en sämre redan är
            utplacerad. Utan raden ser förslaget ut som "det är redan klart". */}
        <span className="tpwhere">{p.c === "Palbox" ? t("best.crew.inBox") : p.c}</span>
      </>
    );
  };

  const passiveItems = (p: ScoredPal) =>
    p.pv.map((id) => ({ id, name: data.passives[id]?.n ?? id, tier: data.passives[id]?.r ?? 0 }));

  return (
    <>
      <Section title={<><MaskIcon name="attack" color="#e6edf4" width={16} height={16} /> {t("best.attack.title")}</>}
        sub={t("best.attack.sub")}>
        <div className="teamcard"><div className="trow">
          {team.map((p) => (
            <TeamPortrait key={p.id} p={p}
              why={t("best.attack.why", { element: sp(p.s).elements[0] ?? "Normal", n: p.combat })} />
          ))}
        </div></div>
        <h3 className="phase">{t("best.lookLike")}</h3>
        <div className="sub">{t("best.attack.loadoutSub")}</div>
        <LoadoutGrid team={team} purpose="attack"
          label={(p) => t("best.attack.label", { n: p.combat })} />
        <details className="dgroup">
          <summary>{t("best.attack.top15")} <span className="n">{t("best.attack.allElements")}</span></summary>
          {attackers.slice(0, 15).map((p) => (
            <div key={p.id} className="rrow">
              <SpeciesIcon sp={sp(p.s)} size={38} radius={10} />
              <span className="nm">{sp(p.s).name} <GenderSymbol g={p.g} /></span>
              <ElementIcons sp={sp(p.s)} />
              <span className="ivt">
                {t("best.attack.row", { power: p.combat, iv: p.iv[1], lv: p.lv })}
                {p.stars > 0 ? ` · ${"★".repeat(p.stars)}` : ""}
              </span>
              <div className="grow"><PassiveList items={passiveItems(p)} /></div>
            </div>
          ))}
        </details>
        <details className="dgroup" open>
          <summary>{t("best.attack.global")} <span className="n">{t("best.attack.clickHint")}</span></summary>
          {globalAttackers.map((s, i) => {
            const top = sp(globalAttackers[0] ?? s).sc[1] || 1;
            return (
              <button key={s} className="rrow rowbtn" onClick={() => gotoBreeding(s)} title={t("best.planTitle")}>
                <span className={`rank r${Math.min(i + 1, 4)}`}>{i + 1}</span>
                <span className="ava" style={{ background: elementBg(sp(s)) }}>
                  <SpeciesIcon sp={sp(s)} size={38} radius={19} />
                </span>
                <span className="nm">{sp(s).name}</span>
                <span className="els"><ElementIcons sp={sp(s)} /></span>
                <span className="statbar" title={t("best.attack.scaling", { n: sp(s).sc[1] })}>
                  <i style={{ width: `${Math.round((sp(s).sc[1] / top) * 100)}%` }} />
                </span>
                <span className="ivt">{t("best.attack.stats", { atk: sp(s).sc[1], hp: sp(s).sc[0] })}</span>
                {ownStatus(s)}
                <span className="meta arrow-end">→</span>
              </button>
            );
          })}
        </details>
        <div className="hint">
          {rich("best.attack.ultimate", { passives: <b>{t("best.attack.ultimateList")}</b> })}
        </div>
      </Section>

      <Section title={<><MaskIcon name="work_speed" color="#e6edf4" width={16} height={16} /> {t("best.crew.title")}</>}
        sub={t("best.crew.sub")}>
        <div className="teamcard"><div className="trow">
          {crew.map((p) => <TeamPortrait key={p.id} p={p} why={crewWhy(p)} />)}
        </div></div>
        <h3 className="phase">{t("best.lookLike")}</h3>
        <div className="sub">{t("best.crew.loadoutSub")}</div>
        <LoadoutGrid team={crew} purpose="work" label={(p) => {
          const w = topWork(sp(p.s), WORK_TYPES);
          return w
            ? t("best.crew.label", { work: WORK_META[w]!.label, n: sp(p.s).ws[w] ?? 0 })
            : t("purpose.work");
        }} />
        <details className="dgroup">
          <summary>{t("best.crew.own")}</summary>
          <div className="wgrid">
            {BASE_WORK_TYPES.map((t) => {
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
          <summary>{t("best.crew.global")} <span className="n">{t("best.attack.clickHint")}</span></summary>
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

      <Section
        title={<><WorkIcon type="MonsterFarm" size={17} /> {t("best.ranch.title")}</>}
        sub={rich("best.ranch.sub", { species: <b>{t("best.ranch.subEmph")}</b> })}
      >
        <div className="wgrid">
          {ranch.filter((e) => e.item !== null).map((entry) => (
            <div key={entry.item} className="wcard">
              <div className="wt"><span className="em"><WorkIcon type="MonsterFarm" size={17} /></span>{entry.item}</div>
              {entry.producers.slice(0, 4).map((prod, i) => (
                <button key={prod.s} className="wrow rowbtn" onClick={() => gotoBreeding(prod.s)}
                  title={prod.owned ? t("best.ranch.place") : t("best.planTitle")}>
                  <span className={`rank sm r${Math.min(i + 1, 4)}`}>{i + 1}</span>
                  <span className="ava sm" style={{ background: elementBg(sp(prod.s)) }}>
                    <SpeciesIcon sp={sp(prod.s)} size={28} radius={14} />
                  </span>
                  <span className="nm">{sp(prod.s).name}</span>
                  <span className="lvl" title={t("best.ranch.levelTitle")}>{prod.level}</span>
                  {ownStatus(prod.s, true)}
                </button>
              ))}
            </div>
          ))}
        </div>
        {/* Datasetet har inga ranch-varor alls, så tabellen är handkurerad. Att
            visa luckan är hela poängen: en gissad vara skickar någon till
            ranchen med fel pal, och det syns först timmar senare. */}
        {ranch.filter((e) => e.item === null).map((entry) => (
          <div key="okand" className="hint ranchgap">
            <b>{t("best.ranch.unknown", { n: entry.producers.length })}</b>
            {t("best.ranch.unknownBody", {
              names: entry.producers.map((prod) => sp(prod.s).name).join(", "),
            })}
          </div>
        ))}
      </Section>

      <Section title={t("best.fishing.title")} sub={t("best.fishing.sub")}>
        {fishing.map(({ name, desc, idx }) => {
          const owned = ownedSpecies.has(idx);
          const b = bestOf.get(idx);
          return (
            <button key={idx} className="rrow rowbtn" onClick={() => gotoBreeding(idx)}>
              <SpeciesIcon sp={sp(idx)} size={38} radius={10} />
              <span className="nm">{name}</span>
              <span className="ivt grow">{t(desc)}</span>
              {owned && b
                ? <><Tag kind="keep">{t("best.own.owned")}</Tag><span className="meta">{t("pal.lv", { n: b.lv })} · IV {b.iv.join("/")}</span></>
                : ownStatus(idx)}
            </button>
          );
        })}
      </Section>

      <Section title={t("best.mount.title")} sub={t("best.mount.sub")}>
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
                  {t("best.mount.why", { n: p.mount })}
                </>
              }
            />
          ))}
        </div></div>
        <h3 className="phase">{t("best.lookLike")}</h3>
        <div className="sub">{t("best.mount.loadoutSub")}</div>
        <LoadoutGrid team={mounts} purpose="mount"
          label={(p) => t("best.mount.label", { n: p.mount })} />
      </Section>
    </>
  );
}
