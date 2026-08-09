/** GET /api/update/check – finns en nyare version på GitHub?
 *
 * Svarar alltid 200 med ett läge, aldrig ett fel: att GitHub inte går att nå
 * är inte något användaren gjort fel, och en röd ruta för det vore bara buller
 * i en app som annars fungerar helt utan nätet.
 */

import { NextResponse } from "next/server";
import { latestRelease, MANUAL_CACHE_MS, releaseIsNewer, REPO, VERSION } from "@/server/release";

export const dynamic = "force-dynamic";

export interface UpdateCheck {
  /** Falskt i bygget från källkoden – då visas ingenting alls. */
  enabled: boolean;
  current: string;
  latest?: string;
  newer: boolean;
  page?: string;
  notes?: string;
  size?: number;
  /** Satt när kollen inte gick att göra. Visas inte, loggas bara. */
  error?: string;
}

/**
 * `?manual=1` är kollen någon bett om genom att trycka på knappen i foten.
 * Den skiljer sig på en enda punkt: sextimmarscachen vore fel svar på en
 * knapptryckning, så den korta gäller i stället. Den är inte borta – knappen
 * ska inte kunna bli en gratis linje till GitHub, vars kvot delas av alla bakom
 * samma IP.
 */
export async function GET(request: Request) {
  if (!REPO) {
    return NextResponse.json<UpdateCheck>({
      enabled: false,
      current: VERSION,
      newer: false,
    });
  }

  try {
    const manual = new URL(request.url).searchParams.get("manual") === "1";
    const release = await latestRelease(manual ? MANUAL_CACHE_MS : undefined);
    const newer = releaseIsNewer(release);
    return NextResponse.json<UpdateCheck>({
      enabled: true,
      current: VERSION,
      latest: release.version,
      // En utgåva utan installationsfil går inte att uppdatera till, hur ny den
      // än är – då är bygget trasigt och ska inte erbjudas.
      newer: newer && release.installer !== null,
      page: release.page,
      notes: release.notes.slice(0, 2000),
      size: release.installer?.size ?? 0,
    });
  } catch (error) {
    return NextResponse.json<UpdateCheck>({
      enabled: true,
      current: VERSION,
      newer: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
