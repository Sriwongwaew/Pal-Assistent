/** Ursprungskontrollen, monterad framför allt servern svarar på.
 *
 * Själva beslutet ligger i `src/lib/localOrigin.ts` (rent och testat); här
 * plockas bara huvudena ut. Att den sitter som middleware och inte i varje rutt
 * är avsiktligt: `/data/pal-data.json` är hela boxen och serveras som en statisk
 * fil, alltså av ingen rutt alls. En kontroll per API-rutt hade lämnat den öppen.
 *
 * `_next/static` och `_next/image` står utanför. De är byggets egna chunkar och
 * bilder – samma kod som redan ligger publikt på GitHub – och de hämtas för
 * varje sidladdning.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkLocalRequest } from "@/lib/localOrigin";

export function middleware(request: NextRequest) {
  const verdict = checkLocalRequest({
    host: request.headers.get("host"),
    origin: request.headers.get("origin"),
    site: request.headers.get("sec-fetch-site"),
  });

  if (verdict === "ok") return NextResponse.next();

  // Texten ligger med flit utanför meddelandekatalogen: den når bara den som
  // *inte* är appen, och en riktig användare ser den aldrig. Skälet står med
  // för felsökningens skull – se LocalVerdict för vad de tre betyder.
  return new NextResponse(`Forbidden: request rejected (${verdict}).\n`, {
    status: 403,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Ingen mellanhand ska spara ett 403 och servera det till appen själv.
      "cache-control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
