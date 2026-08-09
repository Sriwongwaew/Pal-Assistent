/**
 * Tar om skärmdumparna i `docs/img` – de sex bilderna README består av.
 *
 * Varför det är ett skript och inte sex manuella dumpar: `docs-images.mjs`
 * fångar en bild som *saknas*, men ingenting fångar en bild som är **gammal**.
 * Och gammal blir den fort — bilderna i README har hunnit visa en
 * rekommendationssida som inte finns kvar och ett gränssnitt utan språkväljare,
 * fast båda ändringarna gjordes samma dag. Det som gör att bilderna faktiskt
 * blir omtagna är att det kostar ett kommando, inte en kvart.
 *
 *   node scripts/docs-shots.mjs                     # mot http://127.0.0.1:3100
 *   node scripts/docs-shots.mjs --url http://…:3000 # annan server
 *   node scripts/docs-shots.mjs --only breeding,box # bara några
 *
 * Kör mot ett **produktionsbygge**, aldrig mot `next dev`: dev-servern ritar
 * sin egen utvecklarknapp i hörnet, och den ska inte ligga i README. Bygg med
 * `PA_PACKAGE=1` om en dev-server är uppe — då hamnar bygget i `.next-package`
 * och rör inte `.next` (se CLAUDE.md).
 *
 * Fyra saker skriptet gör med flit:
 *
 * 1. **Egen, tom Edge-profil.** Språk, tema och planerarens val ligger i
 *    localStorage och en cookie. Med din vanliga profil hade bilderna visat
 *    dina inställningar i stället för det en ny användare ser — och just
 *    språket avgörs av att cookien *saknas*.
 * 2. **Ingen webbläsare laddas ner.** Maskinens egen Edge styrs över CDP med
 *    Nodes inbyggda WebSocket. Ett dokumentationsskript ska inte kosta
 *    projektet ett beroende på ett halvt gigabyte.
 * 3. **Väntar på innehåll, inte på en klocka.** Datan hämtas klientsidan, så
 *    `load` säger ingenting: en `sleep` ger antingen en halvritad sida eller
 *    onödig väntan. Varje bild har därför en text den ska hitta först.
 * 4. **Art- och passiv-id slås upp i datan** i stället för att stå som index i
 *    URL:en. Index flyttar sig när den statiska halvan regenereras — samma
 *    fälla som `breedingPrefs.ts` är byggd runt — och en avelsplan för fel art
 *    ser inte trasig ut, bara fel.
 */

import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/* ── Vad som ska tas ────────────────────────────────────────────────────────
   `ready` är en text som bara finns när vyn är färdigritad — inte en rubrik
   som råkar ligga i skalet. `height` är annat än standard bara där bilden ska
   visa mer än en skärm; README:s avelsplan behöver hela planen, inte toppen.
   Färgläget sätts som `prefers-color-scheme`, inte via localStorage, så
   tema-väljaren står kvar på "Auto" precis som för den som aldrig valt. */
const WIDTH = 1440;
const HEIGHT = 900;

function shots(deepLink) {
  return [
    /* `ready`-texterna står på engelska, och det är inte en stilfråga: bilden
       visar det språk appen får när språk-cookien saknas, alltså DEFAULT_LOCALE
       — samma språk som README. Byter en vy formulering ska raden här med, annars
       står skriptet och väntar på en text som aldrig dyker upp. */
    { file: "overview.png", path: "/", ready: "Highlights", scheme: "dark" },
    { file: "overview-light.png", path: "/", ready: "Highlights", scheme: "light" },
    { file: "box.png", path: "/box", ready: "Sort:", scheme: "dark", cells: 12 },
    { file: "breeding.png", path: deepLink, ready: "Passive plan", scheme: "dark", height: 1500 },
    /* Rekommendationerna är en arbetsordning som läses uppifrån och ner, och
       det README:s text lovar – stjärnhopp, "bra för", vad stjärnorna är värda
       – står i en utfälld rad. Med en skärm blir bilden nio hopfällda rubriker
       och inget av det. Därför både högre och med första raden öppnad. */
    {
      file: "recommendations.png", path: "/recommendations", ready: "Condense",
      scheme: "dark", height: 1700, open: ".rqrow",
    },
    { file: "best-for.png", path: "/best-for", ready: "Attack team", scheme: "dark" },
  ];
}

