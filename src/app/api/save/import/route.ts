/** POST /api/save/import – läser en save och skriver om public/data/pal-data.json.
 *
 * Save-filen öppnas bara för läsning; spelets mapp rörs aldrig.
 *
 * Body: `{}` = senast ändrade saven i spelets egen mapp. `{ root }` letar i en
 * utpekad mapp i stället, `{ path }` väljer en bestämd Level.sav i den mappen.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { mapSavePals, mergeIntoAppData } from "@/lib/saveImport";
import type { RawSaveRead, SaveCandidate } from "@/lib/saveImport";
import { runPalsave } from "@/server/palsave";
import type { AppData } from "@/lib/types";

export const dynamic = "force-dynamic";

const DATA_FILE = path.join(process.cwd(), "public", "data", "pal-data.json");
// Backupen ligger utanför public/ så den inte serveras som en andra 2 MB-fil.
const BACKUP_DIR = path.join(process.cwd(), "tools", "backup");
const BACKUP_FILE = path.join(BACKUP_DIR, "pal-data.prev.json");

interface ScanResponse {
  ok: boolean;
  error?: string;
  saves?: SaveCandidate[];
  root?: string;
}

/** Läser ett strängfält ur bodyn. Fel typ är ett fel, inte "hoppa över". */
function field(value: unknown): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : undefined;
}

function fail(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  // Tom body betyder "ta den senast sparade världen i spelets mapp". En trasig
  // body är däremot ett fel – annars skulle en felskriven sökväg tyst läsa in
  // fel värld.
  let requested: string | undefined;
  let root: string | undefined;
  const body = await request.text();
  if (body.trim()) {
    let parsed: { path?: unknown; root?: unknown };
    try {
      parsed = JSON.parse(body) as { path?: unknown; root?: unknown };
    } catch {
      return fail("Ogiltig JSON i anropet.", 400);
    }
    const wantedPath = field(parsed.path);
    if (wantedPath === null) {
      return fail("Fältet 'path' måste vara en sökväg till en Level.sav.", 400);
    }
    const wantedRoot = field(parsed.root);
    if (wantedRoot === null) {
      return fail("Fältet 'root' måste vara en sökväg till en mapp.", 400);
    }
    requested = wantedPath;
    root = wantedRoot;
  }

  // Skannar alltid först: det ger oss senaste världen och samtidigt en garanti
  // för att vi bara läser en Level.sav som faktiskt ligger i den utpekade mappen
  // (eller i spelets egen, när ingen mapp valts).
  const args = root ? ["scan", root] : ["scan"];
  const scan = await runPalsave<ScanResponse>(args).catch((error: unknown) => ({
    ok: false as const,
    error: error instanceof Error ? error.message : String(error),
  }));
  if (!scan.ok) return fail(scan.error ?? "Kunde inte söka efter saves.");

  const saves = scan.saves ?? [];
  if (saves.length === 0) {
    return fail(
      root
        ? `Hittade ingen Level.sav i ${scan.root ?? root}.`
        : "Hittade ingen Level.sav under %LOCALAPPDATA%\\Pal\\Saved\\SaveGames.",
      404,
    );
  }

  const target = requested
    ? saves.find((s) => path.resolve(s.path) === path.resolve(requested))
    : saves[0];
  if (!target) {
    return fail(
      root
        ? `Den valda save-filen ligger inte i ${scan.root ?? root}.`
        : "Den valda save-filen ligger inte i spelets save-mapp.",
      400,
    );
  }

  const read = await runPalsave<RawSaveRead>(["read", target.path]);
  if (!read.ok || !read.pals) return fail(read.error ?? "Kunde inte läsa save-filen.");

  let base: AppData;
  try {
    base = JSON.parse(await readFile(DATA_FILE, "utf8")) as AppData;
  } catch (error) {
    return fail(
      `Kunde inte läsa ${path.basename(DATA_FILE)}: ` +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  const { pals, skipped } = mapSavePals(base.species, read.pals);
  if (pals.length === 0) {
    return fail("Saven lästes men innehöll inga pals som matchar artlistan.");
  }

  const previousIds = new Set(base.pals.map((p) => p.id));
  const currentIds = new Set(pals.map((p) => p.id));
  const merged = mergeIntoAppData(base, {
    player: read.player ?? "",
    pals,
    modified: read.modified ?? target.modified,
  });

  // Skriv via temp + rename så appen aldrig kan läsa en halvskriven fil.
  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    await writeFile(BACKUP_FILE, JSON.stringify(base));
    const tmp = `${DATA_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(merged));
    await rename(tmp, DATA_FILE);
  } catch (error) {
    return fail(
      "Kunde inte skriva pal-data.json: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  return NextResponse.json({
    ok: true,
    player: merged.player,
    exported: merged.exported,
    total: pals.length,
    added: pals.filter((p) => !previousIds.has(p.id)).length,
    removed: base.pals.filter((p) => !currentIds.has(p.id)).length,
    containers: read.containers ?? [],
    skipped,
    world: target.world,
    savePath: target.path,
    // Tidsstämpeln live-läget jämför mot: nästa gång den ändras har spelet
    // sparat något nytt sedan den här inläsningen.
    modified: read.modified ?? target.modified,
  });
}
