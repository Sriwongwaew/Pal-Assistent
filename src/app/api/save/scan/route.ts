/** GET /api/save/scan – letar upp Palworld-saves.
 *
 * Utan `?root=` letar den i spelets egen mapp; med `?root=<mapp>` i den mapp
 * användaren pekat ut (dedikerad server, molnmapp, kopierad save). Sökvägen
 * skickas vidare orörd till palsave.py, som tolkar både mapp och Level.sav.
 */

import { NextResponse } from "next/server";
import { runPalsave } from "@/server/palsave";
import type { SaveCandidate } from "@/lib/saveImport";

export const dynamic = "force-dynamic";

interface ScanResponse {
  ok: boolean;
  error?: string;
  saves?: SaveCandidate[];
  root?: string;
  exists?: boolean;
  default?: boolean;
}

export async function GET(request: Request) {
  const root = new URL(request.url).searchParams.get("root")?.trim() ?? "";
  try {
    const result = await runPalsave<ScanResponse>(root ? ["scan", root] : ["scan"]);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      saves: result.saves ?? [],
      root: result.root ?? "",
      // Skiljer "mappen finns men är tom" från "mappen finns inte" – det är två
      // helt olika saker att skriva i gränssnittet.
      exists: result.exists !== false,
      isDefault: result.default === true,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
