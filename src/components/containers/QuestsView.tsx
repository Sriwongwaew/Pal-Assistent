"use client";

/* Smart: Uppdrag – din resa över världen, ur saven.
 *
 * Formen är Kens kombination ur designrundan aug 2026: FÄLTKARTANS helhet
 * (förslag 1) med INSTRUMENTBRÄDANS moduler (förslag 2).
 *
 *   1. Karthjälten – spelets riktiga världskarta med guldstämplade torn
 *      (savens flaggor på kartans positioner) och resan som FASER till höger:
 *      Tornen → Panthalus → Världsträdet → Hard mode → Raiderna → Paldecken.
 *      Nästa fas är upplyst; klick rullar till sin del av sidan.
 *   2. Nästa steg – strid stor med motlag ur boxen, och SEDAN-raden som
 *      säger vad som kommer efter.
 *   3. Kampanjen som kvitton – porträtt + Lv + ✓×N ur savens räknare.
 *      Avklarat är intjänad mark och ska kännas så, inte gömmas i en grupp.
 *   4. Hard mode som belöningskort – de legendariska schematics-ikonerna
 *      (riktiga item-bilder) i stället för text.
 *   5. Raiderna som äggtavla – bossporträtt + savens kvitton; "ägg saknas"
 *      när decken saknar arten raiden kläcker. Detaljerna fälls ut per kort.
 *   6. Kvar i världen – mätare MED belöningskrok ("7 oanvända — offra vid en
 *      Statue of Power", "5 Ancient Tech-poäng styck") och → kartan-länkar.
 *
 *  Paldecken bor i resan (spelarnas de-facto-slutmål, upp från källaren) och
 *  questloggen ligger sist som kompakt remsa – råloggen är minst efterfrågad.
 *  Utan progressionsfält (äldre inläsning) döljs hjälten och sidan faller
 *  tillbaka på domarna + en uppmaning att läsa in saven igen. */
import { useMemo } from "react";
import Link from "next/link";
import { usePalData } from "@/context/PalDataContext";
import { useSelectedPal } from "@/context/SelectedPalContext";
import { useT } from "@/i18n/LocaleContext";
import {
  bossElements, nextFight, pickCounterSquad, weaknessesOf,
  QUEST_BOSSES, WORLDTREE_MID_FLAGS,
  type QuestBoss, type QuestSquad, type QuestVerdict,
} from "@/lib/quests";
import { HARD_TOWERS, RAIDS } from "@/lib/questsData";
import { activeQuests } from "@/lib/missions";
import { progressSummary } from "@/lib/progressSummary";
import { catchInfo, foundSets, igCoord, mapPct, WORLD_MAP } from "@/lib/worldmap";
import { schematicIconSlug } from "@/lib/itemIcons";
import { isReachable } from "@/lib/breeding";
import { ELEMENT_ICON, ELEMENT_META } from "@/lib/constants";
import type { ScoredPal, Species } from "@/lib/types";
import { GameIcon, ItemIcon } from "@/components/ui/GameIcon";
import { Section, SpeciesIcon, Tag } from "@/components/ui/PalBits";
import { elementColor } from "@/components/ui/PalHero";

const VERDICT_KEY = {
  ready: "quest.ready", close: "quest.close", risky: "quest.risky",
} as const;

/** Fasens tillstånd i resan: gjord, nästa (upplyst) eller framtida. */
type PhaseState = "done" | "next" | "later";

