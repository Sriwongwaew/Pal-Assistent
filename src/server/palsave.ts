/** Kör save-läsaren och tolkar dess JSON-svar. Endast serversidan.
 *
 * Läsaren finns i två skepnader och båda talar exakt samma protokoll:
 *
 * - **`tools/palsave/palsave.exe`** – den paketerade versionen (PyInstaller),
 *   som följer med installationen. Den vinner alltid när den finns, för då har
 *   användaren varken Python eller `palworld-save-tools` installerat.
 * - **`tools/palsave.py`** via Python – utvecklingsläget, precis som förut.
 *
 * Ordningen är därför exe → PYTHON → python → py → python3, och felmeddelandet
 * i botten nämner bara Python: hittar vi ingen läsare alls är det en utvecklare
 * som kör källkoden, inte någon som installerat programmet.
 */

import { serverT } from "@/i18n/server";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SCRIPT = path.join(process.cwd(), "tools", "palsave.py");
/** PyInstaller-mappen i installationen. `--onedir`, så exe:n har sin `_internal`. */
const BUNDLED_EXE = path.join(process.cwd(), "tools", "palsave", "palsave.exe");

/** Ett sätt att starta läsaren: programmet plus de argument som alltid krävs. */
interface Runner {
  file: string;
  lead: string[];
}

/**
 * Läsarna att prova i tur och ordning.
 *
 * Slås upp vid varje anrop i stället för en gång vid modulinläsning: i
 * installationen ligger exe:n alltid på plats, men under utveckling kan man
 * bygga den mitt i en session och ska då inte behöva starta om servern.
 */
function runners(): Runner[] {
  const out: Runner[] = [];
  if (existsSync(BUNDLED_EXE)) out.push({ file: BUNDLED_EXE, lead: [] });
  for (const python of [process.env.PYTHON, "python", "py", "python3"]) {
    if (python) out.push({ file: python, lead: [SCRIPT] });
  }
  return out;
}

/** Fel som betyder "det här programmet finns inte" – prova nästa. */
function isMissingInterpreter(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return code === "ENOENT" || code === "EACCES" || code === 9009;
}

function parseJson<T>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

/**
 * Anropar save-läsaren med givna argument.
 *
 * Läsaren svarar alltid med JSON på stdout – även när den misslyckas – så ett
 * exit-värde skilt från noll är fortfarande ett användbart svar.
 */
export async function runPalsave<T>(args: string[]): Promise<T> {
  const t = await serverT();
  const failures: string[] = [];

  for (const runner of runners()) {
    try {
      const { stdout } = await execFileAsync(runner.file, [...runner.lead, ...args], {
        maxBuffer: 64 * 1024 * 1024,
        timeout: 120_000,
        windowsHide: true,
      });
      const parsed = parseJson<T>(stdout);
      if (parsed) return parsed;
      failures.push(`${path.basename(runner.file)}: gav inget JSON-svar`);
    } catch (error) {
      if (isMissingInterpreter(error)) continue;
      // Läsaren körde men avslutade med fel – dess JSON ligger kvar på stdout.
      const parsed = parseJson<T>((error as { stdout?: string })?.stdout ?? "");
      if (parsed) return parsed;
      const stderr = (error as { stderr?: string })?.stderr?.trim();
      failures.push(`${path.basename(runner.file)}: ${stderr || (error as Error).message}`);
    }
  }

  throw new Error(
    failures.length > 0
      ? failures.join(" | ")
      : t("api.noPython"),
  );
}
