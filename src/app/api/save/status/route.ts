/** GET /api/save/status?path=<Level.sav> – när sparade spelet senast?
 *
 * Live-läget frågar den här varje 10–60 sekund, så den gör så lite som möjligt:
 * en `stat` i Node, ingen Python, ingen uppackning av 27 MB. Först när
 * tidsstämpeln faktiskt ändrats är det värt att läsa in saven på riktigt.
 */

import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("path")?.trim() ?? "";
  if (!target) {
    return NextResponse.json({ ok: false, error: "Ingen sökväg angiven." }, { status: 400 });
  }
  // Endast själva save-filen: annars vore det här en gratis "finns den här
  // filen?"-tjänst för vad som helst på disken.
  if (path.basename(target).toLowerCase() !== "level.sav") {
    return NextResponse.json(
      { ok: false, error: "Sökvägen måste peka på en Level.sav." },
      { status: 400 },
    );
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("Sökvägen är inte en fil.");
    return NextResponse.json({
      ok: true,
      modified: Math.floor(info.mtimeMs / 1000),
      size: info.size,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: `Hittar ingen save på ${target}: ` +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 404 },
    );
  }
}
