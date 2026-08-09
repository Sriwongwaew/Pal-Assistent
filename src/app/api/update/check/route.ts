/** GET /api/update/check – finns en nyare version på GitHub?
 *
 * Svarar alltid 200 med ett läge, aldrig ett fel: att GitHub inte går att nå
 * är inte något användaren gjort fel, och en röd ruta för det vore bara buller
 * i en app som annars fungerar helt utan nätet.
 */

import { NextResponse } from "next/server";
import { latestRelease, releaseIsNewer, REPO, VERSION } from "@/server/release";

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

export async function GET() {
  if (!REPO) {
    return NextResponse.json<UpdateCheck>({
      enabled: false,
      current: VERSION,
      newer: false,
    });
  }

  try {
    const release = await latestRelease();
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
