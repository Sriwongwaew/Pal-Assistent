/** Versionsjämförelse för uppdateringskollen.
 *
 * Ser trivialt ut och är det inte. Strängjämförelse säger att "2.10.0" är
 * mindre än "2.9.0", vilket betyder att alla som kört 2.9 aldrig hade fått
 * veta att 2.10 fanns – och felet syns först vid den elfte utgåvan, långt
 * efter att man slutat tänka på det. Därför siffra för siffra, och därför
 * ett test med handräknat facit.
 *
 * GitHub-taggar skrivs `v2.1.0`; ledande v skalas bort. Allt som inte är rena
 * siffror (förhandsutgåvor som `2.1.0-beta.1`) räknas som *äldre* än samma
 * version utan suffix, precis som semver säger – och framför allt: en version
 * vi inte kan tolka får aldrig se ut som en uppgradering.
 */

/** Delar upp "v2.10.0-beta.1" i sifferdelar och eventuellt förled. */
function parse(version: string): { parts: number[]; pre: string } | null {
  const text = version.trim().replace(/^v/i, "");
  if (!text) return null;

  const dash = text.indexOf("-");
  const core = dash === -1 ? text : text.slice(0, dash);
  const pre = dash === -1 ? "" : text.slice(dash + 1);

  const parts = core.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  if (parts.length === 0 || parts.some((n) => Number.isNaN(n))) return null;

  return { parts, pre };
}

/**
 * -1 om a < b, 0 om lika, 1 om a > b. Går någon av dem inte att tolka blir
 * svaret 0 ("vet inte"), vilket för uppdateringskollen betyder "erbjud inget".
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const va = parse(a);
  const vb = parse(b);
  if (!va || !vb) return 0;

  const length = Math.max(va.parts.length, vb.parts.length);
  for (let i = 0; i < length; i++) {
    // Saknad del är noll: 2.1 och 2.1.0 är samma version.
    const x = va.parts[i] ?? 0;
    const y = vb.parts[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }

  // Samma siffror: en förhandsutgåva är äldre än den färdiga versionen.
  if (va.pre === vb.pre) return 0;
  if (!va.pre) return 1;
  if (!vb.pre) return -1;
  return va.pre < vb.pre ? -1 : 1;
}

/** Är `latest` en version man faktiskt bör erbjuda den som kör `current`? */
export function isNewer(latest: string, current: string): boolean {
  return compareVersions(latest, current) === 1;
}