/* Avelsplanen i README är exemplet texten talar om: Anubis med Legend,
   Ferocious, Swift och Musclehead. Ändras det här ska README:s stycke med. */
const BREEDING_TARGET = "Anubis";
const BREEDING_WANTED = ["Legend", "PAL_ALLAttack_up2", "MoveSpeed_up_3", "Noukin"];

/** `?target=&wanted=` ur den aktuella datan – aldrig hårdkodade index. */
async function breedingLink(dataFile) {
  const raw = await readFile(dataFile, "utf8").catch(() => {
    throw new Error(`Hittar inte ${path.relative(ROOT, dataFile)} – kör npm run dev en gång först.`);
  });
  const data = JSON.parse(raw);

  const target = data.species.findIndex((s) => s.code === BREEDING_TARGET);
  if (target < 0) throw new Error(`Arten ${BREEDING_TARGET} finns inte i datan längre.`);

  const missing = BREEDING_WANTED.filter((id) => !(id in data.passives));
  if (missing.length) throw new Error(`Passiver som inte finns i datan: ${missing.join(", ")}`);

  const names = BREEDING_WANTED.map((id) => data.passives[id].n).join(", ");
  console.log(`Avelsplan: ${data.species[target].name} (index ${target}) med ${names}`);
  return `/breeding?target=${target}&wanted=${BREEDING_WANTED.join(",")}`;
}

/* ── Webbläsaren ────────────────────────────────────────────────────────────*/

const EDGE_PATHS = [
  process.env.PA_EDGE,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

function findEdge() {
  const found = EDGE_PATHS.find((p) => existsSync(p));
  if (!found) throw new Error("Hittar ingen msedge.exe. Peka ut den med PA_EDGE=<sökväg>.");
  return found;
}

/** Väntar in `DevToolsActivePort`, som Edge skriver först när CDP svarar. */
async function debuggerPort(profile, timeoutMs = 20_000) {
  const file = path.join(profile, "DevToolsActivePort");
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const [port] = readFileSync(file, "utf8").split("\n");
      if (port?.trim()) return Number(port.trim());
    } catch {
      /* ännu inte skriven */
    }
    await sleep(100);
  }
  throw new Error("Edge startade aldrig sin felsökningsport.");
}

async function launchEdge() {
  const profile = await mkdtemp(path.join(os.tmpdir(), "pa-shots-"));
  const child = spawn(findEdge(), [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-sync",
    "--disable-features=Translate,MediaRouter",
    "about:blank",
  ], { stdio: "ignore" });

  const port = await debuggerPort(profile);
  return { child, profile, port };
}

/* ── CDP över Nodes inbyggda WebSocket ──────────────────────────────────────*/

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect(port) {
  const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
  const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (!page) throw new Error("Edge har ingen flik att styra.");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("CDP svarade inte.")), { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id == null) return; // händelser – vi frågar hellre än att lyssna
    const waiter = pending.get(msg.id);
    if (!waiter) return;
    pending.delete(msg.id);
    if (msg.error) waiter.reject(new Error(`${msg.error.message} (${waiter.method})`));
    else waiter.resolve(msg.result);
  });

  return {
    send(method, params = {}) {
      const id = ++nextId;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
    },
    close: () => ws.close(),
  };
}

/** Sant/falskt ur sidan. Fel i uttrycket ska bli ett fel här, inte ett tyst nej. */
async function evaluate(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? "fel i sidan");
  return result.value;
}

/**
 * Väntar på att vyn är *ritad*: rätt text på plats, typsnitten laddade och
 * varje bild avkodad. Utan bildvillkoret hinner porträtten inte fram och
 * bilden får tomma rundlar där arterna ska vara.
 */