export function QuestsView() {
  const { data, pals, ownedSpecies, freeSolve } = usePalData();
  const { select } = useSelectedPal();
  const t = useT();
  const progress = data.progress;

  const spByCode = useMemo(
    () => new Map(data.species.map((sp) => [sp.code.toLowerCase(), sp] as const)),
    [data],
  );

  const squads = useMemo(
    () => QUEST_BOSSES.map((boss) => ({
      boss,
      squad: pickCounterSquad(data, pals, boss),
      done: !!(progress && boss.flag && progress.towers.includes(boss.flag)),
    })),
    [data, pals, progress],
  );

  /* Paldeck: savens upptäckta arter mot katalogens (platshållarna utanför).
     `seen` används också av raidtavlan – "ägg saknas" är deckens fråga. */
  const deck = useMemo(() => {
    if (!progress?.deck) return null;
    const seen = new Set(progress.deck.map((c) => c.toLowerCase()));
    const missing = data.species
      .map((sp, i) => ({ sp, i }))
      .filter(({ sp }) => sp.deck > 0 && !seen.has(sp.code.toLowerCase()));
    return { seen, done: data.species.filter((sp) => sp.deck > 0).length - missing.length, missing };
  }, [progress, data]);
  const found = useMemo(() => foundSets(progress), [progress]);

  /* Raidtavlan: kurerade rader + savens nedläggsräknare (nycklarna ÄR
     slab-id:na; `_2` är Ultra). "Ägg saknas" = decken saknar arten raiden
     kläcker – raiderna är enda källan till de arterna. */
  const raids = useMemo(() => RAIDS.map((raid) => {
    const boss: QuestBoss = {
      id: raid.key, name: raid.name, kind: "raid", elements: raid.elements,
      level: raid.lv, altar: true, code: raid.code,
      typeless: raid.elements.length === 0,
    };
    return {
      raid,
      boss,
      squad: pickCounterSquad(data, pals, boss),
      clears: progress?.raids[raid.key] ?? 0,
      ultraClears: progress?.raids[`${raid.key}_2`] ?? 0,
      eggMissing: !!raid.code && !!deck && !deck.seen.has(raid.code.toLowerCase()),
    };
  }), [data, pals, progress, deck]);
  const eggsMissing = raids.filter((r) => r.eggMissing).length;
  const raidClears = raids.filter((r) => r.clears > 0).length;

  /* Hard mode låses upp när alla åtta faktionstornen är nere på normal.
     Nedläggen läses ur towerClears["<flagga>_Hard"] – suffixet är härlett ur
     speldatan och ännu inte observerat, så noll visas som "inte bekräftat i
     saven än" snarare än ett säkert 0/9 (se questsData). */
  const hard = useMemo(() => {
    if (!progress) return null;
    const clears = progress.towerClears ?? {};
    const unlocked = QUEST_BOSSES
      .filter((b) => b.kind === "tower" && b.id !== "worldtree")
      .every((b) => progress.towers.includes(b.flag!));
    const rows = HARD_TOWERS.map((tower) => ({
      tower,
      clears: clears[`${tower.flag}_Hard`] ?? 0,
    }));
    return { unlocked, rows, cleared: rows.filter((r) => r.clears > 0).length };
  }, [progress]);

  /* Nästa strid enligt SAVEN när den finns – annars lägsta REDO som förut. */
  const next = useMemo(() => {
    if (progress) {
      const boss = nextFight(progress);
      return boss ? squads.find((s) => s.boss.id === boss.id) ?? null : null;
    }
    return squads.find(({ squad }) => squad.verdict === "ready") ?? squads[0] ?? null;
  }, [progress, squads]);
  /** SEDAN-raden: striden efter nästa, i resans ordning. */
  const after = useMemo(() => {
    if (!next || !progress) return null;
    const order = QUEST_BOSSES.filter((b) => b.flag)
      .sort((a, b) => a.level - b.level);
    const i = order.findIndex((b) => b.id === next.boss.id);
    const boss = order.slice(i + 1).find((b) => !progress.towers.includes(b.flag!));
    return boss ? squads.find((s) => s.boss.id === boss.id) ?? null : null;
  }, [next, progress, squads]);

  /* Savens siffror mot kartans totaler – samma beräkning som Översikten. */
  const tally = useMemo(() => progressSummary(data), [data]);

  const quests = useMemo(() => (progress ? activeQuests(progress) : []), [progress]);

  /* Resan som faser: nästa ogjorda är upplyst. Ordningen ÄR innehållet –
     Panthalus före trädet (fångsten är nyckeln), Paldecken sist som slutmål. */
  const phases = useMemo(() => {
    if (!progress || !tally) return null;
    const factionDone = QUEST_BOSSES
      .filter((b) => b.kind === "tower" && b.id !== "worldtree")
      .filter((b) => progress.towers.includes(b.flag!)).length;
    const panthalusDone = progress.towers.includes("KingWhaleBoss");
    const treeDone = progress.towers.includes("WorldTreeBoss");
    const deckDone = !!deck && deck.missing.length === 0;
    const rows: {
      id: string; href: string; name: string; count: string; hook: string; done: boolean;
    }[] = [
      {
        id: "towers", href: "#qj-campaign", name: t("quest.j.towers"),
        count: `${factionDone}/8`,
        hook: factionDone === 8 ? t("quest.j.towersHookDone") : t("quest.j.towersHook", { n: 8 - factionDone }),
        done: factionDone === 8,
      },
      {
        id: "panthalus", href: "#qj-next", name: "Panthalus",
        count: `Lv ≈70`, hook: t("quest.j.panthalusHook"), done: panthalusDone,
      },
      {
        id: "worldtree", href: "#qj-next", name: t("quest.j.worldtree"),
        count: `${tally.mids}/${WORLDTREE_MID_FLAGS.length}`,
        hook: t("quest.j.worldtreeHook"), done: treeDone,
      },
      {
        id: "hard", href: "#qj-hard", name: "Hard mode",
        count: `${hard?.cleared ?? 0}/${HARD_TOWERS.length}`,
        hook: hard?.unlocked ? t("quest.j.hardHook") : t("quest.j.hardHookLocked"),
        done: (hard?.cleared ?? 0) === HARD_TOWERS.length,
      },
      {
        id: "raids", href: "#qj-raids", name: t("quest.j.raids"),
        count: `${raidClears}/${RAIDS.length}`,
        hook: eggsMissing > 0 ? t("quest.j.raidsHook", { n: eggsMissing }) : t("quest.j.raidsHookDone"),
        done: raidClears === RAIDS.length,
      },
      ...(deck ? [{
        id: "deck", href: "#qj-deck", name: t("quest.j.deck"),
        count: `${deck.done}/${deck.done + deck.missing.length}`,
        hook: t("quest.j.deckHook"), done: deckDone,
      }] : []),
    ];
    const nextIdx = rows.findIndex((r) => !r.done);
    return rows.map((r, i) => ({
      ...r,
      state: (r.done ? "done" : i === nextIdx ? "next" : "later") as PhaseState,
    }));
  }, [progress, tally, hard, deck, raidClears, eggsMissing, t]);

  /* Kampanjkvittona: alla strider, högsta först – senaste bragden överst.
     ✓×N ur savens räknare ("<flagga>_Normal"); räknare utan flagga = bara ✓. */
  const campaign = useMemo(() => {
    const clears = progress?.towerClears ?? {};
    return QUEST_BOSSES.filter((b) => b.flag)
      .map((boss) => {
        const s = squads.find((x) => x.boss.id === boss.id)!;
        return { boss, squad: s.squad, done: s.done, clears: clears[`${boss.flag}_Normal`] ?? 0 };
      })
      .sort((a, b) => b.boss.level - a.boss.level);
  }, [progress, squads]);

  const Member = ({ p, why }: { p: ScoredPal; why: string }) => {
    const spec = data.species[p.s]!;
    return (
      <button type="button" className="qmember" onClick={() => select(p)}
        style={{ "--elc": elementColor(spec) } as React.CSSProperties}>
        <SpeciesIcon sp={spec} size={44} radius={22} />
        <span className="nm">{spec.name}</span>
        <span className="why">{why}</span>
      </button>
    );
  };

  const SquadRow = ({ boss, squad }: { boss: QuestBoss; squad: QuestSquad }) => (
    <>
      <div className="qsquad">
        {squad.counters.map((p) => (
          <Member key={p.id} p={p}
            why={`${data.species[p.s]!.elements[0] ?? "Normal"} · ${t("quest.power", { n: p.combat })} · Lv ${p.lv}`} />
        ))}
        {squad.backup.map((p) => (
          <Member key={p.id} p={p} why={t("quest.backup", { n: p.combat })} />
        ))}
        {squad.counters.length === 0 && squad.backup.length === 0 && (
          <span className="hint">{t("quest.emptyBox")}</span>
        )}
      </div>
      {squad.verdict !== "ready" && (
        <div className="hint">
          {t(squad.verdict === "close" ? "quest.closeHint" : "quest.riskyHint", {
            elements: weaknessesOf(boss, bossElements(data, boss)).join(" + "),
          })}
        </div>
      )}
    </>
  );

  const Verdict = ({ v, done }: { v: QuestVerdict; done?: boolean }) => (
    done
      ? <span className="qverdict done">✓ {t("quest.defeated")}</span>
      : <span className={`qverdict ${v}`}>{t(VERDICT_KEY[v])}</span>
  );

  /** Bossens porträtt: arten när den finns i datasetet, annars glyfen. */
  const BossFace = ({ boss, size = 34 }: { boss: QuestBoss; size?: number }) => {
    const sp: Species | undefined = boss.code ? spByCode.get(boss.code.toLowerCase()) : undefined;
    if (sp?.icon) return <SpeciesIcon sp={sp} size={size} radius={size / 2} />;
    return <span className="qface" style={{ width: size, height: size, fontSize: size * .55 }}>
      {boss.kind === "raid" ? "💀" : boss.kind === "world" ? "🌊" : "🗼"}
    </span>;
  };

  const BossHead = ({ boss }: { boss: QuestBoss }) => {
    const elements = boss.typeless ? [] : bossElements(data, boss);
    return (
      <div className="qhead">
        {/* Porträttet, inte en emoji: kortet är sidans tes och ska visa VEM
            man ska slåss mot. Ringen bär elementfärgen; BossFace faller
            tillbaka på glyfen för en boss utan art i datasetet. */}
        <span className="qicon"><BossFace boss={boss} size={56} /></span>
        <div>
          <div className="nm">{boss.name}</div>
          <div className="meta">
            {elements.map((e) => (
              <span key={e} className="qel" style={{ "--c": ELEMENT_META[e]?.color } as React.CSSProperties}>
                <GameIcon name={ELEMENT_ICON[e] ?? "neutral"} size={13} /> {e}
              </span>
            ))}
            {boss.typeless
              ? <b>{t("quest.typeless")}</b>
              : <>{" · "}{t("quest.weakTo")} <b>{weaknessesOf(boss, elements).join(" + ")}</b></>}
            {" · "}{t("quest.level", { n: boss.level })}
            {boss.altar && <> · {t("quest.altar")}</>}
            {boss.gear && <> · <b>{t(boss.gear === "heat" ? "quest.gearHeat" : "quest.gearCold")}</b></>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {!progress && <div className="hint">{t("quest.noProgress")}</div>}

      {/* ---- Karthjälten: din värld med dina stämplar + resan som faser ---- */}
      {progress && tally && phases && (
        <div className="qjhero">
          <Link href="/map" className="qjmap" title={t("quest.j.toMap")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/worldmap.webp" alt="" draggable={false} />
            {/* Guldstämplarna är savens riktiga tornflaggor på kartans riktiga
                positioner (mapPct). Världsträdet är en egen spelkarta och får
                ALDRIG en gissad prick här – det bor i faserna till höger. */}
            {WORLD_MAP.towers.map((tw) => {
              const done = progress.towers.includes(tw.flag);
              /* mapPct ger redan procent (0–100). */
              const pos = mapPct(tw.x, tw.y);
              return (
                <span key={tw.flag} className={`qjstamp ${done ? "done" : ""}`}
                  style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                  title={tw.name}>
                  {done ? "✓" : ""}
                </span>
              );
            })}
            {/* Brickan räknar KARTANS stämplar (de åtta faktionstornen) –
                Panthalus och Världsträdet ligger utanför huvudkartan. */}
            <span className="qjbadge num">
              {t("quest.j.stamps", {
                done: WORLD_MAP.towers.filter((tw) => progress.towers.includes(tw.flag)).length,
                total: WORLD_MAP.towers.length,
              })}
            </span>
          </Link>
          <nav className="qjphases" aria-label={t("quest.j.aria")}>
            {phases.map((p) => (
              <a key={p.id} href={p.href} className={`qjph ${p.state}`}>
                <span className="st" aria-hidden>{p.state === "done" ? "✓" : p.state === "next" ? "▶" : "·"}</span>
                <span className="nm">{p.name}</span>
                <b className="ct num">{p.count}</b>
                <span className="hook">{p.hook}</span>
              </a>
            ))}
            <div className="qjnote">{t("quest.j.worldtreeNote")}</div>
          </nav>
        </div>
      )}

      {/* ---- Nästa steg: striden stor, med motlaget och SEDAN-raden ---- */}
      <Section title={t("quest.nextTitle")} sub={progress ? t("quest.nextSubSave") : t("quest.nextSub")}>
        <div id="qj-next" />
        {next
          ? (
            <div className={`qcard qbig`}
              style={{ "--elc": ELEMENT_META[bossElements(data, next.boss)[0] ?? "Normal"]?.color } as React.CSSProperties}>
              <div className="qtop">
                <BossHead boss={next.boss} />
                <Verdict v={next.squad.verdict} />
              </div>
              {next.boss.id === "worldtree" && tally && (
                <div className="meta">{t("quest.midBosses", { n: tally.mids, total: WORLDTREE_MID_FLAGS.length })}</div>
              )}
              {next.boss.capture && <div className="okbox">{t("quest.captureNote")}</div>}
              <SquadRow boss={next.boss} squad={next.squad} />
              {after && (
                <div className="qjafter">
                  <span className="k">{t("quest.j.then")}</span>
                  <BossFace boss={after.boss} size={26} />
                  <span className="nm">{after.boss.name}</span>
                  <span className="meta">
                    {after.boss.typeless
                      ? t("quest.typeless")
                      : <>{t("quest.weakTo")} <b>{weaknessesOf(after.boss, bossElements(data, after.boss)).join(" + ")}</b></>}
                    {" · "}{t("quest.level", { n: after.boss.level })}
                  </span>
                  <Verdict v={after.squad.verdict} />
                </div>
              )}
            </div>
          )
          : <div className="okbox">{t("quest.allDone")}</div>}
      </Section>

      {/* ---- Kampanjen som kvitton: intjänad mark, högsta först ---- */}
      <Section title={t("quest.j.campaignTitle")} sub={t("quest.j.campaignSub")}>
        <div id="qj-campaign" />
        <div className="qrcpts">
          {campaign.map(({ boss, squad, done, clears }) => (
            <div key={boss.id} className={`qrcpt ${done ? "done" : ""}`}
              style={{ "--elc": ELEMENT_META[bossElements(data, boss)[0] ?? "Normal"]?.color } as React.CSSProperties}>
              <BossFace boss={boss} />
              <span className="nm">{boss.name}</span>
              <span className="lv num">Lv {boss.level}</span>
              {done
                ? <span className="qrx num">✓{clears > 0 ? ` ×${clears}` : ""}</span>
                : next?.boss.id === boss.id
                  ? <Tag kind="lucky">{t("quest.j.next")}</Tag>
                  : <span className={`qverdict sm ${squad.verdict}`}>{t(VERDICT_KEY[squad.verdict])}</span>}
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Hard mode som belöningskort: schematics MED item-ikonerna ---- */}
      {hard && (
        <Section
          title={t("quest.hardTitle")}
          sub={hard.unlocked
            ? hard.cleared > 0 ? t("quest.j.hardDone", { n: hard.cleared, total: HARD_TOWERS.length }) : t("quest.j.hardVirgin")
            : t("quest.hardLocked")}
        >
          <div id="qj-hard" />
          <div className="qhgrid">
            {hard.rows.map(({ tower, clears }) => {
              const slug = schematicIconSlug(tower.schematic);
              return (
                <div key={tower.flag} className={`qhcard ${clears > 0 ? "done" : ""}`} title={tower.name}>
                  <span className="ic">
                    {slug ? <ItemIcon slug={slug} size={44} /> : <span className="qface" aria-hidden>✦</span>}
                  </span>
                  <b className="lv num">Lv {tower.lv}</b>
                  <span className="nm">{tower.schematic.replace(" Schematic", "")}</span>
                  {clears > 0 && <span className="qrx num">✓ ×{clears}</span>}
                </div>
              );
            })}
          </div>
          <div className="hint">{t("quest.hardNote")}</div>
        </Section>
      )}

      {/* ---- Raiderna som äggtavla: porträtt + savens kvitton ---- */}
      <Section title={t("quest.raidsTitle")}
        sub={progress
          ? t("quest.j.raidsSubSave", { done: raidClears, total: RAIDS.length, n: eggsMissing })
          : t("quest.raidsSub")}
      >
        <div id="qj-raids" />
        <div className="qrgrid">
          {raids.map(({ raid, boss, squad, clears, ultraClears, eggMissing }) => (
            <details key={raid.key} className={`qrcard ${clears > 0 ? "done" : ""}`}
              style={{ "--elc": ELEMENT_META[raid.elements[0] ?? "Normal"]?.color } as React.CSSProperties}>
              <summary>
                <span className="por"><BossFace boss={boss} size={54} /></span>
                <span className="nm">{raid.name}</span>
                {clears > 0
                  ? <span className="qrx num">✓ ×{clears}</span>
                  : eggMissing
                    ? <span className="qregg"><ItemIcon slug="egg" size={13} /> {t("quest.j.eggMissing")}</span>
                    : <span className="meta num">Lv {raid.lv}</span>}
              </summary>
              <div className="qrbody">
                <div className="meta">{t("quest.summon")}: <b>{raid.summon}</b></div>
                <div className="meta">{t(`quest.raid.${raid.mech}`)}</div>
                <div className="meta">{t("quest.drops")}: {raid.drops}</div>
                {raid.ultraLv > 0 && (
                  <div className="meta">
                    {ultraClears > 0
                      ? t("quest.ultraDone", { lv: raid.ultraLv, n: ultraClears })
                      : t("quest.ultra", { lv: raid.ultraLv })}
                  </div>
                )}
                {clears === 0 && <SquadRow boss={boss} squad={squad} />}
              </div>
            </details>
          ))}
        </div>
        <div className="hint">{t("quest.raidLoot")}</div>
      </Section>

      {/* ---- Kvar i världen: mätare med belöningskrok, djuplänkade ---- */}
      {tally && (
        <Section title={t("quest.j.worldTitle")} sub={t("quest.j.worldSub")}>
          <div className="qwgrid">
            <Link href="/map" className="qwcard">
              <span className="k">{t("quest.stat.effigies")}</span>
              <b className="num">{tally.effigies.done}<i>/{tally.effigies.total}</i></b>
              <span className="statbar"><i style={{ width: `${Math.round((tally.effigies.done / Math.max(1, tally.effigies.total)) * 100)}%` }} /></span>
              <span className="hook">
                {tally.relicHeld > 0
                  ? t("quest.j.effHeld", { n: tally.relicHeld })
                  : t("quest.j.effAll")}
              </span>
              <span className="go">{t("quest.j.toMap")} →</span>
            </Link>
            <Link href="/map" className="qwcard">
              <span className="k">{t("quest.stat.travels")}</span>
              <b className="num">{tally.travels.done}<i>/{tally.travels.total}</i></b>
              <span className="statbar"><i style={{ width: `${Math.round((tally.travels.done / Math.max(1, tally.travels.total)) * 100)}%` }} /></span>
              <span className="hook">{t("quest.j.travHook", { n: tally.travels.total - tally.travels.done })}</span>
              <span className="go">{t("quest.j.toMap")} →</span>
            </Link>
            <Link href="/map" className="qwcard">
              <span className="k">{t("quest.stat.alphas")}</span>
              <b className="num">{tally.alphas.done}<i>/{tally.alphas.total}</i></b>
              <span className="statbar"><i style={{ width: `${Math.round((tally.alphas.done / Math.max(1, tally.alphas.total)) * 100)}%` }} /></span>
              <span className="hook">{t("quest.j.alphaHook")}</span>
              <span className="go">{t("quest.j.toMap")} →</span>
            </Link>
            <Link href="/map" className="qwcard">
              <span className="k">{t("quest.stat.camps")}</span>
              <b className="num">{tally.camps.done}<i>/{tally.camps.total}</i></b>
              <span className="statbar"><i style={{ width: `${Math.round((tally.camps.done / Math.max(1, tally.camps.total)) * 100)}%` }} /></span>
              <span className="hook">{t("quest.j.campHook")}</span>
              <span className="go">{t("quest.j.toMap")} →</span>
            </Link>
          </div>
        </Section>
      )}

      {/* ---- Paldeck-jakten: vägen till varje saknad art ---- */}
      {deck && (
        <Section title={t("quest.deckTitle", { done: deck.done, total: deck.done + deck.missing.length })} sub={t("quest.deckSub")}>
          <div id="qj-deck" />
          {deck.missing.length === 0 ? (
            <div className="okbox">{t("quest.deckDone")}</div>
          ) : (
            <details className="dgroup">
              <summary>{t("quest.deckMissing", { n: deck.missing.length })}</summary>
              <div className="qlog">
                {deck.missing.map(({ sp, i }) => {
                  const how = catchInfo(sp.code);
                  return (
                    <div key={i} className="qlrow">
                      <SpeciesIcon sp={sp} size={26} radius={7} />
                      <span className="nm">{sp.name}</span>
                      {ownedSpecies.has(i)
                        ? <Tag kind="keep">{t("best.own.owned")}</Tag>
                        : how?.kind === "raid" ? <Tag kind="cond">{t("best.own.catchRaid")}</Tag>
                        : how?.kind === "alpha" ? <span className="meta">{t("best.own.catchAlpha", { lv: how.lv })} · {igCoord(how.x, how.y)}{found?.spawners && " "}</span>
                        : isReachable(freeSolve.cost, i)
                          ? <Tag kind="lucky">{t("best.own.breedShort", { n: freeSolve.cost[i] ?? 0 })}</Tag>
                          : <Tag kind="cond">{t("best.own.catch")}</Tag>}
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </Section>
      )}

      {/* ---- Questloggen sist, kompakt: råloggen är minst efterfrågad. ---- */}
      {progress && quests.length > 0 && (
        <Section title={t("quest.logTitle")} sub={t("quest.logSub")}>
          <div className="qlog">
            {quests.map((q) => (
              <div key={q.id} className="qlrow">
                <Tag kind={q.main ? "lucky" : "info"}>{q.main ? t("quest.main") : t("quest.sub")}</Tag>
                <span className="nm">{q.name}</span>
                {!q.known && <span className="meta">{t("quest.unknownId")}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="hint">{t("quest.tableNote")}</div>
    </>
  );
}
