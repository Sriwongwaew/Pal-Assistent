/** POST /api/update/install – hämtar senaste installationsfilen och kör den.
 *
 * Den här rutten laddar ner en binär och startar den. Fyra kontroller står
 * mellan den och en fjärrkörningsbugg, och ingen av dem är valfri:
 *
 *   1. Bara den installerade appen får göra det (PA_PACKAGED). Ett `npm run
 *      dev` ska aldrig kunna installera över sin egen källkod.
 *   2. Utgåvan hämtas om från GitHub här. Klienten skickar ingen URL, inget
 *      versionsnummer och ingen kontrollsumma – bara "kör igång".
 *   3. Nedladdningen måste komma från vårt eget repos utgåvor
 *      (`isTrustedAssetUrl`).
 *   4. SHA-256 jämförs mot SHA256SUMS.txt i samma utgåva innan filen körs.
 *      Stämmer den inte raderas filen och ingenting startas.
 *
 * Själva bytet görs av ett litet skript i temp-mappen, inte av oss: installern
 * behöver stänga appen för att kunna skriva över dess filer, och en process kan
 * inte gärna vänta in sin egen död. Skriptet väntar ut oss, kör installern tyst
 * och startar programmet igen.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  ASSET_NAME,
  isTrustedAssetUrl,
  latestRelease,
  releaseIsNewer,
  SUMS_NAME,
} from "@/server/release";

export const dynamic = "force-dynamic";

/** Sätts av launchern. Saknas den kör vi från källkoden. */
const PACKAGED = process.env.PA_PACKAGED === "1";
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
  if (!PACKAGED) {
    return fail(
      "Uppdatering går bara i den installerade appen, inte när den körs från källkoden.",
      400,
    );
  }

  // --- vad finns att uppdatera till? -----------------------------------------

  let release;
  try {
    release = await latestRelease(true);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }

  if (!releaseIsNewer(release)) {
    return fail("Du kör redan den senaste versionen.", 400);
  }
  if (!release.installer) {
    return fail("Utgåvan saknar installationsfil.", 400);
  }
  if (!release.sums) {
    return fail("Utgåvan saknar kontrollsummor – uppdaterar inte utan dem.", 400);
  }
  if (!isTrustedAssetUrl(release.installer.url) || !isTrustedAssetUrl(release.sums.url)) {
    return fail("Nedladdningen pekar utanför projektets utgåvor. Avbryter.", 400);
  }

  // --- hämta och kontrollera -------------------------------------------------

  const work = await mkdtemp(path.join(tmpdir(), "palassistent-update-"));
  const installer = path.join(work, ASSET_NAME);

  try {
    const [binary, sums] = await Promise.all([
      download(release.installer.url),
      download(release.sums.url).then((b) => b.toString("utf8")),
    ]);

    const expected = sumFor(sums, ASSET_NAME);
    if (!expected) {
      await rm(work, { recursive: true, force: true });
      return fail(`${SUMS_NAME} saknar rad för ${ASSET_NAME}. Avbryter.`);
    }

    const actual = createHash("sha256").update(binary).digest("hex");
    if (actual !== expected) {
      await rm(work, { recursive: true, force: true });
      return fail("Kontrollsumman stämmer inte med utgåvan. Filen kastades.");
    }

    await writeFile(installer, binary);

    // --- lämna över till skriptet --------------------------------------------
    // /SILENT visar en förloppsindikator men frågar ingenting. Installern stänger
    // appen själv (CloseApplications i .iss), och skriptet startar den igen.
    const appExe = path.join(process.cwd(), "PalAssistent.exe");
    const script = path.join(work, "uppdatera.cmd");
    await writeFile(
      script,
      [
        "@echo off",
        "rem Väntar ut appen innan installern får skriva i mappen.",
        "timeout /t 3 /nobreak >nul",
        `"${installer}" /SILENT /SUPPRESSMSGBOXES /NORESTART`,
        `start "" "${appExe}"`,
      ].join("\r\n"),
      "utf8",
    );

    const child = spawn(process.env.COMSPEC ?? "cmd.exe", ["/c", script], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      cwd: work,
    });
    child.unref();

    // Servern måste dö för att installern ska komma åt filerna. Launchern ser
    // att den gjort det och stänger fönstret, så mutex och port släpps innan
    // den nya versionen startar.
    setTimeout(() => process.exit(0), 1500);

    return NextResponse.json({
      ok: true,
      version: release.version,
      message: "Uppdateringen är hämtad och kontrollerad. Appen startar om.",
    });
  } catch (error) {
    await rm(work, { recursive: true, force: true }).catch(() => {});
    return fail(error instanceof Error ? error.message : String(error));
  }
}