async function waitForView(cdp, shot, timeoutMs = 45_000) {
  const expression = `(() => {
    const txt = document.body ? document.body.innerText : "";
    if (!txt.includes(${JSON.stringify(shot.ready)})) return false;
    if (${shot.cells ?? 0} > 0 &&
        document.querySelectorAll(".pcell").length < ${shot.cells ?? 0}) return false;
    if (document.fonts && document.fonts.status !== "loaded") return false;
    return [...document.images].every((i) => i.complete && i.naturalWidth > 0);
  })()`;

  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await evaluate(cdp, expression)) return;
    await sleep(150);
  }
  const seen = await evaluate(cdp, "document.body.innerText.slice(0, 300)");
  throw new Error(`Hittade aldrig "${shot.ready}" på ${shot.path}. Sidan visade:\n${seen}`);
}

async function capture(cdp, base, shot, outDir) {
  const height = shot.height ?? HEIGHT;

  // about:blank först: annars kan väntan hitta sin text på den *förra* sidan
  // och dumpen tas innan den nya hunnit rita.
  await cdp.send("Page.navigate", { url: "about:blank" });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH, height, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "prefers-color-scheme", value: shot.scheme }],
  });

  await cdp.send("Page.navigate", { url: new URL(shot.path, base).href });
  await waitForView(cdp, shot);

  /* En rad som är hopfälld i vyn men utfälld i dokumentationen: `open` på ett
     <details> är samma tillstånd som ett klick ger, utan att behöva träffa
     rätt pixel. Väntar in vyn igen – det som fälls ut har egna bilder. */
  if (shot.open) {
    const found = await evaluate(cdp, `(() => {
      const el = document.querySelector(${JSON.stringify(shot.open)});
      if (!el) return false;
      el.open = true;
      el.scrollIntoView({ block: "nearest" });
      return true;
    })()`);
    if (!found) throw new Error(`Hittar inget ${shot.open} att fälla ut på ${shot.path}.`);
    await waitForView(cdp, shot);
  }

  await sleep(700); // övergångar och mätarnas animation landar

  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file = path.join(outDir, shot.file);
  await writeFile(file, Buffer.from(data, "base64"));
  console.log(`  ${shot.file}  ${WIDTH}×${height}  ${shot.scheme}`);
}

/* ── Argument ───────────────────────────────────────────────────────────────*/

function args(argv) {
  const out = {
    url: "http://127.0.0.1:3100",
    outDir: path.join(ROOT, "docs/img"),
    data: path.join(ROOT, "public/data/pal-data.json"),
    only: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split("=");
    const value = inline ?? argv[++i];
    if (flag === "--url") out.url = value;
    else if (flag === "--out") out.outDir = path.resolve(value);
    else if (flag === "--data") out.data = path.resolve(value);
    else if (flag === "--only") out.only = value.split(",").map((s) => s.trim()).filter(Boolean);
    else throw new Error(`Okänd flagga: ${argv[i]}`);
  }
  return out;
}

/* ── Körningen ──────────────────────────────────────────────────────────────*/

const opts = args(process.argv.slice(2));

// En dev-server går att peka på, men bilderna blir fel: utvecklarknappen syns.
const probe = await fetch(opts.url).then((r) => r.text()).catch((e) => {
  throw new Error(`${opts.url} svarar inte (${e.message}). Starta servern först.`);
});
if (probe.includes("next-devtools")) {
  console.warn(`VARNING: ${opts.url} är en dev-server – bilderna får Nexts utvecklarknapp.`);
}

const wanted = shots(await breedingLink(opts.data))
  .filter((s) => !opts.only || opts.only.some((o) => s.file.startsWith(o)));
if (!wanted.length) throw new Error(`--only ${opts.only?.join(",")} matchar ingen bild.`);

await mkdir(opts.outDir, { recursive: true });
const edge = await launchEdge();
const cdp = await connect(edge.port);

try {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  console.log(`Tar ${wanted.length} bilder från ${opts.url}:`);
  for (const shot of wanted) await capture(cdp, opts.url, shot, opts.outDir);
} finally {
  cdp.close();
  edge.child.kill();
  await rm(edge.profile, { recursive: true, force: true }).catch(() => {});
}

console.log(`\nKlart. Titta på dem innan du committar – ett skript kan se att en
bild blev tagen, inte att den blev bra.`);
