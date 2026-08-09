import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

/**
 * Paketbygget (`npm run package`) sätter PA_PACKAGE=1 och får då två saker som
 * det vanliga bygget inte ska ha:
 *
 * - `output: "standalone"` – en självbärande server.js med bara de moduler den
 *   faktiskt använder, så installationen slipper node_modules.
 * - en egen `distDir` – paketbygget får aldrig skriva i `.next/`. Dev-servern
 *   håller manifesten därifrån i minnet och dör med
 *   `__webpack_modules__[moduleId] is not a function` om de byts under fötterna
 *   på den (se CLAUDE.md). Med skild mapp kan du paketera medan du utvecklar.
 */
const packaging = process.env.PA_PACKAGE === "1";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

/**
 * Tre värden bakas in vid bygget och läses av uppdateringskollen och skenan.
 * `env` i Next inlinear dem i både server- och klientkoden, så de finns som
 * vanliga strängar i den byggda appen – inga miljövariabler behövs vid körning.
 *
 * PA_REPO sätts av GitHub Actions till `owner/namn`. Lokalt är den tom, och då
 * stänger uppdateringskollen av sig själv i stället för att peka på ett repo som
 * inte finns. Ett bygge från källkoden ska aldrig kunna erbjuda en uppdatering.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    PA_VERSION: pkg.version,
    PA_REPO: process.env.PA_REPO ?? "",
    PA_DONATE: process.env.PA_DONATE ?? "",
  },
  ...(packaging ? { output: "standalone" as const, distDir: ".next-package" } : {}),
};

export default nextConfig;
