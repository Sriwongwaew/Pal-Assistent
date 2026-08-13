/** POST /api/update/install – hämtar senaste installationsfilen och lägger den
 * till rätta.
 *
 * Den här rutten laddar ner en binär som strax kommer att köras. Fyra kontroller
 * står mellan den och en fjärrkörningsbugg, och ingen av dem är valfri:
 *
 *   1. Bara den installerade appen får göra det (PA_PACKAGED). Ett `npm run
 *      dev` ska aldrig kunna installera över sin egen källkod.
 *   2. Utgåvan hämtas om från GitHub här. Klienten skickar ingen URL, inget
 *      versionsnummer och ingen kontrollsumma – bara "kör igång".
 *   3. Nedladdningen måste komma från vårt eget repos utgåvor
 *      (`isTrustedAssetUrl`).
 *   4. SHA-256 jämförs mot SHA256SUMS.txt i samma utgåva innan filen ens rör
 *      disken. Stämmer den inte skrivs ingenting, och då finns det heller
 *      ingenting för launchern att hitta och köra.
 *
 * Själva bytet görs av ett litet skript, inte av oss: installern behöver stänga
 * appen för att kunna skriva över dess filer, och en process kan inte gärna
 * vänta in sin egen död. Skriptet väntar ut oss, kör installern tyst och startar
 * programmet igen.
 *
 * **Men skriptet startas inte härifrån.** Vi lägger det bara på en avtalad plats
 * och avslutar oss; launchern kör det när den städat undan resten. Skälet är
 * job-objektet i `Launcher.cs`: node.exe ligger i det, allt node startar ärver
 * medlemskapet, och när launchern släpper handtaget dödar `KILL_ON_JOB_CLOSE`
 * hela släktet – inklusive en installer mitt i installationen. Symptomet är
 * precis det man inte gissar på: appen stängs, ingenting installeras, och nästa
 * start är samma version. Launchern är däremot inte själv medlem i jobbet, så
 * det den startar går fritt. Starta alltså aldrig något härifrån igen.
 */

import { serverT } from "@/i18n/server";
import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { updateScript, UPDATE_INSTALLER_NAME, UPDATE_SCRIPT_NAME } from "@/lib/update";
import { isTrustedAssetUrl, latestRelease, releaseIsNewer, SUMS_NAME } from "@/server/release";

export const dynamic = "force-dynamic";

/** Sätts av launchern. Saknas den kör vi från källkoden. */
const PACKAGED = process.env.PA_PACKAGED === "1";
/**
 * Mappen launchern hämtar uppdateringen ur, utpekad av launchern själv.
 *
 * Rutten räknar med flit **inte** ut sökvägen: den som ska köra skriptet är den
 * som får bestämma var det ligger, annars finns samma sökväg på två ställen och
 * kan glida isär tyst. Att i stället bygga den ur `%LOCALAPPDATA%` kostade ett
 * paketbygge – Next spårar filer statiskt inför standalone-bygget, och en
 * sökväg som går att räkna ut vid byggtid försöker den läsa in på
 * *byggmaskinen*: `EPERM ... scandir 'C:\\Users\\runneradmin\\AppData\\Local\\
 * Application Data'`, mitt i en release. Lägg inte tillbaka en uträkning här.
 */
const UPDATE_DIR = process.env.PA_UPDATE_DIR ?? "";
/** 60 MB över en dålig förbindelse får ta sin tid, men inte hur lång som helst. */
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;

function fail(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}


/** Plockar ut kontrollsumman för en fil ur ett sha256sum-formaterat dokument. */
function sumFor(document: string, filename: string): string | null {
  for (const line of document.split(/\r?\n/)) {
    const [hash, ...rest] = line.trim().split(/\s+/);
    if (!hash || rest.length === 0) continue;
    // sha256sum skriver "*" framför filnamnet i binärläge.
    const name = rest.join(" ").replace(/^\*/, "");
    if (name === filename && /^[0-9a-f]{64}$/i.test(hash)) return hash.toLowerCase();
  }
  return null;
}

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: { "User-Agent": "PalAssistent" },
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    redirect: "follow",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Nedladdningen svarade ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
}

export async function POST() {
  const t = await serverT();
  // Båda kommer från launchern, så de saknas i samma lägen: ett bygge från
  // källkoden, eller en server någon startat för hand.
  if (!PACKAGED || !UPDATE_DIR) {
    return fail(
      t("api.packagedOnly"),
      400,
    );
  }

  // --- vad finns att uppdatera till? -----------------------------------------

  let release;
  try {
    // 0 = ingen cache. Det är de här URL:erna och den här kontrollsumman vi
    // laddar ner och kör; ett sex timmar gammalt svar duger inte till det.
    release = await latestRelease(0);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }

  if (!releaseIsNewer(release)) {
    return fail(t("api.alreadyLatest"), 400);
  }
  if (!release.installer) {
    return fail(t("api.noInstaller"), 400);
  }
  if (!release.sums) {
    return fail(t("api.noChecksums"), 400);
  }
  if (!isTrustedAssetUrl(release.installer.url) || !isTrustedAssetUrl(release.sums.url)) {
    return fail(t("api.badDownloadHost"), 400);
  }

  // --- hämta och kontrollera -------------------------------------------------

  const work = UPDATE_DIR;

  try {
    const [binary, sums] = await Promise.all([
      download(release.installer.url),
      download(release.sums.url).then((b) => b.toString("utf8")),
    ]);

    // Kontrollsumman slås upp på namnet filen har i UTGÅVAN, inte på det namn
    // vi själva bygger under: efter namnbytet till PalCompanion är de två
    // olika, och ett uppslag på fel rad hade sett ut som en trasig utgåva.
    const expected = sumFor(sums, release.installer.name);
    if (!expected) {
      return fail(t("api.noSumLine", { sums: SUMS_NAME, asset: release.installer.name }));
    }

    const actual = createHash("sha256").update(binary).digest("hex");
    if (actual !== expected) {
      return fail(t("api.badChecksum"));
    }

    // --- lämna över till launchern -------------------------------------------
    // Först nu rörs disken. En avbruten nedladdning ska inte kunna lämna efter
    // sig något som ser ut som en färdig uppdatering – launchern kör det den
    // hittar här utan att fråga.
    await rm(work, { recursive: true, force: true });
    await mkdir(work, { recursive: true });
    await writeFile(path.join(work, UPDATE_INSTALLER_NAME), binary);
    // Skriptet skrivs SIST: det är dess existens launchern går på.
    await writeFile(path.join(work, UPDATE_SCRIPT_NAME), updateScript(), "utf8");

    // Servern måste dö för att installern ska komma åt filerna. Launchern ser
    // att den gjort det, stänger fönstret och startar sedan skriptet – i den
    // ordningen, så att mutex och port är släppta innan den nya versionen kommer.
    setTimeout(() => process.exit(0), 1500);

    return NextResponse.json({
      ok: true,
      version: release.version,
      message: t("api.updateReady"),
    });
  } catch (error) {
    await rm(work, { recursive: true, force: true }).catch(() => {});
    return fail(error instanceof Error ? error.message : String(error));
  }
}
